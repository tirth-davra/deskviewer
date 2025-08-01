import React, { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { WebRTCManager } from '../utils/webrtc'

export default function HostPage() {
  const [sessionId, setSessionId] = useState<string>('')
  const [isSharing, setIsSharing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'waiting' | 'connected' | 'disconnected'>('disconnected')
  const [connectedClients, setConnectedClients] = useState(0)
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
      
      // Request screen capture using Electron's desktopCapturer
      const sources = await window.electronAPI.getDisplayMedia()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sources[0].id
          }
        } as any
      })

      // Stream captured successfully - no need to display locally

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

      // Cache screen resolution to avoid repeated IPC calls
      const cachedResolution = await window.electronAPI.getScreenResolution()
      
      // Set up optimized mouse event handler for remote control
      webrtcManagerRef.current.setOnMouseEvent(async (mouseData) => {
        // Fast coordinate conversion using cached resolution
        const absoluteX = Math.round(mouseData.x * cachedResolution.width)
        const absoluteY = Math.round(mouseData.y * cachedResolution.height)
        
        try {
          // Handle different mouse events without excessive logging
          if (mouseData.button) {
            // Mouse click events
            await window.electronAPI.mouseClick(absoluteX, absoluteY, mouseData.button)
          } else {
            // Mouse move event (most frequent, keep it fast)
            await window.electronAPI.mouseMove(absoluteX, absoluteY)
          }
        } catch (error) {
          console.error('❌ HOST: Mouse control error:', error)
        }
      })

      // Get and send screen resolution to clients
      const resolution = await window.electronAPI.getScreenResolution()
      
      // Start WebRTC host session
      await webrtcManagerRef.current.startHost(sessionId, stream)
      
      // Send screen resolution after connection is established
      webrtcManagerRef.current.sendScreenResolution(resolution.width, resolution.height)
      
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
    
    // Stop screen capture stream if exists
    if (webrtcManagerRef.current) {
      // WebRTC manager will handle stream cleanup
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
              
              {/* Instructions */}
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-medium text-green-800 mb-1">How to share your screen:</h3>
                    <ol className="text-sm text-green-700 space-y-1">
                      <li>1. Click "Start Sharing" to begin screen capture</li>
                      <li>2. Share the session ID with others</li>
                      <li>3. Wait for clients to connect</li>
                    </ol>
                  </div>
                </div>
              </div>
              
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
                <div className="flex items-center space-x-3 text-black">
                  <div className={`w-3 h-3 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' :
                    connectionStatus === 'waiting' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="font-medium text-black">
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

            {/* Right Panel - Connection Info */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Connection Status</h2>
              
              <div className="space-y-6">
                {/* Connection Status Display */}
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                  {connectionStatus === 'waiting' ? (
                    <>
                      <div className="animate-pulse">
                        <svg className="w-16 h-16 mx-auto mb-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">Waiting for Connection</h3>
                      <p className="text-gray-600">Share the session ID with others to connect</p>
                    </>
                  ) : connectionStatus === 'connected' ? (
                    <>
                      <svg className="w-16 h-16 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-xl font-semibold text-green-700 mb-2">Connected</h3>
                      <p className="text-green-600">{connectedClients} client{connectedClients !== 1 ? 's' : ''} viewing your screen</p>
                    </>
                  ) : (
                    <>
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                      </svg>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">Not Sharing</h3>
                      <p className="text-gray-600">Click "Start Sharing" to begin</p>
                    </>
                  )}
                </div>

                {/* Network Information */}
                {isSharing && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Network Information</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>• Your screen is being shared securely</p>
                      <p>• Session ID: <span className="font-mono font-bold">{sessionId}</span></p>
                      <p>• Status: Screen capture active</p>
                    </div>
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