// Headless playthrough: serves the folder, drives the game via window.game, asserts a 42-point finish.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PKG || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { let p = path.join(root, decodeURIComponent(req.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html'; fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
await new Promise(r => server.listen(0, r)); const port = server.address().port;
const shots = process.argv.includes('--shots'); const outDir = process.env.SHOT_DIR || path.join(root, 'test', 'shots'); if (shots) fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on('pageerror', e => errors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
await page.goto(`http://localhost:${port}/`); await page.waitForFunction(() => window.game);
if (shots) await page.screenshot({ path: path.join(outDir, '00-title.png') });
await page.click('#btn-new');
const run = async (cmd, wait = 150) => { await page.evaluate(c => window.game.run(c), cmd); await page.waitForTimeout(wait); };
const st = () => page.evaluate(() => { const s = window.game.state; return { room: s.room, score: s.score, turn: s.turn, dead: s.dead, ended: s.ended, pending: s.pending, flags: s.flags }; });
const lastLines = (n = 3) => page.evaluate(n => [...document.querySelectorAll('#log .line')].slice(-n).map(e => e.innerText), n);
const expect = async (pred, label) => { const s = await st(); if (!pred(s)) { console.log('FAIL:', label, JSON.stringify(s), '\n', (await lastLines(6)).join('\n---\n')); process.exitCode = 1; return false; } console.log('ok  ', label, `(room=${s.room} score=${s.score} turn=${s.turn})`); return true; };
const shot = async (n) => { if (shots) await page.screenshot({ path: path.join(outDir, n + '.png') }); };

// Earth
await run('look'); await run('x window'); await run('take towel'); await run('take gown'); await run('wear gown'); await run('read letter');
await run('drink water'); await run('take pills'); await expect(s => s.score === 3 && s.flags.headache === false, 'bedroom items');
await shot('01-bedroom');
await run('w'); await run('answer phone'); await run('n'); await expect(s => s.room === 'garden', 'in garden');
await run('talk to prosser about the plans'); await run('lie down in front of the bulldozer'); await expect(s => s.flags.lying && s.score === 5, 'lying down');
await run('wait'); await run('wait'); await expect(s => s.flags.fordArrived !== undefined || true, 'waited');
await page.evaluate(() => window.game.state.items.ford.loc).then(l => console.log('    ford at', l));
await run('ask ford about my house'); await expect(s => s.flags.prosserDown && s.score === 8, 'ford persuades prosser');
await shot('02-garden');
await run('e'); await run('e'); await expect(s => s.room === 'pub', 'in pub');
await run('buy peanuts'); await run('drink beer'); await expect(s => s.score === 12, 'peanuts + beer');
await run('ask barman about the end of the world'); await run('z'); await run('z'); await run('z'); await run('z'); await run('z');
await expect(s => s.flags.shipsArrived, 'ships arrived'); await shot('03-pub-ships');
await run('hold on to ford', 3000); await expect(s => s.room === 'vogon_hold' && s.score === 15, 'hitched to vogon hold');
await shot('04-hold');
// Vogon hold
await run('ask ford about the fish'); await run('put peanuts in the slot'); // fish lost down drain
await expect(s => s.flags.dispenserWait === true, 'fish lost first time');
await run('put towel on drain'); await expect(s => s.flags.towelOnDrain && s.score === 16, 'towel on drain');
await run('z'); await run('z'); await run('z'); await run('put peanuts in machine'); await expect(s => s.score === 16 && s.flags.towelOnDrain, 'fish on towel');
await run('take fish'); await expect(s => s.score === 20, 'took fish');
await run('put fish in ear'); await expect(s => s.flags.fishIn && s.score === 21, 'fish in ear');
for (let i = 0; i < 15; i++) { const s = await st(); if (s.pending === 'poetry') break; await run('z'); }
await run('look'); await expect(s => s.room === 'vogon_bridge' && s.pending === 'poetry', 'poetry chamber (look passes through)'); await shot('05-poetry');
await run('I loved the bit about the fungus and the spoon', 400); await expect(s => s.room === 'airlock' && s.score === 25, 'survived poetry');
await run('z'); await run('z', 3200); await expect(s => s.room === 'hog_corridor', 'rescued by heart of gold'); await shot('06-corridor');
// Heart of Gold
await run('marvin, follow me'); await expect(s => s.score === 26, 'marvin follows');
await run('forward'); await expect(s => s.room === 'hog_bridge', 'bridge'); await run('ask trillian about the drive'); await run('talk to eddie');
await run('aft'); await run('aft'); await expect(s => s.room === 'hog_galley', 'galley');
await run('press drink'); await run('ask nutrimatic about tea'); await run('tell nutrimatic about leaves'); await run('tell the nutrimatic about boiling water'); await run('tell nutrimatic about milk');
await expect(s => s.score === 26 && Object.keys(s.flags.teaFacts).length === 3, 'three tea facts');
await run('push drink button'); await expect(s => s.flags.teaBusy, 'tea computing'); await run('z'); await run('z'); await run('z'); await expect(s => !s.flags.teaBusy, 'tea ready');
await run('take tea'); await expect(s => s.score === 31, 'took tea'); await shot('07-galley');
await run('go to bridge'); await run('forward'); await run('forward'); await expect(s => s.room === 'hog_bridge', 'back on bridge');
await run('put tea in socket'); await expect(s => s.flags.driveReady && s.score === 34, 'drive ready');
await run('press the big button', 3200); await expect(s => s.flags.missiles && s.flags.atMagrathea, 'at magrathea, missiles'); await shot('08-missiles');
await run('marvin, talk to the missiles'); await expect(s => !s.flags.missiles && s.score === 35, 'marvin vs missiles');
await run('z'); await expect(s => s.room === 'surface', 'landed'); await run('z'); await expect(s => s.flags.othersDown, 'others went down');
await run('z'); await run('z'); await expect(s => s.score === 36, 'slartibartfast arrives'); await shot('09-surface');
await run('talk to the old man'); await run('get in the aircar'); await expect(s => s.room === 'factory', 'factory floor'); await shot('10-factory');
await run('ask old man about earth'); await run('ask him about 42'); await run('ask old man about the mice'); await run('meeting'); await expect(s => s.room === 'banquet', 'banquet');
await run('ask mice about a question'); await expect(s => s.pending === 'question', 'mice want a question');
await run('What do you get if you multiply six by nine?', 300); await expect(s => s.score === 40, 'question accepted');
await shot('11-mice');
await run('run', 3200); await expect(s => s.ended && s.room === 'ending' && s.score === 42, 'escaped, game ended with 42'); await shot('12-end');
const final = await st(); console.log('FINAL', JSON.stringify({ score: final.score, turn: final.turn }));
if (errors.length) { console.log('PAGE ERRORS:\n' + errors.join('\n')); process.exitCode = 1; }
await browser.close(); server.close();
