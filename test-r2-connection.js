// Test script to verify R2 connection
// Run with: node test-r2-connection.js

const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3')
const { config } = require('dotenv')

// Load environment variables
config({ path: '.env.local' })

console.log('🔧 Testing Cloudflare R2 Connection...\n')

// Display configuration (without showing secrets)
console.log('Configuration:')
console.log('- Account ID:', process.env.R2_ACCOUNT_ID ? '✅ Set' : '❌ Missing')
console.log('- Access Key ID:', process.env.R2_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing')
console.log('- Secret Access Key:', process.env.R2_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing')
console.log('- Bucket:', process.env.R2_BUCKET || '❌ Missing')
console.log('- Public URL:', process.env.R2_PUBLIC_BASE_URL || '❌ Missing')
console.log()

// Configure R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

async function testR2Connection() {
  try {
    console.log('🧪 Test 1: List bucket contents...')
    
    // Test 1: List bucket contents
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET,
      MaxKeys: 5,
    })
    
    const listResponse = await r2Client.send(listCommand)
    console.log('✅ Successfully connected to R2!')
    console.log(`   Bucket contains ${listResponse.KeyCount || 0} objects`)
    console.log()
    
    console.log('🧪 Test 2: Upload a test file...')
    
    // Test 2: Upload a small test file
    const testContent = `Test upload at ${new Date().toISOString()}`
    const testKey = `test-uploads/test-${Date.now()}.txt`
    
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    })
    
    await r2Client.send(uploadCommand)
    console.log('✅ Successfully uploaded test file!')
    console.log(`   File key: ${testKey}`)
    console.log(`   Public URL: ${process.env.R2_PUBLIC_BASE_URL}/${testKey}`)
    console.log()
    
    console.log('🎉 All tests passed! R2 connection is working correctly.')
    console.log()
    console.log('You can test the public URL by visiting:')
    console.log(`   ${process.env.R2_PUBLIC_BASE_URL}/${testKey}`)
    
  } catch (error) {
    console.error('❌ R2 Connection Error:')
    console.error('   Error type:', error.name)
    console.error('   Error message:', error.message)
    
    if (error.name === 'CredentialsProviderError') {
      console.error('\n💡 This usually means your credentials are incorrect.')
      console.error('   Check your R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY')
    } else if (error.name === 'NoSuchBucket') {
      console.error('\n💡 The bucket does not exist or is not accessible.')
      console.error('   Check your R2_BUCKET name and ensure it exists')
    } else if (error.message.includes('InvalidAccessKeyId')) {
      console.error('\n💡 Invalid Access Key ID.')
      console.error('   Double-check your R2_ACCESS_KEY_ID')
    } else if (error.message.includes('SignatureDoesNotMatch')) {
      console.error('\n💡 Invalid Secret Access Key.')
      console.error('   Double-check your R2_SECRET_ACCESS_KEY')
    }
    
    console.error('\n🔍 Troubleshooting steps:')
    console.error('1. Verify your credentials in Cloudflare R2 dashboard')
    console.error('2. Ensure your API token has R2:Edit permissions')
    console.error('3. Check that your bucket name is correct')
    console.error('4. Verify your account ID is correct')
  }
}

testR2Connection()
