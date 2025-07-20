import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create default admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@wika.co.id' },
    update: {},
    create: {
      email: 'admin@wika.co.id',
      name: 'Administrator',
      phone: '+628123456789',
      role: 'ADMIN',
      password: adminPassword,
    },
  })

  // Create default QC user
  const qcPassword = await bcrypt.hash('qc123', 12)
  const qc = await prisma.user.upsert({
    where: { email: 'qc@wika.co.id' },
    update: {},
    create: {
      email: 'qc@wika.co.id',
      name: 'Quality Control',
      phone: '+628123456788',
      role: 'QC',
      password: qcPassword,
    },
  })

  // Create default PM user
  const pmPassword = await bcrypt.hash('pm123', 12)
  const pm = await prisma.user.upsert({
    where: { email: 'pm@wika.co.id' },
    update: {},
    create: {
      email: 'pm@wika.co.id',
      name: 'Project Manager',
      phone: '+628123456787',
      role: 'PM',
      password: pmPassword,
    },
  })

  // Create default reporter user
  const reporterPassword = await bcrypt.hash('reporter123', 12)
  const reporter = await prisma.user.upsert({
    where: { email: 'reporter@wika.co.id' },
    update: {},
    create: {
      email: 'reporter@wika.co.id',
      name: 'Reporter User',
      phone: '+628123456786',
      role: 'REPORTER',
      password: reporterPassword,
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log('\n📝 Default users created:')
  console.log(`👑 Admin: ${admin.email} / admin123`)
  console.log(`🔍 QC: ${qc.email} / qc123`)
  console.log(`📋 PM: ${pm.email} / pm123`)
  console.log(`📝 Reporter: ${reporter.email} / reporter123`)
  console.log('\n🚀 You can now login with these credentials!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
