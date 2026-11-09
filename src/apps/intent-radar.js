'use strict';
/* INTENT RADAR - reads every inbound message the moment it arrives and
   spots what the lead actually wants: ready to buy, asking for prices,
   wants to book, unhappy, about to cancel, opting out, urgent, or talking
   about a competitor. It tags the contact, writes a note quoting the
   message, and creates a task for the contact's owner on the intents that
   need a human fast. No AI key needed: everything runs on fast, explainable
   phrase rules, and you can add your own words. */
const { getContact, addTags, addNote } = require('./util');

/* Built-in phrase rules. Order = priority when a message matches several. */
const INTENTS = [
  { id: 'optout', label: 'Opt-out', tag: 'intent-opt-out',
    re: /^\s*(stop|stopall|unsubscribe|quit|end|cancel|opt ?out|remove me)\s*[.!]*\s*$|\b(unsubscribe|remove me from|take me off|stop (texting|messaging|emailing|contacting|calling) me|(do not|don'?t) (text|contact|call|email) me)\b/i },
  { id: 'complaint', label: 'Unhappy / complaint', tag: 'intent-complaint',
    re: /\b(angry|furious|upset|terrible|awful|worst|horrible|disappointed|disappointing|ridiculous|unacceptable|scam|rip ?off|ripped off|refund|complain(t|ing)?|lawyer|attorney|sue|bbb|never again|not happy|unhappy|waste of (money|time)|bad (service|experience))\b/i },
  { id: 'cancel', label: 'Churn risk', tag: 'intent-churn-risk',
    re: /\b(cancel(l?ation|l?ing)?|terminate|stop (the |my )?(service|subscription|membership|plan)|end (my|the) (contract|subscription|membership|plan)|switch(ing)? to|going with (someone|another)|no longer (need|want|interested)|(don'?t|do not) need (it|this|you)|not interested)\b/i },
  { id: 'buying', label: 'Ready to buy', tag: 'intent-buying',
    re: /\b(ready to (buy|start|sign|go|move forward|proceed)|sign me up|let'?s (do it|go|get started|move forward)|i'?m in\b|where (do|can) i pay|send (me )?(the |an? )?(invoice|contract|agreement|payment link|link to pay)|take my money|how do i (start|sign up|get started|pay)|(want|like) to (buy|purchase|order|sign up|get started|move forward)|deposit)\b/i },
  { id: 'booking', label: 'Wants to book', tag: 'intent-booking',
    re: /\b(appointment|book(ing)?|schedule|reschedule|availability|available (on|at|this|next|tomorrow|today)|call me|give me a call|meet(ing)?|consult(ation)?|demo|time slot|come in)\b/i },
  { id: 'pricing', label: 'Price question', tag: 'intent-pricing',
    re: /\b(how much|price|pricing|prices|cost|costs|quote|estimate|rates?|fees?|budget|payment plans?|financing|discount|coupon|promo|special offer|cheaper|expensive|afford)\b/i },
  { id: 'urgent', label: 'Urgent', tag: 'intent-urgent',
    re: /\b(urgent|urgently|asap|a\.s\.a\.p|emergency|right away|right now|immediately|as soon as possible)\b/i }
];
const LABEL = Object.fromEntries(INTENTS.map((i) => [i.id, i.label]));
const CHOICES = INTENTS.map((i) => ({ value: i.id, label: i.label })).concat([{ value: 'competitor', label: 'Mentions a competitor' }]);

const tagField = (id, def) => ({ key: 'tag_' + id, type: 'tag', label: LABEL[id] + ' tag', default: def, group: 'Tags', help: id === 'optout' ? 'Empty = don’t tag this intent.' : undefined });

const fields = [
  { key: 'enabled', type: 'bool', label: 'Intent Radar is on', default: true },
  { key: 'detect', type: 'multiselect', label: 'Detect', default: CHOICES.map((c) => c.value), options: CHOICES },
  ...INTENTS.map((i) => tagField(i.id, i.tag)),
  { key: 'competitors', type: 'tags', label: 'Competitor names', default: [], group: 'Competitors', help: 'Comma separated, e.g. "acme dental, smile co". A message naming one gets the competitor tag.' },
  { key: 'tag_competitor', type: 'tag', label: 'Competitor tag', default: 'intent-competitor', group: 'Competitors' },
  { key: 'custom_words', type: 'textarea', max: 2000, label: 'Your own phrases', default: '', group: 'Your own rules',
    help: 'One rule per line: intent: word, phrase, phrase. Example: "buying: financing approved, when can you start". Intents: optout, complaint, cancel, buying, booking, pricing, urgent.' },
  { key: 'add_note', type: 'bool', label: 'Add a note quoting the message and what was detected', default: true, group: 'Actions' },
  { key: 'task_for', type: 'multiselect', label: 'Create a follow-up task for the contact’s owner on', default: ['complaint', 'cancel', 'buying'], options: CHOICES, group: 'Actions' },
  { key: 'task_due_minutes', type: 'int', label: 'Task due in (minutes)', default: 60, min: 5, max: 10080, group: 'Actions' },
  { key: 'cooldown_hours', type: 'int', label: 'Repeat the note and task for the same intent at most once every (hours)', default: 24, min: 1, max: 720, group: 'Actions', help: 'Tags are always kept up to date.' }
];

const htmlToText = (s) => String(s || '').replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ').replace(/<br\s*\/?>|<\/p>/gi, '\n')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
// Drop quoted earlier messages in email replies ("On Mon, ... wrote:" and "> ..." lines).
const freshPart = (s) => s.split(/\n\s*On .{3,120}wrote:\s*\n|\n-{2,}\s*Original Message/i)[0].split('\n').filter((l) => !/^\s*>/.test(l)).join('\n');
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function customRules(text) {
  const rules = {};
  for (const line of String(text || '').split('\n')) {
    const m = line.match(/^\s*([a-z]+)\s*:\s*(.+)$/i);
    if (!m || !LABEL[m[1].toLowerCase()]) continue;
    const words = m[2].split(',').map((w) => w.trim()).filter((w) => w.length >= 2).slice(0, 50);
    if (words.length) (rules[m[1].toLowerCase()] = rules[m[1].toLowerCase()] || []).push(...words);
  }
  return Object.fromEntries(Object.entries(rules).map(([k, ws]) => [k, new RegExp('\\b(' + ws.map(escRe).join('|') + ')\\b', 'i')]));
}

/* Returns [{ id, match }] in priority order. */
function detect(message, s) {
  const text = freshPart(htmlToText(message)).slice(0, 5000);
  if (!text.trim()) return [];
  const custom = customRules(s.custom_words);
  const found = [];
  for (const i of INTENTS) {
    if (!s.detect.includes(i.id)) continue;
    const m = text.match(i.re) || (custom[i.id] && text.match(custom[i.id]));
    if (m) found.push({ id: i.id, match: m[0].trim() });
  }
  if (s.detect.includes('competitor') && s.competitors.length) {
    const m = text.match(new RegExp('\\b(' + s.competitors.map(escRe).join('|') + ')\\b', 'i'));
    if (m) found.push({ id: 'competitor', match: m[0] });
  }
  // An opt-out is not also a "cancel" or "booking"; a bare STOP must never trigger sales follow-up.
  if (found.some((f) => f.id === 'optout')) return found.filter((f) => f.id === 'optout' || f.id === 'complaint');
  return found;
}

const tagFor = (id, s) => (id === 'competitor' ? s.tag_competitor : s['tag_' + id]);

async function onEvent(evt, ctx) {
  const s = ctx.settings;
  if (!s.enabled || evt.type !== 'InboundMessage' || !evt.contactId) return;
  if (evt.direction && evt.direction !== 'inbound') return;
  const found = detect(evt.body || evt.message || '', s);
  if (!found.length) return;

  const api = ctx.api, id = evt.contactId;
  await addTags(api, id, found.map((f) => tagFor(f.id, s)).filter(Boolean));
  // Notes and tasks only once per intent per cooldown.
  const fresh = [];
  for (const f of found) if (await ctx.kv.setNX('seen:' + id + ':' + f.id, 1, s.cooldown_hours * 3600)) fresh.push(f);
  const names = found.map((f) => (f.id === 'competitor' ? 'Mentions a competitor' : LABEL[f.id])).join(', ');
  await ctx.action('detected ' + names, id);
  if (!fresh.length) return;

  const quote = freshPart(htmlToText(evt.body || '')).replace(/\s+/g, ' ').trim().slice(0, 300);
  const why = fresh.map((f) => (f.id === 'competitor' ? 'Mentions a competitor' : LABEL[f.id]) + ' ("' + f.match + '")').join('; ');
  if (s.add_note) await addNote(api, id, 'Intent Radar: ' + why + '\nMessage (' + String(evt.messageType || 'message') + '): "' + quote + '"');

  const needTask = fresh.filter((f) => s.task_for.includes(f.id));
  if (needTask.length) {
    let owner = evt.assignedTo || null;
    if (!owner) { try { owner = (await getContact(api, id)).assignedTo || null; } catch (e) { /* unassigned task */ } }
    const task = {
      title: 'Follow up: ' + needTask.map((f) => (f.id === 'competitor' ? 'competitor mentioned' : LABEL[f.id].toLowerCase())).join(', '),
      body: 'Detected by Intent Radar: ' + why + '\n\n"' + quote + '"',
      dueDate: new Date(Date.now() + s.task_due_minutes * 60e3).toISOString(),
      completed: false
    };
    if (owner) task.assignedTo = owner;
    await api.post('/contacts/' + encodeURIComponent(id) + '/tasks', task);
    await ctx.action('task created' + (owner ? ' for ' + owner : ''), id);
  }
}

module.exports = {
  slug: 'intent-radar',
  envPrefix: 'INTENT_RADAR',
  name: 'Intent Radar',
  icon: '📡',
  color: '#2f54eb',
  tagline: 'Know what every lead wants the second they reply.',
  description: 'Reads every inbound SMS, email, chat and social message and spots buying signals, price questions, booking requests, complaints, cancellation risk, opt-outs, urgency and competitor mentions. It tags the contact, notes why, and creates a task for the owner when a human is needed fast.',
  features: [
    ['Buying signals, instantly', '"Send me the invoice" or "how do I get started" tags the lead intent-buying and creates a task for the owner.'],
    ['Save customers before they leave', 'Complaints and cancellation talk are flagged with the exact quote, so you can call before it is too late.'],
    ['Respect opt-outs', '"Stop texting me" is tagged intent-opt-out and never triggers sales follow-up.'],
    ['Your words, too', 'Add competitor names and your own phrases for any intent. No AI key, no per-message fees, and every match is explained.']
  ],
  privacy: {
    reads: 'inbound message events, including the message text so it can be checked for intent, and the contact’s owner',
    writes: 'intent tags, a note quoting the message, and follow-up tasks for the contact’s owner',
    stores: 'nothing from the message itself; only a short marker per contact and intent so notes and tasks are not repeated'
  },
  faq: [
    ['Which messages are checked?', 'Every inbound message: SMS, WhatsApp, email, Facebook, Instagram, Google and web chat. Outbound messages are ignored.'],
    ['Does it use AI or send my messages anywhere?', 'No. It uses phrase rules that run on our server in milliseconds. Message text is checked and then discarded, never stored.'],
    ['How do I act on an intent?', 'Use the tags as workflow triggers, e.g. "Contact Tag added: intent-buying" to notify your closer or move the opportunity.'],
    ['It missed a phrase my leads use.', 'Add it under "Your own phrases", e.g. "buying: approved for financing". It applies to the next message.']
  ],
  scopes: ['contacts.readonly', 'contacts.write', 'conversations.readonly', 'conversations/message.readonly', 'locations.readonly'],
  webhookEvents: ['InboundMessage'],
  fields,
  onEvent,
  _test: { detect, htmlToText, freshPart, customRules }
};
