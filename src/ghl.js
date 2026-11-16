'use strict';
/* HighLevel OAuth 2.0 + API client with automatic token refresh.
   Target User: Sub-account (Location). Agency bulk installs are supported:
   the agency token is kept and location tokens are minted from it on demand. */
const crypto = require('crypto');

class GhlError extends Error {
  constructor(message, status, body) { super(message); this.name = 'GhlError'; this.status = status; this.body = body; }
}
const SKEW = 5 * 60e3; // refresh 5 minutes before expiry

function createGhl(cfg, store, sec, fetchImpl) {
  const doFetch = fetchImpl || ((...a) => fetch(...a));
  const g = cfg.ghl;

  async function call(method, url, opts) {
    opts = opts || {};
    const headers = Object.assign({ Accept: 'application/json', Version: g.apiVersion }, opts.headers || {});
    let body;
    if (opts.form) { headers['Content-Type'] = 'application/x-www-form-urlencoded'; body = new URLSearchParams(opts.form); }
    else if (opts.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(opts.body); }
    const res = await doFetch(url, { method, headers, body });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : {}; } catch (e) { /* not json */ }
    if (!res.ok) {
      const m = json && (json.message || json.error_description || json.error);
      throw new GhlError(method + ' ' + url.replace(g.apiBase, '').split('?')[0] + ' failed (' + res.status + ')' + (m ? ': ' + (Array.isArray(m) ? m.join(', ') : m) : ''), res.status, json || text);
    }
    return json || {};
  }

  function verifyWebhook(rawBody, headers) {
    // true = valid, false = invalid, null = no keys configured (caller double-checks)
    const ed = headers['x-ghl-signature'], rsa = headers['x-wh-signature'];
    if (!g.webhookEd25519Key && !g.webhookRsaKey) return null;
    try {
      if (ed && g.webhookEd25519Key) return crypto.verify(null, rawBody, g.webhookEd25519Key, Buffer.from(ed, 'base64'));
      if (rsa && g.webhookRsaKey) return crypto.verify('sha256', rawBody, g.webhookRsaKey, Buffer.from(rsa, 'base64'));
    } catch (e) { return false; }
    return false;
  }

  const sealTokens = (t) => sec.encrypt(JSON.stringify({ a: t.access_token, r: t.refresh_token || null }));
  const openTokens = (blob) => { try { return JSON.parse(sec.decrypt(blob) || 'null'); } catch (e) { return null; } };
  const expiresAt = (t) => new Date(Date.now() + (Number(t.expires_in) || 86399) * 1000).toISOString();

  function forApp(def) {
    const creds = def.creds;
    const redirectUri = cfg.baseUrl + '/' + def.slug + '/oauth/callback';
    const appId = String(creds.clientId).split('-')[0];

    function authorizeUrl(state) {
      const u = new URL(g.authUrl);
      u.searchParams.set('response_type', 'code');
      u.searchParams.set('redirect_uri', redirectUri);
      u.searchParams.set('client_id', creds.clientId);
      u.searchParams.set('scope', def.scopes.join(' '));
      if (state) u.searchParams.set('state', state);
      return u.toString();
    }

    const tokenRequest = (params) => call('POST', g.apiBase + '/oauth/token', {
      form: Object.assign({ client_id: creds.clientId, client_secret: creds.clientSecret }, params)
    });

    function blankInstall(locationId, companyId) {
      return {
        app: def.slug, locationId, companyId: companyId || null, name: '', timezone: '',
        installed: true, installedAt: new Date().toISOString(), uninstalledAt: null,
        tokens: null, expiresAt: null, viaCompany: false,
        settings: def.sanitize({}), lastEventAt: null, stats: { events: 0, actions: 0 }, needsReauth: false
      };
    }

    async function saveLocationToken(t, viaCompany) {
      const locationId = t.locationId;
      const inst = (await store.getInstall(def.slug, locationId)) || blankInstall(locationId, t.companyId);
      Object.assign(inst, {
        companyId: t.companyId || inst.companyId, installed: true, uninstalledAt: null, needsReauth: false,
        tokens: sealTokens(t), expiresAt: expiresAt(t), viaCompany: !!viaCompany
      });
      if (!inst.installedAt) inst.installedAt = new Date().toISOString();
      await enrich(inst, t.access_token);
      await store.putInstall(inst);
      return inst;
    }

    // Location name + timezone (best effort; needs locations.readonly).
    async function enrich(inst, access) {
      try {
        const j = await call('GET', g.apiBase + '/locations/' + encodeURIComponent(inst.locationId), { headers: { Authorization: 'Bearer ' + access } });
        const l = j.location || j;
        inst.name = String(l.name || inst.name || '').slice(0, 120);
        inst.timezone = String(l.timezone || inst.timezone || '');
      } catch (e) { /* keep going: name is cosmetic */ }
    }

    /* Authorization code -> install(s). Returns { installs, company, pending }.
       - A sub-account install gives a Location token.
       - An agency install ("install in all / selected sub-accounts") gives a
         Company token (isBulkInstallation). We keep it and mint a Location
         token for every sub-account that has the app, via /oauth/locationToken
         (needs the oauth.readonly + oauth.write scopes). */
    async function exchangeCode(code, deadline) {
      let t;
      try {
        t = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, user_type: 'Location' });
      } catch (e) {
        // Some agency installs only exchange as Company. If the code was already
        // consumed this fails the same way and the first error is reported.
        if (e.status !== 400 && e.status !== 401 && e.status !== 422) throw e;
        try { t = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, user_type: 'Company' }); } catch (e2) { throw e; }
      }
      if (t.userType === 'Location' && t.locationId) return { installs: [await saveLocationToken(t, false)], company: null, pending: 0 };
      if (t.userType === 'Company' && t.companyId) {
        const company = { app: def.slug, companyId: t.companyId, installed: true, tokens: sealTokens(t), expiresAt: expiresAt(t), bulk: !!t.isBulkInstallation, updatedAt: new Date().toISOString() };
        await store.putCompany(company);
        const r = await syncCompany(t.companyId, deadline || Date.now() + 25e3);
        return { installs: r.installs, company, pending: r.pending };
      }
      throw new GhlError('Unexpected token type: ' + (t.userType || 'unknown'), 400, t);
    }

    /* Mint tokens for every sub-account of the agency that has the app and
       isn't set up yet, page by page, until the deadline. Sub-accounts left
       over are set up on their first event, sign-in or the next sync. */
    async function syncCompany(companyId, deadline) {
      const installs = [];
      let pending = 0, skip = 0;
      const access = await companyAccess(companyId);
      if (!access) return { installs, pending };
      for (;;) {
        const j = await call('GET', g.apiBase + '/oauth/installedLocations?' + new URLSearchParams({ companyId, appId, isInstalled: 'true', limit: '100', skip: String(skip) }),
          { headers: { Authorization: 'Bearer ' + access } });
        const list = (j.locations || []).filter((l) => l && (l._id || l.id) && l.isInstalled !== false);
        for (const l of list) {
          const id = l._id || l.id;
          // Events usually carry only the locationId: remember which agency it belongs to.
          await store.kvSet('loc2co:' + def.slug + ':' + id, companyId, 400 * 86400);
          const have = await store.getInstall(def.slug, id);
          if (have && have.installed && have.tokens) continue;
          if (Date.now() > deadline) { pending++; continue; }
          const inst = await installFromCompany(companyId, id).catch(() => null);
          if (inst) installs.push(inst); else pending++;
        }
        skip += 100;
        if ((j.locations || []).length < 100 || skip >= 10000) break;
      }
      return { installs, pending };
    }

    async function companyAccess(companyId) {
      const c = await store.getCompany(def.slug, companyId);
      const tk = c && c.installed !== false && openTokens(c.tokens);
      if (!tk) return null;
      if (Date.parse(c.expiresAt) - SKEW > Date.now()) return tk.a;
      try {
        const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: tk.r, user_type: 'Company' });
        c.tokens = sealTokens(t); c.expiresAt = expiresAt(t); c.updatedAt = new Date().toISOString();
        await store.putCompany(c);
        return t.access_token;
      } catch (e) {
        // Refresh tokens rotate: another request may have refreshed it first.
        const fresh = await store.getCompany(def.slug, companyId);
        if (fresh && fresh.tokens !== c.tokens && Date.parse(fresh.expiresAt) - SKEW > Date.now()) return openTokens(fresh.tokens).a;
        throw e;
      }
    }

    async function installFromCompany(companyId, locationId) {
      const access = await companyAccess(companyId);
      if (!access) return null;
      const t = await call('POST', g.apiBase + '/oauth/locationToken', { headers: { Authorization: 'Bearer ' + access }, form: { companyId, locationId } });
      t.locationId = t.locationId || locationId;
      t.companyId = t.companyId || companyId;
      return saveLocationToken(t, true);
    }

    // Is the agency's token still accepted? (Used for unsigned agency-wide UNINSTALL.)
    async function companyStillInstalled(companyId) {
      const c = await store.getCompany(def.slug, companyId);
      const tk = c && c.installed !== false && openTokens(c.tokens);
      if (!tk) return false;
      try {
        const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: tk.r, user_type: 'Company' });
        c.tokens = sealTokens(t); c.expiresAt = expiresAt(t); c.updatedAt = new Date().toISOString();
        await store.putCompany(c);
        return true;
      } catch (e) { return !(e.status === 400 || e.status === 401); }
    }

    async function markCompanyUninstalled(companyId) {
      const c = await store.getCompany(def.slug, companyId);
      if (c) { c.installed = false; c.tokens = null; c.uninstalledAt = new Date().toISOString(); await store.putCompany(c); }
    }

    async function accessToken(inst, force) {
      const tk = openTokens(inst.tokens);
      if (!tk) throw new GhlError('No token stored for this sub-account. Reinstall the app.', 401);
      if (!force && Date.parse(inst.expiresAt) - SKEW > Date.now()) return tk.a;
      try {
        if (!tk.r) throw new GhlError('no refresh token', 401);
        const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: tk.r, user_type: 'Location' });
        const upd = { tokens: sealTokens(t), expiresAt: expiresAt(t), needsReauth: false };
        Object.assign(inst, upd);
        await store.patchInstall(def.slug, inst.locationId, upd);
        return t.access_token;
      } catch (e) {
        // Another instance may have refreshed (refresh tokens rotate): use its token.
        const fresh = await store.getInstall(def.slug, inst.locationId);
        if (fresh && fresh.tokens !== inst.tokens && Date.parse(fresh.expiresAt) - SKEW > Date.now()) {
          Object.assign(inst, fresh);
          return openTokens(fresh.tokens).a;
        }
        if (inst.companyId && (inst.viaCompany || !tk.r)) {
          const again = await installFromCompany(inst.companyId, inst.locationId).catch(() => null);
          if (again) { Object.assign(inst, again); return openTokens(again.tokens).a; }
        }
        if (e.status === 400 || e.status === 401) { inst.needsReauth = true; await store.patchInstall(def.slug, inst.locationId, { needsReauth: true }); }
        throw e;
      }
    }

    // API client bound to one sub-account.
    function client(inst) {
      async function request(method, path, opts) {
        opts = opts || {};
        const url = g.apiBase + path + (opts.query ? (path.includes('?') ? '&' : '?') + new URLSearchParams(opts.query) : '');
        let access = await accessToken(inst, false);
        try {
          return await call(method, url, { headers: { Authorization: 'Bearer ' + access }, body: opts.body });
        } catch (e) {
          if (e.status !== 401) throw e;
          access = await accessToken(inst, true);
          return call(method, url, { headers: { Authorization: 'Bearer ' + access }, body: opts.body });
        }
      }
      return {
        request,
        get: (p, q) => request('GET', p, { query: q }),
        post: (p, b) => request('POST', p, { body: b }),
        put: (p, b) => request('PUT', p, { body: b }),
        del: (p, b) => request('DELETE', p, { body: b })
      };
    }

    // Is the app still installed? (Used for unsigned UNINSTALL webhooks.)
    async function stillInstalled(inst) {
      try { await accessToken(inst, true); return true; } catch (e) { return !(e.status === 400 || e.status === 401); }
    }

    return { redirectUri, authorizeUrl, exchangeCode, syncCompany, installFromCompany, companyStillInstalled, markCompanyUninstalled, client, stillInstalled, blankInstall };
  }

  return { forApp, verifyWebhook, GhlError };
}

module.exports = { createGhl, GhlError };
