/* nw-drive.js — Google Drive as the main file store (via the "NW Drive Proxy" Apps Script)
   Files are registered in project_files with drive_id / drive_url; storage_path stays NULL for Drive files. */
var NW_DRIVE_URL = 'https://script.google.com/macros/s/AKfycbxPvr8QooEcdcxt937V49-Y_o9lz5-qQUQqjnaGr5mcabxOr9iZbkP3yxN9O2T09NoW/exec';
window.NWDrive = {
  request: async function(body) {
    var resp = await fetch(NW_DRIVE_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
    var j = await resp.json();
    if (j && j.success === false) throw new Error(j.error || 'Drive error');
    if (j && j.ok === false) throw new Error('Drive proxy is not deployed (' + (j.error || j.skipped || 'wrong script') + ')');
    return j;
  },
  toBase64: function(file) {
    return new Promise(function(res, rej) {
      var r = new FileReader();
      r.onload = function() { res(String(r.result).split(',')[1]); };
      r.onerror = function() { rej(r.error); };
      r.readAsDataURL(file);
    });
  },
  // upload a File/Blob into <project>/<category>[/<subfolder>] and return the Drive file info
  uploadFile: async function(projectName, projectId, file, category, subfolder, fileName) {
    var b64 = await NWDrive.toBase64(file);
    var j = await NWDrive.request({ action: 'upload_file', projectName: projectName, projectId: projectId, fileName: fileName || file.name,
      fileData: b64, mimeType: file.type || 'application/octet-stream', category: category || 'other', subfolder: subfolder || '' });
    return j.file;
  },
  deleteFile: function(fileId) { return NWDrive.request({ action: 'delete_file', fileId: fileId }); },
  listFiles: async function(projectName, projectId) { return (await NWDrive.request({ action: 'list_files', projectName: projectName, projectId: projectId })).files || []; },
  // row helper: columns for project_files
  rowFor: function(file, driveFile) {
    return { filename: file.name, storage_path: null, drive_id: driveFile.id, drive_url: driveFile.viewUrl || driveFile.url,
             size_bytes: file.size, content_type: file.type || driveFile.mimeType || null };
  },
  // open a project_files row (Drive first, Supabase Storage fallback)
  open: async function(f) {
    if (f.drive_url) { window.open(f.drive_url, '_blank'); return; }
    if (f.drive_id) { window.open('https://drive.google.com/file/d/' + f.drive_id + '/view', '_blank'); return; }
    var su = await supabaseClient.storage.from('project-files').createSignedUrl(f.storage_path, 3600);
    if (su.error) throw new Error(su.error.message);
    window.open(su.data.signedUrl, '_blank');
  },
  // remove the stored object behind a row (Drive and/or Storage)
  removeObject: async function(f) {
    if (f.drive_id) { try { await NWDrive.deleteFile(f.drive_id); } catch (e) { console.warn('drive delete', e); } }
    if (f.storage_path) { try { await supabaseClient.storage.from('project-files').remove([f.storage_path]); } catch (e) { console.warn('storage delete', e); } }
  }
};
