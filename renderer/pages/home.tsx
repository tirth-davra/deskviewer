import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  const [selectedMode, setSelectedMode] = useState<'host' | 'client' | null>(null)

  return (
    <React.Fragment>
      <Head>
        <title>DeskViewer - Remote Desktop App</title>
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <Image
              className="ml-auto mr-auto mb-4"
              src="/images/logo.png"
              alt="Logo image"
              width={80}
              height={80}
            />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">DeskViewer</h1>
            <p className="text-gray-600">Remote Desktop Application</p>
          </div>

          {!selectedMode ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-center text-gray-700 mb-6">
                Choose your role
              </h2>
              
              <button
                onClick={() => setSelectedMode('host')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-3 mb-4"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Host - Share Your Screen</span>
              </button>
              
              <button
                onClick={() => setSelectedMode('client')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Client - View Remote Screen</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedMode(null)}
                className="text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-2 mb-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
              </button>
              
              {selectedMode === 'host' ? (
                <Link href="/host" className="block">
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center hover:bg-blue-100 transition-colors duration-200">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">Host Mode</h3>
                    <p className="text-blue-600 text-sm">Share your screen with others</p>
                  </div>
                </Link>
              ) : (
                <Link href="/client" className="block">
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center hover:bg-green-100 transition-colors duration-200">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">Client Mode</h3>
                    <p className="text-green-600 text-sm">Connect to a host and view their screen</p>
                  </div>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </React.Fragment>
  )
}
