#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn', 'info'],
})

async function testConnection() {
  console.log('🔍 Testing database connection...')
  console.log('📍 DATABASE_URL:', process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@'))
  
  try {
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connection successful!')
    
    // Test if tables exist
    const userCount = await prisma.user.count()
    console.log(`📊 Found ${userCount} users in database`)
    
    // Test if we can read a user
    const firstUser = await prisma.user.findFirst()
    if (firstUser) {
      console.log(`👤 Sample user: ${firstUser.email} (${firstUser.role})`)
    } else {
      console.log('⚠️  No users found. Run: npm run db:seed')
    }
    
  } catch (error) {
    console.error('❌ Database connection failed!')
    console.error('Error details:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.error('\n🔧 Troubleshooting:')
        console.error('1. Check if MySQL server is running:')
        console.error('   sudo systemctl status mysql   # Linux')
        console.error('   brew services list | grep mysql   # macOS with Homebrew')
        console.error('   # Or check your MySQL installation method')
        console.error('\n2. Start MySQL server:')
        console.error('   sudo systemctl start mysql   # Linux')
        console.error('   brew services start mysql   # macOS with Homebrew')
      } else if (error.message.includes('Access denied')) {
        console.error('\n🔧 Troubleshooting:')
        console.error('1. Check your database credentials in .env.local')
        console.error('2. Make sure the user has permission to access the database')
        console.error('3. Try connecting manually: mysql -u username -p')
      } else if (error.message.includes('Unknown database')) {
        console.error('\n🔧 Troubleshooting:')
        console.error('1. Create the database: CREATE DATABASE incident_tickets;')
        console.error('2. Or run: npm run db:push')
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
  .catch(console.error)
  .finally(() => process.exit())
