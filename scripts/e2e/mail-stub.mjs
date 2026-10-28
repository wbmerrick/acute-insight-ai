import http from 'node:http';
const sent = [];
http.createServer((req, res) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
  if (req.url === '/emails') { sent.push(JSON.parse(b)); res.setHeader('content-type', 'application/json'); return res.end('{"id":"em_1"}'); }
  if (req.url === '/__sent') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify(sent)); }
  res.statusCode = 404; res.end();
}); }).listen(4243, '127.0.0.1', () => console.log('mail stub on 4243'));
