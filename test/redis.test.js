'use strict';
/* Runs the whole suite again on the Upstash Redis store, with no SESSION_SECRET. */
process.env.TEST_STORE = 'redis';
require('./suite.test.js');

const test = require('node:test');
const assert = require('node:assert');
const { createRedisStore } = require('../src/store');
const { fakeUpstash } = require('./fake-upstash');

test('redis store: secret is generated once; partial updates keep other fields; kv TTLs', async () => {
  const f = fakeUpstash();
  const s = createRedisStore('https://fake-upstash.test/', 'test-token', f.fetch);
  assert.strictEqual(await s.ping(), 'ok (redis)');
  const a = await s.ensureSecret('first-secret'), b = await s.ensureSecret('second-secret');
  assert.strictEqual(a, 'first-secret'); assert.strictEqual(b, 'first-secret');
  await s.putInstall({ app: 'x', locationId: 'L', installed: true, tokens: 'T1', settings: { a: 1 }, stats: { events: 2 } });
  await s.patchInstall('x', 'L', { tokens: 'T2' }, { 'stats.events': 3 });
  const i = await s.getInstall('x', 'L');
  assert.strictEqual(i.tokens, 'T2'); assert.deepStrictEqual(i.settings, { a: 1 }); assert.strictEqual(i.stats.events, 5);
  await s.patchInstall('x', 'missing', { tokens: 'T' });
  assert.strictEqual(await s.getInstall('x', 'missing'), null);
  assert.strictEqual(await s.kvSetNX('k', 1, 60), true); assert.strictEqual(await s.kvSetNX('k', 1, 60), false);
  assert.strictEqual(await s.kvIncr('n', 5, 60), 5); assert.strictEqual(await s.kvIncr('n', 2, 60), 7);
  await s.kvSet('bd:05-17:c1', 1); await s.kvSet('bd:05-17:c2', 1); await s.kvSet('bd:05-18:c3', 1);
  assert.deepStrictEqual((await s.kvList('bd:05-17:')).map((x) => x.key).sort(), ['bd:05-17:c1', 'bd:05-17:c2']);
  const bad = createRedisStore('https://fake-upstash.test', 'wrong', f.fetch);
  await assert.rejects(bad.ping(), /Redis request failed \(401\)/);
});
