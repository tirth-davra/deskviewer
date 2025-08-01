import { WebSocketServer, WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'

interface Session {
  id: string
  host: WebSocket
  clients: Map<string, WebSocket>
  createdAt: Date
}

class SignalingServer {
  private wss: WebSocketServer
  private sessions: Map<string, Session> = new Map()

  constructor(port: number = 8080) {
    this.wss = new WebSocketServer({ port })
    this.setupEventHandlers()
    console.log(`✅ WebSocket signaling server started on port ${port}`)
    console.log(`📡 Server is ready to accept connections`)
  }

  private setupEventHandlers() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('🔌 New WebSocket connection established')
      
      ws.on('message', (data: Buffer) => {
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

  private handleMessage(ws: WebSocket, message: any) {
    const { type, sessionId, clientId, data } = message

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
        this.forwardIceCandidate(sessionId, clientId, data)
        break
      
      case 'leave_session':
        this.leaveSession(sessionId, clientId)
        break
      
      default:
        console.warn('Unknown message type:', type)
    }
  }

  private createSession(ws: WebSocket, sessionId: string) {
    console.log(`🔄 Attempting to create session: ${sessionId}`)
    
    if (this.sessions.has(sessionId)) {
      console.log(`❌ Session ${sessionId} already exists`)
      ws.send(JSON.stringify({
        type: 'session_error',
        error: 'Session already exists'
      }))
      return
    }

    const session: Session = {
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

  private joinSession(ws: WebSocket, sessionId: string, clientId: string) {
    console.log(`🔄 Attempting to join session: ${sessionId} with client: ${clientId}`)
    
    const session = this.sessions.get(sessionId)
    
    if (!session) {
      console.log(`❌ Session ${sessionId} not found`)
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

  private forwardOffer(sessionId: string, clientId: string, offer: any) {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const targetWs = session.clients.get(clientId)
    if (targetWs) {
      targetWs.send(JSON.stringify({
        type: 'offer',
        sessionId,
        offer
      }))
    }
  }

  private forwardAnswer(sessionId: string, clientId: string, answer: any) {
    const session = this.sessions.get(sessionId)
    if (!session) return

    session.host.send(JSON.stringify({
      type: 'answer',
      sessionId,
      clientId,
      answer
    }))
  }

  private forwardIceCandidate(sessionId: string, clientId: string, candidate: any) {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const targetWs = session.clients.get(clientId)
    if (targetWs) {
      targetWs.send(JSON.stringify({
        type: 'ice_candidate',
        sessionId,
        candidate
      }))
    } else {
      // Forward to host if client not found
      session.host.send(JSON.stringify({
        type: 'ice_candidate',
        sessionId,
        clientId,
        candidate
      }))
    }
  }

  private leaveSession(sessionId: string, clientId: string) {
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

  private handleDisconnection(ws: WebSocket) {
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

  public getSessionInfo(sessionId: string) {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    return {
      id: session.id,
      clientCount: session.clients.size,
      createdAt: session.createdAt
    }
  }

  public close() {
    this.wss.close()
  }
}

export default SignalingServer 