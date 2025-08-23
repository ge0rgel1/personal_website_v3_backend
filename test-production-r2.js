// Comprehensive test script for R2 production setup
// Run with: node test-production-r2.js

const { S3Client, PutObjectCommand, ListObjectsV2Command, HeadObjectCommand } = require('@aws-sdk/client-s3')
const { config } = require('dotenv')
const https = require('https')
const fs = require('fs')

// Load environment variables
config({ path: '.env.local' })

console.log('🔧 Testing R2 Production Setup...\n')

// Display configuration
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

// Function to test URL accessibility
function testUrlAccess(url) {
  return new Promise((resolve) => {
    const request = https.get(url, (response) => {
      let data = ''
      response.on('data', chunk => data += chunk)
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          data: data.substring(0, 100) // First 100 chars
        })
      })
    })
    
    request.on('error', (error) => {
      resolve({
        error: error.message,
        statusCode: null
      })
    })
    
    request.setTimeout(5000, () => {
      request.destroy()
      resolve({
        error: 'Request timeout',
        statusCode: null
      })
    })
  })
}

// Function to create a simple test image (1x1 PNG)
function createTestImage() {
  // Base64 encoded 1x1 transparent PNG
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  return Buffer.from(pngBase64, 'base64')
}

async function runTests() {
  console.log('🧪 Starting comprehensive tests...\n')
  
  try {
    // Test 1: Basic R2 connection
    console.log('📋 Test 1: R2 Connection & Bucket Access')
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET,
      MaxKeys: 5,
    })
    
    const listResponse = await r2Client.send(listCommand)
    console.log('✅ R2 connection successful')
    console.log(`   Bucket contains ${listResponse.KeyCount || 0} objects`)
    
    if (listResponse.Contents && listResponse.Contents.length > 0) {
      console.log('   Recent objects:')
      listResponse.Contents.forEach(obj => {
        console.log(`   - ${obj.Key} (${obj.Size} bytes)`)
      })
    }
    console.log()
    
    // Test 2: Upload a test image
    console.log('🖼️  Test 2: Image Upload')
    const testImageBuffer = createTestImage()
    const testKey = `test-images/production-test-${Date.now()}.png`
    
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: testKey,
      Body: testImageBuffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000',
    })
    
    await r2Client.send(uploadCommand)
    console.log('✅ Image upload successful')
    console.log(`   Uploaded to: ${testKey}`)
    console.log()
    
    // Test 3: Verify the uploaded file exists
    console.log('🔍 Test 3: Verify Upload')
    const headCommand = new HeadObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: testKey,
    })
    
    const headResponse = await r2Client.send(headCommand)
    console.log('✅ File verification successful')
    console.log(`   Content-Type: ${headResponse.ContentType}`)
    console.log(`   Content-Length: ${headResponse.ContentLength} bytes`)
    console.log(`   Last-Modified: ${headResponse.LastModified}`)
    console.log()
    
    // Test 4: Test different URL formats
    console.log('🌐 Test 4: Testing URL Accessibility')
    
    // Test the configured public URL
    const configuredUrl = `${process.env.R2_PUBLIC_BASE_URL}/${testKey}`
    console.log(`Testing configured URL: ${configuredUrl}`)
    const configuredResult = await testUrlAccess(configuredUrl)
    
    if (configuredResult.statusCode === 200) {
      console.log('✅ Configured URL works!')
    } else if (configuredResult.statusCode === 403) {
      console.log('❌ Configured URL returns 403 Forbidden (bucket may not be public)')
    } else if (configuredResult.error) {
      console.log(`❌ Configured URL error: ${configuredResult.error}`)
    } else {
      console.log(`❌ Configured URL returns status: ${configuredResult.statusCode}`)
    }
    console.log()
    
    // Test alternative URL formats
    console.log('🔧 Testing Alternative URL Formats:')
    
    // Format 1: Without bucket in path
    const altUrl1 = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${testKey}`
    console.log(`Alt URL 1: ${altUrl1}`)
    const alt1Result = await testUrlAccess(altUrl1)
    console.log(`   Status: ${alt1Result.statusCode || 'Error: ' + alt1Result.error}`)
    
    // Format 2: Direct bucket URL
    const altUrl2 = `https://${process.env.R2_BUCKET}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${testKey}`
    console.log(`Alt URL 2: ${altUrl2}`)
    const alt2Result = await testUrlAccess(altUrl2)
    console.log(`   Status: ${alt2Result.statusCode || 'Error: ' + alt2Result.error}`)
    
    console.log()
    
    // Test 5: Recommendations
    console.log('💡 Recommendations:')
    
    if (configuredResult.statusCode === 200) {
      console.log('✅ Your current URL configuration is working correctly!')
    } else if (alt1Result.statusCode === 200) {
      console.log('💡 Try updating your R2_PUBLIC_BASE_URL to:')
      console.log(`   https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`)
    } else if (alt2Result.statusCode === 200) {
      console.log('💡 Try updating your R2_PUBLIC_BASE_URL to:')
      console.log(`   https://${process.env.R2_BUCKET}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`)
    } else {
      console.log('❌ None of the URL formats work. Possible issues:')
      console.log('   1. Bucket is not set to public access')
      console.log('   2. CORS settings may be blocking access')
      console.log('   3. R2 public access may not be enabled')
      console.log()
      console.log('🔧 To fix this:')
      console.log('   1. Go to Cloudflare R2 dashboard')
      console.log('   2. Click on your bucket')
      console.log('   3. Go to Settings tab')
      console.log('   4. Enable "Allow Access" under Public access')
    }
    
    console.log()
    console.log('🎯 Test Summary:')
    console.log(`   R2 Upload: ✅ Working`)
    console.log(`   File Verification: ✅ Working`) 
    console.log(`   Public URL: ${configuredResult.statusCode === 200 ? '✅ Working' : '❌ Not Working'}`)
    
  } catch (error) {
    console.error('❌ Test Error:')
    console.error('   Error type:', error.name)
    console.error('   Error message:', error.message)
    
    if (error.message.includes('NoSuchBucket')) {
      console.error('\n💡 Bucket does not exist or bucket name is incorrect')
      console.error('   Check your R2_BUCKET name in .env.local')
    } else if (error.message.includes('InvalidAccessKeyId')) {
      console.error('\n💡 Invalid Access Key ID')
      console.error('   Check your R2_ACCESS_KEY_ID in .env.local')
    } else if (error.message.includes('SignatureDoesNotMatch')) {
      console.error('\n💡 Invalid Secret Access Key')
      console.error('   Check your R2_SECRET_ACCESS_KEY in .env.local')
    }
  }
}

runTests()
