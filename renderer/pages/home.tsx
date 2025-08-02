import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function HomePage() {
  const [sessionId, setSessionId] = useState('')
  const [inputSessionId, setInputSessionId] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('idle') // idle, connecting, connected, error
  const [role, setRole] = useState<'host' | 'client' | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Auto-generate session ID when component mounts
    if (!sessionId) {
      const generatedId = generateSessionId()
      setSessionId(generatedId)
    }
  }, [])

  const generateSessionId = () => {
    // Generate a readable session ID like "ABC123-DEF456-GHI789"
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const part1 = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const part2 = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const part3 = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    return `${part1}-${part2}-${part3}`
  }

  const copySessionId = async () => {
    try {
      await navigator.clipboard.writeText(sessionId)
      // You could add a toast notification here
      console.log('Session ID copied to clipboard')
    } catch (err) {
      console.error('Failed to copy session ID:', err)
    }
  }

  const handleConnect = async () => {
    if (!inputSessionId.trim()) {
      setConnectionStatus('error')
      return
    }

    setConnectionStatus('connecting')
    
    try {
      // Navigate to client page with session ID
      router.push(`/client?sessionId=${inputSessionId}`)
    } catch (error) {
      console.error('Connection failed:', error)
      setConnectionStatus('error')
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'idle':
        return 'Ready to connect'
      case 'connecting':
        return 'Connecting...'
      case 'connected':
        return role === 'host' ? 'Connected as Host' : 'Connected as Client'
      case 'error':
        return 'Connection failed'
      default:
        return 'Ready to connect'
    }
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'idle':
        return 'text-gray-600'
      case 'connecting':
        return 'text-blue-600'
      case 'connected':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <React.Fragment>
      <Head>
        <title>DeskViewer - Remote Desktop App</title>
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="ml-auto mr-auto mb-4 flex justify-center">
              <svg className="w-20 h-20 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-2 3v1h8v-1l-2-3h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H3V4h18v10z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">DeskViewer</h1>
            <p className="text-gray-600">Remote Desktop Application</p>
          </div>

          {/* Your Session ID Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Your Session ID
            </h2>
            
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 mb-3">
              <div className="font-mono text-lg text-gray-800 text-center font-semibold">
                {sessionId}
              </div>
            </div>
            
            <button
              onClick={copySessionId}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy Session ID</span>
            </button>
          </div>

          {/* Connect to Session Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Connect to Session
            </h2>
            
            <div className="space-y-3">
              <input
                type="text"
                value={inputSessionId}
                onChange={(e) => setInputSessionId(e.target.value.toUpperCase())}
                placeholder="Enter Session ID..."
                className="w-full text-black px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-center font-mono text-lg"
                maxLength={20}
              />
              
              <button
                onClick={handleConnect}
                disabled={!inputSessionId.trim() || connectionStatus === 'connecting'}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span>Connect</span>
              </button>
            </div>
          </div>

          {/* Status Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Connection Status
            </h2>
            
            <div className={`text-center py-3 px-4 rounded-lg bg-gray-50 ${getStatusColor()}`}>
              <div className="font-medium">{getStatusText()}</div>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  )
}
