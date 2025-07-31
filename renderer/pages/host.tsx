import React, { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { WebRTCManager } from '../utils/webrtc'

export default function HostPage() {
  const [sessionId, setSessionId] = useState<string>('')
  const [isSharing, setIsSharing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'waiting' | 'connected' | 'disconnected'>('disconnected')
  const [connectedClients, setConnectedClients] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const webrtcManagerRef = useRef<WebRTCManager | null>(null)

  useEffect(() => {
    // Generate a random session ID when component mounts
    const generateSessionId = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let result = ''
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return result
    }
    setSessionId(generateSessionId())
  }, [])

  const startSharing = async () => {
    try {
      setIsSharing(true)
      setConnectionStatus('waiting')
      
      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always'
        },
        audio: false
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Initialize WebRTC manager
      webrtcManagerRef.current = new WebRTCManager()
      
      // Set up connection state change handler
      webrtcManagerRef.current.setOnConnectionStateChange((state) => {
        if (state === 'connected') {
          setConnectionStatus('connected')
        } else if (state === 'disconnected') {
          setConnectionStatus('disconnected')
        }
      })

      // Start WebRTC host session
      await webrtcManagerRef.current.startHost(sessionId, stream)
      
      console.log('Screen sharing started with session ID:', sessionId)
      
    } catch (error) {
      console.error('Error starting screen sharing:', error)
      setIsSharing(false)
      setConnectionStatus('disconnected')
    }
  }

  const stopSharing = () => {
    setIsSharing(false)
    setConnectionStatus('disconnected')
    setConnectedClients(0)
    
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }

    // Disconnect WebRTC
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.disconnect()
      webrtcManagerRef.current = null
    }
  }

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId)
  }

  return (
    <React.Fragment>
      <Head>
        <title>Host - DeskViewer</title>
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/home" className="text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Home</span>
            </Link>
            <h1 className="text-3xl font-bold text-gray-800">Host Mode</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel - Controls */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Session Information</h2>
              
              {/* Session ID */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session ID
                </label>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 font-mono text-lg font-semibold text-gray-800">
                    {sessionId}
                  </div>
                  <button
                    onClick={copySessionId}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors duration-200"
                    title="Copy Session ID"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Share this ID with the person you want to connect with
                </p>
              </div>

              {/* Connection Status */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Connection Status
                </label>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' :
                    connectionStatus === 'waiting' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="font-medium">
                    {connectionStatus === 'connected' ? 'Connected' :
                     connectionStatus === 'waiting' ? 'Waiting for connection' : 'Disconnected'}
                  </span>
                </div>
                {connectionStatus === 'connected' && (
                  <p className="text-sm text-gray-600 mt-1">
                    {connectedClients} client{connectedClients !== 1 ? 's' : ''} connected
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                {!isSharing ? (
                  <button
                    onClick={startSharing}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-3"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Start Sharing</span>
                  </button>
                ) : (
                  <button
                    onClick={stopSharing}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-3"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Stop Sharing</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Panel - Preview */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Screen Preview</h2>
              
              <div className="bg-gray-100 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                {isSharing ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-lg font-medium">Screen preview will appear here</p>
                    <p className="text-sm">Click "Start Sharing" to begin</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  )
} 