/* scenes.js — neon line-art viewscreen scenes, drawn as SVG and animated in. */
window.SCENES = (() => {
  const W = 400, H = 240;
  // stick figure: x = centre, y = feet
  const fig = (x, y, c = 'c1', o = {}) => {
    const h = o.h || 56, head = 7;
    const top = y - h;
    return `<g class="${c}">
      <circle cx="${x}" cy="${top + head}" r="${head}"/>
      <path d="M${x} ${top + head * 2} V${y - h * 0.4}"/>
      <path d="M${x} ${y - h * 0.4} L${x - 9} ${y} M${x} ${y - h * 0.4} L${x + 9} ${y}"/>
      <path d="M${x} ${top + head * 2 + 6} L${x - 12} ${top + head * 2 + 20} M${x} ${top + head * 2 + 6} L${x + 12} ${top + head * 2 + (o.wave ? -4 : 20)}"/>
      ${o.hat ? `<path d="M${x - 9} ${top + 3} h18 M${x - 6} ${top + 3} v-5 h12 v5"/>` : ''}
      ${o.clip ? `<rect x="${x + 10}" y="${top + head * 2 + 12}" width="9" height="12"/>` : ''}
      ${o.bag ? `<rect x="${x - 20}" y="${top + head * 2 + 16}" width="12" height="10" rx="2"/>` : ''}
      ${o.robot ? `<rect x="${x - 6}" y="${top}" width="12" height="14" rx="2"/><path d="M${x - 3} ${top + 6} h2 M${x + 1} ${top + 6} h2"/>` : ''}
    </g>`;
  };
  const lying = (x, y, c = 'c1') => `<g class="${c}"><circle cx="${x - 26}" cy="${y - 6}" r="6"/><path d="M${x - 20} ${y - 4} H${x + 10}"/><path d="M${x + 10} ${y - 4} L${x + 28} ${y - 10} M${x + 10} ${y - 4} L${x + 28} ${y}"/><path d="M${x - 12} ${y - 4} L${x - 4} ${y - 14} M${x - 8} ${y - 4} l6 6"/></g>`;
  const stars = (n, seed = 1) => { let s = '', r = seed; for (let i = 0; i < n; i++) { r = (r * 9301 + 49297) % 233280; const x = (r / 233280) * W; r = (r * 9301 + 49297) % 233280; const y = (r / 233280) * (H * 0.7); s += `<circle class="star" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.6 + (i % 3) * 0.5)}"/>`; } return s; };
  const ground = (y = 200, c = 'dim') => `<path class="${c}" d="M0 ${y} H${W}"/>`;
  const S = {};

  S.title = { base: `${stars(40, 7)}<g class="c1"><circle cx="200" cy="130" r="54"/><path d="M158 112q20 10 40 0t44 6M160 150q24-8 48 0t34-4"/></g><g class="c3"><path d="M250 70q40 10 60 40"/><path d="M110 170q-10 30 20 40t40-10"/></g><g class="c4"><path d="M300 180h50v10h-50zM300 190q25 8 50 0v12q-25 8-50 0z"/></g>` };

  S.bedroom = { base: `${ground()}
    <g class="c1"><rect x="26" y="130" width="150" height="50" rx="3"/><rect x="34" y="118" width="44" height="18" rx="4"/><path d="M26 150h150M30 180v18M172 180v18"/><path d="M80 130q40 -10 90 6"/></g>
    <g class="c2"><rect x="232" y="42" width="106" height="78"/><path d="M285 42v78M232 81h106"/><path class="dim" d="M240 100h90"/><rect x="258" y="86" width="34" height="14"/><path d="M292 90l12 -2v12"/><circle cx="262" cy="104" r="3"/><circle cx="286" cy="104" r="3"/></g>
    <g class="c4"><rect x="190" y="60" width="34" height="140" rx="2"/><path d="M207 76q-8 20 -6 52q12 6 14 0q2 -32 -4 -52"/><circle cx="207" cy="72" r="2"/></g>
    <g class="c2"><rect x="348" y="134" width="44" height="58" rx="3"/><path d="M358 140v46M370 140v46M382 140v46"/></g>
    <g class="c3"><path d="M344 126q22 -12 52 0v30q-26 10 -52 0z"/><path d="M350 140q20 6 40 0"/></g>
    <g class="c1"><rect x="4" y="152" width="24" height="46"/><path d="M8 140h8v12h-8z"/><path d="M9 146h6"/></g>`,
    layers: {} };

  S.hall = { base: `${ground()}
    <g class="c1"><rect x="150" y="40" width="100" height="160" rx="3"/><path d="M200 40a50 30 0 0 1 50 30M200 40a50 30 0 0 0-50 30M158 48v144M242 48v144"/><circle cx="232" cy="128" r="4"/></g>
    <g class="c2"><rect x="40" y="150" width="60" height="50"/><path d="M50 150v-8q20-10 40 0v8"/><path d="M58 142q12-14 24 0"/><path class="c3" d="M64 136q6-8 12 0M62 130q8-12 16 0"/></g>
    <g class="c4"><path d="M300 90h80M310 90v10M330 90v10M350 90v10M370 90v10"/><path d="M308 100q-6 30 4 50q6 0 8-50M348 100q-8 26 2 46q8 0 6-46"/></g>
    <g class="dim"><path d="M270 200l10-12h20l10 12M276 188l10-12h18"/></g>`, layers: {} };

  S.garden = { base: `${ground(196)}
    <g class="c1"><path d="M20 196V110l50-40 50 40v86"/><rect x="40" y="140" width="24" height="56"/><rect x="84" y="126" width="22" height="22"/><path d="M40 90l50-40"/></g>
    <g class="c4"><rect x="200" y="140" width="110" height="46" rx="4"/><rect x="250" y="112" width="44" height="30" rx="3"/><path d="M200 150h-40l-10 46h50z" /><path d="M196 196h120"/><circle cx="222" cy="196" r="12"/><circle cx="256" cy="196" r="12"/><circle cx="290" cy="196" r="12"/><path d="M210 208h92"/><path d="M300 118h10v-10"/></g>
    <g class="c2"><path d="M330 90q10-20 30 0M340 70q6-10 14 0"/></g>
    <g class="dim"><path d="M320 196q40-4 80 0"/></g>`,
    layers: {
      prosser: fig(130, 196, 'c3', { hat: true, clip: true }),
      arthur: lying(150, 196, 'c1'),
      ford: fig(360, 196, 'c2', { bag: true, wave: true }),
      prosserdown: lying(150, 196, 'c3'),
    } };
  S.garden.base += S.garden.layers.prosser; // Prosser default; replaced when down
  S.garden.base = S.garden.base.replace(S.garden.layers.prosser, `<g class="prosser-standing">${S.garden.layers.prosser}</g>`);
  delete S.garden.layers.prosser;

  S.lane = { base: `${ground(210)}
    <g class="c2"><path d="M0 170q40-20 80-10t60-10q40-20 60 20q20 20 60 0t80-10q40 10 60 0"/><path d="M0 200q60-30 120-20t100 10q60 20 120 0t60-10"/></g>
    <g class="c1"><path d="M200 210V120"/><path d="M200 128h60l10 6-10 6h-60zM200 150h-60l-10 6 10 6h60z"/><path class="dim" d="M210 134h40M150 156h40"/></g>
    <g class="c3"><path d="M60 60q6-6 12 0M80 52q6-6 12 0M300 70q6-6 12 0"/></g>`,
    layers: { rubble: `<g class="c4"><path d="M20 210l10-14 8 10 10-20 12 24 8-8 10 8" /></g>` } };

  S.pub = { base: `${ground(210)}
    <g class="c4"><rect x="20" y="130" width="250" height="80"/><path d="M20 130h250v-10H20z"/><path d="M40 40h210v60H40z"/><rect x="50" y="56" width="10" height="36"/><rect x="70" y="60" width="10" height="32"/><rect x="90" y="52" width="10" height="40"/><rect x="110" y="62" width="10" height="30"/><rect x="200" y="56" width="10" height="36"/><rect x="220" y="60" width="10" height="32"/></g>
    <g class="c1">${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${150 + i * 18} 120v-26h12v26z"/><path d="M${152 + i * 18} 100h8"/>`).join('')}</g>
    <g class="c3"><circle cx="340" cy="80" r="26"/><circle cx="340" cy="80" r="16"/><circle cx="340" cy="80" r="5"/><path d="M314 80h52M340 54v52"/></g>
    <g class="c2"><rect x="300" y="130" width="70" height="80" rx="6"/><path d="M310 140h50v30h-50zM320 180h30M320 190h30"/><path d="M330 160q10-10 20 0"/></g>
    ${fig(80, 120, 'c1', { h: 50 })}
    <g class="c2"><rect x="24" y="150" width="16" height="22"/><path d="M28 156h8M28 162h8"/></g>`,
    layers: { ships: `<g class="c4"><path d="M250 30q50-24 120 0q-60 14-120 0z"/><path d="M270 32h80"/><path d="M60 24q40-16 90 0q-45 10-90 0z"/><path d="M80 25h50"/></g>`, ford: fig(120, 120, 'c2', { h: 50, bag: true }) } };

  S.vogon_hold = { base: `${ground(206)}
    <g class="dim"><path d="M0 30h80v40h60v-30h260M0 60h40v60h30M400 90h-60v40h-40"/><path d="M90 30v-30M330 60v-60"/><circle cx="80" cy="30" r="4"/><circle cx="140" cy="70" r="4"/></g>
    <g class="c2"><rect x="250" y="60" width="80" height="120" rx="4"/><rect x="262" y="72" width="56" height="40"/><path d="M270 130h40M270 142h40"/><rect x="280" y="154" width="20" height="6"/><path d="M290 180v14l-40 12"/><path d="M268 80q10 10 20 0t20 0"/><text x="266" y="98" class="t">BABEL</text></g>
    <g class="c1"><ellipse cx="230" cy="206" rx="26" ry="8"/><path d="M212 206h36M230 198v16M220 200l20 12M240 200l-20 12"/></g>
    <g class="c4"><rect x="40" y="160" width="60" height="46"/><path d="M40 182h60M70 160v46"/></g>
    ${fig(70, 164, 'c2', { h: 44, bag: true })}`,
    layers: { towel: `<g class="c3"><path d="M200 196q30-10 60 0v14q-30 8-60 0z"/><path d="M206 204q24 4 48 0"/></g>`, fish: `<g class="c4"><path d="M222 190q8-8 16-3l6-4v12l-6-4q-8 5-16-1z"/><circle cx="234" cy="188" r="1.5"/></g>` } };

  S.vogon_bridge = { base: `${ground(210)}
    <g class="c2"><path d="M240 210q-10-120 40-150q40-20 70 10q30 40 20 140"/><path d="M270 110q20-20 40 0M276 130q12 8 24 0"/><circle cx="286" cy="100" r="3"/><circle cx="316" cy="100" r="3"/><path d="M250 150q-30-10-40 30M350 150q30-10 40 30"/></g>
    <g class="c1"><rect x="160" y="130" width="60" height="80"/><path d="M150 130h80l-6-10h-68z"/><path d="M170 150h40M170 160h40M170 170h28"/></g>
    <g class="c4"><rect x="30" y="140" width="40" height="70"/><rect x="90" y="140" width="40" height="70"/><path d="M30 170h40M90 170h40"/></g>
    ${fig(50, 200, 'c1', { h: 50 })}${fig(110, 200, 'c2', { h: 50, bag: true })}
    <g class="c3"><path d="M220 60q20-10 30 10M210 80q30-20 50 0M230 40q10-6 18 2"/></g>`, layers: {} };

  S.airlock = { base: `${stars(20, 3)}
    <g class="c1"><circle cx="200" cy="120" r="90"/><circle cx="200" cy="120" r="76"/><circle cx="200" cy="120" r="30"/><path d="M200 30v14M200 196v14M110 120h14M276 120h14"/></g>
    <g class="c3"><text x="178" y="130" class="t big">29</text></g>
    <g class="c4"><rect x="300" y="40" width="80" height="50" rx="3"/><path d="M310 52h60M310 62h60M310 72h40"/></g>
    ${fig(60, 220, 'c1', { h: 50 })}${fig(340, 220, 'c2', { h: 50, bag: true })}`, layers: {} };

  S.hog_corridor = { base: `
    <g class="dim"><path d="M0 0L150 80L250 80L400 0M0 240L150 160L250 160L400 240M150 80v80M250 80v80"/></g>
    <g class="c1"><path d="M40 20v200M80 42v156M120 64v112M360 20v200M320 42v156M280 64v112"/><path d="M40 20q20 10 40 22M40 220q20-10 40-22M360 20q-20 10-40 22M360 220q-20-10-40-22"/></g>
    <g class="c2"><path d="M60 100q10-20 20 0M300 100q10-20 20 0"/><path d="M62 112q8 6 16 0M302 112q8 6 16 0"/></g>
    <g class="c4"><path d="M170 100h60l-10 20h-40z"/><path d="M190 108h20"/></g>`,
    layers: { marvin: `<g class="c3"><rect x="236" y="120" width="14" height="16" rx="2"/><path d="M243 136v30M243 150l-10 14M243 150l10 14M243 142l-8 8M243 142l8 8M239 126h2M245 126h2"/><path d="M236 136l-2 6"/></g>` } };

  S.hog_bridge = { base: `${stars(30, 11)}
    <g class="dim"><path d="M0 170Q200 120 400 170"/></g>
    <g class="c1"><path d="M60 230q140-70 280 0"/><path d="M80 230q120-50 240 0" class="dim"/><path d="M160 190h80M150 200h100"/><circle cx="200" cy="178" r="12"/><circle cx="200" cy="178" r="5"/><path d="M130 196h12M258 196h12"/><rect x="300" y="186" width="30" height="8"/></g>
    <g class="c2"><rect x="20" y="30" width="110" height="70" rx="6"/><path d="M40 76q14-14 28 0t28 0"/><circle cx="60" cy="56" r="3"/><circle cx="90" cy="56" r="3"/></g>
    <g class="c4"><circle cx="300" cy="140" r="7"/><circle cx="316" cy="140" r="7"/><path d="M308 148v30M300 168l-14 16M316 168l14 16M308 158l-14-6M308 158l14-6M308 162l10 14"/></g>
    ${fig(350, 196, 'c3', { h: 54 })}`,
    layers: { tea: `<g class="c3"><rect x="262" y="166" width="12" height="10" rx="2"/><path d="M274 169h4a2 2 0 0 1 0 4h-4"/><path d="M266 160q-2 3 0 6M270 160q-2 3 0 6"/></g>`, planet: `<g class="c2"><circle cx="200" cy="90" r="50"/><path d="M160 80q20 8 40 0t40 6M165 108q30-8 70 0"/><circle cx="185" cy="70" r="6"/></g>`, missiles: `<g class="c3"><circle cx="190" cy="90" r="5"/><circle cx="230" cy="100" r="5"/><path d="M170 84l14 4M250 94l-14 4"/><path d="M186 102l4-8M226 112l4-8" class="c4"/></g>`, marvin: `<g class="c3"><rect x="93" y="140" width="14" height="16" rx="2"/><path d="M100 156v30M100 170l-10 16M100 170l10 16M100 162l-8 8M100 162l8 8M96 146h2M102 146h2"/></g>` } };

  S.hog_galley = { base: `${ground(210)}
    <g class="c1"><rect x="150" y="30" width="100" height="180" rx="8"/><circle cx="200" cy="70" r="20"/><path d="M200 50v20l12 8"/><rect x="170" y="110" width="60" height="20" rx="3"/><circle cx="222" cy="150" r="5"/><path d="M190 180h20v-6h-20z"/><path d="M200 130v44"/><text x="178" y="125" class="t">DRINK</text></g>
    <g class="dim"><path d="M40 60h80M40 80h80M40 100h80M280 60h80M280 80h80M280 100h80M40 60v40M120 60v40M280 60v40M360 60v40"/></g>
    <g class="c4"><path d="M174 150q-6 2 -4 6M172 160q4 2 4 6"/></g>`,
    layers: { tea: `<g class="c3"><rect x="192" y="190" width="16" height="14" rx="2"/><path d="M208 194h4a2 2 0 0 1 0 5h-4"/><path d="M196 182q-2 4 0 8M202 180q-2 4 0 8"/></g>`, marvin: `<g class="c3"><rect x="53" y="140" width="14" height="16" rx="2"/><path d="M60 156v30M60 170l-10 16M60 170l10 16M60 162l-8 8M60 162l8 8"/></g>` } };

  S.surface = { base: `${stars(20, 5)}
    <g class="dim"><path d="M0 150q100-20 200 0t200 0"/><path d="M0 180q80-10 160 0t160 0t80 0"/></g>
    <g class="c2"><circle cx="330" cy="60" r="14"/><circle cx="360" cy="40" r="7"/></g>
    <g class="c1"><path d="M60 160q50-30 120-12q10 2 10 8t-10 10q-70 10-120-6z"/><path d="M120 150h40"/><circle cx="100" cy="160" r="3"/></g>
    <g class="c4"><path d="M220 196l16-14h50l16 14z"/><path d="M236 182v-6h50v6"/><path class="dim" d="M236 176l16 20M286 176l-16 20"/></g>
    ${fig(300, 200, 'c3', { h: 50 })}`,
    layers: { aircar: `<g class="c3"><path d="M20 206q20-30 70-30t70 30z"/><path d="M40 206h100"/><path d="M50 190q40-16 80 0"/><circle cx="90" cy="186" r="6"/><path d="M90 192v10"/></g>`, marvin: `<g class="c3"><rect x="353" y="150" width="14" height="16" rx="2"/><path d="M360 166v30M360 180l-10 16M360 180l10 16M360 172l-8 8M360 172l8 8"/></g>` } };

  S.factory = { base: `
    <g class="dim"><path d="M0 40h400M0 90h400M0 140h400M0 190h400M50 0v240M130 0v240M270 0v240M350 0v240"/></g>
    <g class="c1"><path d="M60 30v140h40M60 30h-30M340 20v160h-40M340 20h30"/><path d="M100 170l100-60M300 180l-100-70"/></g>
    <g class="c2"><circle cx="200" cy="110" r="56"/><path d="M160 100q20 8 40-2t40 6M170 130q30-6 60 2"/><path d="M200 54v112M144 110h112" class="dim"/><path d="M212 80q10-6 20 4q-4 12-16 10z"/></g>
    <g class="c4"><path d="M250 100a56 56 0 0 1-50 66" /><path d="M186 160q-8 8-16 2"/></g>
    <g class="c3"><path d="M10 226q14-20 46-20t46 20z"/><path d="M22 226h68"/><circle cx="42" cy="210" r="4"/><circle cx="66" cy="210" r="4"/></g>`, layers: {} };

  S.banquet = { base: `${ground(214)}
    <g class="c4"><path d="M40 150h320l20 40H20z"/><path d="M60 190v24M340 190v24"/><path d="M120 158h30M200 158h30M280 158h30"/><ellipse cx="135" cy="162" rx="12" ry="3"/><ellipse cx="215" cy="162" rx="12" ry="3"/></g>
    <g class="c3"><rect x="300" y="110" width="30" height="40" rx="4"/><rect x="340" y="110" width="30" height="40" rx="4"/><ellipse cx="315" cy="134" rx="8" ry="6"/><circle cx="312" cy="126" r="2.5"/><circle cx="319" cy="126" r="2.5"/><path d="M323 136q10 2 8 8"/><ellipse cx="355" cy="134" rx="8" ry="6"/><circle cx="352" cy="126" r="2.5"/><circle cx="359" cy="126" r="2.5"/><path d="M363 136q10 2 8 8"/></g>
    <g class="c2"><rect x="60" y="30" width="110" height="70" rx="6"/><path d="M80 70q10-30 30-20t30 0t20 20"/><path d="M90 60q8 6 16 0M120 56q8 6 16 0" class="dim"/></g>
    ${fig(70, 150, 'c1', { h: 44 })}${fig(100, 150, 'c2', { h: 44, bag: true })}${fig(130, 150, 'c1', { h: 44 })}
    <g class="c4"><circle cx="145" cy="100" r="4"/><circle cx="153" cy="100" r="4"/></g>`,
    layers: { inspector: fig(380, 214, 'c4', { h: 60, hat: true, clip: true }) } };

  S.ending = { base: `${stars(50, 21)}
    <g class="c1"><circle cx="200" cy="110" r="60"/><path d="M150 96q22 10 46 0t50 8M156 130q30-10 60 0t34-6"/></g>
    <g class="c3"><path d="M120 200h160v10H120zM120 210q40 10 80 0t80 0v12q-40 8-80 0t-80 0z"/></g>
    <g class="c4"><path d="M300 60q30 10 50 40M60 80q-10 30 20 40"/></g>
    <g class="c2"><text x="140" y="60" class="t">MOSTLY HARMLESS</text></g>`, layers: {} };

  S.dead = { base: `${stars(30, 33)}<g class="c3"><text x="150" y="140" class="t huge">42</text></g><g class="dim"><path d="M60 180h280"/></g>`, layers: {} };

  // Convert a scene to an SVG string with draw-in animation attributes
  const render = (id, layers = [], still = false) => {
    const sc = S[id] || S.title;
    let inner = `<g class="base">${sc.base}</g>` + layers.map(l => `<g class="layer">${(sc.layers && sc.layers[l]) || ''}</g>`).join('');
    let i = 0;
    inner = inner.replace(/<(path|circle|rect|ellipse|line|polyline|polygon)\b(?![^>]*class="star")/g, (m, tag) => `<${tag} pathLength="1" style="--i:${i++}"`);
    return `<svg class="scene${still ? ' still' : ''}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${inner}</svg>`;
  };
  return { render, has: (id) => !!S[id] };
})();
