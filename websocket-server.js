const { WebSocketServer } = require('ws')

class SignalingServer {
  constructor(port = 8080) {
    this.wss = new WebSocketServer({ 
      port,
      host: '0.0.0.0' // Listen on all network interfaces
    })
    this.sessions = new Map()
    this.setupEventHandlers()
    
    // Get local IP address
    const os = require('os')
    const networkInterfaces = os.networkInterfaces()
    let localIP = 'localhost'
    
    for (const interfaceName in networkInterfaces) {
      const networkInterface = networkInterfaces[interfaceName]
      for (const network of networkInterface) {
        if (network.family === 'IPv4' && !network.internal) {
          localIP = network.address
          break
        }
      }
    }
    
    console.log(`✅ WebSocket signaling server started on port ${port}`)
    console.log(`📡 Server is ready to accept connections`)
    console.log(`🌐 Local network access: ws://${localIP}:${port}`)
    console.log(`🏠 Localhost access: ws://localhost:${port}`)
  }

  setupEventHandlers() {
    this.wss.on('connection', (ws) => {
      console.log('🔌 New WebSocket connection established')
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          console.log('📨 Received message:', message.type, 'from session:', message.sessionId)
          this.handleMessage(ws, message)
        } catch (error) {
          console.error('❌ Error parsing message:', error)
        }
      })

      ws.on('close', () => {
        console.log('🔌 WebSocket connection closed')
        this.handleDisconnection(ws)
      })

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error)
        this.handleDisconnection(ws)
      })
    })
  }

  handleMessage(ws, message) {
    const { type, sessionId, clientId, data } = message

    console.log(`📨 Processing message: ${type} for session: ${sessionId}`)
    console.log(`📊 Current sessions: ${this.sessions.size}`)
    console.log(`📋 Session IDs: ${Array.from(this.sessions.keys()).join(', ')}`)

    switch (type) {
      case 'create_session':
        this.createSession(ws, sessionId)
        break
      
      case 'join_session':
        this.joinSession(ws, sessionId, clientId)
        break
      
      case 'offer':
        this.forwardOffer(sessionId, clientId, data)
        break
      
      case 'answer':
        this.forwardAnswer(sessionId, clientId, data)
        break
      
      case 'ice_candidate':
        this.forwardIceCandidate(sessionId, clientId, data, ws)
        break
      
              case 'leave_session':
          this.leaveSession(sessionId, clientId)
          break
        
        case 'mouse_move':
        case 'mouse_click':
        case 'mouse_down':
        case 'mouse_up':
          this.forwardMouseEvent(sessionId, clientId, type, message.mouseData, ws)
          break
        
        case 'screen_resolution':
          this.forwardScreenResolution(sessionId, clientId, message.resolution, ws)
          break
        
        case 'key_down':
        case 'key_up':
          this.forwardKeyboardEvent(sessionId, clientId, type, message.keyboardData, ws)
          break
        
        default:
          console.warn('Unknown message type:', type)
    }
  }

  createSession(ws, sessionId) {
    console.log(`🔄 Attempting to create session: ${sessionId}`)
    
    if (this.sessions.has(sessionId)) {
      console.log(`❌ Session ${sessionId} already exists`)
      ws.send(JSON.stringify({
        type: 'session_error',
        error: 'Session already exists'
      }))
      return
    }

    const session = {
      id: sessionId,
      host: ws,
      clients: new Map(),
      createdAt: new Date()
    }

    this.sessions.set(sessionId, session)
    
    ws.send(JSON.stringify({
      type: 'session_created',
      sessionId
    }))

    console.log(`✅ Session created: ${sessionId}`)
  }

  joinSession(ws, sessionId, clientId) {
    console.log(`🔄 Attempting to join session: ${sessionId} with client: ${clientId}`)
    console.log(`📊 Available sessions: ${Array.from(this.sessions.keys()).join(', ')}`)
    
    const session = this.sessions.get(sessionId)
    
    if (!session) {
      console.log(`❌ Session ${sessionId} not found`)
      console.log(`🔍 Looking for session: ${sessionId}`)
      console.log(`📋 All sessions: ${Array.from(this.sessions.keys()).join(', ')}`)
      ws.send(JSON.stringify({
        type: 'session_error',
        error: 'Session not found'
      }))
      return
    }

    session.clients.set(clientId, ws)
    
    // Notify host about new client
    session.host.send(JSON.stringify({
      type: 'client_joined',
      clientId,
      sessionId
    }))

    // Notify client about successful join
    ws.send(JSON.stringify({
      type: 'session_joined',
      sessionId,
      clientId
    }))

    console.log(`✅ Client ${clientId} joined session ${sessionId}`)
  }

  forwardOffer(sessionId, clientId, offer) {
    console.log(`📤 Forwarding offer from host to client: ${clientId}`)
    const session = this.sessions.get(sessionId)
    if (!session) {
      console.log(`❌ Session ${sessionId} not found for offer forwarding`)
      return
    }

    const targetWs = session.clients.get(clientId)
    if (targetWs) {
      targetWs.send(JSON.stringify({
        type: 'offer',
        sessionId,
        data: offer
      }))
      console.log(`✅ Offer forwarded to client: ${clientId}`)
    } else {
      console.log(`❌ Client ${clientId} not found in session ${sessionId}`)
    }
  }

  forwardAnswer(sessionId, clientId, answer) {
    console.log(`📤 Forwarding answer from client ${clientId} to host`)
    const session = this.sessions.get(sessionId)
    if (!session) {
      console.log(`❌ Session ${sessionId} not found for answer forwarding`)
      return
    }

    session.host.send(JSON.stringify({
      type: 'answer',
      sessionId,
      clientId,
      data: answer
    }))
    console.log(`✅ Answer forwarded to host from client: ${clientId}`)
  }

  forwardIceCandidate(sessionId, clientId, candidate, senderWs) {
    console.log(`📤 Forwarding ICE candidate for session: ${sessionId}, clientId: ${clientId}`)
    const session = this.sessions.get(sessionId)
    if (!session) {
      console.log(`❌ Session ${sessionId} not found for ICE candidate forwarding`)
      return
    }

    // Check if sender is the host
    if (senderWs === session.host) {
      console.log(`📤 ICE candidate from HOST to client: ${clientId}`)
      // Forward from host to specific client
      if (clientId) {
        const targetWs = session.clients.get(clientId)
        if (targetWs) {
          targetWs.send(JSON.stringify({
            type: 'ice_candidate',
            sessionId,
            data: candidate
          }))
          console.log(`✅ ICE candidate forwarded to client: ${clientId}`)
        } else {
          console.log(`❌ Client ${clientId} not found in session ${sessionId}`)
        }
      } else {
        // Forward to all clients if no specific clientId
        session.clients.forEach((clientWs, cId) => {
          clientWs.send(JSON.stringify({
            type: 'ice_candidate',
            sessionId,
            data: candidate
          }))
          console.log(`✅ ICE candidate forwarded to client: ${cId}`)
        })
      }
    } else {
      console.log(`📤 ICE candidate from CLIENT to HOST`)
      // Forward from client to host
      session.host.send(JSON.stringify({
        type: 'ice_candidate',
        sessionId,
        data: candidate
      }))
      console.log(`✅ ICE candidate forwarded to host`)
    }
  }

  leaveSession(sessionId, clientId) {
    const session = this.sessions.get(sessionId)
    if (!session) return

    session.clients.delete(clientId)
    
    // Notify host about client leaving
    session.host.send(JSON.stringify({
      type: 'client_left',
      clientId,
      sessionId
    }))

    console.log(`Client ${clientId} left session ${sessionId}`)
  }

  forwardMouseEvent(sessionId, clientId, eventType, mouseData, senderWs) {
    const session = this.sessions.get(sessionId)
    if (!session) {
      console.log(`❌ Session ${sessionId} not found for mouse event forwarding`)
      return
    }

    // Forward mouse event from client to host (optimized - no verbose logging for mouse_move)
    if (senderWs !== session.host) {
      session.host.send(JSON.stringify({
        type: eventType,
        sessionId,
        clientId,
        mouseData
      }))
      
      // Only log clicks and important events, not every mouse move
      if (eventType !== 'mouse_move') {
        console.log(`✅ Mouse event ${eventType} forwarded to host`)
      }
    }
  }

  forwardScreenResolution(sessionId, clientId, resolution, senderWs) {
    console.log(`📐 Forwarding screen resolution for session: ${sessionId}`)
    const session = this.sessions.get(sessionId)
    if (!session) {
      console.log(`❌ Session ${sessionId} not found for resolution forwarding`)
      return
    }

    // Forward screen resolution from host to all clients
    if (senderWs === session.host) {
      session.clients.forEach((clientWs, cId) => {
        clientWs.send(JSON.stringify({
          type: 'screen_resolution',
          sessionId,
          resolution
        }))
        console.log(`✅ Screen resolution forwarded to client: ${cId}`)
      })
    }
  }

  forwardKeyboardEvent(sessionId, clientId, eventType, keyboardData, senderWs) {
    const session = this.sessions.get(sessionId)
    if (!session) {
      console.log(`❌ Session ${sessionId} not found for keyboard event forwarding`)
      return
    }

    // Forward keyboard event from client to host
    if (senderWs !== session.host) {
      session.host.send(JSON.stringify({
        type: eventType,
        sessionId,
        clientId,
        keyboardData
      }))
      
      // Only log special keys to avoid spam
      if (keyboardData && (keyboardData.key.length > 1 || keyboardData.ctrlKey || keyboardData.shiftKey || keyboardData.altKey || keyboardData.metaKey)) {
        console.log(`✅ Keyboard event ${eventType} forwarded to host: ${keyboardData.key}`)
      }
    }
  }

  handleDisconnection(ws) {
    // Find and remove the disconnected client from all sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      // Check if it's the host
      if (session.host === ws) {
        // Notify all clients that host disconnected
        session.clients.forEach((clientWs) => {
          clientWs.send(JSON.stringify({
            type: 'host_disconnected',
            sessionId
          }))
        })
        
        this.sessions.delete(sessionId)
        console.log(`Session ${sessionId} deleted (host disconnected)`)
        break
      }
      
      // Check if it's a client
      for (const [clientId, clientWs] of session.clients.entries()) {
        if (clientWs === ws) {
          session.clients.delete(clientId)
          
          // Notify host about client disconnection
          session.host.send(JSON.stringify({
            type: 'client_disconnected',
            clientId,
            sessionId
          }))
          
          console.log(`Client ${clientId} disconnected from session ${sessionId}`)
          break
        }
      }
    }
  }

  close() {
    this.wss.close()
  }
}

// Start the server
const server = new SignalingServer(8080)

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WebSocket server...')
  server.close()
  process.exit(0)
})

console.log('🚀 WebSocket signaling server is running on port 8080')
console.log('💡 Press Ctrl+C to stop the server') 