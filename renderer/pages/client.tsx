import React, { useState, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { WebRTCManager } from '../utils/webrtc'

export default function ClientPage() {
  const [sessionId, setSessionId] = useState('')
  const [hostIP, setHostIP] = useState('localhost')
  const [isConnected, setIsConnected] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewMode, setViewMode] = useState<'windowed' | 'fullscreen'>('windowed')
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [errorMessage, setErrorMessage] = useState('')
  const windowedVideoRef = useRef<HTMLVideoElement>(null)
  const fullscreenVideoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const webrtcManagerRef = useRef<WebRTCManager | null>(null)

  const connectToHost = async () => {
    if (!sessionId.trim()) {
      setErrorMessage('Please enter a session ID')
      return
    }

    try {
      setConnectionStatus('connecting')
      setErrorMessage('')
      
      // Set HOST_IP in multiple places for WebRTC manager to use
      localStorage.setItem('HOST_IP', hostIP);
      (window as any).HOST_IP = hostIP;
      
      // Set HOST_IP for WebRTC connection
      
      // Initialize WebRTC manager
      webrtcManagerRef.current = new WebRTCManager()
      
      // Set up stream received handler
      webrtcManagerRef.current.setOnStreamReceived((stream) => {
        // Set connected state and auto-enter fullscreen
        setIsConnected(true)
        setConnectionStatus('connected')
        
        setTimeout(() => {
          const videoElement = viewMode === 'windowed' ? windowedVideoRef.current : fullscreenVideoRef.current
          if (videoElement) {
            videoElement.srcObject = stream
            videoElement.play().then(() => {
              // Enter fullscreen only if user selected fullscreen mode
              if (viewMode === 'fullscreen') {
                enterFullscreen()
              }
            }).catch(e => {
              console.error('Video play failed:', e)
            })
          }
        }, 100)
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
      
      // Provide more specific error messages
      if (error instanceof Error && error.message.includes('Session not found')) {
        setErrorMessage('Session not found. Make sure the host has started sharing and the session ID is correct.')
      } else {
        setErrorMessage('Failed to connect to host. Please check the session ID and try again.')
      }
    }
  }

  const enterFullscreen = async () => {
    try {
      if (containerRef.current && !isFullscreen) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error)
    }
  }

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement && isFullscreen) {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error('Failed to exit fullscreen:', error)
    }
  }

  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen()
    } else {
      enterFullscreen()
    }
  }

  const disconnect = () => {
    // Exit fullscreen before disconnecting
    if (isFullscreen) {
      exitFullscreen()
    }
    
    setIsConnected(false)
    setConnectionStatus('disconnected')
    setErrorMessage('')
    
    // Stop video streams from both video elements
    const videoElements = [windowedVideoRef.current, fullscreenVideoRef.current]
    videoElements.forEach(videoElement => {
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
        videoElement.srcObject = null
      }
    })

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
      
      <div ref={containerRef} className={`${isFullscreen ? 'fixed inset-0 bg-black z-50' : 'min-h-screen bg-gradient-to-br from-green-50 to-emerald-100'}`}>
        {/* Fullscreen Controls Overlay */}
        {isFullscreen && isConnected && (
          <div className="absolute top-4 right-4 z-60 flex space-x-2">
            <button
              onClick={toggleFullscreen}
              className="bg-black bg-opacity-50 text-white p-2 rounded-lg hover:bg-opacity-70 transition-opacity"
              title="Exit Fullscreen (ESC)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={disconnect}
              className="bg-red-600 bg-opacity-80 text-white p-2 rounded-lg hover:bg-opacity-100 transition-opacity"
              title="Disconnect"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </button>
          </div>
        )}

        {!isFullscreen && (
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
              
              {/* Instructions */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-medium text-blue-800 mb-1">How to connect:</h3>
                    <ol className="text-sm text-blue-700 space-y-1">
                      <li>1. Ask the host to start sharing their screen</li>
                      <li>2. Get the session ID from the host</li>
                      <li>3. Enter the session ID below and click "Connect"</li>
                    </ol>
                  </div>
                </div>
              </div>
              
              {/* View Mode Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Display Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setViewMode('windowed')}
                    disabled={isConnected}
                    className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                      viewMode === 'windowed'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                    } ${isConnected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="text-center">
                      <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
                      </svg>
                      <h3 className="font-semibold text-sm">Windowed</h3>
                      <p className="text-xs mt-1">Small window, multitask</p>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setViewMode('fullscreen')}
                    disabled={isConnected}
                    className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                      viewMode === 'fullscreen'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                    } ${isConnected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="text-center">
                      <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      <h3 className="font-semibold text-sm">Fullscreen</h3>
                      <p className="text-xs mt-1">Like AnyDesk</p>
                    </div>
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Choose how you want to view the remote screen
                </p>
              </div>

              {/* Host IP Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Host Computer IP Address
                </label>
                <input
                  type="text"
                  value={hostIP}
                  onChange={(e) => setHostIP(e.target.value)}
                  placeholder="Enter host IP (e.g., 192.168.1.5 or localhost)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black text-lg"
                  disabled={isConnected}
                />
                <p className="text-sm text-gray-600 mt-2">
                  Enter the IP address of the host computer (use "localhost" for same computer)
                </p>
              </div>

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
              
              <div className="bg-gray-100 rounded-lg overflow-hidden aspect-video flex items-center justify-center relative">
                {/* Windowed mode video */}
                {isConnected && viewMode === 'windowed' && (
                  <video
                    ref={windowedVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                  />
                )}
                
                {!isConnected && (
                  <div className="text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 616 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <p className="text-lg font-medium">Remote screen will appear here</p>
                    <p className="text-sm">Enter a session ID and click "Connect"</p>
                  </div>
                )}
                
                {isConnected && viewMode === 'fullscreen' && (
                  <div className="text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    <p className="text-lg font-medium">Fullscreen mode active</p>
                    <p className="text-sm">Press ESC or click the exit button to return</p>
                  </div>
                )}
              </div>
              
              {/* View Mode Controls */}
              {isConnected && (
                <div className="mt-4 space-y-3">
                  {viewMode === 'windowed' && !isFullscreen && (
                    <button
                      onClick={enterFullscreen}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      <span>Switch to Fullscreen</span>
                    </button>
                  )}
                  
                  {viewMode === 'fullscreen' && !isFullscreen && (
                    <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-700 font-medium">Fullscreen mode will activate automatically</p>
                      <p className="text-sm text-blue-600 mt-1">The remote screen will take over your entire display</p>
                    </div>
                  )}
                </div>
              )}
              
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
        )}

        {/* Fullscreen video element (only for fullscreen mode) */}
        {viewMode === 'fullscreen' && (
          <video
            ref={fullscreenVideoRef}
            autoPlay
            muted
            playsInline
            className={`${isFullscreen ? 'w-full h-full object-contain' : 'hidden'}`}
          />
        )}
      </div>
    </React.Fragment>
  )
} 