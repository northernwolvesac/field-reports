// =====================================================
// GOOGLE APPS SCRIPT - Google Drive Integration  (v3.7)
// =====================================================
// Deploy this as a Web App in Google Apps Script
//
// SETUP STEPS:
// 1. Go to https://script.google.com -> open the "NW Drive Proxy" project
// 2. Paste ALL the code below into Code.gs (replace everything)
// 3. Deploy -> Manage deployments -> edit (pencil) -> Version: "New version" -> Deploy
//    (this keeps the same Web App URL the app already uses)
//
// v3.0: the office folder "NW Projects" (formerly F.JOBS) is the root. Every project is a folder in
// F.JOBS (folder description = the app's project id, or matched by name) with
// the F.JOBS template sub-folders (Application for Payment, COI, Contract,
// Drawings, Insurance Requirements, IOM & WARRANTY, Proposal, Purchase Orders,
// Quotes, RFI, Schedule, SHOP DRAWINGS, Submittals, Tax Exempt Certs + the app's
// Change Orders / Photos / Reports). The app shows the live folder tree
// (list_tree) so sub-folders look exactly like in Google Drive.
// =====================================================

var FJOBS_FOLDER_ID = '16x8aJ_3Lbv3RSoljlLYkiH1VVr7q2-vY';   // 'NW Projects' folder in Google Drive (root, owned by Ruslan since 2026-09-25)
var OLD_ROOT_ID = '1ZT-eAsLR8-Sml95DnFRccfPksoab6kIW';       // Fatima's F.JOBS (source of the 2026-09-25 copy; read-only fallback until deleted)
var LEGACY_ROOT_NAME = 'Northern Wolves Projects';           // old app root (v1/v2), read-only fallback
var TEMPLATE = ['Application for Payment', 'As Builts', 'Change Orders', 'COI', 'Contract', 'Drawings', 'Insurance Requirements',
                'IOM & WARRANTY', 'Photos', 'Proposal', 'Purchase Orders', 'Quotes', 'Reports', 'RFI', 'Schedule',
                'SHOP DRAWINGS', 'Specs', 'Submittals', 'TAB Report', 'Tax Exempt Certs'];
// Field access: technicians (FIELD_VIEWERS) get Commenter on these project sub-folders only - never on the project root
// (everything financial stays invisible to them). Applied when a project folder is created and by 'apply_field_access'.
var FIELD_FOLDERS = ['Drawings', 'Submittals', 'IOM & WARRANTY', 'SHOP DRAWINGS', 'Reports', 'TAB Report', 'As Builts', 'Specs', 'Photos'];
var FIELD_VIEWERS = ['juan@northernwolvesac.com', 'kastriot@northernwolvesac.com', 'sergei.l@northernwolvesac.com', 'seva@northernwolvesac.com'];
// app category keys -> F.JOBS folder names
var CATEGORY_MAP = {
  'contract': 'Contract', 'contracts': 'Contract',
  'change orders': 'Change Orders', 'change order': 'Change Orders', 'cos': 'Change Orders',
  'submittal': 'Submittals', 'submittals': 'Submittals',
  'drawing': 'Drawings', 'drawings': 'Drawings', 'mech drawings': 'Drawings',
  'shop drawings': 'SHOP DRAWINGS', 'shop drawing': 'SHOP DRAWINGS',
  'invoice': 'Application for Payment', 'invoices': 'Application for Payment', 'application for payment': 'Application for Payment',
  'applications for payment': 'Application for Payment', 'payments': 'Application for Payment', 'billing': 'Application for Payment',
  'photo': 'Photos', 'photos': 'Photos', 'report': 'Reports', 'reports': 'Reports',
  'quote': 'Quotes', 'quotes': 'Quotes', 'rfi': 'RFI', 'rfis': 'RFI',
  'manual': 'IOM & WARRANTY', 'manuals': 'IOM & WARRANTY', 'warranty': 'IOM & WARRANTY', 'warranties': 'IOM & WARRANTY',
  'iom': 'IOM & WARRANTY', 'ioms': 'IOM & WARRANTY', 'iom warranty': 'IOM & WARRANTY',
  'proposal': 'Proposal', 'proposals': 'Proposal',
  'purchase order': 'Purchase Orders', 'purchase orders': 'Purchase Orders', 'po': 'Purchase Orders', 'pos': 'Purchase Orders',
  'coi': 'COI', 'insurance': 'Insurance Requirements', 'insurance requirements': 'Insurance Requirements',
  'tax exempt certs': 'Tax Exempt Certs', 'tax exempt': 'Tax Exempt Certs', 'tax': 'Tax Exempt Certs',
  'schedule': 'Schedule', 'specs': 'Specs', 'permits': 'Permits', 'leveling sheet': 'Leveling Sheet',
  'close out': 'Close-out', 'closeout': 'Close-out', 'other': 'Other'
};
// categories whose files stay link-viewable (the app shows inline previews of photos)
var SHARED_CATEGORIES = ['photos', 'reports'];


// ---------- who is calling? (v3.7) ----------
// Every request from the app carries the user's Supabase access token (body.token). The proxy verifies it with Supabase and reads
// the profile role: admin/manager => full access; tech => field folders only (FIELD_FOLDERS); no/invalid token => refused.
// Maintenance scripts run by Ruslan pass body.adminKey instead.
var SB_API_URL = 'https://vrscvnebznmomkdlhooi.supabase.co';
var SB_ANON_KEY = 'sb_publishable_7F9lDes97zMPVVrgdG2ggw_vdc6H3QE';
var ADMIN_KEY = 'SET-IN-APPS-SCRIPT-ONLY';   // real value lives only in the deployed Apps Script project
var FULL_ROLES = ['admin', 'manager', 'lead_pm', 'project_manager', 'apm'];
function callerFromToken(token) {
  if (!token) return null;
  var cache = CacheService.getScriptCache(), ck = 'tok:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)).slice(0, 40);
  var hit = cache.get(ck); if (hit) return JSON.parse(hit);
  var h = { apikey: SB_ANON_KEY, Authorization: 'Bearer ' + token };
  var r = UrlFetchApp.fetch(SB_API_URL + '/auth/v1/user', { headers: h, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  var u = JSON.parse(r.getContentText()); if (!u || !u.id) return null;
  var role = 'tech';
  try {
    var p = UrlFetchApp.fetch(SB_API_URL + '/rest/v1/profiles?id=eq.' + u.id + '&select=role', { headers: h, muteHttpExceptions: true });
    if (p.getResponseCode() === 200) { var rows = JSON.parse(p.getContentText()); if (rows[0] && rows[0].role) role = rows[0].role; }
  } catch (e) {}
  var caller = { id: u.id, email: u.email, role: role, full: FULL_ROLES.indexOf(role) >= 0 };
  try { cache.put(ck, JSON.stringify(caller), 300); } catch (e) {}
  return caller;
}
function isFieldTop(name) { var n = normName(name); return FIELD_FOLDERS.some(function(f) { return normName(f) === n; }); }
// keep only items whose top-level folder is a field folder (for technicians)
function filterFieldItems(t) {
  var by = {}; (t.items || []).forEach(function(i) { by[i.id] = i; });
  function topOf(i) { var x = i; while (x && x.parent && x.parent !== t.folderId) x = by[x.parent]; return x; }
  t.items = (t.items || []).filter(function(i) { var top = topOf(i); return top && top.folder && isFieldTop(top.name); });
  return t;
}
function fieldPathOk(category, subfolder, path) {
  var top = path ? String(path).split('/')[0] : categoryFolderName(category);
  return isFieldTop(top);
}

// ---------- Drive API v3 (one HTTP call lists a whole level of folders) ----------
function driveApi(path, params, method, payload) {
  var qs = Object.keys(params).map(function(k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
  var opts = { method: method || 'get', headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true };
  if (payload) { opts.contentType = 'application/json'; opts.payload = JSON.stringify(payload); }
  var resp = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/' + path + '?' + qs, opts);
  if (resp.getResponseCode() >= 300) throw new Error('Drive API ' + resp.getResponseCode() + ': ' + resp.getContentText().slice(0, 300));
  var txt = resp.getContentText(); return txt ? JSON.parse(txt) : {};
}
// permissions on one file/folder (direct, not inherited): [{emailAddress, role, id}]
function listPermissions(fileId) {
  var r = driveApi('files/' + fileId + '/permissions', { fields: 'permissions(id,emailAddress,role,type)', supportsAllDrives: true });
  return r.permissions || [];
}
function addPermission(fileId, email, role) {
  return driveApi('files/' + fileId + '/permissions', { supportsAllDrives: true, sendNotificationEmail: false }, 'post', { role: role, type: 'user', emailAddress: email });
}
function removePermissions(fileId, emails) {
  var lower = emails.map(function(e) { return e.toLowerCase(); }), removed = [];
  listPermissions(fileId).forEach(function(p) {
    if (p.emailAddress && lower.indexOf(p.emailAddress.toLowerCase()) >= 0 && p.role !== 'owner') {
      try { driveApi('files/' + fileId + '/permissions/' + p.id, { supportsAllDrives: true }, 'delete'); removed.push(p.emailAddress); } catch (e) {}
    }
  });
  return removed;
}
var ITEM_FIELDS = 'nextPageToken,files(id,name,mimeType,size,modifiedTime,createdTime,parents,webViewLink,description)';
function listChildren(parentIds) {
  var out = [];
  for (var i = 0; i < parentIds.length; i += 30) {
    var chunk = parentIds.slice(i, i + 30);
    var got = queryChildren(chunk);
    // shared drives ignore multi-parent OR queries: fall back to one query per folder
    if (!got.length && chunk.length > 1) chunk.forEach(function(id) { got = got.concat(queryChildren([id])); });
    out = out.concat(got);
  }
  return out;
}
function queryChildren(ids) {
  var q = '(' + ids.map(function(id) { return "'" + id + "' in parents"; }).join(' or ') + ') and trashed = false', out = [], token = '';
  do {
    var r = driveApi('files', { q: q, pageSize: 1000, fields: ITEM_FIELDS, pageToken: token, supportsAllDrives: true, includeItemsFromAllDrives: true, corpora: 'allDrives' });
    out = out.concat(r.files || []);
    token = r.nextPageToken || '';
  } while (token);
  return out;
}
function isFolderItem(it) { return it.mimeType === 'application/vnd.google-apps.folder'; }
function normName(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

// ---------- root / project folders ----------
function getRootFolder() { return DriveApp.getFolderById(FJOBS_FOLDER_ID); }
function getLegacyRoot() { var it = DriveApp.getFoldersByName(LEGACY_ROOT_NAME); return it.hasNext() ? it.next() : null; }

function listProjectFolders(rootId) {
  return listChildren([rootId]).filter(isFolderItem).map(function(f) {
    return { id: f.id, name: f.name, description: f.description || '', modifiedTime: f.modifiedTime };
  });
}

// find the project's folder in F.JOBS: by description (= app project id), then by name; legacy root as read-only fallback
function findProjectFolder(projectId, projectName) {
  var cache = CacheService.getScriptCache();
  var cached = projectId ? cache.get('pf:' + projectId) : null;
  if (cached) { try { var f0 = DriveApp.getFolderById(cached); if (!f0.isTrashed()) return f0; } catch (e) {} }
  var list = listProjectFolders(FJOBS_FOLDER_ID), i;
  for (i = 0; i < list.length; i++) if (projectId && list[i].description === projectId) return remember(projectId, list[i].id);
  var n = normName(projectName);
  if (n) for (i = 0; i < list.length; i++) if (normName(list[i].name) === n) {
    var f = DriveApp.getFolderById(list[i].id);
    if (projectId) { try { if (!f.getDescription()) f.setDescription(projectId); } catch (e) {} }
    return remember(projectId, list[i].id);
  }
  // read-only fallback: Fatima's F.JOBS (until the copy into NW Projects is complete and F.JOBS is deleted)
  try {
    var ol = listProjectFolders(OLD_ROOT_ID);
    for (i = 0; i < ol.length; i++) if (projectId && ol[i].description === projectId) return DriveApp.getFolderById(ol[i].id);
    if (n) for (i = 0; i < ol.length; i++) if (normName(ol[i].name) === n) return DriveApp.getFolderById(ol[i].id);
  } catch (e) {}
  var legacy = getLegacyRoot();
  if (legacy && projectId) {
    var ll = listProjectFolders(legacy.getId());
    for (i = 0; i < ll.length; i++) if (ll[i].description === projectId) return DriveApp.getFolderById(ll[i].id);
  }
  return null;
}
function remember(projectId, folderId) {
  if (projectId) { try { CacheService.getScriptCache().put('pf:' + projectId, folderId, 21600); } catch (e) {} }
  return DriveApp.getFolderById(folderId);
}
function getProjectFolder(projectName, projectId) {
  var existing = findProjectFolder(projectId, projectName);
  if (existing) return existing;
  var projectFolder = getRootFolder().createFolder(projectName || projectId);
  if (projectId) projectFolder.setDescription(projectId);
  for (var i = 0; i < TEMPLATE.length; i++) projectFolder.createFolder(TEMPLATE[i]);
  try { applyFieldAccess(projectFolder.getId()); } catch (e) {}
  return remember(projectId, projectFolder.getId());
}

function categoryFolderName(category) {
  var c = normName(category || 'other');
  if (CATEGORY_MAP[c]) return CATEGORY_MAP[c];
  return String(category).charAt(0).toUpperCase() + String(category).slice(1);
}
function getOrCreateChild(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  // case-insensitive match (Submittals vs SUBMITTALS)
  var all = parent.getFolders(), n = normName(name);
  while (all.hasNext()) { var f = all.next(); if (normName(f.getName()) === n) return f; }
  return parent.createFolder(name);
}
// resolve <project>/<category>/<subfolder> or an explicit path "Submittals/BOILER"
function getTargetFolder(projectFolder, category, subfolder, path) {
  var folder = projectFolder, parts = [];
  if (path) parts = String(path).split('/');
  else { parts = [categoryFolderName(category)]; if (subfolder) parts.push(String(subfolder).split('/').join('-').split('\\').join('-')); }
  for (var i = 0; i < parts.length; i++) { var p = parts[i].trim(); if (p) folder = getOrCreateChild(folder, p); }
  return folder;
}

function fileInfo(file, category, subfolder) {
  return {
    id: file.getId(), name: file.getName(), category: (category || 'other').toLowerCase(), subfolder: subfolder || '',
    size: file.getSize(), mimeType: file.getMimeType(), createdAt: file.getDateCreated().toISOString(),
    url: file.getUrl(), downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.getId(),
    viewUrl: file.getUrl(), directUrl: 'https://lh3.googleusercontent.com/d/' + file.getId()
  };
}

// ---------- the live folder tree of a project (folders + files, any depth) ----------
function listTree(projectName, projectId, maxDepth) {
  var pf = findProjectFolder(projectId, projectName);
  if (!pf) return { success: true, folderId: null, folderUrl: null, items: [] };
  return treeOf(pf.getId(), maxDepth, pf.getUrl(), pf.getName());
}
function treeOf(rootId, maxDepth, url, name) {
  var items = [], level = [rootId], depth = 0;
  while (level.length && depth < (maxDepth || 6)) {
    var kids = listChildren(level), next = [];
    kids.forEach(function(k) {
      items.push({ id: k.id, name: k.name, folder: isFolderItem(k), parent: (k.parents && k.parents[0]) || null,
                   size: Number(k.size || 0), modifiedTime: k.modifiedTime, mimeType: k.mimeType, url: k.webViewLink || ('https://drive.google.com/file/d/' + k.id + '/view') });
      if (isFolderItem(k)) next.push(k.id);
    });
    level = next; depth++;
  }
  return { success: true, folderId: rootId, folderUrl: url || '', folderName: name || '', items: items };
}

// flat list (kept for older pages): category folders + one level of subfolders + loose files
function listProjectFiles(projectName, projectId) {
  var t = listTree(projectName, projectId, 3);
  var byId = {}; t.items.forEach(function(it) { byId[it.id] = it; });
  var files = t.items.filter(function(it) { return !it.folder; }).map(function(it) {
    var p = byId[it.parent], cat = 'other', sub = '';
    if (p && p.id !== t.folderId) { var gp = byId[p.parent]; if (gp && gp.id !== t.folderId) { cat = gp.name.toLowerCase(); sub = p.name; } else cat = p.name.toLowerCase(); }
    return { id: it.id, name: it.name, category: cat, subfolder: sub, size: it.size, mimeType: it.mimeType, createdAt: it.modifiedTime,
             url: it.url, viewUrl: it.url, downloadUrl: 'https://drive.google.com/uc?export=download&id=' + it.id, directUrl: 'https://lh3.googleusercontent.com/d/' + it.id };
  });
  return { success: true, files: files, folderId: t.folderId };
}

function storeBlob(projectName, projectId, blob, category, subfolder, share, path) {
  var projectFolder = getProjectFolder(projectName, projectId);
  var folder = getTargetFolder(projectFolder, category, subfolder, path);
  var file = folder.createFile(blob);
  var cat = (category || 'other').toLowerCase();
  var makeShared = (share === true) || (share === undefined && SHARED_CATEGORIES.indexOf(cat) >= 0);
  if (makeShared) file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var info = fileInfo(file, cat, subfolder); info.folderId = folder.getId(); info.folderName = folder.getName();
  return { success: true, file: info, folderId: folder.getId() };
}
function uploadFile(projectName, projectId, fileName, base64Data, mimeType, category, subfolder, share, path) {
  var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType || 'application/octet-stream', fileName);
  return storeBlob(projectName, projectId, blob, category, subfolder, share, path);
}
function uploadFromUrl(projectName, projectId, fileName, url, mimeType, category, subfolder, share, path) {
  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (resp.getResponseCode() !== 200) return { success: false, error: 'fetch ' + resp.getResponseCode() };
  var blob = resp.getBlob(); if (mimeType) blob.setContentType(mimeType); blob.setName(fileName);
  return storeBlob(projectName, projectId, blob, category, subfolder, share, path);
}
function createFolder(projectName, projectId, path) {
  var pf = getProjectFolder(projectName, projectId);
  var f = getTargetFolder(pf, null, null, path);
  return { success: true, folder: { id: f.getId(), name: f.getName(), url: f.getUrl() } };
}
function renameItem(id, newName) {
  try { DriveApp.getFileById(id).setName(newName); return { success: true }; }
  catch (e) { try { DriveApp.getFolderById(id).setName(newName); return { success: true }; } catch (e2) { return { success: false, error: e2.message }; } }
}
function deleteFile(fileId) {
  try { DriveApp.getFileById(fileId).setTrashed(true); return { success: true }; }
  catch (e) { try { DriveApp.getFolderById(fileId).setTrashed(true); return { success: true }; } catch (e2) { return { success: false, error: e2.message }; } }
}
function getFile(fileId) {
  try { var f = DriveApp.getFileById(fileId); return { success: true, file: fileInfo(f, '', '') }; }
  catch (e) { return { success: false, error: e.message }; }
}
function renameProjectFolder(projectId, newName) {
  var f = findProjectFolder(projectId, null);
  if (!f) return { success: false, error: 'Project folder not found' };
  f.setName(newName); return { success: true };
}
function deleteProjectFolder(projectId) {
  var f = findProjectFolder(projectId, null);
  if (!f) return { success: false, error: 'Project folder not found' };
  f.setTrashed(true); return { success: true };
}
function linkProject(folderId, projectId) {
  var f = DriveApp.getFolderById(folderId); f.setDescription(projectId); remember(projectId, folderId);
  return { success: true, name: f.getName() };
}

// ---------- one-time migration: move a legacy "Northern Wolves Projects/<project>" folder into F.JOBS ----------
var LEGACY_CAT_MAP = { 'contracts': 'Contract', 'change orders': 'Change Orders', 'submittals': 'Submittals', 'drawings': 'Drawings',
                       'invoices': 'Application for Payment', 'photos': 'Photos', 'reports': 'Reports', 'other': 'Other' };
function folderHasContent(folder) {
  if (folder.getFiles().hasNext()) return true;
  var subs = folder.getFolders();
  while (subs.hasNext()) if (folderHasContent(subs.next())) return true;
  return false;
}
function mergeInto(src, dest, stats, deadline) {
  var files = src.getFiles();
  while (files.hasNext()) { if (Date.now() > deadline) { stats.partial = true; return; } files.next().moveTo(dest); stats.moved++; }
  var subs = src.getFolders();
  while (subs.hasNext()) {
    if (Date.now() > deadline) { stats.partial = true; return; }
    var s = subs.next();
    if (!folderHasContent(s)) { s.setTrashed(true); stats.emptyTrashed++; continue; }
    var same = dest.getFoldersByName(s.getName());
    if (same.hasNext()) { var d = same.next(); mergeInto(s, d, stats, deadline); if (!stats.partial && !folderHasContent(s)) { s.setTrashed(true); } }
    else { s.moveTo(dest); stats.moved++; }
  }
}
function migrateProject(legacyFolderId, projectId, projectName, targetFolderId) {
  var t0 = Date.now(), deadline = t0 + 270000;
  var legacy = DriveApp.getFolderById(legacyFolderId);
  var stats = { moved: 0, emptyTrashed: 0, partial: false };
  if (!folderHasContent(legacy)) { return { success: true, skipped: 'empty', legacyName: legacy.getName() }; }
  var target;
  if (targetFolderId) target = DriveApp.getFolderById(targetFolderId);
  else { target = findProjectFolder(projectId, projectName); if (!target || target.getId() === legacyFolderId || isUnder(target, legacyFolderId)) target = null; }
  if (!target) {
    target = getRootFolder().createFolder(projectName || legacy.getName());
    for (var i = 0; i < TEMPLATE.length; i++) target.createFolder(TEMPLATE[i]);
    stats.created = true;
  }
  if (projectId) { try { target.setDescription(projectId); } catch (e) { stats.descError = e.message; } remember(projectId, target.getId()); }
  // loose files -> target root
  var files = legacy.getFiles();
  while (files.hasNext()) { if (Date.now() > deadline) { stats.partial = true; break; } files.next().moveTo(target); stats.moved++; }
  var subs = legacy.getFolders();
  while (subs.hasNext() && !stats.partial) {
    var s = subs.next(), key = normName(s.getName());
    if (!folderHasContent(s)) { s.setTrashed(true); stats.emptyTrashed++; continue; }
    var dest = getOrCreateChild(target, LEGACY_CAT_MAP[key] || s.getName());
    mergeInto(s, dest, stats, deadline);
    if (!stats.partial && !folderHasContent(s)) s.setTrashed(true);
  }
  if (!stats.partial && !folderHasContent(legacy)) { legacy.setTrashed(true); stats.legacyTrashed = true; }
  stats.success = true; stats.target = target.getId(); stats.targetName = target.getName(); stats.seconds = Math.round((Date.now() - t0) / 1000);
  return stats;
}
function isUnder(folder, ancestorId) {
  var p = folder.getParents();
  while (p.hasNext()) { var x = p.next(); if (x.getId() === ancestorId) return true; }
  return false;
}


// move files/folders (by id) into a target folder; a folder whose name already exists in the target is merged into it
function moveItems(ids, targetFolderId) {
  var target = DriveApp.getFolderById(targetFolderId), stats = { moved: 0, emptyTrashed: 0, partial: false }, deadline = Date.now() + 270000;
  for (var i = 0; i < (ids || []).length; i++) {
    var id = ids[i], f = null;
    try { f = DriveApp.getFolderById(id); } catch (e) { f = null; }
    if (f) {
      var same = target.getFoldersByName(f.getName());
      if (same.hasNext()) { mergeInto(f, same.next(), stats, deadline); if (!folderHasContent(f)) f.setTrashed(true); }
      else { f.moveTo(target); stats.moved++; }
    } else { DriveApp.getFileById(id).moveTo(target); stats.moved++; }
  }
  stats.success = true; return stats;
}
function forgetProject(projectId) { try { CacheService.getScriptCache().remove('pf:' + projectId); } catch (e) {} return { success: true }; }


// ---------- copy a folder tree (read-only source, e.g. a shared drive) into a target folder, merging by folder name ----------
// nameMap: { normalizedSourceFolderName: 'Target Folder Name' } renames category folders while copying. Idempotent: a file whose
// name and size already exist in the destination folder is skipped.
function copyTree(sourceFolderId, targetFolderId, nameMap, opts) {
  var t0 = Date.now(), deadline = t0 + 270000, stats = { copied: 0, skipped: 0, bytes: 0, partial: false, errors: [] };
  var src = DriveApp.getFolderById(sourceFolderId), dest = DriveApp.getFolderById(targetFolderId);
  copyInto(src, dest, nameMap || {}, stats, deadline, true);
  stats.success = true; stats.seconds = Math.round((Date.now() - t0) / 1000); return stats;
}
function existingFiles(folder) {
  var m = {}, it = folder.getFiles();
  while (it.hasNext()) { var f = it.next(); m[f.getName().toLowerCase() + '|' + f.getSize()] = f.getId(); }
  return m;
}
function copyInto(src, dest, nameMap, stats, deadline, top) {
  var have = existingFiles(dest), files = src.getFiles();
  if (!stats.pairs) stats.pairs = [];
  while (files.hasNext()) {
    if (Date.now() > deadline) { stats.partial = true; return; }
    var f = files.next(), key = f.getName().toLowerCase() + '|' + f.getSize();
    if (have[key]) { stats.skipped++; stats.pairs.push([f.getId(), have[key]]); continue; }
    try { var nf = f.makeCopy(f.getName(), dest); stats.copied++; stats.bytes += f.getSize(); stats.pairs.push([f.getId(), nf.getId()]); have[key] = nf.getId(); }
    catch (e) { stats.errors.push(f.getName() + ': ' + e.message); }
  }
  var subs = src.getFolders();
  while (subs.hasNext()) {
    if (Date.now() > deadline) { stats.partial = true; return; }
    var s = subs.next(), nm = normName(s.getName()), destName = (top && nameMap[nm]) ? nameMap[nm] : s.getName().trim();
    copyInto(s, getOrCreateChild(dest, destName), nameMap, stats, deadline, false);
    if (stats.partial) return;
  }
}


// copy one project folder (e.g. from F.JOBS) into the root as a project folder with the same name and description (app project id)
function copyProject(sourceFolderId) {
  var t0 = Date.now(), deadline = t0 + 270000, stats = { copied: 0, skipped: 0, bytes: 0, partial: false, errors: [], pairs: [] };
  var src = DriveApp.getFolderById(sourceFolderId), name = src.getName(), desc = src.getDescription() || '';
  var target = null, list = listProjectFolders(FJOBS_FOLDER_ID), i;
  if (desc) for (i = 0; i < list.length; i++) if (list[i].description === desc) { target = DriveApp.getFolderById(list[i].id); break; }
  if (!target) for (i = 0; i < list.length; i++) if (normName(list[i].name) === normName(name)) { target = DriveApp.getFolderById(list[i].id); break; }
  if (!target) { target = getRootFolder().createFolder(name); stats.created = true; }
  if (desc) { try { if (target.getDescription() !== desc) target.setDescription(desc); } catch (e) { stats.descError = e.message; } remember(desc, target.getId()); }
  copyInto(src, target, {}, stats, deadline, false);
  stats.success = true; stats.target = target.getId(); stats.targetName = target.getName(); stats.seconds = Math.round((Date.now() - t0) / 1000);
  return stats;
}


// ---------- field access (techs see only field folders) ----------
function applyFieldAccess(projectFolderId) {
  var pf = DriveApp.getFolderById(projectFolderId), stats = { added: 0, already: 0, created: 0, errors: [] };
  for (var i = 0; i < FIELD_FOLDERS.length; i++) {
    var it = pf.getFoldersByName(FIELD_FOLDERS[i]), f = null;
    if (it.hasNext()) f = it.next();
    else { var all = pf.getFolders(), n = normName(FIELD_FOLDERS[i]); while (all.hasNext()) { var c = all.next(); if (normName(c.getName()) === n) { f = c; break; } } }
    if (!f) { f = pf.createFolder(FIELD_FOLDERS[i]); stats.created++; }
    var have = {};
    try { listPermissions(f.getId()).forEach(function(p) { if (p.emailAddress) have[p.emailAddress.toLowerCase()] = p.role; }); } catch (e) {}
    for (var j = 0; j < FIELD_VIEWERS.length; j++) {
      if (have[FIELD_VIEWERS[j].toLowerCase()]) { stats.already++; continue; }
      try { addPermission(f.getId(), FIELD_VIEWERS[j], 'commenter'); stats.added++; } catch (e) { stats.errors.push(f.getName() + ' ' + FIELD_VIEWERS[j] + ': ' + e.message); }
    }
  }
  stats.success = true; return stats;
}
function revokeAccess(fileId, emails) { return { success: true, removed: removePermissions(fileId, emails || []) }; }
function listAccess(fileId) { return { success: true, permissions: listPermissions(fileId) }; }

// ---------- Web App entry points ----------
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', service: 'NW Drive Proxy', version: '3.7' }))
    .setMimeType(ContentService.MimeType.JSON);
}
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.record || body.action === 'sendNotification') { if (typeof notificationsDoPost === 'function') return notificationsDoPost(e); }
    var result;
    if (body.action === 'ping') return ContentService.createTextOutput(JSON.stringify({ success: true, version: '3.7', root: FJOBS_FOLDER_ID })).setMimeType(ContentService.MimeType.JSON);
    var caller = (body.adminKey && body.adminKey === ADMIN_KEY) ? { id: 'admin-key', email: 'ruslan@northernwolvesac.com', role: 'admin', full: true } : callerFromToken(body.token);
    if (!caller) return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Not signed in (Drive access requires an app login)', auth: false })).setMimeType(ContentService.MimeType.JSON);
    if (!caller.full) {
      // technicians: field folders only
      var techActions = ['list_tree', 'list_files', 'upload_file', 'get_file', 'create_folder'];
      if (techActions.indexOf(body.action) < 0) return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Not allowed for your role', auth: true })).setMimeType(ContentService.MimeType.JSON);
      if ((body.action === 'upload_file' || body.action === 'create_folder') && !fieldPathOk(body.category, body.subfolder, body.folder))
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Technicians can only add files to field folders', auth: true })).setMimeType(ContentService.MimeType.JSON);
      if (body.action === 'list_tree') { result = filterFieldItems(listTree(body.projectName, body.projectId, body.maxDepth)); return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON); }
      if (body.action === 'list_files') { var lf = listProjectFiles(body.projectName, body.projectId); lf.files = lf.files.filter(function(f) { return isFieldTop(f.category); }); return ContentService.createTextOutput(JSON.stringify(lf)).setMimeType(ContentService.MimeType.JSON); }
    }
    switch (body.action) {

      case 'list_tree':       result = listTree(body.projectName, body.projectId, body.maxDepth); break;
      case 'list_files':      result = listProjectFiles(body.projectName, body.projectId); break;
      case 'list_projects':   result = { success: true, projects: listProjectFolders(body.legacy ? getLegacyRoot().getId() : FJOBS_FOLDER_ID) }; break;
      case 'upload_file':     result = uploadFile(body.projectName, body.projectId, body.fileName, body.fileData, body.mimeType, body.category, body.subfolder, body.share, body.folder); break;
      case 'upload_from_url': result = uploadFromUrl(body.projectName, body.projectId, body.fileName, body.url, body.mimeType, body.category, body.subfolder, body.share, body.folder); break;
      case 'create_folder':   result = createFolder(body.projectName, body.projectId, body.folder); break;
      case 'rename':          result = renameItem(body.id, body.newName); break;
      case 'delete_file':     result = deleteFile(body.fileId); break;
      case 'get_file':        result = getFile(body.fileId); break;
      case 'rename_project':  result = renameProjectFolder(body.projectId, body.newName); break;
      case 'delete_project':  result = deleteProjectFolder(body.projectId); break;
      case 'create_project':  var folder = getProjectFolder(body.projectName, body.projectId); result = { success: true, folderId: folder.getId(), url: folder.getUrl() }; break;
      case 'link_project':    result = linkProject(body.folderId, body.projectId); break;
      case 'move_items':      result = moveItems(body.ids, body.targetFolderId); break;
      case 'tree':            result = treeOf(body.folderId, body.maxDepth); break;
      case 'copy_tree':       result = copyTree(body.sourceFolderId, body.targetFolderId, body.nameMap, body); break;
      case 'copy_project':    result = copyProject(body.sourceFolderId); break;
      case 'apply_field_access': result = applyFieldAccess(body.folderId || getProjectFolder(body.projectName, body.projectId).getId()); break;
      case 'revoke_access':   result = revokeAccess(body.fileId, body.emails); break;
      case 'list_access':     result = listAccess(body.fileId); break;
      case 'forget':          result = forgetProject(body.projectId); break;
      case 'migrate_project': result = migrateProject(body.legacyFolderId, body.projectId, body.projectName, body.targetFolderId); break;
      default:                result = { success: false, error: 'Unknown action: ' + body.action };
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
