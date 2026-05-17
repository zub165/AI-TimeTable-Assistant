# Voice Time Manager

A voice-controlled time tracking application that helps you manage your daily activities through speech recognition and visual planning tools.

## Features

- 🎤 **Voice-Controlled Time Tracking**: Start/stop activities using voice commands
- 📊 **Visual Time Planning**: Plan your ideal daily schedule with interactive charts
- 💾 **Data Persistence**: Activities are saved locally and persist between sessions
- 📱 **Progressive Web App**: Installable on mobile and desktop devices
- 🖥️ **Desktop App**: Native desktop application for Windows, Mac, and Linux
- 📺 **Smart TV Support**: Compatible with Samsung Smart TVs (Tizen)
- ♿ **Accessibility**: Full keyboard navigation and screen reader support

## Quick Start

### Full stack (API + React + Flutter)

```bash
./scripts/start-dev.sh          # API :8100, React :5180
cd mobile && flutter run        # iOS / Android
```

See `context.md` for ports, VPS deployment, and API docs.

### Web Application (PWA)
1. Open `index.html` in a modern web browser
2. Click the microphone button to start voice tracking
3. Say "Start [activity]" to begin tracking
4. Say "Stop [activity]" to end tracking

### Voice Commands
- `"Start coding"` - Begin tracking coding time
- `"Stop eating"` - End tracking eating time
- `"How am I doing?"` - Get time management advice
- `"Clear activities"` - Reset all tracked activities

## Multi-Platform Setup

### 1. Progressive Web App (PWA)

The application is already configured as a PWA. To install:

1. Open the web app in Chrome/Edge
2. Click the install button in the address bar
3. Or use the browser menu: More Tools > Create Shortcut

**Features:**
- Offline functionality
- App-like experience
- Push notifications
- Background sync

### 2. Desktop Application (Electron)

#### Prerequisites
- Node.js 16+ and npm

#### Setup
```bash
cd electron
npm install
npm start
```

#### Build for Distribution
```bash
# Build for all platforms
npm run build

# Build for specific platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

### 3. Tizen Smart TV App

#### Prerequisites
- Tizen Studio
- Tizen CLI tools

#### Setup
```bash
# Install Tizen CLI
npm install -g tizen-cli

# Package the app
tizen package -t wgt -s [certificate-profile] -- .

# Install on TV
tizen install -n voice-time-manager.wgt -t [device-id]
```

## Project Structure

```
voice-time-manager/
├── index.html              # Main application file
├── manifest.json           # PWA manifest
├── sw.js                  # Service worker
├── context.md             # Project documentation
├── README.md              # This file
├── assets/                # App assets
│   ├── icons/            # App icons (various sizes)
│   ├── screenshots/      # App screenshots
│   └── sounds/           # Audio files
├── electron/             # Desktop app
│   ├── main.js          # Electron main process
│   └── package.json     # Electron dependencies
└── tizen/               # Smart TV app
    ├── config.xml       # Tizen configuration
    └── icon.png         # TV app icon
```

## Development

### Local Development
1. Clone the repository
2. Open `index.html` in a browser
3. Use browser dev tools for debugging

### Adding New Features
1. Modify `index.html` for UI changes
2. Update `manifest.json` for PWA changes
3. Modify `sw.js` for service worker changes
4. Update Electron files in `electron/` directory

### Testing
- **Cross-browser**: Chrome, Firefox, Safari, Edge
- **Mobile**: iOS Safari, Android Chrome
- **Desktop**: Windows, macOS, Linux
- **TV**: Samsung Smart TV (Tizen)

## Deployment

### Web Hosting
Deploy to any static hosting service:
- Netlify (recommended)
- Vercel
- GitHub Pages
- Firebase Hosting

### Desktop Distribution
- **Windows**: NSIS installer, portable exe
- **macOS**: DMG, zip archive
- **Linux**: AppImage, deb, rpm packages

### App Stores
- **Microsoft Store**: Windows apps
- **Mac App Store**: macOS apps
- **Tizen Store**: Samsung Smart TV apps

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Speech Recognition | ✅ | ✅ | ❌ | ✅ |
| PWA | ✅ | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: ARIA labels and semantic HTML
- **High Contrast**: CSS variables for theming
- **Focus Indicators**: Visible focus states

## Performance

- **Lazy Loading**: Components load on demand
- **Caching**: Service worker caches resources
- **Optimization**: Minified CSS and JavaScript
- **Responsive**: Mobile-first design

## Security

- **Local Storage**: No server communication
- **HTTPS Only**: Secure connections required
- **Permission Handling**: Graceful microphone access
- **Data Privacy**: No personal data collection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test across platforms
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- **Issues**: GitHub Issues
- **Documentation**: `context.md`
- **Email**: support@voicetimemanager.com

## Roadmap

### Phase 1 (Current)
- ✅ PWA functionality
- ✅ Desktop app (Electron)
- ✅ Smart TV support (Tizen)
- ✅ Voice recognition
- ✅ Data persistence

### Phase 2 (Planned)
- 🔄 Mobile app (React Native)
- 🔄 Cloud sync
- 🔄 Team collaboration
- 🔄 Advanced analytics

### Phase 3 (Future)
- 📋 AI-powered insights
- 📋 Integration APIs
- 📋 Wearable support
- 📋 Smart home integration

---

**Built with ❤️ using modern web technologies**
