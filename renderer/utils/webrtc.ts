export interface SignalingMessage {
  type: string
  sessionId?: string
  clientId?: string
  data?: any
  mouseData?: {
    x: number
    y: number
    button?: 'left' | 'right' | 'middle'
  }
  resolution?: {
    width: number
    height: number
  }
}

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null
  private ws: WebSocket | null = null
  private sessionId: string = ''
  private clientId: string = ''
  private isHost: boolean = false
  private onStreamReceived?: (stream: MediaStream) => void
  private onConnectionStateChange?: (state: string) => void
  private onMouseEvent?: (mouseData: { x: number, y: number, button?: string }) => void
  private onScreenResolution?: (resolution: { width: number, height: number }) => void

  constructor() {
    this.setupPeerConnection()
  }

  private setupPeerConnection() {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }

    this.peerConnection = new RTCPeerConnection(configuration)

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
              // For host, send ICE candidate to all clients (no specific clientId)
      // For client, send ICE candidate to host (with clientId)
      this.sendSignalingMessage({
        type: 'ice_candidate',
        sessionId: this.sessionId,
        clientId: this.isHost ? '' : this.clientId, // Empty for host, clientId for client
        data: event.candidate
      })
      }
    }

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState
      console.log('Connection state changed:', state)
      this.onConnectionStateChange?.(state || 'unknown')
    }

    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.onStreamReceived?.(event.streams[0])
      }
    }
  }

  public async startHost(sessionId: string, stream: MediaStream): Promise<void> {
    this.sessionId = sessionId
    this.isHost = true
    this.clientId = 'host'

    await this.connectWebSocket()
    await this.createSession()
    await this.addStreamToPeerConnection(stream)
  }

  public async startClient(sessionId: string): Promise<void> {
    this.sessionId = sessionId
    this.isHost = false
    this.clientId = `client_${Math.random().toString(36).substr(2, 9)}`

    await this.connectWebSocket()
    await this.joinSession()
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Try multiple ways to get HOST_IP
      const hostIP = process.env.HOST_IP || 
                     (window as any).HOST_IP || 
                     localStorage.getItem('HOST_IP') || 
                     'localhost'
      const wsUrl = `ws://${hostIP}:8080`
      
      // Use configured host IP for connection
      
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('WebSocket connected successfully')
        resolve()
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket connection error:', error)
        reject(new Error('Failed to connect to WebSocket server. Make sure the app is running.'))
      }

      this.ws.onmessage = (event) => {
        console.log('Received WebSocket message:', event.data)
        this.handleSignalingMessage(JSON.parse(event.data))
      }

      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
      }
    })
  }

  private async createSession(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not connected'))
        return
      }

      console.log('Creating session with ID:', this.sessionId)
      this.sendSignalingMessage({
        type: 'create_session',
        sessionId: this.sessionId
      })

      const handleMessage = (event: MessageEvent) => {
        const message = JSON.parse(event.data)
        console.log('Session creation response:', message)
        
        if (message.type === 'session_created' && message.sessionId === this.sessionId) {
          console.log('Session created successfully')
          this.ws?.removeEventListener('message', handleMessage)
          resolve()
        } else if (message.type === 'session_error') {
          console.error('Session creation failed:', message.error)
          this.ws?.removeEventListener('message', handleMessage)
          reject(new Error(message.error))
        }
      }

      this.ws.addEventListener('message', handleMessage)
    })
  }

  private async joinSession(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not connected'))
        return
      }

      console.log('Joining session with ID:', this.sessionId, 'Client ID:', this.clientId)
      this.sendSignalingMessage({
        type: 'join_session',
        sessionId: this.sessionId,
        clientId: this.clientId
      })

      const handleMessage = (event: MessageEvent) => {
        const message = JSON.parse(event.data)
        console.log('Session join response:', message)
        
        if (message.type === 'session_joined' && message.sessionId === this.sessionId) {
          console.log('Successfully joined session')
          this.ws?.removeEventListener('message', handleMessage)
          resolve()
        } else if (message.type === 'session_error') {
          console.error('Session join failed:', message.error)
          this.ws?.removeEventListener('message', handleMessage)
          reject(new Error(message.error))
        }
      }

      this.ws.addEventListener('message', handleMessage)
    })
  }

  private async addStreamToPeerConnection(stream: MediaStream): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized')
    }

    stream.getTracks().forEach(track => {
      this.peerConnection?.addTrack(track, stream)
    })
  }

  private handleSignalingMessage(message: SignalingMessage) {
    console.log('Received signaling message:', message.type)

    switch (message.type) {
      case 'client_joined':
        console.log('Client joined:', message.clientId)
        // Host should create and send offer when client joins
        if (this.isHost) {
          this.createAndSendOffer(message.clientId)
        }
        break

      case 'client_left':
        console.log('Client left:', message.clientId)
        break

      case 'session_error':
        console.error('Session error:', message.data)
        // Don't throw here, let the calling code handle the error
        break

      case 'session_created':
        console.log('Session created successfully')
        break

      case 'offer':
        this.handleOffer(message.data || message.offer)
        break

      case 'answer':
        this.handleAnswer(message.data || message.answer)
        break

      case 'ice_candidate':
        this.handleIceCandidate(message.data || message.candidate)
        break

            case 'host_disconnected':
        console.log('Host disconnected')
        this.onConnectionStateChange?.('disconnected')
        break
      
      case 'client_disconnected':
        console.log('Client disconnected:', message.clientId)
        break
      
      case 'mouse_move':
      case 'mouse_click':
      case 'mouse_down':
      case 'mouse_up':
        console.log(`🖱️ WebRTC: Received ${message.type} message, isHost: ${this.isHost}`, message.mouseData)
        if (this.isHost && message.mouseData) {
          console.log(`🖱️ WebRTC: Calling onMouseEvent callback`)
          this.onMouseEvent?.(message.mouseData)
        } else {
          console.log(`🖱️ WebRTC: Not forwarding - isHost: ${this.isHost}, hasMouseData: ${!!message.mouseData}`)
        }
        break
      
      case 'screen_resolution':
        if (!this.isHost && message.resolution) {
          this.onScreenResolution?.(message.resolution)
        }
        break

      default:
        console.warn('Unknown signaling message type:', message.type)
    }
  }

  private async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.peerConnection || !offer) return

    try {
      console.log('Handling offer:', offer)
      
      // Validate offer
      if (!offer.type || !offer.sdp) {
        console.error('Invalid offer received:', offer)
        return
      }

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)

      this.sendSignalingMessage({
        type: 'answer',
        sessionId: this.sessionId,
        clientId: this.clientId,
        data: answer
      })
    } catch (error) {
      console.error('Error handling offer:', error)
    }
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection || !answer) return

    try {
      console.log('Handling answer:', answer)
      
      // Validate answer
      if (!answer.type || !answer.sdp) {
        console.error('Invalid answer received:', answer)
        return
      }

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    } catch (error) {
      console.error('Error handling answer:', error)
    }
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection || !candidate) return

    try {
      console.log('Handling ICE candidate:', candidate)
      
      // Validate ICE candidate
      if (!candidate.candidate || (!candidate.sdpMid && candidate.sdpMLineIndex === null)) {
        console.error('Invalid ICE candidate received:', candidate)
        return
      }

      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (error) {
      console.error('Error handling ICE candidate:', error)
    }
  }

  private sendSignalingMessage(message: SignalingMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.error('WebSocket not connected')
    }
  }

  public setOnStreamReceived(callback: (stream: MediaStream) => void) {
    this.onStreamReceived = callback
  }

  public setOnConnectionStateChange(callback: (state: string) => void) {
    this.onConnectionStateChange = callback
  }

  public setOnMouseEvent(callback: (mouseData: { x: number, y: number, button?: string }) => void) {
    this.onMouseEvent = callback
  }

  public setOnScreenResolution(callback: (resolution: { width: number, height: number }) => void) {
    this.onScreenResolution = callback
  }

  public sendMouseEvent(type: 'mouse_move' | 'mouse_click' | 'mouse_down' | 'mouse_up', x: number, y: number, button?: 'left' | 'right' | 'middle') {
    if (!this.isHost) {
      console.log(`🖱️ CLIENT: Sending ${type} event: (${x.toFixed(3)}, ${y.toFixed(3)})${button ? ` button: ${button}` : ''}`)
      this.sendSignalingMessage({
        type,
        sessionId: this.sessionId,
        clientId: this.clientId,
        mouseData: { x, y, button }
      })
    } else {
      console.log(`🖱️ CLIENT: Not sending mouse event - this is host`)
    }
  }

  public sendScreenResolution(width: number, height: number) {
    if (this.isHost) {
      this.sendSignalingMessage({
        type: 'screen_resolution',
        sessionId: this.sessionId,
        clientId: this.clientId,
        resolution: { width, height }
      })
    }
  }

  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized')
    }

    const offer = await this.peerConnection.createOffer()
    await this.peerConnection.setLocalDescription(offer)

    this.sendSignalingMessage({
      type: 'offer',
      sessionId: this.sessionId,
      clientId: this.clientId,
      data: offer
    })

    return offer
  }

  private async createAndSendOffer(clientId: string): Promise<void> {
    if (!this.peerConnection) {
      console.error('Peer connection not initialized')
      return
    }

    try {
      console.log('Creating offer for client:', clientId)
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)

      this.sendSignalingMessage({
        type: 'offer',
        sessionId: this.sessionId,
        clientId: clientId,
        data: offer
      })

      console.log('Offer sent to client:', clientId)
    } catch (error) {
      console.error('Error creating offer:', error)
    }
  }

  public disconnect() {
    if (this.ws) {
      this.sendSignalingMessage({
        type: 'leave_session',
        sessionId: this.sessionId,
        clientId: this.clientId
      })
      this.ws.close()
      this.ws = null
    }

    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }
  }
} 