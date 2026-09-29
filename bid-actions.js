/* ═══════════════════════════════════════════════════════════════════
   bid-actions.js — window.BidActions
   Project-level actions shared by bid-board.html and bid-project.html
   (and the est-strip in procore-ui.js):
     copyProject / copyDialog / createProject / setTemplate / setDefaultTemplate /
     getDefaultTemplate / applyTemplate / archive / unarchive / del /
     addAlternate / insertAlternate / nextVersion / versions / loadEstimate.
   Needs window.supabaseClient. Uses window.PC (procore-ui.js) for dialogs and
   toasts when present, and falls back to window.confirm / window.prompt / console.

   Data rules
   - Copies never carry id / quote_number / audit columns / aia_project_id (STRIP_EST);
     project_id (awarded projects.id link) is dropped unless opts.keepProjectLink.
   - Lines are copied in dependency order so parent_id points at rows of the COPY.
   - Takeoff layers are bulk-copied first; line.layer_id and measurement.layer_id are
     remapped through the resulting map. Missing takeoff-v2 tables degrade silently.
   - Measurements are copied with the drawings (copyProject) or onto the shared root
     drawings (alternates: only marks of the copied layers).
   - Every insert is checked; on any failure after the new estimates row exists the
     row is deleted (FK cascade cleans children) and the error is rethrown.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var BA = {};
  function sb() { return window.supabaseClient; }
  function P() { return window.PC; }

  /* columns that must never be copied from one estimates row to another */
  var STRIP_EST = ['id', 'quote_number', 'created_at', 'updated_at', 'sent_at', 'awarded_at', 'aia_project_id'];
  var STRIP_ROW = ['id', 'created_at', 'updated_at'];
  /* pricing fields an alternate inherits from its root (documented for callers) */
  var RATE_FIELDS = ['labor_rate', 'overhead_pct', 'miscellaneous_pct', 'tax_rate', 'is_ofci'];
  var CHUNK = 200;

  BA.STRIP_EST = STRIP_EST;
  BA.STRIP_ROW = STRIP_ROW;
  BA.RATE_FIELDS = RATE_FIELDS;

  /* ─── helpers ─────────────────────────────────────────────────────── */
  function stripped(row, list) {
    var c = Object.assign({}, row);
    list.forEach(function (k) { delete c[k]; });
    return c;
  }
  function toast(msg, type) {
    if (P() && typeof P().toast === 'function') P().toast(msg, type);
    else if (type === 'error') console.error('[BidActions]', msg);
    else console.log('[BidActions]', msg);
  }
  function fail(msg, err) {
    var m = msg + (err && err.message ? ': ' + err.message : '');
    toast(m, 'error');
    console.warn('[BidActions]', m, err || '');
    var e = new Error(m);
    e.baHandled = true;
    throw e;
  }
  function schemaMissing(err) {
    if (!err) return false;
    if (P() && typeof P().isSchemaError === 'function') return P().isSchemaError(err);
    var m = (err.message || '') + ' ' + (err.code || '');
    return /42703|42P01|PGRST205|does not exist|could not find|schema cache/i.test(m);
  }
  function esc(s) {
    if (P() && typeof P().esc === 'function') return P().esc(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function confirmDlg(opts) {
    if (P() && typeof P().confirm === 'function') return P().confirm(opts);
    return Promise.resolve(window.confirm((opts.title ? opts.title + '\n\n' : '') + (opts.message || '')));
  }
  function promptDlg(opts) {
    if (P() && typeof P().prompt === 'function') return P().prompt(opts);
    var v = window.prompt((opts.title ? opts.title + '\n' : '') + (opts.label || ''), opts.value || '');
    return Promise.resolve(v == null ? null : v);
  }
  function cleanSettings(row) {
    if (row.settings === null || row.settings === undefined) { delete row.settings; return; }
    if (typeof row.settings === 'object') {
      row.settings = Object.assign({}, row.settings);
      delete row.settings.is_default_template;
    }
  }
  function progress(opts, msg) {
    if (opts && typeof opts.onProgress === 'function') { try { opts.onProgress(msg); } catch (e) { /* ignore */ } }
  }
  async function currentUserId() {
    try { var u = await sb().auth.getUser(); return u && u.data && u.data.user ? u.data.user.id : null; } catch (e) { return null; }
  }
  /* insert rows in chunks; returns the inserted rows (id) in insert order */
  async function insertChunks(table, rows, label) {
    var out = [];
    for (var i = 0; i < rows.length; i += CHUNK) {
      var r = await sb().from(table).insert(rows.slice(i, i + CHUNK)).select('id');
      if (r.error) fail(label + ' failed', r.error);
      out = out.concat(r.data || []);
    }
    return out;
  }
  function groupKey(g) { return typeof g === 'string' ? g : (g && g.name != null ? String(g.name) : ''); }
  /* union of two group arrays by name — target entries win (keep their multiplier) */
  function unionGroups(target, extra) {
    var out = Array.isArray(target) ? target.slice() : [];
    var seen = {};
    out.forEach(function (g) { seen[groupKey(g).toLowerCase()] = true; });
    var changed = false;
    (Array.isArray(extra) ? extra : []).forEach(function (g) {
      var k = groupKey(g).toLowerCase();
      if (!k || seen[k]) return;
      seen[k] = true; out.push(g); changed = true;
    });
    return { list: out, changed: changed };
  }

  /* ─── child copiers ───────────────────────────────────────────────── */

  /* Bulk-copy takeoff layers srcId → dstId. Returns {oldId: newId}. Missing table → {} */
  async function copyLayers(srcId, dstId) {
    var map = {};
    var lay = await sb().from('estimate_takeoff_layers').select('*').eq('estimate_id', srcId).order('sort_order');
    if (lay.error) {
      if (schemaMissing(lay.error)) return map;   // takeoff-v2-schema.sql not run yet
      fail('Takeoff layers load failed', lay.error);
    }
    if (!lay.data || !lay.data.length) return map;
    var rows = lay.data.map(function (r) {
      var c = stripped(r, STRIP_ROW);
      c.estimate_id = dstId;
      return c;
    });
    var ins = await insertChunks('estimate_takeoff_layers', rows, 'Takeoff layers copy');
    if (ins.length !== rows.length) fail('Takeoff layers copy failed', { message: 'inserted ' + ins.length + ' of ' + rows.length });
    lay.data.forEach(function (r, i) { map[r.id] = ins[i].id; });
    return map;
  }

  /* Copy line items srcId → dstId with parent_id + layer_id remapped.
     Rows are inserted in dependency passes (parents first) so parent_id always points
     at a row of the copy. sortBase > 0 appends after the target's existing lines.
     Returns the number of lines copied. */
  async function copyLines(srcId, dstId, layerMap, sortBase, label) {
    var li = await sb().from('estimate_line_items').select('*').eq('estimate_id', srcId).order('sort_order');
    if (li.error) fail((label || 'Line items') + ' load failed', li.error);
    var src = li.data || [];
    if (!src.length) return 0;
    var idMap = {};
    var srcIds = {};
    src.forEach(function (r) { srcIds[r.id] = true; });
    var pending = src.slice();
    var seq = 0;
    var relaxed = false;
    while (pending.length) {
      var batch = [], rest = [];
      pending.forEach(function (r) {
        var p = r.parent_id;
        var ready = !p || !srcIds[p] || idMap[p] || relaxed;
        (ready ? batch : rest).push(r);
      });
      if (!batch.length) { relaxed = true; continue; }   // cycle / orphan: insert with parent cleared
      var rows = batch.map(function (r) {
        var c = stripped(r, STRIP_ROW);
        c.estimate_id = dstId;
        if (sortBase) c.sort_order = sortBase + (++seq);
        if (c.parent_id) c.parent_id = idMap[c.parent_id] || null;
        if (c.layer_id) c.layer_id = (layerMap && layerMap[c.layer_id]) || null;
        return c;
      });
      var ins = await insertChunks('estimate_line_items', rows, (label || 'Line items') + ' copy');
      if (ins.length !== rows.length) fail((label || 'Line items') + ' copy failed', { message: 'inserted ' + ins.length + ' of ' + rows.length });
      batch.forEach(function (r, i) { idMap[r.id] = ins[i].id; });
      pending = rest;
    }
    return src.length;
  }

  /* Copy drawing rows srcId → dstId (same storage_path: PDF files are shared read-only).
     Returns {srcIds: [...], map: {oldId: newId}}. Missing table → empty. */
  async function copyDrawings(srcId, dstId, userId) {
    var res = { srcIds: [], map: {} };
    var dr = await sb().from('estimate_drawings').select('*').eq('estimate_id', srcId);
    if (dr.error) {
      if (schemaMissing(dr.error)) return res;
      fail('Drawings load failed', dr.error);
    }
    if (!dr.data || !dr.data.length) return res;
    var rows = dr.data.map(function (r) {
      var c = stripped(r, STRIP_ROW);
      c.estimate_id = dstId;
      if (userId) c.uploaded_by = userId;
      return c;
    });
    var ins = await insertChunks('estimate_drawings', rows, 'Drawings copy');
    if (ins.length !== rows.length) fail('Drawings copy failed', { message: 'inserted ' + ins.length + ' of ' + rows.length });
    dr.data.forEach(function (r, i) { res.map[r.id] = ins[i].id; res.srcIds.push(r.id); });
    return res;
  }

  /* Copy estimate_measurements of the given drawings.
       drawingMap  {oldDrawingId: newDrawingId} or null to keep drawing_id (alternates share root drawings)
       layerMap    {oldLayerId: newLayerId}
       mode        'copy'      → marks with an unmapped layer_id become legacy marks (layer_id null)
                   'alternate' → only marks whose layer_id maps are copied (never duplicate legacy marks)
     A missing layer_id column (takeoff-v2 not run) copies everything with drawing_id remap only. */
  async function copyMeasurements(srcDrawingIds, drawingMap, layerMap, mode) {
    if (!srcDrawingIds || !srcDrawingIds.length) return 0;
    var q = await sb().from('estimate_measurements').select('*').in('drawing_id', srcDrawingIds);
    if (q.error) {
      if (schemaMissing(q.error)) return 0;
      fail('Measurements load failed', q.error);
    }
    var rows = [];
    (q.data || []).forEach(function (r) {
      var c = stripped(r, STRIP_ROW);
      c.drawing_id = drawingMap ? drawingMap[r.drawing_id] : r.drawing_id;
      if (!c.drawing_id) return;
      var hasLayerCol = Object.prototype.hasOwnProperty.call(c, 'layer_id');
      if (hasLayerCol && c.layer_id != null) {
        var nl = layerMap && layerMap[c.layer_id];
        if (nl) c.layer_id = nl;
        else if (mode === 'alternate') return;
        else c.layer_id = null;
      } else if (mode === 'alternate') {
        return;   // legacy (no-layer) marks already live on the shared root drawing
      }
      rows.push(c);
    });
    if (!rows.length) return 0;
    var ins = await insertChunks('estimate_measurements', rows, 'Measurements copy');
    return ins.length;
  }

  /* ─── read helpers ────────────────────────────────────────────────── */
  BA.loadEstimate = async function (id) {
    var r = await sb().from('estimates').select('*').eq('id', id).single();
    if (r.error || !r.data) fail('Project load failed', r.error);
    return r.data;
  };
  /* root + alternates of a project, ordered by version_number */
  BA.versions = async function (rootId) {
    var r = await sb().from('estimates').select('*').or('id.eq.' + rootId + ',parent_estimate_id.eq.' + rootId).order('version_number');
    if (r.error) fail('Versions load failed', r.error);
    return r.data || [];
  };
  /* next free version_number of a project (root = 1) */
  BA.nextVersion = async function (rootId) {
    var sib = await sb().from('estimates').select('id,version_number').or('id.eq.' + rootId + ',parent_estimate_id.eq.' + rootId);
    if (sib.error) fail('Versions load failed', sib.error);
    var maxV = 1;
    (sib.data || []).forEach(function (s) { if (Number(s.version_number) > maxV) maxV = Number(s.version_number); });
    return maxV + 1;
  };

  /* ─── copy / create ───────────────────────────────────────────────── */

  /**
   * copyProject(id, opts) → newId
   *   opts.name            new project name (default "<name> (copy)")
   *   opts.asTemplate      true → is_template, estimate_no cleared
   *   opts.bid_stage       'estimating' (default) | 'invitation' | 'to_do' | …
   *   opts.estimator_name  override estimator
   *   opts.keepProjectLink keep project_id (awarded projects.id); dropped by default
   *   opts.onProgress(msg) optional progress callback
   * Copies the estimates row + lines + layers + drawings + measurements and every
   * alternate (+ their lines/layers). Rolls back (deletes the new row) on any failure.
   */
  BA.copyProject = async function (id, opts) {
    opts = opts || {};
    progress(opts, 'Loading project…');
    var src = await sb().from('estimates').select('*').eq('id', id).single();
    if (src.error || !src.data) fail('Project load failed', src.error);
    var uid = await currentUserId();
    var row = stripped(src.data, STRIP_EST);
    row.name = opts.name || (src.data.name + ' (copy)');
    row.is_template = !!opts.asTemplate;
    row.template_source_id = id;
    row.parent_estimate_id = null;
    row.version_number = 1;
    row.version_label = 'Original Estimate';
    row.bid_stage = opts.bid_stage || 'estimating';
    row.bid_intent = row.bid_stage === 'invitation' ? 'undecided' : null;
    row.archived_at = null;
    row.status = 'draft';
    if (!opts.keepProjectLink) row.project_id = null;
    if (opts.asTemplate) row.estimate_no = null;
    if (uid) row.created_by = uid;
    if (opts.estimator_name !== undefined) row.estimator_name = opts.estimator_name;
    cleanSettings(row);

    progress(opts, 'Creating project…');
    var ins = await sb().from('estimates').insert(row).select('id').single();
    if (ins.error && schemaMissing(ins.error)) {
      delete row.settings; delete row.square_footage;
      ins = await sb().from('estimates').insert(row).select('id').single();
    }
    if (ins.error || !ins.data) fail('Copy failed', ins.error);
    var newId = ins.data.id;

    try {
      progress(opts, 'Copying takeoff and estimate…');
      var layerMap = await copyLayers(id, newId);
      await copyLines(id, newId, layerMap, 0, 'Line items');

      // alternates (stored with is_template=false; they follow the new root's stage)
      var alts = await sb().from('estimates').select('*').eq('parent_estimate_id', id).order('version_number');
      if (alts.error && !schemaMissing(alts.error)) fail('Alternates load failed', alts.error);
      var altList = alts.data || [];
      for (var i = 0; i < altList.length; i++) {
        progress(opts, 'Copying alternate ' + (i + 1) + ' of ' + altList.length + '…');
        var a = stripped(altList[i], STRIP_EST);
        a.parent_estimate_id = newId;
        a.is_template = false;
        a.template_source_id = altList[i].id;
        a.archived_at = null;
        a.status = 'draft';
        a.bid_stage = row.bid_stage;
        a.bid_intent = row.bid_intent;
        if (!opts.keepProjectLink) a.project_id = null;
        if (opts.asTemplate) a.estimate_no = null;
        if (uid) a.created_by = uid;
        if (opts.estimator_name !== undefined) a.estimator_name = opts.estimator_name;
        cleanSettings(a);
        var ai = await sb().from('estimates').insert(a).select('id').single();
        if (ai.error && schemaMissing(ai.error)) {
          delete a.settings; delete a.square_footage;
          ai = await sb().from('estimates').insert(a).select('id').single();
        }
        if (ai.error || !ai.data) fail('Alternate copy failed', ai.error);
        var altMap = await copyLayers(altList[i].id, ai.data.id);
        await copyLines(altList[i].id, ai.data.id, altMap, 0, 'Alternate line items');
        Object.keys(altMap).forEach(function (k) { layerMap[k] = altMap[k]; });
      }

      // drawings + marks (marks of every version live on the root drawings)
      progress(opts, 'Copying drawings…');
      var dres = await copyDrawings(id, newId, uid);
      await copyMeasurements(dres.srcIds, dres.map, layerMap, 'copy');
    } catch (e) {
      progress(opts, 'Rolling back…');
      try { await sb().from('estimates').delete().eq('id', newId); } catch (e2) { console.warn('[BidActions] rollback failed', e2); }
      if (!e || !e.baHandled) toast('Copy failed: ' + (e && e.message ? e.message : e), 'error');
      throw e;
    }
    progress(opts, 'Done');
    return newId;
  };
  BA.duplicateProject = BA.copyProject;

  /** copyDialog(id, {name, asTemplate}) → newId | null — prompt for the name, then copyProject */
  BA.copyDialog = async function (id, opts) {
    opts = opts || {};
    var src = await BA.loadEstimate(id);
    var name = await promptDlg({
      title: opts.asTemplate ? 'Copy Project to Template' : 'Copy Project',
      label: opts.asTemplate ? 'Template name' : 'New project name',
      value: opts.name || ((src.name || 'Untitled') + (opts.asTemplate ? ' Template' : ' (copy)')),
      okLabel: opts.asTemplate ? 'Create template' : 'Copy'
    });
    if (!name || !String(name).trim()) return null;
    var o = Object.assign({}, opts, { name: String(name).trim() });
    var newId = await BA.copyProject(id, o);
    toast(opts.asTemplate ? 'Template created: ' + o.name : 'Project copied', 'success');
    return newId;
  };

  /**
   * createProject(patch, {templateId}) → newId
   *   patch: estimates columns for the new root (name, bid_stage, bid_intent, project_number, …)
   *   templateId: copy that template (root + alternates + takeoff) and apply patch on top;
   *   without it an empty root row is inserted with Procore defaults.
   */
  BA.createProject = async function (patch, opts) {
    opts = opts || {};
    patch = Object.assign({}, patch || {});
    Object.keys(patch).forEach(function (k) { if (patch[k] === undefined) delete patch[k]; });
    var uid = await currentUserId();
    var newId;
    if (opts.templateId) {
      newId = await BA.copyProject(opts.templateId, {
        name: patch.name || 'New Project',
        bid_stage: patch.bid_stage || 'estimating',
        estimator_name: patch.estimator_name,
        keepProjectLink: !!opts.keepProjectLink,
        onProgress: opts.onProgress
      });
      var up = Object.assign({}, patch, { is_template: false, template_source_id: opts.templateId, parent_estimate_id: null, version_number: 1 });
      if (up.settings === null) delete up.settings;
      delete up.id; delete up.quote_number;
      var r = await sb().from('estimates').update(up).eq('id', newId);
      if (r.error && schemaMissing(r.error)) {
        delete up.settings; delete up.square_footage;
        r = await sb().from('estimates').update(up).eq('id', newId);
      }
      if (r.error) {
        try { await sb().from('estimates').delete().eq('id', newId); } catch (e2) { /* ignore */ }
        fail('Create failed', r.error);
      }
      if (patch.bid_stage) {
        var ra = await sb().from('estimates').update({ bid_stage: patch.bid_stage, bid_intent: patch.bid_intent || null }).eq('parent_estimate_id', newId);
        if (ra.error && !schemaMissing(ra.error)) console.warn('[BidActions] alternates stage update', ra.error);
      }
      return newId;
    }
    var row = Object.assign({
      name: 'New Project',
      bid_stage: 'estimating',
      status: 'draft',
      is_template: false,
      parent_estimate_id: null,
      version_number: 1,
      version_label: 'Original Estimate'
    }, patch);
    if (!row.name) row.name = 'New Project';
    if (row.settings === null) delete row.settings;
    if (uid && !row.created_by) row.created_by = uid;
    var ins = await sb().from('estimates').insert(row).select('id').single();
    if (ins.error && schemaMissing(ins.error)) {
      delete row.settings; delete row.square_footage;
      ins = await sb().from('estimates').insert(row).select('id').single();
    }
    if (ins.error || !ins.data) fail('Create failed', ins.error);
    return ins.data.id;
  };

  /* ─── templates ───────────────────────────────────────────────────── */

  /** setTemplate(id, flag=true) — mark / unmark a project as template */
  BA.setTemplate = async function (id, flag) {
    var on = flag !== false;
    var patch = { is_template: on };
    var r = await sb().from('estimates').update(patch).eq('id', id);
    if (r.error) fail('Could not ' + (on ? 'set' : 'clear') + ' template', r.error);
    if (!on) {
      // an un-templated project can no longer be the default template
      var t = await sb().from('estimates').select('id,settings').eq('id', id).single();
      if (!t.error && t.data && t.data.settings && t.data.settings.is_default_template) {
        var s = Object.assign({}, t.data.settings); delete s.is_default_template;
        await sb().from('estimates').update({ settings: s }).eq('id', id);
      }
    }
    return true;
  };

  /** make id the default template (marks it is_template when needed); clears the flag on every other template */
  BA.setDefaultTemplate = async function (id) {
    var t = await sb().from('estimates').select('id,settings,is_template').eq('is_template', true);
    if (t.error) {
      if (schemaMissing(t.error)) fail('Run procore-ui-schema.sql first (estimates.settings is missing)', null);
      fail('Template load failed', t.error);
    }
    var rows = (t.data || []).slice();
    var target = rows.filter(function (r) { return r.id === id; })[0];
    if (!target) {
      var one = await sb().from('estimates').select('id,settings,is_template').eq('id', id).single();
      if (one.error || !one.data) fail('Template load failed', one.error);
      target = one.data; rows.push(target);
    }
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var s = Object.assign({}, row.settings || {});
      var want = row.id === id;
      var patch = null;
      if (!!s.is_default_template !== want) {
        if (want) s.is_default_template = true; else delete s.is_default_template;
        patch = { settings: s };
      }
      if (want && !row.is_template) { patch = patch || {}; patch.is_template = true; }
      if (!patch) continue;
      var u = await sb().from('estimates').update(patch).eq('id', row.id);
      if (u.error) fail('Could not update template', u.error);
    }
    return true;
  };

  /** getDefaultTemplate() → estimates row (id,name,quote_number,settings) | null */
  BA.getDefaultTemplate = async function () {
    var t = await sb().from('estimates').select('id,name,quote_number,settings,is_template').eq('is_template', true).is('parent_estimate_id', null);
    if (t.error) {
      if (schemaMissing(t.error)) return null;
      fail('Template load failed', t.error);
    }
    var hit = (t.data || []).filter(function (r) { return r.settings && r.settings.is_default_template; });
    return hit[0] || null;
  };

  /**
   * applyTemplate(targetId, templateId) → {lines, layers}
   * Appends the template's lines (sort_order after the target's last line) + takeoff layers
   * into the target version and merges settings.manual_groups / takeoff_groups (by name,
   * target multipliers win).
   */
  BA.applyTemplate = async function (targetId, templateId) {
    var mx = await sb().from('estimate_line_items').select('sort_order').eq('estimate_id', targetId).order('sort_order', { ascending: false }).limit(1);
    if (mx.error) fail('Estimate load failed', mx.error);
    var base = (mx.data && mx.data[0] && Number(mx.data[0].sort_order)) || 0;
    var layerMap = await copyLayers(templateId, targetId);
    var lines = await copyLines(templateId, targetId, layerMap, base, 'Template lines');

    // merge settings groups (skip when procore-ui-schema.sql not run)
    var both = await sb().from('estimates').select('id,settings').in('id', [targetId, templateId]);
    if (!both.error && both.data) {
      var tgt = both.data.filter(function (r) { return r.id === targetId; })[0];
      var tpl = both.data.filter(function (r) { return r.id === templateId; })[0];
      var ts = (tpl && tpl.settings) || {};
      if (tgt && (ts.manual_groups || ts.takeoff_groups)) {
        var s = Object.assign({}, tgt.settings || {});
        var mg = unionGroups(s.manual_groups, ts.manual_groups);
        var tg = unionGroups(s.takeoff_groups, ts.takeoff_groups);
        if (mg.changed) s.manual_groups = mg.list;
        if (tg.changed) s.takeoff_groups = tg.list;
        if (mg.changed || tg.changed) {
          var u = await sb().from('estimates').update({ settings: s }).eq('id', targetId);
          if (u.error && !schemaMissing(u.error)) fail('Settings merge failed', u.error);
        }
      }
    } else if (both.error && !schemaMissing(both.error)) {
      fail('Settings load failed', both.error);
    }
    return { lines: lines, layers: Object.keys(layerMap).length };
  };

  /* ─── archive / delete ────────────────────────────────────────────── */
  BA.archive = async function (id) {
    var r = await sb().from('estimates').update({ bid_stage: 'archived', archived_at: new Date().toISOString() }).eq('id', id);
    if (r.error) fail('Archive failed', r.error);
    return true;
  };
  BA.unarchive = async function (id, stage) {
    var r = await sb().from('estimates').update({ bid_stage: stage || 'estimating', archived_at: null }).eq('id', id);
    if (r.error) fail('Restore failed', r.error);
    return true;
  };

  /** confirm with the project name → DELETE estimates WHERE id (cascades) → true|false */
  BA.del = async function (id, name) {
    var ok = await confirmDlg({
      title: 'Delete project',
      message: 'Delete "' + (name || 'this project') + '" with all its estimates, takeoffs and documents? This cannot be undone.',
      okLabel: 'Delete', danger: true
    });
    if (!ok) return false;
    var r = await sb().from('estimates').delete().eq('id', id);
    if (r.error) fail('Delete failed', r.error);
    toast('Project deleted', 'success');
    return true;
  };

  /* ─── alternates ──────────────────────────────────────────────────── */

  /**
   * insertAlternate(rootId, {label, copyFrom}) → newId  (no dialog)
   * Clones the root row (all columns except STRIP_EST) as version N; when copyFrom is a
   * version id, its layers + lines are copied and the marks of those layers are duplicated
   * on the shared root drawings. Rolls back on failure.
   */
  BA.insertAlternate = async function (rootId, opts) {
    opts = opts || {};
    var root = await BA.loadEstimate(rootId);
    if (root.parent_estimate_id) { rootId = root.parent_estimate_id; root = await BA.loadEstimate(rootId); }
    var nextNo = await BA.nextVersion(rootId);
    var label = (opts.label && String(opts.label).trim()) || ('Alt ' + (nextNo - 1));
    var uid = await currentUserId();
    var row = stripped(root, STRIP_EST);
    row.parent_estimate_id = rootId;
    row.version_number = nextNo;
    row.version_label = label;
    row.name = root.name + ' — ' + label;
    row.is_template = false;
    row.template_source_id = null;
    row.archived_at = null;
    row.status = 'draft';
    row.bid_stage = root.bid_stage || 'estimating';
    if (uid) row.created_by = uid;
    cleanSettings(row);
    var ins = await sb().from('estimates').insert(row).select('id').single();
    if (ins.error && schemaMissing(ins.error)) {
      delete row.settings; delete row.square_footage;
      ins = await sb().from('estimates').insert(row).select('id').single();
    }
    if (ins.error || !ins.data) fail('Could not create alternate', ins.error);
    var newId = ins.data.id;
    if (opts.copyFrom) {
      try {
        var layerMap = await copyLayers(opts.copyFrom, newId);
        await copyLines(opts.copyFrom, newId, layerMap, 0, 'Alternate line items');
        if (Object.keys(layerMap).length) {
          var dr = await sb().from('estimate_drawings').select('id').eq('estimate_id', rootId);
          if (dr.error && !schemaMissing(dr.error)) fail('Drawings load failed', dr.error);
          var ids = (dr.data || []).map(function (d) { return d.id; });
          await copyMeasurements(ids, null, layerMap, 'alternate');
        }
      } catch (e) {
        try { await sb().from('estimates').delete().eq('id', newId); } catch (e2) { /* ignore */ }
        if (!e || !e.baHandled) toast('Alternate copy failed: ' + (e && e.message ? e.message : e), 'error');
        throw e;
      }
    }
    return newId;
  };

  /**
   * addAlternate(rootId, {label, copyFrom, noDialog}) → newId | null
   * Dialog: Name (default 'Alt N') + checkbox 'Copy items from current estimate'
   * (checked when copyFrom is given). noDialog skips the dialog and uses opts as is.
   * rootId may be any version id — it is normalised to the project root.
   */
  BA.addAlternate = async function (rootId, opts) {
    opts = opts || {};
    var root = await BA.loadEstimate(rootId);
    if (root.parent_estimate_id) rootId = root.parent_estimate_id;
    var nextNo = await BA.nextVersion(rootId);
    var defLabel = opts.label || ('Alt ' + (nextNo - 1));
    var form;
    if (opts.noDialog) {
      form = { label: defLabel, copy: !!opts.copyFrom };
    } else if (P() && typeof P().modal === 'function') {
      form = await new Promise(function (resolve) {
        var done = false;
        P().modal({
          title: 'Add alternate estimate', size: 'sm', enterSubmits: true,
          body: '<div class="pc-field"><label class="pc-label">Name</label><input class="pc-input" id="baAltName" value="' + esc(defLabel) + '"></div>' +
            '<label class="pc-check"><input type="checkbox" id="baAltCopy"' + (opts.copyFrom ? ' checked' : '') + '> Copy items from current estimate</label>' +
            '<div class="pc-hint" style="margin-top:10px">Alternates share the project documents. Line items, takeoff layers and their marks are copied only when the box is checked.</div>',
          buttons: [
            { label: 'Cancel', onClick: function () { done = true; resolve(null); } },
            { label: 'Create', primary: true, onClick: function (ctx) {
                var name = ctx.body.querySelector('#baAltName').value.trim();
                if (!name) { toast('Name required', 'error'); return false; }
                done = true;
                resolve({ label: name, copy: ctx.body.querySelector('#baAltCopy').checked });
              } }
          ],
          onClose: function () { if (!done) resolve(null); }
        });
      });
    } else {
      var nm = window.prompt('Add alternate estimate\nName', defLabel);
      if (nm == null || !String(nm).trim()) return null;
      form = { label: String(nm).trim(), copy: !!opts.copyFrom && window.confirm('Copy items from current estimate?') };
    }
    if (!form) return null;
    var newId = await BA.insertAlternate(rootId, { label: form.label, copyFrom: form.copy ? (opts.copyFrom || rootId) : null });
    toast('Alternate "' + form.label + '" created', 'success');
    return newId;
  };

  window.BidActions = BA;
})();
