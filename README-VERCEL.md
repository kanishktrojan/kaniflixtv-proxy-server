# CORS Video Proxy Server - Vercel Deployment

A Vercel-optimized version of the CORS proxy server for streaming M3U8 videos. This version uses Vercel's serverless functions for better performance and global distribution.

## 🚀 Vercel Deployment

### Quick Deploy

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel
   ```

3. **Follow the prompts**:
   - Link to existing project or create new
   - Choose your team/account
   - Deploy

### Alternative: GitHub Integration

1. **Push your code to GitHub**
2. **Connect your GitHub repo to Vercel**
3. **Vercel will auto-deploy** on every push

## 🔧 Usage

### API Endpoints

Once deployed, your endpoints will be:
- `https://your-app.vercel.app/api/proxy/m3u8?url=<M3U8_URL>`
- `https://your-app.vercel.app/api/proxy/segment?url=<SEGMENT_URL>`
- `https://your-app.vercel.app/api/health`

### JavaScript Integration

```javascript
// Original M3U8 URL
const originalUrl = "https://example.com/playlist.m3u8";

// Create proxy URL (replace with your Vercel URL)
const proxyUrl = `https://your-app.vercel.app/api/proxy/m3u8?url=${encodeURIComponent(originalUrl)}`;

// Set as video source
const video = document.getElementById('videoPlayer');
video.src = proxyUrl;
```

### HTML Example

```html
<video controls>
  <source src="https://your-app.vercel.app/api/proxy/m3u8?url=https://example.com/playlist.m3u8" type="application/vnd.apple.mpegurl">
</video>
```

## ⚡ Vercel Advantages

- **Global CDN**: Faster loading worldwide
- **Serverless**: Auto-scaling based on demand
- **Better IP reputation**: Less likely to be blocked
- **Edge functions**: Reduced latency
- **Free tier**: Generous free usage limits

## ⚠️ Vercel Limitations

- **Function timeout**: 30 seconds max (configurable)
- **Memory limit**: 1GB per function
- **Cold starts**: First request might be slower
- **Request size**: 4.5MB max for request body

## 🔧 Configuration

The `vercel.json` file configures:
- **Function timeouts**: 30 seconds for video operations
- **CORS headers**: Automatic CORS setup
- **Global headers**: Applied to all API routes

## 📁 File Structure

```
cors/
├── api/
│   ├── proxy/
│   │   ├── m3u8.js      # M3U8 playlist proxy
│   │   └── segment.js    # Video segment proxy
│   └── health.js         # Health check
├── package.json          # Dependencies
├── vercel.json          # Vercel configuration
└── server.js            # Original server (for local dev)
```

## 🚀 Deployment Steps

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Test locally** (optional):
   ```bash
   vercel dev
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

## 🔍 Troubleshooting

### Common Issues

1. **Function timeout**: Increase timeout in `vercel.json`
2. **Memory issues**: Optimize code or upgrade plan
3. **CORS errors**: Check `vercel.json` headers configuration
4. **403 errors**: The retry mechanism should handle this

### Debug Mode

Check Vercel function logs in your dashboard for detailed error information.

## 💡 Tips for Better Performance

1. **Use edge functions** for better global performance
2. **Implement caching** for frequently accessed content
3. **Monitor function usage** in Vercel dashboard
4. **Consider upgrading** if you hit free tier limits

## 📄 License

MIT License - feel free to use this in your projects.
