module.exports = function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const payload = {
    ok: true,
    service: 'yavlgold-agro',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  };

  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  return res.status(200).json(payload);
};
