/* engine.js — parser, state, UI. */
(() => {
  const W = window.WORLD, SC = window.SCENES, GD = window.GUIDE;
  const $ = (q) => document.querySelector(q);
  const SAVE_KEY = 'dontpanic.save.1', AUTO_KEY = 'dontpanic.auto.1', SND_KEY = 'dontpanic.sound';
  let state = null, undoSnap = null, lastCmd = '', lastNoun = null, history = [], histIdx = -1, locked = false, sceneKey = '';
  Object.keys(W.items).forEach(id => { W.items[id].id = id; });
  Object.keys(W.rooms).forEach(id => { W.rooms[id].id = id; });
  // mutable per-item fields live in state.items[id]; expose them on world items for convenience
  Object.keys(W.items).forEach(id => { ['follower', 'worn', 'open'].forEach(f => Object.defineProperty(W.items[id], f, { get() { return state && state.items[id][f]; }, set(v) { if (state) state.items[id][f] = v; } })); });

  // ------------------------------------------------------------ state
  const freshState = () => {
    const s = { room: W.start, turn: 0, score: 0, awards: {}, flags: Object.assign({}, W.startFlags || {}), items: {}, scheduled: [], visited: {}, pending: null, dead: false, ended: false, log: [] };
    Object.keys(W.items).forEach(id => { s.items[id] = { loc: W.items[id].loc || 'nowhere' }; });
    return s;
  };

  // ------------------------------------------------------------ api for world handlers
  const api = {
    get s() { return state; }, get room() { return state.room; }, get items() { return W.items; }, get rooms() { return W.rooms; }, ctx: null,
    say: (html) => out(html, 'game'),
    loc: (id) => state.items[id].loc,
    move: (id, loc) => { state.items[id].loc = loc; if (loc !== 'inv') state.items[id].worn = false; },
    has: (id) => state.items[id].loc === 'inv',
    worn: (id) => !!state.items[id].worn,
    flag: (k, v) => { if (v === undefined) return state.flags[k]; state.flags[k] = v; return v; },
    award: (key, pts) => { if (state.awards[key]) return; state.awards[key] = true; if (pts > 0) { state.score += pts; flashScore(pts); } },
    schedule: (name, delay) => { api.cancel(name); state.scheduled.push({ at: state.turn + delay, name }); },
    cancel: (name) => { state.scheduled = state.scheduled.filter(e => e.name !== name); },
    event: (name) => W.events[name] ? W.events[name](api) : undefined,
    pending: (name) => { state.pending = name; },
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    doVerb: (verb) => { const it = api.ctx && api.ctx.item; if (it && it.on && it.on[verb]) return it.on[verb](api, api.ctx); return genericVerb(verb, api.ctx || {}); },
    doTopic: (npcId, topic) => { const t = W.items[npcId].topics[topic]; return typeof t === 'function' ? t(api) : t; },
    teaCount: () => Object.keys(state.flags.teaFacts || {}).length,
    teaFact: (k, msg) => { const f = state.flags.teaFacts || (state.flags.teaFacts = {}); if (f[k]) return f[k] === state.turn + 1 ? null : '"ALREADY NOTED," says the Nutrimatic, a little stiffly.'; f[k] = state.turn + 1; const n = Object.keys(f).length; return msg + (n === 3 ? ' <b>"THREE PARAMETERS RECEIVED. PRESS DRINK WHEN READY. I AM NOT."</b>' : ''); },
    go: (dir) => doGo(dir),
    goto: (roomId, opts = {}) => gotoRoom(roomId, opts),
    die: (html) => { out(`<div class="death">${html}</div>`, 'game'); state.dead = true; state.pending = null; showDeath(); },
    end: () => { state.ended = true; showEnd(); },
    improbability: (cb) => improbability(cb),
  };

  // ------------------------------------------------------------ output
  const out = (html, cls = 'game') => {
    const log = $('#log'); const p = document.createElement('div'); p.className = 'line ' + cls;
    p.innerHTML = cls === 'game' ? linkify(html) : html; log.appendChild(p);
    state && state.log.push([cls, p.innerHTML]); if (state && state.log.length > 120) state.log.shift();
    log.scrollTop = log.scrollHeight; if (cls === 'game') Sound.blip();
    return p;
  };
  const scopeItems = () => Object.keys(W.items).filter(id => { const l = state.items[id].loc; return l === state.room || l === 'inv'; }).map(id => W.items[id]);
  const linkify = (html) => {
    if (!state) return html;
    const GENERIC = new Set(['money', 'man', 'machine', 'screen', 'planet', 'drink', 'cup', 'box', 'post', 'sign', 'view', 'sky', 'ground', 'floor', 'door', 'doors', 'table', 'food', 'computer', 'official', 'friend', 'woman', 'pilot', 'president', 'captain', 'robot', 'liquid', 'change', 'cash', 'glass', 'bag', 'water', 'ship', 'stars', 'surface', 'lift', 'hole', 'slot', 'panel', 'controls', 'button', 'crate', 'straps', 'chair', 'chairs', 'help', 'drive', 'pipe', 'pipes', 'mud', 'lawn', 'grass', 'coats', 'coat', 'boots', 'earth', 'mouse', 'rodents', 'question']);
    const names = []; scopeItems().forEach(it => { if (it.id === 'me' || it.id === 'ear') return; it.names.forEach((n, idx) => { if (idx > 0 && GENERIC.has(n)) return; names.push([n, it.id]); }); });
    names.sort((a, b) => b[0].length - a[0].length);
    const done = new Set();
    return html.split(/(<[^>]+>)/g).map(seg => {
      if (seg.startsWith('<')) return seg;
      names.forEach(([n, id]) => { if (done.has(id) || n.length < 3) return; const re = new RegExp('(^|[^\\w>])(' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![\\w<])', 'i'); if (re.test(seg)) { seg = seg.replace(re, (m, pre, w) => `${pre}<span class="noun" data-id="${id}">${w}</span>`); done.add(id); } });
      return seg;
    }).join('');
  };
  const flashScore = (pts) => { const el = $('#score'); el.textContent = `${state.score} / ${W.maxScore}`; const f = document.createElement('span'); f.className = 'plus'; f.textContent = `+${pts}`; el.parentElement.appendChild(f); setTimeout(() => f.remove(), 1600); Sound.ding(); };

  // ------------------------------------------------------------ rooms
  const roomDesc = () => {
    const r = W.rooms[state.room]; const d = typeof r.desc === 'function' ? r.desc(api) : r.desc;
    let extra = '';
    Object.keys(W.items).forEach(id => { const it = W.items[id]; if (state.items[id].loc !== state.room || it.scenery || it.quiet) return; if (it.quietIn && it.quietIn.includes(state.room)) return; extra += it.npc ? ` ${cap(short(it))} is here.` : ` There is ${art(short(it))} here.`; });
    return `<span class="roomname">${r.name}</span>${d}${extra}`;
  };
  const short = (it) => it.short || it.names[0];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const art = (s) => /^(ford|marvin|mr|babel)/i.test(s) ? s : (/^[aeiou]/i.test(s) ? 'an ' : 'a ') + s;
  const gotoRoom = (roomId, opts = {}) => {
    const old = state.room; const r = W.rooms[roomId];
    Object.keys(W.items).forEach(id => { if (state.items[id].follower && state.items[id].loc === old) { state.items[id].loc = roomId; if (!opts.silent) out(W.items[id].followMsg || `${cap(short(W.items[id]))} follows you.`); } });
    state.room = roomId; const first = !state.visited[roomId]; state.visited[roomId] = true;
    if (!opts.silent) out(roomDesc());
    if (r.onEnter) r.onEnter(api, first);
    return true;
  };
  const doGo = (dir) => {
    const r = W.rooms[state.room]; let ex = r.exits[dir];
    if (!ex) return false;
    if (typeof ex === 'object') { if (ex.if && !ex.if(api)) return (typeof ex.msg === 'function' ? ex.msg(api) : ex.msg) || "You can't go that way."; ex = ex.to; }
    if (r.onLeave) { const res = r.onLeave(api); if (res === 'STOP') return true; if (typeof res === 'string') out(res); }
    gotoRoom(ex); return true;
  };

  // ------------------------------------------------------------ parser
  const DIRS = { north: 'north', n: 'north', south: 'south', s: 'south', east: 'east', e: 'east', west: 'west', w: 'west', up: 'up', u: 'up', down: 'down', d: 'down', in: 'in', inside: 'in', out: 'out', outside: 'out', forward: 'forward', fore: 'forward', f: 'forward', forwards: 'forward', aft: 'aft', astern: 'aft', meeting: 'meeting', ship: 'ship' };
  const SYN = { l: 'look', look: 'look', x: 'examine', ex: 'examine', examine: 'examine', inspect: 'examine', check: 'examine', study: 'examine', describe: 'examine', watch: 'examine', observe: 'examine', view: 'examine', i: 'inventory', inv: 'inventory', inventory: 'inventory', take: 'take', get: 'take', grab: 'take', pick: 'take', acquire: 'take', steal: 'take', catch: 'take', collect: 'take', buy: 'buy', purchase: 'buy', pay: 'buy', order: 'buy', drop: 'drop', discard: 'drop', throw: 'drop', go: 'go', walk: 'go', travel: 'go', head: 'go', proceed: 'go', climb: 'go', run: 'run', flee: 'run', escape: 'run', leave: 'leave', open: 'open', unlock: 'open', close: 'close', shut: 'close', put: 'put', place: 'put', insert: 'put', spread: 'put', pour: 'put', drape: 'put', lay: 'put', feed: 'feed', cover: 'cover', give: 'give', offer: 'give', hand: 'give', show: 'give', talk: 'talk', speak: 'talk', chat: 'talk', greet: 'talk', hello: 'talk', hi: 'talk', ask: 'ask', question: 'ask', tell: 'tell', say: 'say', shout: 'say', yell: 'say', whisper: 'say', answer: 'answer', wear: 'wear', don: 'wear', remove: 'remove', doff: 'remove', read: 'read', use: 'use', operate: 'use', activate: 'use', engage: 'engage', fire: 'engage', push: 'push', press: 'push', poke: 'push', pull: 'pull', tug: 'pull', yank: 'pull', hit: 'attack', punch: 'attack', kick: 'attack', attack: 'attack', kill: 'attack', fight: 'attack', smash: 'attack', break: 'attack', bang: 'attack', knock: 'attack', slap: 'attack', drink: 'drink', sip: 'drink', quaff: 'drink', eat: 'eat', swallow: 'eat', consume: 'eat', lie: 'lie', recline: 'lie', sit: 'sit', stand: 'stand', sleep: 'sleep', nap: 'sleep', wake: 'wake', wait: 'wait', z: 'wait', rest: 'wait', hint: 'hint', hints: 'hint', clue: 'hint', help: 'help', '?': 'help', commands: 'help', guide: 'guide', consult: 'guide', lookup: 'guide', save: 'save', restore: 'restore', load: 'restore', restart: 'restart', quit: 'restart', undo: 'undo', score: 'score', points: 'score', enter: 'enter', board: 'enter', exit: 'exit', follow: 'follow', hold: 'hold', hug: 'hold', embrace: 'hold', hitch: 'hitch', hitchhike: 'hitch', search: 'search', rummage: 'search', smell: 'smell', sniff: 'smell', listen: 'listen', touch: 'touch', feel: 'touch', taste: 'taste', lick: 'taste', turn: 'turn', switch: 'turn', kiss: 'kiss', dance: 'dance', sing: 'sing', jump: 'jump', swim: 'swim', pray: 'pray', panic: 'panic', think: 'think', xyzzy: 'xyzzy', plugh: 'xyzzy', yes: 'yes', y: 'yes', no: 'no', again: 'again', g: 'again', sorry: 'sorry', thanks: 'thanks', thank: 'thanks', shake: 'shake', count: 'count', breathe: 'breathe', dig: 'dig', scream: 'say', cry: 'cry', laugh: 'laugh', fly: 'fly', ride: 'enter', stop: 'stop', run_: 'run' };
  const PHRASES = [
    [/\bpick up\b/g, 'take'], [/\blook at\b/g, 'examine'], [/\blook (in|inside|into|under|behind|through)\b/g, 'examine'], [/\blook out( of)?\b/g, 'examine'], [/\blook up\b/g, 'guide'],
    [/\b(lie|lay) down\b/g, 'lie'], [/\b(lie|lay) (in|on|before|in front of)\b/g, 'lie'], [/\bin front of\b/g, 'before'], [/\bget up\b/g, 'stand'], [/\bstand up\b/g, 'stand'], [/\bsit down\b/g, 'sit'],
    [/\bput on\b/g, 'wear'], [/\btake off\b/g, 'remove'], [/\b(get|climb|go|step) (in|into|on|onto|aboard)\b/g, 'enter'], [/\b(get|climb|step) out( of)?\b/g, 'exit'],
    [/\b(turn|switch) on\b/g, 'turnon'], [/\b(turn|switch) off\b/g, 'turnoff'], [/\bwake up\b/g, 'wake'],
    [/\b(hold on to|hold onto|hang on to|hang onto|grab hold of|hold hands with|take hands with|take the hand of|hold the hand of|cling to|grab)\b/g, 'hold'], [/\bhold on\b/g, 'hold'], [/\b(\w+)'?s hand\b/g, '$1'],
    [/\brun (away|off|for it|out)\b/g, 'run'], [/\b(go|walk|head|travel) (to|towards|toward|into|for)\b/g, 'goto'],
    [/\b(talk|speak|chat) (to|with)\b/g, 'talk'], [/\bask (\w+) (to|for)\b/g, 'ask $1 about'], [/\btell (\w+) (to|that)\b/g, 'tell $1 about'],
    [/\b(consult|read|open|check|search) (the )?guide (about|on|for|entry|entry on)\b/g, 'guide'], [/\b(what|who) (is|are|was|were) (a |an |the )?/g, 'guide '], [/\bwhat does the guide say about\b/g, 'guide'], [/\bguide (about|on|for)\b/g, 'guide'],
    [/\bswitch (the )?drive on\b/g, 'engage drive'], [/\bturnon (the )?drive\b/g, 'engage drive'],
    [/\bbuy (some |a packet of |a bag of )?/g, 'buy '], [/\btake (some )?(the )?(a )?pills?\b/g, 'take pills'],
    [/\bsay (hello|hi) to\b/g, 'talk'], [/\bmake tea\b/g, 'push drink'], [/\b(get|make|order|request) (a |some )?(cup of )?tea\b/g, 'push drink'],
  ];
  const ARTICLES = new Set(['the', 'a', 'an', 'some', 'my', 'your', 'his', 'her', 'its', 'their', 'of', 'please', 'this', 'that', 'these', 'those', 'all', 'up']);
  const PREPS = new Set(['in', 'into', 'inside', 'on', 'onto', 'over', 'to', 'with', 'about', 'at', 'under', 'from', 'through', 'behind', 'before', 'for', 'using', 'towards', 'toward', 'against']);
  const norm = (s) => s.toLowerCase().replace(/[“”"]/g, '').replace(/[^a-z0-9?',\- ]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = (s) => s.split(' ').filter(w => w && !ARTICLES.has(w));
  const nameWords = (n) => n.toLowerCase().split(' ').filter(w => w && !ARTICLES.has(w));

  const resolve = (phrase, pool) => {
    if (!phrase) return null;
    const pw = words(phrase.replace(/'s\b/g, ''));
    if (!pw.length) return null;
    if (pw.length === 1 && pw[0] === 'it' && lastNoun) return W.items[lastNoun];
    let best = null, bestScore = 0;
    pool.forEach(it => {
      it.names.forEach(n => {
        const nw = nameWords(n); let sc = 0;
        if (nw.join(' ') === pw.join(' ')) sc = 4;
        else if (pw.every(w => nw.includes(w))) sc = 3;
        else if (nw.every(w => pw.includes(w))) sc = 2;
        if (sc && !it.scenery) sc += 0.5; if (sc && state.items[it.id].loc === 'inv') sc += 0.25;
        if (sc > bestScore) { bestScore = sc; best = it; }
      });
    });
    return best;
  };
  const splitPrep = (ws) => { for (let i = 0; i < ws.length; i++) if (PREPS.has(ws[i])) return [ws.slice(0, i), ws[i], ws.slice(i + 1)]; return [ws, null, []]; };

  const parse = (raw) => {
    let s = norm(raw);
    // address form: "marvin, follow me"
    const addr = s.match(/^([a-z ]+?),\s*(.+)$/);
    if (addr) { const npc = resolve(addr[1], scopeItems().filter(i => i.npc)); if (npc) return { verb: 'tell', item: npc, topic: addr[2], raw }; }
    s = s.replace(/,/g, ' ');
    PHRASES.forEach(([re, rep]) => { s = s.replace(re, rep); });
    let ws = s.split(' ').filter(Boolean);
    if (!ws.length) return null;
    let v = ws[0];
    if (DIRS[v] && ws.length === 1) return { verb: 'go', dir: DIRS[v], raw };
    if (v === 'go' && ws[1] && DIRS[ws[1]]) return { verb: 'go', dir: DIRS[ws[1]], raw };
    if (v === 'goto' || (v === 'go' && ws.length > 1)) return { verb: 'goto', target: ws.slice(1).filter(w => !ARTICLES.has(w)).join(' '), raw };
    if (v === 'say') return { verb: 'say', text: raw.replace(/^\s*(say|shout|yell|whisper|scream)\s*/i, '').replace(/^["“](.*)["”]$/, '$1'), raw };
    if (v === 'guide') return { verb: 'guide', topic: ws.slice(1).filter(w => !ARTICLES.has(w)).join(' '), raw };
    let verb = SYN[v];
    if (!verb) {
      // bare noun → examine; bare destination → go
      const dest = Object.keys(W.rooms[state.room].exits).find(k => { const to = W.rooms[state.room].exits[k]; const rid = typeof to === 'object' ? to.to : to; return k === v || (W.rooms[rid] && nameWords(W.rooms[rid].name).includes(v)); });
      if (dest) return { verb: 'go', dir: dest, raw };
      const it = resolve(ws.join(' '), scopeItems());
      if (it) return { verb: 'examine', item: it, raw };
      return { verb: null, word: v, raw };
    }
    const rest = ws.slice(1);
    const [n1, prep, n2] = splitPrep(rest);
    const pool = scopeItems();
    const cmd = { verb, prep, raw, n1: n1.join(' '), n2: n2.join(' ') };
    if (verb === 'ask' || verb === 'tell' || verb === 'talk') {
      let who = n1, topic = n2;
      if (!prep && n1.length > 1) { // "tell marvin follow"
        const npc = resolve(n1[0], pool.filter(i => i.npc)); if (npc) { who = [n1[0]]; topic = n1.slice(1); }
      }
      cmd.item = resolve(who.join(' '), pool); cmd.topic = topic.join(' '); cmd.n1 = who.join(' ');
      if (!cmd.item && n1.length) { cmd.topic = n1.join(' '); } // "talk about tea"
      return cmd;
    }
    if (n1.length) cmd.item = resolve(n1.join(' '), pool);
    if (n2.length) cmd.item2 = resolve(n2.join(' '), pool);
    if (!cmd.item && n1.length && !prep && (verb === 'give' || verb === 'feed')) { // "give barman coins"
      for (let i = 1; i < n1.length; i++) { const a = resolve(n1.slice(0, i).join(' '), pool), b = resolve(n1.slice(i).join(' '), pool); if (a && b) { cmd.item2 = a; cmd.item = b; cmd.prep = 'to'; break; } }
    }
    return cmd;
  };

  // ------------------------------------------------------------ verbs
  const META = new Set(['save', 'restore', 'restart', 'undo', 'score', 'help', 'hint', 'guide', 'again', 'inventory', 'look', 'examine']);
  const notHere = (phrase) => {
    const pw = words(phrase);
    const known = Object.values(W.items).some(it => it.names.some(n => { const nw = nameWords(n); return pw.every(w => nw.includes(w)) || nw.every(w => pw.includes(w)); }));
    return known ? `You can't see ${/^(ford|marvin|zaphod|trillian|prosser)$/i.test(phrase) ? cap(phrase) : 'any ' + phrase} here.` : `I don't know the word "${pw[pw.length - 1] || phrase}". Try <b>help</b>.`;
  };
  const topicOf = (npc, topic) => {
    const tw = words(norm(topic || '')).map(w => w.replace(/[?']/g, '').replace(/s$/, '')).filter(Boolean);
    const twFull = words(norm(topic || ''));
    const keys = Object.keys(npc.topics).filter(k => k !== 'default');
    const hits = []; [...twFull, ...tw].forEach(w => { keys.forEach(k => { if ((k === w || k === w + 's' || k.replace(/s$/, '') === w) && !hits.includes(k)) hits.push(k); }); });
    const outs = []; hits.forEach(k => { const t = npc.topics[k]; const r = typeof t === 'function' ? t(api) : t; if (r && !outs.includes(r)) outs.push(r); });
    if (outs.length) return outs.join('<br><br>');
    const d = npc.topics.default; return typeof d === 'function' ? d(api) : d;
  };
  const genericVerb = (verb, c) => {
    const it = c.item, it2 = c.item2; const r = W.rooms[state.room];
    const need = (msg) => it ? null : msg;
    switch (verb) {
      case 'look': return roomDesc();
      case 'examine': { if (!it) return c.n1 ? notHere(c.n1) : roomDesc(); const d = typeof it.desc === 'function' ? it.desc(api) : it.desc; return d || `You see nothing special about the ${short(it)}.`; }
      case 'inventory': { const inv = Object.keys(W.items).filter(id => state.items[id].loc === 'inv' && !W.items[id].scenery); if (!inv.length) return `You are carrying nothing${state.flags.fishIn ? ', unless you count the fish in your ear' : ''}.`; return `You are carrying: ${inv.map(id => art(short(W.items[id])) + (state.items[id].worn ? ' (worn)' : '')).join(', ')}.${state.flags.fishIn ? ' There is a Babel fish in your ear.' : ''}`; }
      case 'take': { if (!it) return c.n1 ? notHere(c.n1) : 'Take what?'; if (api.has(it.id)) return 'You already have that.'; if (it.npc) return it.on && it.on.hold ? it.on.hold(api, c) : `${cap(short(it))} would rather you didn't.`; if (it.scenery) return `That's not something you can carry.`; api.move(it.id, 'inv'); lastNoun = it.id; return 'Taken.'; }
      case 'drop': { if (!it) return 'Drop what?'; if (!api.has(it.id)) return "You don't have that."; if (it.scenery) return "You'd rather keep that attached."; api.move(it.id, state.room); return 'Dropped.'; }
      case 'leave': return it ? genericVerb('drop', c) : (doGo('out') || "There's no obvious way out from here.");
      case 'wear': { if (!it) return 'Wear what?'; if (!it.wearable) return it.id === 'towel' ? 'You wrap the towel round your shoulders for a moment. It is comforting, but it is not clothing, and you have standards. You take it off again.' : `You can't wear that.`; if (!api.has(it.id)) { api.move(it.id, 'inv'); } if (state.items[it.id].worn) return 'You are already wearing it.'; state.items[it.id].worn = true; return `You put on the ${short(it)}. You feel marginally more dressed, which on a day like this counts.`; }
      case 'remove': { if (!it) return 'Remove what?'; if (!state.items[it.id].worn) return "You're not wearing that."; state.items[it.id].worn = false; return `You take off the ${short(it)}.`; }
      case 'open': return it ? `The ${short(it)} doesn't open.` : 'Open what?';
      case 'close': return it ? `The ${short(it)} doesn't close.` : 'Close what?';
      case 'read': { if (!it) return 'Read what?'; if (it.id === 'me' ) return 'You are not a book. On a day like this, that is almost a disappointment.'; return `There's nothing written on the ${short(it)}.`; }
      case 'eat': return it ? (it.id === 'towel' ? 'You do not eat your towel. There are rules.' : it.id === 'peanuts' ? 'You eat a peanut.' : `You can't eat the ${short(it)}.`) : 'Eat what?';
      case 'drink': return it ? `You can't drink the ${short(it)}.` : (state.room === 'pub' ? genericVerb('drink', { item: W.items.beer }) : 'Drink what?');
      case 'use': { if (!it) return 'Use what?'; if (it2 && it2.on && it2.on.receive) return it2.on.receive(api, { item: it }); if (it.id === 'towel' && it2 && it2.id === 'drain') return W.items.towel.on.putOn(api, { item2: it2 }); return `You can't think how to use the ${short(it)}${it2 ? ' on the ' + short(it2) : ''}. Try something more specific.`; }
      case 'put': { if (!it) return c.n1 ? notHere(c.n1) : 'Put what?'; if (!it2) return c.n2 ? notHere(c.n2) : `Put the ${short(it)} where?`; if (!api.has(it.id) && !it.scenery) return `You'd need to be holding the ${short(it)}.`; const h = (c.prep === 'in' || c.prep === 'into' || c.prep === 'inside') ? ['putIn', 'putOn'] : ['putOn', 'putIn']; for (const k of h) if (it.on && it.on[k]) { const res = it.on[k](api, c); if (res) return res; } if (it2.on && it2.on.receive) return it2.on.receive(api, { item: it }); if (it2.npc) return genericVerb('give', c); return `The ${short(it)} doesn't go there.`; }
      case 'cover': { if (!it) return 'Cover what?'; if (it.on && it.on.cover) return it.on.cover(api, c); if (it2) return genericVerb('put', { item: it2, item2: it, prep: 'on' }); return `Cover the ${short(it)} with what?`; }
      case 'feed': { if (!it) return 'Feed what?'; const food = api.has('peanuts') ? W.items.peanuts : null; if (!food) return 'You have nothing to feed it with.'; if (it.on && it.on.receive) return it.on.receive(api, { item: food }); return `The ${short(it)} does not eat.`; }
      case 'give': { if (!it) return c.n1 ? notHere(c.n1) : 'Give what?'; if (!it2) return c.n2 ? notHere(c.n2) : `Give the ${short(it)} to whom?`; if (!api.has(it.id)) return `You don't have the ${short(it)}.`; if (!it2.npc) return `The ${short(it2)} has no use for it.`; if (it2.on && it2.on.give) { const res = it2.on.give(api, { item: it }); if (res) return res; } return `${cap(short(it2))} doesn't want the ${short(it)}.`; }
      case 'talk': case 'ask': case 'tell': { if (!it) { if (c.topic && !c.n1) { const npc = scopeItems().find(i => i.npc && !i.scenery && i.id !== 'me'); if (npc) return topicOf(npc, c.topic); } return c.n1 ? notHere(c.n1) : 'Talk to whom?'; } if (!it.npc) return it.id === 'me' ? 'You talk to yourself. You agree with most of it.' : `The ${short(it)} is not much of a conversationalist.`; return topicOf(it, c.topic || (verb === 'talk' ? '' : c.n2)); }
      case 'say': { const npc = scopeItems().find(i => i.npc && !i.scenery); if (npc && c.text) { const r = topicOf(npc, c.text); if (r) return r; } return `You say "${c.text}". ${npc ? `${cap(short(npc))} nods, as at a man who has said something.` : 'Nobody is listening. The universe, in general, is not.'}`; }
      case 'answer': return (W.items.phone && state.items.phone.loc === state.room) ? W.items.phone.on.answer(api) : 'Nobody has asked you anything. Yet.';
      case 'push': case 'pull': case 'turn': case 'turnon': case 'turnoff': return it ? `Nothing happens when you ${verb.replace('turnon', 'switch on').replace('turnoff', 'switch off')} the ${short(it)}.` : `${cap(verb)} what?`;
      case 'engage': return state.room === 'hog_bridge' ? api.event('engageDrive') : (it ? `You can't engage the ${short(it)}.` : 'Engage what?');
      case 'attack': return it ? (it.npc ? `Violence is not the answer. The answer, as you will learn, is a number.` : `Hitting the ${short(it)} achieves nothing, but it does feel like a plan.`) : 'Attack what?';
      case 'search': return it ? `You find nothing in or about the ${short(it)} that you didn't already know.` : roomDesc();
      case 'smell': return it ? `The ${short(it)} smells about how you'd expect.` : (state.room === 'vogon_hold' ? 'Vegetable. Old vegetable. Vegetable with regrets.' : 'You smell nothing unusual.');
      case 'listen': return state.room === 'hall' && !state.flags.phoneAnswered ? 'The telephone is ringing. It has your number, in every sense.' : state.room.startsWith('hog') ? 'The ship hums happily to itself. Somewhere, a door says "Thank you!"' : 'You hear nothing that helps.';
      case 'touch': case 'taste': return it ? `You ${verb} the ${short(it)}. It is as advertised.` : `${cap(verb)} what?`;
      case 'enter': { if (it) { if (it.on && it.on.enter) return it.on.enter(api, c); return `You can't get into the ${short(it)}.`; } return doGo('in') || "There's nothing here to enter."; }
      case 'exit': return doGo('out') || (state.room === 'vogon_bridge' ? 'You are strapped in. Leaving is not currently on the menu, though it will be.' : "There's no obvious way out.");
      case 'follow': { if (!it) return 'Follow whom?'; if (it.on && it.on.follow) return it.on.follow(api, c); return `${cap(short(it))} isn't going anywhere.`; }
      case 'hold': { if (r.verbs && r.verbs.hold) { const res = r.verbs.hold(api); if (res) return res; } if (!it) return 'Hold what?'; if (it.on && it.on.hold) return it.on.hold(api, c); return `You hold the ${short(it)}. It is held.`; }
      case 'hitch': return 'You stick out your thumb. Nothing stops. Ford would say you need the electronic kind.';
      case 'lie': return state.room === 'bedroom' ? W.items.bed.on.enter(api) : 'You lie down on the floor. It is a floor. You get up again.';
      case 'sit': return 'You sit for a moment. Nothing improves, but nothing gets worse, which is a kind of record for today.';
      case 'stand': return 'You are standing. It is one of the few things going right.';
      case 'sleep': return state.room === 'bedroom' ? W.items.bed.on.sleep(api) : 'Not here. Not now. Possibly not ever again, the way things are going.';
      case 'wake': return 'You are awake. You have checked. Repeatedly.';
      case 'wait': return api.pick(['Time passes.', 'You wait. The universe does something elsewhere.', 'Nothing happens, in the particular way that something is about to.']);
      case 'run': return state.room === 'airlock' ? 'There is nowhere to run that is not space.' : 'You run on the spot for a bit. It helps with nothing but the panic.';
      case 'buy': return it && it.on && it.on.buy ? it.on.buy(api, c) : "This isn't a shop. Well, the pub is, in a way.";
      case 'kiss': return it ? (it.npc ? `${cap(short(it))} steps back politely.` : `You kiss the ${short(it)}. It does not improve.`) : 'Kiss whom?';
      case 'dance': return 'You dance. Badly. Ford, if present, pretends not to know you.';
      case 'sing': return 'You sing. Somewhere a Vogon takes notes.';
      case 'jump': return 'You jump. You come down. Gravity, at least, is still working.';
      case 'swim': return 'There is nothing to swim in, which is one of the few things going right.';
      case 'pray': return 'You pray. The answer, when it comes, will be forty-two.';
      case 'panic': return "You panic. It doesn't help, but it is traditional. The Guide's advice on the matter is printed on the cover.";
      case 'think': return 'You think about it. Thinking, you reflect, has got you exactly here.';
      case 'xyzzy': return 'A hollow voice says: "Wrong franchise."';
      case 'yes': return "That's the spirit.";
      case 'no': return 'Fair enough.';
      case 'sorry': return 'Apology noted. The universe does not accept it, but it has noted it.';
      case 'thanks': return "You're welcome. It's the least the universe can do, and it is doing the least.";
      case 'shake': return it && it.npc ? `You shake hands with ${short(it)}. Nothing is agreed.` : 'You shake. Nothing falls out.';
      case 'count': return state.room === 'airlock' ? 'One. Two. Three... you intend to get to twenty-nine.' : 'You count to ten. Nothing has improved by ten.';
      case 'breathe': return state.room === 'airlock' ? 'You take the biggest breath of your life and hold it.' : 'In. Out. Better.';
      case 'dig': return 'You dig a little. The ground is unmoved, emotionally.';
      case 'cry': return 'You have a little cry. Nobody minds. It is that kind of day.';
      case 'laugh': return 'You laugh. It comes out oddly.';
      case 'fly': return 'You cannot fly. The trick, you have heard, is to throw yourself at the ground and miss. You decide not to practise.';
      case 'stop': return 'Everything carries on regardless.';
      case 'light': return 'There is light enough.';
      default: return it ? `You can't ${verb} the ${short(it)}.` : `I understood "${verb}", but not what you want to ${verb}.`;
    }
  };

  const execute = (raw) => {
    if (locked || !state || state.dead || state.ended) return;
    raw = raw.trim(); if (!raw) return;
    out(`<span class="prompt">&gt;</span> ${escapeHtml(raw)}`, 'cmd');
    if (raw.toLowerCase() === 'again' || raw.toLowerCase() === 'g') { if (lastCmd) raw = lastCmd; else { out('Again what?'); return; } }
    // pending question handlers
    if (state.pending && W.pendings[state.pending]) {
      const low = norm(raw).split(' ')[0];
      const passThrough = new Set(['wait', 'look', 'examine', 'inventory', 'talk', 'ask', 'tell', 'hint', 'help', 'guide', 'save', 'restore', 'undo', 'score', 'restart', 'again']);
      const isSay = /^(say|shout|yell|whisper|answer|reply)\b/i.test(raw);
      const nWords = norm(raw).split(' ').filter(Boolean).length;
      const pt = passThrough.has(SYN[low]) && (nWords <= 2 || ['talk', 'ask', 'tell', 'guide', 'examine', 'look', 'hint', 'help'].includes(SYN[low])) && !(low === 'i' && nWords > 1);
      if (isSay || !pt) { undoSnap = JSON.stringify(state); const text = isSay ? raw.replace(/^\s*\w+\s*/, '').replace(/^["“](.*)["”]$/, '$1') : raw; const consumed = W.pendings[state.pending](api, text); if (consumed) { endTurn(); return; } }
    }
    const cmd = parse(raw);
    if (!cmd) return;
    if (state.pending === 'poetry' && SYN[norm(raw).split(' ')[0]] === 'wait') { out('"Well?" says the Vogon, with a patience that is visibly finite.'); return; }
    lastCmd = raw;
    if (cmd.verb === null) { out(notHere(cmd.word)); Sound.err(); return; }
    // meta
    if (cmd.verb === 'save') return saveGame();
    if (cmd.verb === 'restore') return restoreGame();
    if (cmd.verb === 'restart') return showTitle(true);
    if (cmd.verb === 'undo') return undo();
    if (cmd.verb === 'score') return out(`You have scored <b>${state.score}</b> out of a possible ${W.maxScore}, in ${state.turn} turns. ${state.score === 42 ? 'That is the Answer.' : ''}`);
    if (cmd.verb === 'help') return out(helpText());
    if (cmd.verb === 'hint') return out(`<span class="hint">${W.hint(api)}</span>`);
    if (cmd.verb === 'guide') return openGuide(cmd.topic);
    if (cmd.verb === 'look' || cmd.verb === 'examine' || cmd.verb === 'inventory') { api.ctx = cmd; const res = runVerb(cmd); if (res) out(res); refresh(); return; }
    undoSnap = JSON.stringify(state);
    api.ctx = cmd;
    const res = runVerb(cmd);
    if (typeof res === 'string') out(res);
    else if (res === false || res === undefined) { out(`You can't do that here.`); Sound.err(); }
    if (cmd.item) lastNoun = cmd.item.id;
    endTurn();
  };
  const runVerb = (cmd) => {
    const r = W.rooms[state.room];
    if (cmd.verb === 'go') { const res = doGo(cmd.dir); if (res === false) return cmd.dir === 'in' || cmd.dir === 'out' ? "You can't go that way." : `You can't go ${cmd.dir} from here.`; return res; }
    if (cmd.verb === 'goto') { const t = cmd.target; const dir = Object.keys(r.exits).find(k => { const to = r.exits[k]; const rid = typeof to === 'object' ? to.to : to; return k === t || (W.rooms[rid] && (nameWords(W.rooms[rid].name).some(w => t.includes(w)) || rid.includes(t))); }); if (dir) return doGo(dir); const it = resolve(t, scopeItems()); if (it) return it.on && it.on.enter ? it.on.enter(api, cmd) : `You walk over to the ${short(it)}. There. You are at the ${short(it)}.`; return `You can't get to "${t}" from here. Exits: ${Object.keys(r.exits).join(', ')}.`; }
    if (r.verbs && r.verbs[cmd.verb]) { const res = r.verbs[cmd.verb](api, cmd); if (res) return res; }
    if (cmd.item && cmd.item.on && cmd.item.on[cmd.verb]) {
      const res = cmd.item.on[cmd.verb](api, cmd);
      // a custom take handler supplies the prose; the engine still moves the thing into your hands
      if (res && cmd.verb === 'take' && !cmd.item.npc && !cmd.item.scenery && state.items[cmd.item.id].loc === state.room) api.move(cmd.item.id, 'inv');
      if (res) return res;
    }
    if (cmd.item2 && cmd.item2.on && cmd.item2.on.receive && (cmd.verb === 'put' || cmd.verb === 'give') && cmd.item && !api.has(cmd.item.id) && !cmd.item.scenery) return `You'd need to be holding the ${short(cmd.item)}.`;
    return genericVerb(cmd.verb, cmd);
  };
  const endTurn = () => {
    if (state.dead || state.ended) { refresh(); autosave(); return; }
    state.turn++;
    const r = W.rooms[state.room]; if (r.tick) r.tick(api);
    let guard = 0;
    while (guard++ < 20) { const due = state.scheduled.filter(e => e.at <= state.turn); if (!due.length) break; state.scheduled = state.scheduled.filter(e => e.at > state.turn); due.forEach(e => W.events[e.name] && W.events[e.name](api)); }
    if (!state.dead && !state.ended) W.daemons.forEach(d => d(api));
    refresh(); autosave();
  };
  const undo = () => { if (!undoSnap) return out("There's nothing to undo."); state = JSON.parse(undoSnap); undoSnap = null; state.dead = false; hideOverlay('#death'); out('<i>Undone. The universe quietly pretends that never happened.</i>'); refresh(); autosave(); };
  const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const helpText = () => `<b>How to play.</b> Type what you'd like to do, in plain English. Useful commands:<br>
    <b>look</b>, <b>examine</b> <i>thing</i>, <b>take</b>/<b>drop</b> <i>thing</i>, <b>inventory</b> (or <b>i</b>), <b>wear</b> <i>thing</i><br>
    <b>north/south/east/west</b> (or n/s/e/w), <b>in</b>, <b>out</b>, <b>up</b>, <b>down</b>, <b>forward</b>, <b>aft</b>, <b>go to</b> <i>place</i><br>
    <b>talk to</b> <i>person</i>, <b>ask</b> <i>person</i> <b>about</b> <i>topic</i>, <b>tell</b> <i>person</i> <b>about</b> <i>topic</i>, or <i>person</i><b>,</b> <i>do something</i><br>
    <b>put</b> <i>thing</i> <b>in/on</b> <i>thing</i>, <b>give</b> <i>thing</i> <b>to</b> <i>person</i>, <b>use</b>, <b>open</b>, <b>push</b>, <b>drink</b>, <b>eat</b>, <b>read</b>, <b>lie down</b>, <b>wait</b> (or <b>z</b>)<br>
    <b>guide</b> <i>topic</i> opens the Guide. <b>hint</b> (or the DON'T PANIC button) nudges you. <b>save</b>, <b>restore</b>, <b>undo</b>, <b>restart</b>, <b>score</b>.<br>
    Click any <span class="noun demo">underlined</span> thing for a menu. Your game also saves itself after every move.`;

  // ------------------------------------------------------------ UI
  const refresh = () => {
    if (!state) return;
    const r = W.rooms[state.room];
    $('#locname').textContent = r.name; $('#region').textContent = r.region;
    $('#score').textContent = `${state.score} / ${W.maxScore}`; $('#turns').textContent = state.turn;
    const sceneId = state.dead ? 'dead' : (typeof r.scene === 'function' ? r.scene(api) : r.scene);
    const layers = (!state.dead && r.layers) ? r.layers(api) : [];
    const key = sceneId + '|' + layers.join(',');
    if (key !== sceneKey) { const still = sceneKey.split('|')[0] === sceneId; sceneKey = key; $('#scene').innerHTML = SC.render(sceneId, layers, still); }
    // exits
    const ex = $('#exits'); ex.innerHTML = '';
    Object.keys(r.exits).forEach(k => { const b = document.createElement('button'); b.className = 'chip exit'; b.textContent = k; b.onclick = () => execute(k === 'in' || k === 'out' || k === 'up' || k === 'down' || DIRS[k] ? k : 'go ' + k); ex.appendChild(b); });
    if (!Object.keys(r.exits).length) ex.innerHTML = '<span class="muted">none, for now</span>';
    // here
    const here = $('#here'); here.innerHTML = '';
    Object.keys(W.items).forEach(id => { const it = W.items[id]; if (state.items[id].loc !== state.room || it.scenery) return; here.appendChild(chip(it)); });
    if (!here.children.length) here.innerHTML = '<span class="muted">nothing portable</span>';
    const inv = $('#inv'); inv.innerHTML = '';
    Object.keys(W.items).forEach(id => { const it = W.items[id]; if (state.items[id].loc !== 'inv' || it.scenery) return; inv.appendChild(chip(it, true)); });
    if (state.flags.fishIn) { const c = document.createElement('span'); c.className = 'chip soft'; c.textContent = 'Babel fish (in ear)'; inv.appendChild(c); }
    if (!inv.children.length) inv.innerHTML = '<span class="muted">empty-handed</span>';
    $('#dp').classList.toggle('pulse', !!(state.flags.missiles || state.flags.inspector));
  };
  const chip = (it, held) => { const b = document.createElement('button'); b.className = 'chip' + (it.npc ? ' npc' : '') + (held && state.items[it.id].worn ? ' worn' : ''); b.textContent = it.npc ? cap(short(it)) : short(it); b.onclick = (e) => popover(it, e.currentTarget); return b; };
  const popover = (it, anchor) => {
    const pop = $('#pop'); pop.innerHTML = ''; const name = it.names[0];
    const add = (label, cmd) => { const b = document.createElement('button'); b.textContent = label; b.onclick = () => { closePop(); execute(cmd); }; pop.appendChild(b); };
    add('Examine', `examine ${name}`);
    if (it.npc) { add('Talk to', `talk to ${name}`); if (it.id === 'ford') add('Hold on to', `hold ford`); if (it.id === 'marvin') add('Ask to follow', `marvin, follow me`); if (it.id === 'mice') add('Offer a question', `ask mice about a question`); if (it.id === 'nutrimatic') add('Press DRINK', 'push drink button'); if (it.id === 'slarti') add('Ask about mice', 'ask old man about mice'); }
    else if (api.has(it.id)) { add('Drop', `drop ${name}`); if (it.wearable) add(state.items[it.id].worn ? 'Take off' : 'Wear', `${state.items[it.id].worn ? 'remove' : 'wear'} ${name}`); if (it.on && (it.on.read)) add('Read', `read ${name}`); if (it.on && it.on.drink) add('Drink', `drink ${name}`); if (it.on && it.on.eat) add('Eat', `eat ${name}`); if (it.id === 'towel' && state.room === 'vogon_hold') add('Put on drain', 'put towel on drain'); if (it.id === 'peanuts' && state.room === 'vogon_hold') add('Put in slot', 'put peanuts in slot'); if (it.id === 'fish') add('Put in ear', 'put fish in ear'); if (it.id === 'tea' && state.room === 'hog_bridge') add('Put in socket', 'put tea in socket'); }
    else { if (!it.scenery) add('Take', `take ${name}`); if (it.on && it.on.drink) add('Drink', `drink ${name}`); if (it.on && it.on.push) add('Press', `push ${name}`); if (it.on && it.on.enter) add('Enter', `enter ${name}`); if (it.on && it.on.answer) add('Answer', `answer ${name}`); if (it.on && it.on.read) add('Read', `read ${name}`); if (it.on && it.on.open) add('Open', `open ${name}`); if (it.id === 'bulldozer') add('Lie in front of', 'lie down in front of bulldozer'); if (it.on && it.on.buy) add('Buy', `buy ${name}`); if (it.id === 'console' || it.id === 'button') add('Engage drive', 'engage drive'); }
    const g = GD.find(name) || GD.find(it.id); if (g) add('Look up in Guide', `guide ${g.title}`);
    const rect = anchor.getBoundingClientRect(); pop.style.left = Math.min(window.innerWidth - 190, rect.left) + 'px'; pop.style.top = (rect.bottom + 6) + 'px'; pop.classList.remove('hidden');
    setTimeout(() => document.addEventListener('click', closePopOnce, { once: true }), 0);
  };
  const closePop = () => $('#pop').classList.add('hidden');
  const closePopOnce = (e) => { if (!$('#pop').contains(e.target)) closePop(); else setTimeout(() => document.addEventListener('click', closePopOnce, { once: true }), 0); };

  const improbability = (cb) => {
    locked = true; const app = $('#app'); app.classList.add('improb'); Sound.whoosh(); Stars.boost();
    const ov = $('#improb'); const phrases = ['INFINITE IMPROBABILITY DRIVE ENGAGED', 'you are briefly a sofa', 'normality will resume shortly', 'an infinite number of monkeys would like a word', 'you are a penguin. no, wait.', 'probability: 1 in 2 to the power of 276,709', 'please remain seated during your transformation', 'DON\'T PANIC', 'the ship is now a whale. the whale is now the ship.', 'reality is loading…'];
    ov.classList.remove('hidden'); let i = 0; const el = ov.querySelector('span');
    const iv = setInterval(() => { el.textContent = phrases[Math.floor(Math.random() * phrases.length)]; el.style.transform = `skew(${(Math.random() - .5) * 20}deg) scale(${.9 + Math.random() * .3})`; if (++i > 12) clearInterval(iv); }, 160);
    setTimeout(() => { clearInterval(iv); ov.classList.add('hidden'); app.classList.remove('improb'); locked = false; try { cb(); } finally { refresh(); autosave(); } }, 2300);
  };

  const showDeath = () => { refresh(); $('#death .final').innerHTML = `Score: <b>${state.score}</b> / ${W.maxScore} in ${state.turn} turns.`; $('#death').classList.remove('hidden'); Sound.err(); };
  const showEnd = () => { refresh(); $('#end .final').innerHTML = `You scored <b>${state.score}</b> out of ${W.maxScore} in ${state.turn} turns.${state.score === 42 ? ' Forty-two. Of course it was.' : ' There are more points in there; the Guide suggests a second attempt and a stiff drink.'}`; setTimeout(() => $('#end').classList.remove('hidden'), 1200); };
  const hideOverlay = (q) => $(q).classList.add('hidden');

  // guide
  const openGuide = (topic) => {
    const g = $('#guide'); g.classList.remove('hidden');
    const list = $('#gindex'); list.innerHTML = '';
    GD.entries.forEach(e => { const b = document.createElement('button'); b.textContent = e.title; b.onclick = () => showEntry(e); list.appendChild(b); });
    if (topic) { const e = GD.find(topic); if (e) showEntry(e); else showEntry({ title: cap(topic), icon: '', text: `The Guide has no entry on <i>${escapeHtml(topic)}</i>. It suggests you write one, and offers no payment. Related entries may exist under other names; browse the index.` }); }
    else showEntry({ title: 'The Hitchhiker\'s Guide to the Galaxy', icon: GD.entries[0].icon, text: `<b>DON'T PANIC.</b><br><br>Select an entry from the index, or type <b>guide</b> <i>topic</i> at any time. In the field, say <b>look up</b> <i>thing</i>, or just ask <b>what is</b> <i>thing</i>.` });
    Sound.blip();
  };
  let typer = null;
  const showEntry = (e) => {
    $('#gicon').innerHTML = e.icon || ''; $('#gtitle').textContent = e.title;
    const body = $('#gbody'); const text = typeof e.text === 'function' ? e.text(api) : e.text;
    if (typer) clearInterval(typer);
    // typewriter over HTML: reveal by tokens
    const tokens = text.split(/(<[^>]+>|\s+)/).filter(t => t !== ''); let i = 0; body.innerHTML = ''; body.classList.add('typing');
    typer = setInterval(() => { let n = 3; while (n-- && i < tokens.length) body.innerHTML += tokens[i++]; if (i >= tokens.length) { clearInterval(typer); typer = null; body.classList.remove('typing'); } }, 18);
    [...$('#gindex').children].forEach(b => b.classList.toggle('active', b.textContent === e.title));
  };
  const closeGuide = () => { $('#guide').classList.add('hidden'); if (typer) { clearInterval(typer); typer = null; $('#gbody').classList.remove('typing'); } $('#cmd').focus(); };

  // save/restore
  const saveGame = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); out('<i>Saved. The Guide notes that this is the single most sensible thing you have done today.</i>'); } catch (e) { out('<i>Saving failed. Your browser is being unhelpful about storage.</i>'); } };
  const restoreGame = () => { let s = null; try { s = localStorage.getItem(SAVE_KEY); } catch (e) { } if (!s) return out('<i>No saved game found. Type <b>save</b> at any point to make one.</i>'); loadState(JSON.parse(s)); out('<i>Restored.</i>'); refresh(); };
  const autosave = () => { try { localStorage.setItem(AUTO_KEY, JSON.stringify(state)); } catch (e) { } };
  const loadState = (s) => { state = s; hideOverlay('#death'); hideOverlay('#end'); const log = $('#log'); log.innerHTML = ''; const saved = state.log.slice(); state.log = []; saved.forEach(([cls, html]) => { const p = document.createElement('div'); p.className = 'line ' + cls; p.innerHTML = html; log.appendChild(p); state.log.push([cls, html]); }); log.scrollTop = log.scrollHeight; sceneKey = ''; refresh(); };

  const newGame = () => {
    state = freshState(); undoSnap = null; sceneKey = ''; $('#log').innerHTML = ''; hideOverlay('#death'); hideOverlay('#end'); hideOverlay('#title');
    out('<div class="h1">DON\'T PANIC</div><div class="sub">An unofficial text adventure in the spirit of The Hitchhiker\'s Guide to the Galaxy</div>');
    W.intro.forEach(p => out(p));
    gotoRoom(W.start); refresh(); autosave(); $('#cmd').focus();
  };
  const showTitle = (fromRestart) => {
    const t = $('#title'); t.classList.remove('hidden'); let auto = null; try { auto = localStorage.getItem(AUTO_KEY); } catch (e) { }
    $('#btn-continue').classList.toggle('hidden', !auto || fromRestart); $('#title .scene-wrap').innerHTML = SC.render('title');
    if (fromRestart) out('<i>Restarting. The universe resets, which it does more often than you would think.</i>');
  };
  const continueGame = () => { let auto = null; try { auto = localStorage.getItem(AUTO_KEY); } catch (e) { } if (!auto) return newGame(); loadState(JSON.parse(auto)); hideOverlay('#title'); out('<i>Welcome back. Your towel is where you left it.</i>'); refresh(); $('#cmd').focus(); };

  // ------------------------------------------------------------ sound
  const Sound = (() => {
    let ctx = null, on = false; try { on = localStorage.getItem(SND_KEY) === '1'; } catch (e) { }
    const ac = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; };
    const tone = (f1, f2, dur, type = 'sine', vol = .05) => { if (!on) return; try { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f1, c.currentTime); o.frequency.exponentialRampToValueAtTime(f2, c.currentTime + dur); g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + dur); o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur); } catch (e) { } };
    return { blip: () => tone(880, 440, .06), ding: () => { tone(660, 990, .18); setTimeout(() => tone(990, 1320, .25), 120); }, err: () => tone(220, 110, .25, 'square', .03), whoosh: () => { tone(80, 1600, 1.6, 'sawtooth', .04); setTimeout(() => tone(1600, 60, .7, 'triangle', .04), 1500); },
      toggle: () => { on = !on; try { localStorage.setItem(SND_KEY, on ? '1' : '0'); } catch (e) { } if (on) { tone(440, 880, .1); } return on; }, get on() { return on; } };
  })();

  // ------------------------------------------------------------ stars
  const Stars = (() => {
    const cv = $('#stars'); const cx = cv.getContext('2d'); let stars = [], speed = .15, boost = 0;
    const resize = () => { cv.width = innerWidth; cv.height = innerHeight; stars = Array.from({ length: 160 }, () => ({ x: Math.random() * cv.width, y: Math.random() * cv.height, z: Math.random() * 1 + .2 })); };
    const tick = () => { cx.clearRect(0, 0, cv.width, cv.height); const sp = speed + boost; stars.forEach(s => { s.x -= sp * s.z * (1 + boost * 4); if (s.x < 0) { s.x = cv.width; s.y = Math.random() * cv.height; } cx.fillStyle = `rgba(190,240,255,${.25 + s.z * .5})`; cx.fillRect(s.x, s.y, boost > .2 ? 2 + boost * 30 : 1.2, 1.2); }); if (boost > 0) boost *= .97; if (boost < .01) boost = 0; requestAnimationFrame(tick); };
    addEventListener('resize', resize); resize(); tick();
    return { boost: () => { boost = 6; } };
  })();

  // ------------------------------------------------------------ wiring
  document.addEventListener('DOMContentLoaded', () => {
    const inp = $('#cmd');
    $('#cmdform').addEventListener('submit', (e) => { e.preventDefault(); const v = inp.value; inp.value = ''; if (v.trim()) { history.push(v); histIdx = history.length; } execute(v); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'ArrowUp') { if (histIdx > 0) { histIdx--; inp.value = history[histIdx]; e.preventDefault(); } } else if (e.key === 'ArrowDown') { if (histIdx < history.length - 1) { histIdx++; inp.value = history[histIdx]; } else { histIdx = history.length; inp.value = ''; } e.preventDefault(); } });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeGuide(); closePop(); } });
    $('#log').addEventListener('click', (e) => { const n = e.target.closest('.noun'); if (n && W.items[n.dataset.id]) { e.stopPropagation(); popover(W.items[n.dataset.id], n); } });
    $('#btn-guide').onclick = () => openGuide(); $('#gclose').onclick = closeGuide; $('#guide').addEventListener('click', (e) => { if (e.target.id === 'guide') closeGuide(); });
    $('#dp').onclick = () => execute('hint');
    $('#btn-save').onclick = () => execute('save'); $('#btn-restore').onclick = () => execute('restore'); $('#btn-restart').onclick = () => showTitle(true);
    const sb = $('#btn-sound'); sb.textContent = Sound.on ? 'Sound: on' : 'Sound: off'; sb.onclick = () => { sb.textContent = Sound.toggle() ? 'Sound: on' : 'Sound: off'; };
    $('#btn-new').onclick = newGame; $('#btn-continue').onclick = continueGame;
    $('#btn-about').onclick = () => { $('#about').classList.toggle('hidden'); };
    document.querySelectorAll('[data-cmd]').forEach(b => b.addEventListener('click', () => execute(b.dataset.cmd)));
    document.querySelectorAll('.death-undo').forEach(b => b.onclick = () => { hideOverlay('#death'); undo(); });
    document.querySelectorAll('.ov-restore').forEach(b => b.onclick = () => { hideOverlay('#death'); hideOverlay('#end'); if (!state) state = freshState(); restoreGame(); });
    document.querySelectorAll('.ov-restart').forEach(b => b.onclick = () => { hideOverlay('#death'); hideOverlay('#end'); newGame(); });
    document.querySelectorAll('.ov-title').forEach(b => b.onclick = () => { hideOverlay('#death'); hideOverlay('#end'); showTitle(true); });
    $('#scene').innerHTML = SC.render('title');
    showTitle(false);
    // test hook
    window.game = { run: execute, parse, get state() { return state; }, newGame, api, continueGame };
  });
})();
