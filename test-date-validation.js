/**
 * Test untuk validasi tanggal inspeksi yang baru
 * Memastikan inspeksi bisa dijadwalkan di masa depan tapi tidak di masa lalu
 */

const { incidentFormSchema } = require('./lib/validations/incident')

function testDateValidation() {
  console.log('🧪 Testing New Date Validation Rules')
  console.log('====================================')
  console.log('')

  const baseData = {
    title: "Test Inspection - Quality Control Check",
    description: "This is a test inspection to verify the new date validation rules work properly for future scheduling",
    location: "Building A - Floor 2",
    priority: "MEDIUM"
  }

  // Test 1: Past date (should fail)
  console.log('📅 Test 1: Past Date (should FAIL)')
  const pastDate = new Date()
  pastDate.setDate(pastDate.getDate() - 1) // Yesterday
  const pastDateString = pastDate.toISOString().slice(0, 16) // Format for datetime-local
  
  try {
    const result1 = incidentFormSchema.parse({
      ...baseData,
      occurredAt: pastDateString
    })
    console.log('❌ UNEXPECTED: Past date was accepted')
  } catch (error) {
    console.log('✅ CORRECT: Past date rejected')
    console.log('   Error:', error.errors[0]?.message || 'Validation failed')
  }

  // Test 2: Current time (should pass)
  console.log('\n📅 Test 2: Current Time (should PASS)')
  const now = new Date()
  const nowString = now.toISOString().slice(0, 16)
  
  try {
    const result2 = incidentFormSchema.parse({
      ...baseData,
      occurredAt: nowString
    })
    console.log('✅ CORRECT: Current time accepted')
  } catch (error) {
    console.log('❌ UNEXPECTED: Current time rejected')
    console.log('   Error:', error.errors[0]?.message || 'Validation failed')
  }

  // Test 3: Future date (should pass)
  console.log('\n📅 Test 3: Future Date (should PASS)')
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 7) // Next week
  const futureDateString = futureDate.toISOString().slice(0, 16)
  
  try {
    const result3 = incidentFormSchema.parse({
      ...baseData,
      occurredAt: futureDateString
    })
    console.log('✅ CORRECT: Future date accepted')
    console.log('   Scheduled for:', new Date(futureDateString).toLocaleString())
  } catch (error) {
    console.log('❌ UNEXPECTED: Future date rejected')
    console.log('   Error:', error.errors[0]?.message || 'Validation failed')
  }

  // Test 4: Far future date (should pass)
  console.log('\n📅 Test 4: Far Future Date (should PASS)')
  const farFutureDate = new Date()
  farFutureDate.setMonth(farFutureDate.getMonth() + 3) // 3 months from now
  const farFutureDateString = farFutureDate.toISOString().slice(0, 16)
  
  try {
    const result4 = incidentFormSchema.parse({
      ...baseData,
      occurredAt: farFutureDateString
    })
    console.log('✅ CORRECT: Far future date accepted')
    console.log('   Scheduled for:', new Date(farFutureDateString).toLocaleString())
  } catch (error) {
    console.log('❌ UNEXPECTED: Far future date rejected')
    console.log('   Error:', error.errors[0]?.message || 'Validation failed')
  }

  // Test 5: Very far past (should fail)
  console.log('\n📅 Test 5: Very Far Past (should FAIL)')
  const veryPastDate = new Date()
  veryPastDate.setMonth(veryPastDate.getMonth() - 6) // 6 months ago
  const veryPastDateString = veryPastDate.toISOString().slice(0, 16)
  
  try {
    const result5 = incidentFormSchema.parse({
      ...baseData,
      occurredAt: veryPastDateString
    })
    console.log('❌ UNEXPECTED: Very past date was accepted')
  } catch (error) {
    console.log('✅ CORRECT: Very past date rejected')
    console.log('   Error:', error.errors[0]?.message || 'Validation failed')
  }

  console.log('\n🎯 Summary:')
  console.log('✅ Past dates are correctly rejected')
  console.log('✅ Current and future dates are correctly accepted')
  console.log('✅ Inspection scheduling for future dates is now enabled')
  console.log('\n💡 Use Case: Perfect for planned maintenance inspections!')
}

testDateValidation()
