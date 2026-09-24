// =====================================================
// GOOGLE APPS SCRIPT — Google Drive Integration  (v2.0)
// =====================================================
// Deploy this as a Web App in Google Apps Script
//
// SETUP STEPS:
// 1. Go to https://script.google.com → open the "NW Drive Proxy" project
//    (or New Project and name it "NW Drive Proxy")
// 2. Paste ALL the code below into Code.gs (replace everything)
// 3. Deploy → Manage deployments → ✎ (edit) → Version: "New version" → Deploy
//    (this keeps the same Web App URL the app already uses)
//    — or Deploy → New deployment → Web app, Execute as: Me,
//      Who has access: Anyone → copy the new URL and give it to Claude.
//
// FIRST TIME: the script auto-creates a root folder
// "Northern Wolves Projects" in Google Drive. Every project gets its own
// folder (folder description = the app's project id) with category
// subfolders. All project documents live there.
//
// v2.0 changes: documents are private by default (only photos/reports are
// link-viewable so the app can preview them), files can be placed in a
// subfolder inside a category (e.g. Change Orders / 001), the script can
// fetch a file from a URL server-side (upload_from_url), and list_files
// also returns files from those subfolders.
// =====================================================

var ROOT_FOLDER_NAME = 'Northern Wolves Projects';
var CATEGORIES = ['Contracts', 'Change Orders', 'Submittals', 'Drawings', 'Invoices', 'Photos', 'Reports', 'Other'];
// categories whose files stay link-viewable (the app shows inline previews of photos)
var SHARED_CATEGORIES = ['photos', 'reports'];

function getRootFolder() {
  var folders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(ROOT_FOLDER_NAME);
}

function findProjectFolder(projectId) {
  var root = getRootFolder();
  var folders = root.getFolders();
  while (folders.hasNext()) {
    var f = folders.next();
    if (f.getDescription() === projectId) return f;
  }
  return null;
}

function getProjectFolder(projectName, projectId) {
  var existing = findProjectFolder(projectId);
  if (existing) return existing;
  var root = getRootFolder();
  var projectFolder = root.createFolder(projectName || projectId);
  projectFolder.setDescription(projectId);
  for (var i = 0; i < CATEGORIES.length; i++) projectFolder.createFolder(CATEGORIES[i]);
  return projectFolder;
}

function categoryFolderName(category) {
  var c = (category || 'other').toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ');
  var map = { 'change orders': 'Change Orders', 'contracts': 'Contracts', 'submittals': 'Submittals', 'drawings': 'Drawings',
              'invoices': 'Invoices', 'photos': 'Photos', 'reports': 'Reports', 'other': 'Other' };
  if (map[c]) return map[c];
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function getOrCreateChild(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

function getCategoryFolder(projectFolder, category, subfolder) {
  var folder = getOrCreateChild(projectFolder, categoryFolderName(category));
  if (subfolder) folder = getOrCreateChild(folder, String(subfolder).replace(/[\/\\]/g, '-'));
  return folder;
}

function fileInfo(file, category, subfolder) {
  return {
    id: file.getId(),
    name: file.getName(),
    category: (category || 'other').toLowerCase(),
    subfolder: subfolder || '',
    size: file.getSize(),
    mimeType: file.getMimeType(),
    createdAt: file.getDateCreated().toISOString(),
    url: file.getUrl(),
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.getId(),
    viewUrl: file.getUrl(),
    directUrl: 'https://lh3.googleusercontent.com/d/' + file.getId()
  };
}

// ─── List files of a project: category folders + one level of subfolders + loose files ───
function listProjectFiles(projectName, projectId) {
  var projectFolder = findProjectFolder(projectId);
  if (!projectFolder) return { success: true, files: [] };
  var all = [];
  var subs = projectFolder.getFolders();
  while (subs.hasNext()) {
    var cat = subs.next(); var catName = cat.getName().toLowerCase();
    var files = cat.getFiles();
    while (files.hasNext()) all.push(fileInfo(files.next(), catName, ''));
    var deeper = cat.getFolders();
    while (deeper.hasNext()) {
      var d = deeper.next(); var df = d.getFiles();
      while (df.hasNext()) all.push(fileInfo(df.next(), catName, d.getName()));
    }
  }
  var loose = projectFolder.getFiles();
  while (loose.hasNext()) all.push(fileInfo(loose.next(), 'other', ''));
  all.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  return { success: true, files: all };
}

function storeBlob(projectName, projectId, blob, category, subfolder, share) {
  var projectFolder = getProjectFolder(projectName, projectId);
  var folder = getCategoryFolder(projectFolder, category, subfolder);
  var file = folder.createFile(blob);
  var cat = (category || 'other').toLowerCase();
  var makeShared = (share === true) || (share === undefined && SHARED_CATEGORIES.indexOf(cat) >= 0);
  if (makeShared) file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { success: true, file: fileInfo(file, cat, subfolder), folderId: folder.getId() };
}

// ─── Upload a base64 file ───
function uploadFile(projectName, projectId, fileName, base64Data, mimeType, category, subfolder, share) {
  var decoded = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(decoded, mimeType || 'application/octet-stream', fileName);
  return storeBlob(projectName, projectId, blob, category, subfolder, share);
}

// ─── Fetch a file from a URL server-side and store it (URL must be reachable without login) ───
function uploadFromUrl(projectName, projectId, fileName, url, mimeType, category, subfolder, share) {
  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (resp.getResponseCode() !== 200) return { success: false, error: 'fetch ' + resp.getResponseCode() };
  var blob = resp.getBlob();
  if (mimeType) blob.setContentType(mimeType);
  blob.setName(fileName);
  return storeBlob(projectName, projectId, blob, category, subfolder, share);
}

function deleteFile(fileId) {
  try { DriveApp.getFileById(fileId).setTrashed(true); return { success: true }; }
  catch (e) { return { success: false, error: e.message }; }
}

function getFile(fileId) {
  try { var f = DriveApp.getFileById(fileId); return { success: true, file: fileInfo(f, '', '') }; }
  catch (e) { return { success: false, error: e.message }; }
}

function renameProjectFolder(projectId, newName) {
  var f = findProjectFolder(projectId);
  if (!f) return { success: false, error: 'Project folder not found' };
  f.setName(newName); return { success: true };
}

function deleteProjectFolder(projectId) {
  var f = findProjectFolder(projectId);
  if (!f) return { success: false, error: 'Project folder not found' };
  f.setTrashed(true); return { success: true };
}

// ─── Web App entry points ───
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', service: 'NW Drive Proxy', version: '2.0' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var result;
    switch (body.action) {
      case 'ping':           result = { success: true, version: '2.0' }; break;
      case 'list_files':     result = listProjectFiles(body.projectName, body.projectId); break;
      case 'upload_file':    result = uploadFile(body.projectName, body.projectId, body.fileName, body.fileData, body.mimeType, body.category, body.subfolder, body.share); break;
      case 'upload_from_url':result = uploadFromUrl(body.projectName, body.projectId, body.fileName, body.url, body.mimeType, body.category, body.subfolder, body.share); break;
      case 'delete_file':    result = deleteFile(body.fileId); break;
      case 'get_file':       result = getFile(body.fileId); break;
      case 'rename_project': result = renameProjectFolder(body.projectId, body.newName); break;
      case 'delete_project': result = deleteProjectFolder(body.projectId); break;
      case 'create_project': var folder = getProjectFolder(body.projectName, body.projectId); result = { success: true, folderId: folder.getId() }; break;
      default:               result = { success: false, error: 'Unknown action: ' + body.action };
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
