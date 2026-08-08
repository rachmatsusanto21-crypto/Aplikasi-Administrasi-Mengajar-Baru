export const DEFAULT_GAS_CODE = `/**
 * Google Apps Script - Web App Backend & Cloud Backup Drive untuk Aplikasi Administrasi Guru
 * 
 * ==========================================================================================
 * BAGAIMANA MENGATASI ERROR IZIN GOOGLE DRIVE ("DriveApp.getFoldersByName"):
 * 1. Buka editor Google Apps Script.
 * 2. Di toolbar atas, pilih fungsi "initPermissions" dari dropdown (di samping tombol Run/Jalankan).
 * 3. Klik tombol "Jalankan" (Run).
 * 4. Pop-up "Izin Diperlukan" akan muncul -> Klik "Tinjau Izin" (Review Permissions).
 * 5. Pilih Akun Google Anda -> Klik "Lanjutan" (Advanced) -> Klik "Buka Project (tidak aman)".
 * 6. Klik "Izinkan" (Allow).
 * 7. Setelah itu, klik "Terapkan" (Deploy) -> "Deployment Baru" -> Pilih Jenis "Web App" -> Akses: "Siapa saja" (Anyone) -> Deploy!
 * ==========================================================================================
 */

/**
 * FUNGSI UNTUK MENGAKTIFKAN OTORISASI DRIVEAPP & SPREADSHEETAPP
 * Jalankan fungsi ini sekali dari editor Google Apps Script dengan tombol 'Run'
 */
function initPermissions() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var folder = getBackupFolder();
  var ssFile = DriveApp.getFileById(ss.getId());
  try {
    ssFile.moveTo(folder);
  } catch(e) {}
  Logger.log("====================================");
  Logger.log("✅ OTORISASI GOOGLE DRIVE BERHASIL!");
  Logger.log("Nama Sheet: " + ss.getName());
  Logger.log("Folder Backup & Sync Drive: " + folder.getName() + " (ID: " + folder.getId() + ")");
  Logger.log("Link Folder: " + folder.getUrl());
  Logger.log("====================================");
}

function myFunction() {
  initPermissions();
}

/**
 * Mendapatkan atau membuat 1 folder utama khusus di Google Drive untuk Backup & Sync
 */
function getBackupFolder() {
  var folderName = "Folder_Backup_dan_Sync_Administrasi_Guru";
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderName);
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = e && e.parameter ? e.parameter.action : null;

    // 1. List backup files in 1 Google Drive Backup & Sync folder
    if (action === 'listBackups') {
      var folder = getBackupFolder();
      var files = folder.getFiles();
      var list = [];
      while (files.hasNext()) {
        var file = files.next();
        if (file.getName().indexOf('.json') !== -1) {
          list.push({
            id: file.getId(),
            filename: file.getName(),
            backupDate: file.getLastUpdated().toISOString(),
            sizeBytes: file.getSize(),
            sizeFormatted: Math.round(file.getSize() / 1024) + ' KB',
            downloadUrl: file.getDownloadUrl(),
            location: "Google Drive (" + folder.getName() + ")"
          });
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        folderName: folder.getName(),
        folderUrl: folder.getUrl(),
        backups: list
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Download specific backup content from Google Drive
    if (action === 'downloadBackup' && e.parameter.fileId) {
      var file = DriveApp.getFileById(e.parameter.fileId);
      var content = file.getBlob().getDataAsString();
      return ContentService.createTextOutput(content)
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Delete specific backup file(s) from Google Drive
    if (action === 'deleteBackup') {
      var fileId = e.parameter.fileId;
      var folder = getBackupFolder();
      if (fileId) {
        try {
          var file = DriveApp.getFileById(fileId);
          file.setTrashed(true);
          return ContentService.createTextOutput(JSON.stringify({
            status: "success",
            message: "File backup '" + file.getName() + "' berhasil dihapus dari Google Drive!"
          })).setMimeType(ContentService.MimeType.JSON);
        } catch (errDel) {
          return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            message: "Gagal menghapus file: " + errDel.toString()
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // 4. Status Check / Ping
    var checkFolder = getBackupFolder();
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      message: "Web App Administrasi Guru & Drive Backup Aktif dalam 1 Folder!",
      version: "3.0-drive-unified-folder",
      folderName: checkFolder.getName(),
      folderUrl: checkFolder.getUrl(),
      sheets: ss.getSheets().map(function(s) { return s.getName(); })
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (pErr) {
        payload = { rawContent: e.postData.contents };
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = (payload && payload.action) || (e && e.parameter && e.parameter.action);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var folder = getBackupFolder();

    // Move Active Spreadsheet into the 1 unified folder if not already inside
    try {
      var ssFile = DriveApp.getFileById(ss.getId());
      ssFile.moveTo(folder);
    } catch(eMove) {}

    // 1. Save Backup JSON to Google Drive Folder
    if (action === 'uploadBackup' || action === 'uploadCloud' || payload.targetType === 'gdrive' || payload.backupDate || payload.data) {
      var schoolName = payload.schoolName || (payload.data && payload.data.schoolIdentity ? payload.data.schoolIdentity.schoolName : "Sekolah");
      var cleanSchoolName = String(schoolName).replace(/[^a-zA-Z0-9]/g, "_");
      var dateStr = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
      var fileName = payload.filename || ("Backup_Administrasi_Guru_" + cleanSchoolName + "_" + dateStr + ".json");

      var dataToSave = payload.data || payload;
      var jsonString = typeof dataToSave === "string" ? dataToSave : JSON.stringify(dataToSave, null, 2);

      var file = folder.createFile(fileName, jsonString, MimeType.PLAIN_TEXT);

      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        message: "File backup '" + file.getName() + "' berhasil disimpan dalam 1 Folder Google Drive: " + folder.getName(),
        fileId: file.getId(),
        filename: file.getName(),
        folderName: folder.getName(),
        folderUrl: folder.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Sync all tables to Google Sheet tabs inside the 1 unified folder
    if (action === 'syncAll' && payload.data) {
      var allData = payload.data;

      Object.keys(allData).forEach(function(key) {
        var items = allData[key];
        if (Array.isArray(items) && items.length > 0) {
          var sheetName = getSheetTitle(key);
          var sheet = ss.getSheetByName(sheetName);
          if (!sheet) {
            sheet = ss.insertSheet(sheetName);
          }

          sheet.clearContents();
          var headers = Object.keys(items[0]);
          sheet.appendRow(headers);

          items.forEach(function(item) {
            var row = headers.map(function(h) {
              var val = item[h];
              if (typeof val === 'object') return JSON.stringify(val);
              return val !== undefined && val !== null ? val : "";
            });
            sheet.appendRow(row);
          });
        }
      });

      // Also create/update auto-snapshot in the same Google Drive folder
      try {
        var autoFileName = "AutoSync_Administrasi_Guru_" + new Date().toISOString().substring(0, 10) + ".json";
        var existingFiles = folder.getFilesByName(autoFileName);
        if (existingFiles.hasNext()) {
          var oldFile = existingFiles.next();
          oldFile.setContent(JSON.stringify(payload.data, null, 2));
        } else {
          folder.createFile(autoFileName, JSON.stringify(payload.data, null, 2), MimeType.PLAIN_TEXT);
        }
      } catch(eDrive) {}

      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        message: "Seluruh data modul & sheet berhasil disinkronkan ke dalam 1 Folder Google Drive ('" + folder.getName() + "')!",
        folderName: folder.getName(),
        folderUrl: folder.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Delete backup file(s) from Google Drive
    if (action === 'deleteBackup') {
      var fileIds = payload.fileIds || (payload.fileId ? [payload.fileId] : []);
      var deletedCount = 0;
      for (var i = 0; i < fileIds.length; i++) {
        if (fileIds[i]) {
          try {
            var fileToDelete = DriveApp.getFileById(fileIds[i]);
            fileToDelete.setTrashed(true);
            deletedCount++;
          } catch (eDel) {}
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: deletedCount + " file backup berhasil dihapus dari Google Drive!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. Create Google Doc file from HTML content inside the same 1 folder
    if (action === 'createGoogleDoc') {
      var docTitle = payload.title || "Dokumen_Administrasi_Guru";
      var htmlContent = payload.htmlContent || payload.content || "";
      var htmlBlob = Utilities.newBlob(htmlContent, 'text/html', docTitle + '.html');
      var docFile = folder.createFile(htmlBlob);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Dokumen berhasil disimpan di 1 Folder Google Drive: " + folder.getName(),
        fileId: docFile.getId(),
        docUrl: "https://docs.google.com/document/d/" + docFile.getId() + "/edit",
        driveUrl: docFile.getUrl(),
        folderName: folder.getName(),
        folderUrl: folder.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: "Aksi '" + action + "' tidak dikenali. Pastikan versi Apps Script sudah terbaru (Deploy Baru)." 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetTitle(key) {
  var titles = {
    'school_identity': 'Identitas Sekolah',
    'students': 'Data Siswa',
    'cptp_items': 'CP dan TP',
    'atp_items': 'ATP',
    'prota_allocations': 'Prota',
    'promes_allocations': 'Promes',
    'daily_teaching_logs': 'Jurnal Mengajar Harian',
    'grades': 'Nilai Rapor',
    'extracurriculars': 'Ekstrakurikuler',
    'p5_projects': 'Proyek P5',
    'attendance_records': 'Absensi Bulk',
    'agendas': 'Agenda'
  };
  return titles[key] || key;
}
`;
