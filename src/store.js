'use strict';
/* Storage. MONGODB_URI set -> MongoDB Atlas (free M0 is plenty).
   Otherwise an in-memory store (local development and tests only).

   Collections
     installs   one document per app + sub-account (_id "<app>:<locationId>")
     companies  agency tokens from bulk installs (_id "<app>:<companyId>")
     events     activity log, auto-deleted after 30 days
     kv         small app state: counters, cooldowns, birthday index, webhook
                de-duplication. Optional expiry (TTL index).            */
const EVENT_TTL_DAYS = 30;
const copy = (o) => (o == null ? null : JSON.parse(JSON.stringify(o)));
const expiry = (ttlSec) => (ttlSec ? new Date(Date.now() + ttlSec * 1000) : null);

function createMemoryStore() {
  const installs = new Map(), companies = new Map(), kv = new Map();
  let events = [];
  const live = (e) => e && (!e.expiresAt || e.expiresAt > new Date());
  return {
    kind: 'memory',
    async getInstall(app, loc) { return copy(installs.get(app + ':' + loc)); },
    async putInstall(i) { i.updatedAt = new Date().toISOString(); installs.set(i.app + ':' + i.locationId, copy(i)); return i; },
    // Partial update: set {path: value} and inc {path: n}. Paths may be "a.b".
    async patchInstall(app, loc, set, inc) {
      const i = installs.get(app + ':' + loc);
      if (!i) return;
      const at = (path) => { const ks = path.split('.'); let o = i; while (ks.length > 1) { const k = ks.shift(); o = o[k] = o[k] || {}; } return [o, ks[0]]; };
      for (const [k, v] of Object.entries(set || {})) { const [o, last] = at(k); o[last] = copy(v); }
      for (const [k, v] of Object.entries(inc || {})) { const [o, last] = at(k); o[last] = Number(o[last] || 0) + v; }
      i.updatedAt = new Date().toISOString();
    },
    async listInstalls(q) {
      q = q || {};
      return copy([...installs.values()].filter((i) => (!q.app || i.app === q.app) && (q.installed == null || i.installed === q.installed))
        .sort((a, b) => String(b.installedAt).localeCompare(String(a.installedAt))));
    },
    async getCompany(app, id) { return copy(companies.get(app + ':' + id)); },
    async putCompany(c) { companies.set(c.app + ':' + c.companyId, copy(c)); return c; },
    async log(app, loc, type, detail) {
      events.unshift({ at: new Date().toISOString(), app: app || null, locationId: loc || null, type, detail: String(detail || '').slice(0, 500) });
      if (events.length > 2000) events.length = 2000;
    },
    async events(q) {
      q = q || {};
      return copy(events.filter((e) => (!q.app || e.app === q.app) && (!q.locationId || e.locationId === q.locationId)).slice(0, q.limit || 50));
    },
    async kvGet(k) { const e = kv.get(k); return live(e) ? copy(e.v) : null; },
    async kvSet(k, v, ttl) { kv.set(k, { v: copy(v), expiresAt: expiry(ttl) }); },
    async kvDel(k) { kv.delete(k); },
    async kvSetNX(k, v, ttl) {
      if (live(kv.get(k))) return false;
      kv.set(k, { v: copy(v), expiresAt: expiry(ttl) });
      return true;
    },
    async kvIncr(k, by, ttl) {
      const e = live(kv.get(k)) ? kv.get(k) : { v: 0, expiresAt: expiry(ttl) };
      e.v = Number(e.v || 0) + by;
      kv.set(k, e);
      return e.v;
    },
    async kvList(prefix, limit) {
      const out = [];
      for (const [k, e] of kv) if (k.startsWith(prefix) && live(e)) { out.push({ key: k, value: copy(e.v) }); if (out.length >= (limit || 1000)) break; }
      return out;
    },
    async ensureSecret(candidate) { if (!kv.has('__secret')) kv.set('__secret', { v: candidate, expiresAt: null }); return kv.get('__secret').v; },
    async ping() { return 'ok (memory: data is lost on restart)'; },
    async close() {}
  };
}

function createMongoStore(uri, dbName) {
  const { MongoClient } = require('mongodb');
  const cacheKey = '__suiteMongo:' + uri + ':' + dbName;
  function db() {
    if (!global[cacheKey]) {
      global[cacheKey] = (async () => {
        const client = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 });
        await client.connect();
        const d = client.db(dbName);
        await Promise.all([
          d.collection('installs').createIndex({ app: 1, installed: 1, installedAt: -1 }),
          d.collection('events').createIndex({ app: 1, locationId: 1, at: -1 }),
          d.collection('events').createIndex({ at: 1 }, { expireAfterSeconds: EVENT_TTL_DAYS * 86400 }),
          d.collection('kv').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
        ].map((p) => p.catch((e) => console.warn('[store] index not created: ' + e.message))));
        return { client, d };
      })().catch((e) => { global[cacheKey] = null; throw e; });
    }
    return global[cacheKey].then((x) => x.d);
  }
  const col = async (n) => (await db()).collection(n);
  const strip = (doc) => { if (!doc) return null; delete doc._id; return doc; };
  const notExpired = () => ({ $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] });
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return {
    kind: 'mongo',
    async getInstall(app, loc) { return strip(await (await col('installs')).findOne({ _id: app + ':' + loc })); },
    async putInstall(i) {
      i.updatedAt = new Date().toISOString();
      await (await col('installs')).replaceOne({ _id: i.app + ':' + i.locationId }, Object.assign({}, i), { upsert: true });
      return i;
    },
    async patchInstall(app, loc, set, inc) {
      const u = { $set: Object.assign({ updatedAt: new Date().toISOString() }, set || {}) };
      if (inc && Object.keys(inc).length) u.$inc = inc;
      await (await col('installs')).updateOne({ _id: app + ':' + loc }, u);
    },
    async listInstalls(q) {
      q = q || {};
      const f = {};
      if (q.app) f.app = q.app;
      if (q.installed != null) f.installed = q.installed;
      return (await (await col('installs')).find(f).sort({ installedAt: -1 }).limit(q.limit || 5000).toArray()).map(strip);
    },
    async getCompany(app, id) { return strip(await (await col('companies')).findOne({ _id: app + ':' + id })); },
    async putCompany(c) { await (await col('companies')).replaceOne({ _id: c.app + ':' + c.companyId }, Object.assign({}, c), { upsert: true }); return c; },
    async log(app, loc, type, detail) {
      await (await col('events')).insertOne({ at: new Date(), app: app || null, locationId: loc || null, type, detail: String(detail || '').slice(0, 500) });
    },
    async events(q) {
      q = q || {};
      const f = {};
      if (q.app) f.app = q.app;
      if (q.locationId) f.locationId = q.locationId;
      const docs = await (await col('events')).find(f).sort({ at: -1 }).limit(q.limit || 50).toArray();
      return docs.map((e) => ({ at: e.at.toISOString(), app: e.app, locationId: e.locationId, type: e.type, detail: e.detail }));
    },
    async kvGet(k) {
      const d = await (await col('kv')).findOne(Object.assign({ _id: k }, notExpired()));
      return d ? d.v : null;
    },
    async kvSet(k, v, ttl) { await (await col('kv')).replaceOne({ _id: k }, { v, expiresAt: expiry(ttl) }, { upsert: true }); },
    async kvDel(k) { await (await col('kv')).deleteOne({ _id: k }); },
    async kvSetNX(k, v, ttl) {
      const c = await col('kv');
      try { await c.insertOne({ _id: k, v, expiresAt: expiry(ttl) }); return true; } catch (e) {
        if (e.code !== 11000) throw e;
        // The TTL monitor runs about once a minute: take over an expired key.
        const r = await c.updateOne({ _id: k, expiresAt: { $ne: null, $lte: new Date() } }, { $set: { v, expiresAt: expiry(ttl) } });
        return r.modifiedCount === 1;
      }
    },
    async kvIncr(k, by, ttl) {
      const c = await col('kv');
      await c.deleteOne({ _id: k, expiresAt: { $ne: null, $lte: new Date() } });
      const r = await c.findOneAndUpdate({ _id: k }, { $inc: { v: by }, $setOnInsert: { expiresAt: expiry(ttl) } }, { upsert: true, returnDocument: 'after' });
      const doc = r && r.value !== undefined && r.ok !== undefined ? r.value : r; // driver v5 vs v6 result shape
      return doc ? doc.v : by;
    },
    async kvList(prefix, limit) {
      const docs = await (await col('kv')).find(Object.assign({ _id: { $regex: '^' + escRe(prefix) } }, notExpired())).limit(limit || 1000).toArray();
      return docs.map((d) => ({ key: d._id, value: d.v }));
    },
    async ensureSecret(candidate) {
      const c = await col('kv');
      await c.updateOne({ _id: '__secret' }, { $setOnInsert: { v: candidate, expiresAt: null } }, { upsert: true });
      return (await c.findOne({ _id: '__secret' })).v;
    },
    async ping() { await (await db()).command({ ping: 1 }); return 'ok'; },
    async close() {
      const c = global[cacheKey];
      global[cacheKey] = null;
      if (c) await (await c).client.close();
    }
  };
}

/* Upstash Redis over its REST API (Vercel Marketplace: "Upstash for Redis",
   free plan). No driver needed: plain HTTPS. Installs are hashes with one
   field per top-level property, so partial updates never overwrite a
   concurrently refreshed token. */
function createRedisStore(url, token, fetchImpl) {
  const doFetch = fetchImpl || ((...a) => fetch(...a));
  const base = url.replace(/\/+$/, '');
  async function pipeline(cmds) {
    const res = await doFetch(base + '/pipeline', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds) });
    const out = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(out)) throw new Error('Redis request failed (' + res.status + ')' + (out && out.error ? ': ' + out.error : ''));
    return out.map((r) => { if (r.error) throw new Error('Redis: ' + r.error); return r.result; });
  }
  const one = async (...cmd) => (await pipeline([cmd]))[0];
  const J = (v) => JSON.stringify(v === undefined ? null : v);
  const P = (v) => { try { return v == null ? null : JSON.parse(v); } catch (e) { return null; } };
  const ik = (app, loc) => 'inst:' + app + ':' + loc;

  function toHash(i) {
    const f = [];
    for (const [k, v] of Object.entries(i)) {
      if (k === 'stats') for (const [sk, sv] of Object.entries(v || {})) f.push('stats.' + sk, String(Number(sv) || 0));
      else f.push(k, J(v));
    }
    return f;
  }
  function fromHash(arr) {
    if (!arr || !arr.length) return null;
    const o = { stats: {} };
    for (let x = 0; x < arr.length; x += 2) {
      if (arr[x].startsWith('stats.')) o.stats[arr[x].slice(6)] = Number(arr[x + 1]) || 0;
      else o[arr[x]] = P(arr[x + 1]);
    }
    return o;
  }
  const exArgs = (ttl) => (ttl ? ['EX', String(Math.max(1, Math.round(ttl)))] : []);

  return {
    kind: 'redis',
    async getInstall(app, loc) { return fromHash(await one('HGETALL', ik(app, loc))); },
    async putInstall(i) {
      i.updatedAt = new Date().toISOString();
      const key = ik(i.app, i.locationId);
      await pipeline([['DEL', key], ['HSET', key, ...toHash(i)], ['SADD', 'insts', i.app + ':' + i.locationId]]);
      return i;
    },
    async patchInstall(app, loc, set, inc) {
      const key = ik(app, loc);
      if (!(await one('EXISTS', key))) return;
      const cmds = [['HSET', key, 'updatedAt', J(new Date().toISOString()), ...Object.entries(set || {}).flatMap(([k, v]) => [k, J(v)])]];
      for (const [k, v] of Object.entries(inc || {})) cmds.push(['HINCRBY', key, k, String(v)]);
      await pipeline(cmds);
    },
    async listInstalls(q) {
      q = q || {};
      const ids = (await one('SMEMBERS', 'insts')) || [];
      const wanted = ids.filter((id) => !q.app || id.startsWith(q.app + ':'));
      const all = [];
      for (let x = 0; x < wanted.length; x += 100) {
        const res = await pipeline(wanted.slice(x, x + 100).map((id) => ['HGETALL', 'inst:' + id]));
        res.forEach((r) => { const i = fromHash(r); if (i) all.push(i); });
      }
      return all.filter((i) => q.installed == null || i.installed === q.installed)
        .sort((a, b) => String(b.installedAt).localeCompare(String(a.installedAt))).slice(0, q.limit || 5000);
    },
    async getCompany(app, id) { return P(await one('GET', 'comp:' + app + ':' + id)); },
    async putCompany(c) { await one('SET', 'comp:' + c.app + ':' + c.companyId, J(c)); return c; },
    async log(app, loc, type, detail) {
      const e = J({ at: new Date().toISOString(), app: app || null, locationId: loc || null, type, detail: String(detail || '').slice(0, 500) });
      const keys = ['ev:all'].concat(app ? ['ev:' + app] : [], app && loc ? ['ev:' + app + ':' + loc] : []);
      await pipeline(keys.flatMap((k) => [['LPUSH', k, e], ['LTRIM', k, '0', '199'], ['EXPIRE', k, String(EVENT_TTL_DAYS * 86400)]]));
    },
    async events(q) {
      q = q || {};
      const key = q.app && q.locationId ? 'ev:' + q.app + ':' + q.locationId : q.app ? 'ev:' + q.app : 'ev:all';
      let list = ((await one('LRANGE', key, '0', '199')) || []).map(P).filter(Boolean);
      if (!q.app && q.locationId) list = list.filter((e) => e.locationId === q.locationId);
      return list.slice(0, q.limit || 50);
    },
    async kvGet(k) { return P(await one('GET', 'kv:' + k)); },
    async kvSet(k, v, ttl) { await one('SET', 'kv:' + k, J(v), ...exArgs(ttl)); },
    async kvDel(k) { await one('DEL', 'kv:' + k); },
    async kvSetNX(k, v, ttl) { return (await one('SET', 'kv:' + k, J(v), 'NX', ...exArgs(ttl))) === 'OK'; },
    async kvIncr(k, by, ttl) {
      const [n] = await pipeline([['INCRBY', 'kv:' + k, String(by)]].concat(ttl ? [['EXPIRE', 'kv:' + k, String(Math.round(ttl)), 'NX']] : []));
      return Number(n);
    },
    async kvList(prefix, limit) {
      const keys = [];
      let cursor = '0';
      do {
        const [next, batch] = await one('SCAN', cursor, 'MATCH', 'kv:' + prefix.replace(/[*?[\]\\]/g, '\\$&') + '*', 'COUNT', '1000');
        cursor = String(next);
        keys.push(...batch);
      } while (cursor !== '0' && keys.length < (limit || 1000));
      const out = [];
      for (let x = 0; x < keys.length && out.length < (limit || 1000); x += 100) {
        const chunk = keys.slice(x, x + 100);
        const vals = await one('MGET', ...chunk);
        chunk.forEach((k, n) => { if (vals[n] != null) out.push({ key: k.slice(3), value: P(vals[n]) }); });
      }
      return out;
    },
    // The app's own secret, generated once, for installs without SESSION_SECRET.
    async ensureSecret(candidate) { await one('SET', 'suite:secret', candidate, 'NX'); return one('GET', 'suite:secret'); },
    async ping() { return (await one('PING')) === 'PONG' ? 'ok (redis)' : 'unexpected reply'; },
    async close() {}
  };
}

function createStore(cfg) {
  if (cfg.mongoUri) return createMongoStore(cfg.mongoUri, cfg.mongoDb);
  if (cfg.redisUrl && cfg.redisToken) return createRedisStore(cfg.redisUrl, cfg.redisToken);
  return createMemoryStore();
}

module.exports = { createStore, createMemoryStore, createMongoStore, createRedisStore };
