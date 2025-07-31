<p align="center"><img src="https://i.imgur.com/a9QWW0v.png"></p>

# DeskViewer - Remote Desktop Application

A remote desktop application built with Nextron (Next.js + Electron) that allows screen sharing between computers.

## Features

### Phase 1 (Current)
- **Host Mode**: Share your screen with others using a randomly generated session ID
- **Client Mode**: Connect to a host using their session ID to view their screen
- **Real-time Communication**: WebSocket signaling server for peer-to-peer connections
- **Screen Sharing**: WebRTC-based screen streaming with low latency
- **Modern UI**: Beautiful, responsive interface built with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js + React + TypeScript
- **Desktop**: Electron
- **Styling**: Tailwind CSS
- **Real-time Communication**: WebSocket + WebRTC
- **Screen Capture**: Electron's desktopCapturer API

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd deskviewer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Usage

### Host Mode (Screen Sharing)

1. Launch the application
2. Click "Host - Share Your Screen"
3. A random session ID will be generated (e.g., "ABC123")
4. Click "Start Sharing" to begin screen capture
5. Share the session ID with the person you want to connect with

### Client Mode (View Remote Screen)

1. Launch the application
2. Click "Client - View Remote Screen"
3. Enter the session ID provided by the host
4. Click "Connect" to join the session
5. The remote screen will appear in the video player

## Architecture

### Components

- **WebSocket Signaling Server**: Handles session management and WebRTC signaling
- **WebRTC Manager**: Manages peer-to-peer connections and media streaming
- **Host Page**: Screen sharing interface with session management
- **Client Page**: Remote screen viewing interface

### Communication Flow

1. **Session Creation**: Host creates a session with a unique ID
2. **Client Connection**: Client joins the session using the session ID
3. **WebRTC Signaling**: Offer/Answer exchange for peer connection setup
4. **Screen Streaming**: Host streams screen to client via WebRTC
5. **Real-time Viewing**: Client displays the remote screen

## Development

### Project Structure

```
deskviewer/
├── main/                 # Electron main process
│   ├── background.ts     # Main window and app lifecycle
│   ├── websocket-server.ts # WebSocket signaling server
│   └── helpers/          # Helper functions
├── renderer/             # Next.js frontend
│   ├── pages/           # React pages
│   │   ├── home.tsx     # Main landing page
│   │   ├── host.tsx     # Host mode interface
│   │   └── client.tsx   # Client mode interface
│   ├── utils/           # Utility functions
│   │   └── webrtc.ts    # WebRTC manager
│   └── styles/          # CSS styles
└── resources/           # App resources (icons, etc.)
```

### Key Files

- `main/websocket-server.ts`: WebSocket signaling server implementation
- `renderer/utils/webrtc.ts`: WebRTC peer connection management
- `renderer/pages/host.tsx`: Host mode UI and functionality
- `renderer/pages/client.tsx`: Client mode UI and functionality

## Future Phases

### Phase 2 (Planned)
- Authentication and access control
- File transfer capabilities
- Remote control (mouse/keyboard input)
- Multiple client support
- Session recording

### Phase 3 (Planned)
- TURN/STUN server setup for NAT traversal
- End-to-end encryption
- Cross-platform compatibility improvements
- Performance optimizations

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Ensure the application is running and the signaling server is started
   - Check firewall settings for port 8080

2. **Screen Sharing Not Working**
   - Grant screen sharing permissions when prompted
   - Ensure you're using a supported browser/Electron version

3. **Connection Issues**
   - Verify both host and client are on the same local network
   - Check that the session ID is entered correctly

## License

This project is licensed under the MIT License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues and questions, please open an issue on GitHub.
