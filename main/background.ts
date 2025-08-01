import path from 'path'
import { app, ipcMain, desktopCapturer, screen } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
const robot = require('@jitsi/robotjs')

const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

;(async () => {
  await app.whenReady()

  const electronRole = process.env.ELECTRON_ROLE || 'default'
  const windowTitle = electronRole === 'host' ? 'DeskViewer - Host' : 
                     electronRole === 'client' ? 'DeskViewer - Client' : 'DeskViewer'
  
  const mainWindow = createWindow('main', {
    width: 1200,
    height: 800,
    title: windowTitle,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  })

  if (isProd) {
    const roleParam = electronRole !== 'default' ? `?role=${electronRole}` : ''
    await mainWindow.loadURL(`app://./${roleParam}`)
  } else {
    const port = process.argv[2]
    const roleParam = electronRole !== 'default' ? `?role=${electronRole}` : ''
    await mainWindow.loadURL(`http://localhost:${port}/${roleParam}`)
    mainWindow.webContents.openDevTools()
  }

  // Handle client-side routing
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    const pathname = parsedUrl.pathname
    
    // Allow navigation to our app routes
    if (pathname === '/' || pathname === '/home' || pathname === '/host' || pathname === '/client') {
      return
    }
    
    // Prevent navigation to external URLs
    event.preventDefault()
  })
})()

app.on('window-all-closed', () => {
  app.quit()
})

ipcMain.on('message', async (event, arg) => {
  event.reply('message', `${arg} World!`)
})

// Handle screen capture permission
ipcMain.handle('get-display-media', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1920, height: 1080 }
  })
  return sources
})

// Handle mouse control
ipcMain.handle('mouse-move', async (event, x: number, y: number) => {
  try {
    console.log(`🖱️ MAIN: Moving mouse to (${x}, ${y})`)
    
    // Test if robotjs is working
    const currentPos = robot.getMousePos()
    console.log(`🖱️ MAIN: Current mouse position: (${currentPos.x}, ${currentPos.y})`)
    
    robot.moveMouse(Math.round(x), Math.round(y))
    
    // Verify the move worked
    const newPos = robot.getMousePos()
    console.log(`🖱️ MAIN: New mouse position: (${newPos.x}, ${newPos.y})`)
    
    return { success: true, from: currentPos, to: newPos }
  } catch (error) {
    console.error('❌ MAIN: Mouse move error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('mouse-click', async (event, x: number, y: number, button: string = 'left') => {
  try {
    console.log(`🖱️ MAIN: Clicking ${button} at (${x}, ${y})`)
    
    robot.moveMouse(Math.round(x), Math.round(y))
    
    // Add small delay to ensure mouse position is set
    await new Promise(resolve => setTimeout(resolve, 10))
    
    robot.mouseClick(button === 'right' ? 'right' : 'left')
    
    console.log(`✅ MAIN: ${button} click completed at (${x}, ${y})`)
    return { success: true }
  } catch (error) {
    console.error('❌ MAIN: Mouse click error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('mouse-down', async (event, x: number, y: number, button: string = 'left') => {
  try {
    robot.moveMouse(Math.round(x), Math.round(y))
    robot.mouseToggle('down', button === 'right' ? 'right' : 'left')
    return { success: true }
  } catch (error) {
    console.error('Mouse down error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('mouse-up', async (event, x: number, y: number, button: string = 'left') => {
  try {
    robot.moveMouse(Math.round(x), Math.round(y))
    robot.mouseToggle('up', button === 'right' ? 'right' : 'left')
    return { success: true }
  } catch (error) {
    console.error('Mouse up error:', error)
    return { success: false, error: error.message }
  }
})

// Get screen resolution
ipcMain.handle('get-screen-resolution', async () => {
  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.size
    return { width, height }
  } catch (error) {
    console.error('Get screen resolution error:', error)
    return { width: 1920, height: 1080 } // fallback
  }
})

// Test robotjs functionality
ipcMain.handle('test-robotjs', async () => {
  try {
    console.log('🧪 MAIN: Testing robotjs...')
    
    // Test getting mouse position
    const pos = robot.getMousePos()
    console.log(`🖱️ MAIN: Current mouse position: (${pos.x}, ${pos.y})`)
    
    // Test moving mouse slightly
    const testX = pos.x + 10
    const testY = pos.y + 10
    
    robot.moveMouse(testX, testY)
    
    // Verify move
    const newPos = robot.getMousePos()
    console.log(`🖱️ MAIN: After move: (${newPos.x}, ${newPos.y})`)
    
    // Move back
    robot.moveMouse(pos.x, pos.y)
    
    return { 
      success: true, 
      originalPos: pos, 
      testPos: { x: testX, y: testY },
      actualPos: newPos 
    }
  } catch (error) {
    console.error('❌ MAIN: robotjs test failed:', error)
    return { success: false, error: error.message }
  }
})
