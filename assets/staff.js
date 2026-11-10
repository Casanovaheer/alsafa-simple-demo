/* Reception page: live cancellations with auto refill, ratings, points and vouchers. */
(function () {
  const { Store, L, t, esc, icon, avatar, fmt, slot, ago, num, toast, sheet, doctor } = Q;
  const root = document.getElementById('root');
  let tab = Store.get('s_tab', 'appts');
  let day = BK.dkey(BK.today()), docF = 'all';
  let seenAlert = (Store.get('alerts', [])[0] || {}).id || null;
  let flash = null;

  const H = 3600e3, now = () => Date.now();
  const pn = x => BK.pname(x) || t('s_guest');
  function dayShort(key) {
    const d = BK.parseKey(key), diff = Math.round((d - BK.today()) / 864e5);
    return (diff === 0 ? t('today') : diff === 1 ? t('tomorrow') : fmt(d, { weekday: 'short' })) + ' ' + fmt(d, { day: 'numeric', month: 'short' });
  }
  const starsTxt = n => '<span class="st-stars" aria-label="' + n + '/5">' + '★'.repeat(n) + '<span>' + '★'.repeat(5 - n) + '</span></span>';

  /* ---------- one list of events for the bell and the live feed ---------- */
  function items() {
    const A = BK.appts(), byId = id => A.find(a => a.id === id);
    const list = Store.get('alerts', []).map(al => {
      const a = al.appt ? byId(al.appt) : null, doc = a ? doctor(a.doctor) : null;
      const when = a ? dayShort(a.date) + ' · ' + slot(a.time) : '';
      const toDay = a ? { tab: 'appts', day: a.date } : { tab: 'appts' };
      if ((al.type === 'cancel' || al.type === 'staff_cancel') && a) {
        const f = al.filled ? byId(al.filled) : null;
        return Object.assign({ id: al.id, t: al.t, kind: 'bad', ic: 'calx', txt: t(al.type === 'cancel' ? 'f_cancel' : 'f_staff_cancel', { n: pn(a), d: L(doc.name), w: when }) + (al.reason ? ' · ' + t('r_' + al.reason) : ''),
          sub: f ? t('f_refill', { n: pn(f) }) : t('f_free'), refill: !!f }, toDay);
      }
      if (al.type === 'book' && a) return Object.assign({ id: al.id, t: al.t, kind: 'ok', ic: 'calcheck', txt: t('f_book', { n: pn(a), d: L(doc.name), w: when }) }, toDay);
      if (al.type === 'wait') { const w = Store.get('waitlist', []).find(x => x.id === al.wait); return w ? { id: al.id, t: al.t, kind: 'violet', ic: 'bell', tab: 'appts', txt: t('f_wait', { n: pn(w), d: L(doctor(w.doctor).name) }) } : null; }
      if (al.type === 'rating') { const r = BK.ratings().find(x => x.id === al.rating); return r ? { id: al.id, t: al.t, kind: 'amber', ic: 'star', tab: 'ratings', txt: t('f_rating', { s: r.stars, n: pn(r) }), sub: r.pts ? t('f_pts', { n: r.pts }) : '' } : null; }
      if (al.type === 'google') return { id: al.id, t: al.t, kind: 'teal', ic: 'google', tab: 'ratings', txt: t('f_google') };
      if (al.type === 'redeem') { const rw = BK.reward(al.reward); return { id: al.id, t: al.t, kind: 'amber', ic: 'gift', tab: 'points', txt: t('f_redeem', { n: al.name ? BK.pname(al) : '', r: L(rw.title) }), sub: al.code }; }
      if (al.type === 'vcf') return { id: al.id, t: al.t, kind: 'violet', ic: 'contact', txt: t('f_vcf') };
      if (al.type === 'new_user') return { id: al.id, t: al.t, kind: 'teal', ic: 'userplus', cat: 'user', pt: al.phone, tab: 'patients', txt: t('f_new_user', { n: BK.pname(al) }), sub: t('f_new_user_sub', { n: APP.rewards.welcome }) };
      return null;
    }).filter(Boolean);
    // history from the seeded data, so the list is never empty
    const told = new Set(Store.get('alerts', []).map(al => al.appt).filter(Boolean));
    A.filter(a => a.status === 'cancelled' && a.seed && !told.has(a.id)).forEach(a => {
      const f = a.refilledBy ? byId(a.refilledBy) : null;
      list.push({ id: a.id, t: a.cancelledAt, kind: 'bad', ic: 'calx', tab: 'appts', day: a.date, refill: !!f, txt: t(a.cancelledBy === 'staff' ? 'f_staff_cancel' : 'f_cancel', { n: pn(a), d: L(doctor(a.doctor).name), w: dayShort(a.date) + ' · ' + slot(a.time) }), sub: f ? t('f_refill', { n: pn(f) }) : t('f_free') });
    });
    BK.ratings().filter(r => r.seed).slice(0, 4).forEach(r => list.push({ id: r.id, t: r.t, kind: 'amber', ic: 'star', tab: 'ratings', txt: t('f_rating', { s: r.stars, n: pn(r) }), sub: r.pts ? t('f_pts', { n: r.pts }) : '' }));
    return list.sort((x, y) => y.t - x.t).slice(0, 40);
  }

  /* read / unread: the ids reception has already opened */
  const readSet = () => new Set(Store.get('n_read', []));
  function markRead(ids) {
    const r = Store.get('n_read', []);
    ids.forEach(id => { if (id && !r.includes(id)) r.push(id); });
    Store.set('n_read', r.slice(-400));
  }
  // first visit: the three newest events start as unread so the bell has something to show
  if (Store.get('n_read', null) === null) Store.set('n_read', items().slice(3).map(x => x.id));

  function itemHtml(x, isNew) {
    return '<span class="fi-ic">' + icon(x.ic) + '</span><div><p>' + esc(x.txt) + '</p>' +
      (x.sub ? '<p class="fi-sub">' + (x.refill ? icon('repeat', 'sm') : '') + esc(x.sub) + '</p>' : '') +
      '<time>' + esc(ago(x.t)) + '</time></div>' + (isNew ? '<span class="new-dot" title="' + esc(t('n_new_tag')) + '"></span>' : '');
  }

  /* ---------- live feed ---------- */
  function feed() {
    const list = items(), r = readSet();
    return '<aside class="feed card" aria-labelledby="feedH"><div class="feed-h"><h2 id="feedH">' + icon('activity') + esc(t('s_feed')) + '</h2><span class="live sm"><span class="pulse" aria-hidden="true"></span>' + esc(t('s_live')) + '</span></div>' +
      '<p class="feed-tip">' + esc(t('s_feed_tip')) + '</p><ol class="feed-list" aria-live="polite">' + list.slice(0, 14).map(x =>
        '<li class="fi ' + x.kind + (x.id === flash ? ' flash' : '') + (r.has(x.id) ? '' : ' unread') + '">' + itemHtml(x, !r.has(x.id)) + '</li>').join('') + '</ol></aside>';
  }

  /* ---------- the bell: count of new events and a drop-down list ---------- */
  const bell = document.getElementById('bellBtn');
  let panel = null, nFilter = 'all';
  function paintBell() {
    const list = items(), r = readSet(), n = list.filter(x => !r.has(x.id)).length;
    bell.innerHTML = icon('bell') + (n ? '<span class="badge">' + (n > 99 ? '99+' : n) + '</span>' : '');
    bell.setAttribute('aria-label', t('n_title') + ' · ' + t('n_label', { n }));
    bell.title = bell.getAttribute('aria-label');
    bell.classList.toggle('has-new', n > 0);
    document.title = (n ? '(' + n + ') ' : '') + t('t_staff') + ' · ' + L(APP.brand.name);
    if (panel) paintPanel();
  }
  function paintPanel() {
    const list = items(), r = readSet();
    const fresh = list.filter(x => !r.has(x.id)), seen = list.filter(x => r.has(x.id));
    const users = list.filter(x => x.cat === 'user');
    const show = nFilter === 'new' ? fresh : nFilter === 'read' ? seen : nFilter === 'users' ? users : list;
    const li = x => '<li><button type="button" class="fi n-item ' + x.kind + (r.has(x.id) ? '' : ' unread') + '" data-nid="' + esc(x.id) + '">' + itemHtml(x, !r.has(x.id)) + '</button></li>';
    // new sign-ups sit in their own block at the top, the rest below
    const grouped = (nFilter === 'all' || nFilter === 'new') && show.some(x => x.cat === 'user') && show.some(x => x.cat !== 'user');
    const listHtml = grouped
      ? '<p class="n-sec">' + icon('userplus', 'sm') + esc(t('n_sec_users')) + ' <span>' + show.filter(x => x.cat === 'user').length + '</span></p><ol class="n-list">' + show.filter(x => x.cat === 'user').map(li).join('') + '</ol>' +
        '<p class="n-sec">' + icon('activity', 'sm') + esc(t('n_sec_activity')) + ' <span>' + show.filter(x => x.cat !== 'user').length + '</span></p><ol class="n-list">' + show.filter(x => x.cat !== 'user').map(li).join('') + '</ol>'
      : '<ol class="n-list">' + show.map(li).join('') + '</ol>';
    const chip = (k, label, n) => '<button type="button" data-nf="' + k + '" aria-pressed="' + (nFilter === k) + '">' + esc(label) + ' <span>' + n + '</span></button>';
    panel.innerHTML = '<div class="n-head"><div><b>' + esc(t('n_title')) + '</b><small>' + esc(t('n_summary', { u: fresh.length, a: list.length })) + '</small></div>' +
      (fresh.length ? '<button type="button" class="link" data-nall>' + icon('check', 'sm') + esc(t('n_all_read')) + '</button>' : '') + '</div>' +
      '<div class="n-chips">' + chip('all', t('n_f_all'), list.length) + chip('new', t('n_f_new'), fresh.length) + chip('read', t('n_f_read'), seen.length) + chip('users', t('n_f_users'), users.length) + '</div>' +
      (show.length ? '<div class="n-scroll">' + listHtml + '</div>'
        : '<p class="n-empty">' + icon('check') + esc(nFilter === 'new' ? t('n_empty_new') : t('n_empty')) + '</p>');
  }
  function openPanel() {
    panel = document.createElement('div');
    panel.className = 'n-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', t('n_title'));
    document.body.appendChild(panel); paintPanel();
    bell.setAttribute('aria-expanded', 'true');
    panel.addEventListener('click', e => {
      e.stopPropagation(); // the list re-renders, so the outside-click check would lose the clicked node
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.nf) { nFilter = b.dataset.nf; return paintPanel(); }
      if (b.dataset.nall !== undefined) { markRead(items().map(x => x.id)); render(); return paintBell(); }
      if (b.dataset.nid) {
        const x = items().find(i => i.id === b.dataset.nid);
        markRead([b.dataset.nid]); closePanel();
        if (x && x.tab) { tab = x.tab; Store.set('s_tab', tab); if (x.day) day = x.day; flash = x.id; }
        render(); paintBell();
        if (x && x.pt) setTimeout(() => profile(x.pt), 120);
        clearTimeout(onChange.tm); onChange.tm = setTimeout(() => { flash = null; }, 4000);
      }
    });
  }
  function closePanel() { if (panel) { panel.remove(); panel = null; bell.setAttribute('aria-expanded', 'false'); } }
  bell.addEventListener('click', e => { e.stopPropagation(); panel ? closePanel() : openPanel(); });
  document.addEventListener('click', e => { if (panel && !panel.contains(e.target) && !bell.contains(e.target)) closePanel(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel) { closePanel(); bell.focus(); } });
  function ring() { bell.classList.remove('ring'); void bell.offsetWidth; bell.classList.add('ring'); }

  /* ---------- the three headline cards ---------- */
  function summary() {
    const A = BK.appts(), wk = now() - 7 * 24 * H;
    const cx = A.filter(a => a.status === 'cancelled' && a.cancelledAt > wk), refilled = cx.filter(a => a.refilledBy).length;
    const R = BK.ratings(), avg = R.length ? (R.reduce((s, r) => s + r.stars, 0) / R.length) : 0, g = R.filter(r => r.google).length;
    const saves = Store.get('vcf_saves', 0);
    const card = (cls, ic, n, title, big, sub, tb) => '<' + (tb ? 'button type="button" data-tab="' + tb + '"' : 'div') + ' class="sum ' + cls + (tb === tab ? ' on' : '') + '"><span class="sum-ic">' + icon(ic) + '</span><div><small>' + esc(t('step', { n })) + ' · ' + esc(title) + '</small><b>' + big + '</b><span>' + esc(sub) + '</span></div></' + (tb ? 'button' : 'div') + '>';
    return '<section class="sums">' +
      card('s1', 'calx', 1, t('s_f1'), num(cx.length) + ' <em>' + esc(t('s_cx_wk')) + '</em>', t('s_refilled', { n: refilled }), 'appts') +
      card('s2', 'star', 2, t('s_f2'), avg.toFixed(1) + ' <em>★ · ' + esc(t('s_n_ratings', { n: R.length })) + '</em>', t('s_google_n', { n: g }), 'ratings') +
      card('s3', 'contact', 3, t('s_f3'), num(saves) + ' <em>' + esc(t('s_saves')) + '</em>', t('s_saves_d'), null) +
      '</section>';
  }

  /* ---------- tab: appointments ---------- */
  const srcChip = a => '<span class="chip ' + (a.by === 'waitlist' ? 'violet' : a.by === 'staff' ? 'mute' : 'teal') + '">' + esc(t('src_' + a.by)) + '</span>';
  function apptsTab() {
    const A = BK.appts(), today = BK.dkey(BK.today());
    const todayActive = A.filter(a => a.date === today && BK.isActive(a)).length;
    const wl = Store.get('waitlist', []).filter(w => w.status === 'waiting');
    const days = []; for (let i = 0; i < 7; i++) days.push(BK.dkey(BK.addDays(BK.today(), i)));
    const rows = A.filter(a => a.date === day && (docF === 'all' || a.doctor === docF) && a.status !== 'done').sort((a, b) => a.time.localeCompare(b.time) || (a.status === 'cancelled') - (b.status === 'cancelled'));
    let h = '<div class="kpis">' +
      kpi(t('k_today'), todayActive, 'calendar', 'today') + kpi(t('k_cx_today'), A.filter(a => a.status === 'cancelled' && a.cancelledAt > BK.today().getTime()).length, 'calx', 'cx_today') +
      kpi(t('k_refill'), A.filter(a => a.status === 'cancelled' && a.refilledBy).length, 'repeat', 'refill') + kpi(t('k_wait'), wl.length, 'users', 'wait') + '</div>';
    h += '<p class="explain">' + icon('repeat', 'sm') + esc(t('s_explain')) + '</p>';
    h += '<div class="tbl-tools"><div class="seg scroll" role="tablist">' + days.map(k => '<button type="button" role="tab" aria-selected="' + (k === day) + '" data-day="' + k + '">' + esc(dayShort(k)) + '</button>').join('') + '</div>' +
      '<label class="sel"><span class="sr">' + esc(t('s_doctor')) + '</span><select id="docF"><option value="all">' + esc(t('s_all_docs')) + '</option>' + APP.doctors.map(d => '<option value="' + d.id + '"' + (d.id === docF ? ' selected' : '') + '>' + esc(L(d.name)) + '</option>').join('') + '</select></label></div>';
    h += rows.length ? '<div class="tbl" role="table"><div class="tr th" role="row"><span role="columnheader">' + esc(t('th_time')) + '</span><span role="columnheader">' + esc(t('th_patient')) + '</span><span role="columnheader">' + esc(t('th_doctor')) + '</span><span role="columnheader">' + esc(t('th_status')) + '</span><span role="columnheader"></span></div>' +
      rows.map(apptRow).join('') + '</div>' : '<div class="card empty">' + icon('calendar') + '<p>' + esc(t('s_no_appts')) + '</p></div>';
    h += '<h2 class="sec">' + esc(t('s_waitlist')) + ' <span class="cnt">' + wl.length + '</span></h2><div class="wl">' + (wl.length ? wl.map(w =>
      '<div class="wl-row">' + avatar(doctor(w.doctor)) + '<div>' + ptLink(w.phone, pn(w)) + '<small>' + esc(L(doctor(w.doctor).name)) + ' · ' + esc(w.date ? dayShort(w.date) : t('s_any_day')) + '</small></div><time>' + esc(ago(w.t)) + '</time></div>').join('') : '<p class="muted">' + esc(t('s_wl_empty')) + '</p>') + '</div>';
    return h;
  }
  function apptRow(a) {
    const doc = doctor(a.doctor), cx = a.status === 'cancelled';
    const f = a.refilledBy ? BK.byId(a.refilledBy) : null;
    const st = cx ? '<span class="chip bad">' + esc(t(a.cancelledBy === 'staff' ? 'st_cx_staff' : 'st_cx_patient')) + '</span>' : a.status === 'confirmed' ? '<span class="chip ok">' + esc(t('st_confirmed')) + '</span>' : srcChip(a);
    const fresh = (cx && a.cancelledAt > now() - 15 * 60e3) || (a.fromWaitlist && a.t > now() - 15 * 60e3);
    return '<div class="tr' + (cx ? ' cx' : '') + (fresh ? ' fresh' : '') + '" role="row">' +
      '<span class="td-time" role="cell">' + esc(slot(a.time)) + '</span>' +
      '<span class="td-pt" role="cell">' + ptLink(a.phone, pn(a)) + '<small dir="ltr">' + esc(a.phone || '') + '</small>' +
        (cx ? '<small class="why">' + esc((a.cancelReason ? t('r_' + a.cancelReason) + ' · ' : '') + ago(a.cancelledAt)) + '</small>' : '') +
        (f ? '<small class="refill">' + icon('repeat', 'sm') + esc(t('s_refilled_to', { n: pn(f) })) + '</small>' : '') +
        (a.fromWaitlist ? '<small class="refill">' + icon('repeat', 'sm') + esc(t('s_from_wl')) + '</small>' : '') + '</span>' +
      '<span class="td-doc" role="cell">' + avatar(doc) + '<span>' + esc(L(doc.name)) + '</span></span>' +
      '<span class="td-st" role="cell">' + st + '</span>' +
      '<span class="td-act" role="cell">' + (cx ? '<button class="btn ghost sm" type="button" data-del="' + a.id + '">' + icon('trash', 'sm') + esc(t('s_delete')) + '</button>'
        : '<button class="btn danger-soft sm" type="button" data-scx="' + a.id + '">' + icon('calx', 'sm') + esc(t('s_cancel')) + '</button>') + '</span></div>';
  }
  const kpi = (label, n, ic, key, raw) => '<button type="button" class="kpi" data-kpi="' + key + '"><span class="kpi-ic">' + icon(ic) + '</span><b>' + (raw != null ? raw : num(n)) + '</b><small>' + esc(label) + '</small><span class="kpi-more">' + esc(t('k_more')) + icon('chevron', 'sm chev') + '</span></button>';

  /* ---------- tab: ratings ---------- */
  function ratingsTab() {
    const R = BK.ratings(), wk = now() - 7 * 24 * H;
    const avg = R.length ? R.reduce((s, r) => s + r.stars, 0) / R.length : 0;
    const happy = R.length ? Math.round(R.filter(r => r.stars >= 4).length / R.length * 100) : 0;
    let h = '<div class="kpis">' + kpi(t('k_avg'), 0, 'star', 'r_all', avg.toFixed(1)) + kpi(t('k_week'), R.filter(r => r.t > wk).length, 'activity', 'r_week') +
      kpi(t('k_happy'), 0, 'sparkle', 'r_happy', happy + '%') + kpi(t('k_google'), R.filter(r => r.google).length, 'google', 'r_google') + '</div>';
    h += '<div class="r-grid"><div class="card dist"><h3>' + esc(t('s_dist')) + '</h3>' + [5, 4, 3, 2, 1].map(s => {
      const c = R.filter(r => r.stars === s).length, p = R.length ? Math.round(c / R.length * 100) : 0;
      return '<div class="bar"><span>' + s + ' ★</span><i><em style="width:' + p + '%"></em></i><b>' + c + '</b></div>';
    }).join('') + '<p class="note">' + icon('google', 'sm') + esc(t('s_google_rule')) + '</p></div>';
    h += '<div class="rlist">' + R.slice(0, 30).map(r => {
      const note = L(r.note);
      return '<article class="rv' + (r.stars <= 2 ? ' low' : '') + (r.t > now() - 15 * 60e3 ? ' fresh' : '') + '"><div class="rv-top">' + starsTxt(r.stars) + '<span class="rv-name">' + ptLink(r.phone, pn(r)) + '</span><time>' + esc(ago(r.t)) + '</time></div>' +
        (note ? '<p>' + esc(note) + '</p>' : '') + '<div class="rv-tags">' + (r.tags || []).map(g => '<span class="chip mute">' + esc(t('tg_' + g)) + '</span>').join('') +
        (r.pts ? '<span class="chip amber"><bdi dir="ltr">+' + r.pts + '</bdi> ' + esc(t('pts_word')) + '</span>' : '') + (r.google ? '<span class="chip teal">' + esc(t('s_went_google')) + '</span>' : '') + '</div></article>';
    }).join('') + '</div></div>';
    return h;
  }

  /* ---------- tab: points and vouchers ---------- */
  function pointsTab() {
    const W = BK.wallets(), V = Store.get('vouchers', []).slice().sort((a, b) => b.t - a.t);
    const given = Object.values(W).reduce((s, w) => s + w.history.filter(x => x.pts > 0).reduce((q, x) => q + x.pts, 0), 0);
    let h = '<div class="kpis">' + kpi(t('k_given'), given, 'sparkle', 'p_given') + kpi(t('k_members'), Object.keys(W).length, 'users', 'p_members') + kpi(t('k_vouchers'), V.length, 'ticket', 'p_vouchers') + kpi(t('k_used'), V.filter(v => v.used).length, 'check', 'p_used') + '</div>';
    h += '<form class="card vcheck" id="vForm"><h3>' + icon('ticket') + esc(t('s_vcheck')) + '</h3><p class="muted small">' + esc(t('s_vcheck_d')) + '</p><div class="vc-in"><input id="vCode" dir="ltr" placeholder="SAFA-XXXX" autocomplete="off" aria-label="' + esc(t('s_vcheck')) + '"><button class="btn primary" type="submit">' + esc(t('s_check')) + '</button></div><div id="vRes" aria-live="polite"></div></form>';
    h += '<div class="r-grid"><div class="card"><h3>' + esc(t('s_rules')) + '</h3><ul class="rules"><li><span>' + esc(t('pt_visit')) + '</span><b dir="ltr">+' + APP.rewards.perVisit + '</b></li><li><span>' + esc(t('pt_rate')) + '</span><b dir="ltr">+' + APP.rewards.perRating + '</b></li><li><span>' + esc(t('s_welcome')) + '</span><b dir="ltr">+' + APP.rewards.welcome + '</b></li><li><span>' + esc(t('s_google_pts')) + '</span><b>0</b></li></ul>' +
      '<h3 class="mt">' + esc(t('pt_swap')) + '</h3><ul class="rules">' + APP.rewards.catalog.map(c => '<li><span>' + esc(L(c.title)) + '</span><b>' + num(c.pts) + '</b></li>').join('') + '</ul></div>';
    h += '<div class="card"><h3>' + esc(t('s_vouchers')) + '</h3><div class="vt">' + (V.length ? V.map(v => {
      const st = v.used ? 'used' : v.expires < now() ? 'exp' : 'ok';
      return '<div class="vt-row' + (v.t > now() - 15 * 60e3 ? ' fresh' : '') + '"><b dir="ltr">' + esc(v.code) + '</b><span>' + ptLink(v.phone, BK.pname(v)) + '<small>' + esc(L(BK.reward(v.reward).title)) + '</small></span><span class="chip ' + (st === 'ok' ? 'ok' : 'mute') + '">' + esc(t('v_' + st)) + '</span></div>';
    }).join('') : '<p class="muted">—</p>') + '</div></div></div>';
    h += '<div class="card"><h3>' + icon('sparkle') + esc(t('s_activity')) + '</h3><p class="muted small">' + esc(t('s_activity_d')) + '</p><ul class="ls">' +
      activity().slice(0, 15).map(x => ptRow(x.phone, x.name, esc(histLabel(x)), ptsChip(x.pts) + '<time>' + esc(ago(x.t)) + '</time>')).join('') + '</ul>' +
      '<button type="button" class="btn ghost block" data-kpi="p_given">' + esc(t('s_activity_all')) + '</button></div>';
    return h;
  }

  /* ---------- patients: one record per mobile number, built from every list ---------- */
  function people() {
    const map = new Map();
    const add = (phone, name, at) => {
      if (!phone) return;
      const p = map.get(phone) || { phone, name: null, last: 0 };
      if (name && !p.name) p.name = name;
      if (at) p.last = Math.max(p.last, at);
      map.set(phone, p);
    };
    const W = BK.wallets();
    Object.keys(W).forEach(ph => { const w = W[ph]; add(ph, w.name, w.joined); w.history.forEach(h => add(ph, w.name, h.t)); });
    BK.appts().forEach(a => add(a.phone, a.name, a.cancelledAt || a.t));
    BK.ratings().forEach(r => add(r.phone, r.name, r.t));
    Store.get('waitlist', []).forEach(w => add(w.phone, w.name, w.t));
    return [...map.values()].map(p => {
      const w = W[p.phone];
      return Object.assign(p, { label: BK.pname(p) || t('s_guest'), points: w ? w.points : 0, isNew: !!(w && w.history.some(h => h.kind === 'welcome' && h.t > now() - 7 * 24 * H)), joined: w ? w.joined : null,
        visits: BK.appts().filter(a => a.phone === p.phone && a.status === 'done').length });
    }).sort((a, b) => b.last - a.last);
  }
  const ini = s => String(s || '?').replace(/^(د\.|Dr\.)\s*/, '').trim().charAt(0) || '?';
  // a name the staff can tap to open the patient's profile
  const ptLink = (phone, name) => phone ? '<button type="button" class="pt-link" data-pt="' + esc(phone) + '">' + esc(name) + '</button>' : '<b>' + esc(name) + '</b>';
  const ptRow = (phone, name, line2, end) => '<li class="ls-row">' + (phone ? '<button type="button" class="ls-pt" data-pt="' + esc(phone) + '">' : '<div class="ls-pt">') +
    '<span class="pf-av sm">' + esc(ini(name)) + '</span><span class="ls-txt"><b>' + esc(name) + '</b><small>' + line2 + '</small></span>' + (phone ? icon('chevron', 'sm chev') + '</button>' : '</div>') +
    '<span class="ls-end">' + (end || '') + '</span></li>';
  const ptsChip = n => '<span class="chip ' + (n > 0 ? 'amber' : 'bad') + '"><bdi dir="ltr">' + (n > 0 ? '+' : '') + n + '</bdi></span>';

  /* a bottom sheet whose names open the profile */
  function peopleSheet(html) {
    const s = sheet(html, { cls: 'wide' });
    s.el.addEventListener('click', e => {
      const b = e.target.closest('[data-pt]'); if (!b) return;
      s.close(); setTimeout(() => profile(b.dataset.pt), 230);
    });
    return s;
  }
  function listSheet(title, ic, rows) {
    peopleSheet('<div class="sh-ic">' + icon(ic) + '</div><h2>' + esc(title) + ' <span class="cnt">' + rows.length + '</span></h2><p class="muted">' + esc(t('ls_tap')) + '</p>' +
      (rows.length ? '<ul class="ls">' + rows.slice(0, 80).join('') + '</ul>' : '<p class="n-empty">' + icon('check') + esc(t('ls_empty')) + '</p>'));
  }

  /* what each number card opens */
  function kpiList(key) {
    const A = BK.appts(), today = BK.dkey(BK.today()), t0 = BK.today().getTime(), wk = now() - 7 * 24 * H;
    const apptLine = a => esc(L(doctor(a.doctor).name)) + ' · ' + esc(dayShort(a.date)) + ' · ' + esc(slot(a.time));
    const rateRow = r => ptRow(r.phone, pn(r), starsTxt(r.stars) + (L(r.note) ? ' · ' + esc(L(r.note)).slice(0, 60) : ''), '<time>' + esc(ago(r.t)) + '</time>');
    const vRow = v => { const st = v.used ? 'used' : v.expires < now() ? 'exp' : 'ok'; return ptRow(v.phone, BK.pname(v), '<span dir="ltr">' + esc(v.code) + '</span> · ' + esc(L(BK.reward(v.reward).title)), '<span class="chip ' + (st === 'ok' ? 'ok' : 'mute') + '">' + esc(t('v_' + st)) + '</span>'); };
    const R = BK.ratings(), V = Store.get('vouchers', []).slice().sort((a, b) => b.t - a.t);
    switch (key) {
      case 'today': return listSheet(t('k_today'), 'calendar', A.filter(a => a.date === today && BK.isActive(a)).sort((a, b) => a.time.localeCompare(b.time))
        .map(a => ptRow(a.phone, pn(a), apptLine(a), srcChip(a))));
      case 'cx_today': return listSheet(t('k_cx_today'), 'calx', A.filter(a => a.status === 'cancelled' && a.cancelledAt > t0).sort((a, b) => b.cancelledAt - a.cancelledAt)
        .map(a => { const f = a.refilledBy ? BK.byId(a.refilledBy) : null; return ptRow(a.phone, pn(a), apptLine(a) + '<br>' + esc(t(a.cancelledBy === 'staff' ? 'st_cx_staff' : 'st_cx_patient')) + (a.cancelReason ? ' · ' + esc(t('r_' + a.cancelReason)) : '') + (f ? '<br><span class="refill">' + icon('repeat', 'sm') + esc(t('s_refilled_to', { n: pn(f) })) + '</span>' : ''), '<time>' + esc(ago(a.cancelledAt)) + '</time>'); }));
      case 'refill': return listSheet(t('k_refill'), 'repeat', A.filter(a => a.status === 'cancelled' && a.refilledBy).sort((a, b) => b.cancelledAt - a.cancelledAt)
        .map(a => { const f = BK.byId(a.refilledBy) || {}; return ptRow(f.phone, pn(f), apptLine(a) + '<br><span class="refill">' + icon('repeat', 'sm') + esc(t('ls_from', { n: pn(a) })) + '</span>', '<time>' + esc(ago(a.cancelledAt)) + '</time>'); }));
      case 'wait': return listSheet(t('k_wait'), 'users', Store.get('waitlist', []).filter(w => w.status === 'waiting')
        .map(w => ptRow(w.phone, pn(w), esc(L(doctor(w.doctor).name)) + ' · ' + esc(w.date ? dayShort(w.date) : t('s_any_day')), '<time>' + esc(ago(w.t)) + '</time>')));
      case 'r_all': return listSheet(t('k_avg'), 'star', R.map(rateRow));
      case 'r_week': return listSheet(t('k_week'), 'activity', R.filter(r => r.t > wk).map(rateRow));
      case 'r_happy': return listSheet(t('k_happy'), 'sparkle', R.filter(r => r.stars >= 4).map(rateRow));
      case 'r_google': return listSheet(t('k_google'), 'google', R.filter(r => r.google).map(rateRow));
      case 'p_given': return listSheet(t('s_activity'), 'sparkle', activity().map(x => ptRow(x.phone, x.name, esc(histLabel(x)), ptsChip(x.pts) + '<time>' + esc(ago(x.t)) + '</time>')));
      case 'p_members': return listSheet(t('k_members'), 'users', people().filter(p => BK.wallets()[p.phone]).sort((a, b) => b.points - a.points)
        .map(p => ptRow(p.phone, p.label, esc(t('pp_balance', { n: num(p.points) })), p.isNew ? '<span class="chip teal">' + esc(t('pf_new')) + '</span>' : '')));
      case 'p_vouchers': return listSheet(t('k_vouchers'), 'ticket', V.map(vRow));
      case 'p_used': return listSheet(t('k_used'), 'check', V.filter(v => v.used).map(vRow));
      case 'u_all': return listSheet(t('k_patients'), 'users', people().map(p => ptRow(p.phone, p.label, '<span dir="ltr">' + esc(p.phone) + '</span>', '<time>' + esc(ago(p.last)) + '</time>')));
      case 'u_new': return listSheet(t('k_new_week'), 'userplus', people().filter(p => p.isNew).map(p => ptRow(p.phone, p.label, esc(t('pf_since', { d: fmt(p.joined, { day: 'numeric', month: 'short' }) })), '<span class="chip teal">' + esc(t('pf_new')) + '</span>')));
      case 'u_points': return kpiList('p_members');
      case 'u_vouchers': return listSheet(t('k_active_v'), 'ticket', V.filter(v => !v.used && v.expires > now()).map(vRow));
    }
  }

  /* every point earned or spent, newest first */
  function activity() {
    const W = BK.wallets(), out = [];
    Object.keys(W).forEach(ph => W[ph].history.forEach(h => out.push(Object.assign({ phone: ph, name: BK.pname(W[ph]) }, h))));
    return out.sort((a, b) => b.t - a.t);
  }
  const histLabel = x => t('h_' + x.kind, { x: x.reward ? L(BK.reward(x.reward).title) : '' });

  /* ---------- the patient profile ---------- */
  function profile(phone) {
    const p = people().find(x => x.phone === phone); if (!p) return;
    const w = BK.wallets()[phone];
    const A = BK.appts().filter(a => a.phone === phone).sort((a, b) => BK.when(b) - BK.when(a));
    const R = BK.ratings().filter(r => r.phone === phone), V = Store.get('vouchers', []).filter(v => v.phone === phone).sort((a, b) => b.t - a.t);
    const WL = Store.get('waitlist', []).filter(x => x.phone === phone && x.status === 'waiting');
    const up = A.filter(a => BK.isActive(a) && BK.when(a) > now()).length, done = A.filter(a => a.status === 'done').length, cx = A.filter(a => a.status === 'cancelled').length;
    const avg = R.length ? (R.reduce((s, r) => s + r.stars, 0) / R.length).toFixed(1) : '—';
    const stat = (n, label, cls) => '<div class="pf-stat ' + (cls || '') + '"><b>' + n + '</b><small>' + esc(label) + '</small></div>';
    const sec = (title, n, body) => '<section class="pf-sec"><h3>' + esc(title) + ' <span class="cnt">' + n + '</span></h3>' + body + '</section>';
    const wa = '966' + phone.replace(/^0/, '');
    let h = '<div class="pf-head"><span class="pf-av">' + esc(ini(p.label)) + '</span><div><h2>' + esc(p.label) + '</h2><p dir="ltr">' + esc(phone) + '</p>' +
      '<small>' + esc(p.joined ? t('pf_since', { d: fmt(p.joined, { day: 'numeric', month: 'long', year: 'numeric' }) }) : t('pf_no_wallet')) + '</small>' +
      (p.isNew ? ' <span class="chip teal">' + esc(t('pf_new')) + '</span>' : '') + '</div></div>' +
      '<div class="pf-actions"><a class="btn ghost sm" href="tel:' + esc(phone) + '">' + icon('phone', 'sm') + esc(t('call')) + '</a><a class="btn ghost sm" href="https://wa.me/' + wa + '" target="_blank" rel="noopener">' + icon('chat', 'sm') + esc(t('pf_wa')) + '</a></div>' +
      '<div class="pf-stats">' + stat(num(w ? w.points : 0), t('pf_points'), 'amber') + stat(done, t('pf_visits')) + stat(up, t('pf_upcoming')) + stat(cx, t('pf_cancelled'), cx ? 'bad' : '') + stat(avg + (R.length ? '★' : ''), t('pf_avg')) + '</div>';
    if (WL.length) h += '<p class="explain">' + icon('bell', 'sm') + esc(WL.map(x => t('pf_waiting', { d: L(doctor(x.doctor).name) })).join(' · ')) + '</p>';
    h += sec(t('pf_appts'), A.length, A.length ? '<ul class="pf-list">' + A.slice(0, 12).map(a => {
      const k = a.status === 'cancelled' ? 'bad' : a.status === 'done' ? 'mute' : 'ok';
      return '<li><span><b>' + esc(dayShort(a.date)) + ' · ' + esc(slot(a.time)) + '</b><small>' + esc(L(doctor(a.doctor).name)) + (a.cancelReason ? ' · ' + esc(t('r_' + a.cancelReason)) : '') + '</small></span><span class="chip ' + k + '">' + esc(t(a.status === 'cancelled' ? (a.cancelledBy === 'staff' ? 'st_cx_staff' : 'st_cx_patient') : 'st_' + a.status)) + '</span></li>';
    }).join('') + '</ul>' : '<p class="muted small">—</p>');
    h += sec(t('pf_ratings'), R.length, R.length ? '<ul class="pf-list">' + R.map(r => '<li><span>' + starsTxt(r.stars) + (L(r.note) ? '<small>' + esc(L(r.note)) + '</small>' : '') + '</span><span class="pf-end">' + (r.google ? '<span class="chip teal">Google</span>' : '') + '<time>' + esc(ago(r.t)) + '</time></span></li>').join('') + '</ul>' : '<p class="muted small">—</p>');
    h += sec(t('pt_history'), w ? w.history.length : 0, w && w.history.length ? '<ul class="pf-list">' + w.history.slice().sort((a, b) => b.t - a.t).map(x => '<li><span><b>' + esc(histLabel(x)) + '</b><small>' + esc(fmt(x.t, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + '</small></span>' + ptsChip(x.pts) + '</li>').join('') + '</ul>' : '<p class="muted small">' + esc(t('pf_no_wallet')) + '</p>');
    h += sec(t('s_vouchers'), V.length, V.length ? '<ul class="pf-list">' + V.map(v => { const st = v.used ? 'used' : v.expires < now() ? 'exp' : 'ok'; return '<li><span><b dir="ltr">' + esc(v.code) + '</b><small>' + esc(L(BK.reward(v.reward).title)) + '</small></span><span class="chip ' + (st === 'ok' ? 'ok' : 'mute') + '">' + esc(t('v_' + st)) + '</span></li>'; }).join('') + '</ul>' : '<p class="muted small">—</p>');
    sheet(h, { cls: 'wide pf' });
  }

  /* ---------- tab: patients ---------- */
  let pq = '';
  function patientsTab() {
    const all = people(), W = BK.wallets(), V = Store.get('vouchers', []);
    const bal = Object.values(W).reduce((s, w) => s + w.points, 0);
    let h = '<div class="kpis">' + kpi(t('k_patients'), all.length, 'users', 'u_all') + kpi(t('k_new_week'), all.filter(p => p.isNew).length, 'userplus', 'u_new') +
      kpi(t('k_balance'), bal, 'sparkle', 'u_points') + kpi(t('k_active_v'), V.filter(v => !v.used && v.expires > now()).length, 'ticket', 'u_vouchers') + '</div>';
    h += '<label class="search card">' + icon('search') + '<input id="ptQ" type="search" autocomplete="off" placeholder="' + esc(t('pt_search')) + '" value="' + esc(pq) + '" aria-label="' + esc(t('pt_search')) + '"></label>';
    h += '<div class="tbl pt-tbl" role="table"><div class="tr th" role="row"><span role="columnheader">' + esc(t('th_patient')) + '</span><span role="columnheader">' + esc(t('pf_points')) + '</span><span role="columnheader">' + esc(t('pf_visits')) + '</span><span role="columnheader">' + esc(t('th_last')) + '</span></div><div id="ptList">' + peopleRows(all) + '</div></div>';
    return h;
  }
  function peopleRows(all) {
    const q = Q.toLatin(pq).trim().toLowerCase();
    const list = (all || people()).filter(p => !q || p.label.toLowerCase().includes(q) || p.phone.includes(q) || L(p.name && p.name.en ? p.name : '').toLowerCase().includes(q));
    if (!list.length) return '<p class="n-empty">' + icon('search') + esc(t('ls_empty')) + '</p>';
    return list.slice(0, 60).map(p => '<div class="tr" role="row"><span class="td-pt" role="cell">' + ptLink(p.phone, p.label) + '<small dir="ltr">' + esc(p.phone) + '</small>' + (p.isNew ? '<span class="chip teal xs">' + esc(t('pf_new')) + '</span>' : '') + '</span>' +
      '<span role="cell" class="td-num"><b>' + num(p.points) + '</b></span><span role="cell" class="td-num">' + p.visits + '</span><span role="cell" class="td-last">' + esc(ago(p.last)) + '</span></div>').join('');
  }

  /* ---------- render ---------- */
  function render() {
    const tabs = [['appts', 'calendar', t('s_tab1')], ['ratings', 'star', t('s_tab2')], ['points', 'gift', t('s_tab3')], ['patients', 'users', t('s_tab4')]];
    const body = tab === 'ratings' ? ratingsTab() : tab === 'points' ? pointsTab() : tab === 'patients' ? patientsTab() : apptsTab();
    root.innerHTML = summary() + '<div class="s-grid"><section class="s-main"><nav class="s-tabs" role="tablist">' + tabs.map(x => '<button type="button" role="tab" aria-selected="' + (tab === x[0]) + '" data-tab="' + x[0] + '">' + icon(x[1]) + '<span>' + esc(x[2]) + '</span></button>').join('') + '</nav>' + body + '</section>' + feed() + '</div>';
    const sel = document.getElementById('docF'); if (sel) sel.addEventListener('change', () => { docF = sel.value; render(); });
    const vf = document.getElementById('vForm'); if (vf) vf.addEventListener('submit', checkVoucher);
    Q.hcenter(root.querySelector('.seg [aria-selected=true]'));
  }
  function checkVoucher(e) {
    e.preventDefault();
    const res = BK.useVoucher(document.getElementById('vCode').value);
    const v = res.v, rw = v ? BK.reward(v.reward) : null;
    const msg = res.r === 'ok' ? t('vc_ok', { r: L(rw.title), n: BK.pname(v) }) : res.r === 'used' ? t('vc_used', { d: fmt(v.usedAt, { day: 'numeric', month: 'short' }) }) : res.r === 'expired' ? t('vc_exp') : t('vc_nf');
    render();
    const o = document.getElementById('vRes'); o.className = 'vres ' + (res.r === 'ok' ? 'ok' : 'bad'); o.innerHTML = icon(res.r === 'ok' ? 'check' : 'x') + '<span>' + esc(msg) + '</span>';
  }

  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.tab) { tab = d.tab; Store.set('s_tab', tab); return render(); }
    if (d.kpi) return kpiList(d.kpi);
    if (d.pt) return profile(d.pt);
    if (d.day) { day = d.day; return render(); }
    if (d.scx) {
      const a = BK.byId(d.scx);
      const s = sheet('<div class="sh-ic bad">' + icon('calx') + '</div><h2>' + esc(t('scx_t', { n: pn(a) })) + '</h2><p class="muted">' + esc(L(doctor(a.doctor).name)) + ' · ' + esc(dayShort(a.date)) + ' · ' + esc(slot(a.time)) + '</p>' +
        '<label class="check"><input type="checkbox" id="waNotify" checked><span>' + esc(t('scx_wa')) + '</span></label>' +
        '<div class="sheet-row"><button class="btn danger block lg" type="button" id="scxYes">' + esc(t('cx_yes')) + '</button><button class="btn ghost block lg" type="button" data-close>' + esc(t('cx_no')) + '</button></div>');
      s.el.querySelector('#scxYes').addEventListener('click', () => {
        const wa = s.el.querySelector('#waNotify').checked, r = BK.cancel(a.id, 'staff', 'doctor_off'); s.close();
        seenAlert = (Store.get('alerts', [])[0] || {}).id; markRead([seenAlert]); render(); paintBell();
        toast(r && r.filled ? t('scx_done_fill', { n: pn(r.filled) }) : t('scx_done') + (wa ? ' · ' + t('scx_wa_sent') : ''));
      });
      return;
    }
    if (d.del) {
      const s = sheet('<div class="sh-ic bad">' + icon('trash') + '</div><h2>' + esc(t('del_t')) + '</h2><p class="muted">' + esc(t('del_d')) + '</p><div class="sheet-row"><button class="btn danger block lg" type="button" id="delYes">' + esc(t('s_delete')) + '</button><button class="btn ghost block lg" type="button" data-close>' + esc(t('cancel')) + '</button></div>');
      s.el.querySelector('#delYes').addEventListener('click', () => { BK.remove(d.del); s.close(); render(); toast(t('del_done')); });
    }
  });

  root.addEventListener('input', e => { if (e.target.id === 'ptQ') { pq = e.target.value; document.getElementById('ptList').innerHTML = peopleRows(); } });

  document.getElementById('resetBtn').addEventListener('click', () => {
    const s = sheet('<div class="sh-ic">' + icon('reset') + '</div><h2>' + esc(t('rs_t')) + '</h2><p class="muted">' + esc(t('rs_d')) + '</p><div class="sheet-row"><button class="btn primary block lg" type="button" id="rsYes">' + esc(t('rs_yes')) + '</button><button class="btn ghost block lg" type="button" data-close>' + esc(t('cancel')) + '</button></div>');
    s.el.querySelector('#rsYes').addEventListener('click', () => { BK.reset(); seenAlert = null; Store.set('n_read', items().slice(3).map(x => x.id)); s.close(); render(); paintBell(); toast(t('rs_done')); });
  });

  // live: another tab or the patient frame changed the data
  function onChange() {
    const al = Store.get('alerts', [])[0];
    if (al && al.id !== seenAlert) {
      seenAlert = al.id; flash = al.id;
      const msg = { cancel: 'n_cancel', book: 'n_book', rating: 'n_rating', redeem: 'n_redeem', wait: 'n_wait', google: 'n_google', vcf: 'n_vcf', new_user: 'n_new_user' }[al.type];
      if (msg) { toast(t(msg), 'bell'); ring(); }
      if (al.type === 'cancel' || al.type === 'book') { const a = BK.byId(al.appt); if (a) { day = a.date; tab = 'appts'; } }
      if (al.type === 'rating') tab = 'ratings';
      if (al.type === 'redeem') tab = 'points';
    }
    if (!document.querySelector('.sheet-wrap')) render();
    paintBell();
    clearTimeout(onChange.tm); onChange.tm = setTimeout(() => { flash = null; }, 4000);
  }
  window.addEventListener('storage', e => { if (e.key && e.key.startsWith(Store.PREFIX) && e.key !== Store.PREFIX + 'lang' && e.key !== Store.PREFIX + 's_tab') onChange(); });
  // refresh the "x minutes ago" labels once a minute, unless someone is typing or a dialog is open
  setInterval(() => { const a = document.activeElement; if (!document.querySelector('.sheet-wrap') && !(a && /INPUT|SELECT/.test(a.tagName))) render(); }, 60000);

  document.addEventListener('langchange', () => { render(); paintBell(); });
  document.getElementById('logo').innerHTML = '<img src="' + APP.brand.logoIcon + '" alt="" width="40" height="40">';
  Q.langButton(document.getElementById('langBtn'));
  Q.applyLang();
  render();
  paintBell();
})();
