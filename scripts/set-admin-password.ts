import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = 'password123'
  const hashedPassword = await bcrypt.hash(password, 10)

  // Get all users
  const users = await prisma.user.findMany()

  for (const user of users) {
    if (!user.password) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      })
      console.log(`Updated password for user: ${user.email}`)
    }
  }

  // Ensure demo account exists
  const demoEmail = 'demo@omnichat.vn'
  const demoUser = await prisma.user.findUnique({ where: { email: demoEmail } })
  if (!demoUser) {
    await prisma.user.create({
      data: {
        email: demoEmail,
        password: hashedPassword,
        name: 'Demo User',
        role: 'agent',
        status: 'online'
      }
    })
    console.log(`Created new demo user: ${demoEmail}`)
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
