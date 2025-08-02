export interface SignalingMessage {
  type: string
  sessionId?: string
  clientId?: string
  data?: any
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  mouseData?: {
    x: number
    y: number
    button?: 'left' | 'right' | 'middle'
  }
  keyboardData?: {
    key: string
    code: string
    ctrlKey: boolean
    shiftKey: boolean
    altKey: boolean
    metaKey: boolean
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
  private onKeyboardEvent?: (keyboardData: { key: string, code: string, ctrlKey: boolean, shiftKey: boolean, altKey: boolean, metaKey: boolean }) => void
  private onScreenResolution?: (resolution: { width: number, height: number }) => void
  private onRoleDetected?: (role: 'host' | 'client') => void

  constructor() {
    this.setupPeerConnection()
  }

  private setupPeerConnection() {
    // Desktop-optimized configuration
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
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

  // New unified connection method
  public async connectToSession(sessionId: string, stream?: MediaStream): Promise<void> {
    this.sessionId = sessionId
    this.clientId = `client_${Math.random().toString(36).substr(2, 9)}`

    await this.connectWebSocket()
    await this.connectToSessionInternal()
    
    // If stream is provided, we're likely the host
    if (stream) {
      await this.addStreamToPeerConnection(stream)
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use cloud WebSocket server for both dev and production
      // This ensures consistent testing and cross-network functionality
      const wsUrl = 'wss://deskviewer-cloud-server-production.up.railway.app'
      
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('WebSocket connected successfully')
        resolve()
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket connection error:', error)
        reject(new Error('Failed to connect to WebSocket server. Make sure you have internet connection.'))
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

  private async connectToSessionInternal(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not connected'))
        return
      }

      console.log('Connecting to session with ID:', this.sessionId)
      this.sendSignalingMessage({
        type: 'connect_to_session',
        sessionId: this.sessionId,
        clientId: this.clientId
      })

      const handleMessage = (event: MessageEvent) => {
        const message = JSON.parse(event.data)
        console.log('Session connection response:', message)
        
        if (message.type === 'session_connected' && message.sessionId === this.sessionId) {
          console.log('Successfully connected to session')
          this.isHost = message.role === 'host'
          this.onRoleDetected?.(message.role)
          this.ws?.removeEventListener('message', handleMessage)
          resolve()
        } else if (message.type === 'session_error') {
          console.error('Session connection failed:', message.error)
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

      case 'session_connected':
        console.log('Session connected successfully')
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
        // Optimized: Only log non-move events to reduce console spam
        if (message.type !== 'mouse_move') {
          console.log(`🖱️ WebRTC: Received ${message.type} message`)
        }
        
        if (this.isHost && message.mouseData) {
          this.onMouseEvent?.(message.mouseData)
        }
        break
      
      case 'screen_resolution':
        if (!this.isHost && message.resolution) {
          this.onScreenResolution?.(message.resolution)
        }
        break

      case 'key_down':
      case 'key_up':
        if (message.type !== 'key_down' && message.type !== 'key_up') {
          console.log(`⌨️ WebRTC: Received ${message.type} message`)
        }
        
        if (this.isHost && message.keyboardData) {
          this.onKeyboardEvent?.(message.keyboardData)
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

  public setOnKeyboardEvent(callback: (keyboardData: { key: string, code: string, ctrlKey: boolean, shiftKey: boolean, altKey: boolean, metaKey: boolean }) => void) {
    this.onKeyboardEvent = callback
  }

  public setOnRoleDetected(callback: (role: 'host' | 'client') => void) {
    this.onRoleDetected = callback
  }

  public sendKeyboardEvent(type: 'key_down' | 'key_up', key: string, code: string, ctrlKey: boolean, shiftKey: boolean, altKey: boolean, metaKey: boolean) {
    if (!this.isHost) {
      // Only log special keys to avoid spam
      if (key.length > 1 || ctrlKey || shiftKey || altKey || metaKey) {
        console.log(`⌨️ CLIENT: Sending ${type} event: ${key}${ctrlKey ? ' +Ctrl' : ''}${shiftKey ? ' +Shift' : ''}${altKey ? ' +Alt' : ''}${metaKey ? ' +Meta' : ''}`)
      }
      
      this.sendSignalingMessage({
        type,
        sessionId: this.sessionId,
        clientId: this.clientId,
        keyboardData: { key, code, ctrlKey, shiftKey, altKey, metaKey }
      })
    }
  }

  public sendMouseEvent(type: 'mouse_move' | 'mouse_click' | 'mouse_down' | 'mouse_up', x: number, y: number, button?: 'left' | 'right' | 'middle') {
    if (!this.isHost) {
      // Only log non-move events for better performance
      if (type !== 'mouse_move') {
        console.log(`🖱️ CLIENT: Sending ${type} event: (${x.toFixed(3)}, ${y.toFixed(3)})${button ? ` button: ${button}` : ''}`)
      }
      
      this.sendSignalingMessage({
        type,
        sessionId: this.sessionId,
        clientId: this.clientId,
        mouseData: { x, y, button }
      })
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