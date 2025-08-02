import React, { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { WebRTCManager } from '../utils/webrtc'

export default function ClientPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const webrtcRef = useRef<WebRTCManager | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [sessionId, setSessionId] = useState('')
  const [error, setError] = useState('')
  const [role, setRole] = useState<'host' | 'client' | null>(null)
  const [showScreenSharePopup, setShowScreenSharePopup] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Get session ID from URL parameters
    const { sessionId: urlSessionId } = router.query
    if (urlSessionId && typeof urlSessionId === 'string') {
      setSessionId(urlSessionId)
      connectToSession(urlSessionId)
    }
  }, [router.query])

  const connectToSession = async (sessionId: string) => {
    try {
      setConnectionStatus('connecting')
      
      // Set up WebRTC
      const webrtc = new WebRTCManager()
      webrtcRef.current = webrtc // Store reference
      
      webrtc.setOnStreamReceived((stream) => {
        console.log('Received remote stream')
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setIsConnected(true)
        setConnectionStatus('connected')
      })

      webrtc.setOnConnectionStateChange((state) => {
        console.log('Connection state:', state)
        if (state === 'connected') {
          setConnectionStatus('connected')
          setIsConnected(true)
        } else if (state === 'disconnected') {
          setConnectionStatus('disconnected')
          setIsConnected(false)
        }
      })

      webrtc.setOnRoleDetected(async (detectedRole) => {
        console.log('Role detected:', detectedRole)
        setRole(detectedRole)
        
        if (detectedRole === 'host') {
          // Host connects first - just set status, no popup yet
          setConnectionStatus('waiting_for_client')
          setIsConnected(true)
        } else if (detectedRole === 'client') {
          setConnectionStatus('connected')
          setIsConnected(true)
        }
      })

      // Listen for when a client joins (only for host)
      webrtc.setOnClientJoined(() => {
        if (role === 'host') {
          // Show screen sharing permission popup when client joins
          setShowScreenSharePopup(true)
        }
      })

      webrtc.setOnMouseEvent((mouseData) => {
        // Handle mouse events for remote control
        console.log('Mouse event received:', mouseData)
      })

      webrtc.setOnKeyboardEvent((keyboardData) => {
        // Handle keyboard events for remote control
        console.log('Keyboard event received:', keyboardData)
      })

      // Connect to session (without stream - makes us the client)
      await webrtc.connectToSession(sessionId)

    } catch (error) {
      console.error('Error connecting to session:', error)
      setError('Failed to connect to session. Please check the session ID.')
      setConnectionStatus('error')
    }
  }

  const startScreenSharing = async () => {
    setShowScreenSharePopup(false)
    setConnectionStatus('starting_screen_share')
    
    try {
      let stream: MediaStream
      
      try {
        // Try Electron's desktopCapturer API first - automatically select primary display
        const sources = await window.electronAPI.getDisplayMedia()
        
        if (!sources || sources.length === 0) {
          throw new Error('No display sources available')
        }
        
        // Automatically select the primary display (first one)
        const primarySource = sources[0]
        console.log('Selected primary display:', primarySource.name)
        
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: primarySource.id
            }
          } as any
        })
      } catch (electronError) {
        console.log('Electron API failed, trying browser API:', electronError)
        // Fallback to browser API - this will show the selection dialog
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        })
      }
      
      // Use the stored WebRTC instance
      if (webrtcRef.current) {
        await webrtcRef.current.addStreamToPeerConnection(stream)
        
        // Send screen resolution
        webrtcRef.current.sendScreenResolution(
          window.screen.width,
          window.screen.height
        )
      }
      
      setConnectionStatus('connected')
      setIsConnected(true)
      console.log('Screen sharing started successfully')
    } catch (error) {
      console.error('Failed to start screen sharing:', error)
      setError('Failed to start screen sharing. Please check permissions and try again.')
      setConnectionStatus('error')
    }
  }

  const declineScreenSharing = () => {
    setShowScreenSharePopup(false)
    setConnectionStatus('error')
    setError('Screen sharing was declined by the user.')
  }

  const disconnect = () => {
    setIsConnected(false)
    setConnectionStatus('disconnected')
    router.push('/')
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting to session...'
      case 'waiting_for_client':
        return 'Waiting for someone to join...'
      case 'starting_screen_share':
        return 'Starting screen sharing...'
      case 'connected':
        return role === 'host' ? 'Screen sharing active' : 'Connected to remote screen'
      case 'disconnected':
        return 'Disconnected'
      case 'error':
        return 'Connection failed'
      default:
        return 'Connecting...'
    }
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connecting':
      case 'waiting_for_client':
      case 'starting_screen_share':
        return 'text-blue-600'
      case 'connected':
        return 'text-green-600'
      case 'disconnected':
        return 'text-gray-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-blue-600'
    }
  }

  return (
    <React.Fragment>
      <Head>
        <title>DeskViewer - Client</title>
      </Head>
      
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-2 3v1h8v-1l-2-3h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H3V4h18v10z"/>
            </svg>
            <h1 className="text-xl font-bold">DeskViewer - {role === 'host' ? 'Host' : 'Client'}</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`text-sm ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            <button
              onClick={disconnect}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Session Info */}
        <div className="bg-gray-700 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-gray-300">Session ID: </span>
              <span className="font-mono font-semibold">{sessionId}</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-600 text-white p-4 text-center">
            {error}
          </div>
        )}

        {/* Video Display */}
        <div className="flex-1 flex items-center justify-center p-4">
          {isConnected ? (
            <video
              ref={videoRef}
              autoPlay
              className="max-w-full max-h-full rounded-lg shadow-2xl"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            />
          ) : (
            <div className="text-center text-gray-400">
              <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-lg">Waiting for connection...</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-gray-800 text-white p-4 text-center">
          <p className="text-gray-300">
            {role === 'host' 
              ? 'You are sharing your screen. Others can view and control your desktop.'
              : 'You can now view and control the remote screen'
            }
          </p>
        </div>

        {/* Screen Sharing Permission Popup */}
        {showScreenSharePopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-2xl">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Allow Screen Sharing?
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Someone is trying to connect to your session. Allow them to view and control your screen?
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={declineScreenSharing}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Decline
                  </button>
                  <button
                    onClick={startScreenSharing}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Allow
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </React.Fragment>
  )
} 