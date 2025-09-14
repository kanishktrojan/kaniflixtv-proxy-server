const axios = require('axios');
const { Parser } = require('m3u8-parser');

// Helper function to get base URL from m3u8 URL
function getBaseUrl(url) {
  const urlObj = new URL(url);
  return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname.split('/').slice(0, -1).join('/')}/`;
}

// Helper function to resolve relative URLs
function resolveUrl(baseUrl, relativeUrl) {
  if (relativeUrl.startsWith('http')) {
    return relativeUrl;
  }
  return new URL(relativeUrl, baseUrl).href;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log(`Proxying m3u8 playlist: ${url}`);

    // Fetch the m3u8 playlist with enhanced headers
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, application/octet-stream, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'Referer': url.split('/').slice(0, 3).join('/') + '/',
        'Origin': url.split('/').slice(0, 3).join('/')
      },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 400;
      }
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
          segment.uri = `/api/proxy/segment?url=${encodeURIComponent(absoluteUrl)}`;
        }
      });
    }
    
    // Process playlists (for multi-bitrate streams)
    if (parsedManifest.playlists) {
      parsedManifest.playlists.forEach(playlist => {
        if (playlist.uri) {
          const absoluteUrl = resolveUrl(baseUrl, playlist.uri);
          playlist.uri = `/api/proxy/m3u8?url=${encodeURIComponent(absoluteUrl)}`;
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
          modifiedPlaylist = modifiedPlaylist.slice(0, -1);
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
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    res.status(200).send(modifiedPlaylist);
    
  } catch (error) {
    console.error('Error proxying m3u8 playlist:', error.message);
    
    // If it's a 403 error, try with different headers
    if (error.response && error.response.status === 403) {
      try {
        console.log('Retrying with different headers...');
        const retryResponse = await axios.get(url, {
          headers: {
            'User-Agent': 'VLC/3.0.16 LibVLC/3.0.16',
            'Accept': 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'identity',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          },
          timeout: 15000,
          maxRedirects: 5,
          validateStatus: function (status) {
            return status >= 200 && status < 400;
          }
        });
        
        // Process the retry response (same logic as above)
        const playlistContent = retryResponse.data;
        const baseUrl = getBaseUrl(url);
        
        const parser = new Parser();
        parser.push(playlistContent);
        parser.end();
        
        const parsedManifest = parser.manifest;
        
        if (parsedManifest.segments) {
          parsedManifest.segments.forEach(segment => {
            if (segment.uri) {
              const absoluteUrl = resolveUrl(baseUrl, segment.uri);
              segment.uri = `/api/proxy/segment?url=${encodeURIComponent(absoluteUrl)}`;
            }
          });
        }
        
        if (parsedManifest.playlists) {
          parsedManifest.playlists.forEach(playlist => {
            if (playlist.uri) {
              const absoluteUrl = resolveUrl(baseUrl, playlist.uri);
              playlist.uri = `/api/proxy/m3u8?url=${encodeURIComponent(absoluteUrl)}`;
            }
          });
        }
        
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
        
        if (parsedManifest.playlists) {
          parsedManifest.playlists.forEach(playlist => {
            modifiedPlaylist += `#EXT-X-STREAM-INF:`;
            if (playlist.attributes) {
              Object.entries(playlist.attributes).forEach(([key, value]) => {
                modifiedPlaylist += `${key}=${value},`;
              });
              modifiedPlaylist = modifiedPlaylist.slice(0, -1);
            }
            modifiedPlaylist += `\n${playlist.uri}\n`;
          });
        }
        
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
        
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        
        res.status(200).send(modifiedPlaylist);
        return;
        
      } catch (retryError) {
        console.error('Retry also failed:', retryError.message);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to proxy m3u8 playlist',
      details: error.message,
      status: error.response ? error.response.status : 'unknown'
    });
  }
}
