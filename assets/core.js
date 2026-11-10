/* Shared helpers: storage, language, icons, dates, toast, bottom sheet. */
(function () {
  const PREFIX = 'sfs_';

  const Store = {
    get(k, d) { try { const v = localStorage.getItem(PREFIX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    push(k, item, max) { const a = Store.get(k, []); a.unshift(item); if (max && a.length > max) a.length = max; return Store.set(k, a); },
    clear() { try { Object.keys(localStorage).filter(k => k.startsWith(PREFIX) && k !== PREFIX + 'lang').forEach(k => localStorage.removeItem(k)); } catch (e) {} },
    PREFIX
  };

  let lang = Store.get('lang', APP.defaultLang || 'ar');
  const L = o => o == null ? '' : typeof o === 'string' ? o : (o[lang] != null ? o[lang] : (o.en || ''));
  function t(key, vars) {
    let s = APP.i18n[lang] && APP.i18n[lang][key];
    if (s == null) s = APP.i18n.en[key];
    if (s == null) s = key;
    if (vars) Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function applyLang() {
    const h = document.documentElement;
    h.lang = lang; h.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); el.title = t(el.dataset.i18nLabel); });
    document.querySelectorAll('[data-brand]').forEach(el => { el.textContent = L(APP.brand[el.dataset.brand]); });
    const tk = document.body.dataset.titleKey;
    document.title = (tk ? t(tk) + ' · ' : '') + L(APP.brand.name);
    document.dispatchEvent(new CustomEvent('langchange'));
  }
  function setLang(l) { lang = l; Store.set('lang', l); applyLang(); }
  const getLang = () => lang;

  /* Line icons (Lucide shapes) */
  const ICONS = {
    calendar: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    calcheck: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/>',
    calx: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18M10 14l4 4M14 14l-4 4"/>',
    star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    contact: '<path d="M16 2v2M8 2v2"/><rect x="3" y="4" width="18" height="18" rx="3"/><circle cx="12" cy="11" r="3"/><path d="M7 19a5 5 0 0 1 10 0"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    userplus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    repeat: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 17v2M13 11v2"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    pill: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
    flask: '<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7M7 16h10"/>',
    tooth: '<path d="M7 3C5 3 3 4.5 3 7.5c0 2 1 3.5 1.5 5.5.6 2.5 1 8 3 8 1.5 0 1.7-4 4.5-4s3 4 4.5 4c2 0 2.4-5.5 3-8 .5-2 1.5-3.5 1.5-5.5C21 4.5 19 3 17 3c-2 0-3 1-5 1S9 3 7 3z"/>',
    steth: '<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 12 0V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 12 0v-4"/><circle cx="20" cy="10" r="2"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    google: '<path d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.5Z"/><path d="M12 22c2.7 0 5-.9 6.8-2.4l-3.3-2.6c-.9.6-2.1 1-3.5 1-2.7 0-4.9-1.8-5.7-4.2H2.9v2.6A10 10 0 0 0 12 22Z"/><path d="M6.3 13.8a6 6 0 0 1 0-3.8V7.4H2.9a10 10 0 0 0 0 9Z"/><path d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9A10 10 0 0 0 2.9 7.4l3.4 2.6C7.1 7.7 9.3 6 12 6Z"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    phoneSmall: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'
  };
  function icon(name, cls) {
    return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  const spec = id => APP.specialties.find(s => s.id === id) || { color: '#0E7C7B', name: '' };
  const doctor = id => APP.doctors.find(d => d.id === id);
  function initials(o) {
    const n = L(o).replace(/^(د\.|Dr\.)\s*/, '').replace(/\bAl-/g, '').replace(/(^|\s)ال/g, '$1');
    const p = n.trim().split(/\s+/);
    return (p[0] || '').charAt(0) + (p.length > 1 ? '‌' + p[p.length - 1].charAt(0) : '');
  }
  const avatar = (doc, cls) => '<span class="avatar ' + (cls || '') + '" style="--c:' + spec(doc.spec).color + '">' + esc(initials(doc.name)) + '</span>';

  /* Dates and times */
  const locale = () => lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB';
  function fmt(ts, opts) { try { return new Intl.DateTimeFormat(locale(), opts).format(new Date(ts)); } catch (e) { return new Date(ts).toDateString(); } }
  function slot(time) {
    const p = time.split(':').map(Number), h = p[0] % 12 || 12;
    return h + ':' + String(p[1]).padStart(2, '0') + ' ' + (p[0] < 12 ? t('am') : t('pm'));
  }
  function ago(ts) {
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return t('ago_now');
    if (m < 60) return t('ago_min', { n: m });
    const h = Math.round(m / 60); if (h < 24) return t('ago_h', { n: h });
    return t('ago_d', { n: Math.round(h / 24) });
  }
  const num = n => Number(n).toLocaleString('en-US');
  const ref = p => p + '-' + (Math.floor(Math.random() * 9000) + 1000);
  const toLatin = s => String(s || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));

  /* Toast */
  let tt;
  function toast(msg, kind) {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    el.className = 'toast show ' + (kind || '');
    el.innerHTML = icon(kind === 'err' ? 'x' : kind === 'bell' ? 'bell' : 'check') + '<span>' + esc(msg) + '</span>';
    clearTimeout(tt); tt = setTimeout(() => { el.className = 'toast ' + (kind || ''); }, 3400);
  }

  /* Bottom sheet (centred dialog on wide screens) */
  function sheet(html, opts) {
    opts = opts || {};
    const prev = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = '<div class="sheet ' + (opts.cls || '') + '" role="dialog" aria-modal="true"><span class="grab" aria-hidden="true"></span><button class="sheet-x" type="button" aria-label="' + esc(t('close')) + '">' + icon('x') + '</button>' + html + '</div>';
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('open'));
    let closed = false;
    function close() {
      if (closed) return; closed = true;
      wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 220);
      document.removeEventListener('keydown', onKey);
      if (prev && prev.focus) try { prev.focus({ preventScroll: true }); } catch (e) {}
      if (opts.onClose) opts.onClose();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('.sheet-x') || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', onKey);
    const first = wrap.querySelector('.sheet input, .sheet textarea') || wrap.querySelector('.sheet .btn');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 80);
    return { el: wrap.querySelector('.sheet'), close };
  }

  // a language switch in another tab or frame switches this page too
  window.addEventListener('storage', e => {
    if (e.key !== PREFIX + 'lang' || !e.newValue) return;
    try { const l = JSON.parse(e.newValue); if (l !== lang) { lang = l; applyLang(); } } catch (err) {}
  });

  function langButton(btn) {
    const paint = () => { btn.innerHTML = icon('globe') + '<span data-short="' + (lang === 'ar' ? 'EN' : 'ع') + '">' + (lang === 'ar' ? 'English' : 'العربية') + '</span>'; btn.setAttribute('aria-label', lang === 'ar' ? 'English' : 'العربية'); btn.setAttribute('lang', lang === 'ar' ? 'en' : 'ar'); };
    btn.addEventListener('click', () => setLang(lang === 'ar' ? 'en' : 'ar'));
    document.addEventListener('langchange', paint); paint();
  }

  /* centre a chip inside its sideways-scrolling row without moving the page */
  function hcenter(el) {
    if (!el || !el.parentElement) return;
    const c = el.parentElement, a = el.getBoundingClientRect(), b = c.getBoundingClientRect();
    c.scrollLeft += (a.left + a.width / 2) - (b.left + b.width / 2);
  }

  window.Q = { hcenter, Store, L, t, esc, applyLang, setLang, getLang, icon, spec, doctor, avatar, fmt, slot, ago, num, ref, toLatin, toast, sheet, langButton };
})();
