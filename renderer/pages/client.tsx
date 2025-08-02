import React, { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { WebRTCManager } from '../utils/webrtc'

export default function ClientPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [sessionId, setSessionId] = useState('')
  const [error, setError] = useState('')
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

      webrtc.setOnRoleDetected((role) => {
        console.log('Role detected:', role)
        if (role === 'client') {
          setConnectionStatus('connected')
          setIsConnected(true)
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

  const disconnect = () => {
    setIsConnected(false)
    setConnectionStatus('disconnected')
    router.push('/')
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting to session...'
      case 'connected':
        return 'Connected to remote screen'
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
        <title>DeskViewer - Client</title>
      </Head>
      
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-2 3v1h8v-1l-2-3h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H3V4h18v10z"/>
            </svg>
            <h1 className="text-xl font-bold">DeskViewer - Client</h1>
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
            {isConnected ? 'You can now view and control the remote screen' : 'Connecting to remote screen...'}
          </p>
        </div>
      </div>
    </React.Fragment>
  )
} 