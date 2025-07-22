import { useDatabaseAuthState, clearDatabaseAuthState } from './database-auth-state.js'

/**
 * Test script to verify database auth state functionality
 * This replaces filesystem-based authentication for Vercel compatibility
 */
async function testDatabaseAuthState() {
  console.log('🧪 Testing Database Auth State...')
  
  try {
    // Test creating new auth state
    console.log('1. Creating new auth state...')
    const { state, saveCreds } = await useDatabaseAuthState()
    console.log('✅ Auth state created successfully')
    console.log('   - Registration ID:', state.creds.registrationId)
    console.log('   - Has noise key:', !!state.creds.noiseKey)
    
    // Test saving credentials
    console.log('2. Testing credential save...')
    await saveCreds()
    console.log('✅ Credentials saved to database')
    
    // Test loading existing credentials
    console.log('3. Loading existing auth state...')
    const { state: loadedState } = await useDatabaseAuthState()
    console.log('✅ Auth state loaded successfully')
    console.log('   - Registration ID matches:', state.creds.registrationId === loadedState.creds.registrationId)
    
    // Test clearing auth state
    console.log('4. Clearing auth state...')
    await clearDatabaseAuthState()
    console.log('✅ Auth state cleared from database')
    
    // Test creating fresh state after clear
    console.log('5. Creating fresh auth state after clear...')
    const { state: freshState } = await useDatabaseAuthState()
    console.log('✅ Fresh auth state created')
    console.log('   - New registration ID:', freshState.creds.registrationId)
    console.log('   - Different from previous:', state.creds.registrationId !== freshState.creds.registrationId)
    
    console.log('🎉 All database auth state tests passed!')
    
  } catch (error) {
    console.error('❌ Database auth state test failed:', error)
    throw error
  }
}

// Run test if called directly
if (require.main === module) {
  testDatabaseAuthState()
    .then(() => {
      console.log('✅ Database auth state is working correctly for Vercel deployment')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Database auth state test failed:', error)
      process.exit(1)
    })
}

export { testDatabaseAuthState }
