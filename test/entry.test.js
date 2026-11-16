'use strict';
/* Every way the app can start serves pages; none crashes or exits. */
const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
// Load an entry file in a fresh process with the given env, then GET a path.
function probe(entry, env, urlPath) {
  const code = `
    const h = require(${JSON.stringify(path.join(root, entry))});
    const http = require('http');
    const s = http.createServer(h).listen(0, async () => {
      const r = await fetch('http://127.0.0.1:' + s.address().port + ${JSON.stringify(urlPath)});
      console.log(JSON.stringify({ status: r.status, body: (await r.text()).slice(0, 200000) }));
      s.close(); process.exit(0);
    });`;
  const r = spawnSync(process.execPath, ['-e', code], { env: Object.assign({ PATH: process.env.PATH }, env), encoding: 'utf8', cwd: root, timeout: 20000 });
  assert.strictEqual(r.status, 0, entry + ' exited ' + r.status + ': ' + r.stderr);
  return JSON.parse(r.stdout.trim().split('\n').pop());
}
const configured = { SESSION_SECRET: 's'.repeat(40), ADMIN_PASSWORD: 'admin-password', BASE_URL: 'https://example.test' };

for (const entry of ['api/index.js', 'src/server.js']) {
  test(entry + ': not configured on Vercel -> explains what to set (no crash)', () => {
    const r = probe(entry, { VERCEL: '1' }, '/');
    assert.strictEqual(r.status, 503);
    assert.match(r.body, /not configured yet[\s\S]*Upstash for Redis/);
    assert.match(r.body, /ADMIN_PASSWORD/);
  });
  test(entry + ': configured -> home page lists all apps', () => {
    const r = probe(entry, configured, '/');
    assert.strictEqual(r.status, 200);
    for (const name of ['Lead Scorer', 'Round Robin Pro', 'Contact Cleaner', 'After-Hours Responder', 'Birthday Greeter', 'Intent Radar']) assert.ok(r.body.includes(name), name);
  });
}

test('vercel.json pins the "Other" preset and routes everything to the function', () => {
  const v = require('../vercel.json');
  assert.strictEqual(v.framework, null);
  assert.strictEqual(v.outputDirectory, 'public');
  assert.deepStrictEqual(v.rewrites, [{ source: '/(.*)', destination: '/api/index' }]);
});
