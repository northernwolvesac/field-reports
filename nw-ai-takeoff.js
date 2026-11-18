/* ═══════════════════════════════════════════════════════════════════════════
   nw-ai-takeoff.js — "Run AI Takeoffs" from the regular Takeoff (Russ 11/18/2026)

   The estimator stays in the normal Bid Board → project → Takeoff screens. The AI pipeline of
   ai-estimator.html (copy the plans, sort the sheets, read every HVAC sheet, measure ducts / pipes,
   price, lay the result out as takeoff layers + marks) runs in a hidden frame:
       ai-estimator.html?run=<estimate id>[&d=<drawing id>&p=<page>]
   on the plans already uploaded to the bid. The result goes to the bid's "AI Takeoff" version
   (an alternate of the same bid, created on the first run, re-used afterwards), so the estimator's
   own takeoff (E1) is never touched; the AI review tab of that version lists everything the AI made.

   window.NWAiTakeoff
     LABEL                                   'AI Takeoff' (version label of the AI alternate)
     targetFor(estimateId) → Promise<{id, created}>
     run({ estimateId, drawingId, page, sheetLabel, onTarget(id), onDone(id) }) → Promise<void>
     running() → bool
     uploadChoice(files) → Promise<null | {ai: bool}>   "Upload drawings" dialog with "Run AI Takeoff after upload" (off)
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var LABEL = 'AI Takeoff';
  var cur = null;

  function sb() { return window.supabaseClient; }
  function PCx() { return window.PC; }
  function toast(m, t) { if (PCx() && PCx().toast) PCx().toast(m, t); else console.log('[ai takeoff]', m); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // the bid's AI Takeoff version: the current one when it is already that, else the alternate labelled LABEL, else a new empty alternate
  async function targetFor(estimateId) {
    var r = await sb().from('estimates').select('id,parent_estimate_id,version_label').eq('id', estimateId).single();
    if (r.error || !r.data) throw new Error(r.error ? r.error.message : 'estimate not found');
    if (r.data.version_label === LABEL) return { id: r.data.id, created: false };
    var root = r.data.parent_estimate_id || r.data.id;
    var s = await sb().from('estimates').select('id').eq('parent_estimate_id', root).eq('version_label', LABEL).order('created_at').limit(1);
    if (s.data && s.data[0]) return { id: s.data[0].id, created: false };
    if (!window.BidActions || !BidActions.insertAlternate) throw new Error('bid-actions.js is not loaded on this page');
    var id = await BidActions.insertAlternate(root, { label: LABEL });
    return { id: id, created: true };
  }

  function injectCss() {
    if (document.getElementById('nwAiCss')) return;
    var st = document.createElement('style'); st.id = 'nwAiCss';
    st.textContent = '#nwAiPanel{position:fixed;right:16px;bottom:72px;z-index:6000;width:360px;max-width:calc(100vw - 32px);background:#fff;border:1px solid #d6dbe1;border-radius:10px;box-shadow:0 10px 30px rgba(15,23,42,.18);padding:14px 16px;font:13px/1.45 Inter,Arial,sans-serif;color:#1f2933}' +
      '#nwAiPanel .h{display:flex;align-items:center;gap:8px;margin-bottom:6px}#nwAiPanel .h b{font-size:14px;flex:1}#nwAiPanel .t{color:#6b7280;font-size:12px}' +
      '#nwAiPanel .bar{height:6px;background:#eef1f4;border-radius:4px;overflow:hidden;margin:8px 0 6px}#nwAiPanel .bar i{display:block;height:100%;width:2%;background:#ff5200;transition:width .4s}' +
      '#nwAiPanel .sub{color:#6b7280;font-size:12px}#nwAiPanel .btns{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}' +
      '#nwAiPanel button{border:1px solid #d6dbe1;background:#fff;border-radius:6px;padding:6px 12px;font:600 12px Inter,Arial,sans-serif;cursor:pointer}#nwAiPanel button.p{background:#ff5200;border-color:#ff5200;color:#fff}' +
      '#nwAiPanel.ok .bar i{background:#16a34a}#nwAiPanel.err .bar i{background:#dc2626}';
    document.head.appendChild(st);
  }
  function panel() {
    injectCss();
    var el = document.getElementById('nwAiPanel');
    if (!el) { el = document.createElement('div'); el.id = 'nwAiPanel'; document.body.appendChild(el); }
    el.className = '';
    el.innerHTML = '<div class="h"><b>AI Takeoff</b><span class="t" id="nwAiTime"></span></div><div id="nwAiMsg">Starting…</div>' +
      '<div class="bar"><i id="nwAiBar"></i></div><div class="sub" id="nwAiSub">Keep this page open — the AI works in this browser tab. You can keep working.</div>' +
      '<div class="btns" id="nwAiBtns"><button type="button" id="nwAiStop">Stop</button></div>';
    el.querySelector('#nwAiStop').onclick = stop;
    return el;
  }
  // progress: copy 0-6 %, read 6-75 % (sheets done / total), measure 75-90 %, price + estimate + takeoff 90-100 %
  var BASE = { start: 1, import: 3, triage: 6, read: 6, measure: 75, price: 90, estimate: 93, takeoff: 95, done: 100 };
  function pct(d) {
    if (d.step === 'read' && d.total) return 6 + 69 * Math.min(1, (d.done || 0) / d.total);
    if (d.step === 'measure' && d.total) return 75 + 15 * Math.min(1, (d.done || 0) / d.total);
    return BASE[d.step] != null ? BASE[d.step] : null;
  }
  function onMsg(e) {
    if (!cur || e.origin !== location.origin || !cur.ifr || e.source !== cur.ifr.contentWindow) return;
    var d = e.data && e.data.nwAi; if (!d) return;
    var m = document.getElementById('nwAiMsg'), b = document.getElementById('nwAiBar');
    if (d.step === 'note') { var s = document.getElementById('nwAiSub'); if (s && d.msg) s.textContent = d.msg; return; }
    if (m && d.msg) m.textContent = d.msg;
    var p = pct(d); if (b && p != null) b.style.width = Math.max(2, Math.round(p)) + '%';
    if (d.step === 'done') finish(true, d);
    else if (d.step === 'error') finish(false, d);
  }
  function onLeave(e) { if (cur) { e.preventDefault(); e.returnValue = ''; } }
  function tick() { if (!cur) return; var t = document.getElementById('nwAiTime'), s = Math.round((Date.now() - cur.t0) / 1000); if (t) t.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function cleanup() {
    window.removeEventListener('message', onMsg); window.removeEventListener('beforeunload', onLeave);
    if (cur) { clearInterval(cur.timer); var f = cur.ifr; setTimeout(function () { if (f && f.parentNode) f.parentNode.removeChild(f); }, 1500); }
  }
  function finish(ok, d) {
    if (!cur) return;
    var c = cur; cleanup(); cur = null;
    var el = document.getElementById('nwAiPanel'); if (!el) return;
    el.className = ok ? 'ok' : 'err';
    var sub = document.getElementById('nwAiSub'), btns = document.getElementById('nwAiBtns');
    if (ok) {
      sub.textContent = 'The marks are on the plans of the "' + LABEL + '" version. Check them in the AI review tab, fix what is off, then roll it into the estimate.' + (d.cost ? ' AI cost ≈ $' + Number(d.cost).toFixed(2) + '.' : '');
      btns.innerHTML = '<button type="button" id="nwAiClose">Close</button><button type="button" class="p" id="nwAiOpen">Open AI Takeoff</button>';
      btns.querySelector('#nwAiOpen').onclick = function () { el.remove(); if (c.o.onDone) c.o.onDone(c.target); };
      toast('AI Takeoff is ready', 'success');
    } else {
      sub.textContent = 'What was read so far is kept — run it again to continue from there.';
      btns.innerHTML = '<button type="button" id="nwAiClose">Close</button>';
    }
    btns.querySelector('#nwAiClose').onclick = function () { el.remove(); };
  }
  async function stop() {
    if (!cur) return;
    var ok = PCx() && PCx().confirm ? await PCx().confirm({ title: 'Stop the AI takeoff?', message: 'The sheets read so far are kept — running it again continues from there.', okLabel: 'Stop', danger: true }) : window.confirm('Stop the AI takeoff?');
    if (!ok || !cur) return;
    cleanup(); cur = null;
    var el = document.getElementById('nwAiPanel'); if (el) el.remove();
    toast('AI takeoff stopped');
  }

  async function run(o) {
    o = o || {};
    if (cur) { toast('The AI takeoff is already running in this tab', 'error'); return; }
    if (!o.estimateId) { toast('No estimate', 'error'); return; }
    var el = panel(); document.getElementById('nwAiMsg').textContent = 'Preparing the "' + LABEL + '" version…';
    var t;
    try { t = await targetFor(o.estimateId); }
    catch (e) { el.remove(); toast('AI takeoff: ' + (e.message || e), 'error'); return; }
    if (t.created && o.onTarget) { try { o.onTarget(t.id); } catch (e2) {} }
    var ifr = document.createElement('iframe');
    ifr.setAttribute('aria-hidden', 'true'); ifr.tabIndex = -1;
    ifr.style.cssText = 'position:fixed;left:-40px;top:-40px;width:20px;height:20px;opacity:0;pointer-events:none;border:0';
    ifr.src = 'ai-estimator.html?run=' + encodeURIComponent(t.id) + (o.drawingId ? '&d=' + encodeURIComponent(o.drawingId) + '&p=' + (Number(o.page) || 1) : '');
    cur = { ifr: ifr, target: t.id, t0: Date.now(), o: o };
    cur.timer = setInterval(tick, 1000);
    window.addEventListener('message', onMsg);
    window.addEventListener('beforeunload', onLeave);
    document.getElementById('nwAiMsg').textContent = o.drawingId ? 'Starting on ' + (o.sheetLabel || 'this sheet') + '…' : 'Starting on the whole drawing set…';
    document.body.appendChild(ifr);
  }

  // the upload picker's files → "Upload N drawings" with the AI option (off by default, Russ 11/18/2026)
  function uploadChoice(files) {
    return new Promise(function (resolve) {
      var P = PCx(); if (!P || !P.modal) { resolve({ ai: false }); return; }
      var done = false, list = Array.prototype.slice.call(files || []);
      var body = '<div style="max-height:180px;overflow:auto;margin-bottom:12px">' + list.map(function (f) { return '<div style="padding:3px 0">📄 ' + esc(f.name) + ' <span class="pc-muted">' + (f.size ? (f.size / 1048576).toFixed(1) + ' MB' : '') + '</span></div>'; }).join('') + '</div>' +
        '<label class="pc-check" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="nwAiUp"> <span><b>Run AI Takeoff after upload</b><br><span class="pc-muted" style="font-size:12px">The AI reads the HVAC sheets and lays ducts, pipes and devices out in a separate "' + LABEL + '" version of this bid — your own takeoff is not touched. About $0.06 a sheet, a few minutes per 10 sheets; keep the page open.</span></span></label>';
      P.modal({ title: 'Upload ' + list.length + ' drawing' + (list.length === 1 ? '' : 's'), body: body, size: 'sm',
        buttons: [{ label: 'Cancel', onClick: function () { done = true; resolve(null); } },
          { label: 'Upload', primary: true, onClick: function (ctx) { done = true; resolve({ ai: !!ctx.body.querySelector('#nwAiUp').checked }); } }],
        onClose: function () { if (!done) resolve(null); } });
    });
  }

  window.NWAiTakeoff = { LABEL: LABEL, targetFor: targetFor, run: run, running: function () { return !!cur; }, uploadChoice: uploadChoice };
})();
