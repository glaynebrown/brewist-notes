/* Brewist Notes — recipes + customer-talk decoder for Good Coffee, Great Coffee */
(function () {
  'use strict';

  const RECIPES = window.RECIPES || [];
  const ORDERS = window.ORDERS || [];

  // Order you make it in the game: cup, ice, purée, espresso, syrups, water/milk, then toppings.
  function stage(item) {
    const k = item.toLowerCase();
    if (/^(small glass|coffee mug|large glass)$/.test(k)) return 0;
    if (/^ice\b/.test(k)) return 1;
    if (/puree/.test(k)) return 2;
    if (/espresso/.test(k)) return 3;
    if (/syrup/.test(k)) return 4;
    if (/water|milk/.test(k)) return 5;
    return 6;
  }
  const inOrder = items => items.map((x, i) => [x, i])
    .sort((a, b) => stage(a[0]) - stage(b[0]) || a[1] - b[1]).map(p => p[0]);
  RECIPES.forEach(r => { r.ing = inOrder(r.ing); });
  const byId = Object.fromEntries(RECIPES.map(r => [r.id, r]));
  const STARTER = ['espresso', 'americano', 'iced-americano', 'latte', 'iced-latte', 'cinnabrew'];

  /* ---------- storage (per-device) ---------- */
  function load(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ }
  }
  let unlocked = new Set(load('bn.unlocked', STARTER).filter(id => byId[id]));
  let custom = load('bn.custom', []);
  const saveUnlocked = () => save('bn.unlocked', [...unlocked]);
  const saveCustom = () => save('bn.custom', custom);

  /* ---------- helpers ---------- */
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CUPS = ['Small Glass', 'Coffee Mug', 'Large Glass'];
  const HOT = ['hot water', 'steamed whole milk', 'steamed oat milk'];
  const ICED = ['ice', 'cold water', 'whole milk', 'oat milk'];

  function key(item) {
    return item.toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/\bx\s*\d+\b/g, '')
      .replace(/^decaf\s+/, '')
      .replace(/\s+/g, ' ').trim();
  }
  function chipClass(item) {
    const k = key(item);
    if (k === 'coffee mug' || HOT.includes(k)) return 'hot';
    if (k === 'large glass' || ICED.includes(k)) return 'iced';
    return '';
  }
  function chip(item, extra) {
    const m = item.match(/^(.*?)\s*\((.*?)\)\s*$/);
    const label = m ? `${esc(m[1])} <small>${esc(m[2])}</small>` : esc(item);
    const cls = extra || chipClass(item);
    return `<span class="chip ${cls}${CUPS.includes(item) ? ' cup' : ''}">${label}</span>`;
  }
  const recipeItems = r => [r.cup, ...r.ing];

  /* ---------- tabs ---------- */
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
    document.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === name));
    save('bn.tab', name);
    if (name === 'talk') setTimeout(() => $('#q').focus(), 50);
  }
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

  /* ---------- recipes grid ---------- */
  const STEAM_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 11h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 12.5h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8.5 8c-1-1.3 1-2 0-3.5M12.5 8c-1-1.3 1-2 0-3.5"/></svg>';
  const ICE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="6" width="11" height="11" rx="2.5" transform="rotate(-8 9.5 11.5)"/><rect x="11" y="10" width="9" height="9" rx="2" transform="rotate(10 15.5 14.5)"/><path d="M7 9.5l2-.3" stroke-linecap="round"/></svg>';
  const BEAN = '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="6.5" ry="9.5" transform="rotate(30 12 12)" fill="currentColor"/><path d="M8.2 5.8c3.6 3 .4 8.4 7.6 12.4" fill="none" stroke="var(--bg)" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const napping = side => `<div class="napping" aria-hidden="true">
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 28h30v10a13 13 0 0 1-13 13h-4a13 13 0 0 1-13-13z"/>
      <path d="M42 31h3.5a5.5 5.5 0 0 1 0 11H41"/>
      <path d="M20 37q2.5 2.5 5 0M29 37q2.5 2.5 5 0"/>
      <path d="M25 44q2 1.2 4 0"/>
      <path d="M46 10h6l-6 7h6M38 16h4l-4 4.5h4"/>
    </svg>
    <span>no ${side} version</span>
  </div>`;
  function sortKey(r) {
    return (r.level != null ? r.level : 100) * 1000 + RECIPES.indexOf(r);
  }
  function renderGrid() {
    const mine = RECIPES.filter(r => unlocked.has(r.id));
    const rows = new Map();
    for (const r of mine) {
      const iced = r.name.startsWith('Iced ');
      const base = iced ? r.name.slice(5) : r.name;
      const row = rows.get(base) || { hot: null, iced: null, sort: Infinity };
      if (iced || (r.temp === 'iced' && !row.iced)) row.iced = r; else row.hot = r;
      row.sort = Math.min(row.sort, sortKey(r));
      rows.set(base, row);
    }
    const sorted = [...rows.values()].sort((a, b) => a.sort - b.sort);
    const card = (r, side) => r ? `
      <button class="card ${r.temp}" data-id="${r.id}">
        <span class="tag ${r.temp}" title="${r.temp === 'iced' ? 'Iced' : 'Hot'}">${r.temp === 'iced' ? ICE_ICON : STEAM_ICON}</span>
        <img src="img/${esc(r.img)}" alt="">
        <div class="info">
          <h3>${esc(r.name)}</h3>
          <div class="chips">${r.ing.map(i => chip(i)).join('')}</div>
        </div>
      </button>` : napping(side);
    $('#grid').innerHTML = sorted.length
      ? sorted.map(row => `<div class="slot">${card(row.hot, 'hot')}</div><div class="slot">${card(row.iced, 'iced')}</div>`).join('')
      : `<p class="empty-note">No drinks yet — tap “Unlock a drink” to add the ones you have.</p>`;
    const left = RECIPES.length - unlocked.size;
    $('#unlockBtn').innerHTML = BEAN + (left ? `Unlock a drink (${left} more in the game)` : 'All drinks unlocked!') + BEAN;
    $('#unlockBtn').disabled = !left;
  }
  $('#grid').addEventListener('click', e => {
    const c = e.target.closest('.card');
    if (c) openDetail(c.dataset.id);
  });

  /* ---------- sheet ---------- */
  function openSheet(html) {
    $('#sheetBody').innerHTML = html;
    $('#sheet').hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeSheet() {
    $('#sheet').hidden = true;
    document.body.style.overflow = '';
  }
  $('#sheet').addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheet(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

  /* ---------- drink detail ---------- */
  function ordersFor(r) {
    const want = sameItems(recipeItems(r));
    const out = [];
    for (const o of ORDERS) {
      const p = parsed(o);
      if (p.drinks.length === 1 && p.drinks[0].times === 1 && sameItems(p.drinks[0].items) === want) {
        for (const l of o.lines) out.push(l);
      }
    }
    return out;
  }
  function sameItems(items) { return items.map(key).sort().join('|'); }

  function openDetail(id) {
    const r = byId[id];
    const says = ordersFor(r);
    const owned = unlocked.has(id);
    openSheet(`
      <div class="detail-top">
        <img src="img/${esc(r.img)}" alt="">
        <div>
          <h2>${esc(r.name)}</h2>
          <div class="sub">${esc(r.avail)}${r.group !== 'Chapter 1' ? ' · ' + esc(r.group) : ''}</div>
          ${chip(r.cup)}
        </div>
      </div>
      <ol class="steps">${recipeItems(r).map(i => `<li>${chip(i)}</li>`).join('')}</ol>
      ${says.length ? `<h4>How customers ask for it</h4>` +
        says.slice(0, 10).map(l => `<p class="quote">${esc(l[0])}${l[1] ? `<br><span class="hint">${esc(l[1])}</span>` : ''}</p>`).join('') : ''}
      ${owned
        ? `<button class="remove-btn" data-remove="${r.id}">Remove from my drinks</button>`
        : `<button class="save-btn" data-unlock="${r.id}">I unlocked this — add it</button>`}
    `);
  }
  $('#sheetBody').addEventListener('click', e => {
    const rm = e.target.closest('[data-remove]');
    const un = e.target.closest('[data-unlock]');
    if (rm) {
      unlocked.delete(rm.dataset.remove); saveUnlocked(); renderGrid(); closeSheet();
    } else if (un) {
      unlocked.add(un.dataset.unlock); saveUnlocked(); renderGrid();
      if (un.classList.contains('unlock-item')) openUnlock(); else closeSheet();
    }
  });

  /* ---------- unlock picker ---------- */
  function openUnlock() {
    const locked = RECIPES.filter(r => !unlocked.has(r.id));
    if (!locked.length) { closeSheet(); return; }
    const groups = {};
    for (const r of locked) (groups[r.group] = groups[r.group] || []).push(r);
    openSheet(`
      <h2>Unlock a drink</h2>
      <div class="sub">Tap a drink once you have it in the game. It’ll show up on your Recipes page.</div>
      ${Object.entries(groups).map(([g, list]) => `
        <div class="unlock-group">
          <h4>${esc(g === 'Chapter 1' ? 'Regular menu' : g)}</h4>
          <div class="unlock-list">
            ${list.map(r => `
              <button class="unlock-item" data-unlock="${r.id}">
                <img src="img/${esc(r.img)}" alt="">
                <b>${esc(r.name)}</b>
                <small>${esc(r.avail)}</small>
              </button>`).join('')}
          </div>
        </div>`).join('')}
    `);
  }
  $('#unlockBtn').addEventListener('click', openUnlock);

  /* ---------- order parsing ---------- */
  const parseCache = new WeakMap();
  function parseBuild(build) {
    const s = build.replace(/\*\s*/g, ' ').replace(/\s+/g, ' ').trim();
    const groups = [];
    const re = /\[([^\]]+)\]\s*(?:x\s*(\d+))?/gi;
    let m;
    while ((m = re.exec(s))) groups.push({ text: m[1], times: +(m[2] || 1) });
    if (!groups.length) {
      const mm = s.match(/^(.*?)(?:\s+x\s*(\d+))?$/i);
      groups.push({ text: mm[1], times: +(mm[2] || 1) });
    }
    const drinks = [];
    const notes = [];
    for (const g of groups) {
      const parts = g.text.split('+').map(x => x.trim()).filter(Boolean)
        .map(x => CUPS.find(c => c.toLowerCase() === x.toLowerCase()) || x);
      if (parts.length < 2 && !CUPS.includes(parts[0])) { notes.push(g.text + (g.times > 1 ? ` ×${g.times}` : '')); continue; }
      drinks.push({ items: parts, times: g.times });
    }
    return { drinks, notes };
  }
  function parsed(o) {
    let p = parseCache.get(o);
    if (!p) { p = parseBuild(o.build); parseCache.set(o, p); }
    return p;
  }

  function matchRecipe(items) {
    const keys = items.map(key);
    const cup = items.find(i => CUPS.includes(i));
    let best = null;
    for (const r of RECIPES) {
      if (cup && r.cup !== cup) continue;
      const rk = recipeItems(r).map(key);
      const added = keys.filter(k => !rk.includes(k));
      const removed = rk.filter(k => !keys.includes(k));
      // Only toppings can be left off — no coffee / no syrup / no ice makes it a different drink
      if (removed.some(k => stage(k) < 6)) continue;
      const overlap = rk.length - removed.length;
      const cost = added.length + removed.length;
      if (overlap < Math.min(2, rk.length) || cost > 3 || removed.length >= overlap) continue;
      if (!best || cost < best.cost || (cost === best.cost && overlap > best.overlap)) {
        best = { r, cost, overlap, added, removed };
      }
    }
    return best;
  }

  // Ingredient pictures from the wiki (img/ing/…)
  const ING = new Set(['Cherry', 'Chocolate_Chips', 'Chocolate_Syrup', 'Cinnamon_Sticks', 'Cocoa_Powder', 'Cold_Water', 'Cranberry_Puree', 'Decaf_Beans', 'Gingerbread', 'Hot_Water', 'Ice_Cubes', 'Lavender_Syrup', 'Mint_Leaf', 'Mint_Syrup', 'Oat_Milk', 'Orange_Slices', 'Orange_Syrup', 'Pineapple_Puree', 'Pumpkin_Syrup', 'Sprinkles', 'Strawberry_Ice_Cream', 'Strawberry_Puree', 'Strawberry_Slices', 'Strawberry_Syrup', 'Vanilla_Bean', 'Vanilla_Flower', 'Vanilla_Ice_Cream', 'Vanilla_Syrup', 'Whipped_Cream', 'Whole_Milk']);
  const ING_ALIAS = { 'ice': 'Ice_Cubes', 'steamed whole milk': 'Whole_Milk', 'steamed oat milk': 'Oat_Milk', 'orange slice': 'Orange_Slices' };
  function ingImg(item) {
    if (/decaf/i.test(item)) return 'img/ing/Decaf_Beans.webp';
    const k = key(item);
    if (k === 'espresso') return 'img/Recipe_Espresso.webp';
    const file = ING_ALIAS[k] || k.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join('_');
    return ING.has(file) ? `img/ing/${file}.webp` : '';
  }

  function drinkHTML(d) {
    const m = matchRecipe(d.items);
    const times = d.times > 1 ? ` <span class="times">×${d.times}</span>` : '';
    let name = 'Off-menu order';
    let img = '';
    if (m) {
      img = `<img src="img/${esc(m.r.img)}" alt="">`;
      name = esc(m.r.name) + (m.cost ? ' <span class="hint">with changes</span>' : '');
    } else {
      // Off-menu (milk, water, hot chocolate…): show the main ingredients' pictures instead.
      const pics = [...new Set(inOrder(d.items).map(ingImg).filter(Boolean))].slice(0, 3);
      if (pics.length) img = `<div class="ing-stack n${pics.length}">${pics.map(p => `<img src="${p}" alt="">`).join('')}</div>`;
    }
    const addedKeys = m ? m.added : [];
    const chips = inOrder(d.items).map(i => {
      const special = /decaf|\bx\s*\d/i.test(i) || addedKeys.includes(key(i));
      return chip(i, m && special ? 'add' : undefined);
    });
    if (m) {
      const removedRaw = recipeItems(m.r).filter(i => m.removed.includes(key(i)));
      removedRaw.forEach(i => chips.push(chip(i, 'rem')));
    }
    return `<div class="drink">${img}<div><div class="dname">${name}${times}</div><div class="chips">${chips.join('')}</div></div></div>`;
  }

  /* ---------- customer talk search ---------- */
  const norm = s => ' ' + s.toLowerCase().replace(/[’‘']/g, '').replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  function allEntries() {
    const out = ORDERS.map(o => ({ o, text: norm(o.lines.flat().join(' ')) }));
    for (const c of custom) {
      const r = byId[c.drinkId];
      const build = r ? [r.cup, ...r.ing].join(' + ') : (c.build || '');
      out.push({ o: { sec: ['My lines'], build, lines: [[c.said]], note: c.note, customId: c.id }, text: norm(c.said + ' ' + (c.note || '')) });
    }
    return out;
  }
  function highlight(line, words) {
    let h = esc(line);
    for (const w of words) {
      if (!w) continue;
      const re = new RegExp(`(^|[^a-z0-9])(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-z0-9]*)`, 'gi');
      h = h.replace(re, '$1<mark>$2</mark>');
    }
    return h;
  }
  // Whole phrase beats exact words, which beat word starts ("moo" ranks MOO! above "mood").
  function scorePair(t, words) {
    let s = 0;
    const phrase = ' ' + words.join(' ');
    if (t.includes(phrase + ' ')) s += 80;
    else if (t.includes(phrase)) s += 50;
    for (const w of words) {
      if (t.includes(' ' + w + ' ')) s += 10;
      else if (t.includes(' ' + w)) s += 4;
    }
    return s;
  }
  function baseUnlocked(o) {
    const p = parsed(o);
    if (!p.drinks.length) return false;
    return p.drinks.every(d => { const m = matchRecipe(d.items); return m && unlocked.has(m.r.id); });
  }

  function renderResults() {
    const raw = $('#q').value;
    const words = norm(raw).trim().split(' ').filter(Boolean);
    const res = $('#results');
    if (!words.length) {
      const mine = custom.length;
      $('#hint').textContent = '';
      res.innerHTML = `<p class="empty-note">Type part of what the customer said — like <b>coffee water</b>, <b>moo</b>, <b>flamingo</b>, or <b>bitter and hot</b>.${mine ? `<br><br>You’ve saved ${mine} line${mine > 1 ? 's' : ''} of your own.` : ''}</p>`;
      return;
    }
    const hits = [];
    for (const e of allEntries()) {
      if (!words.every(w => e.text.includes(' ' + w))) continue;
      const lineScores = e.o.lines.map(pair => scorePair(norm(pair.join(' ')), words));
      const bestPair = lineScores.indexOf(Math.max(...lineScores));
      let score = Math.max(...lineScores);
      if (e.o.customId) score += 50;
      if (baseUnlocked(e.o)) score += 3;
      hits.push({ ...e, score, bestPair });
    }
    hits.sort((a, b) => b.score - a.score);
    $('#hint').textContent = hits.length ? `${hits.length} match${hits.length > 1 ? 'es' : ''}` : '';
    if (!hits.length) {
      res.innerHTML = `<p class="empty-note">No match. Try fewer or different words — or tap “+ Add a line” to save this one.</p>`;
      return;
    }
    res.innerHTML = hits.slice(0, 40).map((h, idx) => {
      const o = h.o;
      const p = parseBuild(o.build);
      const who = o.sec.filter(s => s !== 'Main recipes').join(' › ');
      const pair = o.lines[h.bestPair] || [];
      const others = o.lines.filter((_, i) => i !== h.bestPair);
      return `<div class="order">
        <div class="who"><span>${esc(who)}</span>${o.customId ? `<button class="del-btn" data-del="${o.customId}">Delete</button>` : ''}</div>
        <div class="lines">
          ${pair.map((l, i) => `<p class="says${i ? ' alt' : ''}">${highlight(l, words)}</p>`).join('')}
          ${others.length ? `<button class="more" data-more="${idx}">${others.length} other way${others.length > 1 ? 's' : ''} customers say this</button>
            <div class="other" hidden>${others.map(pr => pr.map((l, i) => `<p class="says${i ? ' alt' : ''}">${highlight(l, words)}</p>`).join('')).join('')}</div>` : ''}
        </div>
        ${p.drinks.map(drinkHTML).join('')}
        ${p.notes.map(n => `<div class="drink"><div class="chips">${chip(n)}</div></div>`).join('')}
        ${o.note ? `<div class="drink"><div class="chips">${chip(o.note, 'add')}</div></div>` : ''}
      </div>`;
    }).join('');
  }
  let t;
  $('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(renderResults, 120); });
  $('#results').addEventListener('click', e => {
    const more = e.target.closest('[data-more]');
    if (more) { more.nextElementSibling.hidden = false; more.remove(); return; }
    const del = e.target.closest('[data-del]');
    if (del && confirm('Delete this saved line?')) {
      custom = custom.filter(c => c.id !== del.dataset.del); saveCustom(); renderResults();
    }
  });

  /* ---------- add your own line ---------- */
  function openAddLine() {
    const mine = RECIPES.filter(r => unlocked.has(r.id));
    const rest = RECIPES.filter(r => !unlocked.has(r.id));
    const opt = r => `<option value="${r.id}">${esc(r.name)}</option>`;
    openSheet(`
      <h2>Add a customer line</h2>
      <div class="sub">For orders that aren’t on the list yet. Saved on this device.</div>
      <div class="form">
        <label for="fSaid">What did the customer say?</label>
        <textarea id="fSaid">${esc($('#q').value)}</textarea>
        <label for="fDrink">What did they want?</label>
        <select id="fDrink">
          <optgroup label="My drinks">${mine.map(opt).join('')}</optgroup>
          <optgroup label="Other drinks">${rest.map(opt).join('')}</optgroup>
          <option value="">Something else (describe below)</option>
        </select>
        <label for="fNote">Changes or notes <span class="hint">(optional)</span></label>
        <input id="fNote" placeholder="e.g. + Whipped Cream, no ice, ×2">
        <button class="save-btn" id="fSave">Save line</button>
      </div>
    `);
    $('#fSave').addEventListener('click', () => {
      const said = $('#fSaid').value.trim();
      if (!said) { $('#fSaid').focus(); return; }
      custom.push({ id: 'c' + Date.now(), said, drinkId: $('#fDrink').value, note: $('#fNote').value.trim() });
      saveCustom(); closeSheet(); renderResults();
    });
  }
  $('#addLineBtn').addEventListener('click', openAddLine);

  /* ---------- start ---------- */
  const setHead = () => document.documentElement.style.setProperty('--head-h', $('.top').offsetHeight + 'px');
  setHead();
  addEventListener('resize', setHead);
  renderGrid();
  renderResults();
  showTab(load('bn.tab', 'recipes') === 'talk' ? 'talk' : 'recipes');

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
