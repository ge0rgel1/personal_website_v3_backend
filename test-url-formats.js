// Quick test to find the correct public URL format
const { config } = require('dotenv')
const https = require('https')

config({ path: '.env.local' })

// We know this file exists from previous tests
const testFileName = 'test-images/production-test-1755045462618.png'

console.log('🔍 Testing different URL formats for accessing files...\n')

function testUrl(url, description) {
  return new Promise((resolve) => {
    console.log(`Testing ${description}:`)
    console.log(`  ${url}`)
    
    const request = https.get(url, (response) => {
      console.log(`  Status: ${response.statusCode}`)
      if (response.statusCode === 200) {
        console.log('  ✅ SUCCESS!')
      } else if (response.statusCode === 403) {
        console.log('  ❌ Forbidden (bucket not public)')
      } else {
        console.log('  ❌ Failed')
      }
      resolve(response.statusCode)
    })
    
    request.on('error', (error) => {
      console.log(`  ❌ Error: ${error.message}`)
      resolve(null)
    })
    
    request.setTimeout(3000, () => {
      request.destroy()
      console.log('  ❌ Timeout')
      resolve(null)
    })
  })
}

async function testAllFormats() {
  const formats = [
    {
      url: `https://pub-6dd13910f89644f68ddb4e678bc6be56.r2.dev/${testFileName}`,
      desc: 'Previous dev URL (from your old config)'
    },
    {
      url: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${testFileName}`,
      desc: 'Direct account URL'
    },
    {
      url: `https://${process.env.R2_BUCKET}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${testFileName}`,
      desc: 'Bucket subdomain URL'
    },
    {
      url: `https://${process.env.R2_PUBLIC_BASE_URL}/${testFileName}`,
      desc: 'Your current configured URL'
    }
  ]
  
  for (const format of formats) {
    await testUrl(format.url, format.desc)
    console.log()
  }
  
  console.log('💡 Instructions:')
  console.log('1. If none work, you need to enable public access in R2 dashboard')
  console.log('2. If one works, update your R2_PUBLIC_BASE_URL to the working base URL')
  console.log('3. The public URL should NOT include the account ID endpoint used for API calls')
}

testAllFormats()
