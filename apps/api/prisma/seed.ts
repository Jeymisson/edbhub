import { PrismaClient } from '@prisma/client'
import { hash } from '@node-rs/argon2'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the bootstrap admin.')
  }

  const passwordHash = await hash(password)

  await prisma.admin.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), passwordHash },
    update: { passwordHash },
  })

  console.log(`Seeded admin: ${email.toLowerCase()}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
