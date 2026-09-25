/* nw-form-kit.js — shared add-on for the app's forms (RFI, Change Order, Service Call, Start-Up, Site Survey,
   Work Order, PM Checklist). Load it at the end of the page, after the form's own script.
   - Same look as the Submittal page (white cards, clean inputs, one action bar: Save / Send / Download).
   - "Attachments" card at the end of every form: add PDF backup (drawings, quotes, vendor docs…); the PDFs are
     appended to the form's PDF for Download, Send and the copy filed in Drive.
   - Every save files the PDF into the project's Google Drive folder (RFI, Change Orders, Reports/…). Saving again
     replaces the same Drive file (same link), so the project folder always holds the latest version.
   - Reopening a saved form (?edit=<id>) restores its attachments; "Save as revision" keeps the original and
     creates <number>-R1, -R2… (the Change Order form keeps its own Rev numbering). */
(function() {
  'use strict';
  var PAGES = {
    'rfi.html':                 { type: 'rfi',          label: 'RFI',                 folder: 'RFI',                   category: 'rfi',            title: function(d) { return d.rfiSubject; } },
    'change-order.html':        { type: 'change-order', label: 'Change Order',        folder: 'Change Orders',         category: 'change-orders',  title: function(d) { return d.coNumber ? '#' + d.coNumber : ''; }, ownRevisions: true },
    'service-call-report.html': { type: 'service-call', label: 'Service Call Report', folder: 'Reports/Service Calls', category: 'reports',        title: function(d) { return d.custName; } },
    'startup-report.html':      { type: 'startup',      label: 'Start-Up Report',     folder: 'Reports/Start-Up',      category: 'reports',        title: function(d) { return d.custName || d.projectName; } },
    'site-survey-report.html':  { type: 'site-survey',  label: 'Site Survey',         folder: 'Reports/Site Surveys',  category: 'reports',        title: function(d) { return d.custName || d.siteName; } },
    'work-order.html':          { type: 'work-order',   label: 'Work Order',          folder: 'Reports/Work Orders',   category: 'reports',        title: function(d) { return d.custName; } },
    'pm-checklist.html':        { type: 'pm-checklist', label: 'PM Checklist',        folder: 'Reports/PM Checklists', category: 'reports',        title: function(d) { return d.custName; } }
  };
  var page = (location.pathname.split('/').pop() || '').toLowerCase();
  var cfg = PAGES[page];
  if (!cfg) return;

  var params = new URLSearchParams(location.search);
  var K = window.NWFormKit = {
    cfg: cfg,
    files: [],                 // [{name, size, pages, file?: File, driveId?: string, bytes?: ArrayBuffer}]
    driveId: null, driveUrl: null,
    revisionOf: null,
    reviseMode: params.get('revise') === '1'
  };

  // ---------------------------------------------------------------- look & feel
  var CSS = [
    'body.nwk{background:#f7f8fa}',
    'body.nwk .header{background:#fff;border-bottom:1px solid #e5e7eb}',
    'body.nwk .section{max-width:832px;margin:14px auto;border:1px solid #e5e7eb;border-radius:12px;background:#fff;box-shadow:none}',
    '@media(max-width:860px){body.nwk .section{margin:12px}}',
    'body.nwk .section-header{border-left:0;color:#4b5563;font-size:13px;letter-spacing:.06em;padding:14px 16px;background:#fff}',
    'body.nwk .section-body{padding:4px 16px 16px}',
    'body.nwk .ai-chat-banner{max-width:832px;margin:12px auto 0;background:#fff;border:1px solid #e5e7eb;border-radius:12px}',
    'body.nwk .field label{color:#6b7280;font-weight:700;font-size:11px;letter-spacing:.04em}',
    'body.nwk .field input,body.nwk .field select,body.nwk .field textarea{border:1px solid #d1d5db;border-radius:8px;padding:9px 11px;font-size:14px;background:#fff;color:#111318}',
    'body.nwk .field input:focus,body.nwk .field select:focus,body.nwk .field textarea:focus{border-color:#0696D7;outline:none;box-shadow:0 0 0 3px rgba(6,150,215,.12)}',
    'body.nwk .bottom-bar{display:flex;gap:10px;justify-content:center;background:#fff;border-top:1px solid #e5e7eb;padding:10px 14px calc(10px + env(safe-area-inset-bottom))}',
    'body.nwk .bottom-bar .btn{border-radius:10px;padding:13px 8px;font-size:15px;max-width:220px;flex:1}',
    'body.nwk .bottom-bar .btn-secondary,body.nwk .bottom-bar .btn-primary{background:#fff;color:#111318;border:1px solid #d1d5db}',
    'body.nwk .bottom-bar .btn-success{background:#0696D7;color:#fff;border:1px solid #0696D7}',
    'body.nwk .bottom-bar .nwk-save{background:#111318;color:#fff;border:1px solid #111318}',
    'body.nwk .bottom-bar .nwk-draft{flex:0 0 auto;max-width:90px;font-size:13px}',
    '.nwk-drop{border:2px dashed #cbd5e1;border-radius:12px;padding:20px 12px;text-align:center;color:#6b7280;font-size:14px;cursor:pointer;background:#fafafa}',
    '.nwk-drop.over{border-color:#0696D7;background:#eff8fd}.nwk-drop b{color:#0696D7}',
    '.nwk-att{display:flex;align-items:center;gap:10px;padding:9px 10px;border:1px solid #e5e7eb;border-radius:8px;margin-top:8px;font-size:13px;background:#fff}',
    '.nwk-att .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.nwk-att .meta{color:#6b7280;font-size:12px;white-space:nowrap}',
    '.nwk-att button{border:1px solid #e5e7eb;background:#fff;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:13px}',
    '.nwk-note{font-size:12px;color:#6b7280;margin-top:8px}',
    '.nwk-banner{max-width:832px;margin:12px auto 0;padding:10px 14px;border-radius:10px;font-size:13px;background:#eff8fd;border:1px solid #bae6fd;color:#075985}',
    '@media(max-width:860px){.nwk-banner{margin:12px 12px 0}}',
    '.nwk-busy{position:fixed;inset:0;background:rgba(255,255,255,.8);display:none;align-items:center;justify-content:center;z-index:9000;flex-direction:column;gap:12px;font:600 14px -apple-system,Segoe UI,Roboto,sans-serif;color:#111318}',
    '.nwk-busy.show{display:flex}.nwk-spin{width:34px;height:34px;border:3px solid #e5e7eb;border-top-color:#0696D7;border-radius:50%;animation:nwkspin .7s linear infinite}',
    '@keyframes nwkspin{to{transform:rotate(360deg)}}',
    '.nwk-modal{position:fixed;inset:0;background:rgba(17,19,24,.45);display:flex;align-items:center;justify-content:center;z-index:9001;padding:16px}',
    '.nwk-modal>div{background:#fff;border-radius:14px;max-width:420px;width:100%;padding:18px;font:14px -apple-system,Segoe UI,Roboto,sans-serif;color:#111318}',
    '.nwk-modal h3{margin:0 0 8px;font-size:17px}.nwk-modal p{margin:0 0 14px;color:#4b5563;font-size:13px}',
    '.nwk-modal button{display:block;width:100%;margin-top:8px;padding:12px;border-radius:10px;border:1px solid #d1d5db;background:#fff;font-weight:700;font-size:14px;cursor:pointer}',
    '.nwk-modal button.pri{background:#111318;color:#fff;border-color:#111318}'
  ].join('\n');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mb(b) { return (b / 1048576).toFixed(b < 10485760 ? 1 : 0) + ' MB'; }
  function toast(m) { if (typeof showToast === 'function') showToast(m); else console.log('[form-kit]', m); }
  function busy(on, txt) {
    var b = document.getElementById('nwkBusy');
    if (!b) { b = document.createElement('div'); b.id = 'nwkBusy'; b.className = 'nwk-busy'; b.innerHTML = '<div class="nwk-spin"></div><div data-t></div>'; document.body.appendChild(b); }
    b.querySelector('[data-t]').textContent = txt || 'Working…';
    b.classList.toggle('show', !!on);
  }
  function curReportId() {
    try { if (K.editNumber && typeof isEditMode === 'function' && isEditMode()) return String(K.editNumber); } catch (e) {}
    try { if (typeof reportId !== 'undefined' && reportId) return String(reportId); } catch (e) {}
    var el = document.getElementById('reportId'); return el ? el.textContent.trim() : '';
  }
  function projectId() { return typeof getSelectedProjectId === 'function' ? getSelectedProjectId() : null; }
  async function projectName(pid) {
    try { var p = typeof getSelectedProject === 'function' ? getSelectedProject() : null; if (p && (p.name || p.project_name)) return p.name || p.project_name; } catch (e) {}
    try { var r = await supabaseClient.from('projects').select('project_name').eq('id', pid).maybeSingle(); if (r.data) return r.data.project_name; } catch (e) {}
    return '';
  }

  // ---------------------------------------------------------------- PDF merge (pdf-lib loaded on demand)
  var pdfLibPromise = null;
  function ensurePdfLib() {
    if (window.PDFLib) return Promise.resolve();
    if (!pdfLibPromise) pdfLibPromise = new Promise(function(res, rej) {
      var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
      s.onload = res; s.onerror = function() { pdfLibPromise = null; rej(new Error('Could not load the PDF tools — check the internet connection')); };
      document.head.appendChild(s);
    });
    return pdfLibPromise;
  }
  function b64ToBytes(b64) { var bin = atob(b64), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  async function bytesOf(f) {
    if (f.bytes) return f.bytes;
    if (f.file) return (f.bytes = await f.file.arrayBuffer());
    if (f.driveId && window.NWDrive) { var r = await NWDrive.request({ action: 'file_data', fileId: f.driveId }); return (f.bytes = b64ToBytes(r.data)); }
    throw new Error('Attachment ' + f.name + ' is not available');
  }
  // jsPDF doc → Blob with the attachments appended
  K.mergeDoc = async function(doc) {
    var base = doc.output('arraybuffer');
    if (!K.files.length) return new Blob([base], { type: 'application/pdf' });
    await ensurePdfLib();
    var out = await PDFLib.PDFDocument.load(base);
    for (var i = 0; i < K.files.length; i++) {
      var src = await PDFLib.PDFDocument.load(await bytesOf(K.files[i]), { ignoreEncryption: true });
      (await out.copyPages(src, src.getPageIndices())).forEach(function(p) { out.addPage(p); });
    }
    return new Blob([await out.save()], { type: 'application/pdf' });
  };
  K.pdfBase64 = async function(doc) { return NWDrive.toBase64(await K.mergeDoc(doc)); };
  function downloadBlob(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name || 'report.pdf';
    document.body.appendChild(a); a.click(); setTimeout(function() { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  // every doc.save() on this page downloads the merged PDF when there are attachments
  (function patchSave(tries) {
    var J = window.jspdf && window.jspdf.jsPDF;
    if (!J || !J.API) { if (tries < 40) setTimeout(function() { patchSave(tries + 1); }, 250); return; }
    if (J.API.__nwkSave) return;
    var orig = J.API.save;
    J.API.save = function(name, opts) {
      if (!K.files.length) return orig.call(this, name, opts);
      var doc = this; busy(true, 'Adding attachments…');
      K.mergeDoc(doc).then(function(b) { busy(false); downloadBlob(b, name); })
        .catch(function(e) { busy(false); alert('Could not add the attachments: ' + e.message); orig.call(doc, name, opts); });
      return this;
    };
    J.API.__nwkSave = true;
  })(0);

  // ---------------------------------------------------------------- attachments card
  function addFiles(list) {
    var arr = [].slice.call(list || []);
    return arr.reduce(function(p, f) {
      return p.then(async function() {
        if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { toast('Only PDF files: ' + f.name); return; }
        var a = { name: f.name, size: f.size, pages: null, file: f };
        K.files.push(a); renderFiles();
        try { await ensurePdfLib(); var d = await PDFLib.PDFDocument.load(await bytesOf(a), { ignoreEncryption: true }); a.pages = d.getPageCount(); }
        catch (e) { a.pages = -1; }
        renderFiles();
      });
    }, Promise.resolve());
  }
  function renderFiles() {
    var el = document.getElementById('nwkList'); if (!el) return;
    el.innerHTML = K.files.map(function(a, i) {
      return '<div class="nwk-att"><span>📄</span><span class="nm">' + esc(a.name) + '</span><span class="meta">' +
        (a.pages === -1 ? '<span style="color:#dc2626">can\'t read · </span>' : (a.pages ? a.pages + ' pg · ' : '')) + (a.size ? mb(a.size) : 'saved') + '</span>' +
        (i > 0 ? '<button type="button" data-up="' + i + '" title="Move up">↑</button>' : '') + '<button type="button" data-rm="' + i + '" title="Remove">✕</button></div>';
    }).join('');
    el.querySelectorAll('[data-rm]').forEach(function(b) { b.onclick = function() { K.files.splice(+b.dataset.rm, 1); renderFiles(); }; });
    el.querySelectorAll('[data-up]').forEach(function(b) { b.onclick = function() { var i = +b.dataset.up, x = K.files[i]; K.files[i] = K.files[i - 1]; K.files[i - 1] = x; renderFiles(); }; });
  }
  function buildCard() {
    var card = document.createElement('div');
    card.className = 'section'; card.id = 'nwkAttach';
    card.innerHTML = '<div class="section-header"><span class="icon">📎</span> Attachments — PDF backup</div>' +
      '<div class="section-body"><div class="nwk-drop" id="nwkDrop">📎 <b>Attach PDF</b> or drop files here<br>' +
      '<span style="font-size:12px">Drawings, quotes, vendor docs… added at the end of this ' + esc(cfg.label) + ' PDF</span></div>' +
      '<input type="file" id="nwkFile" accept="application/pdf,.pdf" multiple style="display:none"><div id="nwkList"></div>' +
      '<div class="nwk-note">Saved with the ' + esc(cfg.label) + ' in the project folder: NW Projects / <i>project</i> / ' + esc(cfg.folder.replace('/', ' / ')) + '</div></div>';
    var bar = document.querySelector('.bottom-bar');
    if (bar && bar.parentNode) bar.parentNode.insertBefore(card, bar); else document.body.appendChild(card);
    var drop = card.querySelector('#nwkDrop'), inp = card.querySelector('#nwkFile');
    drop.addEventListener('click', function() { inp.click(); });
    drop.addEventListener('dragover', function(e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function() { drop.classList.remove('over'); });
    drop.addEventListener('drop', function(e) { e.preventDefault(); drop.classList.remove('over'); addFiles(e.dataTransfer.files); });
    inp.addEventListener('change', function() { addFiles(inp.files).then(function() { inp.value = ''; }); });
  }

  // ---------------------------------------------------------------- action bar: Save / Send / Download
  function reworkBars() {
    document.querySelectorAll('.bottom-bar').forEach(function(bar) {
      var hasOwnSave = false;
      bar.querySelectorAll('button').forEach(function(b) {
        var oc = b.getAttribute('onclick') || '';
        if (/generateAndDownload/.test(oc)) b.innerHTML = '⬇ Download';
        else if (/saveDraftAndClose/.test(oc)) { b.innerHTML = 'Draft'; b.classList.add('nwk-draft'); b.title = 'Keep a draft on this device only'; }
        else if (/saveAndGoBack/.test(oc)) { b.innerHTML = '💾 Save'; b.classList.add('nwk-save'); hasOwnSave = true; }
        else if (/Email|Send/i.test(oc)) b.innerHTML = '✉️ Send';
      });
      if (!hasOwnSave) {
        var s = document.createElement('button'); s.type = 'button'; s.className = 'btn nwk-save'; s.innerHTML = '💾 Save';
        s.title = 'Save and file the PDF in the project folder (no email)';
        s.addEventListener('click', function() { K.save().catch(function(e) { busy(false); alert('Save failed: ' + (e.message || e)); }); });
        var draft = bar.querySelector('.nwk-draft');
        bar.insertBefore(s, draft ? draft.nextSibling : bar.firstChild);
      }
    });
  }

  function ask(title, text, options) {
    return new Promise(function(res) {
      var m = document.createElement('div'); m.className = 'nwk-modal';
      m.innerHTML = '<div><h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' +
        options.map(function(o, i) { return '<button type="button" data-i="' + i + '"' + (o.primary ? ' class="pri"' : '') + '>' + esc(o.label) + '</button>'; }).join('') +
        '<button type="button" data-i="-1">Cancel</button></div>';
      document.body.appendChild(m);
      m.addEventListener('click', function(e) { var b = e.target.closest('button'); if (!b) return; m.remove(); var i = +b.dataset.i; res(i < 0 ? null : options[i].value); });
    });
  }

  // ---------------------------------------------------------------- revisions (<number>-R1, -R2…)
  K.startRevision = async function() {
    var cur = curReportId(), base = cur.replace(/-R\d+$/, ''), n = 1;
    try {
      var q = await supabaseClient.from('reports').select('report_number').like('report_number', base + '-R%');
      (q.data || []).forEach(function(r) { var m = /-R(\d+)$/.exec(r.report_number); if (m && +m[1] >= n) n = +m[1] + 1; });
    } catch (e) {}
    var newId = base + '-R' + n;
    try { reportId = newId; } catch (e) { console.warn('[form-kit] reportId is read-only on this page', e); }
    var el = document.getElementById('reportId'); if (el) el.textContent = newId;
    try { _editingCloudId = null; } catch (e) {}          // edit-utils: the next save inserts a new report
    K.revisionOf = cur; K.driveId = null; K.driveUrl = null; K.reviseMode = false;
    var b = document.getElementById('nwkBanner'); if (b) b.textContent = 'Revision ' + newId + ' of ' + cur + ' — the original stays unchanged.';
    return newId;
  };

  // ---------------------------------------------------------------- Save (cloud + project folder, no email)
  K.save = async function() {
    if (typeof requireProject === 'function' && !requireProject()) return;
    if (typeof collectData !== 'function') { alert('This form cannot be saved from here.'); return; }
    var editing = false; try { editing = typeof isEditMode === 'function' && isEditMode(); } catch (e) {}
    if (editing && !cfg.ownRevisions) {
      var choice = K.reviseMode ? 'revision' : await ask('Save changes', 'Update this ' + cfg.label + ', or keep it as it is and save your changes as a new revision?',
        [{ label: 'Update ' + curReportId(), value: 'update', primary: true }, { label: 'Save as new revision (-R)', value: 'revision' }]);
      if (!choice) return;
      if (choice === 'revision') await K.startRevision();
    }
    busy(true, 'Saving…');
    try {
      var d = collectData();
      if (cfg.ownRevisions) {   // Change Order keeps its own status / Rev numbering and edit mode
        var coEdit = null; try { coEdit = _editCloudId; } catch (e) {}
        if (!d._coStatus) d._coStatus = 'submitted';
        if (!d._revisionNumber) d._revisionNumber = 1;
        var res = coEdit ? await updateReportInCloud(coEdit, { form_data: d, status: d._coStatus })
                         : await saveReportToCloud(cfg.type, d, { reportId: curReportId(), projectId: projectId() });
        if (!coEdit && res && res.data) { try { _editCloudId = res.data.id; } catch (e) {} }
        if (typeof syncCOToPrimeContract === 'function') { try { await syncCOToPrimeContract(projectId()); } catch (e) { console.warn(e); } }
      } else {
        // re-saving a new form updates the same report (keyed on its number)
        var res = typeof saveOrUpdateReport === 'function'
          ? await saveOrUpdateReport(cfg.type, d, { reportId: curReportId(), projectId: projectId() })
          : await saveReportToCloud(cfg.type, d, { reportId: curReportId(), projectId: projectId() });
      }
      busy(false);
      if (res && res.error) { alert('Save failed: ' + (res.error.message || res.error)); return; }
      toast(K.lastFileError ? '✅ Saved (PDF not filed in Drive: ' + K.lastFileError + ')' : '✅ Saved' + (K.driveUrl ? ' — PDF is in the project folder' : ''));
    } catch (e) { busy(false); throw e; }
  };

  // ---------------------------------------------------------------- hooks: every cloud save also files the PDF in Drive
  async function prepare(fd) {
    if (!fd || typeof fd !== 'object') return;
    fd._projectId = fd._projectId || projectId();
    if (K.revisionOf) fd._revisionOf = K.revisionOf;
    var pid = fd._projectId;
    var pending = K.files.filter(function(f) { return !f.driveId && f.file; });
    if (pending.length && pid && window.NWDrive) {
      busy(true, 'Saving attachments…');
      var pname = await projectName(pid), num = fd.reportId || curReportId();
      for (var i = 0; i < pending.length; i++) {
        try {
          var up = await NWDrive.request({ action: 'upload_file', projectId: pid, projectName: pname, fileName: pending[i].name,
            fileData: await NWDrive.toBase64(pending[i].file), mimeType: 'application/pdf', category: cfg.category, folder: cfg.folder + '/Attachments/' + num });
          pending[i].driveId = up.file.id;
        } catch (e) { console.warn('[form-kit] attachment upload', e); }
      }
    }
    fd._attachments = K.files.filter(function(f) { return f.driveId; }).map(function(f) { return { name: f.name, size: f.size, pages: f.pages, driveId: f.driveId }; });
    if (K.driveId) { fd._driveId = K.driveId; fd._driveUrl = K.driveUrl; }
  }

  K.fileToDrive = async function(row, fd, origUpdate) {
    K.lastFileError = null;
    var pid = fd && fd._projectId;
    if (!pid || !window.NWDrive || typeof generatePDF !== 'function' || !row || !row.id) return;
    busy(true, 'Filing the PDF in the project folder…');
    try {
      var doc = await generatePDF();
      var blob = await K.mergeDoc(doc);
      var num = row.report_number || fd.reportId || curReportId();
      var extra = ''; try { extra = (cfg.title && cfg.title(fd)) || ''; } catch (e) {}
      var rev = cfg.ownRevisions && fd._revisionNumber > 1 ? ' Rev ' + fd._revisionNumber : '';
      var name = (num + ' - ' + cfg.label + (extra ? ' - ' + String(extra).slice(0, 50) : '') + rev).replace(/[\\/:*?"<>|]+/g, '-') + '.pdf';
      var b64 = await NWDrive.toBase64(blob), res = null, isNew = false;
      var existing = fd._driveId || K.driveId;
      if (existing) {
        try { res = await NWDrive.request({ action: 'replace_file', fileId: existing, fileData: b64, mimeType: 'application/pdf', fileName: name }); }
        catch (e) { console.warn('[form-kit] replace failed, uploading a new copy', e); res = null; }
      }
      if (!res) {
        res = await NWDrive.request({ action: 'upload_file', projectId: pid, projectName: await projectName(pid), fileName: name,
          fileData: b64, mimeType: 'application/pdf', category: cfg.category, folder: cfg.folder });
        isNew = true;
      }
      var f = res.file;
      K.driveId = f.id; K.driveUrl = f.viewUrl || f.url;
      if (fd._driveId !== f.id || fd._driveUrl !== K.driveUrl) {
        fd._driveId = f.id; fd._driveUrl = K.driveUrl;
        await origUpdate(row.id, { form_data: fd });
      }
      if (isNew) {
        try {
          var s = await supabaseClient.auth.getSession(), uid = s.data && s.data.session ? s.data.session.user.id : null;
          await supabaseClient.from('project_files').insert({ project_id: pid, category: cfg.category, filename: name, storage_path: null,
            drive_id: f.id, drive_url: K.driveUrl, size_bytes: blob.size, content_type: 'application/pdf', uploaded_by: uid });
        } catch (e) { console.warn('[form-kit] project_files', e); }
      }
      try { Object.keys(sessionStorage).forEach(function(k) { if (k.indexOf(pid) >= 0) sessionStorage.removeItem(k); }); } catch (e) {}
    } catch (e) {
      console.warn('[form-kit] filing in Drive failed', e);
      K.lastFileError = e.message || String(e);
    } finally { busy(false); }
  };

  function installHooks() {
    var origSave = window.saveReportToCloud, origUpd = window.updateReportInCloud;
    if (typeof origSave !== 'function' || typeof origUpd !== 'function' || origSave.__nwk) return;
    window.saveReportToCloud = async function(type, fd, opts) {
      await prepare(fd); busy(false);
      var r = await origSave.apply(this, arguments);
      if (r && r.data) await K.fileToDrive(r.data, fd, origUpd);
      return r;
    };
    window.updateReportInCloud = async function(id, updates) {
      var fd = updates && updates.form_data;
      if (fd) { await prepare(fd); busy(false); }
      var r = await origUpd.apply(this, arguments);
      if (fd) {
        var row = (r && r.data) || { id: id, report_number: fd.reportId };
        if (!row.id) row.id = id;
        await K.fileToDrive(row, fd, origUpd);
      }
      return r;
    };
    window.saveReportToCloud.__nwk = true;
  }

  // ---------------------------------------------------------------- reopening a saved form: bring back attachments + Drive copy
  async function loadEdit() {
    var id = params.get('edit'); if (!id || typeof getReportById !== 'function') return;
    try {
      var r = await getReportById(id), fd = r && r.data && r.data.form_data;
      if (!fd) return;
      // the page generated a fresh number on load; an opened report keeps its own number (PDF, Drive name, revisions)
      K.editNumber = r.data.report_number || fd.reportId || null;
      if (K.editNumber) {
        try { reportId = K.editNumber; } catch (e) {}
        var rid = document.getElementById('reportId'); if (rid) rid.textContent = K.editNumber;
      }
      K.driveId = fd._driveId || null; K.driveUrl = fd._driveUrl || null;
      K.files = (fd._attachments || []).map(function(a) { return { name: a.name, size: a.size, pages: a.pages, driveId: a.driveId }; });
      renderFiles();
      var b = document.getElementById('nwkBanner');
      if (b) {
        b.innerHTML = K.reviseMode && !cfg.ownRevisions
          ? 'Revision of <b>' + esc(r.data.report_number) + '</b> — <b>Save</b> creates a new revision; the original stays unchanged.'
          : 'Editing <b>' + esc(r.data.report_number) + '</b>' + (K.driveUrl ? ' · <a href="' + esc(K.driveUrl) + '" target="_blank">PDF in project folder ↗</a>' : '');
        b.style.display = '';
      }
    } catch (e) { console.warn('[form-kit] loadEdit', e); }
  }

  function init() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    document.body.classList.add('nwk');
    var banner = document.createElement('div'); banner.id = 'nwkBanner'; banner.className = 'nwk-banner'; banner.style.display = 'none';
    var hdr = document.querySelector('.header'); if (hdr && hdr.parentNode) hdr.parentNode.insertBefore(banner, hdr.nextSibling);
    buildCard();
    reworkBars();
    installHooks();
    loadEdit();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
