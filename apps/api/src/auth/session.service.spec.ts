import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionService } from './session.service.js'

function makeRedisMock() {
  const store = new Map<string, string>()
  return {
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value)
      return 'OK'
    }),
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    del: vi.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
    _store: store,
  }
}

describe('SessionService', () => {
  let redis: ReturnType<typeof makeRedisMock>
  let service: SessionService

  beforeEach(() => {
    redis = makeRedisMock()
    service = new SessionService(redis as any)
  })

  afterEach(() => vi.restoreAllMocks())

  it('creates a session and returns an opaque id', async () => {
    const id = await service.create({ adminId: 'admin-1' }, 60)
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThanOrEqual(32)
    expect(redis.set).toHaveBeenCalledWith(
      `session:${id}`,
      expect.any(String),
      'EX',
      60,
    )
  })

  it('reads a session by id', async () => {
    const id = await service.create({ adminId: 'admin-1' }, 60)
    const data = await service.get(id)
    expect(data).toEqual({ adminId: 'admin-1' })
  })

  it('returns null for a missing session', async () => {
    expect(await service.get('does-not-exist')).toBeNull()
  })

  it('destroys a session', async () => {
    const id = await service.create({ adminId: 'admin-1' }, 60)
    await service.destroy(id)
    expect(await service.get(id)).toBeNull()
  })

  it('generates distinct ids across calls', async () => {
    const a = await service.create({ adminId: 'a' }, 60)
    const b = await service.create({ adminId: 'b' }, 60)
    expect(a).not.toBe(b)
  })
})
