export interface SignalingMessage {
  type: string
  sessionId?: string
  clientId?: string
  data?: any
}

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null
  private ws: WebSocket | null = null
  private sessionId: string = ''
  private clientId: string = ''
  private isHost: boolean = false
  private onStreamReceived?: (stream: MediaStream) => void
  private onConnectionStateChange?: (state: string) => void

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
        this.sendSignalingMessage({
          type: 'ice_candidate',
          sessionId: this.sessionId,
          clientId: this.clientId,
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
      console.log('Received remote stream')
      this.onStreamReceived?.(event.streams[0])
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
      console.log('Attempting to connect to WebSocket server...')
      this.ws = new WebSocket('ws://localhost:8080')

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
        break

      case 'client_left':
        console.log('Client left:', message.clientId)
        break

      case 'session_error':
        console.error('Session error:', message.data)
        throw new Error(message.data?.error || 'Session error occurred')
        break

      case 'offer':
        this.handleOffer(message.data)
        break

      case 'answer':
        this.handleAnswer(message.data)
        break

      case 'ice_candidate':
        this.handleIceCandidate(message.data)
        break

      case 'host_disconnected':
        console.log('Host disconnected')
        this.onConnectionStateChange?.('disconnected')
        break

      case 'client_disconnected':
        console.log('Client disconnected:', message.clientId)
        break

      default:
        console.warn('Unknown signaling message type:', message.type)
    }
  }

  private async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return

    try {
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
    if (!this.peerConnection) return

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    } catch (error) {
      console.error('Error handling answer:', error)
    }
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) return

    try {
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