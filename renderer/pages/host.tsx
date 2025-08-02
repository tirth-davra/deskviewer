import React, { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { WebRTCManager } from '../utils/webrtc'

export default function HostPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [sessionId, setSessionId] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Get session ID from URL parameters
    const { sessionId: urlSessionId } = router.query
    if (urlSessionId && typeof urlSessionId === 'string') {
      setSessionId(urlSessionId)
      startSharing(urlSessionId)
    }
  }, [router.query])

  const startSharing = async (sessionId: string) => {
    try {
      setConnectionStatus('connecting')
      
      // Get screen stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always'
        },
        audio: false
      })

      // Set up WebRTC
      const webrtc = new WebRTCManager()
      
      webrtc.setOnStreamReceived((remoteStream) => {
        console.log('Received remote stream')
      })

      webrtc.setOnConnectionStateChange((state) => {
        console.log('Connection state:', state)
        if (state === 'connected') {
          setConnectionStatus('connected')
          setIsSharing(true)
        } else if (state === 'disconnected') {
          setConnectionStatus('disconnected')
          setIsSharing(false)
        }
      })

      webrtc.setOnRoleDetected((role) => {
        console.log('Role detected:', role)
        if (role === 'host') {
          setConnectionStatus('connected')
          setIsSharing(true)
        }
      })

      // Connect to session with stream (makes us the host)
      await webrtc.connectToSession(sessionId, stream)
      
      // Display local stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Send screen resolution
      webrtc.sendScreenResolution(
        window.screen.width,
        window.screen.height
      )

    } catch (error) {
      console.error('Error starting sharing:', error)
      setError('Failed to start screen sharing. Please check permissions.')
      setConnectionStatus('error')
    }
  }

  const stopSharing = () => {
    setIsSharing(false)
    setConnectionStatus('disconnected')
    router.push('/')
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting to session...'
      case 'connected':
        return 'Screen sharing active'
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
        <title>DeskViewer - Host</title>
      </Head>
      
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-2 3v1h8v-1l-2-3h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H3V4h18v10z"/>
            </svg>
            <h1 className="text-xl font-bold">DeskViewer - Host</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`text-sm ${getStatusColor()}`}>
              {getStatusText()}
            </div>
            <button
              onClick={stopSharing}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              Stop Sharing
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
            <button
              onClick={() => navigator.clipboard.writeText(sessionId)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors duration-200"
            >
              Copy
            </button>
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
          <video
            ref={videoRef}
            autoPlay
            muted
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          />
        </div>

        {/* Instructions */}
        <div className="bg-gray-800 text-white p-4 text-center">
          <p className="text-gray-300">
            Share this session ID with others to allow them to view your screen
          </p>
        </div>
      </div>
    </React.Fragment>
  )
} 