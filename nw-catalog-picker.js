/* ═══════════════════════════════════════════════════════════════════════════
   nw-catalog-picker.js — Procore-style "Select catalog item" picker
   + "Create new catalog item" / "Edit Catalog Item" dialog
   + non-modal mount for assembly-library.html (Cost Catalog page)

   Depends on: supabase-config.js (window.supabaseClient), procore-ui.js (window.PC:
   icon / modal / menu / confirm / prompt / toast / money / uom).
   Tables: est_catalog_folders, est_catalog_items (takeoff-v2-schema.sql);
           falls back to estimate_assemblies when the catalog is missing / empty.

   window.NWCatalogPicker = {
     open({multi, onSelect(rows), title})      → modal picker
     openItemDialog(item|null, onSaved(row))   → create / edit dialog
     mount(el, {admin, legacy, onSelectionChange(rows), onReady(info)})
                                               → tree + list rendered in-page; returns panel
                                                 {reload, selectedRows, clearSelection, bulkDelete, bulkMove(anchor),
                                                  refreshTree, newFolder, destroy}
     guessCat(name), toLine(item, ctx), toLayer(item, ctx), uom(u),
     pushMru(id), getMru(), escapeLike(s), moveItems(rows, folder), folderMenuItems(onPick),
     state() → 'catalog' | 'assemblies' | null
   }
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var PAGE_SIZE = 40;
  var MRU_KEY = 'nw_cat_mru';
  var MRU_MAX = 40;
  var CSS_ID = 'nw-catalog-picker-css';

  var ITEM_SELECT = 'id,name,description,unit,unit_cost,unit_labor_min,waste_pct,manufacturer,supplier,' +
    'catalog_number,folder_path,folder_id,updated_at,is_custom,item_type,is_untaxed,color,symbol_id,' +
    'sub_items,nw_category,takeoff_type,notes,cost_code,cost_name';

  var ITEM_TYPES = ['Part', 'Assembly', 'Labor', 'Travel'];
  var UOMS = [['', 'NONE'], ['ea', 'ea'], ['ft', 'ft'], ['sq ft', 'sq ft'], ['hrs', 'hrs'], ['ls', 'ls'], ['floor', 'floor'], ['day', 'day'], ['lb', 'lb']];
  var SYMBOLS = ['circle', 'square', 'diamond', 'triangle', 'x'];
  var CATEGORIES = [
    ['disconnects', 'Disconnects'], ['equipment', 'Equipment'], ['ductwork', 'Ductwork'], ['pipework', 'Pipework'],
    ['equipment_install', 'Equipment Install'], ['air_outlets', 'Air Outlets Install'], ['services', 'Services']
  ];
  var CAT_CREW = { pipework: 'pipe', services: 'other' }; // everything else → 'sm'

  // ─── shared state (per page) ───────────────────────────────────────────
  var catalogState = null;     // null = unknown, 'catalog' | 'assemblies'
  var foldersCache = null;     // [] of est_catalog_folders rows
  var mruLayerIds = null;      // distinct estimate_takeoff_layers.catalog_item_id

  // ─── tiny helpers ──────────────────────────────────────────────────────
  function sb() { return window.supabaseClient; }
  function hasPC() { return !!(window.PC); }
  function icon(name, size) { return (hasPC() && PC.icon) ? PC.icon(name, size || 18) : ''; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function money(n) {
    if (hasPC() && PC.money) return PC.money(n, 2);
    return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function toast(msg, type) {
    if (hasPC() && PC.toast) PC.toast(msg, type || 'info');
    else if (type === 'error') console.error(msg); else console.log(msg);
  }
  function confirmDlg(opts) {
    if (hasPC() && PC.confirm) return PC.confirm(opts);
    return Promise.resolve(window.confirm(opts.message || opts.title || 'Confirm?'));
  }
  function promptDlg(opts) {
    if (hasPC() && PC.prompt) return PC.prompt(opts);
    return Promise.resolve(window.prompt(opts.label || opts.title || '', opts.value || ''));
  }
  function localUom(u) {
    var s = String(u == null ? '' : u).trim().toLowerCase();
    if (!s || s === 'none') return '';
    if (s === 'ft' || s === 'lf' || s === 'feet' || s === 'foot' || s === 'lft') return 'ft';
    if (s === 'ea' || s === 'each' || s === 'pcs' || s === 'pc') return 'ea';
    if (s === 'sq ft' || s === 'sqft' || s === 'sf' || s === 'sq. ft' || s === 'sq.ft' || s === 'square feet') return 'sq ft';
    if (s === 'hours' || s === 'hour' || s === 'hrs' || s === 'hr' || s === 'h') return 'hrs';
    if (s === 'mins' || s === 'min' || s === 'minutes') return 'mins';
    return s;
  }
  function uom(u) { return (hasPC() && PC.uom) ? PC.uom(u) : localUom(u); }
  function debounce(fn, ms) {
    var t; return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); };
  }
  // Escape % and _ for PostgREST ilike patterns (Postgres LIKE escape char is backslash).
  function escapeLike(s) { return String(s == null ? '' : s).replace(/[\\%_]/g, '\\$&'); }
  // BIGINT id for NW-created rows: Date.now()*1000 + 3 random digits (~1.8e15) — Procore ids sit around 5.6e14, so no overlap.
  function genId() { return Date.now() * 1000 + Math.floor(Math.random() * 1000); }
  function isNumId(id) { return typeof id === 'number' || (/^\d+$/.test(String(id || ''))); }
  function fmtHrs(min) { return (Number(min || 0) / 60).toFixed(2); }
  function isSchemaErr(err) { return !!(err && /est_catalog_(items|folders)|42P01|does not exist|schema cache/i.test(err.message || '')); }
  function closest(el, sel) {
    while (el && el.nodeType === 1) { if (el.matches(sel)) return el; el = el.parentNode; }
    return null;
  }
  function parseNotes(notes) {
    if (!notes) return {};
    try { var j = JSON.parse(notes); if (j && typeof j === 'object') return j; } catch (e) { /* plain text */ }
    return { text: notes };
  }

  // ─── category guess (moved from takeoff.html) ──────────────────────────
  function guessCat(s) {
    s = String(s || '').toLowerCase();
    if (/disconnect|demo\b|removal/.test(s)) return 'disconnects';
    if (/shop drawing|balancing|boomtruck|boom truck|crane|man-lift|manlift|scaffold|rigging|permit/.test(s)) return 'services';
    if (/equipment \d|\d+ ?lb|equipment install/.test(s)) return 'equipment_install';
    if (/diffuser|grille|register|damper|vav|louver|thermostat|sensor|air outlet|air device|fsd|smoke det/.test(s)) return 'air_outlets';
    if (/duct|acl|rectangular|round\/oval|oval|spiral|r6|r8|liner/.test(s)) return 'ductwork';
    if (/pipe|copper|pvc|cpvc|refrigerant|condensate|black iron|b-vent|steel|wet-tap|wet tap/.test(s)) return 'pipework';
    return 'equipment';
  }
  function guessTakeoffType(item) {
    if (item && item.takeoff_type) return item.takeoff_type;
    var u = uom(item && item.unit);
    if (/linear diffuser/i.test((item && item.name) || '')) return 'linear';
    return u === 'ft' ? 'linear' : u === 'sq ft' ? 'area' : 'count';
  }
  function typeUnit(t) { return t === 'linear' ? 'ft' : t === 'area' ? 'sqft' : 'ea'; }

  // ─── MRU ───────────────────────────────────────────────────────────────
  function getMru() {
    try { var a = JSON.parse(localStorage.getItem(MRU_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function pushMru(id) {
    if (id == null) return;
    var a = getMru().filter(function (x) { return String(x) !== String(id); });
    a.unshift(id);
    if (a.length > MRU_MAX) a.length = MRU_MAX;
    try { localStorage.setItem(MRU_KEY, JSON.stringify(a)); } catch (e) { /* private mode */ }
  }
  async function loadLayerMru() {
    if (mruLayerIds) return mruLayerIds;
    mruLayerIds = [];
    try {
      var r = await sb().from('estimate_takeoff_layers').select('catalog_item_id,updated_at').not('catalog_item_id', 'is', null).order('updated_at', { ascending: false }).limit(300);
      if (!r.error) {
        var seen = {};
        (r.data || []).forEach(function (l) { if (l.catalog_item_id != null && !seen[l.catalog_item_id]) { seen[l.catalog_item_id] = 1; mruLayerIds.push(l.catalog_item_id); } });
      }
    } catch (e) { /* ignore */ }
    return mruLayerIds;
  }

  // ─── catalog availability + folders ────────────────────────────────────
  async function detectCatalog(force) {
    if (catalogState && !force) return catalogState;
    catalogState = 'assemblies';
    try {
      var r = await sb().from('est_catalog_items').select('id', { count: 'exact', head: true });
      if (!r.error && (r.count || 0) > 0) catalogState = 'catalog';
    } catch (e) { /* missing table */ }
    return catalogState;
  }
  async function loadFolders(force) {
    if (foldersCache && !force) return foldersCache;
    foldersCache = [];
    if (catalogState !== 'catalog') return foldersCache;
    try {
      var r = await sb().from('est_catalog_folders').select('id,parent_id,name,path,is_custom,sort_order').order('sort_order').order('name');
      if (!r.error) foldersCache = r.data || [];
    } catch (e) { /* ignore */ }
    return foldersCache;
  }
  function folderChildren(parentId) {
    var rows = (foldersCache || []).filter(function (f) { return (f.parent_id == null ? null : String(f.parent_id)) === (parentId == null ? null : String(parentId)); });
    rows.sort(function (a, b) {
      if (!!a.is_custom !== !!b.is_custom) return a.is_custom ? -1 : 1;
      if ((a.sort_order || 0) !== (b.sort_order || 0)) return (a.sort_order || 0) - (b.sort_order || 0);
      return String(a.name).localeCompare(String(b.name));
    });
    return rows;
  }
  function folderById(id) { return (foldersCache || []).find(function (f) { return String(f.id) === String(id); }) || null; }
  // Folder id + every descendant id (from foldersCache) — used instead of folder_path prefix matching.
  function folderTreeIds(id) {
    var out = [], seen = {};
    (function walk(pid) {
      if (seen[String(pid)]) return; seen[String(pid)] = 1; out.push(pid);
      folderChildren(pid).forEach(function (c) { walk(c.id); });
    })(id);
    return out;
  }
  // Synonyms stored by the Procore import ('Ft', 'Ea', 'Hours', …) for a normalised UoM token.
  var UOM_SYNONYMS = {
    'ea': ['ea', 'Ea', 'EA', 'each', 'Each', 'pcs', 'pc'],
    'ft': ['ft', 'Ft', 'FT', 'lf', 'LF', 'feet', 'foot', 'lft'],
    'hrs': ['hrs', 'Hrs', 'HRS', 'hr', 'Hr', 'hours', 'Hours', 'hour', 'Hour', 'h'],
    'ls': ['ls', 'Ls', 'LS', 'lump sum', 'Lump Sum'],
    'floor': ['floor', 'Floor'],
    'day': ['day', 'Day', 'days', 'Days'],
    'lb': ['lb', 'Lb', 'LB', 'lbs', 'Lbs']
  };
  function applyUnitFilter(q, unit) {
    if (!unit) return q;
    if (unit === 'sq ft') return q.ilike('unit', 'sq%ft');
    var syn = UOM_SYNONYMS[unit];
    return syn ? q.in('unit', syn) : q.ilike('unit', unit);
  }
  function customFolder() {
    return (foldersCache || []).find(function (f) { return f.parent_id == null && /^custom$/i.test(f.name || ''); }) ||
      (foldersCache || []).find(function (f) { return /^custom$/i.test(f.name || ''); }) || null;
  }

  // ─── CSS ───────────────────────────────────────────────────────────────
  function injectCss() {
    if (document.getElementById(CSS_ID)) return;
    var st = document.createElement('style');
    st.id = CSS_ID;
    st.textContent = [
      '.ncp{display:flex;flex-direction:column;height:100%;min-height:440px;font:14px/1.45 var(--pc-font,system-ui,sans-serif);color:var(--pc-text,#1f2933)}',
      '.ncp-tabs{display:flex;gap:24px;padding:0 20px;border-bottom:1px solid var(--pc-border,#e5e7eb);background:#fff;flex:none}',
      '.ncp-tab{padding:12px 0;color:var(--pc-muted,#6b7280);border-bottom:3px solid transparent;cursor:pointer;font-size:13px}',
      '.ncp-tab.active{color:var(--pc-text,#1f2933);border-bottom-color:var(--pc-link,#1a66e0)}',
      '.ncp-tab[disabled]{opacity:.5;cursor:not-allowed}',
      '.ncp-body{display:flex;flex:1;min-height:0}',
      '.ncp-left{width:300px;flex:none;border-right:1px solid var(--pc-border,#e5e7eb);display:flex;flex-direction:column;min-height:0}',
      '.ncp-left-h{display:flex;align-items:center;gap:8px;padding:14px 16px 8px;font-weight:600;font-size:15px}',
      '.ncp-left-h .sp{flex:1}',
      '.ncp-left .pc-search{margin:0 16px 8px}',
      '.ncp-tree{flex:1;overflow:auto;padding:4px 8px 12px}',
      '.ncp-node{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:4px;cursor:pointer;white-space:nowrap;font-size:13px;color:var(--pc-text,#1f2933)}',
      '.ncp-node:hover{background:var(--pc-secondary,#f0f1f3)}',
      '.ncp-node.active{background:var(--pc-link-bg,#e8f0fe);color:var(--pc-link,#1a66e0)}',
      '.ncp-node .tg{width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;color:var(--pc-muted,#6b7280);flex:none}',
      '.ncp-node .tg.empty{visibility:hidden}',
      '.ncp-node .nm{flex:1;overflow:hidden;text-overflow:ellipsis}',
      '.ncp-node .pc-kebab,.ncp-node .ncp-fkebab{visibility:hidden}',
      '.ncp-node:hover .pc-kebab,.ncp-node:hover .ncp-fkebab{visibility:visible}',
      '.ncp-right{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0}',
      '.ncp-title{padding:14px 20px 10px;font-weight:600;font-size:14px;border-bottom:1px solid var(--pc-border,#e5e7eb)}',
      '.ncp-new{padding:10px 20px 4px}',
      '.ncp-new a{color:var(--pc-link,#1a66e0);text-decoration:none;display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:13px}',
      '.ncp-toolbar{display:flex;align-items:center;gap:10px;padding:8px 20px;flex-wrap:wrap}',
      '.ncp-toolbar .sp{flex:1}',
      '.ncp-toolbar .pc-search{width:260px}',
      '.ncp-toolbar .pc-search input{height:32px}',
      '.ncp-sort{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 10px;border:1px solid var(--pc-border-strong,#d1d5db);border-radius:4px;background:#fff;cursor:pointer;font-size:13px}',
      '.ncp-list{flex:1;overflow:auto;min-height:0;border-top:1px solid var(--pc-border,#e5e7eb)}',
      // scoped under .ncp so the shared .cat-item block in procore-ui.css is not overridden for other pages
      '.ncp .cat-item{display:flex;align-items:flex-start;gap:12px;padding:10px 20px;border-bottom:1px solid var(--pc-row-sep,#eceff3);cursor:pointer}',
      '.ncp .cat-item:hover{background:var(--pc-row-active,#f3f6fb)}',
      '.ncp .cat-item.selected{background:var(--pc-link-bg,#e8f0fe)}',
      '.ncp .cat-item.readonly{cursor:default}',
      '.ncp .cat-item.readonly:hover{background:transparent}',
      '.ncp .cat-item.readonly .cn{color:var(--pc-head,#4b5563)}',
      '.ncp-node.ncp-legacy .nm{color:var(--pc-muted,#6b7280)}',
      '.ncp-node.ncp-legacy.active .nm{color:var(--pc-link,#1a66e0)}',
      '.ncp .cat-item>input[type=checkbox]{margin:3px 0 0;width:16px;height:16px;flex:none}',
      '.ncp .cat-item .cm{flex:1;min-width:0}',
      '.ncp .cat-item .cn{font-size:13px;font-weight:500;color:var(--pc-text,#1f2933)}',
      '.ncp .cat-item .cd{font-size:12px;color:var(--pc-muted,#6b7280)}',
      '.ncp .cat-item .ck{font-size:11px;color:var(--pc-muted,#6b7280);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.ncp .cat-item .ck b{font-weight:600;color:var(--pc-head,#4b5563)}',
      '.ncp .cat-item .ck .sep{margin:0 6px}',
      '.ncp .cat-item .ck .arr{margin:0 3px}',
      '.ncp .cat-item .pc-kebab{flex:none}',
      '.ncp-pager{display:flex;align-items:center;gap:14px;padding:10px 20px;border-top:1px solid var(--pc-border,#e5e7eb);font-size:13px;color:var(--pc-muted,#6b7280);flex:none}',
      '.ncp-pager i{font-style:italic}',
      '.ncp-pager select{height:28px;border:1px solid var(--pc-border-strong,#d1d5db);border-radius:4px;font:inherit;padding:0 6px;background:#fff}',
      '.ncp-pager .pc-btn-icon{width:28px;height:28px}',
      '.ncp-popover{position:fixed;z-index:1001;background:#fff;border:1px solid var(--pc-border,#e5e7eb);border-radius:4px;box-shadow:0 8px 24px rgba(0,0,0,.12);padding:12px 14px;min-width:240px;font-size:13px}',
      '.ncp-popover .pc-label{margin-top:8px}',
      '.ncp-popover label.chk{display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer}',
      '.ncp-popover .row{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}',
      '.ncp-empty{padding:40px;text-align:center;color:var(--pc-muted,#6b7280)}',
      '.ncp-banner{display:flex;gap:10px;align-items:flex-start;background:#e8f0fe;color:#1e3a8a;padding:10px 12px;border-radius:4px;font-size:13px;border-left:4px solid var(--pc-link,#1a66e0);margin-bottom:16px}',
      '.ncp-sec{font-weight:600;font-size:14px;margin:6px 0 12px}',
      '.ncp-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}',
      '.ncp-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}',
      '.ncp-lt{display:flex;gap:6px}',
      '.ncp-lt .pc-input{flex:1}',
      '.ncp-lt .pc-select{width:130px;flex:none}',
      '.ncp-hint{font-size:11px;color:var(--pc-muted,#6b7280);margin-top:3px}',
      '.ncp-color{display:flex;gap:6px;align-items:center}',
      '.ncp-color input[type=color]{width:36px;height:36px;padding:0;border:1px solid var(--pc-border-strong,#d1d5db);border-radius:4px;background:#fff}',
      '.ncp-mount{background:#fff;border:1px solid var(--pc-border,#e5e7eb);border-radius:4px;height:calc(100vh - 220px);min-height:520px}',
      '.ncp-mount .ncp{height:100%}',
      '.pc-modal.ncp-modal .pc-modal-b{padding:0}',
      '@media (max-width:800px){.ncp-left{width:220px}.ncp-toolbar .pc-search{width:100%}.ncp-grid3,.ncp-grid2{grid-template-columns:1fr}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // ─── modal wrapper (PC.modal, with a minimal fallback) ──────────────────
  function openModal(opts) {
    if (hasPC() && PC.modal) return PC.modal(opts);
    // minimal fallback so the picker still works while procore-ui.js is missing
    var bd = document.createElement('div'); bd.className = 'pc-backdrop';
    bd.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:900;display:flex;align-items:flex-start;justify-content:center;padding-top:8vh';
    var m = document.createElement('div'); m.className = 'pc-modal ' + (opts.size || '');
    var w = opts.size === 'full' ? '92vw' : opts.size === 'lg' ? '1100px' : '560px';
    m.style.cssText = 'background:#fff;border-radius:6px;width:' + w + ';max-width:94vw;max-height:86vh;display:flex;flex-direction:column;' + (opts.size === 'full' ? 'height:88vh' : '');
    m.innerHTML = '<div class="pc-modal-h" style="padding:16px 20px;border-bottom:1px solid #e5e7eb;font-size:16px;font-weight:600;display:flex"><span style="flex:1">' + esc(opts.title || '') + '</span><button type="button" class="pc-btn pc-btn-icon" data-x style="border:0;background:none;cursor:pointer;font-size:18px">&times;</button></div>' +
      '<div class="pc-modal-b" style="padding:20px;overflow:auto;flex:1"></div><div class="pc-modal-f" style="padding:12px 20px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:8px"></div>';
    var body = m.querySelector('.pc-modal-b'), foot = m.querySelector('.pc-modal-f');
    if (typeof opts.body === 'string') body.innerHTML = opts.body; else if (opts.body) body.appendChild(opts.body);
    var ctx = { el: m, body: body, close: close };
    function close() { if (bd.parentNode) bd.parentNode.removeChild(bd); document.removeEventListener('keydown', onKey); if (opts.onClose) opts.onClose(); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    (opts.buttons || []).forEach(function (b) {
      var btn = document.createElement('button'); btn.type = 'button';
      btn.className = 'pc-btn ' + (b.primary ? 'pc-btn-primary' : b.danger ? 'pc-btn-outline' : 'pc-btn-secondary');
      btn.style.cssText = 'height:32px;padding:0 14px;border-radius:4px;border:1px solid transparent;cursor:pointer;' + (b.primary ? 'background:#f47e42;color:#fff' : 'background:#f0f1f3');
      btn.textContent = b.label; if (b.id) btn.id = b.id;
      btn.addEventListener('click', function () { if (b.onClick) b.onClick(ctx); else close(); });
      foot.appendChild(btn); b._el = btn;
    });
    m.querySelector('[data-x]').addEventListener('click', close);
    bd.addEventListener('click', function (e) { if (e.target === bd) close(); });
    document.addEventListener('keydown', onKey);
    bd.appendChild(m); document.body.appendChild(bd);
    return ctx;
  }
  function modalEl(ctx) {
    if (!ctx || !ctx.el) return null;
    if (ctx.el.classList && ctx.el.classList.contains('pc-modal')) return ctx.el;
    return ctx.el.querySelector ? (ctx.el.querySelector('.pc-modal') || ctx.el) : ctx.el;
  }
  function footerButton(ctx, label) {
    var m = modalEl(ctx); if (!m) return null;
    var btns = m.querySelectorAll('.pc-modal-f button, .pc-modal-f .pc-btn');
    for (var i = 0; i < btns.length; i++) if (btns[i].textContent.trim() === label) return btns[i];
    return null;
  }
  function showMenu(anchor, items) {
    if (hasPC() && PC.menu) return PC.menu(anchor, items);
    // fallback: simple prompt-less menu via window.confirm is not appropriate; use first enabled item list
    var labels = items.filter(function (i) { return !i.sep && !i.head && !i.disabled; });
    var pick = window.prompt(labels.map(function (i, n) { return (n + 1) + '. ' + i.label; }).join('\n'), '1');
    var it = labels[Number(pick) - 1]; if (it && it.onClick) it.onClick();
  }

  // ─── row shape normaliser (catalog + assemblies) ───────────────────────
  function fromAssembly(a) {
    return {
      id: a.id, name: a.name, description: a.description || '', unit: a.unit || '', unit_cost: Number(a.unit_material_cost || 0),
      unit_labor_min: Number(a.unit_labor_hours || 0) * 60, waste_pct: 0, manufacturer: null, supplier: a.vendor_name || null,
      catalog_number: null, folder_path: 'Custom', folder_id: null, updated_at: a.updated_at, is_custom: true, item_type: 'Part',
      is_untaxed: false, color: null, symbol_id: null, sub_items: null, nw_category: a.category || null, takeoff_type: null,
      notes: a.notes || null, cost_code: null, cost_name: null, labor_crew_type: a.labor_crew_type, is_active: a.is_active,
      _src: 'assemblies'
    };
  }
  function toAssemblyPatch(row) {
    return {
      name: row.name, category: row.nw_category || guessCat(row.name), description: row.description || null, unit: row.unit || null,
      unit_material_cost: Number(row.unit_cost || 0), unit_labor_hours: Number(row.unit_labor_min || 0) / 60,
      labor_crew_type: CAT_CREW[row.nw_category] || 'sm', vendor_name: row.supplier || null, notes: row.notes || null, is_active: true
    };
  }
  function metaLine(it) {
    // folder_path segments are joined with ' / ' (spaces) — a bare '/' belongs to the folder name ("NW Oval/Round 2\"")
    var cc = String(it.folder_path || (it.is_custom ? 'Custom' : '')).split(/\s+\/\s+/).map(function (s) { return s.trim(); }).filter(Boolean).map(esc).join('<span class="arr">&gt;</span>');
    return '<b>UoM</b> ' + esc(uom(it.unit) || 'NONE') + '<span class="sep">·</span>' +
      '<b>UC</b> ' + esc(money(it.unit_cost)) + '<span class="sep">·</span>' +
      '<b>ULT</b> ' + fmtHrs(it.unit_labor_min) + ' hrs<span class="sep">·</span>' +
      '<b>CN</b> ' + esc(it.catalog_number || 'n/a') + '<span class="sep">·</span>' +
      '<b>CC</b> ' + (cc || 'n/a');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PANEL — tree + list, shared by open() and mount()
  // ═══════════════════════════════════════════════════════════════════════
  function buildPanel(host, opts) {
    opts = opts || {};
    injectCss();
    var multi = opts.multi !== false;
    var pickMode = !!opts.pick;         // true in open(); false in mount()
    var admin = !!opts.admin;
    var showLegacy = !!opts.legacy;     // mount(): 'Legacy assemblies (read-only)' virtual folder
    var checkable = pickMode || (admin && multi);   // row checkboxes + select-all + bulk selection
    var st = {
      node: { kind: 'all' },            // {kind:'all'|'mru'|'folder'|'legacy', folder}
      page: 0, count: 0, rows: [],
      sort: 'common', q: '',
      filters: { types: [], unit: '', taxable: false, category: '' },
      expanded: {}, treeQ: '',
      selected: {}, selectedRows: {},
      legacyCount: null,
      ready: false
    };

    host.innerHTML = '<div class="ncp">' +
      (pickMode ? '<div class="ncp-tabs"><div class="ncp-tab active" data-tab="cost">Cost Catalog</div>' +
        '<div class="ncp-tab" data-tab="mf" disabled title="Not imported from Procore">Masterformat</div>' +
        '<div class="ncp-tab" data-tab="uf" disabled title="Not imported from Procore">Uniformat</div></div>' : '') +
      '<div class="ncp-body">' +
        '<div class="ncp-left">' +
          '<div class="ncp-left-h"><span>Catalogs</span><span class="sp"></span>' +
            (admin ? '<button type="button" class="pc-btn pc-btn-ghost" data-newfolder title="New folder" style="font-weight:500;font-size:12px">' + icon('create_new_folder', 16) + ' New folder</button>' : '') +
          '</div>' +
          '<div class="pc-search"><input class="pc-input" data-treeq placeholder="Search Catalogs">' + icon('search', 18) + '</div>' +
          '<div class="ncp-tree" data-tree></div>' +
        '</div>' +
        '<div class="ncp-right">' +
          '<div class="ncp-title" data-title>All Catalog Items</div>' +
          '<div class="ncp-new"' + ((pickMode || admin) ? '' : ' hidden') + '><a data-newitem>' + icon('add', 16) + ' Create New Item</a></div>' +
          '<div class="ncp-toolbar">' +
            '<input type="checkbox" data-selall title="Select all on this page" style="width:16px;height:16px;margin:0"' + ((checkable && multi) ? '' : ' hidden') + '>' +
            '<button type="button" class="ncp-sort" data-sort>' + icon('sort', 16) + ' <span data-sortlbl>Common</span> ' + icon('expand_more', 16) + '</button>' +
            '<button type="button" class="pc-btn pc-btn-ghost" data-filters style="padding:0 8px">' + icon('filter_list', 18) + ' Filters<span data-fcount></span></button>' +
            '<span class="sp"></span>' +
            '<div class="pc-search"><input class="pc-input" data-q placeholder="Search catalog item name">' + icon('search', 18) + '</div>' +
          '</div>' +
          '<div class="ncp-list" data-list><div class="ncp-empty">Loading…</div></div>' +
          '<div class="ncp-pager" data-pager></div>' +
        '</div>' +
      '</div>' +
    '</div>';

    var $ = function (sel) { return host.querySelector(sel); };
    var treeEl = $('[data-tree]'), listEl = $('[data-list]'), pagerEl = $('[data-pager]'), titleEl = $('[data-title]');

    // ── tree ────────────────────────────────────────────────────────────
    function treeMatches(f, q) {
      if (!q) return true;
      if (String(f.name || '').toLowerCase().indexOf(q) >= 0) return true;
      return folderChildren(f.id).some(function (c) { return treeMatches(c, q); });
    }
    function renderTree() {
      var q = st.treeQ.toLowerCase().trim();
      var html = '';
      var act = st.node.kind;
      html += '<div class="ncp-node' + (act === 'all' ? ' active' : '') + '" data-node="all"><span class="tg empty"></span>' + icon('list', 18) + '<span class="nm">All Catalog Items</span></div>';
      html += '<div class="ncp-node' + (act === 'mru' ? ' active' : '') + '" data-node="mru"><span class="tg empty"></span>' + icon('schedule', 18) + '<span class="nm">Most Recently Used Items</span></div>';
      var virtCustomActive = act === 'folder' && st.node.folder && st.node.folder.id == null;
      if (catalogState !== 'catalog') {
        html += '<div class="ncp-node' + (virtCustomActive ? ' active' : '') + '" data-node="custom" style="padding-left:8px"><span class="tg empty"></span>' + icon('folder', 18) + '<span class="nm">Custom</span></div>';
      } else {
        // No real 'Custom' folder yet (fresh import / empty tree): items created here are saved with folder_id NULL /
        // folder_path 'Custom' — expose them through a virtual Custom node (queryCatalog handles folder.id == null).
        if (!customFolder() && (!q || 'custom'.indexOf(q) >= 0)) {
          html += '<div class="ncp-node' + (virtCustomActive ? ' active' : '') + '" data-node="custom" style="padding-left:8px" title="NW items not filed in a catalog folder"><span class="tg empty"></span>' + icon('folder', 18) + '<span class="nm">Custom</span></div>';
        }
        html += renderBranch(null, 0, q);
        if (showLegacy && st.legacyCount) {
          html += '<div class="ncp-node ncp-legacy' + (act === 'legacy' ? ' active' : '') + '" data-node="legacy" style="padding-left:8px;margin-top:8px;border-top:1px solid var(--pc-border,#e5e7eb);padding-top:10px" title="estimate_assemblies (legacy Assembly Library) — read-only; recreate items you still use with Create New Item">' +
            '<span class="tg empty"></span>' + icon('lock', 18) + '<span class="nm">Legacy assemblies (read-only)</span>' +
            '<span class="pc-muted" style="font-size:11px">' + st.legacyCount + '</span></div>';
        }
      }
      treeEl.innerHTML = html;
    }
    async function countLegacy() {
      if (!showLegacy || catalogState !== 'catalog') { st.legacyCount = 0; return; }
      try {
        var r = await sb().from('estimate_assemblies').select('id', { count: 'exact', head: true });
        st.legacyCount = r.error ? 0 : (r.count || 0);
      } catch (e) { st.legacyCount = 0; }
    }
    function renderBranch(parentId, depth, q) {
      var out = '';
      folderChildren(parentId).forEach(function (f) {
        if (!treeMatches(f, q)) return;
        var kids = folderChildren(f.id);
        var open = !!st.expanded[f.id] || (q && kids.some(function (c) { return treeMatches(c, q); }));
        var active = st.node.kind === 'folder' && st.node.folder && String(st.node.folder.id) === String(f.id);
        out += '<div class="ncp-node' + (active ? ' active' : '') + '" data-node="f" data-id="' + esc(f.id) + '" style="padding-left:' + (8 + depth * 16) + 'px">' +
          '<span class="tg' + (kids.length ? '' : ' empty') + '" data-tg>' + icon(open ? 'expand_more' : 'chevron_right', 16) + '</span>' +
          icon('folder', 18) + '<span class="nm" title="' + esc(f.path || f.name) + '">' + esc(f.name) + '</span>' +
          (admin ? '<button type="button" class="pc-btn pc-btn-icon pc-kebab ncp-fkebab" data-fkebab style="width:24px;height:24px">' + icon('more_vert', 16) + '</button>' : '') +
          '</div>';
        if (open && kids.length) out += renderBranch(f.id, depth + 1, q);
      });
      return out;
    }
    treeEl.addEventListener('click', function (e) {
      var kb = closest(e.target, '[data-fkebab]');
      var node = closest(e.target, '.ncp-node');
      if (!node) return;
      if (kb) { e.stopPropagation(); folderMenu(kb, folderById(node.getAttribute('data-id'))); return; }
      var kind = node.getAttribute('data-node');
      if (closest(e.target, '[data-tg]') && kind === 'f') {
        var id = node.getAttribute('data-id'); st.expanded[id] = !st.expanded[id]; renderTree(); return;
      }
      if (kind === 'all') st.node = { kind: 'all' };
      else if (kind === 'mru') st.node = { kind: 'mru' };
      else if (kind === 'legacy') st.node = { kind: 'legacy' };
      else if (kind === 'custom') st.node = { kind: 'folder', folder: { id: null, name: 'Custom', path: 'Custom' } };
      else { var f = folderById(node.getAttribute('data-id')); if (!f) return; st.node = { kind: 'folder', folder: f }; st.expanded[f.id] = true; }
      st.page = 0; renderTree(); load();
    });
    $('[data-treeq]').addEventListener('input', debounce(function (e) { st.treeQ = e.target.value || ''; renderTree(); }, 150));

    // ── folder admin (mount only) ───────────────────────────────────────
    var nfBtn = $('[data-newfolder]');
    if (nfBtn) nfBtn.addEventListener('click', function () { newFolder(st.node.kind === 'folder' && st.node.folder && st.node.folder.id != null ? st.node.folder : null); });
    async function newFolder(parent) {
      if (catalogState !== 'catalog') { toast('Run takeoff-v2-schema.sql and import the catalog first', 'error'); return; }
      var name = await promptDlg({ title: 'New folder', label: parent ? 'Folder name (inside ' + parent.name + ')' : 'Folder name', placeholder: 'e.g. NW Grilles', okLabel: 'Create' });
      if (!name || !String(name).trim()) return;
      name = String(name).trim();
      var row = { id: genId(), parent_id: parent ? parent.id : null, name: name, path: parent ? (parent.path + ' / ' + name) : name, is_custom: true, sort_order: 0, updated_at: new Date().toISOString() };
      var r = await sb().from('est_catalog_folders').insert(row);
      if (r.error) { toast('Folder not created: ' + r.error.message, 'error'); return; }
      await loadFolders(true);
      if (parent) st.expanded[parent.id] = true;
      st.node = { kind: 'folder', folder: row }; st.page = 0;
      renderTree(); load(); toast('Folder created', 'success');
    }
    function folderMenu(anchor, f) {
      if (!f) return;
      showMenu(anchor, [
        { label: 'New sub-folder', icon: 'create_new_folder', onClick: function () { newFolder(f); } },
        { label: 'Rename', icon: 'edit', onClick: async function () {
          var name = await promptDlg({ title: 'Rename folder', label: 'Folder name', value: f.name, okLabel: 'Save' });
          if (!name || !String(name).trim() || name === f.name) return;
          name = String(name).trim();
          var parent = f.parent_id != null ? folderById(f.parent_id) : null;
          var newPath = parent ? parent.path + ' / ' + name : name;
          var now = new Date().toISOString();
          var r = await sb().from('est_catalog_folders').update({ name: name, path: newPath, updated_at: now }).eq('id', f.id);
          if (r.error) { toast('Rename failed: ' + r.error.message, 'error'); return; }
          // keep item folder_path in sync (items directly in this folder)
          await sb().from('est_catalog_items').update({ folder_path: newPath }).eq('folder_id', f.id);
          // cascade to every descendant folder (by id, parents before children): path = parent path + ' / ' + name,
          // and keep folder_path of the items filed in each of them in sync
          var newPaths = {}; newPaths[String(f.id)] = newPath;
          var descIds = folderTreeIds(f.id).slice(1);
          for (var ki = 0; ki < descIds.length; ki++) {
            var kid = folderById(descIds[ki]); if (!kid) continue;
            var kidPath = (newPaths[String(kid.parent_id)] || newPath) + ' / ' + kid.name;
            newPaths[String(kid.id)] = kidPath;
            var rk = await sb().from('est_catalog_folders').update({ path: kidPath, updated_at: now }).eq('id', kid.id);
            if (rk.error) { toast('Sub-folder "' + kid.name + '" not updated: ' + rk.error.message, 'error'); continue; }
            await sb().from('est_catalog_items').update({ folder_path: kidPath }).eq('folder_id', kid.id);
          }
          await loadFolders(true); if (st.node.kind === 'folder' && String(st.node.folder.id) === String(f.id)) st.node.folder = folderById(f.id);
          renderTree(); load(); toast('Renamed', 'success');
        } },
        { sep: true },
        { label: 'Delete', icon: 'delete', danger: true, onClick: async function () {
          var c1 = await sb().from('est_catalog_items').select('id', { count: 'exact', head: true }).eq('folder_id', f.id);
          var c2 = await sb().from('est_catalog_folders').select('id', { count: 'exact', head: true }).eq('parent_id', f.id);
          if ((c1.count || 0) > 0 || (c2.count || 0) > 0) { toast('Folder is not empty — move or delete its items first', 'error'); return; }
          var ok = await confirmDlg({ title: 'Delete folder', message: 'Delete the empty folder "' + f.name + '"?', okLabel: 'Delete', danger: true });
          if (!ok) return;
          var r = await sb().from('est_catalog_folders').delete().eq('id', f.id);
          if (r.error) { toast('Delete failed: ' + r.error.message, 'error'); return; }
          await loadFolders(true); st.node = { kind: 'all' }; st.page = 0; renderTree(); load(); toast('Folder deleted', 'success');
        } }
      ]);
    }

    // ── toolbar ─────────────────────────────────────────────────────────
    var SORTS = [['common', 'Common'], ['name', 'Name'], ['unit_cost', 'Unit Cost'], ['updated', 'Recently updated']];
    $('[data-sort]').addEventListener('click', function (e) {
      var self = this;
      showMenu(self, SORTS.map(function (s) {
        return { label: s[1], checked: st.sort === s[0], onClick: function () { st.sort = s[0]; $('[data-sortlbl]').textContent = s[1]; st.page = 0; load(); } };
      }));
      e.stopPropagation();
    });
    $('[data-q]').addEventListener('input', debounce(function (e) { st.q = e.target.value || ''; st.page = 0; load(); }, 250));
    $('[data-selall]').addEventListener('change', function () {
      var on = this.checked;
      st.rows.forEach(function (r) { if (!r._readonly) setSelected(r, on); });
      renderRowsState();
    });
    $('[data-filters]').addEventListener('click', function (e) { e.stopPropagation(); openFilters(this); });
    $('[data-newitem]').addEventListener('click', function () {
      var pre = null;
      if (st.node.kind === 'folder' && st.node.folder && st.node.folder.id != null) pre = { folder_id: st.node.folder.id, folder_path: st.node.folder.path };
      openItemDialog(pre ? Object.assign({ _prefill: true }, pre) : null, function (row) { pushMru(row.id); load(); if (pickMode) { setSelected(row, true); renderRowsState(); } });
    });

    function openFilters(anchor) {
      var old = document.querySelector('.ncp-popover'); if (old) { old.parentNode.removeChild(old); return; }
      var pop = document.createElement('div'); pop.className = 'ncp-popover';
      var f = st.filters;
      pop.innerHTML = '<div class="pc-label" style="margin-top:0">Catalog item type</div>' +
        ITEM_TYPES.map(function (t) { return '<label class="chk"><input type="checkbox" data-ft value="' + t + '"' + (f.types.indexOf(t) >= 0 ? ' checked' : '') + '> ' + t + '</label>'; }).join('') +
        '<div class="pc-label">Unit of measure</div><select class="pc-select" data-fu style="height:32px">' +
        UOMS.map(function (u) { return '<option value="' + esc(u[0]) + '"' + (f.unit === u[0] ? ' selected' : '') + '>' + (u[0] ? esc(u[1]) : 'Any') + '</option>'; }).join('') + '</select>' +
        '<label class="chk" style="margin-top:8px"><input type="checkbox" data-ftx' + (f.taxable ? ' checked' : '') + '> Taxable only</label>' +
        '<div class="pc-label">NWAC category</div><select class="pc-select" data-fc style="height:32px"><option value="">Any</option>' +
        CATEGORIES.map(function (c) { return '<option value="' + c[0] + '"' + (f.category === c[0] ? ' selected' : '') + '>' + esc(c[1]) + '</option>'; }).join('') + '</select>' +
        '<div class="row"><button type="button" class="pc-btn pc-btn-secondary" data-clear>Clear</button><button type="button" class="pc-btn pc-btn-primary" data-apply>Apply</button></div>';
      document.body.appendChild(pop);
      var r = anchor.getBoundingClientRect();
      pop.style.top = (r.bottom + 4) + 'px'; pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - pop.offsetWidth - 8)) + 'px';
      function closePop() { if (pop.parentNode) pop.parentNode.removeChild(pop); document.removeEventListener('click', outside, true); }
      function outside(e) { if (!pop.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) closePop(); }
      setTimeout(function () { document.addEventListener('click', outside, true); }, 0);
      pop.querySelector('[data-clear]').addEventListener('click', function () { st.filters = { types: [], unit: '', taxable: false, category: '' }; closePop(); updateFilterBadge(); st.page = 0; load(); });
      pop.querySelector('[data-apply]').addEventListener('click', function () {
        st.filters.types = Array.prototype.slice.call(pop.querySelectorAll('[data-ft]:checked')).map(function (c) { return c.value; });
        st.filters.unit = pop.querySelector('[data-fu]').value;
        st.filters.taxable = pop.querySelector('[data-ftx]').checked;
        st.filters.category = pop.querySelector('[data-fc]').value;
        closePop(); updateFilterBadge(); st.page = 0; load();
      });
    }
    function updateFilterBadge() {
      var n = st.filters.types.length + (st.filters.unit ? 1 : 0) + (st.filters.taxable ? 1 : 0) + (st.filters.category ? 1 : 0);
      $('[data-fcount]').textContent = n ? ' (' + n + ')' : '';
    }

    // ── selection ───────────────────────────────────────────────────────
    function setSelected(row, on) {
      var k = String(row.id);
      if (on) { if (!multi) { st.selected = {}; st.selectedRows = {}; } st.selected[k] = true; st.selectedRows[k] = row; }
      else { delete st.selected[k]; delete st.selectedRows[k]; }
      if (opts.onSelectionChange) opts.onSelectionChange(selectedRows());
    }
    function selectedRows() { return Object.keys(st.selectedRows).map(function (k) { return st.selectedRows[k]; }); }
    function renderRowsState() {
      var all = st.rows.some(function (r) { return !r._readonly; });
      listEl.querySelectorAll('.cat-item').forEach(function (el) {
        var on = !!st.selected[el.getAttribute('data-id')];
        el.classList.toggle('selected', on);
        var cb = el.querySelector('input[type=checkbox]'); if (cb) cb.checked = on;
        if (!on && !el.classList.contains('readonly')) all = false;
      });
      $('[data-selall]').checked = all;
    }

    // ── data ────────────────────────────────────────────────────────────
    var loadSeq = 0;
    async function load() {
      var seq = ++loadSeq;
      listEl.innerHTML = '<div class="ncp-empty">Loading…</div>';
      titleEl.textContent = st.node.kind === 'all' ? 'All Catalog Items' : st.node.kind === 'mru' ? 'Most Recently Used Items' :
        st.node.kind === 'legacy' ? 'Legacy assemblies (read-only)' : (st.node.folder.name || 'Folder');
      var res;
      try { res = (catalogState === 'catalog' && st.node.kind !== 'legacy') ? await queryCatalog() : await queryAssemblies(st.node.kind === 'legacy'); }
      catch (e) { res = { error: e }; }
      if (seq !== loadSeq) return;
      if (res.error) {
        listEl.innerHTML = '<div class="ncp-empty">Could not load catalog: ' + esc(res.error.message || res.error) + '</div>';
        pagerEl.innerHTML = ''; return;
      }
      st.rows = res.rows; st.count = res.count;
      renderList();
    }
    function applySort(q, isAsm) {
      if (st.sort === 'name') return q.order('name');
      if (st.sort === 'unit_cost') return q.order(isAsm ? 'unit_material_cost' : 'unit_cost', { ascending: true }).order('name');
      if (st.sort === 'updated') return q.order('updated_at', { ascending: false });
      return isAsm ? q.order('name') : q.order('is_custom', { ascending: false }).order('name');
    }
    async function mruIds() {
      var layerIds = await loadLayerMru();
      var ids = getMru().slice(); var seen = {};
      ids.forEach(function (i) { seen[String(i)] = 1; });
      layerIds.forEach(function (i) { if (!seen[String(i)]) { seen[String(i)] = 1; ids.push(i); } });
      return ids;
    }
    async function queryCatalog() {
      var q = sb().from('est_catalog_items').select(ITEM_SELECT, { count: 'exact' });
      if (st.node.kind === 'mru') {
        var ids = await mruIds();
        if (!ids.length) return { rows: [], count: 0 };
        q = q.in('id', ids.filter(isNumId).map(Number));
      } else if (st.node.kind === 'folder' && st.node.folder) {
        var f = st.node.folder;
        if (f.id == null) q = q.eq('is_custom', true).is('folder_id', null);
        else if (folderChildren(f.id).length) q = q.in('folder_id', folderTreeIds(f.id));   // folder + true descendants only
        else q = q.eq('folder_id', f.id);
      }
      if (st.q.trim()) q = q.ilike('name', '%' + escapeLike(st.q.trim()) + '%');
      if (st.filters.types.length) q = q.in('item_type', st.filters.types);
      q = applyUnitFilter(q, st.filters.unit);
      if (st.filters.taxable) q = q.eq('is_untaxed', false);
      if (st.filters.category) q = q.eq('nw_category', st.filters.category);
      q = applySort(q, false).range(st.page * PAGE_SIZE, st.page * PAGE_SIZE + PAGE_SIZE - 1);
      var r = await q;
      if (r.error) return { error: r.error };
      return { rows: r.data || [], count: r.count || 0 };
    }
    // legacy=true → the read-only 'Legacy assemblies' virtual folder (all rows incl. inactive, no editing)
    async function queryAssemblies(legacy) {
      var q = sb().from('estimate_assemblies').select('*', { count: 'exact' });
      if (!legacy) q = q.eq('is_active', true);
      if (st.node.kind === 'mru') {
        var ids = (await mruIds()).filter(function (i) { return !isNumId(i); });
        if (!ids.length) return { rows: [], count: 0 };
        q = q.in('id', ids);
      }
      if (st.q.trim()) q = q.ilike('name', '%' + escapeLike(st.q.trim()) + '%');
      q = applyUnitFilter(q, st.filters.unit);
      if (st.filters.category) q = q.eq('category', st.filters.category);
      q = applySort(q, true).range(st.page * PAGE_SIZE, st.page * PAGE_SIZE + PAGE_SIZE - 1);
      var r = await q;
      if (r.error) return { error: r.error };
      return { rows: (r.data || []).map(function (a) { var it = fromAssembly(a); if (legacy) { it._readonly = true; it.folder_path = 'Legacy assemblies'; } return it; }), count: r.count || 0 };
    }

    // ── list ────────────────────────────────────────────────────────────
    function renderList() {
      if (!st.rows.length) {
        listEl.innerHTML = '<div class="ncp-empty">' + (st.q ? 'No catalog items match "' + esc(st.q) + '".' : 'No catalog items here yet.') +
          (catalogState !== 'catalog' ? '<div class="pc-muted" style="font-size:12px;margin-top:6px">Showing Assembly Library items — import the Procore Cost Catalog (est_catalog_items) for the full list.</div>' : '') + '</div>';
        pagerEl.innerHTML = ''; return;
      }
      listEl.innerHTML = st.rows.map(function (it) {
        var ro = !!it._readonly;
        var canCheck = checkable && !ro;
        return '<label class="cat-item' + (st.selected[String(it.id)] ? ' selected' : '') + (ro ? ' readonly' : '') + '" data-id="' + esc(it.id) + '"' + (ro ? ' style="cursor:default"' : '') + '>' +
          '<input type="checkbox"' + (canCheck ? '' : ' hidden') + (st.selected[String(it.id)] ? ' checked' : '') + '>' +
          '<div class="cm"><div class="cn">' + esc(it.name) +
            (ro && it.is_active === false ? ' <span class="pc-pill pc-pill-locked" style="margin-left:6px">Inactive</span>' : '') + '</div>' +
          (it.description ? '<div class="cd">' + esc(it.description) + '</div>' : '') +
          '<div class="ck">' + metaLine(it) + '</div></div>' +
          ((pickMode || admin) && !ro ? '<button type="button" class="pc-btn pc-btn-icon pc-kebab" data-kebab>' + icon('more_vert', 18) + '</button>' : '') +
          '</label>';
      }).join('');
      renderRowsState();
      renderPager();
    }
    listEl.addEventListener('click', function (e) {
      var kb = closest(e.target, '[data-kebab]');
      var row = closest(e.target, '.cat-item'); if (!row) return;
      var it = st.rows.find(function (r) { return String(r.id) === row.getAttribute('data-id'); }); if (!it) return;
      if (it._readonly) { e.preventDefault(); return; }
      if (kb) { e.preventDefault(); e.stopPropagation(); rowMenu(kb, it); return; }
      if (!pickMode) {
        if (checkable && e.target.tagName === 'INPUT') { setSelected(it, e.target.checked); renderRowsState(); return; }
        e.preventDefault(); if (admin) openItemDialog(it, function () { load(); }); return;
      }
      // single-select: any click (checkbox or body) picks the row and hands it to onPick (the picker closes at once)
      if (!multi) { if (e.target.tagName !== 'INPUT') e.preventDefault(); setSelected(it, true); renderRowsState(); if (opts.onPick) opts.onPick(it); return; }
      // multi: checkbox handles its own toggle; a click on the row body toggles too
      if (e.target.tagName === 'INPUT') { setSelected(it, e.target.checked); renderRowsState(); }
      else { e.preventDefault(); setSelected(it, !st.selected[String(it.id)]); renderRowsState(); }
    });
    function rowMenu(anchor, it) {
      var items = [
        { label: 'Edit item', icon: 'edit', onClick: function () { openItemDialog(it, function () { load(); }); } },
        { label: 'Duplicate', icon: 'content_copy', onClick: function () {
          var copy = Object.assign({}, it, { id: null, name: it.name + ' (copy)', is_custom: true }); delete copy.updated_at;
          openItemDialog(copy, function (row) { pushMru(row.id); load(); });
        } }
      ];
      if (admin && catalogState === 'catalog' && it._src !== 'assemblies') {
        items.push({ label: 'Move to folder', icon: 'folder_open', sub: folderMenuItems(function (f) { moveItems([it], f).then(function (n) { if (n) load(); }); }, it.folder_id) });
      }
      if (it.is_custom) {
        items.push({ sep: true });
        items.push({ label: 'Delete', icon: 'delete', danger: true, onClick: async function () {
          var ok = await confirmDlg({ title: 'Delete catalog item', message: 'Delete "' + it.name + '" from the Cost Catalog? Layers and estimate lines that already use it keep their rates.', okLabel: 'Delete', danger: true });
          if (!ok) return;
          var r = it._src === 'assemblies' ? await sb().from('estimate_assemblies').delete().eq('id', it.id) : await sb().from('est_catalog_items').delete().eq('id', it.id);
          if (r.error) { toast('Delete failed: ' + r.error.message, 'error'); return; }
          setSelected(it, false); toast('Deleted', 'success'); load();
        } });
      }
      showMenu(anchor, items);
    }
    // bulk actions (mount admin): rows = selected catalog rows
    async function bulkDelete(rows) {
      rows = (rows || selectedRows()).filter(function (r) { return r && r.id != null && !r._readonly; });
      var custom = rows.filter(function (r) { return r.is_custom; });
      var skipped = rows.length - custom.length;
      if (!custom.length) { toast(skipped ? 'Only NW custom items can be deleted — Procore stock items are kept' : 'Nothing selected', 'error'); return 0; }
      var ok = await confirmDlg({
        title: 'Delete ' + custom.length + ' catalog item' + (custom.length === 1 ? '' : 's'),
        message: 'Delete ' + custom.length + ' custom item' + (custom.length === 1 ? '' : 's') + ' from the Cost Catalog?' + (skipped ? ' ' + skipped + ' Procore stock item' + (skipped === 1 ? ' is' : 's are') + ' skipped.' : '') + ' Layers and estimate lines that already use them keep their rates.',
        okLabel: 'Delete', danger: true
      });
      if (!ok) return 0;
      var asm = custom.filter(function (r) { return r._src === 'assemblies'; }).map(function (r) { return r.id; });
      var cat = custom.filter(function (r) { return r._src !== 'assemblies'; }).map(function (r) { return Number(r.id); });
      var err = null;
      if (asm.length) { var r1 = await sb().from('estimate_assemblies').delete().in('id', asm); if (r1.error) err = r1.error; }
      if (cat.length) { var r2 = await sb().from('est_catalog_items').delete().in('id', cat); if (r2.error) err = r2.error; }
      if (err) { toast('Delete failed: ' + err.message, 'error'); return 0; }
      st.selected = {}; st.selectedRows = {};
      if (opts.onSelectionChange) opts.onSelectionChange([]);
      toast(custom.length + ' deleted', 'success'); load();
      return custom.length;
    }
    function bulkMove(anchor) {
      var rows = selectedRows().filter(function (r) { return !r._readonly && r._src !== 'assemblies'; });
      if (!rows.length) { toast('Select catalog items first', 'error'); return; }
      showMenu(anchor, [{ head: true, label: 'Move ' + rows.length + ' item' + (rows.length === 1 ? '' : 's') + ' to' }].concat(folderMenuItems(function (f) {
        moveItems(rows, f).then(function (n) { if (n) { st.selected = {}; st.selectedRows = {}; if (opts.onSelectionChange) opts.onSelectionChange([]); load(); } });
      })));
    }
    function renderPager() {
      var from = st.count ? st.page * PAGE_SIZE + 1 : 0, to = Math.min(st.count, (st.page + 1) * PAGE_SIZE);
      var pages = Math.max(1, Math.ceil(st.count / PAGE_SIZE));
      var sel = '<select data-pg>';
      for (var i = 0; i < pages; i++) sel += '<option value="' + i + '"' + (i === st.page ? ' selected' : '') + '>' + (i + 1) + '</option>';
      sel += '</select>';
      pagerEl.innerHTML = '<i>' + from + '-' + to + ' of ' + st.count.toLocaleString('en-US') + '</i>' +
        '<span>Page: ' + sel + '</span>' +
        '<button type="button" class="pc-btn pc-btn-icon pc-btn-ghost" data-prev' + (st.page <= 0 ? ' disabled' : '') + '>' + icon('chevron_left', 18) + '</button>' +
        '<button type="button" class="pc-btn pc-btn-icon pc-btn-ghost" data-next' + (st.page >= pages - 1 ? ' disabled' : '') + '>' + icon('chevron_right', 18) + '</button>';
      pagerEl.querySelector('[data-pg]').addEventListener('change', function () { st.page = Number(this.value); load(); });
      pagerEl.querySelector('[data-prev]').addEventListener('click', function () { if (st.page > 0) { st.page--; load(); } });
      pagerEl.querySelector('[data-next]').addEventListener('click', function () { if (st.page < pages - 1) { st.page++; load(); } });
    }

    // ── init ────────────────────────────────────────────────────────────
    (async function init() {
      await detectCatalog();
      await loadFolders();
      await countLegacy();
      // initial folder (open({folder}) — id, name or path)
      if (opts.folder != null && opts.folder !== '' && catalogState === 'catalog') {
        var f0 = (typeof opts.folder === 'object') ? folderById(opts.folder.id) : (folderById(opts.folder) ||
          (foldersCache || []).find(function (x) { return String(x.name) === String(opts.folder) || String(x.path) === String(opts.folder); }));
        if (f0) {
          st.node = { kind: 'folder', folder: f0 }; st.expanded[f0.id] = true;
          var pid = f0.parent_id; while (pid != null) { st.expanded[pid] = true; var pf = folderById(pid); pid = pf ? pf.parent_id : null; }
        }
      }
      renderTree();
      // prefill: fetch the real rows so onSelect() gets name/unit_cost etc., not {id} stubs
      if (opts.selectedIds && opts.selectedIds.length) {
        var numIds = opts.selectedIds.filter(isNumId).map(Number), strIds = opts.selectedIds.filter(function (i) { return !isNumId(i); });
        var pre = [];
        try {
          if (numIds.length && catalogState === 'catalog') { var r1 = await sb().from('est_catalog_items').select(ITEM_SELECT).in('id', numIds); if (!r1.error) pre = pre.concat(r1.data || []); }
          if (strIds.length) { var r2 = await sb().from('estimate_assemblies').select('*').in('id', strIds); if (!r2.error) pre = pre.concat((r2.data || []).map(fromAssembly)); }
        } catch (e) { /* ignore */ }
        pre.forEach(function (row) { st.selected[String(row.id)] = true; st.selectedRows[String(row.id)] = row; });
        if (pre.length && opts.onSelectionChange) opts.onSelectionChange(selectedRows());
      }
      st.ready = true;
      if (opts.onReady) opts.onReady({ catalog: catalogState, folders: (foldersCache || []).length, legacy: st.legacyCount || 0 });
      load();
    })();

    return {
      state: st, reload: load, renderTree: renderTree, selectedRows: selectedRows,
      clearSelection: function () { st.selected = {}; st.selectedRows = {}; renderRowsState(); if (opts.onSelectionChange) opts.onSelectionChange([]); },
      bulkDelete: bulkDelete, bulkMove: bulkMove,
      refreshTree: async function () { await loadFolders(true); await countLegacy(); renderTree(); },
      newFolder: function () { newFolder(st.node.kind === 'folder' && st.node.folder && st.node.folder.id != null ? st.node.folder : null); },
      destroy: function () { var p = document.querySelector('.ncp-popover'); if (p) p.parentNode.removeChild(p); host.innerHTML = ''; }
    };
  }

  // ─── folder helpers shared by row kebab / bulk bar ─────────────────────
  // Nested PC.menu items: folders with children get a sub-menu ('Move here' + children).
  function folderMenuItems(onPick, currentFolderId) {
    function branch(parentId) {
      return folderChildren(parentId).map(function (f) {
        var kids = folderChildren(f.id);
        var isCur = currentFolderId != null && String(currentFolderId) === String(f.id);
        var item = { label: f.name, icon: 'folder', disabled: isCur && !kids.length };
        if (kids.length) {
          item.sub = [{ label: 'Move here', icon: 'folder_open', disabled: isCur, onClick: function () { onPick(f); } }, { sep: true }].concat(branch(f.id));
        } else {
          item.onClick = function () { onPick(f); };
        }
        return item;
      });
    }
    var items = branch(null);
    if (!items.length) items.push({ label: 'No folders yet', disabled: true });
    return items;
  }
  async function moveItems(rows, folder) {
    if (!folder || !rows || !rows.length) return 0;
    var ids = rows.filter(function (r) { return r && isNumId(r.id) && r._src !== 'assemblies'; }).map(function (r) { return Number(r.id); });
    if (!ids.length) { toast('Legacy assemblies cannot be moved', 'error'); return 0; }
    var r = await sb().from('est_catalog_items').update({ folder_id: folder.id, folder_path: folder.path || folder.name, updated_at: new Date().toISOString() }).in('id', ids);
    if (r.error) { toast('Move failed: ' + r.error.message, 'error'); return 0; }
    toast(ids.length + ' item' + (ids.length === 1 ? '' : 's') + ' moved to ' + folder.name, 'success');
    return ids.length;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // open() — modal picker
  // ═══════════════════════════════════════════════════════════════════════
  function open(opts) {
    opts = opts || {};
    injectCss();
    var multi = opts.multi !== false;
    var wrap = document.createElement('div'); wrap.style.cssText = 'height:100%;min-height:0;display:flex;flex-direction:column';
    var panel = null, ctx = null, selectBtn = null;
    function finish() {
      var rows = panel ? panel.selectedRows() : [];
      if (!rows.length) return;
      rows.forEach(function (r) { pushMru(r.id); });
      if (ctx) ctx.close();
      if (opts.onSelect) opts.onSelect(rows);
    }
    ctx = openModal({
      title: opts.title || 'Select catalog item',
      body: wrap,
      size: 'full',
      buttons: [
        { label: 'Cancel', onClick: function (c) { (c && c.close ? c : ctx).close(); } },
        // close:false — PC.modal would otherwise close the picker even when nothing is selected; finish() closes explicitly
        { label: 'Select', primary: true, close: false, onClick: function () { finish(); return false; } }
      ],
      onClose: function () { if (panel) panel.destroy(); if (opts.onClose) opts.onClose(); }
    });
    var mEl = modalEl(ctx); if (mEl) { mEl.classList.add('ncp-modal'); }
    if (ctx.body) ctx.body.style.padding = '0';
    selectBtn = footerButton(ctx, 'Select');
    if (selectBtn) selectBtn.disabled = true;
    panel = buildPanel(wrap, {
      pick: true, multi: multi, admin: false, selectedIds: opts.selectedIds, folder: opts.folder,
      onSelectionChange: function (rows) { if (selectBtn) selectBtn.disabled = !rows.length; },
      onPick: function () { if (!multi) finish(); }
    });
    return { close: function () { ctx.close(); }, panel: panel };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // openItemDialog() — Create / Edit catalog item
  // ═══════════════════════════════════════════════════════════════════════
  function openItemDialog(item, onSaved) {
    injectCss();
    var isEdit = !!(item && item.id != null);
    var it = item || {};
    var prefillOnly = !!it._prefill;
    if (prefillOnly) { it = { folder_id: it.folder_id, folder_path: it.folder_path }; isEdit = false; }
    var nj = parseNotes(it.notes);
    var laborMin = Number(it.unit_labor_min || 0);
    var laborUnit = (laborMin > 0 && laborMin % 60 === 0) ? 'hrs' : 'mins';
    var laborVal = laborUnit === 'hrs' ? laborMin / 60 : laborMin;
    var catTouched = !!it.nw_category;

    var body = document.createElement('div');
    (async function () {
      await detectCatalog();
      await loadFolders();
      var custom = customFolder();
      var folderOpts = '';
      var folders = (foldersCache || []).slice().sort(function (a, b) { return String(a.path).localeCompare(String(b.path)); });
      var curFolder = it.folder_id != null ? String(it.folder_id) : (custom ? String(custom.id) : '');
      if (!custom) folderOpts += '<option value=""' + (curFolder === '' ? ' selected' : '') + '>Custom</option>';
      folders.forEach(function (f) { folderOpts += '<option value="' + esc(f.id) + '"' + (String(f.id) === curFolder ? ' selected' : '') + '>' + esc(f.path || f.name) + '</option>'; });
      if (catalogState !== 'catalog') folderOpts = '<option value="">Custom</option>';

      body.innerHTML =
        '<div class="ncp-banner">' + icon('info', 18) + '<div>This item is saved to the company Cost Catalog (folder Custom). Layer/line rates are project snapshots and stay unchanged.</div></div>' +
        '<div class="ncp-sec">Essential details</div>' +
        '<div class="pc-field"><label class="pc-label">Catalog item type</label><select class="pc-select" data-f="item_type">' +
          ITEM_TYPES.map(function (t) { return '<option' + ((it.item_type || 'Part') === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
        '<div class="pc-field"><label class="pc-label">Cost Catalog</label><select class="pc-select" data-f="folder_id">' + folderOpts + '</select></div>' +
        '<div class="ncp-grid2">' +
          '<div class="pc-field"><label class="pc-label">Masterformat</label><select class="pc-select" disabled title="Not imported from Procore"><option>Unassigned</option></select></div>' +
          '<div class="pc-field"><label class="pc-label">Uniformat</label><select class="pc-select" disabled title="Not imported from Procore"><option>Unassigned</option></select></div>' +
        '</div>' +
        '<div class="pc-field"><label class="pc-label">Name</label><input class="pc-input" data-f="name" value="' + esc(it.name || '') + '" placeholder="e.g. 14x8 rectangular with 1&quot; ACL"></div>' +
        '<div class="pc-field"><label class="pc-label">Description</label><textarea class="pc-textarea" data-f="description" style="height:64px;padding:8px 10px">' + esc(it.description || '') + '</textarea></div>' +
        '<div class="ncp-grid3">' +
          '<div class="pc-field"><label class="pc-label">Unit of Measure</label><select class="pc-select" data-f="unit">' +
            UOMS.map(function (u) { return '<option value="' + esc(u[0]) + '"' + (uom(it.unit) === u[0] ? ' selected' : '') + '>' + esc(u[1]) + '</option>'; }).join('') + '</select></div>' +
          '<div class="pc-field"><label class="pc-label">Unit Cost ($)</label><input class="pc-input" type="number" step="0.01" min="0" data-f="unit_cost" value="' + esc(Number(it.unit_cost || 0)) + '"></div>' +
          '<div class="pc-field"><label class="pc-label">Unit Labor Time</label><div class="ncp-lt"><input class="pc-input" type="number" step="0.01" min="0" data-f="labor_val" value="' + esc(Math.round(laborVal * 10000) / 10000) + '">' +
            '<select class="pc-select" data-f="labor_unit"><option value="mins"' + (laborUnit === 'mins' ? ' selected' : '') + '>mins - minutes</option><option value="hrs"' + (laborUnit === 'hrs' ? ' selected' : '') + '>hrs - hours</option></select></div></div>' +
        '</div>' +
        '<div class="ncp-grid3">' +
          '<div class="pc-field"><label class="pc-label">Taxable</label><select class="pc-select" data-f="taxable"><option value="Yes"' + (!it.is_untaxed ? ' selected' : '') + '>Yes</option><option value="No"' + (it.is_untaxed ? ' selected' : '') + '>No</option></select><div class="ncp-hint" data-taxhint>Material tax does apply</div></div>' +
          '<div class="pc-field"><label class="pc-label">Color</label><div class="ncp-color"><input type="color" data-f="color_pick" value="' + esc(/^#[0-9a-f]{6}$/i.test(it.color || '') ? it.color : '#0696D7') + '"><input class="pc-input" data-f="color" value="' + esc(it.color || '') + '" placeholder="#0696D7"></div></div>' +
          '<div class="pc-field"><label class="pc-label">Symbol</label><select class="pc-select" data-f="symbol_id"><option value="">Default</option>' +
            SYMBOLS.map(function (s) { return '<option' + ((it.symbol_id || '') === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
        '</div>' +
        '<div class="ncp-sec">Catalog details</div>' +
        '<div class="ncp-grid3">' +
          '<div class="pc-field"><label class="pc-label">Manufacturer</label><input class="pc-input" data-f="manufacturer" value="' + esc(it.manufacturer || '') + '"></div>' +
          '<div class="pc-field"><label class="pc-label">Supplier</label><input class="pc-input" data-f="supplier" value="' + esc(it.supplier || '') + '"></div>' +
          '<div class="pc-field"><label class="pc-label">Catalog number</label><input class="pc-input" data-f="catalog_number" value="' + esc(it.catalog_number || '') + '"></div>' +
        '</div>' +
        '<div class="ncp-grid2">' +
          '<div class="pc-field"><label class="pc-label">Sub Job code</label><input class="pc-input" data-f="sub_job_code" value="' + esc(nj.sub_job_code || '') + '"></div>' +
          '<div class="pc-field"><label class="pc-label">Sub Job name</label><input class="pc-input" data-f="sub_job_name" value="' + esc(nj.sub_job_name || '') + '"></div>' +
          '<div class="pc-field"><label class="pc-label">Cost code</label><input class="pc-input" data-f="cost_code" value="' + esc(it.cost_code || '') + '"></div>' +
          '<div class="pc-field"><label class="pc-label">Cost name</label><input class="pc-input" data-f="cost_name" value="' + esc(it.cost_name || '') + '"></div>' +
        '</div>' +
        '<div class="pc-field"><label class="pc-label">EPD url</label><input class="pc-input" data-f="epd_url" value="' + esc(nj.epd_url || '') + '" placeholder="https://"></div>' +
        (nj.text ? '<div class="pc-field"><label class="pc-label">Notes</label><textarea class="pc-textarea" data-f="text" style="height:48px;padding:8px 10px">' + esc(nj.text) + '</textarea></div>' : '') +
        '<div class="ncp-sec">NW extras</div>' +
        '<div class="ncp-grid2">' +
          '<div class="pc-field"><label class="pc-label">NWAC category</label><select class="pc-select" data-f="nw_category">' +
            CATEGORIES.map(function (c) { return '<option value="' + c[0] + '"' + ((it.nw_category || guessCat(it.name)) === c[0] ? ' selected' : '') + '>' + c[1] + '</option>'; }).join('') + '</select></div>' +
          '<div class="pc-field"><label class="pc-label">Takeoff type</label><select class="pc-select" data-f="takeoff_type">' +
            [['count', 'Count'], ['linear', 'Linear'], ['area', 'Area']].map(function (t) { return '<option value="' + t[0] + '"' + (guessTakeoffType(it) === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></div>' +
        '</div>';

      var F = function (k) { return body.querySelector('[data-f="' + k + '"]'); };
      F('taxable').addEventListener('change', function () { body.querySelector('[data-taxhint]').textContent = this.value === 'Yes' ? 'Material tax does apply' : 'Material tax does not apply'; });
      F('color_pick').addEventListener('input', function () { F('color').value = this.value; });
      F('color').addEventListener('input', function () { if (/^#[0-9a-f]{6}$/i.test(this.value)) F('color_pick').value = this.value; });
      F('nw_category').addEventListener('change', function () { catTouched = true; });
      F('name').addEventListener('input', debounce(function () { if (!catTouched) F('nw_category').value = guessCat(F('name').value); }, 200));
      F('unit').addEventListener('change', function () { F('takeoff_type').value = guessTakeoffType({ unit: this.value, name: F('name').value }); });
      setTimeout(function () { F('name').focus(); }, 50);
    })();

    var saving = false;
    var ctx = openModal({
      title: isEdit ? 'Edit Catalog Item' : 'Create new catalog item',
      body: body,
      size: 'md',
      buttons: [
        { label: 'Cancel', onClick: function (c) { (c && c.close ? c : ctx).close(); } },
        // close:false — the dialog must stay open on validation / insert errors; save() closes explicitly on success
        { label: isEdit ? 'Save' : 'Create', primary: true, close: false, onClick: function () { save(); return false; } }
      ]
    });
    var mEl = modalEl(ctx); if (mEl) mEl.style.width = '740px';

    async function save() {
      if (saving) return;
      var F = function (k) { return body.querySelector('[data-f="' + k + '"]'); };
      if (!F('name')) return;
      var name = F('name').value.trim();
      if (!name) { toast('Name is required', 'error'); F('name').focus(); return; }
      var laborVal = Number(F('labor_val').value || 0);
      var unitLaborMin = F('labor_unit').value === 'hrs' ? laborVal * 60 : laborVal;
      var folderId = F('folder_id').value ? F('folder_id').value : null;
      var folder = folderId != null ? folderById(folderId) : null;
      var notesObj = {};
      if (F('sub_job_code').value.trim()) notesObj.sub_job_code = F('sub_job_code').value.trim();
      if (F('sub_job_name').value.trim()) notesObj.sub_job_name = F('sub_job_name').value.trim();
      if (F('epd_url').value.trim()) notesObj.epd_url = F('epd_url').value.trim();
      if (F('text') && F('text').value.trim()) notesObj.text = F('text').value.trim();
      var row = {
        name: name,
        description: F('description').value.trim() || null,
        item_type: F('item_type').value,
        is_custom: isEdit ? !!it.is_custom : true,   // Duplicate / Create → custom; Edit keeps the stock/custom flag
        folder_id: folderId != null && isNumId(folderId) ? Number(folderId) : null,
        folder_path: folder ? folder.path : 'Custom',
        unit: F('unit').value || null,
        unit_cost: Number(F('unit_cost').value || 0),
        unit_labor_min: Math.round(unitLaborMin * 10000) / 10000,
        is_untaxed: F('taxable').value === 'No',
        color: F('color').value.trim() || null,
        symbol_id: F('symbol_id').value || null,
        manufacturer: F('manufacturer').value.trim() || null,
        supplier: F('supplier').value.trim() || null,
        catalog_number: F('catalog_number').value.trim() || null,
        cost_code: F('cost_code').value.trim() || null,
        cost_name: F('cost_name').value.trim() || null,
        notes: Object.keys(notesObj).length ? JSON.stringify(notesObj) : null,
        nw_category: F('nw_category').value,
        takeoff_type: F('takeoff_type').value,
        updated_at: new Date().toISOString()
      };
      // Assembly components (Duplicate copies them from the source row; the dialog has no editor for them yet)
      if (!isEdit && it._src !== 'assemblies' && it.sub_items) row.sub_items = it.sub_items;
      saving = true;
      var btn = footerButton(ctx, isEdit ? 'Save' : 'Create'); if (btn) btn.disabled = true;
      var r, saved = null;
      try {
        if (catalogState !== 'catalog' || it._src === 'assemblies') {
          // fallback store: estimate_assemblies
          var patch = toAssemblyPatch(row);
          if (isEdit) r = await sb().from('estimate_assemblies').update(patch).eq('id', it.id).select('*').single();
          else {
            try { var u = await sb().auth.getUser(); if (u && u.data && u.data.user) patch.created_by = u.data.user.id; } catch (e) { /* ignore */ }
            r = await sb().from('estimate_assemblies').insert(patch).select('*').single();
          }
          if (!r.error) saved = fromAssembly(r.data);
        } else {
          if (isEdit) r = await sb().from('est_catalog_items').update(row).eq('id', it.id).select(ITEM_SELECT).single();
          else { row.id = genId(); r = await sb().from('est_catalog_items').insert(row).select(ITEM_SELECT).single(); }
          if (!r.error) saved = r.data;
        }
      } catch (e) { r = { error: e }; }
      saving = false; if (btn) btn.disabled = false;
      if (r.error) { toast('Save failed: ' + (r.error.message || r.error), 'error'); return; }
      pushMru(saved.id);
      toast(isEdit ? 'Catalog item saved' : 'Catalog item created', 'success');
      ctx.close();
      if (onSaved) onSaved(saved);
    }
    return ctx;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // mount() — non-modal Cost Catalog page (assembly-library.html)
  // ═══════════════════════════════════════════════════════════════════════
  function mount(el, opts) {
    opts = opts || {};
    injectCss();
    el.classList.add('ncp-mount');
    var admin = opts.admin !== false;
    return buildPanel(el, {
      pick: false, multi: admin, admin: admin,
      legacy: opts.legacy !== false,
      onSelectionChange: opts.onSelectionChange, onReady: opts.onReady
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Converters
  // ═══════════════════════════════════════════════════════════════════════
  function toLine(item, ctx) {
    ctx = ctx || {};
    var cat = item.nw_category || guessCat(item.name);
    return {
      estimate_id: ctx.estimateId || null,
      description: item.name,
      unit: uom(item.unit) || 'ea',
      quantity: 1,
      unit_material_cost: Number(item.unit_cost || 0),
      unit_labor_hours: Number(item.unit_labor_min || 0) / 60,
      category: cat,
      labor_crew_type: CAT_CREW[cat] || 'sm',
      group_name: ctx.group || 'Default Group',
      vendor_name: item.supplier || null,
      vendor_quote_ref: item.catalog_number || null,
      notes: item.description || null,
      catalog_item_id: isNumId(item.id) ? Number(item.id) : null,
      is_taxable: !item.is_untaxed,
      waste_pct: Number(item.waste_pct || 0) / 100   // catalog stores whole percent (5 = 5 %); line columns are fractions (est-totals.js)
    };
  }
  function toLayer(item, ctx) {
    ctx = ctx || {};
    var cat = item.nw_category || guessCat(item.name);
    var type = guessTakeoffType(item);
    return {
      estimate_id: ctx.estimateId || null,
      group_name: ctx.group || 'Default Group',
      name: item.name,
      takeoff_type: type,
      category: cat,
      catalog_item_id: isNumId(item.id) ? Number(item.id) : null,
      unit: typeUnit(type),
      unit_material_cost: Number(item.unit_cost || 0),
      unit_labor_hours: Number(item.unit_labor_min || 0) / 60,
      labor_crew_type: CAT_CREW[cat] || 'sm',
      waste_pct: Number(item.waste_pct || 0),
      color: item.color || null,   // callers (takeoff/estimating) assign palette colours when null
      symbol: SYMBOLS.indexOf(item.symbol_id) >= 0 ? item.symbol_id : 'circle'
    };
  }

  window.NWCatalogPicker = {
    open: open,
    openItemDialog: openItemDialog,
    mount: mount,
    guessCat: guessCat,
    toLine: toLine,
    toLayer: toLayer,
    uom: uom,
    pushMru: pushMru,
    getMru: getMru,
    escapeLike: escapeLike,
    metaLine: metaLine,
    CATEGORIES: CATEGORIES,
    moveItems: moveItems,
    folderMenuItems: folderMenuItems,
    state: function () { return catalogState; },
    refreshCatalogState: function () { catalogState = null; foldersCache = null; mruLayerIds = null; return detectCatalog(true); }
  };
})();
