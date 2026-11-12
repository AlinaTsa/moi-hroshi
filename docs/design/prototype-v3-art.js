  var IC = {
    left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="M9 6l6 6-6 6"/>', chev: '<path d="M6 9l6 6 6-6"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    up: '<path d="M7 17L17 7"/><path d="M8 7h9v9"/>', cal: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    in: '<path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>', out: '<path d="M12 20V8"/><path d="M7 13l5-5 5 5"/><path d="M5 4h14"/>',
    swap: '<path d="M4 8h14l-3-3"/><path d="M20 16H6l3 3"/>', addm: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>', subm: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    cash: '<rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="12" cy="12" r="2.5"/>', bank: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/>', biz: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V5h6v3"/>', dep: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>', crypto: '<circle cx="12" cy="12" r="9"/><path d="M9 8h4a2 2 0 0 1 0 4H9m0 0h5a2 2 0 0 1 0 4H9M9 7v10"/>', other: '<rect x="3" y="6" width="18" height="13" rx="3"/><circle cx="16.5" cy="12.5" r="1"/>',
    laptop: '<rect x="5" y="5" width="14" height="10" rx="1.6"/><path d="M3 19h18"/>', shoes: '<path d="M3 16c0-2.2 1.2-3.6 3.2-3.6H8l3 2.2h4.5c2.4 0 5.5 1 5.5 3.4V18H3z"/><path d="M3 18h18"/>', plane: '<path d="M21 3L3 10.5l6.5 2.5L12 20z"/><path d="M9.5 13L21 3"/>', car: '<path d="M5 13l1.6-4.4A2 2 0 0 1 8.5 7.3h7a2 2 0 0 1 1.9 1.3L19 13"/><rect x="3" y="13" width="18" height="5" rx="2"/><circle cx="7.5" cy="18" r="1.6"/><circle cx="16.5" cy="18" r="1.6"/>', home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    tabHome: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>', tabAcc: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1"/>', tabGoal: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>', tabFc: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15l4-4 3 3 5-6"/>', tabMore: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    cat: '<path d="M5 9V4l4 3h6l4-3v5a7 7 0 0 1-14 0z"/><circle cx="9.5" cy="11" r=".8"/><circle cx="14.5" cy="11" r=".8"/>', dots: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>'
  };
  function ic(n, s, st) { return '<svg width="' + (s || 22) + '" height="' + (s || 22) + '" viewBox="0 0 24 24" fill="none" stroke="' + (st || 'currentColor') + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>'; }

  /* ---------- cats (vector) ---------- */
  var CATS = {
    first: { n: 'Кошеня-Зірочка', r: 'c', story: 'Крихітне кошеня, яке тримає зірку, що світиться. Воно з’являється, коли ви вперше доводите ціль до кінця.' },
    persist: { n: 'Кіт-Монетка', r: 'c', story: 'Уперто тягне важку чарівну монету. Любить, коли вносять частинами й не пропускають місяців.' },
    trav: { n: 'Кіт-Мандрівник', r: 'r', story: 'Маленькі крильця, валіза й карта, яка сама показує дорогу. Прилітає після довгоочікуваної подорожі.' },
    home: { n: 'Кіт-Домовик', r: 'l', story: 'Носить капелюх-будиночок і золотий ключик. Оселяється там, де здійснилась мрія про власний дім.' },
    crystal: { n: 'Королівський Кіт-Кристал', r: 'e', story: 'Поважний, але милий. Сидить на купі кристалів, які світяться, коли заощадження ростуть довго й спокійно.' },
    moon: { n: 'Місячний Хранитель', r: 'm', story: 'Загортається в плащ із зірок і стереже довгі звички. Показується дуже рідко.' }
  };
  var RAR = { c: 'Звичайний', r: 'Рідкісний', e: 'Епічний', l: 'Легендарний', m: 'Міфічний' };
  var uidn = 0;
  function catSvg(id, vb) {
    var u = 'c' + (++uidn);
    var PAL = { first: ['#F7D2AE', '#FFF1DF'], persist: ['#A4E2C2', '#E6FBF1'], trav: ['#9FD3F2', '#E6F5FF'], home: ['#C9B7F2', '#EFE8FF'], crystal: ['#5A55B8', '#A09CF0'], moon: ['#6A47A6', '#AC8AE0'] };
    var pal = PAL[id] || PAL.first, body = pal[0], hi = pal[1], dark = (id === 'crystal' || id === 'moon'), ink = dark ? '#FFFFFF' : '#2B2440';
    var defs = '<defs><radialGradient id="' + u + 'h" cx="38%" cy="28%" r="80%"><stop offset="0" stop-color="' + hi + '"/><stop offset="1" stop-color="' + body + '"/></radialGradient><radialGradient id="' + u + 'g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE9A8" stop-opacity=".95"/><stop offset="1" stop-color="#FFD35A" stop-opacity="0"/></radialGradient></defs>';
    var behind = '', front = '', brows = '', eyes;
    if (id === 'trav') behind = '<path d="M44 104 Q4 78 14 36 Q42 44 52 84 Z" fill="#FFFFFF" stroke="#8FBFE0" stroke-width="2.5"/><path d="M116 104 Q156 78 146 36 Q118 44 108 84 Z" fill="#FFFFFF" stroke="#8FBFE0" stroke-width="2.5"/><path d="M30 60 Q36 70 44 76 M130 60 Q124 70 116 76" stroke="#CFE6F6" stroke-width="2" fill="none"/>';
    if (id === 'moon') behind = '<polygon points="48,104 112,104 134,158 26,158" fill="#C43D6B"/><polygon points="48,104 112,104 120,118 40,118" fill="#E05A8A"/>';
    eyes = '<ellipse cx="62" cy="82" rx="7" ry="9" fill="' + ink + '"/><ellipse cx="98" cy="82" rx="7" ry="9" fill="' + ink + '"/><circle cx="64.5" cy="78" r="2.6" fill="#fff"/><circle cx="100.5" cy="78" r="2.6" fill="#fff"/>';
    if (id === 'crystal') eyes = '<ellipse cx="62" cy="82" rx="8.5" ry="10" fill="#fff"/><ellipse cx="98" cy="82" rx="8.5" ry="10" fill="#fff"/><ellipse cx="63" cy="83" rx="5" ry="6.5" fill="#2B2440"/><ellipse cx="99" cy="83" rx="5" ry="6.5" fill="#2B2440"/><circle cx="64.5" cy="80.5" r="1.8" fill="#fff"/><circle cx="100.5" cy="80.5" r="1.8" fill="#fff"/>';
    if (id === 'moon') eyes = '<path d="M54 82 Q62 74 70 82" stroke="' + ink + '" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M90 82 Q98 74 106 82" stroke="' + ink + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>';
    if (id === 'persist') brows = '<path d="M53 69 L70 74" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/><path d="M107 69 L90 74" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/>';
    if (id === 'first') front = '<circle cx="80" cy="20" r="32" fill="url(#' + u + 'g)"/><polygon points="80,2 85.5,13.5 98,15 89,23.5 91.5,36 80,30 68.5,36 71,23.5 62,15 74.5,13.5" fill="#FFD35A" stroke="#F2A93B" stroke-width="2" stroke-linejoin="round"/>';
    if (id === 'home') front = '<polygon points="50,46 80,16 110,46" fill="#E9806E" stroke="#C9604E" stroke-width="2" stroke-linejoin="round"/><rect x="62" y="44" width="36" height="9" rx="2" fill="#FBEEDB"/><rect x="76" y="46" width="8" height="7" rx="1" fill="#C9604E"/><circle cx="122" cy="134" r="7" fill="none" stroke="#E7B13C" stroke-width="3.2"/><path d="M122 141 V158 M122 150 H129 M122 156 H128" stroke="#E7B13C" stroke-width="3.2" stroke-linecap="round" fill="none"/>';
    if (id === 'trav') front = '<rect x="22" y="132" width="30" height="22" rx="4" fill="#F2A65A" stroke="#C97F34" stroke-width="2"/><path d="M30 132 v-5 a3 3 0 0 1 3-3 h8 a3 3 0 0 1 3 3 v5" fill="none" stroke="#C97F34" stroke-width="2"/><path d="M30 132 v22 M44 132 v22" stroke="#C97F34" stroke-width="2"/>';
    if (id === 'persist') front = '<circle cx="80" cy="140" r="19" fill="#FFD35A" stroke="#E5A52F" stroke-width="3"/><circle cx="80" cy="140" r="13" fill="none" stroke="#E5A52F" stroke-width="2"/><text x="80" y="147" text-anchor="middle" font-size="18" font-weight="600" fill="#B7791F" font-family="Onest,sans-serif">₴</text>';
    if (id === 'crystal') front = '<polygon points="52,48 60,26 71,40 80,20 89,40 100,26 108,48" fill="#FFD35A" stroke="#E0A53A" stroke-width="2" stroke-linejoin="round"/><circle cx="80" cy="34" r="3" fill="#F59AD6"/><polygon points="20,132 29,116 38,132 29,150" fill="#7FE5F2" stroke="#4CC3D4" stroke-width="2"/><polygon points="122,138 131,120 140,138 131,154" fill="#F59AD6" stroke="#D96BB5" stroke-width="2"/><polygon points="44,148 50,138 56,148 50,158" fill="#B9A6FF" stroke="#8C74E8" stroke-width="2"/>';
    if (id === 'moon') front = '<path d="M132 14 A18 18 0 1 0 132 52 A13 13 0 1 1 132 14 Z" fill="#FFE9A8"/><polygon points="26,30 29,37 36,37 31,42 33,49 26,45 19,49 21,42 16,37 23,37" fill="#FFE9A8"/><polygon points="22,70 24,75 29,75 25,78 27,83 22,80 17,83 19,78 15,75 20,75" fill="#FFE9A8"/>';
    var tail = '<path d="M118 140 Q146 132 142 106" stroke="' + body + '" stroke-width="12" fill="none" stroke-linecap="round"/>';
    return '<svg viewBox="' + (vb || '0 0 160 164') + '" overflow="visible" role="img" aria-label="' + esc((CATS[id] || {}).n || 'Кіт') + '">' + defs +
      '<ellipse cx="80" cy="159" rx="42" ry="5" fill="#000" opacity=".12"/>' + behind + tail +
      '<ellipse cx="80" cy="134" rx="37" ry="25" fill="url(#' + u + 'h)"/><ellipse cx="62" cy="154" rx="12" ry="7" fill="' + body + '"/><ellipse cx="98" cy="154" rx="12" ry="7" fill="' + body + '"/>' +
      '<polygon points="40,62 42,22 76,46" fill="' + body + '" stroke="' + body + '" stroke-width="6" stroke-linejoin="round"/><polygon points="120,62 118,22 84,46" fill="' + body + '" stroke="' + body + '" stroke-width="6" stroke-linejoin="round"/>' +
      '<polygon points="48,52 49,32 66,45" fill="#F7A8BC"/><polygon points="112,52 111,32 94,45" fill="#F7A8BC"/>' +
      '<circle cx="80" cy="80" r="47" fill="url(#' + u + 'h)"/>' + eyes + brows +
      '<circle cx="48" cy="96" r="7.5" fill="#FF9FB4" opacity=".55"/><circle cx="112" cy="96" r="7.5" fill="#FF9FB4" opacity=".55"/>' +
      '<path d="M76 92 h8 l-4 5 z" fill="#F28BA0"/><path d="M72 100 q4 5 8 0 q4 5 8 0" stroke="' + ink + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' + front + '</svg>';
  }
