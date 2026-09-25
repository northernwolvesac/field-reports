/* nw-drive-browser.js — folder browser for a project's Google Drive folder (NW Projects/<project>)
   Shows the live folder tree exactly as it is in Google Drive: sub-folders first, then files.
   Requires nw-drive.js (NWDrive) and, optionally, supabaseClient (project_files rows are kept in sync on upload/delete). */
(function() {
  'use strict';
  var CACHE_TTL = 10 * 60 * 1000;
  var CAT_BY_FOLDER = { 'contract': 'contracts', 'change orders': 'change-orders', 'submittals': 'submittals', 'drawings': 'drawings',
    'shop drawings': 'drawings', 'quotes': 'quotes', 'rfi': 'rfi', 'photos': 'photos', 'reports': 'reports', 'report': 'reports',
    'iom & warranty': 'manuals', 'ioms': 'manuals', 'application for payment': 'other', 'proposal': 'quotes' };
  var CSS = '' +
    '.nwdb{font-family:inherit;color:var(--nw-text,#1a2332)}' +
    '.nwdb-bar{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--nw-border,#e2e8f0);flex-wrap:wrap}' +
    '.nwdb-crumbs{display:flex;align-items:center;gap:4px;flex:1;min-width:0;flex-wrap:wrap;font-size:13px}' +
    '.nwdb-crumb{background:none;border:none;padding:4px 6px;border-radius:var(--nw-radius-btn,4px);color:var(--nw-primary,#0696D7);font-weight:600;cursor:pointer;font-size:13px;font-family:inherit;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.nwdb-crumb:hover{background:var(--nw-section,#f1f5f9)}' +
    '.nwdb-crumb.cur{color:var(--nw-text,#1a2332);cursor:default;background:none}' +
    '.nwdb-sep{color:var(--nw-muted,#94a3b8)}' +
    '.nwdb-actions{display:flex;gap:6px;align-items:center}' +
    '.nwdb-btn{border:1px solid var(--nw-border,#e2e8f0);background:var(--nw-card,#fff);color:var(--nw-text,#1a2332);padding:6px 10px;border-radius:var(--nw-radius-btn,4px);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;text-decoration:none;display:inline-flex;align-items:center;gap:4px}' +
    '.nwdb-btn.primary{background:var(--nw-primary,#0696D7);border-color:var(--nw-primary,#0696D7);color:#fff}' +
    '.nwdb-btn:disabled{opacity:.5;cursor:default}' +
    '.nwdb-search{padding:8px 12px;border-bottom:1px solid var(--nw-border,#e2e8f0)}' +
    '.nwdb-search input{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--nw-border,#e2e8f0);border-radius:var(--nw-radius-btn,4px);font-size:13px;font-family:inherit}' +
    '.nwdb-list{padding:6px 12px 16px}' +
    '.nwdb-row{display:flex;align-items:center;gap:10px;padding:10px 10px;border:1px solid var(--nw-border,#e2e8f0);border-radius:var(--nw-radius-card,4px);background:var(--nw-card,#fff);margin-bottom:6px;cursor:pointer;min-height:44px;box-sizing:border-box}' +
    '.nwdb-row:hover{border-color:var(--nw-primary,#0696D7)}' +
    '.nwdb-row.folder{background:var(--nw-section,#f8f8f8)}' +
    '.nwdb-ico{width:34px;height:34px;border-radius:var(--nw-radius-btn,4px);background:var(--nw-card,#fff);border:1px solid var(--nw-border,#e2e8f0);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}' +
    '.nwdb-row.folder .nwdb-ico{background:#fff7ed;border-color:#fed7aa}' +
    '.nwdb-info{flex:1;min-width:0}' +
    '.nwdb-name{font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.nwdb-meta{font-size:11px;color:var(--nw-muted,#64748b);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.nwdb-x{background:none;border:none;color:var(--nw-muted,#94a3b8);font-size:15px;cursor:pointer;padding:6px 8px;border-radius:4px;flex-shrink:0}' +
    '.nwdb-x:hover{color:#dc2626;background:#fee2e2}' +
    '.nwdb-chev{color:var(--nw-muted,#94a3b8);font-size:18px;flex-shrink:0}' +
    '.nwdb-empty{padding:28px 12px;text-align:center;color:var(--nw-muted,#64748b);font-size:13px}' +
    '.nwdb-sec{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--nw-muted,#64748b);margin:10px 2px 6px}' +
    '.nwdb-prog{font-size:12px;color:var(--nw-primary,#0696D7);padding:6px 12px}';

  function ensureCss() {
    if (document.getElementById('nwdb-css')) return;
    var s = document.createElement('style'); s.id = 'nwdb-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fmtSize(b) { if (!b) return ''; var kb = b / 1024; return kb < 1024 ? kb.toFixed(kb < 10 ? 1 : 0) + ' KB' : (kb / 1024).toFixed(1) + ' MB'; }
  function fmtDate(iso) { if (!iso) return ''; var d = new Date(iso); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  function icon(name, mime) {
    var ext = (name || '').split('.').pop().toLowerCase();
    if (mime && mime.indexOf('google-apps.spreadsheet') >= 0) return '📊';
    if (mime && mime.indexOf('google-apps.document') >= 0) return '📝';
    if (ext === 'pdf') return '📕';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].indexOf(ext) >= 0) return '🖼️';
    if (['doc', 'docx', 'odt'].indexOf(ext) >= 0) return '📝';
    if (['xls', 'xlsx', 'csv'].indexOf(ext) >= 0) return '📊';
    if (['dwg', 'dxf', 'rvt'].indexOf(ext) >= 0) return '📐';
    if (['zip', 'rar', '7z'].indexOf(ext) >= 0) return '🗜️';
    if (ext === 'eml' || ext === 'msg') return '✉️';
    return '📄';
  }
  function cacheKey(pid) { return 'nwtree:' + pid; }
  function readCache(pid) {
    try { var c = JSON.parse(sessionStorage.getItem(cacheKey(pid)) || 'null'); if (c && Date.now() - c.ts < CACHE_TTL) return c.data; } catch (e) {}
    return null;
  }
  function writeCache(pid, data) { try { sessionStorage.setItem(cacheKey(pid), JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {} }

  // Field-only folders for technicians (everything financial stays hidden). Matches the proxy's FIELD_FOLDERS.
  var FIELD_FOLDERS = ['drawings', 'submittals', 'iom & warranty', 'shop drawings', 'reports', 'tab report', 'as builts', 'specs', 'photos'];
  function normName(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  var FIELD_SET = {}; FIELD_FOLDERS.forEach(function(n) { FIELD_SET[normName(n)] = true; });

  function Browser(host, opts) {
    this.host = host; this.opts = opts || {};
    this.projectId = opts.projectId; this.projectName = opts.projectName || '';
    this.canEdit = !!opts.canEdit;
    this.fieldOnly = !!opts.fieldOnly;
    this.tree = null; this.cur = null; this.query = '';
    ensureCss();
    host.classList.add('nwdb');
    host.innerHTML = '<div class="nwdb-empty">Loading folders…<br><span style="font-size:11px">Google Drive can take up to 20 seconds the first time</span></div>';
    this.load(false);
  }
  Browser.prototype.load = async function(force) {
    var self = this;
    var cached = force ? null : readCache(this.projectId);
    if (cached) { this.setTree(cached); return; }
    try {
      var r = await Promise.race([
        NWDrive.request({ action: 'list_tree', projectName: this.projectName, projectId: this.projectId }),
        new Promise(function(_, rej) { setTimeout(function() { rej(new Error('Google Drive did not answer in 45 seconds')); }, 45000); })
      ]);
      writeCache(this.projectId, r);
      this.setTree(r);
    } catch (e) {
      this.host.innerHTML = '<div class="nwdb-empty">Google Drive is not available right now.<br><span style="font-size:11px">' + esc(e.message) + '</span><br><br><button class="nwdb-btn" data-retry>Retry</button></div>';
      var b = this.host.querySelector('[data-retry]'); if (b) b.addEventListener('click', function() { self.load(true); });
    }
  };
  Browser.prototype.setTree = function(r) {
    this.tree = r; this.byId = {}; this.kids = {};
    var self = this;
    (r.items || []).forEach(function(it) { self.byId[it.id] = it; (self.kids[it.parent] = self.kids[it.parent] || []).push(it); });
    if (!this.cur || !this.byId[this.cur] && this.cur !== r.folderId) this.cur = r.folderId;
    this.render();
  };
  Browser.prototype.pathOf = function(id) {
    var parts = [], it = this.byId[id];
    while (it) { parts.unshift(it); it = this.byId[it.parent]; }
    return parts;
  };
  Browser.prototype.relPath = function(id) { return this.pathOf(id).map(function(p) { return p.name; }).join('/'); };
  // top-level folder of an item (or the item itself when it sits at the project root)
  Browser.prototype.topOf = function(id) { var p = this.pathOf(id); return p.length ? p[0] : null; };
  Browser.prototype.allowed = function(it) {
    if (!this.fieldOnly) return true;
    var top = it.folder && it.parent === this.tree.folderId ? it : this.topOf(it.parent === this.tree.folderId ? it.id : it.parent);
    if (!top) return false;                       // loose files at the project root are hidden for technicians
    return !!FIELD_SET[normName(top.name)];
  };
  Browser.prototype.countIn = function(id) {
    var n = 0, self = this;
    (this.kids[id] || []).forEach(function(k) { n += k.folder ? self.countIn(k.id) : 1; });
    return n;
  };
  Browser.prototype.render = function() {
    var self = this, t = this.tree, h = '';
    if (!t.folderId) {
      this.host.innerHTML = '<div class="nwdb-empty">No Google Drive folder for this project yet.' +
        (this.canEdit && !this.fieldOnly ? '<br><br><button class="nwdb-btn primary" data-create>Create folder in NW Projects</button>' : '') + '</div>';
      var cb = this.host.querySelector('[data-create]');
      if (cb) cb.addEventListener('click', async function() { cb.disabled = true; try { await NWDrive.request({ action: 'create_project', projectName: self.projectName, projectId: self.projectId }); await self.load(true); } catch (e) { alert('Drive: ' + e.message); cb.disabled = false; } });
      return;
    }
    // breadcrumbs
    var crumbs = [{ id: t.folderId, name: t.folderName || this.projectName || 'Project' }].concat(this.pathOf(this.cur));
    h += '<div class="nwdb-bar"><div class="nwdb-crumbs">📁 ';
    crumbs.forEach(function(c, i) {
      if (i) h += '<span class="nwdb-sep">›</span>';
      h += '<button class="nwdb-crumb' + (i === crumbs.length - 1 ? ' cur' : '') + '" data-go="' + c.id + '" title="' + esc(c.name) + '">' + esc(c.name) + '</button>';
    });
    h += '</div><div class="nwdb-actions">';
    var curUrl = this.cur === t.folderId ? t.folderUrl : (this.byId[this.cur] && this.byId[this.cur].url);
    h += '<a class="nwdb-btn" href="' + esc(curUrl || t.folderUrl) + '" target="_blank" rel="noopener" title="Open this folder in Google Drive">Drive ↗</a>';
    h += '<button class="nwdb-btn" data-refresh title="Refresh">⟳</button>';
    var canWriteHere = this.canEdit && (!this.fieldOnly || (this.cur !== t.folderId && this.allowed(this.byId[this.cur])));
    if (canWriteHere) h += '<button class="nwdb-btn" data-newfolder>+ Folder</button><button class="nwdb-btn primary" data-upload>⬆ Upload</button><input type="file" multiple style="display:none" data-file>';
    h += '</div></div>';
    h += '<div class="nwdb-search"><input type="search" placeholder="🔍 Search files in this project…" value="' + esc(this.query) + '" data-q></div>';
    h += '<div class="nwdb-prog" data-prog style="display:none"></div>';
    h += '<div class="nwdb-list">';
    if (this.query) {
      var q = this.query.toLowerCase();
      var hits = (t.items || []).filter(function(it) { return it.name.toLowerCase().indexOf(q) >= 0 && self.allowed(it); });
      hits.sort(function(a, b) { return (b.folder - a.folder) || a.name.localeCompare(b.name); });
      if (!hits.length) h += '<div class="nwdb-empty">Nothing found for “' + esc(this.query) + '”.</div>';
      hits.slice(0, 200).forEach(function(it) { h += self.rowHtml(it, self.relPath(it.parent)); });
    } else {
      var items = (this.kids[this.cur] || []).filter(function(it) { return self.allowed(it); });
      var folders = items.filter(function(i) { return i.folder; }).sort(function(a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }); });
      var files = items.filter(function(i) { return !i.folder; }).sort(function(a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }); });
      if (!folders.length && !files.length) h += '<div class="nwdb-empty">This folder is empty.' + (this.canEdit ? '<br>Tap <b>⬆ Upload</b> to add files here.' : '') + '</div>';
      folders.forEach(function(f) { h += self.rowHtml(f); });
      if (folders.length && files.length) h += '<div class="nwdb-sec">Files</div>';
      files.forEach(function(f) { h += self.rowHtml(f); });
      if (this.cur === t.folderId && !this.fieldOnly && this.opts.legacyRows && this.opts.legacyRows.length) {
        h += '<div class="nwdb-sec">In app storage (not in Drive)</div>';
        this.opts.legacyRows.forEach(function(r) {
          h += '<div class="nwdb-row" data-legacy="' + esc(r.id) + '"><div class="nwdb-ico">' + icon(r.filename) + '</div><div class="nwdb-info"><div class="nwdb-name">' + esc(r.filename) + '</div><div class="nwdb-meta">' + esc(r.category || '') + ' · ' + fmtDate(r.created_at) + (r.size_bytes ? ' · ' + fmtSize(r.size_bytes) : '') + '</div></div></div>';
        });
      }
    }
    h += '</div>';
    this.host.innerHTML = h;
    this.bind();
  };
  Browser.prototype.rowHtml = function(it, subtitle) {
    if (it.folder) {
      var n = this.countIn(it.id);
      return '<div class="nwdb-row folder" data-open-folder="' + it.id + '"><div class="nwdb-ico">📁</div><div class="nwdb-info"><div class="nwdb-name">' + esc(it.name) + '</div><div class="nwdb-meta">' + (subtitle ? esc(subtitle) + ' · ' : '') + (n ? n + ' file' + (n === 1 ? '' : 's') : 'empty') + '</div></div><span class="nwdb-chev">›</span></div>';
    }
    return '<div class="nwdb-row" data-open-file="' + it.id + '"><div class="nwdb-ico">' + icon(it.name, it.mimeType) + '</div><div class="nwdb-info"><div class="nwdb-name">' + esc(it.name) + '</div><div class="nwdb-meta">' + (subtitle ? esc(subtitle) + ' · ' : '') + fmtDate(it.modifiedTime) + (it.size ? ' · ' + fmtSize(it.size) : '') + '</div></div>' +
      (this.canEdit && !this.fieldOnly ? '<button class="nwdb-x" data-del="' + it.id + '" title="Delete">✕</button>' : '') + '</div>';
  };
  Browser.prototype.bind = function() {
    var self = this, host = this.host;
    host.querySelectorAll('[data-go]').forEach(function(b) { b.addEventListener('click', function() { self.cur = b.getAttribute('data-go'); self.query = ''; self.render(); }); });
    if (this.fieldOnly && this.cur !== this.tree.folderId && !this.allowed(this.byId[this.cur])) { this.cur = this.tree.folderId; this.render(); return; }
    host.querySelectorAll('[data-open-folder]').forEach(function(r) { r.addEventListener('click', function() { self.cur = r.getAttribute('data-open-folder'); self.query = ''; self.render(); }); });
    host.querySelectorAll('[data-open-file]').forEach(function(r) {
      r.addEventListener('click', function(e) {
        if (e.target.closest('[data-del]')) return;
        var it = self.byId[r.getAttribute('data-open-file')]; if (it) window.open(it.url, '_blank');
      });
    });
    host.querySelectorAll('[data-legacy]').forEach(function(r) {
      r.addEventListener('click', function() {
        var row = (self.opts.legacyRows || []).find(function(x) { return x.id === r.getAttribute('data-legacy'); });
        if (row && window.NWDrive) NWDrive.open(row).catch(function(e) { alert('Could not open: ' + e.message); });
      });
    });
    var q = host.querySelector('[data-q]');
    if (q) q.addEventListener('input', function() { self.query = q.value.trim(); self.renderKeepFocus(); });
    var rf = host.querySelector('[data-refresh]'); if (rf) rf.addEventListener('click', function() { rf.disabled = true; self.load(true); });
    var nf = host.querySelector('[data-newfolder]');
    if (nf) nf.addEventListener('click', async function() {
      var name = prompt('New folder name:'); if (!name || !name.trim()) return;
      var rel = self.relPath(self.cur); var path = (rel ? rel + '/' : '') + name.trim().replace(/[\/\\]/g, '-');
      try { await NWDrive.request({ action: 'create_folder', projectName: self.projectName, projectId: self.projectId, folder: path }); await self.load(true); }
      catch (e) { alert('Drive: ' + e.message); }
    });
    var up = host.querySelector('[data-upload]'), fi = host.querySelector('[data-file]');
    if (up && fi) { up.addEventListener('click', function() { fi.click(); }); fi.addEventListener('change', function() { if (fi.files && fi.files.length) self.upload(Array.from(fi.files)); fi.value = ''; }); }
    host.querySelectorAll('[data-del]').forEach(function(b) {
      b.addEventListener('click', async function(e) {
        e.stopPropagation();
        var it = self.byId[b.getAttribute('data-del')]; if (!it) return;
        if (!confirm('Delete "' + it.name + '" from Google Drive?')) return;
        b.disabled = true;
        try {
          await NWDrive.deleteFile(it.id);
          if (window.supabaseClient) { try { await supabaseClient.from('project_files').delete().eq('drive_id', it.id); } catch (e2) {} }
          await self.load(true);
          if (self.opts.onChange) self.opts.onChange();
        } catch (e3) { alert('Delete failed: ' + e3.message); b.disabled = false; }
      });
    });
  };
  Browser.prototype.renderKeepFocus = function() {
    var q = this.host.querySelector('[data-q]'); var pos = q ? q.selectionStart : 0;
    this.render();
    var q2 = this.host.querySelector('[data-q]'); if (q2) { q2.focus(); try { q2.setSelectionRange(pos, pos); } catch (e) {} }
  };
  Browser.prototype.upload = async function(files) {
    var self = this, prog = this.host.querySelector('[data-prog]');
    var rel = this.relPath(this.cur);
    var top = this.pathOf(this.cur)[0]; var cat = top ? (CAT_BY_FOLDER[top.name.toLowerCase()] || 'other') : 'other';
    var ok = 0, errs = [];
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (prog) { prog.style.display = ''; prog.textContent = 'Uploading ' + (i + 1) + ' of ' + files.length + ': ' + f.name + '…'; }
      try {
        var b64 = await NWDrive.toBase64(f);
        var r = await NWDrive.request({ action: 'upload_file', projectName: this.projectName, projectId: this.projectId, fileName: f.name, fileData: b64,
          mimeType: f.type || 'application/octet-stream', category: cat, folder: rel || 'Other' });
        var df = r.file;
        if (window.supabaseClient && this.opts.registerRows !== false) {
          var row = { project_id: this.projectId, filename: f.name, storage_path: null, drive_id: df.id, drive_url: df.viewUrl || df.url, size_bytes: f.size,
            content_type: f.type || null, category: cat, notes: 'Drive: ' + (rel || df.folderName || ''), uploaded_by: this.opts.userId || null };
          var ins = await supabaseClient.from('project_files').insert(row);
          if (ins.error) { row.category = 'other'; ins = await supabaseClient.from('project_files').insert(row); if (ins.error) console.warn('project_files insert', ins.error.message); }
        }
        ok++;
      } catch (e) { errs.push(f.name + ': ' + e.message); }
    }
    if (prog) { prog.textContent = ok + ' file' + (ok === 1 ? '' : 's') + ' uploaded' + (errs.length ? '; failed: ' + errs.join('; ') : ''); setTimeout(function() { prog.style.display = 'none'; }, 4000); }
    await this.load(true);
    if (this.opts.onChange) this.opts.onChange();
  };

  window.NWDriveBrowser = {
    mount: function(host, opts) { var b = new Browser(host, opts); host.__nwdb = b; return b; },
    invalidate: function(projectId) { try { sessionStorage.removeItem(cacheKey(projectId)); } catch (e) {} }
  };
})();
