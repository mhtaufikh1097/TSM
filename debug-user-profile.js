/**
 * Debug script untuk memeriksa user profile API issue
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
})

async function debugUserProfile() {
  console.log('🔍 Debugging User Profile API Issue')
  console.log('===================================')
  
  try {
    // Check total users
    const totalUsers = await prisma.user.count()
    console.log('📊 Total users in database:', totalUsers)
    
    // List all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    })
    
    console.log('\n👥 All users:')
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Name: ${user.name}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Created: ${user.createdAt}`)
      console.log('')
    })
    
    // Check if there are any admin users
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        name: true
      }
    })
    
    console.log('👑 Admin users:')
    if (adminUsers.length === 0) {
      console.log('   ⚠️  No admin users found!')
    } else {
      adminUsers.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.email} (ID: ${admin.id})`)
      })
    }
    
    // Test user lookup with a sample ID
    if (users.length > 0) {
      const sampleUser = users[0]
      console.log(`\n🧪 Testing user lookup for ID: ${sampleUser.id}`)
      
      const foundUser = await prisma.user.findUnique({
        where: { id: sampleUser.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      })
      
      if (foundUser) {
        console.log('✅ User lookup successful')
        console.log('   Found:', foundUser.email)
      } else {
        console.log('❌ User lookup failed')
      }
    }
    
  } catch (error) {
    console.error('❌ Database error:', error)
    
    if (error.message && error.message.includes('connect')) {
      console.log('\n💡 Connection issue suggestions:')
      console.log('1. Check if MySQL server is running')
      console.log('2. Verify DATABASE_URL in .env.local')
      console.log('3. Ensure database exists')
      console.log('4. Check network connectivity')
    }
  } finally {
    await prisma.$disconnect()
  }
}

debugUserProfile().catch(console.error)
