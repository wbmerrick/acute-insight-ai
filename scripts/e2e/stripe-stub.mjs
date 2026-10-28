// Minimal Stripe API stand-in for local E2E: records calls, returns plausible objects.
import http from 'node:http';
const calls = [];
http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => (body += c)); req.on('end', () => {
    calls.push({ method: req.method, url: req.url, body });
    res.setHeader('content-type', 'application/json');
    if (req.url === '/v1/checkout/sessions') {
      const p = new URLSearchParams(body); const vid = p.get('client_reference_id');
      return res.end(JSON.stringify({ id: `cs_test_${vid}`, url: `http://127.0.0.1:4242/checkout/cs_test_${vid}`, payment_intent: `pi_test_${vid}` }));
    }
    if (/\/v1\/payment_intents\/[^/]+\/(capture|cancel)$/.test(req.url)) return res.end(JSON.stringify({ id: req.url.split('/')[3], status: req.url.endsWith('capture') ? 'succeeded' : 'canceled' }));
    if (req.url === '/v1/refunds') { const p = new URLSearchParams(body); return res.end(JSON.stringify({ id: `re_test_${p.get('payment_intent')}`, status: 'succeeded' })); }
    if (/\/v1\/checkout\/sessions\/[^/]+\/expire$/.test(req.url)) return res.end(JSON.stringify({ id: req.url.split('/')[4], status: 'expired' }));
    if (req.url === '/v1/accounts') return res.end(JSON.stringify({ id: 'acct_test_1' }));
    if (req.url === '/v1/account_links') return res.end(JSON.stringify({ url: 'http://127.0.0.1:4242/onboard/acct_test_1' }));
    if (req.url === '/v1/transfers') { const p = new URLSearchParams(body); return res.end(JSON.stringify({ id: `tr_test_${p.get('metadata[visit_id]')}` })); }
    if (req.url === '/__calls') return res.end(JSON.stringify(calls));
    res.statusCode = 404; res.end('{}');
  });
}).listen(4242, '127.0.0.1', () => console.log('stripe stub on 4242'));
