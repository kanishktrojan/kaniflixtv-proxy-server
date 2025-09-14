const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Parser } = require('m3u8-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
  credentials: true
}));

// Middleware to parse JSON
app.use(express.json());

// Production server - no static files needed

// Helper function to get base URL from m3u8 URL
function getBaseUrl(url) {
  const urlObj = new URL(url);
  return `${urlObj.protocol}//${urlObj.host}${path.dirname(urlObj.pathname)}/`;
}

// Helper function to resolve relative URLs
function resolveUrl(baseUrl, relativeUrl) {
  if (relativeUrl.startsWith('http')) {
    return relativeUrl;
  }
  return new URL(relativeUrl, baseUrl).href;
}

// Proxy endpoint for m3u8 playlists
app.get('/proxy/m3u8', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log(`Proxying m3u8 playlist: ${url}`);

    // Fetch the m3u8 playlist
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const playlistContent = response.data;
    const baseUrl = getBaseUrl(url);
    
    // Parse the m3u8 playlist
    const parser = new Parser();
    parser.push(playlistContent);
    parser.end();
    
    const parsedManifest = parser.manifest;
    
    // Process segments and update URLs to use our proxy
    if (parsedManifest.segments) {
      parsedManifest.segments.forEach(segment => {
        if (segment.uri) {
          const absoluteUrl = resolveUrl(baseUrl, segment.uri);
          segment.uri = `/proxy/segment?url=${encodeURIComponent(absoluteUrl)}`;
        }
      });
    }
    
    // Process playlists (for multi-bitrate streams)
    if (parsedManifest.playlists) {
      parsedManifest.playlists.forEach(playlist => {
        if (playlist.uri) {
          const absoluteUrl = resolveUrl(baseUrl, playlist.uri);
          playlist.uri = `/proxy/m3u8?url=${encodeURIComponent(absoluteUrl)}`;
        }
      });
    }
    
    // Convert back to m3u8 format
    let modifiedPlaylist = '#EXTM3U\n';
    
    if (parsedManifest.mediaSequence !== undefined) {
      modifiedPlaylist += `#EXT-X-MEDIA-SEQUENCE:${parsedManifest.mediaSequence}\n`;
    }
    
    if (parsedManifest.targetDuration !== undefined) {
      modifiedPlaylist += `#EXT-X-TARGETDURATION:${parsedManifest.targetDuration}\n`;
    }
    
    if (parsedManifest.playlistType) {
      modifiedPlaylist += `#EXT-X-PLAYLIST-TYPE:${parsedManifest.playlistType}\n`;
    }
    
    if (parsedManifest.endList) {
      modifiedPlaylist += '#EXT-X-ENDLIST\n';
    }
    
    // Add playlists (variants)
    if (parsedManifest.playlists) {
      parsedManifest.playlists.forEach(playlist => {
        modifiedPlaylist += `#EXT-X-STREAM-INF:`;
        if (playlist.attributes) {
          Object.entries(playlist.attributes).forEach(([key, value]) => {
            modifiedPlaylist += `${key}=${value},`;
          });
          modifiedPlaylist = modifiedPlaylist.slice(0, -1); // Remove trailing comma
        }
        modifiedPlaylist += `\n${playlist.uri}\n`;
      });
    }
    
    // Add segments
    if (parsedManifest.segments) {
      parsedManifest.segments.forEach(segment => {
        if (segment.duration !== undefined) {
          modifiedPlaylist += `#EXTINF:${segment.duration},\n`;
        }
        if (segment.uri) {
          modifiedPlaylist += `${segment.uri}\n`;
        }
      });
    }
    
    // Set appropriate headers
    res.set({
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    
    res.send(modifiedPlaylist);
    
  } catch (error) {
    console.error('Error proxying m3u8 playlist:', error.message);
    res.status(500).json({ 
      error: 'Failed to proxy m3u8 playlist',
      details: error.message 
    });
  }
});

// Proxy endpoint for video segments
app.get('/proxy/segment', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log(`Proxying segment: ${url}`);

    // Fetch the segment with range support
    const range = req.headers.range;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };
    
    if (range) {
      headers.Range = range;
    }

    const response = await axios.get(url, {
      headers,
      responseType: 'stream',
      timeout: 30000
    });

    // Set appropriate headers
    res.set({
      'Content-Type': response.headers['content-type'] || 'video/mp2t',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
      'Cache-Control': 'public, max-age=3600'
    });

    // Forward content length and range headers
    if (response.headers['content-length']) {
      res.set('Content-Length', response.headers['content-length']);
    }
    
    if (response.headers['content-range']) {
      res.set('Content-Range', response.headers['content-range']);
    }
    
    if (response.status === 206) {
      res.status(206);
    }

    // Pipe the response
    response.data.pipe(res);
    
  } catch (error) {
    console.error('Error proxying segment:', error.message);
    res.status(500).json({ 
      error: 'Failed to proxy segment',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: error.message 
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`CORS Video Proxy Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Production ready - CORS proxy for M3U8 video streaming`);
});

module.exports = app;
