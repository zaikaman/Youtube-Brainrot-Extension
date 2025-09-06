# Video Setup Instructions

## How to add your brainrot video:

1. **Download the video** you want to use (e.g., from YouTube using youtube-dl or online converter)
   
2. **Convert to MP4** if needed (recommended format: MP4 H.264)

3. **Rename the file** to `brainrot-video.mp4`

4. **Place the file** in the extension folder: `c:\Users\ADMIN\Desktop\brainrot_youtube\brainrot-video.mp4`

5. **Reload the extension** in Chrome

## Recommended video specs:
- **Format**: MP4 (H.264 codec)
- **Resolution**: 1080p or 720p
- **Duration**: Any length (will loop automatically)
- **File size**: Keep under 50MB for best performance

## Alternative: Use a URL to online MP4
If you don't want to store locally, you can modify `content.js` line 10 to use a direct MP4 URL:

```javascript
this.brainrotUrls = [
  'https://example.com/your-video.mp4'
];
```

## Converting YouTube to MP4:
1. Use youtube-dl: `youtube-dl -f mp4 "https://www.youtube.com/watch?v=85z7jqGAGcc"`
2. Or use online converters like y2mate.com, savefrom.net
3. Rename the downloaded file to `brainrot-video.mp4`
