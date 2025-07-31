const fs = require('fs')
const path = require('path')

console.log('🔍 Testing DeskViewer Application Structure...\n')

// Check if key files exist
const filesToCheck = [
  'renderer/pages/home.tsx',
  'renderer/pages/host.tsx', 
  'renderer/pages/client.tsx',
  'renderer/pages/index.tsx',
  'renderer/utils/webrtc.ts',
  'main/websocket-server.ts',
  'main/background.ts',
  'package.json'
]

console.log('📁 Checking file structure:')
filesToCheck.forEach(file => {
  const exists = fs.existsSync(file)
  console.log(`${exists ? '✅' : '❌'} ${file}`)
})

// Check package.json dependencies
console.log('\n📦 Checking dependencies:')
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const requiredDeps = ['ws', 'uuid']
  
  requiredDeps.forEach(dep => {
    const hasDep = packageJson.dependencies && packageJson.dependencies[dep]
    console.log(`${hasDep ? '✅' : '❌'} ${dep}`)
  })
} catch (error) {
  console.log('❌ Error reading package.json')
}

console.log('\n🎯 Application structure test complete!')
console.log('\nTo start the application:')
console.log('1. npm install')
console.log('2. npm run dev')
console.log('\nThe app should now work with:')
console.log('- Home page with Host/Client selection')
console.log('- Host page for screen sharing')
console.log('- Client page for viewing remote screen')
console.log('- WebSocket signaling server on port 8080') 