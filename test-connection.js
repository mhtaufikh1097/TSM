const { PrismaClient } = require('@prisma/client')

console.log('DATABASE_URL:', process.env.DATABASE_URL)

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('Testing database connection...')
    await prisma.$connect()
    console.log('✅ Database connection successful!')
    
    // Test query
    const userCount = await prisma.user.count()
    console.log(`📊 Found ${userCount} users in database`)
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  }
}

testConnection()
