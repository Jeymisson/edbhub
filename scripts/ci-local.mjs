#!/usr/bin/env node
// Run the same sequence as .github/workflows/ci.yml locally, but with the
// runner-style env vars stripped from the shell. This surfaces the class of
// bugs where vars are exported in your terminal (DATABASE_URL etc.) and mask
// missing dotenv loading in app code or tests.
//
// Usage:  pnpm ci:local
//
// What it does NOT cover that GitHub Actions does:
//   - OS differences (macOS vs ubuntu-latest)
//   - Exact Node version pinning
//   - Workflow YAML syntax
// For full parity, run `act push -j ci` (requires `brew install act`).

import { spawnSync } from 'node:child_process'

const PNPM = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

// These are application-config vars that the CI runner has no reason to know
// about. If your shell has any of them exported (from a previous dev session,
// a .envrc, direnv, etc.), they leak into local runs and hide bugs where
// code forgot to call dotenv. Strip them.
const SHELL_LEAKED = [
  'DATABASE_URL',
  'REDIS_URL',
  'SESSION_TTL_SECONDS',
  'SESSION_COOKIE_NAME',
  'WEB_ORIGIN',
  'API_PORT',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'NODE_ENV',
]

const env = { ...process.env }
const stripped = []
for (const k of SHELL_LEAKED) {
  if (env[k] !== undefined) stripped.push(k)
  delete env[k]
}

if (stripped.length > 0) {
  console.log(`[ci] stripped shell env: ${stripped.join(', ')}`)
}

const STEPS = [
  ['install',           [PNPM, ['install', '--frozen-lockfile']]],
  ['prisma:generate',   [PNPM, ['--filter', '@edb/api', 'exec', 'prisma', 'generate']]],
  ['shared:build',      [PNPM, ['--filter', '@edb/shared', 'build']]],
  ['lint',              [PNPM, ['lint']]],
  ['typecheck',         [PNPM, ['typecheck']]],
  ['build',             [PNPM, ['build']]],
  ['test',              [PNPM, ['test']]],
]

const start = Date.now()
for (const [name, [cmd, args]] of STEPS) {
  console.log(`\n\x1b[36m▶ ${name}\x1b[0m  ${cmd} ${args.join(' ')}\n`)
  const r = spawnSync(cmd, args, { stdio: 'inherit', env })
  if (r.status !== 0) {
    console.error(`\n\x1b[31m✗ ci failed at step: ${name}\x1b[0m`)
    process.exit(r.status ?? 1)
  }
}

const seconds = ((Date.now() - start) / 1000).toFixed(1)
console.log(`\n\x1b[32m✓ all ci steps passed in ${seconds}s\x1b[0m`)
