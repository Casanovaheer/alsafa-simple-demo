/* Patient page: three things only. 1) book and cancel  2) rate, earn points, Google  3) save the care number */
(function () {
  const { Store, L, t, esc, icon, avatar, fmt, slot, num, toast, sheet, doctor, spec, toLatin } = Q;
  const view = document.getElementById('view');
  const RW = APP.rewards;
  let route = 'home';

  /* ---------- small helpers ---------- */
  function dayLabel(key) {
    const d = BK.parseKey(key), diff = Math.round((d - BK.today()) / 864e5);
    const date = fmt(d, { day: 'numeric', month: 'long' });
    if (diff === 0) return t('today') + ' · ' + date;
    if (diff === 1) return t('tomorrow') + ' · ' + date;
    return fmt(d, { weekday: 'long' }) + ' · ' + date;
  }
  const first = n => String(n || '').trim().split(/\s+/)[0];
  const upcoming = phone => BK.mine(phone).filter(a => BK.isActive(a) && BK.when(a) > Date.now());
  function head(title, sub, backAttr) {
    return '<div class="page-head"><a class="back" ' + (backAttr || 'href="#home"') + ' aria-label="' + esc(t('back')) + '">' + icon('back') + '</a>' +
      '<div><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div></div>';
  }
  function progress(points) {
    const nx = BK.nextReward(points);
    if (!nx) return '<p class="prog-txt">' + esc(t('pt_all')) + '</p>';
    const pct = Math.min(100, Math.round(points / nx.pts * 100));
    return '<div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="' + nx.pts + '" aria-valuenow="' + points + '"><span style="width:' + pct + '%"></span></div>' +
      '<p class="prog-txt">' + esc(t('pt_next', { n: num(nx.pts - points), r: L(nx.title) })) + '</p>';
  }

  /* ---------- sign in (mobile + demo code) ---------- */
  function signIn(reason, done) {
    const s = sheet(
      '<div class="sh-ic">' + icon('user') + '</div><h2>' + esc(t('si_t')) + '</h2><p class="muted">' + esc(reason || t('si_d')) + '</p>' +
      '<form id="siF" novalidate>' +
      '<label class="fld"><span>' + esc(t('f_name')) + '</span><input name="name" autocomplete="name" required></label>' +
      '<label class="fld"><span>' + esc(t('f_phone')) + '</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="05XXXXXXXX" dir="ltr" required></label>' +
      '<div class="otp" hidden><div class="sms">' + icon('chat') + '<span>' + esc(t('sms_demo')) + '</span><b class="code" dir="ltr"></b></div>' +
      '<label class="fld"><span>' + esc(t('f_code')) + '</span><input name="code" inputmode="numeric" maxlength="4" dir="ltr" autocomplete="one-time-code" class="code-in"></label></div>' +
      '<p class="err" role="alert"></p>' +
      '<button class="btn primary block lg" type="submit">' + esc(t('si_send')) + '</button></form>');
    const f = s.el.querySelector('#siF'), err = f.querySelector('.err'), btn = f.querySelector('button[type=submit]');
    let code = null;
    f.addEventListener('submit', e => {
      e.preventDefault(); err.textContent = '';
      const name = f.name.value.trim(), phone = toLatin(f.phone.value).replace(/[\s-]/g, '').replace(/^\+?966/, '0');
      if (name.length < 2) { err.textContent = t('e_name'); f.name.focus(); return; }
      if (!/^05\d{8}$/.test(phone)) { err.textContent = t('e_phone'); f.phone.focus(); return; }
      if (!code) {
        code = String(Math.floor(1000 + Math.random() * 9000));
        f.querySelector('.otp').hidden = false; f.querySelector('.code').textContent = code;
        btn.textContent = t('si_enter'); f.code.focus(); return;
      }
      if (toLatin(f.code.value).trim() !== code) { err.textContent = t('e_code'); f.code.focus(); return; }
      const isNew = !BK.wallets()[phone];
      BK.signIn(name, phone); s.close();
      toast(isNew ? t('si_welcome', { n: RW.welcome }) : t('si_ok'));
      paintUser();
      if (done) done(); else render();
    });
  }
  function account() {
    const m = BK.me();
    if (!m) return signIn();
    const s = sheet('<div class="sh-ic">' + icon('user') + '</div><h2>' + esc(m.name) + '</h2><p class="muted" dir="ltr">' + esc(m.phone) + '</p>' +
      '<div class="sheet-row"><a class="btn ghost block" href="#points" data-close>' + icon('gift') + esc(t('pt_mine')) + '</a>' +
      '<button class="btn ghost block" type="button" id="soBtn">' + icon('logout') + esc(t('sign_out')) + '</button></div>');
    s.el.querySelector('#soBtn').addEventListener('click', () => { BK.signOut(); s.close(); paintUser(); location.hash = '#home'; render(); });
  }
  function paintUser() {
    const b = document.getElementById('userBtn'), m = BK.me();
    b.innerHTML = m ? '<span class="me-av">' + esc(first(m.name).charAt(0)) + '</span>' : icon('user');
    b.setAttribute('aria-label', m ? m.name : t('si_t'));
  }

  /* =========================================================
     HOME
     ========================================================= */
  function home() {
    const m = BK.me(), w = m ? BK.wallet(m.phone) : null, up = m ? upcoming(m.phone)[0] : null;
    view.innerHTML =
      '<section class="hero">' +
        '<p class="hello">' + esc(m ? t('hello_name', { n: first(m.name) }) : t('hello')) + '</p>' +
        '<h1>' + esc(t('home_h')) + '</h1>' +
        '<p class="hero-sub">' + esc(t('home_sub')) + '</p>' +
        (m ? '<a class="pts-pill" href="#points">' + icon('sparkle') + '<b>' + num(w.points) + '</b> ' + esc(t('pts_word')) + '</a>' : '') +
      '</section>' +
      '<ol class="actions">' +
        '<li><a class="act a1" href="#appts"><span class="act-ic">' + icon('calendar') + '</span><span class="act-txt"><small class="act-n">' + esc(t('step', { n: 1 })) + '</small><b>' + esc(t('a1_t')) + '</b><span>' + esc(t('a1_d')) + '</span></span>' + icon('chevron', 'chev') + '</a></li>' +
        '<li><a class="act a2" href="#rate"><span class="act-ic">' + icon('star') + '</span><span class="act-txt"><small class="act-n">' + esc(t('step', { n: 2 })) + '</small><b>' + esc(t('a2_t')) + '</b><span>' + esc(t('a2_d', { n: RW.perRating })) + '</span></span>' + icon('chevron', 'chev') + '</a></li>' +
        '<li><button class="act a3" type="button" data-care><span class="act-ic">' + icon('contact') + '</span><span class="act-txt"><small class="act-n">' + esc(t('step', { n: 3 })) + '</small><b>' + esc(t('a3_t')) + '</b><span>' + esc(t('a3_d')) + '</span></span>' + icon('chevron', 'chev') + '</button></li>' +
      '</ol>' +
      (up ? nextCard(up) : '') +
      (m ? '<a class="pts-card" href="#points"><div class="pts-top"><span class="pts-ic">' + icon('gift') + '</span><div><small>' + esc(t('pt_balance')) + '</small><b>' + num(w.points) + ' <span>' + esc(t('pts_word')) + '</span></b></div>' + icon('chevron', 'chev') + '</div>' + progress(w.points) + '</a>'
         : '<div class="pts-card guest"><div class="pts-top"><span class="pts-ic">' + icon('gift') + '</span><div><b class="g">' + esc(t('pt_guest_t')) + '</b><small>' + esc(t('pt_guest_d', { n: RW.welcome })) + '</small></div></div><button class="btn amber block" type="button" data-signin>' + esc(t('si_short')) + '</button></div>');
  }
  function nextCard(a) {
    const doc = doctor(a.doctor);
    return '<a class="next" href="#appts">' + avatar(doc) + '<div><small>' + esc(t('next_appt')) + '</small><b>' + esc(dayLabel(a.date)) + ' · ' + esc(slot(a.time)) + '</b><span>' + esc(L(doc.name)) + '</span></div>' + icon('chevron', 'chev') + '</a>';
  }

  /* =========================================================
     1) APPOINTMENTS: list, cancel
     ========================================================= */
  const statusChip = a => {
    const k = a.status === 'cancelled' ? 'bad' : a.status === 'done' ? 'mute' : 'ok';
    return '<span class="chip ' + k + '">' + esc(t('st_' + a.status)) + '</span>';
  };
  function appts() {
    const m = BK.me();
    let h = head(t('ap_t'), t('ap_sub'));
    if (!m) {
      h += '<div class="card guest-card"><span class="big-ic">' + icon('calendar') + '</span><p>' + esc(t('ap_guest')) + '</p><button class="btn primary block lg" type="button" data-signin>' + esc(t('si_short')) + '</button></div>' +
        '<a class="btn ghost block lg" href="#book">' + icon('plus') + esc(t('ap_new')) + '</a>';
      view.innerHTML = h; return;
    }
    const all = BK.mine(m.phone), up = all.filter(a => BK.isActive(a) && BK.when(a) > Date.now()), past = all.filter(a => !up.includes(a)).reverse();
    h += '<a class="btn primary block lg" href="#book">' + icon('plus') + esc(t('ap_new')) + '</a>';
    h += '<h2 class="sec">' + esc(t('ap_upcoming')) + '</h2>';
    h += up.length ? up.map(apptCard).join('') : '<div class="card empty">' + icon('calendar') + '<p>' + esc(t('ap_none')) + '</p></div>';
    if (past.length) h += '<details class="past"><summary>' + esc(t('ap_past')) + ' <span class="cnt">' + past.length + '</span></summary>' + past.map(pastRow).join('') + '</details>';
    view.innerHTML = h;
  }
  function apptCard(a) {
    const doc = doctor(a.doctor);
    return '<article class="appt">' +
      '<div class="appt-top">' + avatar(doc) + '<div class="who"><b>' + esc(L(doc.name)) + '</b><small>' + esc(L(spec(doc.spec).name)) + ' · ' + esc(L(BK.branch(doc.branch).name)) + '</small></div>' + statusChip(a) + '</div>' +
      '<div class="appt-when"><span>' + icon('calendar') + esc(dayLabel(a.date)) + '</span><span>' + icon('clock') + esc(slot(a.time)) + '</span></div>' +
      (a.demoMine ? '<p class="demo-note">' + icon('sparkle') + esc(t('ap_demo_note')) + '</p>' : '') +
      '<div class="appt-act"><button class="btn danger-soft" type="button" data-cancel="' + a.id + '">' + icon('calx') + esc(t('ap_cancel')) + '</button>' +
      '<button class="btn ghost" type="button" data-ics="' + a.id + '">' + icon('calcheck') + esc(t('ap_cal')) + '</button></div></article>';
  }
  function pastRow(a) {
    const doc = doctor(a.doctor);
    return '<div class="past-row"><div><b>' + esc(L(doc.name)) + '</b><small>' + esc(dayLabel(a.date)) + ' · ' + esc(slot(a.time)) + '</small></div>' + statusChip(a) + '</div>';
  }
  function cancelFlow(id) {
    const a = BK.byId(id); if (!a) return;
    const doc = doctor(a.doctor);
    const reasons = ['cant', 'better', 'mistake', 'other'];
    const s = sheet('<div class="sh-ic bad">' + icon('calx') + '</div><h2>' + esc(t('cx_t')) + '</h2>' +
      '<p class="muted">' + esc(L(doc.name)) + ' · ' + esc(dayLabel(a.date)) + ' · ' + esc(slot(a.time)) + '</p>' +
      '<p class="lbl">' + esc(t('cx_why')) + '</p><div class="chips" role="radiogroup">' +
      reasons.map(r => '<button type="button" class="chip-btn" role="radio" aria-checked="false" data-r="' + r + '">' + esc(t('r_' + r)) + '</button>').join('') + '</div>' +
      '<div class="sheet-row"><button class="btn danger block lg" type="button" id="cxYes">' + esc(t('cx_yes')) + '</button><button class="btn ghost block lg" type="button" data-close>' + esc(t('cx_no')) + '</button></div>');
    let reason = '';
    s.el.querySelectorAll('[data-r]').forEach(b => b.addEventListener('click', () => {
      reason = reason === b.dataset.r ? '' : b.dataset.r;
      s.el.querySelectorAll('[data-r]').forEach(x => x.setAttribute('aria-checked', String(x.dataset.r === reason)));
    }));
    s.el.querySelector('#cxYes').addEventListener('click', () => {
      const res = BK.cancel(id, 'patient', reason); s.close();
      if (!res) return toast(t('e_gen'), 'err');
      render();
      sheet('<div class="sh-ic ok">' + icon('check') + '</div><h2>' + esc(t('cx_done')) + '</h2>' +
        '<ul class="ticks"><li>' + icon('check') + esc(t('cx_d1')) + '</li><li>' + icon('check') + esc(t('cx_d2')) + '</li>' +
        (res.filled ? '<li>' + icon('repeat') + esc(t('cx_d3')) + '</li>' : '') + '</ul>' +
        '<div class="sheet-row"><a class="btn primary block lg" href="#book" data-close>' + esc(t('cx_rebook')) + '</a><button class="btn ghost block lg" type="button" data-close>' + esc(t('close')) + '</button></div>');
    });
  }

  /* =========================================================
     1b) BOOK: doctor → time → confirm
     ========================================================= */
  let B = { step: 1, sp: 'all', doc: null, date: null, time: null, done: null };
  function book() {
    if (B.done) return bookDone();
    const steps = [t('bs_doc'), t('bs_time'), t('bs_ok')];
    let h = head(t('bk_t'), '', B.step > 1 ? 'href="#book" data-bstep="' + (B.step - 1) + '"' : 'href="#appts"');
    h += '<ol class="stepper">' + steps.map((s, i) => '<li class="' + (i + 1 < B.step ? 'done' : i + 1 === B.step ? 'on' : '') + '"' + (i + 1 === B.step ? ' aria-current="step"' : '') + '><span class="dot">' + (i + 1 < B.step ? icon('check') : i + 1) + '</span><span class="lb">' + esc(s) + '</span></li>').join('') + '</ol>';
    if (B.step === 1) h += bookDoc();
    else if (B.step === 2) h += bookTime();
    else h += bookConfirm();
    view.innerHTML = h;
    Q.hcenter(view.querySelector('.days .on'));
  }
  function bookDoc() {
    const used = APP.specialties.filter(s => APP.doctors.some(d => d.spec === s.id));
    let h = '<div class="chips scroll">' + ['all'].concat(used.map(s => s.id)).map(id => '<button type="button" class="chip-btn" aria-pressed="' + (B.sp === id) + '" data-sp="' + id + '">' + esc(id === 'all' ? t('all') : L(spec(id).name)) + '</button>').join('') + '</div>';
    h += '<div class="docs">' + APP.doctors.filter(d => B.sp === 'all' || d.spec === B.sp).map(d => {
      const nx = BK.nextFree(d.id);
      return '<button type="button" class="doc" data-doc="' + d.id + '">' + avatar(d, 'lg') + '<span class="who"><b>' + esc(L(d.name)) + '</b><small>' + esc(L(d.title)) + '</small>' +
        '<span class="nx ' + (nx ? '' : 'none') + '">' + icon('clock') + esc(nx ? t('bk_next', { d: dayLabel(nx.date).split(' · ')[0], s: slot(nx.time) }) : t('bk_nonext')) + '</span></span>' + icon('chevron', 'chev') + '</button>';
    }).join('') + '</div>';
    h += '<p class="note">' + esc(t('bk_sample')) + '</p>';
    return h;
  }
  function bookTime() {
    const d = doctor(B.doc), days = BK.days(B.doc);
    if (!B.date || !days.includes(B.date)) B.date = (BK.nextFree(B.doc) || { date: days[0] }).date;
    let h = '<div class="pick-doc">' + avatar(d) + '<div><b>' + esc(L(d.name)) + '</b><small>' + esc(L(BK.branch(d.branch).name)) + '</small></div><button type="button" class="link" data-bstep="1">' + esc(t('change')) + '</button></div>';
    h += '<p class="lbl">' + esc(t('bk_day')) + '</p><div class="days" role="listbox">' + days.map(k => {
      const dt = BK.parseKey(k), free = BK.freeCount(B.doc, k), diff = Math.round((dt - BK.today()) / 864e5);
      return '<button type="button" role="option" aria-selected="' + (k === B.date) + '" class="day' + (k === B.date ? ' on' : '') + (free ? '' : ' full') + '" data-day="' + k + '">' +
        '<small>' + esc(diff === 0 ? t('today') : diff === 1 ? t('tomorrow') : fmt(dt, { weekday: 'short' })) + '</small><b>' + dt.getDate() + '</b><span>' + esc(free ? t('bk_free', { n: free }) : t('bk_full')) + '</span></button>';
    }).join('') + '</div>';
    const sl = BK.slots(B.doc, B.date).filter(s => s.state !== 'past'), free = sl.filter(s => s.state === 'free');
    if (!free.length) {
      h += '<div class="card full-card"><span class="big-ic">' + icon('users') + '</span><b>' + esc(t('bk_full_t')) + '</b><p>' + esc(t('bk_full_d')) + '</p>' +
        '<button class="btn primary block lg" type="button" data-wait>' + icon('bell') + esc(t('bk_wait')) + '</button></div>';
      return h;
    }
    const part = (title, list) => list.length ? '<p class="lbl">' + esc(title) + '</p><div class="slots">' + list.map(s =>
      '<button type="button" class="slot' + (s.time === B.time ? ' on' : '') + '" data-slot="' + s.time + '" ' + (s.state !== 'free' ? 'disabled aria-disabled="true"' : '') + ' aria-pressed="' + (s.time === B.time) + '">' + esc(slot(s.time)) + '</button>').join('') + '</div>' : '';
    h += '<p class="note">' + icon('clock') + esc(t('bk_tap_time')) + '</p>';
    h += part(t('bk_morning'), sl.filter(s => +s.time.slice(0, 2) < 12)) + part(t('bk_evening'), sl.filter(s => +s.time.slice(0, 2) >= 12));
    return h;
  }
  function bookConfirm() {
    const d = doctor(B.doc), m = BK.me();
    return '<div class="ticket">' + row(t('tk_doc'), L(d.name)) + row(t('tk_clinic'), L(spec(d.spec).name)) + row(t('tk_day'), dayLabel(B.date)) + row(t('tk_time'), slot(B.time)) + row(t('tk_branch'), L(BK.branch(d.branch).name)) +
      (m ? row(t('tk_patient'), m.name + ' · ' + m.phone) : '') + '</div>' +
      (m ? '' : '<p class="note">' + icon('shield') + esc(t('bk_need_si')) + '</p>') +
      '<div class="sticky-cta"><button class="btn primary block lg" type="button" id="bkGo">' + icon('check') + esc(t('bk_confirm')) + '</button></div>';
  }
  const row = (k, v) => '<div class="tk-row"><span>' + esc(k) + '</span><b>' + esc(v) + '</b></div>';
  function doBook() {
    const m = BK.me();
    if (!m) return signIn(t('si_book'), doBook);
    const a = BK.book({ name: m.name, phone: m.phone, doctor: B.doc, date: B.date, time: B.time });
    if (!a) { toast(t('e_taken'), 'err'); B.step = 2; B.time = null; return render(); }
    B.done = a; render();
  }
  function bookDone() {
    const a = B.done, d = doctor(a.doctor);
    view.innerHTML = '<div class="done-view"><div class="done-ic">' + icon('check') + '</div><h1>' + esc(t('bk_done')) + '</h1><p class="muted">' + esc(t('bk_done_d')) + '</p>' +
      '<div class="ticket">' + row(t('tk_no'), a.id) + row(t('tk_doc'), L(d.name)) + row(t('tk_day'), dayLabel(a.date)) + row(t('tk_time'), slot(a.time)) + row(t('tk_branch'), L(BK.branch(d.branch).name)) + '</div>' +
      '<button class="btn ghost block lg" type="button" data-ics="' + a.id + '">' + icon('calcheck') + esc(t('ap_cal')) + '</button>' +
      '<a class="btn primary block lg" href="#appts" data-reset-book>' + esc(t('ap_mine')) + '</a></div>';
  }
  function joinWait() {
    const m = BK.me();
    if (!m) return signIn(t('si_wait'), joinWait);
    BK.joinWait({ name: m.name, phone: m.phone, doctor: B.doc, date: B.date });
    sheet('<div class="sh-ic ok">' + icon('bell') + '</div><h2>' + esc(t('wl_done')) + '</h2><p class="muted">' + esc(t('wl_done_d')) + '</p><button class="btn primary block lg" type="button" data-close>' + esc(t('ok')) + '</button>');
  }

  /* =========================================================
     2) RATE → POINTS → GOOGLE
     ========================================================= */
  let RT = { stars: 0, tags: [], note: '', done: null };
  const TAGS = ['doctor', 'reception', 'wait', 'clean', 'booking', 'parking'];
  function rate() {
    if (RT.done) return thanks();
    const m = BK.me();
    let h = head(t('rt_t'), t('rt_sub'));
    h += '<div class="card rate-card"><p class="q">' + esc(t('rt_q')) + '</p><div class="stars" role="radiogroup" aria-label="' + esc(t('rt_q')) + '">' +
      [1, 2, 3, 4, 5].map(n => '<button type="button" role="radio" aria-checked="' + (RT.stars === n) + '" aria-label="' + esc(t('rt_l' + n)) + '" class="star' + (n <= RT.stars ? ' on' : '') + '" data-star="' + n + '">' + icon('star') + '</button>').join('') +
      '</div><p class="star-lbl" aria-live="polite">' + esc(RT.stars ? t('rt_l' + RT.stars) : t('rt_tap')) + '</p></div>';
    if (RT.stars) {
      h += '<p class="lbl">' + esc(RT.stars >= 4 ? t('rt_good') : t('rt_bad')) + '</p><div class="chips">' +
        TAGS.map(g => '<button type="button" class="chip-btn" aria-pressed="' + RT.tags.includes(g) + '" data-tag="' + g + '">' + esc(t('tg_' + g)) + '</button>').join('') + '</div>' +
        '<label class="fld"><span>' + esc(t('rt_note')) + '</span><textarea id="rtNote" rows="3" maxlength="500" placeholder="' + esc(t('rt_note_ph')) + '">' + esc(RT.note) + '</textarea></label>';
    }
    h += '<div class="earn-banner">' + icon('gift') + '<span>' + esc(m ? t('rt_earn', { n: RW.perRating }) : t('rt_earn_guest', { n: RW.perRating })) + '</span></div>';
    h += '<div class="cta"><button class="btn primary block lg" type="button" id="rtGo" ' + (RT.stars ? '' : 'disabled') + '>' + icon('star') + esc(t('rt_send')) + '</button></div>';
    view.innerHTML = h;
  }
  function thanks() {
    const r = RT.done, m = BK.me(), w = m ? BK.wallet(m.phone) : null;
    let h = '<div class="done-view thanks">';
    if (r.pts) h += '<div class="burst" aria-hidden="true"><b dir="ltr">+' + r.pts + '</b><small>' + esc(t('pts_word')) + '</small></div>';
    else h += '<div class="done-ic">' + icon('check') + '</div>';
    h += '<h1>' + esc(t('th_t')) + '</h1>';
    if (r.pts) h += '<p class="muted">' + esc(t('th_got', { n: r.pts, b: num(w.points) })) + '</p><div class="card">' + progress(w.points) + '</div>';
    else h += '<div class="card claim"><b>' + esc(t('th_claim_t', { n: RW.perRating })) + '</b><p>' + esc(t('th_claim_d')) + '</p><button class="btn amber block lg" type="button" id="thClaim">' + esc(t('si_short')) + '</button></div>';
    if (r.stars <= 3) h += '<div class="card soft">' + icon('shield') + '<p>' + esc(m ? t('th_low_m') : t('th_low')) + '</p></div>';
    h += '<div class="g-card"><div class="g-top"><span class="g-ic">' + icon('google') + '</span><div><b>' + esc(t('g_t')) + '</b><p>' + esc(t('g_d')) + '</p></div></div>' +
      '<button class="btn google block lg" type="button" id="gGo">' + icon('star') + esc(t('g_btn')) + icon('external', 'sm') + '</button>' +
      (r.note ? '<p class="small muted">' + icon('copy', 'sm') + esc(t('g_copy')) + '</p>' : '') + '</div>';
    h += '<div class="sheet-row"><a class="btn primary block lg" href="#points">' + icon('gift') + esc(t('th_spend')) + '</a><a class="btn ghost block lg" href="#home">' + esc(t('home')) + '</a></div></div>';
    view.innerHTML = h;
  }
  function sendRating() {
    const note = (document.getElementById('rtNote') || {}).value || '';
    RT.note = note.trim();
    RT.done = BK.rate({ stars: RT.stars, tags: RT.tags, note: RT.note });
    render(); window.scrollTo(0, 0);
  }
  function openGoogle() {
    const r = RT.done;
    if (r && r.note && navigator.clipboard) navigator.clipboard.writeText(r.note).catch(() => {});
    if (r) BK.markGoogle(r.id);
    window.open(APP.brand.googleReviewUrl || APP.brand.mapsUrl, '_blank', 'noopener');
  }

  /* =========================================================
     POINTS AND REWARDS
     ========================================================= */
  function points() {
    const m = BK.me();
    let h = head(t('pt_t'), t('pt_sub'));
    if (!m) {
      h += '<div class="card guest-card"><span class="big-ic amber">' + icon('gift') + '</span><p>' + esc(t('pt_guest_d', { n: RW.welcome })) + '</p><button class="btn amber block lg" type="button" data-signin>' + esc(t('si_short')) + '</button></div>';
      h += catalog(0, false);
      view.innerHTML = h; return;
    }
    const w = BK.wallet(m.phone), vs = BK.myVouchers(m.phone).sort((a, b) => (a.used - b.used) || b.t - a.t);
    h += '<section class="wallet"><small>' + esc(t('pt_balance')) + '</small><b>' + num(w.points) + '<span> ' + esc(t('pts_word')) + '</span></b>' + progress(w.points) + '</section>';
    h += '<div class="earn-ways"><div>' + icon('calcheck') + '<span>' + esc(t('pt_visit')) + '</span><b dir="ltr">+' + RW.perVisit + '</b></div><a href="#rate">' + icon('star') + '<span>' + esc(t('pt_rate')) + '</span><b dir="ltr">+' + RW.perRating + '</b></a></div>';
    if (vs.length) h += '<h2 class="sec">' + esc(t('pt_vouchers')) + '</h2><div class="vlist">' + vs.map(v => {
      const rw = BK.reward(v.reward), st = v.used ? 'used' : v.expires < Date.now() ? 'exp' : 'ok';
      return '<button type="button" class="vrow ' + st + '" data-v="' + esc(v.code) + '">' + icon('ticket') + '<span><b>' + esc(L(rw.title)) + '</b><small dir="ltr">' + esc(v.code) + '</small></span><span class="chip ' + (st === 'ok' ? 'ok' : 'mute') + '">' + esc(t('v_' + st)) + '</span></button>';
    }).join('') + '</div>';
    h += catalog(w.points, true);
    if (w.history.length) h += '<details class="past"><summary>' + esc(t('pt_history')) + '</summary>' + w.history.slice(0, 20).map(x =>
      '<div class="past-row"><div><b>' + esc(t('h_' + x.kind, { x: x.reward ? L(BK.reward(x.reward).title) : '' })) + '</b><small>' + esc(fmt(x.t, { day: 'numeric', month: 'short' })) + '</small></div><b class="' + (x.pts > 0 ? 'plus' : 'minus') + '" dir="ltr">' + (x.pts > 0 ? '+' : '') + x.pts + '</b></div>').join('') + '</details>';
    view.innerHTML = h;
  }
  function catalog(pts, can) {
    return '<h2 class="sec">' + esc(t('pt_swap')) + '</h2><div class="rewards">' + APP.rewards.catalog.map(c => {
      const ok = can && pts >= c.pts;
      return '<div class="reward' + (ok ? ' can' : '') + '"><span class="rw-ic">' + icon(c.icon) + '</span><b>' + esc(L(c.title)) + '</b><small>' + esc(L(c.note)) + '</small>' +
        '<div class="rw-foot"><span class="rw-pts">' + num(c.pts) + ' ' + esc(t('pts_word')) + '</span>' +
        (can ? (ok ? '<button class="btn amber sm" type="button" data-redeem="' + c.id + '">' + esc(t('pt_redeem')) + '</button>' : '<span class="need">' + esc(t('pt_need', { n: num(c.pts - pts) })) + '</span>') : '') + '</div></div>';
    }).join('') + '</div><p class="note">' + esc(t('pt_rules')) + '</p>';
  }
  function redeemFlow(id) {
    const m = BK.me(), c = BK.reward(id);
    const s = sheet('<div class="sh-ic amber">' + icon(c.icon) + '</div><h2>' + esc(t('rd_t', { n: num(c.pts) })) + '</h2><p class="muted">' + esc(L(c.title)) + ' · ' + esc(t('rd_d', { d: RW.voucherDays })) + '</p>' +
      '<div class="sheet-row"><button class="btn amber block lg" type="button" id="rdYes">' + esc(t('rd_yes')) + '</button><button class="btn ghost block lg" type="button" data-close>' + esc(t('cancel')) + '</button></div>');
    s.el.querySelector('#rdYes').addEventListener('click', () => {
      const v = BK.redeem(m.phone, id); s.close();
      if (!v) return toast(t('e_gen'), 'err');
      render(); setTimeout(() => voucher(v.code), 240);
    });
  }
  function voucher(code) {
    const m = BK.me(), v = BK.myVouchers(m.phone).find(x => x.code === code); if (!v) return;
    const rw = BK.reward(v.reward);
    const s = sheet('<div class="voucher"><small>' + esc(t('v_title')) + '</small><h2>' + esc(L(rw.title)) + '</h2><div class="qr" id="vQr"></div><b class="vcode" dir="ltr">' + esc(v.code) + '</b>' +
      '<p class="muted">' + esc(v.used ? t('v_used_on', { d: fmt(v.usedAt, { day: 'numeric', month: 'long' }) }) : t('v_show', { d: fmt(v.expires, { day: 'numeric', month: 'long', year: 'numeric' }) })) + '</p></div>' +
      '<button class="btn primary block lg" type="button" data-close>' + esc(t('ok')) + '</button>', { cls: 'v-sheet' });
    try { new QRCode(s.el.querySelector('#vQr'), { text: v.code, width: 150, height: 150, colorDark: '#073F40', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M }); } catch (e) {}
  }

  /* =========================================================
     3) SAVE THE CARE NUMBER
     ========================================================= */
  function care() {
    const B = APP.brand;
    const s = sheet('<div class="vc-prev"><img src="' + B.logoIcon + '" alt="" width="64" height="64"><b>' + esc(L(B.name)) + '</b><small>' + esc(t('care_label')) + '</small></div>' +
      '<div class="vc-rows">' + B.branches.map(b => '<a class="vc-row" href="tel:' + b.phone + '">' + icon('phone') + '<span><small>' + esc(L(b.name)) + '</small><b dir="ltr">' + esc(b.phone) + '</b></span><span class="vc-go">' + esc(t('call')) + '</span></a>').join('') +
      '<a class="vc-row wa" href="https://wa.me/' + B.whatsapp + '" target="_blank" rel="noopener">' + icon('chat') + '<span><small>' + esc(t('care_wa')) + '</small><b dir="ltr">+' + esc(B.whatsapp) + '</b></span><span class="vc-go">' + esc(t('open')) + '</span></a></div>' +
      '<button class="btn primary block lg" type="button" id="vcfGo">' + icon('download') + esc(t('care_save')) + '</button><p class="small muted center">' + esc(t('care_how')) + '</p>', { cls: 'care-sheet' });
    s.el.querySelector('#vcfGo').addEventListener('click', () => {
      BK.download(BK.vcard(), 'alsafa-care.vcf', 'text/vcard'); BK.contactSaved();
      toast(t('care_done'));
    });
  }

  /* ---------- router and events ---------- */
  const ROUTES = { home, appts, book, rate, points };
  function render() {
    (ROUTES[route] || home)();
    document.querySelectorAll('[data-nav]').forEach(a => a.setAttribute('aria-current', String(a.dataset.nav === route)));
  }
  function go() {
    const r = (location.hash || '#home').slice(1);
    const prev = route;
    route = ROUTES[r] ? r : 'home';
    if (route === 'book' && prev !== 'book') B = { step: 1, sp: 'all', doc: null, date: null, time: null, done: null };
    if (route === 'rate' && prev !== 'rate') RT = { stars: 0, tags: [], note: '', done: null };
    render(); window.scrollTo(0, 0);
  }

  view.addEventListener('click', e => {
    const el = e.target.closest('button, a'); if (!el) return;
    const d = el.dataset;
    if (d.signin !== undefined) return signIn();
    if (d.care !== undefined) return care();
    if (d.cancel) return cancelFlow(d.cancel);
    if (d.ics) { const a = BK.byId(d.ics); BK.download(BK.ics(a), 'appointment-' + a.id + '.ics', 'text/calendar'); return toast(t('cal_done')); }
    if (d.bstep) { e.preventDefault(); B.step = +d.bstep; if (B.step < 3) B.done = null; render(); window.scrollTo(0, 0); return; }
    if (d.sp) { B.sp = d.sp; return render(); }
    if (d.doc) { if (B.doc !== d.doc) { B.date = null; B.time = null; } B.doc = d.doc; B.step = 2; render(); window.scrollTo(0, 0); return; }
    if (d.day) { B.date = d.day; B.time = null; return render(); }
    if (d.slot) { B.time = d.slot; B.step = 3; render(); window.scrollTo(0, 0); return; }
    if (d.wait !== undefined) return joinWait();
    if (el.id === 'bkGo') return doBook();
    if (d.resetBook !== undefined) { B = { step: 1, sp: 'all', doc: null, date: null, time: null, done: null }; return; }
    if (d.star) { const n = +d.star; const v = document.getElementById('rtNote'); if (v) RT.note = v.value; RT.stars = n; render(); const s = view.querySelector('[data-star="' + n + '"]'); if (s) s.focus({ preventScroll: true }); return; }
    if (d.tag) { const v = document.getElementById('rtNote'); if (v) RT.note = v.value; RT.tags = RT.tags.includes(d.tag) ? RT.tags.filter(x => x !== d.tag) : RT.tags.concat(d.tag); el.setAttribute('aria-pressed', String(RT.tags.includes(d.tag))); return; }
    if (el.id === 'rtGo') return sendRating();
    if (el.id === 'thClaim') return signIn(t('si_points'), () => { BK.claim(RT.done.id); RT.done = BK.ratings().find(r => r.id === RT.done.id); render(); });
    if (el.id === 'gGo') return openGoogle();
    if (d.redeem) return redeemFlow(d.redeem);
    if (d.v) return voucher(d.v);
  });
  view.addEventListener('input', e => { if (e.target.id === 'rtNote') RT.note = e.target.value; });

  // keep the page fresh when the staff page changes something in another tab or frame
  window.addEventListener('storage', e => {
    if (!e.key || !e.key.startsWith(Store.PREFIX) || document.querySelector('.sheet-wrap')) return;
    if (route === 'home' || route === 'appts' || route === 'points') render();
  });

  window.addEventListener('hashchange', go);
  document.addEventListener('langchange', () => { paintUser(); render(); });
  document.getElementById('logo').innerHTML = '<img src="' + APP.brand.logoIcon + '" alt="" width="40" height="40">';
  document.getElementById('userBtn').addEventListener('click', account);
  document.getElementById('careBtn').addEventListener('click', care);
  Q.langButton(document.getElementById('langBtn'));
  Q.applyLang();
  go();
})();
