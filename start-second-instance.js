const { spawn } = require('child_process')
const path = require('path')

console.log('🚀 Starting second instance of DeskViewer for testing...')
console.log('This will run on port 8889 while the first instance runs on 8888')

// Start the second instance with a different port
const child = spawn('npm', ['run', 'dev'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: '8889' // Use a different port
  }
})

child.on('error', (error) => {
  console.error('❌ Error starting second instance:', error)
})

child.on('close', (code) => {
  console.log(`Second instance exited with code ${code}`)
}) 