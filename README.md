# YouTube Brainrot Split Screen Extension

<div align="center">
  <img src="https://img.shields.io/badge/Chrome-Extension-blue?style=for-the-badge&logo=google-chrome" alt="Chrome Extension">
  <img src="https://img.shields.io/badge/Version-1.0-green?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License">
</div>

## 🎯 Overview

YouTube Brainrot Split Screen is a Chrome extension that automatically creates a split-screen layout when watching YouTube videos. The extension displays the main YouTube video on the left (taking up 2/3 of the screen) and plays brainrot content on the right (taking up 1/3 of the screen) to maximize your entertainment experience.

## ✨ Features

- **🎬 Automatic Split Screen**: Activates when YouTube enters theater mode or when videos play on supported sites
- **⚡ Manual Control**: Toggle split mode on/off with a dedicated button in YouTube's player controls
- **🖱️ Interactive Controls**: Custom hover controls for seamless video management
- **🎮 Multiple Triggers**: Works with YouTube theater mode, fullscreen, and Fullstack.edu.vn video playback
- **📱 Responsive Design**: Optimized layout that adapts to different screen sizes
- **🔧 Smart Cleanup**: Intelligent overlay management to prevent visual conflicts

## 🌐 Supported Websites

- **YouTube.com** - Primary target with full feature support
- **Fullstack.edu.vn** - Automatic activation when videos or YouTube iframes are detected

## 🚀 How It Works

### YouTube Integration
1. **Theater Mode Detection**: Monitors YouTube's theater mode changes and DOM mutations
2. **Manual Activation**: Custom split mode button integrated into YouTube's control bar
3. **Video Management**: Moves the native video element to the left panel while maintaining all functionality
4. **Smart Controls**: Context-aware controls that appear on hover with progressive enhancement

### Split Screen Layout
- **Left Panel (66.67%)**: YouTube video with full interactive controls
- **Right Panel (33.33%)**: Brainrot content (local video file) with autoplay and loop
- **Custom Controls**: Play/pause, volume, progress bar, and fullscreen toggle

## 🛠️ Installation

### From Source
1. Clone this repository:
   ```bash
   git clone https://github.com/zaikaman/Youtube-Brainrot-Extension.git
   ```

2. **Important**: Add your own brainrot video file:
   - Place a video file named `brainrot-video.mp4` in the root directory of the project
   - This file is required for the extension to work properly
   - The video should be in MP4 format for optimal compatibility

3. Open Chrome and navigate to `chrome://extensions/`

4. Enable "Developer mode" in the top right corner

5. Click "Load unpacked" and select the extension directory

6. The extension will appear in your Chrome toolbar

### File Structure
```
├── manifest.json           # Extension configuration
├── background.js           # Service worker for tab management
├── content.js              # Main functionality and UI logic
├── styles.css              # Split screen styling and responsive design
├── brainrot-video.mp4      # Local brainrot content (USER MUST PROVIDE)
└── brainrot-videos.json    # Fallback video URLs
```

**Note**: The `brainrot-video.mp4` file is not included in the repository. You must provide your own video file with this exact name in the root directory.

## 📋 Usage

### YouTube
1. **Automatic**: Enter theater mode on YouTube - split screen activates automatically
2. **Manual**: Click the split screen button (⚏) in the YouTube player controls
3. **Exit**: Click the "✕ Exit Split" button

### Fullstack.edu.vn
1. **Automatic**: Play any video or click on YouTube iframes
2. **Exit**: Click the "✕ Exit Split" button

## ⚙️ Technical Details

### Core Technologies
- **Manifest V3**: Modern Chrome extension architecture
- **Vanilla JavaScript**: No external dependencies for optimal performance
- **CSS Grid/Flexbox**: Responsive layout system
- **MutationObserver**: DOM change detection for dynamic content
- **MediaStream API**: Video element management and synchronization

### Key Features Implementation

#### Smart Video Management
```javascript
// Moves native video element while preserving functionality
this.movedVideoOriginalParent = nativeVideo.parentElement;
this.youtubeMovedContainer.appendChild(nativeVideo);
```

#### Progressive Control Enhancement
```javascript
// From 3rd activation onwards, always show controls
if (this.activationCount >= 3) {
    this.forceShowControlsAlways();
}
```

#### Overlay Conflict Resolution
```javascript
// Intelligent cleanup of YouTube overlays
this.startOverlayMonitoring();
this.cleanupStuckOverlays();
```

### Performance Optimizations
- **Lazy Loading**: Controls and containers created only when needed
- **Event Delegation**: Efficient event handling for dynamic content
- **Memory Management**: Proper cleanup on deactivation
- **Debounced Operations**: Throttled DOM mutations to prevent performance issues

## 🎛️ Configuration

### Video Sources
The extension requires a local video file (`brainrot-video.mp4`) that you must provide. To set up your brainrot content:

1. **Required**: Place a video file named `brainrot-video.mp4` in the root directory of the extension
2. **Format**: MP4 format is recommended for best compatibility
3. **Optional**: Modify `brainrot-videos.json` for fallback URLs
4. **Advanced**: Update the `brainrotUrls` array in `content.js` for additional sources

**Important**: The extension will not work without the `brainrot-video.mp4` file. Make sure to add your own video content before loading the extension.

### Customization Options
- **Layout Ratios**: Modify CSS variables in `styles.css`
- **Activation Triggers**: Adjust detection logic in `content.js`
- **Control Behavior**: Customize hover states and progressive enhancement

## 🐛 Troubleshooting

### Common Issues

**Split mode doesn't activate**
- Ensure you're on a supported website (YouTube.com or fullstack.edu.vn)
- **Check if `brainrot-video.mp4` file exists** in the root directory
- Try manual activation using the split screen button
- Check if theater mode is available on the current video

**Extension fails to load**
- Verify that `brainrot-video.mp4` file is present in the root directory
- Ensure the video file is in MP4 format
- Check Chrome's extension error messages in `chrome://extensions/`

**Controls not responding**
- Hover over the left video panel to reveal controls
- Refresh the page if issues persist

**Video quality issues**
- YouTube's quality settings are preserved in split mode
- Right-click on the video for additional options
- Use YouTube's native controls for quality adjustments

### Debug Mode
Enable console logging by setting debug flags in `content.js`:
```javascript
console.log('🔄 Split mode activation #' + this.activationCount);
```

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Setup
```bash
# Clone the repository
git clone https://github.com/zaikaman/Youtube-Brainrot-Extension.git

# Navigate to the project
cd Youtube-Brainrot-Extension

# IMPORTANT: Add your brainrot video file
# Place a video file named 'brainrot-video.mp4' in the root directory

# Load the extension in Chrome for testing
# (Follow installation instructions above)
```

**Required for Development**: You must provide a `brainrot-video.mp4` file in the project root directory before the extension will function properly.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **YouTube**: For providing the robust player API that makes this extension possible
- **Chrome Extensions Team**: For the comprehensive extension framework
- **Open Source Community**: For inspiration and best practices

## 📊 Browser Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome | ✅ Fully Supported | Primary target browser |
| Edge | ✅ Compatible | Chromium-based, works with minor adaptations |
| Firefox | ❌ Not Supported | Requires Manifest V2 adaptation |
| Safari | ❌ Not Supported | Different extension architecture |

## 🔮 Roadmap

- [ ] **Multi-browser Support**: Firefox and Edge compatibility
- [ ] **Custom Layouts**: User-configurable split ratios
- [ ] **Content Library**: Multiple brainrot video options
- [ ] **Sync Support**: Cross-device settings synchronization
- [ ] **Performance Analytics**: Usage statistics and optimization insights

---

<div align="center">
  <p>Made with ❤️ for the YouTube community</p>
  <p>
    <a href="https://github.com/zaikaman/Youtube-Brainrot-Extension/issues">Report Bug</a> •
    <a href="https://github.com/zaikaman/Youtube-Brainrot-Extension/issues">Request Feature</a> •
    <a href="https://github.com/zaikaman">@zaikaman</a>
  </p>
</div>
