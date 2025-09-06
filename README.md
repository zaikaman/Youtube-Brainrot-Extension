# YouTube Brainrot Split Screen Extension

A Chrome extension that automatically splits the screen when YouTube enters fullscreen mode - displaying the YouTube video on the left half and "brainrot" content on the right half.

## Features

- 🎥 Automatically detects YouTube fullscreen mode
- 📱 Splits screen into two equal halves (50/50)
- 🔄 Rotates through different brainrot videos every 30 seconds
- 🔇 Brainrot videos are muted and looped
- ⚡ Works seamlessly without user interaction
- 🎮 No browser action button required

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. Navigate to YouTube and watch any video in fullscreen!

## How it Works

- **Background Script**: Monitors tab changes and communicates with content scripts
- **Content Script**: Detects fullscreen events and manipulates the DOM
- **Split Screen Layout**: CSS handles the 50/50 screen division
- **Auto-rotation**: Brainrot videos change every 30 seconds for variety

## Files Structure

```
├── manifest.json          # Extension configuration (v3)
├── background.js          # Service worker for background tasks
├── content.js            # Main logic for split screen functionality
├── styles.css            # CSS for split screen layout
├── brainrot-videos.json  # List of brainrot video URLs
└── README.md            # This file
```

## Customization

### Adding More Brainrot Videos

Edit `brainrot-videos.json` to add more video URLs:

```json
[
  "https://www.youtube.com/embed/VIDEO_ID?autoplay=1&mute=1&loop=1&playlist=VIDEO_ID"
]
```

### Changing Rotation Interval

In `content.js`, modify the interval (currently 30 seconds):

```javascript
}, 30000); // Change this value (milliseconds)
```

### Adjusting Split Ratio

In `styles.css`, modify the width percentages:

```css
.brainrot-youtube-half {
  width: 60vw !important; /* YouTube side */
}

.brainrot-container {
  width: 40vw !important; /* Brainrot side */
}
```

## Browser Support

- Chrome (Manifest V3)
- Edge (Chromium-based)
- Other Chromium-based browsers

## Permissions

- `activeTab`: To interact with YouTube tabs
- `tabs`: To monitor tab changes
- Host permissions for YouTube domains

## Notes

- The extension only activates on YouTube pages
- Brainrot videos are embedded YouTube videos with autoplay, mute, and loop parameters
- The split screen automatically deactivates when exiting fullscreen
- All videos continue playing normally during the split

## Troubleshooting

If the extension doesn't work:

1. Check if it's enabled in `chrome://extensions/`
2. Refresh the YouTube page
3. Ensure you're in fullscreen mode (F11 or fullscreen button)
4. Check browser console for any errors

## License

This project is open source and available under the MIT License.
