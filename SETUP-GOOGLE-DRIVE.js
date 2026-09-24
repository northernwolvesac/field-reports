// =====================================================
// GOOGLE APPS SCRIPT - Google Drive Integration  (v3.1)
// =====================================================
// Deploy this as a Web App in Google Apps Script
//
// SETUP STEPS:
// 1. Go to https://script.google.com -> open the "NW Drive Proxy" project
// 2. Paste ALL the code below into Code.gs (replace everything)
// 3. Deploy -> Manage deployments -> edit (pencil) -> Version: "New version" -> Deploy
//    (this keeps the same Web App URL the app already uses)
//
// v3.0: the office folder "F.JOBS" is the root. Every project is a folder in
// F.JOBS (folder description = the app's project id, or matched by name) with
// the F.JOBS template sub-folders (Application for Payment, COI, Contract,
// Drawings, Insurance Requirements, IOM & WARRANTY, Proposal, Purchase Orders,
// Quotes, RFI, Schedule, SHOP DRAWINGS, Submittals, Tax Exempt Certs + the app's
// Change Orders / Photos / Reports). The app shows the live folder tree
// (list_tree) so sub-folders look exactly like in Google Drive.
// =====================================================

var FJOBS_FOLDER_ID = '1ZT-eAsLR8-Sml95DnFRccfPksoab6kIW';   // F.JOBS in Google Drive (office root)
var LEGACY_ROOT_NAME = 'Northern Wolves Projects';           // old app root (v1/v2), read-only fallback
var TEMPLATE = ['Application for Payment', 'Change Orders', 'COI', 'Contract', 'Drawings', 'Insurance Requirements',
                'IOM & WARRANTY', 'Photos', 'Proposal', 'Purchase Orders', 'Quotes', 'Reports', 'RFI', 'Schedule',
                'SHOP DRAWINGS', 'Submittals', 'Tax Exempt Certs'];
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

// ---------- Drive API v3 (one HTTP call lists a whole level of folders) ----------
function driveApi(path, params) {
  var qs = Object.keys(params).map(function(k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
  var resp = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/' + path + '?' + qs,
    { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) throw new Error('Drive API ' + resp.getResponseCode() + ': ' + resp.getContentText().slice(0, 300));
  return JSON.parse(resp.getContentText());
}
var ITEM_FIELDS = 'nextPageToken,files(id,name,mimeType,size,modifiedTime,createdTime,parents,webViewLink,description)';
function listChildren(parentIds) {
  var out = [];
  for (var i = 0; i < parentIds.length; i += 30) {
    var chunk = parentIds.slice(i, i + 30);
    var q = '(' + chunk.map(function(id) { return "'" + id + "' in parents"; }).join(' or ') + ') and trashed = false';
    var token = '';
    do {
      var r = driveApi('files', { q: q, pageSize: 1000, fields: ITEM_FIELDS, pageToken: token, supportsAllDrives: true, includeItemsFromAllDrives: true });
      out = out.concat(r.files || []);
      token = r.nextPageToken || '';
    } while (token);
  }
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
  var rootId = pf.getId(), items = [], level = [rootId], depth = 0;
  while (level.length && depth < (maxDepth || 6)) {
    var kids = listChildren(level), next = [];
    kids.forEach(function(k) {
      items.push({ id: k.id, name: k.name, folder: isFolderItem(k), parent: (k.parents && k.parents[0]) || null,
                   size: Number(k.size || 0), modifiedTime: k.modifiedTime, mimeType: k.mimeType, url: k.webViewLink || ('https://drive.google.com/file/d/' + k.id + '/view') });
      if (isFolderItem(k)) next.push(k.id);
    });
    level = next; depth++;
  }
  return { success: true, folderId: rootId, folderUrl: pf.getUrl(), folderName: pf.getName(), items: items };
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

// ---------- Web App entry points ----------
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', service: 'NW Drive Proxy', version: '3.1' }))
    .setMimeType(ContentService.MimeType.JSON);
}
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.record || body.action === 'sendNotification') { if (typeof notificationsDoPost === 'function') return notificationsDoPost(e); }
    var result;
    switch (body.action) {
      case 'ping':            result = { success: true, version: '3.1', root: FJOBS_FOLDER_ID }; break;
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
      case 'forget':          result = forgetProject(body.projectId); break;
      case 'migrate_project': result = migrateProject(body.legacyFolderId, body.projectId, body.projectName, body.targetFolderId); break;
      default:                result = { success: false, error: 'Unknown action: ' + body.action };
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
