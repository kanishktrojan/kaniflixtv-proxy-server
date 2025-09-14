const axios = require('axios');

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

    console.log(`Proxying segment: ${url}`);

    // Fetch the segment with range support and enhanced headers
    const range = req.headers.range;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
      'Referer': url.split('/').slice(0, 3).join('/') + '/',
      'Origin': url.split('/').slice(0, 3).join('/')
    };
    
    if (range) {
      headers.Range = range;
    }

    const response = await axios.get(url, {
      headers,
      responseType: 'stream',
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 400;
      }
    });

    // Set appropriate headers
    res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp2t');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Forward content length and range headers
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    
    if (response.headers['content-range']) {
      res.setHeader('Content-Range', response.headers['content-range']);
    }
    
    if (response.status === 206) {
      res.status(206);
    }

    // Pipe the response
    response.data.pipe(res);
    
  } catch (error) {
    console.error('Error proxying segment:', error.message);
    
    // If it's a 403 error, try with different headers
    if (error.response && error.response.status === 403) {
      try {
        console.log('Retrying segment with different headers...');
        const retryResponse = await axios.get(url, {
          headers: {
            'User-Agent': 'VLC/3.0.16 LibVLC/3.0.16',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'identity',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          },
          responseType: 'stream',
          timeout: 30000,
          maxRedirects: 5,
          validateStatus: function (status) {
            return status >= 200 && status < 400;
          }
        });
        
        // Set appropriate headers
        res.setHeader('Content-Type', retryResponse.headers['content-type'] || 'video/mp2t');
        res.setHeader('Cache-Control', 'public, max-age=3600');

        // Forward content length and range headers
        if (retryResponse.headers['content-length']) {
          res.setHeader('Content-Length', retryResponse.headers['content-length']);
        }
        
        if (retryResponse.headers['content-range']) {
          res.setHeader('Content-Range', retryResponse.headers['content-range']);
        }
        
        if (retryResponse.status === 206) {
          res.status(206);
        }

        // Pipe the response
        retryResponse.data.pipe(res);
        return;
        
      } catch (retryError) {
        console.error('Segment retry also failed:', retryError.message);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to proxy segment',
      details: error.message,
      status: error.response ? error.response.status : 'unknown'
    });
  }
}
