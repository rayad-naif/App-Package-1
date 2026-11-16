'use strict';
/* The request handler, shared by every way this app can start:
   - Vercel with the "Other" preset   -> api/index.js
   - Vercel with the "Express" preset -> src/server.js (default export)
   - npm start / node src/server.js   -> listens on PORT
   A missing setting never crashes the function: every page then explains
   what to set instead of showing an error or a blank page. */
const config = require('./config');
const { createSuite } = require('./suite');

const cfg = config.load();
const problems = config.validate(cfg);

function notConfigured(req, res) {
  res.statusCode = 503;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end('The app suite is running but not configured yet. In Vercel (Project > Settings > Environment Variables, or the Storage tab), fix:\n - ' +
    problems.join('\n - ') + '\nThen redeploy.');
}

if (problems.length) console.error('Configuration problems: ' + problems.join('; '));
const handler = problems.length ? notConfigured : createSuite(cfg);

module.exports = { handler, cfg, problems };
