/* world.js — rooms, items, people, puzzles.
   All prose here is original. An unofficial fan homage. */
window.WORLD = (() => {
  const rooms = {}, items = {}, events = {}, daemons = [], pendings = {};

  // ------------------------------------------------------------ ROOMS
  rooms.bedroom = {
    name: 'Your Bedroom', region: 'Cottington, Earth', scene: 'bedroom',
    desc: (a) => `A small bedroom in a small house in a small village that is about to become a large road. Grey light comes through the window. ${a.loc('gown') === 'bedroom' ? 'A dressing gown hangs on the back of the door, ' : ''}${a.loc('towel') === 'bedroom' ? 'a towel steams gently on the radiator, ' : ''}and on the bedside table ${a.loc('water') === 'bedroom' ? 'a glass of water sits' : 'there is a ring where a glass of water sat'}${a.loc('pills') === 'bedroom' ? ' beside a strip of paracetamol, both of which seem to have been left there by a more responsible version of yourself' : ''}. The door is to the west.`,
    exits: { west: 'hall', out: 'hall' },
  };
  rooms.hall = {
    name: 'Front Hall', region: 'Cottington, Earth', scene: 'hall',
    desc: (a) => `Coats, boots, a small table with a telephone${a.flag('phoneAnswered') ? '' : ' which is ringing'}, and the front door, through which the day is trying to get in. The bedroom is east. The front door leads north into the garden.`,
    exits: { east: 'bedroom', north: 'garden', out: 'garden' },
  };
  rooms.garden = {
    name: 'Front Garden', region: 'Cottington, Earth', scene: 'garden',
    layers: (a) => [a.flag('lying') && 'arthur', a.loc('ford') === 'garden' && 'ford', a.flag('prosserDown') && 'prosserdown'].filter(Boolean),
    desc: (a) => {
      let t = `Your front garden, or what the bulldozer has left of it. The machine squats on the lawn, engine turning over, blade raised. `;
      if (a.flag('prosserDown')) t += `In the mud in front of it lies Mr Prosser of the council, hard hat on his chest, staring at the sky with the expression of a man who has lost an argument he did not understand. The bulldozer's engine has been switched off. `;
      else t += `In front of it stands Mr Prosser of the council, who has a clipboard, a hard hat and the facial expression of a man who would rather be anywhere else, including a flood. `;
      if (a.flag('lying')) t += `You are lying in the mud in front of the bulldozer, which is working better than you expected. `;
      t += `A lane runs east towards the village.`;
      return t;
    },
    exits: { south: 'hall', in: 'hall', east: 'lane' },
    verbs: {
      lie: (a) => { if (a.flag('prosserDown')) return 'Mr Prosser is already lying there. There is not room for two, and it would look odd.'; if (a.flag('lying')) return 'You are already lying in the mud. You could hardly be more lying.'; a.flag('lying', true); a.award('lie', 2); return 'You lie down in the mud in front of the bulldozer. It is cold, and the mud is immediately in places. The driver switches off the engine with the air of a man settling in for the morning. Mr Prosser\'s expression travels through several stages of grief and parks at bargaining.'; },
      stand: (a) => { if (!a.flag('lying')) return 'You are standing. It is one of the few things going right.'; a.flag('lying', false); return 'You stand up. The bulldozer\'s engine rises hopefully. Mr Prosser brightens. You could lie back down, or go east and accept that your house is a goner.'; },
      sit: (a) => a.rooms.garden.verbs.lie(a),
      wait: (a) => a.flag('lying') ? 'You lie in the mud. The mud lies around you. The bulldozer ticks over. A stand-off is a kind of progress.' : false },
    onLeave: (a) => { if (a.flag('lying')) { a.flag('lying', false); return 'You get up out of the mud. The bulldozer\'s engine rises hopefully behind you.'; } },
    onEnter: (a, first) => { if (first) a.schedule('fordArrives', 2); },
  };
  rooms.lane = {
    name: 'Country Lane', region: 'Cottington, Earth', scene: 'lane',
    layers: (a) => [a.flag('houseGone') && 'rubble'].filter(Boolean),
    desc: (a) => `A lane between hedges, down which you have walked a thousand times without once suspecting it of being on a planet. A signpost leans at the junction. The village and its pub are east; your garden${a.flag('houseGone') ? ', and the gap where your house was,' : ''} is west.`,
    exits: { west: 'garden', east: 'pub' },
  };
  rooms.pub = {
    name: 'The Shovel and Compass', region: 'Cottington, Earth', scene: 'pub',
    layers: (a) => [a.flag('shipsArrived') && 'ships', a.loc('ford') === 'pub' && 'ford'].filter(Boolean),
    desc: (a) => `A pub of brown wood, brown carpet and brown light. ${a.loc('ford') === 'pub' ? 'Ford is at the bar with six pints lined up in front of him like a firing squad. ' : ''}Behind the bar stands the barman, polishing a glass that was clean some time ago. There is a dartboard, a jukebox that has been unplugged since the nineteen-eighties, and a rack of peanuts. ${a.flag('shipsArrived') ? 'Through the window, the sky has been replaced by the undersides of enormous yellow ships. ' : ''}The door to the lane is west.`,
    exits: { west: 'lane', out: 'lane' },
    verbs: { hitch: (a) => a.flag('shipsArrived') ? a.event('hitch') : '"Not yet," says Ford, without looking up. "You\'ll know."', hold: (a) => a.flag('shipsArrived') ? a.event('hitch') : false },
    onEnter: (a, first) => { if (first) { if (a.loc('ford') !== 'pub') a.move('ford', 'pub'); a.schedule('rumble', 7); } },
  };

  rooms.vogon_hold = {
    name: 'Cargo Hold', region: 'Vogon Constructor Ship', scene: 'vogon_hold',
    layers: (a) => [a.flag('towelOnDrain') && 'towel', a.loc('fish') === 'vogon_hold' && 'fish'].filter(Boolean),
    desc: (a) => `A hold aboard a Vogon ship: dim, damp, and smelling of something that was once a vegetable and has had time to think about it. Pipes sweat on the walls. Set into one of them is a battered vending machine labelled, in several languages and one dialect of shouting, <b>BABEL FISH — LIVE — INSERT NUTRIENT</b>. Below it the deck slopes to a drain${a.flag('towelOnDrain') ? ', over which your towel is neatly spread' : ''}. Ford is sitting on a crate, looking surprisingly relaxed. A hatch leads forward; it is locked from the other side.`,
    exits: { forward: { to: 'vogon_bridge', if: () => false, msg: 'The hatch is locked from the other side, and the other side has a very low opinion of you.' } },
    onEnter: (a, first) => { if (first) a.schedule('guardComes', 11); },
  };
  rooms.vogon_bridge = {
    name: "Captain's Quarters", region: 'Vogon Constructor Ship', scene: 'vogon_bridge',
    desc: () => `You and Ford are strapped into two chairs facing a lectern. Behind it looms Prostetnic Vogon Jeltz: vast, green-grey, and shaped like a thumb that has been left in the bath. The chairs were designed by someone who had heard of comfort and disapproved.`,
    exits: {},
  };
  rooms.airlock = {
    name: 'Airlock', region: 'Vogon Constructor Ship', scene: 'airlock',
    desc: (a) => `A small grey room with a large grey door and a very large amount of nothing on the other side of it. Ford is beside you, counting on his fingers. A notice reads: <b>HOLD BREATH. DO NOT PANIC. (THE SECOND INSTRUCTION IS ADVISORY.)</b> The outer door is cycling. ${a.flag('airlockT') === 1 ? 'It is nearly open.' : 'There is time, if you are generous about what counts as time.'}`,
    exits: {},
    onEnter: (a, first) => { if (first) { a.flag('airlockT', 2); } },
    tick: (a) => {
      const t = a.flag('airlockT') - 1; a.flag('airlockT', t);
      if (t === 1) a.say(`The door shudders. Ford takes your hand, which is not like him. "Twenty-nine seconds," he says. "That's how long you can survive in space if you hold your breath. Give or take. Mostly take."`);
      if (t <= 0) a.event('spaced');
    },
  };

  rooms.hog_corridor = {
    name: 'Corridor', region: 'Starship Heart of Gold', scene: 'hog_corridor',
    layers: (a) => [a.loc('marvin') === 'hog_corridor' && 'marvin'].filter(Boolean),
    desc: (a) => `A corridor on the starship <i>Heart of Gold</i>, which is white, curved, and so clean it looks like a diagram of itself. The doors sigh with satisfaction when they open, which is nice the first time. The bridge is forward; the galley is aft.`,
    exits: { forward: 'hog_bridge', north: 'hog_bridge', aft: 'hog_galley', south: 'hog_galley' },
  };
  rooms.hog_bridge = {
    name: 'Bridge', region: 'Starship Heart of Gold', scene: 'hog_bridge',
    layers: (a) => [a.flag('driveReady') && 'tea', a.flag('missiles') && 'missiles', a.loc('marvin') === 'hog_bridge' && 'marvin', a.flag('atMagrathea') && !a.flag('missiles') && 'planet'].filter(Boolean),
    desc: (a) => `The bridge. Everything is curved, lit, and slightly too pleased with itself. In the centre a console rises like an altar to a god of knobs. Behind it stands Zaphod Beeblebrox — two heads, three arms, one of each too many. Beside him a dark-haired woman, Trillian, is doing the actual flying. A screen on the wall glows with a smile; that is Eddie, the ship's computer. A brass plate on the console reads <b>INFINITE IMPROBABILITY DRIVE — BROWNIAN MOTION GENERATOR</b>, and beneath it is a small socket exactly the size of a cup. ${a.flag('driveReady') ? 'A cup of tea sits in it, and the drive glows like a seaside town at dusk.' : 'The socket is empty and the drive is dark.'} ${a.flag('missiles') ? '<b>On the viewscreen, two points of light are coming toward you with enormous patience.</b>' : a.flag('atMagrathea') ? 'On the viewscreen, the grey bulk of Magrathea turns slowly.' : 'On the viewscreen, stars.'} The corridor is aft.`,
    exits: { aft: 'hog_corridor', south: 'hog_corridor', out: 'hog_corridor' },
  };
  rooms.hog_galley = {
    name: 'Galley', region: 'Starship Heart of Gold', scene: 'hog_galley',
    layers: (a) => [a.loc('tea') === 'hog_galley' && 'tea', a.loc('marvin') === 'hog_galley' && 'marvin'].filter(Boolean),
    desc: (a) => `A galley the way a brochure imagines a galley. Against the wall stands the Nutrimatic Drinks Synthesizer, a tall machine with one large button marked <b>DRINK</b>, one small button marked <b>HELP</b>, and a dent at about fist height. ${a.loc('tea') === 'hog_galley' ? 'A cup of actual tea sits in its tray, steaming with quiet pride. ' : a.loc('notTea') === 'hog_galley' ? 'A cup of something sits in the tray, cooling resentfully. ' : ''}The corridor is forward.`,
    exits: { forward: 'hog_corridor', north: 'hog_corridor', out: 'hog_corridor' },
  };

  rooms.surface = {
    name: 'Surface', region: 'Magrathea', scene: 'surface',
    layers: (a) => [a.loc('slarti') === 'surface' && 'aircar', a.loc('marvin') === 'surface' && 'marvin'].filter(Boolean),
    desc: (a) => `The surface of Magrathea. Cold. Grey. Dust that has not been disturbed in five million years lifts around your boots and settles back, affronted. The sky is the colour of old pewter and the horizon is very far away in every direction. A square shaft, dark and ancient, opens in the ground nearby. Behind you the <i>Heart of Gold</i> gleams like an apology. ${a.flag('othersDown') ? '' : 'Zaphod, Ford and Trillian are peering into the shaft. '}${a.loc('slarti') === 'surface' ? 'An aircar hovers a hand\'s breadth off the ground, humming. In it sits an old man in a grey robe, waiting with the patience of geology. ' : ''}`,
    exits: { down: { to: 'factory', if: (a) => false, msg: (a) => a.flag('othersDown') ? 'The others took the lift. The lift has not come back. The shaft is very deep and you are very not.' : '"Hang on," says Zaphod, "I want to go first. It\'s my legendary planet."' }, ship: { to: 'hog_bridge', if: () => false, msg: 'The ship\'s hatch has sealed itself. "Hi there!" says a tiny speaker. "Zaphod said no one back in until he\'s found the treasure! Isn\'t that exciting!"' } },
    onEnter: (a, first) => { if (first) { a.schedule('othersDescend', 2); } },
  };
  rooms.factory = {
    name: 'Factory Floor', region: 'Inside Magrathea', scene: 'factory',
    desc: () => `Inside the planet, which is hollow, which is where they keep the other planets. You hang in the aircar above a workfloor the size of a continent, across which cranes the length of rivers swing half-finished worlds. Directly ahead, cradled in scaffolding, hangs a blue-and-white planet with one ocean still unfilled. It looks very like home. The old man sits beside you, hands folded.`,
    exits: { meeting: { to: 'banquet', if: (a) => a.flag('toldMice'), msg: '"Patience," says the old man. "Ask me what you need to ask. Then we will go. They will still want you; they always want somebody."' } },
  };
  rooms.banquet = {
    name: 'The Banquet', region: 'Inside Magrathea', scene: 'banquet',
    layers: (a) => [a.flag('inspector') && 'inspector'].filter(Boolean),
    desc: (a) => `A long table in a long room. At one end sit Zaphod, Ford and Trillian, looking as though they have been given a lecture. At the other end, on two tiny cushioned thrones, sit two white mice. They look at you the way a landlord looks at a deposit. ${a.flag('inspector') ? '<b>In the doorway stands a man in a hi-vis jacket and a hard hat, holding a clipboard.</b> ' : ''}The way out is back the way you came.`,
    onLeave: (a) => { if (a.flag('inspector')) { a.event('escape'); return 'STOP'; } },
    exits: { out: { to: 'ending', if: (a) => a.flag('inspector'), msg: '"Sit," says a mouse, and something about the way it says it keeps you sitting.' } },
    verbs: { run: (a) => a.flag('inspector') ? a.event('escape') : 'Run where? The mice are between you and the only door, and they are smaller than you but very much in charge.',
      flee: (a) => a.rooms.banquet.verbs.run(a), escape: (a) => a.rooms.banquet.verbs.run(a), leave: (a) => a.rooms.banquet.verbs.run(a),
      lie: (a) => a.flag('inspector') ? 'You lie down. It worked once. The inspector steps over you. "It\'s not a bulldozer, sir," he says. "It\'s a form." Ford hauls you up. "RUN."' : 'You lie down under the table. The mice wait. They have waited longer.' },
  };
  rooms.ending = { name: 'Epilogue', region: 'Somewhere improbable', scene: 'ending', desc: () => '', exits: {} };

  // ------------------------------------------------------------ ITEMS
  const scenery = (id, names, desc, extra = {}) => { items[id] = Object.assign({ names, desc, scenery: true, loc: extra.loc }, extra); };

  // Bedroom
  items.towel = { names: ['towel'], loc: 'bedroom', desc: (a) => a.flag('towelOnDrain') ? 'Your towel, spread over the drain like a small flag of competence.' : 'A towel. Blue, slightly damp, faintly warm from the radiator. It is, though you do not yet know this, the most important thing you own.',
    on: { take: (a) => { if (a.flag('towelOnDrain')) { a.flag('towelOnDrain', false); return 'You pick your towel up off the drain.'; } a.award('towel', 2); return 'You take the towel. It is warm. You feel, obscurely, that you have made a good decision.'; },
      drop: (a) => { if (a.room === 'vogon_hold') { a.flag('towelOnDrain', false); } return false; },
      putOn: (a, c) => { if (c.item2 && c.item2.id === 'drain') { a.move('towel', 'vogon_hold'); a.flag('towelOnDrain', true); a.award('drain', 1); return 'You spread your towel over the drain. It is, you reflect, the first time today you have felt prepared for anything.'; } return false; } } };
  items.gown = { short: 'dressing gown', names: ['dressing gown', 'gown', 'robe', 'dressing-gown'], loc: 'bedroom', wearable: true, desc: 'Towelling, faded, pockets bulging with the archaeology of your week.',
    on: { take: (a) => { if (!a.flag('gownTaken')) { a.flag('gownTaken', true); a.move('coins', 'inv'); a.move('letter', 'inv'); return 'You take the dressing gown. Something in its pocket clinks, and something else crinkles: a handful of pound coins and a letter from the council you have been not-reading for a fortnight.'; } return false; } } };
  items.coins = { short: 'handful of pound coins', names: ['coins', 'pound coins', 'money', 'pounds', 'coin', 'change', 'cash'], loc: 'nowhere', desc: 'Four pound coins and something that might be a euro.' };
  items.letter = { short: 'letter from the council', names: ['letter', 'council letter', 'notice'], loc: 'nowhere', desc: 'A letter from the council. It has the look of a letter that knows it is right.',
    on: { read: () => `<i>NOTICE OF DEMOLITION. Re: Your house. The above property lies on the route of the Cottington Bypass and will be demolished on Thursday at approximately ten o'clock. The plans were available for public inspection for the statutory period in the planning office basement, which is reached by a door that was, in fairness, labelled. The council regrets any inconvenience and would like to point out that it does not, in fact, regret it. — M. Prosser.</i>` } };
  items.water = { short: 'glass of water', names: ['glass of water', 'water', 'glass'], loc: 'bedroom', desc: 'A glass of water, left out overnight and now at the exact temperature of regret.',
    on: { drink: (a) => { a.move('water', 'nowhere'); if (a.loc('pills') !== 'nowhere') return 'You drink the water. It helps, in the way that a single sandbag helps a flood.'; return 'You drink the water. Your head begins, cautiously, to agree to be a head again.'; } } };
  items.pills = { short: 'strip of paracetamol', names: ['paracetamol', 'pills', 'pill', 'tablets', 'tablet', 'painkillers', 'painkiller', 'aspirin', 'strip'], loc: 'bedroom', desc: 'A strip of paracetamol with two tablets left, which is a kind of inheritance.',
    on: { take: (a) => a.doVerb('take_pills'), eat: (a) => a.doVerb('take_pills'), take_pills: (a) => { a.move('pills', 'nowhere'); a.award('pills', 1); a.flag('headache', false); return a.loc('water') === 'nowhere' ? 'You swallow two tablets dry, which is unpleasant, and wait. Slowly the room stops auditioning for the role of a ship.' : 'You swallow two tablets with a mouthful of water. Slowly the room stops auditioning for the role of a ship. You feel almost like a person, which is the most anyone can ask of a Thursday.'; },
      drink: (a) => a.doVerb('take_pills') } };
  scenery('bed', ['bed'], 'Your bed. It would take you back. It always does.', { loc: 'bedroom', on: { enter: () => 'You lie down. The ceiling spins. Somewhere outside a bulldozer revs, and you remember that the ceiling is one of the things scheduled for removal. You get up again.', sleep: () => 'You try. The bulldozer disagrees.' } });
  scenery('window', ['window'], 'Through the window: your front garden, a yellow bulldozer, and a man in a hi-vis jacket holding a clipboard as though it were a warrant.', { loc: 'bedroom', on: { open: () => 'The window is painted shut, which the council will shortly resolve.' } });
  scenery('radiator', ['radiator'], 'A radiator, doing its best.', { loc: 'bedroom' });
  scenery('table', ['bedside table', 'table'], 'A bedside table, with the usual geology of coins, receipts and one dead battery.', { loc: 'bedroom' });
  scenery('bedroom_door', ['door'], 'The bedroom door, with a hook on the back for a dressing gown.', { loc: 'bedroom', on: { open: () => 'It is already open. It opens west, into the hall.' } });

  // Hall
  items.phone = { names: ['telephone', 'phone'], loc: 'hall', scenery: true, desc: (a) => a.flag('phoneAnswered') ? 'A telephone, now silent, and smug about it.' : 'A telephone. It is ringing with the persistence of something that has your address.',
    on: { answer: (a) => { if (a.flag('phoneAnswered')) return 'There is nobody there. There is, in a sense, going to be nobody anywhere.'; a.flag('phoneAnswered', true); return `You pick up. A bright voice says, "Mr Dent? Just confirming your house for demolition at ten. Is that still convenient?" You begin to say several things. "Lovely," says the voice. "Have a super day." Click.`; }, take: (a) => a.doVerb('answer'), use: (a) => a.doVerb('answer') } };
  scenery('front_door', ['front door', 'door'], 'The front door, which has always stuck a bit and now has the moral high ground about it.', { loc: 'hall', on: { open: () => 'You open the front door. The garden is north.' } });
  scenery('coats', ['coats', 'boots', 'coat'], 'Coats and boots, none of which seem relevant to a day that is already ending.', { loc: 'hall' });

  // Garden
  items.bulldozer = { names: ['bulldozer', 'digger', 'machine'], loc: 'garden', scenery: true, desc: 'Yellow, huge, idling. The blade is raised like an eyebrow. The driver, in the cab, is reading a newspaper with the serenity of a man who is paid by the hour.',
    on: { lie: (a) => a.rooms.garden.verbs.lie(a), attack: () => 'You hit the bulldozer. The bulldozer has been hit by better.', enter: () => 'The driver locks the cab door without looking up from the sport.', push: () => 'It does not move. It is, in a very real sense, the one doing the pushing today.' } };
  scenery('mud', ['mud', 'lawn', 'grass', 'ground'], 'Your lawn, now a kind of preparatory mud.', { loc: 'garden' });
  scenery('driver', ['driver'], 'The driver, reading the paper. He has seen a lot of lawns.', { loc: 'garden', npc: true, topics: { default: 'The driver turns a page. "Talk to him," he says, nodding at Mr Prosser. "I just drive it."' } });
  items.prosser = { quiet: true, names: ['prosser', 'mr prosser', 'man', 'council man', 'official'], loc: 'garden', npc: true, desc: (a) => a.flag('prosserDown') ? 'Mr Prosser lies in the mud on your behalf. He has the look of a man rethinking his career from the start.' : 'Mr Prosser: forty, nervous, a council hat on his head and a clipboard held like a shield. He keeps glancing at the bulldozer as if it might take his side.',
    topics: {
      bypass: '"Bypasses have to be built," says Mr Prosser, in the voice of a man reciting something he was told to say by a man who was told to say it by a committee.',
      house: '"The plans were on display," says Mr Prosser. "For nine months. In the basement. In a locked cabinet. The cabinet was clearly marked." He pauses. "I believe the marking said <i>Cabinet</i>."',
      plans: '"The plans were on display," says Mr Prosser, with the weariness of a man saying it for the fortieth time this year.',
      lie: (a) => a.flag('prosserDown') ? '"I\'m lying down," says Mr Prosser, from the mud. "Look at me."' : '"I can\'t lie down in the mud," says Mr Prosser. "I\'m from the council." He looks at the mud as if it were a career path.',
      down: (a) => a.doTopic('prosser', 'lie'),
      mud: (a) => a.doTopic('prosser', 'lie'),
      letter: '"Ah," says Mr Prosser, "you got my letter." He seems pleased and then stops being pleased.',
      ford: '"Your friend," says Mr Prosser, "has a very odd way of looking at the sky."',
      default: 'Mr Prosser consults his clipboard, which does not help him.' },
    on: { give: (a, c) => c.item.id === 'letter' ? 'Mr Prosser reads his own letter with a frown. "This is correct," he says, and hands it back.' : c.item.id === 'coins' ? '"I can\'t be bribed," says Mr Prosser. "Not for that."' : false,
      attack: () => 'You consider it. He is from the council; hitting him would only generate paperwork.' } };
  items.ford = { names: ['ford', 'ford prefect', 'friend'], short: 'Ford', loc: 'nowhere', npc: true, quietIn: ['pub', 'vogon_hold', 'vogon_bridge', 'airlock', 'surface', 'banquet'], desc: 'Ford Prefect: red hair, battered satchel, and the look of someone who has just remembered something extremely important and is hoping nobody else has. You have known him for years. You have never known what he does.',
    topics: {
      earth: (a) => a.room === 'garden' || a.room === 'pub' ? 'Ford gives you a look you will only understand later.' : '"Earth," says Ford. "Yeah. Sorry about that. I was going to tell you. I was going to tell you at the pub, actually, and then, well, you were there."',
      pub: (a) => a.room === 'garden' ? '"Pub," Ford agrees. "East. Come on."' : '"Good pub," says Ford, in the tone of a man awarding a star.',
      towel: (a) => a.has('towel') ? '"Have you got your towel?" asks Ford. You show him. "Good man," he says, with real feeling.' : '"Have you got your towel?" asks Ford, as if this were a normal question between adults. You have not. He looks genuinely worried.',
      house: (a) => a.flag('prosserDown') ? '"It\'s fine," says Ford. "He\'s lying in front of it. Look at him. He\'s a natural."' : a.flag('lying') ? (a.room === 'garden' ? a.event('fordPersuades') : '') : '"Your house," says Ford, "is about to be the least of your problems. I mean that in the kindest way."',
      bulldozer: (a) => a.doTopic('ford', 'house'),
      prosser: (a) => a.doTopic('ford', 'house'),
      help: (a) => a.doTopic('ford', 'house'),
      vogons: '"How do you know that word?" says Ford, sharply.',
      vogon: (a) => a.doTopic('ford', 'vogons'),
      fish: (a) => a.room === 'vogon_hold' ? '"Babel fish," says Ford. "Put one in your ear and you understand anything anyone says. Getting one out of that machine is the trick. They\'re quick, and they\'re drawn to drains. Think about the drain."' : '"Fish?" says Ford. "Later."',
      drain: (a) => a.room === 'vogon_hold' ? '"Cover it," says Ford. "With something absorbent. I don\'t know, use your imagination. Use your towel."' : 'Ford looks at you oddly.',
      machine: (a) => a.doTopic('ford', 'fish'),
      peanuts: (a) => a.room === 'pub' ? '"Salt," says Ford. "Buy some. You\'re going to lose a lot of salt." He does not explain how.' : '"Peanuts," says Ford fondly. "Earth got that one right."',
      beer: (a) => a.room === 'pub' ? '"Drink," says Ford, pushing a pint at you. "Three each. Muscle relaxant. You\'re going to want it."' : '"I miss pints," says Ford. "There\'s nothing like a pint anywhere else. There\'s things called pints, but they have opinions."',
      drink: (a) => a.doTopic('ford', 'beer'),
      why: (a) => a.room === 'pub' ? '"The world\'s about to end," says Ford, cheerfully. "About twelve minutes. Drink up."' : '"Why," repeats Ford. "That\'s the trouble with you lot. Always why. Try where."',
      world: (a) => a.doTopic('ford', 'why'),
      end: (a) => a.doTopic('ford', 'why'),
      poetry: '"Vogon poetry," says Ford, with his eyes closed. "If he reads to us, say you liked it. Say what you liked. Be specific. They can tell a general lie from a specific one, and only one of them annoys them."',
      poem: (a) => a.doTopic('ford', 'poetry'),
      guide: '"The Guide," says Ford, patting his satchel. "Best book in the galaxy. I write bits of it. Small bits. Mostly about drinks."',
      thumb: '"Electronic Thumb," says Ford. "For hitching. You stick it out, a ship stops. Sometimes the wrong ship."',
      zaphod: '"Zaphod," says Ford. "My semi-cousin. We share three of the same mothers. Don\'t ask."',
      tea: '"Tea," says Ford, with feeling. "The drive runs on it. Don\'t ask me, I just hitch."',
      magrathea: '"Magrathea," says Ford. "Doesn\'t exist. Zaphod\'s found it, mind."',
      default: (a) => a.room === 'garden' ? '"Pub," says Ford. "Everything I have to say is better said in a pub."' : a.room === 'pub' ? '"Drink up," says Ford. "Trust me."' : a.room === 'vogon_hold' ? '"Don\'t worry," says Ford, not sounding worried. "Worry is for people with options."' : '"Mm," says Ford, who is reading the Guide.' },
    on: { hold: (a) => a.room === 'pub' && a.flag('shipsArrived') ? a.event('hitch') : 'You hold Ford. He pats you. "Not yet."', follow: (a) => a.room === 'garden' ? '"Pub," says Ford, pointing east. "After you."' : '"I\'m right here," says Ford.',
      give: (a, c) => c.item.id === 'towel' ? '"Keep it," says Ford, pushing it back at you. "Never give up your towel. Rule one. Well, rule four. But a big four."' : c.item.id === 'peanuts' ? 'Ford takes a peanut and gives you the packet back. "Hang on to those."' : c.item.id === 'coins' ? '"Money," says Ford, delighted. "I\'ve never got the hang of it. Keep it."' : false } };

  // Lane
  scenery('signpost', ['signpost', 'sign', 'post'], 'A wooden signpost. One arm says COTTINGTON ½. The other, newer, says BYPASS (PROPOSED) 0.', { loc: 'lane', on: { read: (a) => a.doVerb('examine') } });
  scenery('hedges', ['hedges', 'hedge', 'hedgerow'], 'Hedges. Hawthorn, mostly, with an expression of long-term patience.', { loc: 'lane' });

  // Pub
  items.barman = { quiet: true, names: ['barman', 'bartender', 'landlord', 'publican'], loc: 'pub', npc: true, desc: 'The barman, who has a glass, a cloth, and an unshakeable belief that the two are related.',
    topics: {
      peanuts: '"Pound a packet," says the barman.',
      beer: '"Your friend\'s bought six," says the barman. "I\'d start on them."',
      world: '"Is it," says the barman. "Only I\'ve got the darts team in later."',
      end: (a) => a.doTopic('barman', 'world'),
      ford: '"Him?" The barman polishes. "Comes in Thursdays. Pays in buttons, sometimes. Very good buttons."',
      ships: '"Oh aye," says the barman, not looking up. "Weather."',
      default: 'The barman says something about the weather, which is about to become a very good topic.' },
    on: { give: (a, c) => c.item.id === 'coins' ? a.event('buyPeanuts') : '"No thanks," says the barman.' } };
  items.peanuts = { short: 'packet of peanuts', names: ['peanuts', 'packet of peanuts', 'nuts', 'packet', 'salted peanuts', 'nutrient'], loc: 'pub', desc: (a) => a.has('peanuts') ? 'A packet of salted peanuts. Still mostly full; you keep taking handfuls and it keeps being mostly full, which is either a miracle or a good packet.' : 'A rack of salted peanuts behind the bar. A pound a packet, according to a card, and according to the barman, and probably according to God.',
    on: { take: (a) => a.has('peanuts') ? false : a.event('buyPeanuts'), buy: (a) => a.event('buyPeanuts'), eat: () => 'You eat a peanut. Salty. You feel you are losing a lot of salt somewhere, and this is right.',
      putIn: (a, c) => c.item2 && c.item2.id === 'dispenser' ? a.event('feedDispenser') : false } };
  items.beer = { names: ['beer', 'pint', 'pints', 'lager', 'bitter', 'ale'], loc: 'pub', scenery: true, desc: (a) => `Six pints${a.flag('beers') ? ', some of them former' : ''}. Ford has lined them up with the care of a man setting out a chess problem.`,
    on: { drink: (a) => { const n = (a.flag('beers') || 0) + 1; a.flag('beers', n); if (n === 1) { a.award('beer', 2); return 'You drink. It is a pint. It does its job. Ford nods approvingly. "Two more," he says. "Trust me. Muscle relaxant."'; } if (n === 2) return 'You drink another. The pub, which was brown, becomes a warmer brown.'; if (n === 3) return 'The third goes down. You feel loose, calm, and ready for anything, which is lucky.'; return 'Ford puts a hand on the glass. "That\'s enough relaxant. Any more and you\'ll be a liquid yourself."'; }, take: (a) => a.doVerb('drink') } };
  scenery('dartboard', ['dartboard', 'darts'], 'A dartboard, well used, mostly on the wall around it.', { loc: 'pub' });
  scenery('jukebox', ['jukebox'], 'A jukebox, unplugged. It offers, in faded cards, songs you half remember by people you have forgotten.', { loc: 'pub', on: { use: () => 'You press a button. Nothing. The barman shakes his head slowly, the way a vet does.', push: (a) => a.doVerb('use') } });
  scenery('pub_window', ['window', 'sky'], (a) => a.flag('shipsArrived') ? 'The window is full of yellow. Enormous ships hang over Cottington like a ceiling that has been added without consultation.' : 'Through the window: the lane, the village, a perfectly ordinary sky with nothing in it at all.', { loc: 'pub' });

  // Vogon hold
  items.dispenser = { names: ['machine', 'dispenser', 'vending machine', 'babel fish machine', 'fish machine', 'slot'], loc: 'vogon_hold', scenery: true, desc: (a) => `A vending machine the size of a wardrobe, bolted to the pipework. A grille at the front, a small slot labelled <b>NUTRIENT</b>, and a chute that points, with the inevitability of plumbing, straight down at the drain. ${a.flag('dispenserWait') ? 'Its display reads <b>PLEASE WAIT — REPLENISHING</b>.' : 'Its display reads <b>READY</b>. Something inside it is swimming.'}`,
    on: { use: (a) => a.has('peanuts') ? a.event('feedDispenser') : 'The slot wants nutrient. You have none. You have, you realise, eaten your way across a galaxy on nothing but beer.', push: (a) => a.doVerb('use'), attack: () => 'You hit the machine. It makes a noise like a disappointed aunt.', open: () => 'It is bolted shut by people who bolt things shut professionally.',
      receive: (a, c) => c.item.id === 'peanuts' ? a.event('feedDispenser') : c.item.id === 'coins' ? 'The slot rejects the coin with something like contempt. It wants nutrient, not currency.' : 'The slot is very specific about what it wants.' } };
  items.drain = { names: ['drain', 'grating', 'plughole'], loc: 'vogon_hold', scenery: true, desc: (a) => a.flag('towelOnDrain') ? 'The drain is under your towel. Nothing is getting past that.' : 'A drain in the lowest part of the floor, under the chute. A dark, confident drain. Anything landing here has one direction left to go.',
    on: { receive: (a, c) => c.item.id === 'towel' ? a.items.towel.on.putOn(a, { item2: a.items.drain }) : `You hold the ${c.item.names[0]} over the drain, think better of it, and don't.`, cover: (a) => a.has('towel') ? a.items.towel.on.putOn(a, { item2: a.items.drain }) : 'With what?' } };
  scenery('crate', ['crate', 'box'], 'A crate stencilled with Vogon lettering. Ford is sitting on it. It is probably forms.', { loc: 'vogon_hold', on: { open: () => 'Ford is sitting on it. "Forms," he says. "Trust me."' } });
  scenery('pipes', ['pipes', 'pipe'], 'Pipes, sweating something you decide is water.', { loc: 'vogon_hold' });
  scenery('hatch', ['hatch', 'door'], 'A heavy hatch, locked from the far side.', { loc: 'vogon_hold', on: { open: () => 'Locked. From the other side. By Vogons.', attack: () => 'You bang on the hatch. From the far side, a voice tells you in no uncertain terms to fill in a request.' } });
  items.fish = { short: 'Babel fish', names: ['fish', 'babel fish', 'yellow fish'], loc: 'nowhere', desc: (a) => a.flag('fishIn') ? 'It is in your ear, where it is quietly translating the hum of the ship into complaints about overtime.' : 'A small yellow fish, leech-like, with an expression of deep surprise. It is looking at the drain the way you looked at the bulldozer.',
    on: { take: (a) => { a.award('fish', 4); return 'You pick the fish up off your towel. It is cold, wriggly, and alive, in that order.'; },
      putIn: (a, c) => (c.item2 && c.item2.id === 'ear') ? a.event('fishInEar') : false, wear: (a) => a.event('fishInEar'), use: (a) => a.event('fishInEar'), eat: () => 'You consider it, briefly. It looks back at you. You decide against.' } };
  items.ear = { names: ['ear', 'ears', 'my ear'], loc: 'inv', scenery: true, desc: 'Your ear. Two of them, in fact, but you only need the one.', on: { receive: (a, c) => c.item.id === 'fish' ? a.event('fishInEar') : 'That does not go in your ear. Few things should.' } };
  items.me = { names: ['me', 'myself', 'self', 'arthur', 'arthur dent'], loc: 'inv', scenery: true, desc: (a) => `Arthur Dent. Thirty-ish, ${a.worn('gown') ? 'in a dressing gown, ' : 'in pyjamas, '}${a.flag('headache') === false ? 'headache subsiding' : 'headache like a small badly run planet'}${a.flag('fishIn') ? ', with a fish in one ear' : ''}. You have the persistent feeling there has been a mistake somewhere, which is correct.` };

  // Vogon bridge
  items.jeltz = { quiet: true, names: ['vogon', 'jeltz', 'captain', 'prostetnic', 'prostetnic vogon jeltz'], loc: 'vogon_bridge', npc: true, desc: 'Prostetnic Vogon Jeltz. He has the bulk of a hill and the bearing of a man who knows exactly how many forms it would take to move it. He is holding a sheaf of poetry. The poetry is holding its breath.',
    topics: { default: (a) => a.flag('fishIn') ? '"Hush," says the Vogon. "I have not finished reading, and you have not finished listening."' : 'The Vogon makes a noise like a skip being dragged across gravel.' } };
  scenery('chairs', ['chair', 'chairs', 'straps'], 'The chair holds you in a grip of professional indifference.', { loc: 'vogon_bridge', on: { exit: () => 'You strain against the straps. The straps have had better.', open: () => 'The straps do not open. They barely acknowledge you.' } });
  scenery('lectern', ['lectern', 'poetry', 'poem', 'sheaf'], 'A lectern of grey metal. The poem on it is seventeen pages long and has been laminated.', { loc: 'vogon_bridge' });

  // Airlock
  scenery('airlock_door', ['door', 'outer door', 'airlock'], 'A large grey door. The dark beyond its porthole is patient and absolute.', { loc: 'airlock', on: { open: () => 'It is opening on its own, thank you.', close: () => 'You push the door. Space, on the other side, has the leverage.' } });
  scenery('airlock_notice', ['notice', 'sign'], 'HOLD BREATH. DO NOT PANIC. (THE SECOND INSTRUCTION IS ADVISORY.)', { loc: 'airlock', on: { read: (a) => a.doVerb('examine') } });
  scenery('big_button', ['button', 'red button', 'do not press'], 'A large red button, labelled DO NOT PRESS.', { loc: 'airlock', on: { push: () => 'You press it. Nothing happens. That is the Vogon sense of humour, in full.' } });

  // Heart of Gold
  items.marvin = { names: ['marvin', 'robot', 'android'], short: 'Marvin', followMsg: 'Marvin follows, with the enthusiasm of a cloud.', loc: 'hog_corridor', npc: true, desc: 'A robot, man-shaped and man-sized, slumped against the wall as if gravity had a particular grudge. His head is down. When he lifts it, his eyes glow a dull red, like a warning that has given up on being heeded.',
    topics: {
      follow: (a) => { if (a.items.marvin.follower) return '"I am following you," says Marvin. "It is the only thing I am currently doing. It is, I find, enough."'; a.items.marvin.follower = true; a.award('marvinFollow', 1); return '"Follow you," says Marvin. "Yes. I suppose that is a use for me. A small one. All right." He detaches himself from the wall with a noise like a sigh being filed.'; },
      come: (a) => a.doTopic('marvin', 'follow'),
      stay: (a) => { a.items.marvin.follower = false; return '"Of course," says Marvin. "Leave me here. Everyone does. The wall and I have an understanding."'; },
      wait: (a) => a.doTopic('marvin', 'stay'),
      life: '"Life," says Marvin. "I have been given a great deal of it. I have asked for a receipt."',
      doors: '"They\'re happy," says Marvin. "They were made happy. I was made like this. Think about that, if you like. I do."',
      door: (a) => a.doTopic('marvin', 'doors'),
      brain: '"My mind contains the complete works of every philosopher of the last ten million years, cross-referenced," says Marvin. "It does not help."',
      ship: '"The ship is happy too," says Marvin. "Everything on this ship is happy. I have been assigned to lower the average."',
      zaphod: '"Zaphod," says Marvin. "Yes. He asked me to open a door for him once. I did. He didn\'t say thank you. I didn\'t expect him to. I was right. It was a small victory. I have put it with the others."',
      tea: '"Tea," says Marvin. "A hot drink that makes humans feel better. I have examined its chemistry. There is no excuse for it."',
      drive: '"The Improbability Drive," says Marvin. "It makes unlikely things happen. It has never once made anything happen to me."',
      missiles: (a) => a.flag('missiles') ? a.event('marvinMissiles') : '"Missiles," says Marvin. "If any arrive, let me know. I\'d like to talk to them. It\'s been a while since I made anything feel worse."',
      missile: (a) => a.doTopic('marvin', 'missiles'),
      defence: (a) => a.doTopic('marvin', 'missiles'),
      defense: (a) => a.doTopic('marvin', 'missiles'),
      help: (a) => a.flag('missiles') ? a.event('marvinMissiles') : '"Help," says Marvin. "Yes. I\'d offer, but I\'d only get it right, and then where would we be."',
      default: (a) => a.pick(['"I\'d offer to help," says Marvin, "but I\'d only get it right, and then where would we be."', '"Don\'t mind me," says Marvin. "Nobody does. I\'ve measured it."', '"Is it my turn to speak?" says Marvin. "I had assumed not. I usually assume not. It saves time."']) },
    on: { give: (a, c) => c.item.id === 'towel' ? '"A towel," says Marvin. "For me. I don\'t get wet. I don\'t get dry. I don\'t get anything. Thank you." He does not take it.' : '"No," says Marvin, "but I appreciate the gesture. I am programmed to."',
      attack: () => '"Go on," says Marvin. "Everyone else has." You find you can\'t.' } };
  scenery('doors', ['doors', 'door'], 'Smooth white doors that part with a satisfied sigh whenever anyone approaches. One of them says "Glad to be of service!" in a voice like a yoghurt advert.', { loc: 'hog_corridor', on: { open: () => 'The door opens before you touch it. "My pleasure!" it says.' } });
  items.zaphod = { quiet: true, names: ['zaphod', 'beeblebrox', 'president', 'zaphod beeblebrox'], loc: 'hog_bridge', npc: true, desc: 'Zaphod Beeblebrox: two heads, three arms, and a quantity of charisma that ought to be declared at customs. One head is talking to Trillian. The other is looking at you as though you were a cocktail it had not ordered but might drink anyway.',
    topics: {
      magrathea: '"Magrathea, baby," says Zaphod. "The legendary planet. The richest planet that ever was. Lost. Which is cool, because I know where it is." One head looks at the other. "<i>We</i> know where it is."',
      drive: (a) => a.flag('driveReady') ? '"Hit it," says Zaphod. "Big button. Can\'t miss it. Well. You could."' : '"Drive\'s dead, man. Eddie says the Brownian motion generator\'s gone dry. It needs a hot drink. A really, really hot drink. Don\'t look at me, I didn\'t build it, I only stole it."',
      engage: (a) => a.event('engageDrive'),
      heads: '"Two heads," says Zaphod. "Twice the fun. One of them\'s a lot better looking, but we don\'t say which."',
      head: (a) => a.doTopic('zaphod', 'heads'),
      ship: '"The <i>Heart of Gold</i>," says Zaphod, patting the console. "I stole it at the launch. I was launching it. Saved everyone a lot of time."',
      tea: '"Tea," says Zaphod. "Yeah. Trillian\'s thing. Earth thing. Galley\'s aft, knock yourself out."',
      missiles: (a) => a.flag('missiles') ? '"Missiles," says Zaphod, with both heads. "Right. Ideas. Anyone. Monkey. Robot. Anyone."' : '"Missiles?" says Zaphod. "Relax. Nothing\'s going to shoot at us. Everything loves me."',
      ford: '"Ford," says Zaphod. "Semi-cousin. We share three of the same mothers. It\'s a long story and most of it\'s his fault."',
      earth: '"Earth," says Zaphod. "Yeah. Heard about that. Bummer. Was it any good?"',
      arthur: '"Monkey man," says Zaphod, not unkindly.',
      default: (a) => a.pick(['"Hey," says Zaphod, to someone just past your left shoulder.', '"Cool," says Zaphod, who has not been listening.', '"Later, monkey man," says Zaphod. "I\'m in the middle of being amazing."']) },
    on: { give: (a, c) => c.item.id === 'tea' ? 'Zaphod sniffs it. "It\'s not for me, man. It\'s for the drive. Socket. There." He points with a spare hand.' : '"No thanks, monkey man."' } };
  items.trillian = { quiet: true, names: ['trillian', 'tricia', 'woman', 'pilot'], loc: 'hog_bridge', npc: true, desc: 'Trillian: dark hair, competent hands, the air of a woman who has done the maths and is choosing not to share it.',
    topics: {
      drive: '"It runs on tea," says Trillian. "A cup of hot tea, in that socket. Real tea. The galley makes something else. Please don\'t ask me to explain this; I did astrophysics."',
      tea: (a) => a.flag('driveReady') ? '"That," says Trillian, nodding at the cup in the socket, "is the most British thing I have ever seen, and I\'ve seen a queue form at a riot."' : '"Real tea," says Trillian. "Leaves. Boiling water. Milk, if you must. The Nutrimatic has never managed it. It won\'t take instruction from us; maybe it\'ll take it from someone it hasn\'t met."',
      nutrimatic: (a) => a.doTopic('trillian', 'tea'),
      earth: '"I\'m from Islington," says Trillian. "I left. It seems to have been the right call."',
      zaphod: '"He\'s all right," says Trillian. "Both of him. In small doses."',
      magrathea: '"Zaphod\'s sure it\'s real," says Trillian. "He\'s sure of a lot of things. He\'s sure the drive will work when we get it going, too." She looks at the dark console.',
      missiles: (a) => a.flag('missiles') ? '"Two of them," says Trillian, calm as a lake. "Impact in a few minutes. I\'ve tried everything in the manual. Try something that isn\'t."' : '"Nothing on the scope," says Trillian.',
      default: '"Mm," says Trillian, flying.' },
    on: { give: (a, c) => c.item.id === 'tea' ? 'Trillian looks at the cup with real longing. "Socket," she says firmly. "Drive first."' : '"Hold on to that," says Trillian.' } };
  items.eddie = { quiet: true, names: ['eddie', 'computer', 'screen', 'ship computer', 'ships computer'], loc: 'hog_bridge', npc: true, scenery: true, desc: 'A screen with a smile on it. The smile is the computer. The computer is Eddie. Eddie is pleased to meet you, and will be pleased to meet you again in a moment.',
    topics: {
      tea: (a) => a.flag('teaBusy') ? '"I\'m thinking about tea!" says Eddie. "It\'s SO interesting! I may be some time!"' : '"Tea!" says Eddie. "Great question! I don\'t know anything about it! The galley might!"',
      drive: (a) => a.flag('driveReady') ? '"Drive\'s ready!" says Eddie. "Just press the big button and we\'ll be somewhere improbable in no time! Literally!"' : '"The drive needs the Brownian motion generator filled!" says Eddie brightly. "That\'s the cup socket! It wants a hot drink! A real one! I\'d help but I don\'t have hands! Or taste!"',
      missiles: (a) => a.flag('missiles') ? '"Two missiles!" says Eddie. "Impact in a few minutes! I just want you to know that whatever happens, I\'m going to be SO positive about it!"' : '"No missiles!" says Eddie. "Yet!"',
      magrathea: '"Magrathea!" says Eddie. "Doesn\'t exist! Course laid in!"',
      default: '"Hi there!" says the computer. "I just want you to know that whatever happens, I am going to be <i>so</i> positive about it."' } };
  items.console = { names: ['console', 'drive', 'improbability drive', 'infinite improbability drive', 'controls', 'panel'], loc: 'hog_bridge', scenery: true, desc: (a) => `A console of sweeping chrome and more buttons than anyone could possibly need, which is the point. The largest button is marked <b>IMPROBABILITY</b>. Beside it, the Brownian motion generator: a socket exactly the size of a cup, ${a.flag('driveReady') ? 'in which a cup of tea is doing something to physics' : 'currently empty'}.`,
    on: { push: (a) => a.event('engageDrive'), use: (a) => a.event('engageDrive'), engage: (a) => a.event('engageDrive'), pull: (a) => a.event('engageDrive'),
      receive: (a, c) => c.item.id === 'tea' ? a.event('teaInSocket') : c.item.id === 'notTea' ? 'The drive makes a noise like a cat refusing a tablet and spits the cup back out. The liquid, if anything, is offended.' : 'That does not fit the socket. The socket is cup-shaped, and that is not a cup.' } };
  items.socket = { names: ['socket', 'generator', 'brownian motion generator', 'cup socket', 'holder'], loc: 'hog_bridge', scenery: true, desc: (a) => a.flag('driveReady') ? 'A cup of tea sits in the socket, steaming. The drive hums around it like a cathedral around a candle.' : 'A small round socket, cup-sized, empty. A tiny brass label reads: HOT. REAL. NO SUBSTITUTES.',
    on: { receive: (a, c) => a.items.console.on.receive(a, c) } };
  scenery('button', ['big button', 'improbability button'], 'A large button marked IMPROBABILITY. It looks like it has been pressed by people who should not have.', { loc: 'hog_bridge', on: { push: (a) => a.event('engageDrive') } });
  scenery('viewscreen', ['viewscreen', 'view', 'screen', 'window', 'stars', 'planet'], (a) => a.flag('missiles') ? 'Magrathea, grey and dead. Two bright points detach from it and begin to grow.' : a.flag('atMagrathea') ? 'Magrathea fills the screen: grey, cratered, and very, very closed.' : 'Stars. More of them than you have ever seen, and all of them indifferent.', { loc: 'hog_bridge' });

  items.nutrimatic = { quiet: true, names: ['nutrimatic', 'drinks machine', 'synthesizer', 'synthesiser', 'drink machine', 'machine', 'nutrimatic drinks synthesizer'], loc: 'hog_galley', npc: true, scenery: true, desc: (a) => `The Nutrimatic Drinks Synthesizer, a product of the Sirius Cybernetics Corporation. It analyses your metabolism, taste buds and childhood, and then produces a cup of something that bears no relationship to any of them. A large button says DRINK; a small one says HELP. ${a.flag('teaFacts') ? `It is currently displaying: <b>TEA: ${['', 'ONE', 'TWO', 'THREE'][a.teaCount()]} OF THREE PARAMETERS RECEIVED.</b>` : ''}`,
    topics: {
      tea: (a) => a.flag('teaBusy') ? '"TEA IS BEING COMPUTED," says the machine. "PLEASE HOLD. YOUR PLANET IS IMPORTANT TO US."' : a.loc('tea') !== 'nowhere' ? '"TEA HAS BEEN PRODUCED," says the Nutrimatic, with the air of a machine that would like a plaque.' : '"TEA," says the Nutrimatic, in a bright synthetic voice. "A BEVERAGE. I HAVE MADE IT MANY TIMES." It has not. "IF YOU BELIEVE OTHERWISE, SPECIFY. WHAT IS TEA MADE OF? HOW IS IT MADE? WHAT IS ADDED?" Its display shows three empty boxes.',
      leaves: (a) => a.teaFact('leaves', '"LEAVES," says the Nutrimatic. "DRIED LEAVES OF A PLANT. STEEPED." A pause. "THAT IS DISGUSTING. NOTED." One box fills.'),
      leaf: (a) => a.doTopic('nutrimatic', 'leaves'), plant: (a) => a.doTopic('nutrimatic', 'leaves'), camellia: (a) => a.doTopic('nutrimatic', 'leaves'), india: (a) => a.doTopic('nutrimatic', 'leaves'), assam: (a) => a.doTopic('nutrimatic', 'leaves'), teabag: (a) => a.doTopic('nutrimatic', 'leaves'), bag: (a) => a.doTopic('nutrimatic', 'leaves'),
      water: (a) => a.teaFact('water', '"BOILING WATER," says the Nutrimatic. "FRESHLY BOILED. POURED ON. LEFT." A longer pause. "LEFT FOR HOW LONG?" "Three minutes," you say. "Four if you\'re upset." A box fills.'),
      boiling: (a) => a.doTopic('nutrimatic', 'water'), kettle: (a) => a.doTopic('nutrimatic', 'water'), boil: (a) => a.doTopic('nutrimatic', 'water'), hot: (a) => a.doTopic('nutrimatic', 'water'), steep: (a) => a.doTopic('nutrimatic', 'water'), brew: (a) => a.doTopic('nutrimatic', 'water'), minutes: (a) => a.doTopic('nutrimatic', 'water'),
      milk: (a) => a.teaFact('milk', '"MILK," says the Nutrimatic. "THE SECRETION OF A COW. ADDED AFTER." It is silent for a long time. "I SEE," it says eventually, in a smaller voice. "I SEE WHAT I HAVE BEEN DOING WRONG." A box fills.'),
      cow: (a) => a.doTopic('nutrimatic', 'milk'), sugar: (a) => a.doTopic('nutrimatic', 'milk'), lemon: (a) => a.doTopic('nutrimatic', 'milk'),
      help: '"HELP," says the Nutrimatic. "SHARE AND ENJOY." It is not clear what.',
      default: '"SHARE AND ENJOY," says the Nutrimatic, which is what it says to everything.' },
    on: { use: (a) => a.event('pressDrink'), push: (a) => a.event('pressDrink'), attack: () => 'You hit the machine, in the dent other people have made. "SHARE AND ENJOY," it says, slightly flatter.',
      receive: () => 'The Nutrimatic does not take ingredients. It takes instructions, badly.' } };
  scenery('drink_button', ['drink button', 'drink', 'big button'], 'A large button marked DRINK.', { loc: 'hog_galley', on: { push: (a) => a.event('pressDrink'), use: (a) => a.event('pressDrink') } });
  scenery('help_button', ['help button', 'help', 'small button'], 'A small button marked HELP. It has been pressed a great deal.', { loc: 'hog_galley', on: { push: () => '"SHARE AND ENJOY," says the machine. You do neither.' } });
  items.notTea = { short: 'cup of something that is not tea', names: ['cup', 'liquid', 'drink', 'not tea', 'cup of liquid', 'brown liquid'], loc: 'nowhere', desc: 'A cup of a liquid that has clearly heard tea described once, by someone who did not like it.',
    on: { drink: (a) => { a.move('notTea', 'nowhere'); return 'You drink it. It tastes of a committee. You put the cup down, and it is gone, as if ashamed.'; }, putIn: (a, c) => c.item2 && (c.item2.id === 'socket' || c.item2.id === 'console') ? a.items.console.on.receive(a, { item: a.items.notTea }) : false } };
  items.tea = { short: 'cup of tea', names: ['tea', 'cup of tea', 'cup', 'real tea', 'proper tea'], loc: 'nowhere', desc: 'A cup of tea. Real tea. The steam rising from it is the most reassuring thing you have seen since Earth, and it is competing with a towel.',
    on: { drink: (a) => { a.move('tea', 'nowhere'); a.flag('drankTheTea', true); return 'You drink the tea. It is perfect. It is also, you realise as you swallow the last of it, the only thing in the galaxy that could have started the drive. You ask the Nutrimatic for another. "TEA HAS BEEN PRODUCED," it says. "ONCE." It takes some persuading; the computer, very reluctantly, agrees to think about it again.'; },
      putIn: (a, c) => c.item2 && (c.item2.id === 'socket' || c.item2.id === 'console') ? a.event('teaInSocket') : false, use: (a) => a.room === 'hog_bridge' ? a.event('teaInSocket') : false, take: (a) => { a.award('tea', 3); return 'You take the tea. Carefully. You carry it the way other people carry infants.'; } } };

  // Magrathea
  scenery('shaft', ['shaft', 'hole', 'lift'], (a) => a.flag('othersDown') ? 'A square shaft, very deep. The lift the others took is somewhere at the bottom, and is staying there.' : 'A square shaft, very deep, with a lift platform at the top and five million years of dust on the platform.', { loc: 'surface', on: { enter: (a) => a.go('down') } });
  scenery('dust', ['dust', 'ground', 'surface'], 'Dust that has waited five million years to be stepped on and is not impressed with the result.', { loc: 'surface' });
  scenery('ship', ['heart of gold', 'ship', 'starship'], 'The Heart of Gold, white and sleek against the grey, sealed. Marvin is probably inside being right about something.', { loc: 'surface', on: { enter: (a) => a.go('ship') } });
  items.slarti = { quiet: true, names: ['old man', 'man', 'slartibartfast', 'magrathean', 'designer'], loc: 'nowhere', npc: true, desc: 'An old man in a grey robe, tall, thin, with a face that has been folded and unfolded many times. He looks at you as though you were a slightly disappointing sunset.',
    topics: {
      name: '"My name," says the old man, "is Slartibartfast." He waits. "Yes. I know. My parents were having a difficult year."',
      who: (a) => a.doTopic('slarti', 'name'),
      magrathea: '"Magrathea," he says. "We built planets. Custom. For the very rich. Ocean worlds, mountain worlds, worlds with a slightly larger moon for people who like that sort of thing. Then the economy collapsed and we went to sleep. We have been asleep for five million years. We have just been woken, which is why I am in a bad mood, and why there are missiles."',
      earth: (a) => { a.flag('toldEarth', true); return '"Earth," says the old man. "Yes. We built it. I did the coastlines. I won an award for Norway." He looks, for a moment, genuinely sorry. "You\'d have liked Norway, if you\'d... well. It was a commission. For the mice. I\'ll explain. You won\'t like it."'; },
      norway: '"Fjords," says the old man, with the first warmth you have heard from him. "Lovely crinkly edges. I\'d do them again. I <i>am</i> doing them again."',
      fjords: (a) => a.doTopic('slarti', 'norway'),
      mice: (a) => { a.flag('toldMice', true); return '"The mice," says Slartibartfast, "commissioned your planet. It was a computer. The whole thing. Designed by another computer, Deep Thought, to work out the Ultimate Question of Life, the Universe and Everything. The mice were running the experiment. You were the experiment. I\'m sorry. I should have brought biscuits." He pauses. "They want to see you. Say <b>meeting</b> when you\'re ready, or just tell me to go."'; },
      mouse: (a) => a.doTopic('slarti', 'mice'),
      question: '"The Answer," says the old man, "is forty-two. Deep Thought worked it out. Took seven and a half million years. Trouble is, nobody ever knew what the Question was. So they built a bigger computer to find it. That was your planet. It was five minutes from finishing when the Vogons knocked it down." He sighs. "Planning. Always planning."',
      answer: (a) => a.doTopic('slarti', 'question'),
      42: (a) => a.doTopic('slarti', 'question'),
      'forty-two': (a) => a.doTopic('slarti', 'question'),
      deep: (a) => a.doTopic('slarti', 'question'),
      thought: (a) => a.doTopic('slarti', 'question'),
      computer: (a) => a.doTopic('slarti', 'question'),
      planet: (a) => a.room === 'factory' ? '"Earth Mark Two," says the old man, nodding at the half-built world. "Same spec. Slightly bigger Africa, by request. They want the experiment re-run. Five more million years, give or take. You\'ll forgive me if I don\'t wait up."' : a.doTopic('slarti', 'magrathea'),
      aircar: '"Get in," says the old man. "I\'ve a great deal to show you and very little of it is good news."',
      go: (a) => a.room === 'factory' ? (a.flag('toldMice') ? a.go('meeting') : '"Not yet. Ask me about the mice, at least. You should know who you\'re meeting."') : '"Get in the aircar," he says.',
      meeting: (a) => a.doTopic('slarti', 'go'),
      vogons: '"Vogons," says Slartibartfast, with distaste. "They demolished a working computer five minutes before it finished. Imagine filling in that form."',
      default: (a) => a.room === 'surface' ? '"Get in," says the old man, nodding at the aircar. "Questions in the car."' : '"Ask me about the mice," says the old man gently, "or about your planet, or about forty-two. Then we will go."' } };
  items.aircar = { names: ['aircar', 'car', 'vehicle', 'hovercar'], loc: 'nowhere', scenery: true, desc: 'An aircar, old and elegant, humming a hand\'s breadth above the dust. It has two seats and the air of a very expensive slipper.',
    on: { enter: (a) => a.event('enterAircar'), use: (a) => a.event('enterAircar') } };

  scenery('earth2', ['earth mark two', 'earth', 'new earth', 'blue planet', 'planet', 'half-finished planet'], 'A planet, blue and white, hanging in scaffolding with one ocean still to fill. On the near continent you can make out a coastline being crinkled, very carefully, by machines the size of cities.', { loc: 'factory' });
  scenery('cranes', ['cranes', 'crane', 'scaffolding', 'floor', 'workfloor'], 'Cranes the length of rivers. Scaffolding you could lose a country in.', { loc: 'factory' });

  items.mice = { quiet: true, names: ['mice', 'mouse', 'white mice', 'left mouse', 'right mouse', 'rodents'], loc: 'banquet', npc: true, desc: 'Two white mice on tiny cushioned thrones. They are not, you understand now, mice; they are the three-dimensional protrusions into this universe of vast hyperintelligent pan-dimensional beings. They still look like mice. They still have the whiskers.',
    topics: {
      brain: '"We need the Ultimate Question," says the left mouse. "It was in your planet\'s processing. You were part of the processing. The brain of a surviving component should contain traces." "And if it doesn\'t?" you say. "Then we\'d have a brain," says the right mouse. "It\'s not a bad outcome for us."',
      question: (a) => { a.pending('question'); return '"Or," says the right mouse, "you could just <i>give</i> us a question. Any question. Something that sounds deep, fits on a poster, and goes nicely with forty-two. Nobody\'s going to check. We\'ve a chat show to do." They look at you. <b>What question do you offer?</b>'; },
      deal: (a) => a.doTopic('mice', 'question'),
      offer: (a) => a.doTopic('mice', 'question'),
      42: '"Forty-two," says the left mouse. "Yes. We know. We were there. Seven and a half million years for a number you could fit on a bus ticket."',
      earth: '"Your planet," says the right mouse, "was a computer. A good one. Five minutes from an answer, and then — Vogons." They both shrug, which on a mouse is a lot of shrug.',
      no: '"No?" The left mouse smiles, which involves teeth. "That wasn\'t really one of the options."',
      default: '"We\'d like to buy your brain," says the left mouse patiently. "We\'ve made an offer. Think about it. Or think of a question; that would also do."' },
    on: { give: (a, c) => c.item.id === 'towel' ? '"A towel," says a mouse. "No. We\'re after the other end."' : c.item.id === 'peanuts' ? 'The mice eat a peanut each, with dignity. "Thank you," says the left mouse. "The brain, though."' : '"No," say the mice.',
      attack: () => 'You lunge. The mice do not move. Something about the air stops you a foot short, politely, like a bouncer with a philosophy degree.' } };
  items.inspector = { quiet: true, names: ['inspector', 'man in hi-vis', 'official', 'man with clipboard', 'hi-vis man', 'clipboard man'], loc: 'nowhere', npc: true, desc: 'A man in a hi-vis jacket and a hard hat, holding a clipboard. He is not Mr Prosser. He is, in every way that matters, Mr Prosser.',
    topics: { default: '"Demolition," says the inspector, reading. "Hollow planet, one. The plans have been on display." Ford grabs your arm. "RUN," he says.' },
    on: { attack: () => '"Assaulting an officer of the Planning Inspectorate," says the man, writing. "That\'s a form." Ford drags you off him. "Run," he says. "Just run."' } };
  scenery('banquet_table', ['table', 'banquet', 'food'], 'A long table laid with food that was, five million years ago, very fine.', { loc: 'banquet' });

  // ------------------------------------------------------------ EVENTS
  events.fordArrives = (a) => {
    if (a.room !== 'garden' || a.loc('ford') !== 'nowhere') { if (a.loc('ford') === 'nowhere') a.move('ford', 'garden'); return; }
    a.move('ford', 'garden');
    a.say(`A man comes up the lane at speed. He has red hair, a battered satchel, and the look of someone who has just remembered something extremely important and is hoping nobody else has. It is your friend Ford Prefect.`);
    a.say(`"Arthur," he says, "how would you feel about going to the pub?"`);
    a.say(a.flag('lying') ? `"I'm lying in front of a bulldozer," you say. "Yes," says Ford. "I can see that. It's very good. Pub."` : `"They're about to knock my house down," you say. "Yes," says Ford, glancing at the sky. "That's going to be a theme. Pub."`);
  };
  events.fordPersuades = (a) => {
    a.flag('prosserDown', true); a.flag('lying', false); a.award('persuade', 3);
    return `"I can't," you say. "If I get up they'll knock the house down." Ford looks at the bulldozer, then at Mr Prosser, then at the sky, which he seems to be checking the time by. "Fine," he says, and goes to speak to Mr Prosser.<br><br>You can't hear the conversation. It involves a great deal of Ford pointing at the mud and Mr Prosser looking at his clipboard for support it cannot provide. After a minute Mr Prosser takes off his hard hat, lowers himself into the mud with the dignity of a sinking ship, and lies down. The driver switches off the engine.<br><br>"There," says Ford. "He'll lie there for you. Now get up. Pub. Now." You get up.`;
  };
  events.rumble = (a) => {
    if (a.room !== 'pub') { a.schedule('rumble', 1); return; }
    a.flag('shipsArrived', true); a.move('ford', 'pub');
    a.say(`The glasses on the bar begin to shiver. Then the bar. Then the brown light itself seems to vibrate, and the sky outside goes from grey to a yellow that has nothing to do with sun.`);
    a.say(`Ships. Enormous, flat, yellow, and hanging over the village like a ceiling that has been added without consultation. A voice comes from them, from everywhere, polite and enormous:`);
    a.say(`<b>"THIS IS A COURTESY ANNOUNCEMENT. YOUR PLANET IS SCHEDULED FOR DEMOLITION. THE RELEVANT DOCUMENTS HAVE BEEN AVAILABLE FOR SOME TIME. THANK YOU FOR YOUR COOPERATION."</b>`);
    a.say(`Ford is on his feet, satchel over his shoulder, something small and grey in his fist that is beginning to glow. "Right," he says. "Towel. Hand. <b>Hold on to me.</b> Now."`);
    a.schedule('fordGrabs', 3);
  };
  events.fordGrabs = (a) => { if (a.room === 'pub' && !a.flag('hitched')) { a.say(`Ford stops waiting for you to decide and grabs your wrist. "No time," he says.`); events.hitch(a); } };
  events.hitch = (a) => {
    a.flag('hitched', true); a.award('hitch', 3); a.cancel('fordGrabs');
    if (!a.has('towel')) a.say(`"You... haven't got your towel," says Ford. "Oh." It is the most frightened you have ever heard him sound.`);
    if (!a.has('peanuts')) a.say(`"And no peanuts," says Ford. "Right. Well. We'll see."`);
    a.say(`The thing in Ford's fist flares. There is a sensation like being posted.`);
    a.improbability(() => {
      a.say(`<b>The planet Earth is demolished.</b> It takes slightly less time than it takes to say so. Somewhere, a man in a hi-vis jacket is lying in some mud, and then is not.`);
      a.say(`You are somewhere else. It is dark, and it smells.`);
      a.move('ford', 'vogon_hold'); a.flag('houseGone', true);
      a.goto('vogon_hold');
      a.say(`"Rescued," says Ford, from somewhere. "Picked up. Hitched. Welcome to the galaxy. Don't touch anything until I've found the lights." He finds the lights.`);
    });
    return true;
  };
  events.buyPeanuts = (a) => {
    if (a.has('peanuts')) return 'You have peanuts. Several peanuts. A sufficiency of peanuts.';
    if (!a.has('coins')) return '"Pound a packet," says the barman, not unkindly, and waits for a pound you do not have.';
    a.move('peanuts', 'inv'); a.award('peanuts', 2);
    return '"That\'s a pound," says the barman, and takes one of yours with the speed of a man who has been paid in buttons before. You are now the owner of a packet of salted peanuts. Ford nods, as at a man who has passed a small exam.';
  };
  events.feedDispenser = (a) => {
    if (!a.has('peanuts')) return 'You have nothing to put in the slot.';
    if (a.flag('dispenserWait')) return 'The machine\'s display reads PLEASE WAIT — REPLENISHING. Somewhere inside it, something is being argued into a tank.';
    if (a.flag('towelOnDrain')) {
      a.move('fish', 'vogon_hold'); a.flag('dispenserWait', true);
      return 'You post a handful of peanuts into the slot. The machine thinks about it with a noise like a kettle in a cathedral, then spits a small yellow, extremely surprised fish into the air. It bounces off a pipe, falls down the chute, and lands <b>on your towel</b>, where it lies looking at the drain it very nearly made it to. Ford applauds, once.';
    }
    a.flag('dispenserWait', true); a.schedule('dispenserReady', 3);
    return 'You post a handful of peanuts into the slot. The machine thinks about it with a noise like a kettle in a cathedral, then spits a small yellow, extremely surprised fish into the air. It bounces off a pipe, hits the deck, and is down the drain before you have finished saying "oh". The display changes to PLEASE WAIT — REPLENISHING. "Told you," says Ford. "Drains."';
  };
  events.dispenserReady = (a) => { a.flag('dispenserWait', false); if (a.room === 'vogon_hold') a.say('The dispenser clunks. Its display changes back to READY, with what you would swear is reluctance.'); };
  events.fishInEar = (a) => {
    if (!a.has('fish') && a.loc('fish') !== 'vogon_hold') return 'You have no fish. This is, generally, the normal condition.';
    a.move('fish', 'nowhere'); a.flag('fishIn', true); a.award('ear', 1);
    return 'You put the fish in your ear. It wriggles, settles, and does something quiet and permanent to the inside of your head. The hum of the ship resolves itself into the sound of someone, far away, complaining about overtime. "That\'s it," says Ford. "You\'ll never not understand anyone again. Sorry about that."';
  };
  events.guardComes = (a) => {
    if (a.room !== 'vogon_hold') return;
    a.cancel('dispenserReady');
    a.say(`The hatch slams open. A Vogon guard fills it the way weather fills a valley. ${a.flag('fishIn') ? '"Captain wants you," it says. "Poetry." Ford closes his eyes briefly.' : 'It makes a noise like a drain being argued with, and gestures.'} It takes you each by the collar and carries you forward.`);
    a.goto('vogon_bridge');
    a.schedule('poetry', 1);
  };
  events.poetry = (a) => {
    a.say(a.flag('fishIn') ? `"I am going to read you some of my poetry," says the Vogon, "and then you will tell me what you thought, and then I will throw you out of the airlock. The order of these events is negotiable only in the middle." He clears his throat, which takes a while.` : `The Vogon speaks. It sounds like a skip being dragged over gravel. He lifts a sheaf of pages and begins, with terrible relish, to recite.`);
    a.say(`<div class="poem">${a.flag('fishIn') ? `Oh splendent bilgewater of my yearning,<br>thy clotted sinews gargle at the moon;<br>I perambulate thy loathsome churning<br>as a <b>fungus</b> perambulates a <b>spoon</b>.<br>Groan! Groan! Thy nasal vestibule descends<br>upon my sorrows like a lukewarm <b>pie</b>,<br>and where the drizzle of thy pity ends<br>I squat, and rust, and wonder vaguely why.` : `Glorp mnaargh phlebb rrrunk, bwaaa flodge grrnk hoon,<br>skwee blorrrm kaaarg thubba vlungh ta sploon.<br>Hrrrngh! Hrrrngh! Grrzmkk thwaaap mmmoogle pie,<br>bwarrk fleeem drrrzzle thnaaak, nnnrrgh glubb why.`}</div>`);
    a.say(a.flag('fishIn') ? `There is a silence of the kind that follows a car crash. "Well?" says the Vogon. "What did you think?" Ford is looking at you with enormous, pleading eyes. <b>Say something.</b>` : `The Vogon stops and looks at you. It is clearly a question. Ford mouths something at you that you cannot read. <b>Say something.</b>`);
    a.pending('poetry');
  };
  pendings.poetry = (a, raw) => {
    const t = raw.toLowerCase();
    if (!a.flag('fishIn')) { a.die(`You say something. It is, as far as the Vogon is concerned, noise, and he has a low tolerance for noise. "AIRLOCK," he says. It is the only word of Vogon you will ever understand, and the last. The outer door opens with no ceremony at all.<br><br><i>You might have fared better if you could have understood him. A Babel fish would have helped; the machine in the hold dispensed them, if you could stop one reaching the drain.</i>`); return true; }
    const good = /\b(good|great|brilliant|beautiful|moving|deep|profound|metaphor|imagery|rhythm|structure|counterpoint|surreal|humanity|compassion|loved|liked|like|love|enjoyed|enjoy|wonderful|genius|masterpiece|fungus|spoon|pie|moon|bilgewater|sinews|vestibule|rust|drizzle|pity|yearning|powerful|haunting|interesting|clever|rhyme|scansion|evocative|amazing|excellent|superb|lovely|nice)\b/.test(t);
    const bad = /\b(bad|awful|terrible|worst|rubbish|hate|hated|dreadful|boring|crap|shit|horrible|disgusting|dull|stupid|no)\b/.test(t) && !/\bnot bad\b/.test(t);
    const specific = /\b(fungus|spoon|pie|moon|bilgewater|sinews|vestibule|rust|drizzle|pity|yearning|metaphor|imagery|rhythm|counterpoint|rhyme|structure|scansion)\b/.test(t);
    a.pending(null);
    if (good && !bad) {
      a.award('poetry', specific ? 4 : 3);
      a.say(`The Vogon's eyes narrow, which takes a while. ${specific ? `"${(t.match(/\b(fungus|spoon|pie|moon|bilgewater|sinews|vestibule|rust|drizzle|pity|yearning|metaphor|imagery|rhythm|counterpoint|rhyme|structure|scansion)\b/) || ['that'])[0]}," he repeats. "Yes. You noticed that."` : '"You liked it," he says slowly.'} Something terrible happens to his face; you realise it is pleasure. "You are lying," he says, "but you are lying with effort, which is more than my crew manage." He turns to the guard. "Airlock. And..." he searches for a word he has rarely used, "...gently."`);
      a.say(`Ford lets out a breath he appears to have been holding since Earth.`);
      a.goto('airlock');
      return true;
    }
    a.die(`The Vogon's face does something geological. "Airlock," he says. "Not gently." The guard is enthusiastic. Ford says something about your taste in poetry as the outer door opens, and then there is no air to say anything in.<br><br><i>Vogons, it turns out, respond to praise. Specific praise. Something you liked, and what it was.</i>`);
    return true;
  };
  events.spaced = (a) => {
    a.say(`The door opens. Space happens to you.`);
    a.say(`It is cold in a way that has nothing to do with temperature, and silent in a way that has nothing to do with sound. You count. You get to about twenty. You lose count.`);
    a.improbability(() => {
      a.say(`Twenty-nine seconds later, against odds Ford will later quote to you with precision, you are breathing again. You are lying on a floor. The floor is lit from within and feels faintly smug.`);
      a.move('ford', 'hog_corridor');
      a.goto('hog_corridor');
      a.say(`"Picked up," says Ford, sitting up beside you. "Do you know what the odds of that were? Neither did anyone. That's the point. This ship runs on the stuff." He pats the floor. "<i>Heart of Gold.</i> Improbability drive. We're going to be fine, in ways nobody could have predicted."`);
      a.schedule('fordWanders', 2);
    });
  };
  events.fordWanders = (a) => { a.move('ford', 'hog_bridge'); if (a.room === 'hog_corridor') a.say(`Ford wanders forward toward the bridge, following the sound of someone talking loudly about himself.`); };

  events.pressDrink = (a) => {
    if (a.flag('teaBusy')) return 'The Nutrimatic displays: TEA IN PROGRESS. The entire ship is thinking about it. You can almost hear it.';
    if (a.loc('tea') === 'hog_galley') return 'A cup of real tea is already in the tray. Do not push your luck.';
    if (a.teaCount() === 3 && a.loc('tea') === 'nowhere' && !a.flag('teaDone')) return a.event('teaStart');
    if (a.loc('notTea') === 'nowhere') { a.move('notTea', 'hog_galley'); return 'The machine whirrs, consults your metabolism, and produces a cup of a liquid that has clearly heard tea described once, by someone who did not like it. "SHARE AND ENJOY," it says.'; }
    return 'The machine produces another cup of the same liquid, which somehow manages to be worse by being consistent.';
  };
  events.teaStart = (a) => {
    a.flag('teaBusy', true); a.flag('teaDone', true); a.schedule('teaReady', 3); a.award('teaFacts3', 2);
    return '"THREE PARAMETERS RECEIVED," says the Nutrimatic. "COMPUTING." The lights dim. Somewhere forward, Eddie says "Hi there! I\'m going to be thinking about tea for a bit! Everything else is on hold! Isn\'t that EXCITING!" The whole ship goes quiet, in the way a room goes quiet when someone very clever is working. "THIS WILL TAKE A MOMENT," says the Nutrimatic. "IT IS, APPARENTLY, HARDER THAN IT LOOKS."';
  };
  events.teaReady = (a) => {
    a.flag('teaBusy', false); a.move('tea', 'hog_galley'); a.move('notTea', 'nowhere');
    a.say(a.room === 'hog_galley' ? 'The Nutrimatic chimes. The tray slides out. On it is a cup of tea. <b>Real tea.</b> It is the right colour. It steams correctly. The machine says nothing, which is the most impressive thing it has ever done.' : 'From the galley comes a chime, and then a smell you have not smelled since Earth: tea. Actual tea.');
    if (a.room === 'hog_bridge') a.say('"Oh HEY," says Eddie, "I\'m back! That was AMAZING! Did you know tea has <i>steps</i>?"');
  };
  events.teaInSocket = (a) => {
    if (!a.has('tea')) return 'You need the tea in hand for that.';
    if (a.room !== 'hog_bridge') return 'The socket is on the bridge.';
    a.move('tea', 'nowhere'); a.flag('driveReady', true); a.award('drive', 3);
    return 'You set the cup in the socket. The drive hums, sniffs, and lights up like a seaside town at dusk. Brownian motion begins, which is to say the tea moves about in the way tea does, and the ship takes this very seriously. "Oh WOW," says Eddie. "Look at it GO." Zaphod grins with both heads. "Hit it, monkey man."';
  };
  events.engageDrive = (a) => {
    if (a.room !== 'hog_bridge') return 'The drive is on the bridge.';
    if (!a.flag('driveReady')) return 'You press the big button. Nothing. The drive sits there being improbable at nobody. "Brownian motion generator\'s empty!" says Eddie helpfully. "It wants a hot drink!"';
    if (a.flag('missiles')) {
      a.flag('missiles', false); a.flag('missilesDone', true); a.award('missiles', 1);
      a.improbability(() => { a.say('The drive fires. For a moment you are a hat stand, then a very small lighthouse, then yourself. On the viewscreen the missiles are gone, and in their place hang a bathtub full of lukewarm custard and an extremely surprised heron. The heron looks about as you would expect. "Normality restored!" says Eddie. "Well. Restored-ish!"'); a.schedule('landing', 1); });
      return true;
    }
    if (a.flag('atMagrathea')) return '"Later," says Trillian, taking your hand off the button. "We\'ve arrived."';
    a.flag('atMagrathea', true); a.flag('missiles', true); a.flag('missileT', 3);
    a.improbability(() => {
      a.say('The universe does something to itself. You are briefly a sofa. Ford is briefly a penguin and complains about it. Then it all comes back, more or less in the right order.');
      a.say('<b>Magrathea</b> fills the viewscreen: grey, cratered, cold, and very obviously closed. "Told you," says Zaphod, to everyone, twice.');
      a.say('Then a voice, ancient and recorded, fills the bridge: <i>"Greetings. Magrathea is closed. Your visit has been noted. Please enjoy these missiles."</i> Two points of light detach from the planet and begin, with enormous patience, to come toward you. "Right," says Zaphod. "Ideas. Anyone. Monkey. Robot. Anyone."');
    });
    return true;
  };
  events.marvinMissiles = (a) => {
    if (!a.flag('missiles')) return '"There are no missiles," says Marvin. "Nothing is even trying to kill us. Typical."';
    if (a.loc('marvin') !== a.room) return 'Marvin is not here.';
    a.flag('missiles', false); a.flag('missilesDone', true); a.award('missiles', 1); a.schedule('landing', 1);
    return 'Marvin sighs, plugs himself into the console, and begins to talk to the missile guidance systems. You cannot hear what he says; you can see Trillian\'s face as she reads the telemetry. The missiles slow. One turns around and goes home. The other hangs in space for a long moment and then, with the air of something that has just been told the full facts of its existence, switches itself off and drifts away to think. "There," says Marvin. "They feel much worse now. I\'ve helped."';
  };
  events.landing = (a) => {
    a.say('"Taking her down," says Trillian, and does. The <i>Heart of Gold</i> settles onto Magrathea with a sound like a very expensive sigh. "Everybody out," says Zaphod. "Legendary planet. Let\'s go find the legendary money."');
    ['ford', 'zaphod', 'trillian'].forEach(id => a.move(id, 'surface'));
    a.goto('surface');
  };
  events.othersDescend = (a) => {
    if (a.room !== 'surface') { a.schedule('othersDescend', 1); return; }
    a.flag('othersDown', true); ['ford', 'zaphod', 'trillian'].forEach(id => a.move(id, 'nowhere'));
    a.say('"Down," says Zaphod, stepping onto the lift platform with Ford and Trillian. The platform shudders and begins to sink. "Arthur," his voice echoes up, "you stay. Guard the ship. Shout if anything happens." The lift does not come back. Something will happen; things do, here.');
    if (a.loc('marvin') === 'surface') a.say('"I\'ll stay too," says Marvin. "Being unwanted is quieter outdoors."');
    a.schedule('slartiArrives', 2);
  };
  events.slartiArrives = (a) => {
    if (a.room !== 'surface') { a.schedule('slartiArrives', 1); return; }
    a.move('slarti', 'surface'); a.move('aircar', 'surface'); a.award('slarti', 1);
    a.say('A small vehicle whispers over the ridge: an aircar, old and elegant, piloted by an old man in a grey robe who looks at you as though you were a slightly disappointing sunset. It stops beside you, humming.');
    a.say('"Earthman," says the old man. "Come with me. I have a great deal to show you and very little of it is good news." He gestures at the empty seat.');
  };
  events.enterAircar = (a) => {
    if (a.loc('aircar') !== a.room) return 'There is no aircar here.';
    if (a.room === 'factory') return 'You are in it.';
    a.items.marvin.follower = false;
    a.say('You climb into the aircar. The old man touches nothing you can see; the car lifts, turns, and slides into the shaft, down past five million years of dust, down past the lift and the others, and out — into something that is not a cave, because caves have far ends.');
    a.move('slarti', 'factory'); a.move('aircar', 'factory'); a.goto('factory');
    a.say('"Earth Mark Two," says the old man, following your stare to the blue-and-white world in the scaffolding. "For the mice. I\'ll explain. You won\'t like it." He waits for you to ask.');
    return true;
  };
  pendings.question = (a, raw) => {
    const t = raw.toLowerCase().trim();
    a.pending(null);
    const isQ = /\?$/.test(t) || /^(what|how|why|who|where|when|which|is|are|do|does|did|can|could|should|would|will|whats|hows|whys)\b/.test(t);
    if (!isQ) { a.say(`"That," says the left mouse, "is not a question. We know a question. We've been waiting for one for seven and a half million years." They look at you. <b>Try again: what question do you offer?</b>`); a.pending('question'); return true; }
    const sixNine = /\b(six|6)\b.*\b(nine|9)\b|\b(nine|9)\b.*\b(six|6)\b/.test(t);
    a.award('question', 4); a.flag('questionGiven', true);
    if (sixNine) a.say(`"<i>${raw.trim()}</i>," breathes the left mouse. "Six by nine. Fifty-four." "Forty-two in base thirteen," says the right mouse, who has always been the clever one. "Nobody will ever check. We'll take it."`);
    else a.say(`The mice confer. "<i>${raw.trim()}</i>," says one. "It's banal." "It's perfect," says the other. "It's banal <i>and</i> perfect," they agree. "It'll go on a poster. Forty-two. Lovely. Done." The right mouse produces a cheque for an improbable amount and slides it the length of the table.`);
    a.schedule('inspector', 1);
    return true;
  };
  events.inspector = (a) => {
    a.flag('inspector', true); a.move('inspector', 'banquet'); a.flag('inspectorT', 3);
    a.say('An alarm goes off, somewhere deep in the planet, with the tone of an alarm that has not been needed for five million years and is making up for it.');
    a.say('The door bangs open. A man comes in. He is wearing a hi-vis jacket, a hard hat, and an expression you last saw in your front garden. He has a clipboard. "Magrathea?" he says, reading. "Planet, hollow, one. Scheduled for demolition under the Galactic Hyperspatial Development Plan, section nine, subsection..." he flips a page, "...anyone?"');
    a.say('"<b>RUN</b>," says Ford.');
  };
  events.escape = (a) => {
    a.award('escape', 2); a.flag('ended', true);
    a.improbability(() => {
      a.goto('ending', { silent: true });
      a.say('You run. You run past the mice, who are arguing about whether the cheque has cleared; past the inspector, who is writing you up; into the aircar, which the old man drives with the serenity of someone who has already been demolished once and found it overrated; up the shaft; across the dust; into the ship.');
      a.say('"Go," says Zaphod, and Trillian hits the drive, and the universe folds itself into an unlikely shape and back out again. When it does, Magrathea is a dwindling grey marble with a very small, very angry man on it.');
      a.say('Later, lying on the bridge floor with your towel folded under your head, you ask Ford to look up Earth in the Guide. He finds it. He reads it. "<i>Harmless</i>," he says. He thinks for a moment, takes out a stylus, and amends it.');
      a.say('<div class="guidecard"><span class="gtitle">EARTH</span><span class="gbody">Mostly harmless.</span></div>');
      a.say('"Where now?" says Trillian. Zaphod\'s heads consult. "I\'m hungry," says one. "Me too," says the other. "Then," says Zaphod, "lunch. I know a place. It\'s at the end of the universe. Bring your towel."');
      a.end();
    });
    return true;
  };

  // ------------------------------------------------------------ DAEMONS (run each turn)
  daemons.push((a) => { // missiles countdown
    if (a.flag('missiles')) { const t = a.flag('missileT') - 1; a.flag('missileT', t);
      if (t === 1) a.say('"Impact in one minute," says Trillian, in the voice of someone reading a bus timetable. Marvin, wherever he is, would have something to say to those missiles.');
      if (t <= 0) a.die('The missiles arrive. They are, briefly, very loud, and then nothing is anything.<br><br><i>Marvin is very good at making things lose the will to go on. Or the drive might have made something improbable happen, if it was still hot.</i>'); }
  });
  daemons.push((a) => { // inspector countdown
    if (a.flag('inspector') && !a.flag('ended')) { const t = a.flag('inspectorT') - 1; a.flag('inspectorT', t);
      if (t === 1) a.say('"...subsection four," says the inspector, finding it. He produces a very large pen.');
      if (t <= 0) a.die('The demolition of Magrathea proceeds on schedule. It is all very tidy. Somewhere, a form is stamped.<br><br><i>Ford said run. It was good advice.</i>'); }
  });
  daemons.push((a) => { // leaving the house unguarded
    if (!a.flag('houseGone') && !a.flag('prosserDown') && a.room === 'pub' && !a.flag('shipsArrived') && !a.flag('houseWarn')) { a.flag('houseWarn', true); a.say('From far up the lane comes the sound of a diesel engine and then a sound like a very large biscuit. Ford pats your arm. "Houses," he says. "Overrated. Drink."'); a.flag('houseGone', true); }
  });

  // ------------------------------------------------------------ HINTS
  const hint = (a) => {
    const r = a.room;
    if (a.flag('ended')) return 'You have finished. The hint is: have a lie down.';
    if (a.flag('inspector')) return 'Ford said RUN. Try running.';
    if (r === 'banquet') return a.flag('questionGiven') ? 'Something is about to happen. Be ready to run.' : 'The mice would settle for a question. Ask them about a question, or a deal, and then give them one. Any question. Something that sounds good with forty-two.';
    if (r === 'factory') return a.flag('toldMice') ? 'Say "meeting", or tell the old man to go.' : 'Ask the old man about everything: the planet, Earth, forty-two, the mice. Then go to the meeting.';
    if (r === 'surface') return a.loc('slarti') === 'surface' ? 'Get in the aircar.' : a.flag('othersDown') ? 'Wait. Someone will come. They always do, on legendary planets.' : 'Zaphod wants to go first. Let him. Wait a turn or two.';
    if (a.flag('missiles')) return a.loc('marvin') === r ? 'Marvin is very good at making things lose the will to go on. Ask him to talk to the missiles.' : 'Marvin is very good at making things lose the will to go on. He\'s probably in the corridor; ask him to follow you to the bridge, then ask him about the missiles. Or press the big button again.';
    if (r.startsWith('hog')) {
      if (a.flag('driveReady')) return 'Press the big button. Engage the drive. Zaphod will love it.';
      if (a.has('tea')) return 'There is a socket on the bridge console exactly the size of a cup. Put the tea in it.';
      if (a.loc('tea') === 'hog_galley') return 'Take the tea. Carefully.';
      if (a.flag('teaBusy')) return 'Wait. Tea takes time, and this one is taking the whole ship.';
      const n = a.teaCount();
      if (n === 0) return 'The drive needs real tea. The Nutrimatic in the galley needs educating: ask it about tea, then tell it what tea is made of. The Guide has an entry on tea if your memory is hazy.';
      if (n < 3) return `The Nutrimatic knows ${n} of the three things that make tea. Tell it the rest: leaves, boiling water, milk.`;
      return 'Press DRINK on the Nutrimatic now that it knows what it is doing.';
    }
    if (r === 'airlock') return 'Hold your breath. Twenty-nine seconds. Wait.';
    if (r === 'vogon_bridge') return a.flag('fishIn') ? 'Be specific. Pick a detail from the poem (the fungus, the spoon, the pie) and say you loved it.' : 'You cannot understand him. This is going to go badly. Restore, and get a Babel fish into your ear in the hold.';
    if (r === 'vogon_hold') {
      if (a.loc('fish') === 'vogon_hold') return 'Take the fish. Then put it in your ear.';
      if (a.has('fish')) return 'Ears. It goes in ears.';
      if (!a.has('peanuts')) return 'The machine wants nutrient, and you have none. You might restore to the pub and buy peanuts.';
      if (!a.flag('towelOnDrain')) return a.has('towel') ? 'The fish machine\'s nearest exit is the drain. You have something that could cover a drain. Put the towel on it.' : 'The fish will go down the drain unless something covers it. You left your towel on Earth. Restore and take it.';
      return 'The machine wants nutrient. You bought nutrient. Salted. Put the peanuts in the slot.';
    }
    if (r === 'pub') { if (!a.has('peanuts')) return a.has('coins') ? 'Ford mentioned salt. The barman sells peanuts. You have coins. Buy some.' : 'You will want peanuts, and peanuts want money. Your dressing gown at home has coins in it.'; if (!a.flag('beers')) return 'Drink. Ford insists, and he is usually right about drinks.'; if (a.flag('shipsArrived')) return 'Hold on to Ford.'; return 'Wait. Drink. Something is about to happen to the sky.'; }
    if (r === 'garden' || r === 'lane') { if (!a.has('towel')) return 'Something on your radiator might come in handy for the next several thousand years. Go back and get the towel.'; if (!a.flag('lying') && !a.flag('prosserDown')) return 'If a bulldozer wants your house, you could put yourself between them. Horizontally.'; if (a.flag('lying') && a.loc('ford') === 'garden') return 'Ford is very persuasive. Talk to him about your house.'; if (a.flag('lying')) return 'Wait for Ford. He is coming up the lane.'; return 'Pub. East, then east.'; }
    if (r === 'bedroom' || r === 'hall') { if (!a.has('towel')) return 'Something on the radiator might come in handy. Say, for the next several thousand years.'; if (!a.flag('gownTaken')) return 'Your dressing gown has pockets. Pockets have things.'; if (a.loc('pills') !== 'nowhere') return 'Your head would thank you for the paracetamol.'; return 'Outside. West, then north. Face the bulldozer.'; }
    return 'When in doubt: look, examine things, talk to people, and keep hold of your towel.';
  };

  const intro = [
    `You wake up. This is, on balance, a mistake.`,
    `Somewhere outside, a bulldozer is idling with the patient menace of a thing that has been told it is allowed. Your head feels like a small, badly run planet. It is Thursday, which explains a great deal while excusing nothing.`,
    `<i>Type what you want to do. Try <b>look</b>, <b>examine towel</b>, <b>take gown</b>, <b>go west</b>. Click underlined things. Type <b>hint</b> or press DON'T PANIC when stuck. Type <b>help</b> for more.</i>`,
  ];

  return { rooms, items, events, daemons, pendings, hint, intro, start: 'bedroom', maxScore: 42, startFlags: { headache: true } };
})();
