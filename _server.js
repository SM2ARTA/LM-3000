const http = require('http');
const fs = require('fs');
const path = require('path');
http.createServer((req, res) => {
  let f = '.' + (req.url === '/' ? '/index.html' : req.url);
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ct = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf','.docx':'application/octet-stream'}[path.extname(f)] || 'application/octet-stream';
    res.writeHead(200, {'Content-Type': ct, 'Cache-Control': 'no-store'});
    res.end(data);
  });
}).listen(8888, () => console.log('Server at http://localhost:8888'));
