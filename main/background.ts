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

// Handle mouse control (optimized for performance)
ipcMain.handle('mouse-move', async (event, x: number, y: number) => {
  try {
    // Fast mouse move without logging for better performance
    robot.moveMouse(Math.round(x), Math.round(y))
    return { success: true }
  } catch (error) {
    console.error('❌ MAIN: Mouse move error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('mouse-click', async (event, x: number, y: number, button: string = 'left') => {
  try {
    // Remove delay for faster clicks
    robot.moveMouse(Math.round(x), Math.round(y))
    robot.mouseClick(button === 'right' ? 'right' : 'left')
    
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


