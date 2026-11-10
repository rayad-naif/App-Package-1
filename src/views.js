'use strict';
/* Server-rendered pages. Every dynamic value goes through esc(). */

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const fmt = (iso) => (iso ? esc(String(iso).replace('T', ' ').slice(0, 16)) + ' UTC' : '&mdash;');

const CSS = `
:root{--bg:#f6f7fb;--card:#fff;--text:#101828;--muted:#667085;--line:#e4e7ec;--accent:#155eef;--ok:#12b76a;--bad:#f04438;--warn:#f79009;--soft:#eef4ff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.6 Inter,'Segoe UI',system-ui,-apple-system,sans-serif}
a{color:var(--accent)}
code{font:13px ui-monospace,SFMono-Regular,Menlo,monospace;background:#f2f4f7;border:1px solid var(--line);padding:1px 6px;border-radius:6px;word-break:break-all}
.top{display:flex;align-items:center;gap:14px;padding:14px 20px;background:#fff;border-bottom:1px solid var(--line);flex-wrap:wrap}
.brand{font-weight:800;color:var(--text);text-decoration:none;letter-spacing:-.2px}
.top nav{margin-left:auto;display:flex;gap:16px;flex-wrap:wrap}
.top nav a{color:var(--muted);text-decoration:none;font-weight:600;font-size:14px}
.top nav a:hover{color:var(--accent)}
main{max-width:1040px;margin:0 auto;padding:28px 16px 60px}
h1{font-size:32px;line-height:1.2;margin:0 0 10px;letter-spacing:-.5px}
h2{font-size:20px;margin:0 0 12px}
h3{font-size:16px;margin:18px 0 6px}
.sub{color:var(--muted);margin:0 0 22px;font-size:17px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px;margin-bottom:16px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:#fff;color:var(--text);border-radius:10px;padding:10px 16px;font:inherit;font-weight:700;font-size:14px;cursor:pointer;text-decoration:none}
.btn:hover{border-color:var(--accent);color:var(--accent)}
.btn.pri{background:var(--accent);border-color:var(--accent);color:#fff}
.btn.pri:hover{filter:brightness(1.08);color:#fff}
.btn:disabled{opacity:.55;cursor:default}
.btn.sm{padding:6px 11px;font-size:13px}
.hero{padding:30px 0 10px}
.badge{display:inline-block;font-size:12px;font-weight:700;padding:3px 10px;border-radius:99px;background:var(--soft);color:var(--accent)}
.app-ico{font-size:30px;width:54px;height:54px;border-radius:14px;display:grid;place-items:center;margin-bottom:10px}
.feat p{margin:0;color:var(--muted);font-size:14px}
.note{color:var(--muted);font-size:13.5px}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:left;padding:9px 8px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:12px;text-transform:uppercase;letter-spacing:.6px;color:var(--muted)}
.scroll{overflow-x:auto}
.pill{display:inline-block;font-size:12px;font-weight:700;padding:2px 9px;border-radius:99px}
.pill.on{background:#ecfdf3;color:#027a48}.pill.off{background:#fef3f2;color:#b42318}.pill.warn{background:#fffaeb;color:#b54708}
label.f{display:block;font-weight:600;font-size:14px;margin:14px 0 6px}
.help{color:var(--muted);font-size:12.5px;margin-top:4px}
input[type=text],input[type=number],input[type=password],input[type=time],textarea,select{width:100%;border:1px solid #d0d5dd;border-radius:9px;padding:9px 11px;font:inherit;background:#fff;color:var(--text)}
input[type=number]{max-width:140px}
input[type=time]{width:auto}
textarea{min-height:90px}
input:focus,textarea:focus,select:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(21,94,239,.15)}
.switch{display:flex;align-items:center;gap:10px;margin:12px 0;font-weight:600;font-size:14px;cursor:pointer}
.switch input{width:18px;height:18px;accent-color:var(--accent)}
.hours{display:grid;grid-template-columns:90px 150px auto 150px;justify-content:start;gap:6px 12px;align-items:center}
.users{display:grid;grid-template-columns:1fr auto;gap:6px 14px;align-items:center}
.users input{max-width:90px}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chips input{accent-color:var(--accent)}
.chips label{display:flex;gap:6px;align-items:center;border:1px solid var(--line);border-radius:99px;padding:5px 12px;font-size:13.5px;cursor:pointer}
.bar{position:sticky;bottom:0;background:var(--bg);padding:12px 0;display:flex;gap:12px;align-items:center;border-top:1px solid var(--line);margin-top:10px}
.flash{border-radius:10px;padding:11px 14px;margin-bottom:14px;font-weight:600}
.flash.ok{background:#ecfdf3;color:#027a48}.flash.err{background:#fef3f2;color:#b42318}
.stats{display:flex;gap:26px;flex-wrap:wrap}.stats b{display:block;font-size:22px}
.steps li{margin:6px 0}
footer{border-top:1px solid var(--line);padding:22px 16px;color:var(--muted);font-size:13.5px;background:#fff}
footer .in{max-width:1040px;margin:0 auto;display:flex;gap:16px;justify-content:space-between;flex-wrap:wrap}
footer a{color:var(--muted);margin-right:14px}
.prose{max-width:780px}
@media(max-width:600px){h1{font-size:26px}.hours{grid-template-columns:80px 1fr auto 1fr}}
`;

function createViews(cfg, apps) {
  const brand = cfg.brand;
  const base = cfg.baseUrl;

  function page(title, body, o) {
    o = o || {};
    const accent = o.def ? '<style>:root{--accent:' + esc(o.def.color) + ';--soft:' + esc(o.def.color) + '1a}</style>' : '';
    const nav = o.bare ? '' : '<nav>' + (o.def
      ? ['', '/docs', '/support'].map((x, i) => '<a href="/' + o.def.slug + x + '">' + ['Home', 'Docs', 'Support'][i] + '</a>').join('')
      : '<a href="/">Apps</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="mailto:' + esc(brand.supportEmail) + '">Support</a>') + '</nav>';
    const p = o.def ? '/' + o.def.slug : '';
    const foot = o.bare ? '' : '<footer><div class="in"><div><b>' + esc(o.def ? o.def.name : brand.name) + '</b>' + (o.def ? ' by ' + esc(brand.name) : ' &middot; Apps for your CRM') +
      '<br>Support: <a href="mailto:' + esc(brand.supportEmail) + '">' + esc(brand.supportEmail) + '</a></div>' +
      '<div>' + (o.def ? '<a href="' + p + '">Home</a><a href="' + p + '/docs">Docs</a><a href="' + p + '/support">Support</a>' : '<a href="/">All apps</a>') +
      '<a href="' + p + '/privacy">Privacy Policy</a><a href="' + p + '/terms">Terms of Service</a></div></div></footer>';
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + esc(title) + ' | ' + esc(brand.name) + '</title><meta name="description" content="' + esc(o.description || brand.name + ' - apps for your CRM') + '">' +
      '<style>' + CSS + '</style>' + accent + '</head><body>' +
      (o.bare ? '' : '<header class="top"><a class="brand" href="' + (o.def ? '/' + o.def.slug : '/') + '">' + (o.def ? esc(o.def.icon + ' ' + o.def.name) : esc(brand.name)) + '</a>' + nav + '</header>') +
      '<main' + (o.wide ? ' style="max-width:1200px"' : '') + '>' + body + '</main>' + foot + (o.script ? '<script>' + o.script + '</script>' : '') + '</body></html>';
  }

  const icon = (d) => '<div class="app-ico" style="background:' + esc(d.color) + '22">' + esc(d.icon) + '</div>';
  const installBtn = (d, label) => '<a class="btn pri" href="/' + d.slug + '/install">' + esc(label || 'Install now') + '</a>';

  function home() {
    const cards = apps.map((d) => '<div class="card">' + icon(d) + '<h2 style="margin-bottom:4px">' + esc(d.name) + '</h2><p class="note" style="margin:0 0 10px">' + esc(d.tagline) + '</p>' +
      '<p style="font-size:14px">' + esc(d.description) + '</p><a class="btn pri" href="/' + d.slug + '">Learn more</a></div>').join('');
    return page('Apps for your CRM', '<div class="hero"><span class="badge">App Marketplace</span><h1>' + ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten'][apps.length] + ' automations every CRM account needs</h1>' +
      '<p class="sub">Install from your CRM\u2019s app marketplace, open the app in your account, done. No Zapier, no workflow spaghetti.</p></div><div class="grid">' + cards + '</div>');
  }

  function landing(d) {
    const feats = d.features.map((f) => '<div class="card feat"><h3 style="margin-top:0">' + esc(f[0]) + '</h3><p>' + esc(f[1]) + '</p></div>').join('');
    return page(d.name, '<div class="hero">' + icon(d) + '<h1>' + esc(d.tagline) + '</h1><p class="sub">' + esc(d.description) + '</p>' +
      '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">' + installBtn(d) +
      '<a class="btn" href="/' + d.slug + '/docs">How it works</a><a class="btn" href="/' + d.slug + '/support">Support</a></div></div><div class="grid" style="margin-top:26px">' + feats + '</div>' +
      '<div class="card"><h2>Getting started</h2><ol class="steps"><li>Install ' + esc(d.name) + ' from your CRM\u2019s app marketplace.</li>' +
      '<li>Open <b>' + esc(d.name) + '</b> from your account’s left menu.</li><li>Review the settings (the defaults work out of the box) and click Save.</li></ol></div>',
    { def: d, description: d.tagline + ' ' + d.description });
  }

  /* Values to paste into each HighLevel Marketplace listing (owner only: shown in /admin). */
  function listingRows(d) {
    return [
      ['Target user', 'Sub-account'],
      ['Redirect URL', d.oauth.redirectUri],
      ['Webhook URL', base + '/' + d.slug + '/webhook'],
      ['Custom page (Live URL)', base + '/' + d.slug + '/embed'],
      ['Website (home page)', base + '/' + d.slug],
      ['Documentation', base + '/' + d.slug + '/docs'],
      ['Support URL', base + '/' + d.slug + '/support'],
      ['Support email', brand.supportEmail],
      ['Privacy policy', base + '/' + d.slug + '/privacy'],
      ['Terms of service', base + '/' + d.slug + '/terms'],
      ['Scopes', d.scopes.join(' ')],
      ['Webhook events', d.webhookEvents.join(', ')],
      ['Environment variables (Vercel)', d.envPrefix + '_CLIENT_ID, ' + d.envPrefix + '_CLIENT_SECRET, ' + d.envPrefix + '_SSO_KEY']
    ];
  }

  function docs(d) {
    const settings = d.fields.map((f) => '<li><b>' + esc(f.label) + '</b>' + (f.help ? ': ' + esc(f.help) : '') + '</li>').join('');
    return page(d.name + ' docs', '<div class="prose"><h1>' + esc(d.name) + '</h1><p class="sub">' + esc(d.description) + '</p>' +
      '<div class="card"><h2>Using the app</h2><ol class="steps"><li>Install it from your CRM\u2019s app marketplace.</li>' +
      '<li>In your account, open <b>' + esc(d.name) + '</b> in the left menu. Admins can change settings; other users can view them.</li>' +
      '<li>Settings save instantly and apply to the next event. Recent activity is shown at the bottom of the page.</li></ol>' +
      '<h3>Settings</h3><ul>' + settings + '</ul></div>' +
      '<div class="card"><h2>Need help?</h2><p>See the <a href="/' + d.slug + '/support">support page</a> for common questions, or email <a href="mailto:' + esc(brand.supportEmail) + '">' + esc(brand.supportEmail) + '</a>.</p></div></div>', { def: d });
  }

  function installed(d, r) {
    const names = r.installs.map((i) => '<li>' + esc(i.name || i.locationId) + '</li>').join('');
    return page('Installed', '<div class="card" style="max-width:620px;margin:30px auto">' + icon(d) + '<h1>' + esc(d.name) + ' is installed</h1>' +
      (names ? '<p>Active in:</p><ul>' + names + '</ul>' : '<p>Installed. Each account is activated as soon as the app is added to it.</p>') +
      '<p>Open <b>' + esc(d.name) + '</b> from your account’s left menu to review the settings. The defaults are already running.</p>' +
      '<a class="btn" href="/' + d.slug + '/docs">Read the docs</a></div>', { def: d });
  }

  function message(d, title, msg) {
    return page(title, '<div class="card" style="max-width:620px;margin:30px auto"><h1>' + esc(title) + '</h1><p class="sub">' + esc(msg) + '</p>' +
      '<a class="btn" href="' + (d ? '/' + d.slug : '/') + '">Back</a></div>', { def: d });
  }

  /* The settings app shown inside the CRM. All rendering is client-side from
     the field list; text goes through textContent (never innerHTML). */
  function embed(d) {
    const script = `
var SLUG=${JSON.stringify(d.slug)},TOKEN=null,DATA=null,root=document.getElementById('root');
function el(tag,attrs,kids){var e=document.createElement(tag);if(attrs)for(var k in attrs){if(k==='text')e.textContent=attrs[k];else if(k==='cls')e.className=attrs[k];else e.setAttribute(k,attrs[k]);}(kids||[]).forEach(function(c){if(c)e.appendChild(typeof c==='string'?document.createTextNode(c):c)});return e}
function status(msg,bad){var s=document.getElementById('status');s.className='flash '+(bad?'err':'ok');s.textContent=msg;s.style.display=msg?'':'none'}
function api(method,path,body){return fetch('/'+SLUG+'/api/'+path,{method:method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+TOKEN},body:body?JSON.stringify(body):undefined}).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||('Error '+r.status));return j})})}
function fail(msg,link){root.innerHTML='';var c=el('div',{cls:'card'},[el('h2',{text:'Can\\u2019t open the app'}),el('p',{text:msg})]);if(link)c.appendChild(el('a',{cls:'btn pri',href:link,target:'_blank',rel:'noopener',text:'Install'}));root.appendChild(c)}
var done=false;
window.addEventListener('message',function(e){var d=e.data;if(done||!d||d.message!=='REQUEST_USER_DATA_RESPONSE')return;done=true;
fetch('/'+SLUG+'/api/sso',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({payload:d.payload})}).then(function(r){return r.json()}).then(function(j){if(!j.token)return fail(j.error||'Sign-in failed.',j.install);TOKEN=j.token;load()}).catch(function(){fail('Could not reach the server.')})});
if(window.top===window.self){fail('Open this page from the app\\u2019s menu item inside your CRM account.')}else{window.parent.postMessage({message:'REQUEST_USER_DATA'},'*');setTimeout(function(){if(!done)fail('Your CRM did not answer the sign-in request. Reload the page.')},10000)}
function load(){api('GET','settings').then(function(j){DATA=j;render()}).catch(function(e){fail(e.message)})}
function input(f,v){var ro=!DATA.edit,i;
 if(f.type==='bool'){i=el('input',{type:'checkbox'});i.checked=!!v;i.disabled=ro;return el('label',{cls:'switch'},[i,f.label])}
 var w=el('div',null,[el('label',{cls:'f',text:f.label})]);
 if(f.type==='int'){i=el('input',{type:'number',min:f.min,max:f.max,step:1});i.value=v}
 else if(f.type==='textarea'){i=el('textarea',{maxlength:f.max||1000});i.value=v}
 else if(f.type==='select'){i=el('select');f.options.forEach(function(o){var op=el('option',{value:o.value,text:o.label});if(o.value===v)op.selected=true;i.appendChild(op)})}
 else if(f.type==='tags'){i=el('input',{type:'text',placeholder:'tag-one, tag-two'});i.value=(v||[]).join(', ')}
 else if(f.type==='dates'){i=el('textarea',{placeholder:'2026-12-25'});i.value=(v||[]).join('\\n')}
 else if(f.type==='multiselect'){i=el('div',{cls:'chips'});f.options.forEach(function(o){var c=el('input',{type:'checkbox',value:o.value});c.checked=v.indexOf(o.value)>=0;c.disabled=ro;i.appendChild(el('label',null,[c,o.label]))})}
 else if(f.type==='hours'){i=el('div',{cls:'hours'});['mon','tue','wed','thu','fri','sat','sun'].forEach(function(dy){var h=v[dy],c=el('input',{type:'checkbox','data-d':dy});c.checked=h.on;c.disabled=ro;var a=el('input',{type:'time','data-from':dy});a.value=h.from;a.disabled=ro;var b=el('input',{type:'time','data-to':dy});b.value=h.to;b.disabled=ro;i.appendChild(el('label',{cls:'switch',style:'margin:0'},[c,dy[0].toUpperCase()+dy.slice(1)]));i.appendChild(a);i.appendChild(el('span',{cls:'note',text:'to'}));i.appendChild(b)})}
 else if(f.type==='weights'){i=el('div',{cls:'users'});var us=(DATA.options&&DATA.options.users)||[];if(!us.length)i.appendChild(el('p',{cls:'note',text:DATA.optionsError?'Could not load your team: '+DATA.optionsError:'No users found in this account.'}));us.forEach(function(u){var n=el('input',{type:'number',min:0,max:10,'data-u':u.id});n.value=v[u.id]||0;n.disabled=ro;i.appendChild(el('div',null,[el('b',{text:u.name}),el('div',{cls:'note',text:u.email})]));i.appendChild(n)})}
 else{i=el('input',{type:'text',maxlength:f.max||200,placeholder:f.type==='timezone'?(DATA.install.timezone||'America/New_York'):''});i.value=v||''}
 if(i.tagName==='INPUT'||i.tagName==='TEXTAREA'||i.tagName==='SELECT')i.disabled=ro;
 w.appendChild(i);if(f.help)w.appendChild(el('div',{cls:'help',text:f.help}));return w}
function read(f,node){
 if(f.type==='bool')return node.querySelector('input').checked;
 if(f.type==='multiselect')return [].slice.call(node.querySelectorAll('input:checked')).map(function(c){return c.value});
 if(f.type==='hours'){var o={};['mon','tue','wed','thu','fri','sat','sun'].forEach(function(dy){o[dy]={on:node.querySelector('[data-d='+dy+']').checked,from:node.querySelector('[data-from='+dy+']').value,to:node.querySelector('[data-to='+dy+']').value}});return o}
 if(f.type==='weights'){var w={};[].slice.call(node.querySelectorAll('[data-u]')).forEach(function(n){if(+n.value>0)w[n.getAttribute('data-u')]=+n.value});return w}
 var x=node.querySelector('input,textarea,select').value;return f.type==='int'?Number(x):x}
function render(){root.innerHTML='';var j=DATA,ins=j.install,st=ins.stats||{};
 root.appendChild(el('div',{cls:'card'},[el('h1',{text:j.app.name,style:'font-size:24px'}),el('div',{cls:'note',text:(ins.name||'')+(ins.timezone?' \\u00b7 '+ins.timezone:'')}),
  el('div',{cls:'stats',style:'margin-top:12px'},[el('div',null,[el('b',{text:String(st.events||0)}),'events received']),el('div',null,[el('b',{text:String(st.actions||0)}),'actions taken']),el('div',null,[el('b',{text:ins.lastEventAt?ins.lastEventAt.slice(0,16).replace('T',' '):'\\u2014'}),'last event (UTC)'])])]));
 if(ins.needsReauth)root.appendChild(el('div',{cls:'flash err',text:'Your CRM no longer accepts this app\\u2019s access. Reinstall the app from the app marketplace.'}));
 root.appendChild(el('div',{id:'status',cls:'flash ok',style:'display:none'}));
 var groups={},order=[],nodes=[];j.fields.forEach(function(f){var g=f.group||'Settings';if(!groups[g]){groups[g]=el('div',{cls:'card'},[el('h2',{text:g})]);order.push(g)}var n=input(f,j.settings[f.key]);nodes.push([f,n]);groups[g].appendChild(n)});
 order.forEach(function(g){root.appendChild(groups[g])});
 (j.app.actions||[]).forEach(function(a){var b=el('button',{cls:'btn',text:a.label});b.disabled=!j.edit;b.onclick=function(){b.disabled=true;status('Working\\u2026');api('POST','action/'+a.id).then(function(r){status('Done: '+JSON.stringify(r.result));b.disabled=false}).catch(function(e){status(e.message,true);b.disabled=false})};root.appendChild(el('div',{cls:'card'},[el('h2',{text:'Tools'}),b]))});
 var ev=el('table',null,[el('tr',null,[el('th',{text:'When (UTC)'}),el('th',{text:'What'}),el('th',{text:'Detail'})])]);
 j.events.forEach(function(e){ev.appendChild(el('tr',null,[el('td',{text:e.at.slice(0,16).replace('T',' ')}),el('td',{text:e.type}),el('td',{text:e.detail})]))});
 if(!j.events.length)ev.appendChild(el('tr',null,[el('td',{colspan:3,cls:'note',text:'Nothing yet. Activity shows up here as it happens.'})]));
 root.appendChild(el('div',{cls:'card'},[el('h2',{text:'Recent activity'}),el('div',{cls:'scroll'},[ev])]));
 if(j.edit){var save=el('button',{cls:'btn pri',text:'Save settings'});save.onclick=function(){var s={};nodes.forEach(function(p){s[p[0].key]=read(p[0],p[1])});save.disabled=true;
  api('PUT','settings',{settings:s}).then(function(r){DATA.settings=r.settings;status('Saved. Changes apply to the next event.');save.disabled=false}).catch(function(e){status(e.message,true);save.disabled=false})};
  root.appendChild(el('div',{cls:'bar'},[save,el('span',{cls:'note',text:'Only admins can change settings.'})]))}
 else root.appendChild(el('p',{cls:'note',text:'View only: ask an admin to change these settings.'}))}
`;
    return page(d.name, '<div id="root"><div class="card"><p class="note">Signing you in…</p></div></div>', { def: d, bare: true, script });
  }

  /* Legal pages: d = one app (its own policy), or none (the catalog: all apps). */
  function legal(title, d, sections) {
    const scope = d ? esc(d.name) + ' (the &ldquo;App&rdquo;)' : esc(apps.map((a) => a.name).join(', ')) + ' (the &ldquo;Apps&rdquo;)';
    return page((d ? d.name + ' ' : '') + title, '<div class="prose card"><h1>' + (d ? esc(d.name) + ' ' : '') + esc(title) + '</h1><p class="note">Last updated ' + esc(brand.legalUpdated) +
      '. Applies to ' + scope + ', provided by ' + esc(brand.legalName) + '.</p>' +
      sections.map((x) => '<h3>' + esc(x[0]) + '</h3><p>' + esc(x[1]) + '</p>').join('') + '</div>', { def: d });
  }
  const its = (d) => (d ? 'the App' : 'each App');
  function privacy(d) {
    const p = d && d.privacy;
    return legal('Privacy Policy', d, [
      ['What we receive', 'When you install ' + its(d) + ', your CRM gives us an access token for your account and sends us events for the scopes you approve' +
        (p ? ': ' + p.reads + '.' : ' (for example new contacts, inbound messages, appointments and opportunities).') +
        ' The settings page receives your CRM user ID and role through the CRM\u2019s single sign-on.'],
      ['What we change in your account', p ? 'Only this: ' + p.writes + '.' : 'Only what each App’s documentation describes: contacts, opportunities and messages in your account.'],
      ['What we store', 'OAuth tokens (encrypted), your account name and time zone, your settings, ' + (p ? p.stores : 'small working data each App needs (scores, counters, cooldowns, birthday dates by contact ID)') +
        ', and a 30-day activity log. We do not store message contents or copies of your contact records.'],
      ['How we use it', 'Only to run ' + (d ? d.name : 'the App you installed') + '. We never sell or share your data and never use it for advertising.'],
      ['Where it lives', 'Our servers run on Vercel and data is stored in MongoDB Atlas, both encrypted in transit and at rest.'],
      ['Retention and deletion', 'Uninstalling revokes our access immediately. Activity logs expire after 30 days. Email us to delete all data for an account at any time.'],
      ['Contact', 'Questions: ' + brand.supportEmail]
    ]);
  }
  function terms(d) {
    return legal('Terms of Service', d, [
      ['The service', (d ? d.name + ' ' + d.description.charAt(0).toLowerCase() + d.description.slice(1) : 'Each App automates tasks inside your CRM account.')],
      ['Your responsibilities', 'You are responsible for the messages and changes ' + its(d) + ' makes on your behalf, including consent, opt-out and messaging laws (such as TCPA, CAN-SPAM and GDPR) and your CRM provider’s own policies.'],
      ['Availability', 'We aim for high availability but provide ' + its(d) + ' "as is", without warranties. CRM outages or API changes may affect it.'],
      ['Liability', 'To the extent the law allows, we are not liable for indirect or consequential losses arising from your use of ' + its(d) + '.'],
      ['Cancellation', 'Uninstall from your CRM at any time; ' + its(d) + ' stops immediately.'],
      ['Contact', brand.supportEmail]
    ]);
  }

  function support(d) {
    const faq = (d.faq || []).map((q) => '<h3>' + esc(q[0]) + '</h3><p>' + esc(q[1]) + '</p>').join('');
    return page(d.name + ' support', '<div class="prose"><h1>' + esc(d.name) + ' support</h1><p class="sub">We’re here to help. Most questions are answered below.</p>' +
      '<div class="card"><h2>Contact us</h2><p>Email <a href="mailto:' + esc(brand.supportEmail) + '?subject=' + encodeURIComponent(d.name + ' support') + '">' + esc(brand.supportEmail) + '</a>' +
      ' with your account name and what you expected to happen. We reply within one business day.</p>' +
      '<p class="note">Tip: the <b>Recent activity</b> list at the bottom of the app page shows every action the app took, and any error.</p></div>' +
      '<div class="card"><h2>Common questions</h2>' + faq + '</div>' +
      '<div class="card"><h2>Install, open, uninstall</h2><ul><li><b>Install:</b> from your CRM\u2019s app marketplace, or <a href="/' + d.slug + '/install">install here</a>.</li>' +
      '<li><b>Open:</b> click <b>' + esc(d.name) + '</b> in your account’s left menu. Only admins can change settings.</li>' +
      '<li><b>Uninstall:</b> remove the app from your CRM\u2019s app marketplace. It stops immediately.</li></ul>' +
      '<p>More detail in the <a href="/' + d.slug + '/docs">documentation</a>.</p></div></div>', { def: d });
  }

  function adminLogin(err) {
    return page('Admin sign in', '<div class="card" style="max-width:420px;margin:40px auto"><h1>Admin</h1>' + (err ? '<div class="flash err">' + esc(err) + '</div>' : '') +
      '<form method="post" action="/admin/login"><label class="f">Password</label><input type="password" name="password" autofocus required>' +
      '<p><button class="btn pri">Sign in</button></p></form></div>', { bare: true });
  }

  function admin(o) {
    const name = Object.fromEntries(apps.map((a) => [a.slug, a.icon + ' ' + a.name]));
    const counts = apps.map((a) => {
      const n = o.installs.filter((i) => i.app === a.slug && i.installed).length;
      return '<a class="card" style="text-decoration:none;color:inherit;margin:0" href="/admin?app=' + a.slug + '"><div class="note">' + esc(name[a.slug]) + '</div><b style="font-size:24px">' + n + '</b> <span class="note">active' + (a.ready ? '' : ' &middot; <span class="pill off">not configured</span>') + '</span></a>';
    }).join('');
    const rows = o.installs.map((i) => '<tr><td>' + esc(name[i.app] || i.app) + '</td><td><b>' + esc(i.name || '(unnamed)') + '</b><br><small class="note">' + esc(i.locationId) + '</small></td>' +
      '<td>' + (i.installed ? (i.needsReauth ? '<span class="pill warn">needs reinstall</span>' : '<span class="pill on">active</span>') : '<span class="pill off">uninstalled</span>') + '</td>' +
      '<td>' + ((i.stats && i.stats.events) || 0) + ' / ' + ((i.stats && i.stats.actions) || 0) + '</td><td>' + fmt(i.lastEventAt) + '</td><td>' + fmt(i.installedAt) + '</td></tr>').join('');
    const ev = o.events.map((e) => '<tr><td>' + fmt(e.at) + '</td><td>' + esc(name[e.app] || '') + '</td><td><small>' + esc(e.locationId || '') + '</small></td><td>' + esc(e.type) + '</td><td>' + esc(e.detail) + '</td></tr>').join('');
    return page('Admin', '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"><h1>Admin' + (o.filter ? ': ' + esc(name[o.filter]) : '') + '</h1>' +
      '<form method="post" action="/admin/logout"><input type="hidden" name="_csrf" value="' + esc(o.csrf) + '"><button class="btn sm">Sign out</button></form></div>' +
      (o.filter ? '<p><a href="/admin">&larr; All apps</a></p>' : '<div class="grid" style="margin-bottom:16px">' + counts + '</div>') +
      '<div class="card"><h2>Installs</h2><div class="scroll"><table><tr><th>App</th><th>Account</th><th>Status</th><th>Events / actions</th><th>Last event</th><th>Installed</th></tr>' +
      (rows || '<tr><td colspan="6" class="note">No installs yet.</td></tr>') + '</table></div></div>' +
      (o.filter ? '' : '<div class="card"><h2>Marketplace listing values</h2><p class="note">Copy these into each app in the HighLevel developer portal.</p>' +
        apps.map((d) => '<details style="margin:8px 0"><summary><b>' + esc(d.icon + ' ' + d.name) + '</b></summary><div class="scroll"><table>' +
          listingRows(d).map((r) => '<tr><th style="width:220px">' + esc(r[0]) + '</th><td><code>' + esc(r[1]) + '</code></td></tr>').join('') + '</table></div></details>').join('') + '</div>') +
      '<div class="card"><h2>Activity</h2><div class="scroll"><table><tr><th>When</th><th>App</th><th>Location</th><th>Type</th><th>Detail</th></tr>' + (ev || '<tr><td colspan="5" class="note">Nothing yet.</td></tr>') + '</table></div></div>',
    { bare: true, wide: true });
  }

  const notFound = () => page('Not found', '<div class="card" style="max-width:520px;margin:40px auto"><h1>Page not found</h1><a class="btn" href="/">All apps</a></div>');

  return { home, landing, docs, installed, message, embed, privacy, terms, support, adminLogin, admin, notFound };
}

module.exports = { createViews, esc };
