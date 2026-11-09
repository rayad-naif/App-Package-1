'use strict';
/* A tiny in-memory emulator of the Upstash Redis REST /pipeline endpoint,
   covering the commands src/store.js uses. */
function fakeUpstash() {
  const data = new Map(); // key -> { t: 'str'|'hash'|'set'|'list', v, exp }
  const live = (k) => { const e = data.get(k); if (e && e.exp && e.exp <= Date.now()) { data.delete(k); return null; } return e || null; };
  const glob = (p) => new RegExp('^' + p.replace(/\\(.)/g, (m, c) => '\u0000' + c).replace(/[.+^${}()|[\]]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')
    .replace(/\u0000(.)/g, (m, c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) + '$');
  function run([cmd, ...a]) {
    switch (cmd.toUpperCase()) {
      case 'PING': return 'PONG';
      case 'GET': { const e = live(a[0]); return e ? e.v : null; }
      case 'SET': {
        const nx = a.includes('NX'); const ex = a.indexOf('EX');
        if (nx && live(a[0])) return null;
        data.set(a[0], { t: 'str', v: a[1], exp: ex > -1 ? Date.now() + Number(a[ex + 1]) * 1000 : 0 });
        return 'OK';
      }
      case 'DEL': { let n = 0; a.forEach((k) => { if (data.delete(k)) n++; }); return n; }
      case 'EXISTS': return live(a[0]) ? 1 : 0;
      case 'INCRBY': { const e = live(a[0]) || { t: 'str', v: '0', exp: 0 }; e.v = String(Number(e.v) + Number(a[1])); data.set(a[0], e); return Number(e.v); }
      case 'EXPIRE': { const e = live(a[0]); if (!e) return 0; if (a[2] === 'NX' && e.exp) return 0; e.exp = Date.now() + Number(a[1]) * 1000; return 1; }
      case 'MGET': return a.map((k) => { const e = live(k); return e ? e.v : null; });
      case 'HSET': { const e = live(a[0]) || { t: 'hash', v: new Map(), exp: 0 }; for (let i = 1; i < a.length; i += 2) e.v.set(a[i], String(a[i + 1])); data.set(a[0], e); return 1; }
      case 'HGETALL': { const e = live(a[0]); return e ? [...e.v].flat() : []; }
      case 'HINCRBY': { const e = live(a[0]); if (!e) return 0; const n = Number(e.v.get(a[1]) || 0) + Number(a[2]); e.v.set(a[1], String(n)); return n; }
      case 'SADD': { const e = live(a[0]) || { t: 'set', v: new Set(), exp: 0 }; a.slice(1).forEach((m) => e.v.add(m)); data.set(a[0], e); return 1; }
      case 'SMEMBERS': { const e = live(a[0]); return e ? [...e.v] : []; }
      case 'LPUSH': { const e = live(a[0]) || { t: 'list', v: [], exp: 0 }; a.slice(1).forEach((x) => e.v.unshift(x)); data.set(a[0], e); return e.v.length; }
      case 'LTRIM': { const e = live(a[0]); if (e) e.v = e.v.slice(Number(a[1]), Number(a[2]) + 1); return 'OK'; }
      case 'LRANGE': { const e = live(a[0]); return e ? e.v.slice(Number(a[1]), Number(a[2]) + 1) : []; }
      case 'SCAN': { const re = glob(a[a.indexOf('MATCH') + 1]); return ['0', [...data.keys()].filter((k) => live(k) && re.test(k))]; }
      default: throw new Error('fake upstash: unsupported ' + cmd);
    }
  }
  let calls = 0;
  async function fetch(url, opts) {
    calls++;
    if (opts.headers.Authorization !== 'Bearer test-token') return { ok: false, status: 401, json: async () => ({ error: 'Unauthorized' }) };
    const out = JSON.parse(opts.body).map((c) => { try { return { result: run(c.map(String)) }; } catch (e) { return { error: e.message }; } });
    return { ok: true, status: 200, json: async () => out };
  }
  return { fetch, data, calls: () => calls };
}
module.exports = { fakeUpstash };
