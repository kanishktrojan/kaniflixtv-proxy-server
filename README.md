# CORS Video Proxy Server

A production-ready Node.js proxy server that solves CORS issues when streaming M3U8 videos in web browsers. This server acts as a middleman between your website and third-party video streams, adding proper CORS headers and handling M3U8 playlist parsing.

## 🚀 Features

- **CORS Support**: Adds proper CORS headers to allow cross-origin video streaming
- **M3U8 Playlist Parsing**: Automatically parses and modifies M3U8 playlists to use proxy URLs
- **Segment Proxying**: Proxies individual video segments with proper headers
- **Range Request Support**: Supports HTTP range requests for better video seeking
- **Multi-bitrate Support**: Handles adaptive bitrate streaming (HLS)
- **Error Handling**: Comprehensive error handling and logging
- **Production Ready**: Optimized for deployment on Render.com

## 🚀 Deployment on Render

### Quick Deploy

1. **Connect your GitHub repository to Render**
2. **Create a new Web Service**
3. **Configure the service:**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: `Node`
   - **Plan**: Free (or paid for production)

### Environment Variables

Set these in your Render dashboard:

- `NODE_ENV`: `production`
- `CORS_ORIGIN`: `*` (or restrict to your domain)
- `PORT`: Will be automatically set by Render

## 🔧 Usage

### Basic Usage

Instead of using the original M3U8 URL directly in your video element:

```html
<!-- ❌ This will cause CORS errors -->
<video controls>
  <source src="https://example.com/playlist.m3u8" type="application/vnd.apple.mpegurl">
</video>
```

Use the proxy URL:

```html
<!-- ✅ This works with CORS -->
<video controls>
  <source src="https://your-render-app.onrender.com/proxy/m3u8?url=https://example.com/playlist.m3u8" type="application/vnd.apple.mpegurl">
</video>
```

### JavaScript Integration

```javascript
// Original M3U8 URL
const originalUrl = "https://example.com/playlist.m3u8";

// Create proxy URL (replace with your Render URL)
const proxyUrl = `https://your-render-app.onrender.com/proxy/m3u8?url=${encodeURIComponent(originalUrl)}`;

// Set as video source
const video = document.getElementById('videoPlayer');
video.src = proxyUrl;
```

### API Endpoints

#### 1. Proxy M3U8 Playlist
```
GET /proxy/m3u8?url=<M3U8_URL>
```
- **Description**: Proxies M3U8 playlist and modifies segment URLs to use the proxy
- **Parameters**: 
  - `url`: The original M3U8 URL (URL encoded)
- **Response**: Modified M3U8 playlist with proxy URLs

#### 2. Proxy Video Segments
```
GET /proxy/segment?url=<SEGMENT_URL>
```
- **Description**: Proxies individual video segments
- **Parameters**:
  - `url`: The segment URL (URL encoded)
- **Response**: Video segment with proper CORS headers

#### 3. Health Check
```
GET /health
```
- **Description**: Check if the server is running
- **Response**: `{"status": "OK", "timestamp": "..."}`

## 🔒 Security Notes

- **Production Ready**: Optimized for production deployment
- **CORS Configuration**: Set `CORS_ORIGIN` environment variable to restrict origins
- **Monitoring**: Check Render logs for any issues
- **Rate Limiting**: Consider adding rate limiting for production use

## 🛠️ Configuration

Configure the server using environment variables:

- `PORT`: Server port (automatically set by Render)
- `CORS_ORIGIN`: Allowed CORS origins (default: *)
- `NODE_ENV`: Environment (set to 'production' on Render)

## 📝 Troubleshooting

### Common Issues

1. **Video not loading**: Check browser console for errors and ensure the M3U8 URL is accessible
2. **CORS still showing**: Make sure you're using the proxy URL, not the original URL
3. **Render deployment fails**: Check build logs and ensure all dependencies are in package.json

### Debug Mode

Check Render logs in your dashboard for detailed error information.

## 📄 License

MIT License - feel free to use this in your projects.
