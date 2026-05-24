import { Injectable } from '@nestjs/common'
import { randomBytes } from 'node:crypto'
import { RedisService } from '../redis/redis.service.js'

export interface SessionData {
  adminId: string
}

@Injectable()
export class SessionService {
  constructor(private readonly redis: RedisService) {}

  async create(data: SessionData, ttlSeconds: number): Promise<string> {
    const id = randomBytes(32).toString('base64url')
    await this.redis.set(`session:${id}`, JSON.stringify(data), 'EX', ttlSeconds)
    return id
  }

  async get(id: string): Promise<SessionData | null> {
    const raw = await this.redis.get(`session:${id}`)
    if (!raw) return null
    return JSON.parse(raw) as SessionData
  }

  async destroy(id: string): Promise<void> {
    await this.redis.del(`session:${id}`)
  }
}
