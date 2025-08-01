import React, { useState, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { WebRTCManager } from '../utils/webrtc'

export default function ClientPage() {
  const [sessionId, setSessionId] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [errorMessage, setErrorMessage] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const webrtcManagerRef = useRef<WebRTCManager | null>(null)

  const connectToHost = async () => {
    if (!sessionId.trim()) {
      setErrorMessage('Please enter a session ID')
      return
    }

    try {
      setConnectionStatus('connecting')
      setErrorMessage('')
      
      // Initialize WebRTC manager
      webrtcManagerRef.current = new WebRTCManager()
      
      // Set up stream received handler
      webrtcManagerRef.current.setOnStreamReceived((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setIsConnected(true)
        setConnectionStatus('connected')
      })

      // Set up connection state change handler
      webrtcManagerRef.current.setOnConnectionStateChange((state) => {
        if (state === 'connected') {
          setConnectionStatus('connected')
        } else if (state === 'disconnected') {
          setConnectionStatus('disconnected')
          setIsConnected(false)
        }
      })

      // Start WebRTC client session
      await webrtcManagerRef.current.startClient(sessionId)
      
      console.log('Connecting to session:', sessionId)
      
    } catch (error) {
      console.error('Error connecting to host:', error)
      setConnectionStatus('disconnected')
      setErrorMessage('Failed to connect to host. Please check the session ID.')
    }
  }

  const disconnect = () => {
    setIsConnected(false)
    setConnectionStatus('disconnected')
    setErrorMessage('')
    
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

  return (
    <React.Fragment>
      <Head>
        <title>Client - DeskViewer</title>
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/home" className="text-green-600 hover:text-green-800 font-medium flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Home</span>
            </Link>
            <h1 className="text-3xl font-bold text-gray-800">Client Mode</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel - Connection Controls */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Connect to Host</h2>
              
              {/* Session ID Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Host Session ID
                </label>
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value.toUpperCase())}
                  placeholder="Enter session ID (e.g., ABC123)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black text-lg"
                  maxLength={6}
                  disabled={isConnected}
                />
                <p className="text-sm text-gray-600 mt-2">
                  Enter the session ID provided by the host
                </p>
              </div>

              {/* Connection Status */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Connection Status
                </label>
                <div className="flex items-center space-x-3 text-black">
                  <div className={`w-3 h-3 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' :
                    connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="font-medium">
                    {connectionStatus === 'connected' ? 'Connected' :
                     connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-700 font-medium">{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-4">
                {!isConnected ? (
                  <button
                    onClick={connectToHost}
                    disabled={connectionStatus === 'connecting'}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-3"
                  >
                    {connectionStatus === 'connecting' ? (
                      <>
                        <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Connect</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={disconnect}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-3"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Disconnect</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Panel - Remote Screen */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Remote Screen</h2>
              
              <div className="bg-gray-100 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                {isConnected ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <p className="text-lg font-medium">Remote screen will appear here</p>
                    <p className="text-sm">Enter a session ID and click "Connect"</p>
                  </div>
                )}
              </div>
              
              {isConnected && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-green-700 font-medium">Connected to session: {sessionId}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  )
} 