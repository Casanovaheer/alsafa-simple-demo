/* Data layer shared by the patient page and the staff page.
   Demo only: everything lives in this browser's localStorage, so two tabs (or the two frames on demo.html)
   see the same appointments, ratings and points. */
(function () {
  const { Store, L, t, ref } = Q;

  const SEED_V = 4;
  const SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
  const DAYS_AHEAD = 14;
  const pad = n => String(n).padStart(2, '0');
  const dkey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseKey = k => { const p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const when = a => { const d = parseKey(a.date); const p = a.time.split(':').map(Number); d.setHours(p[0], p[1], 0, 0); return d.getTime(); };
  const works = (doc, d) => (doc.wd || [0, 1, 2, 3, 4, 6]).includes(d.getDay());
  const isActive = a => a.status === 'booked' || a.status === 'confirmed';
  const pname = x => (x && x.name && typeof x.name === 'object') ? L(x.name) : (x && x.name) || '';
  const branch = id => APP.brand.branches.find(b => b.id === id) || APP.brand.branches[0];
  const RW = () => APP.rewards;

  /* ---------- seed ---------- */
  function rng(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let x = Math.imul(s ^ s >>> 15, 1 | s); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
  const fakePhone = r => '05' + String(Math.floor(r() * 1e8)).padStart(8, '0');

  function seed() {
    // bump SEED_V when the sample data changes, so browsers that opened an older version start fresh
    if (Store.get('seeded', 0) === SEED_V) return;
    if (Store.get('seeded', 0)) Store.clear();
    const r = rng(20261110), P = APP.patients, now = Date.now(), H = 3600e3, t0 = today();
    // a fixed pool of sample patients (first and family names mixed, one mobile each),
    // so one person shows up across visits, ratings, points and the waiting list
    const first = P.map(x => ({ ar: x.ar.split(' ')[0], en: x.en.split(' ')[0] }));
    const fam = P.map(x => ({ ar: x.ar.split(' ').slice(1).join(' '), en: x.en.split(' ').slice(1).join(' ') }));
    const pool = [];
    for (let i = 0; i < 200; i++) {
      const f = first[i % 16], g = fam[(i * 7 + Math.floor(i / 16) * 3) % 16];
      pool.push({ name: { ar: f.ar + ' ' + g.ar, en: f.en + ' ' + g.en }, phone: fakePhone(r) });
    }
    const REG = 197; // the last three are brand-new sign-ups
    const pick = () => pool[Math.floor(r() * REG)];
    const appts = []; let n = 0;
    const mk = (doc, d, s, extra) => { const pt = pick(); return Object.assign({ id: 'A-' + (3100 + n++), name: pt.name, phone: pt.phone, doctor: doc.id, date: dkey(d), time: s, status: 'booked', by: r() > .35 ? 'portal' : 'staff', t: now - (2 + r() * 120) * H, seed: true }, extra); };
    // past three weeks: finished visits, so profiles have a history
    for (let i = 21; i >= 1; i--) {
      const d = addDays(t0, -i);
      APP.doctors.forEach(doc => {
        if (!works(doc, d)) return;
        SLOTS.forEach(s => { if (r() < .22) { const a = mk(doc, d, s); a.status = 'done'; a.t = when(a) - (24 + r() * 72) * H; appts.push(a); } });
      });
    }
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const d = addDays(t0, i);
      APP.doctors.forEach(doc => {
        if (!works(doc, d)) return;
        // Dr Khalid's first working day after today is full, so the waiting list has something to do
        const full = doc.id === 'khalid' && i > 0 && !appts.some(a => a.full);
        const p = full ? 1 : Math.max(.15, .5 - i * .03);
        SLOTS.forEach(s => {
          if (r() > p) return;
          const a = mk(doc, d, s);
          if (full) a.full = true;
          if (when(a) < now) a.status = 'done';
          else if (i === 1 && r() > .45) a.status = 'confirmed';
          appts.push(a);
        });
      });
    }
    // patient cancellations from the past week, most refilled from the waiting list on their own
    const future = appts.filter(a => isActive(a) && when(a) > now && !a.full);
    [[2, 1], [5, 1], [9, 0], [14, 1], [20, 1], [26, 0], [31, 1]].forEach(([k, refill], j) => {
      const src = future[(k * 3) % future.length]; if (!src) return;
      const pt = pick();
      const c = Object.assign({}, src, { id: 'A-' + (3000 + j), name: pt.name, phone: pt.phone, status: 'cancelled', cancelledBy: j === 4 ? 'staff' : 'patient', cancelledAt: now - (5 + j * 17) * H, cancelReason: ['cant', 'better', 'mistake', 'other'][j % 4] });
      if (refill) { src.by = 'waitlist'; src.fromWaitlist = true; c.refilledBy = src.id; } else src.status = 'gone';
      appts.push(c);
    });
    Store.set('appts', appts.filter(a => a.status !== 'gone'));

    // waiting list: one "any day" patient per doctor, plus two for Dr Khalid's full day
    const kDay = (appts.find(a => a.full) || {}).date;
    const wl = APP.doctors.map((doc, i) => { const pt = pool[(i * 5 + 3) % REG]; return { id: 'W-' + (210 + i), name: pt.name, phone: pt.phone, doctor: doc.id, date: null, t: now - (3 + i * 7) * H, status: 'waiting' }; });
    if (kDay) wl.unshift({ id: 'W-209', name: pool[11].name, phone: pool[11].phone, doctor: 'khalid', date: kDay, t: now - 2 * H, status: 'waiting' },
      { id: 'W-208', name: pool[6].name, phone: pool[6].phone, doctor: 'khalid', date: kDay, t: now - 9 * H, status: 'waiting' });
    Store.set('waitlist', wl);

    // ratings from the last two weeks, each from someone who really visited (every third one is anonymous)
    const done = appts.filter(a => a.status === 'done').sort((x, y) => when(y) - when(x));
    const ratings = [];
    for (let i = 0; i < 26; i++) {
      const s = APP.sampleNotes[i % APP.sampleNotes.length], v = done[(i * 3) % done.length], anon = i % 3 === 0;
      ratings.push({ id: 'R-' + (5200 - i), name: anon ? null : v.name, phone: anon ? null : v.phone, stars: s.s, tags: s.tags, note: { ar: s.ar, en: s.en }, doctor: v.doctor, t: Math.min(now - 1.5 * H, when(v) + (3 + i % 5) * H), google: s.s >= 4 && i % 2 === 0, pts: anon ? 0 : RW().perRating, seed: true });
    }
    Store.set('ratings', ratings);

    // points: welcome when they first signed up, +50 per finished visit, +100 per rating
    const wallets = {}, vouchers = [];
    const wal = (ph, nm) => wallets[ph] || (wallets[ph] = { name: nm, points: 0, history: [] });
    done.forEach(x => wal(x.phone, x.name).history.push({ t: when(x) + H, pts: RW().perVisit, kind: 'visit' }));
    ratings.filter(x => x.phone).forEach(x => wal(x.phone, x.name).history.push({ t: x.t, pts: RW().perRating, kind: 'rating', rating: x.id }));
    Object.keys(wallets).forEach(ph => {
      const w = wallets[ph], at = Math.min.apply(null, w.history.map(h => h.t)) - 26 * H;
      w.history.push({ t: at, pts: RW().welcome, kind: 'welcome' }); w.joined = at;
    });
    const codes = ['K7Q2', 'M3XA', 'R8TP', 'D4NW', 'H2ZC', 'P9LB', 'T5VE', 'B6GR'];
    Object.keys(wallets).forEach((ph, i) => {
      const w = wallets[ph]; w.points = w.history.reduce((s, h) => s + h.pts, 0);
      if (i % 3 === 0 && vouchers.length < codes.length) {
        const rw = RW().catalog[vouchers.length % 3];
        if (w.points < rw.pts) return;
        const at = Math.max.apply(null, w.history.map(h => h.t)) + 20 * H, used = vouchers.length % 3 !== 2;
        if (at > now) return;
        vouchers.push({ code: RW().prefix + '-' + codes[vouchers.length], phone: ph, name: w.name, reward: rw.id, pts: rw.pts, t: at, expires: at + RW().voucherDays * 864e5, used, usedAt: used ? Math.min(now - H, at + 26 * H) : null });
        w.points -= rw.pts; w.history.push({ t: at, pts: -rw.pts, kind: 'redeem', reward: rw.id });
      }
    });
    // three patients who signed up on the portal in the last day, so "new user" shows in the bell
    const fresh = [];
    [[pool[197], 1.2], [pool[198], 4.5], [pool[199], 27]].forEach(([pt, hAgo], i) => {
      const at = now - hAgo * H;
      wallets[pt.phone] = { name: pt.name, points: RW().welcome, history: [{ t: at, pts: RW().welcome, kind: 'welcome' }], joined: at };
      fresh.push({ id: 'N-' + (900 + i), type: 'new_user', t: at, phone: pt.phone, name: pt.name });
    });
    Store.set('wallets', wallets);
    Store.set('vouchers', vouchers);
    Store.set('alerts', fresh);
    Store.set('vcf_saves', 84);
    Store.set('seeded', SEED_V);
  }

  /* ---------- alerts for the staff page ---------- */
  function alert(type, data) { Store.push('alerts', Object.assign({ id: ref('N'), type, t: Date.now() }, data), 60); }

  /* ---------- appointments ---------- */
  const appts = () => Store.get('appts', []);
  const save = a => Store.set('appts', a);
  const byId = id => appts().find(a => a.id === id);
  function days(docId) {
    const doc = Q.doctor(docId), t0 = today(), out = [];
    for (let i = 0; i < DAYS_AHEAD; i++) { const d = addDays(t0, i); if (works(doc, d)) out.push(dkey(d)); }
    return out;
  }
  function slots(docId, date) {
    const taken = appts().filter(a => a.doctor === docId && a.date === date && isActive(a)).map(a => a.time);
    const soon = Date.now() + 30 * 60e3;
    return SLOTS.map(s => ({ time: s, state: when({ date, time: s }) < soon ? 'past' : taken.includes(s) ? 'taken' : 'free' }));
  }
  const freeCount = (docId, date) => slots(docId, date).filter(s => s.state === 'free').length;
  function nextFree(docId) {
    for (const d of days(docId)) { const s = slots(docId, d).find(x => x.state === 'free'); if (s) return { date: d, time: s.time }; }
    return null;
  }
  function book(o) {
    const s = slots(o.doctor, o.date).find(x => x.time === o.time);
    if (!s || s.state !== 'free') return null;
    const a = { id: ref('A'), name: o.name, phone: o.phone, doctor: o.doctor, date: o.date, time: o.time, status: 'booked', by: o.by || 'portal', t: Date.now() };
    const all = appts(); all.unshift(a); save(all);
    if (a.by !== 'staff') alert('book', { appt: a.id });
    return a;
  }
  /* Cancelling frees the slot at once. The first waiting-list patient for that doctor
     (that day, or "any day") gets it automatically, and the staff page shows both. */
  function cancel(id, by, reason) {
    const all = appts(), x = all.find(a => a.id === id);
    if (!x || !isActive(x)) return null;
    Object.assign(x, { status: 'cancelled', cancelledBy: by, cancelReason: reason || '', cancelledAt: Date.now() });
    let filled = null;
    if (when(x) > Date.now()) {
      const wl = Store.get('waitlist', []);
      const w = wl.find(v => v.status === 'waiting' && v.doctor === x.doctor && (!v.date || v.date === x.date));
      if (w) {
        filled = { id: ref('A'), name: w.name, phone: w.phone, doctor: x.doctor, date: x.date, time: x.time, status: 'booked', by: 'waitlist', fromWaitlist: true, t: Date.now(), replaces: x.id };
        all.unshift(filled); x.refilledBy = filled.id;
        Object.assign(w, { status: 'booked', apptId: filled.id, bookedAt: Date.now() });
        Store.set('waitlist', wl);
      }
    }
    save(all);
    alert(by === 'staff' ? 'staff_cancel' : 'cancel', { appt: x.id, filled: filled && filled.id, reason: reason || '' });
    return { appt: x, filled };
  }
  function remove(id) { save(appts().filter(a => a.id !== id)); }
  function joinWait(o) {
    const w = { id: ref('W'), name: o.name, phone: o.phone, doctor: o.doctor, date: o.date || null, t: Date.now(), status: 'waiting' };
    Store.push('waitlist', w); alert('wait', { wait: w.id });
    return w;
  }
  const mine = phone => appts().filter(a => a.phone === phone).sort((a, b) => when(a) - when(b));

  /* ---------- the signed-in patient ---------- */
  const me = () => Store.get('me', null);
  function signIn(name, phone) {
    const first = !Store.get('wallets', {})[phone];
    Store.set('me', { name, phone });
    if (first) earn(phone, name, RW().welcome, 'welcome');
    // demo: give the new patient one upcoming visit on Dr Khalid's full day, so "cancel" can be tried
    // straight away and the waiting list refills it
    if (!mine(phone).some(a => isActive(a) && when(a) > Date.now())) {
      const all = appts(), x = all.filter(a => a.full && isActive(a) && when(a) > Date.now()).sort((a, b) => when(a) - when(b))[0];
      if (x) { Object.assign(x, { name, phone, by: 'portal', demoMine: true }); save(all); }
    }
    if (first) alert('new_user', { phone, name });
    return me();
  }
  function signOut() { Store.set('me', null); }

  /* ---------- reward points ---------- */
  const wallets = () => Store.get('wallets', {});
  const wallet = phone => wallets()[phone] || { name: '', points: 0, history: [] };
  const reward = id => RW().catalog.find(c => c.id === id);
  function earn(phone, name, pts, kind, extra) {
    if (!phone || !pts) return wallet(phone);
    const all = wallets(), w = all[phone] || (all[phone] = { name, points: 0, history: [], joined: Date.now() });
    if (name) w.name = name;
    w.points += pts; w.history.unshift(Object.assign({ t: Date.now(), pts, kind }, extra || {}));
    Store.set('wallets', all);
    return w;
  }
  function nextReward(points) {
    const c = RW().catalog.slice().sort((a, b) => a.pts - b.pts);
    return c.find(x => x.pts > points) || null;
  }
  function redeem(phone, id) {
    const rw = reward(id), all = wallets(), w = all[phone];
    if (!rw || !w || w.points < rw.pts) return null;
    const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = RW().prefix + '-'; for (let i = 0; i < 4; i++) code += A[Math.floor(Math.random() * A.length)];
    const v = { code, phone, name: w.name, reward: id, pts: rw.pts, t: Date.now(), expires: Date.now() + RW().voucherDays * 864e5, used: false };
    w.points -= rw.pts; w.history.unshift({ t: Date.now(), pts: -rw.pts, kind: 'redeem', reward: id, code });
    Store.set('wallets', all); Store.push('vouchers', v);
    alert('redeem', { phone, name: w.name, code, reward: id });
    return v;
  }
  const myVouchers = phone => Store.get('vouchers', []).filter(v => v.phone === phone);
  function useVoucher(code) {
    code = Q.toLatin(code).trim().toUpperCase();
    if (code && !code.includes('-')) code = RW().prefix + '-' + code;
    const vs = Store.get('vouchers', []), v = vs.find(x => x.code === code);
    if (!v) return { r: 'notfound' };
    if (v.used) return { r: 'used', v };
    if (v.expires < Date.now()) return { r: 'expired', v };
    v.used = true; v.usedAt = Date.now(); Store.set('vouchers', vs);
    return { r: 'ok', v };
  }

  /* ---------- ratings ---------- */
  const ratings = () => Store.get('ratings', []);
  function rate(o) {
    const m = me();
    const x = { id: ref('R'), name: m ? m.name : null, phone: m ? m.phone : null, stars: o.stars, tags: o.tags || [], note: o.note || '', t: Date.now(), google: false, pts: 0 };
    if (m) { earn(m.phone, m.name, RW().perRating, 'rating', { rating: x.id }); x.pts = RW().perRating; }
    Store.push('ratings', x);
    alert('rating', { rating: x.id, stars: x.stars });
    return x;
  }
  /* A guest rated first and signed in after: give the points for that rating now */
  function claim(ratingId) {
    const m = me(), all = ratings(), x = all.find(r => r.id === ratingId);
    if (!m || !x || x.pts) return null;
    Object.assign(x, { name: m.name, phone: m.phone, pts: RW().perRating }); Store.set('ratings', all);
    return earn(m.phone, m.name, RW().perRating, 'rating', { rating: x.id });
  }
  function markGoogle(ratingId) {
    const all = ratings(), x = all.find(r => r.id === ratingId);
    if (x) { x.google = true; Store.set('ratings', all); }
    alert('google', { rating: ratingId });
  }

  /* ---------- contact card (.vcf) and calendar file (.ics) ---------- */
  function vcard() {
    const B = APP.brand, lines = ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + L(B.name), 'ORG:' + L(B.name)];
    B.branches.forEach(b => lines.push('TEL;TYPE=WORK,VOICE:' + b.phone.replace(/^0/, '+966')));
    lines.push('TEL;TYPE=CELL:+' + B.whatsapp);
    if (B.email) lines.push('EMAIL;TYPE=WORK:' + B.email);
    if (B.website) lines.push('URL:' + B.website);
    lines.push('NOTE:' + t('vcf_note'), 'END:VCARD');
    return lines.join('\r\n');
  }
  function ics(a) {
    const s = new Date(when(a)), e = new Date(when(a) + 30 * 60e3);
    const f = x => x.getFullYear() + pad(x.getMonth() + 1) + pad(x.getDate()) + 'T' + pad(x.getHours()) + pad(x.getMinutes()) + '00';
    const doc = Q.doctor(a.doctor);
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Alsafa demo//EN', 'BEGIN:VEVENT', 'UID:' + a.id + '@alsafa-demo', 'DTSTART:' + f(s), 'DTEND:' + f(e),
      'SUMMARY:' + L(doc.name) + ' - ' + L(APP.brand.name), 'LOCATION:' + L(branch(doc.branch).name),
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  function download(text, file, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = file; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function contactSaved() { Store.set('vcf_saves', Store.get('vcf_saves', 0) + 1); alert('vcf', {}); }
  function reset() { Store.clear(); seed(); }

  window.BK = { SLOTS, dkey, parseKey, today, addDays, when, isActive, pname, branch, days, slots, freeCount, nextFree,
    appts, byId, book, cancel, remove, joinWait, mine, me, signIn, signOut,
    wallets, wallet, reward, earn, nextReward, redeem, myVouchers, useVoucher,
    ratings, rate, claim, markGoogle, vcard, ics, download, contactSaved, reset, seed };
  seed();
})();
