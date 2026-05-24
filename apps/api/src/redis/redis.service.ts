import { Injectable, type OnModuleDestroy } from '@nestjs/common'
import { Redis } from 'ioredis'

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor() {
    // `as any` needed: ioredis types don't declare a URL-string constructor
    // but the runtime supports it; NodeNext module resolution requires cast.
    super(process.env.REDIS_URL ?? ('redis://localhost:6379' as any), { lazyConnect: false })
  }

  async onModuleDestroy() {
    await this.quit()
  }
}
