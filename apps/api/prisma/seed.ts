import { PrismaClient } from '@prisma/client'
import { hash, verify } from '@node-rs/argon2'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the bootstrap admin.')
  }

  const normalizedEmail = email.toLowerCase()
  const existing = await prisma.admin.findUnique({ where: { email: normalizedEmail } })

  if (existing && (await verify(existing.passwordHash, password))) {
    console.log(`Admin already seeded with current password: ${normalizedEmail}`)
    return
  }

  const passwordHash = await hash(password)
  await prisma.admin.upsert({
    where: { email: normalizedEmail },
    create: { email: normalizedEmail, passwordHash },
    update: { passwordHash },
  })

  console.log(`Seeded admin: ${normalizedEmail}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
