#!/usr/bin/env node
// One-command dev orchestrator.
//
// Cross-platform: works on macOS / Linux / Windows. Detects whether the system
// has the v2 compose plugin (`docker compose`) or the legacy v1 binary
// (`docker-compose`) and forwards accordingly.
//
// Usage:
//   node scripts/dev.mjs            # full flow: infra + env + migrate + seed + api + web
//   node scripts/dev.mjs infra      # just bring up infra
//   node scripts/dev.mjs down       # stop infra (db + redis)
//
// Or via package.json scripts:
//   pnpm dev
//   pnpm dev:infra
//   pnpm dev:infra:down

import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { Transform } from 'node:stream'
import { setTimeout as sleep } from 'node:timers/promises'

const ROOT = process.cwd()
const PNPM = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const COMPOSE_FILES = ['-f', 'docker-compose.yml', '-f', 'compose.dev.yml']

const C = {
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
}

function log(msg) {
  console.log(`${C.gray}[dev]${C.reset} ${msg}`)
}
function fail(msg, code = 1) {
  console.error(`${C.red}[dev] ${msg}${C.reset}`)
  process.exit(code)
}

function detectCompose() {
  if (spawnSync('docker', ['compose', 'version'], { stdio: 'ignore' }).status === 0) {
    return { cmd: 'docker', preArgs: ['compose'], label: 'docker compose' }
  }
  if (spawnSync('docker-compose', ['version'], { stdio: 'ignore' }).status === 0) {
    return { cmd: 'docker-compose', preArgs: [], label: 'docker-compose' }
  }
  fail('neither `docker compose` (v2 plugin) nor `docker-compose` (v1) is on PATH. Install Docker Desktop or the compose plugin and retry.')
}

const COMPOSE = detectCompose()

function compose(args, opts = {}) {
  return spawnSync(COMPOSE.cmd, [...COMPOSE.preArgs, ...args], { stdio: 'inherit', ...opts })
}
function composeQuiet(args) {
  return spawnSync(COMPOSE.cmd, [...COMPOSE.preArgs, ...args], { stdio: 'ignore' })
}

function bringInfraUp() {
  log(`using ${COMPOSE.label}, bringing up db + redis`)
  const r = compose([...COMPOSE_FILES, 'up', '-d', 'db', 'redis'])
  if (r.status !== 0) fail('failed to start infra containers', r.status ?? 1)
}

async function waitForPostgres() {
  process.stdout.write(`${C.gray}[dev]${C.reset} waiting for postgres `)
  for (let i = 0; i < 30; i++) {
    const r = composeQuiet([...COMPOSE_FILES, 'exec', '-T', 'db', 'pg_isready', '-U', 'edbhub', '-d', 'edbhub'])
    if (r.status === 0) {
      process.stdout.write('ready\n')
      return
    }
    process.stdout.write('.')
    await sleep(1000)
  }
  process.stdout.write('\n')
  fail('postgres did not become ready within 30s')
}

function ensureEnv() {
  const dest = join(ROOT, 'apps/api/.env')
  if (existsSync(dest)) {
    log('apps/api/.env already present')
    return
  }
  copyFileSync(join(ROOT, 'apps/api/.env.example'), dest)
  log('created apps/api/.env from .env.example')
}

function runOrFail(label, cmd, args) {
  log(label)
  const r = spawnSync(cmd, args, { stdio: 'inherit' })
  if (r.status !== 0) fail(`${label} failed`, r.status ?? 1)
}

function prefixStream(prefix, color) {
  let buf = ''
  return new Transform({
    transform(chunk, _enc, cb) {
      buf += chunk.toString()
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      const out = lines.map((line) => `${color}${prefix}${C.reset} ${line}\n`).join('')
      cb(null, out)
    },
    flush(cb) {
      if (buf) cb(null, `${color}${prefix}${C.reset} ${buf}\n`)
      else cb()
    },
  })
}

function startServers() {
  log('starting api + web — Ctrl-C to stop (db + redis stay up; run `pnpm dev:infra:down` when truly done)')

  const procs = [
    { name: '[api]', color: C.cyan, args: ['--filter', '@edb/api', 'dev'] },
    { name: '[web]', color: C.magenta, args: ['--filter', '@edb/web', 'dev'] },
  ].map(({ name, color, args }) => {
    const child = spawn(PNPM, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    child.stdout.pipe(prefixStream(name, color)).pipe(process.stdout)
    child.stderr.pipe(prefixStream(name, color)).pipe(process.stderr)
    return { name, child }
  })

  let shuttingDown = false
  const shutdown = (sig) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`\n${C.gray}[dev] stopping dev servers (${sig ?? 'exit'})${C.reset}`)
    for (const { child } of procs) {
      if (child.exitCode === null) child.kill('SIGTERM')
    }
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  for (const { name, child } of procs) {
    child.on('exit', (code) => {
      log(`${name} exited with code ${code}`)
      shutdown(`${name} exit`)
    })
  }
}

function tearInfraDown() {
  log(`using ${COMPOSE.label}, tearing down db + redis`)
  const r = compose([...COMPOSE_FILES, 'down'])
  process.exit(r.status ?? 0)
}

const subcommand = process.argv[2]

async function prepare() {
  bringInfraUp()
  await waitForPostgres()
  ensureEnv()
  runOrFail('applying migrations', PNPM, ['--filter', '@edb/api', 'exec', 'prisma', 'migrate', 'deploy'])
  runOrFail('seeding bootstrap admin', PNPM, ['--filter', '@edb/api', 'prisma:seed'])
}

if (subcommand === 'down') {
  tearInfraDown()
} else if (subcommand === 'infra') {
  await prepare()
  log('infra ready — run `pnpm test` or `pnpm --filter @edb/api dev` next')
} else if (!subcommand) {
  await prepare()
  startServers()
} else {
  fail(`unknown subcommand: ${subcommand}. Use one of: (none) | infra | down`)
}
