export const DEFAULT_GAS_CODE = `/**
 * Google Apps Script - Web App Backend & Cloud Backup Drive untuk Aplikasi Administrasi Guru
 * 
 * FOLDER UTAMA GOOGLE DRIVE: "Administrasi Mengajar"
 * Seluruh data cadangan (backup JSON), sinkronisasi tabel Google Spreadsheet, 
 * dan dokumen administrasi tersimpan rapi dalam 1 folder khusus: "Administrasi Mengajar".
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

var PRIMARY_FOLDER_NAME = "Administrasi Mengajar";

/**
 * Menyimpan ID folder ke ScriptProperties dan UserProperties agar tidak pernah membuat folder ganda
 */
function saveBackupFolderId(folderId) {
  try {
    PropertiesService.getScriptProperties().setProperty("BACKUP_FOLDER_ID", folderId);
  } catch(e) {}
  try {
    PropertiesService.getUserProperties().setProperty("BACKUP_FOLDER_ID", folderId);
  } catch(e) {}
}

/**
 * Mengambil ID folder yang tersimpan sebelumnya
 */
function getSavedBackupFolderId() {
  var id = null;
  try {
    id = PropertiesService.getScriptProperties().getProperty("BACKUP_FOLDER_ID");
  } catch(e) {}
  if (!id) {
    try {
      id = PropertiesService.getUserProperties().getProperty("BACKUP_FOLDER_ID");
    } catch(e) {}
  }
  return id;
}

/**
 * Mendapatkan SATU folder khusus di Google Drive dengan nama "Administrasi Mengajar".
 * Aturan ketat:
 * 1. Jika folder sudah ada, SELALU gunakan folder yang ada (TIDAK PERNAH membuat folder baru).
 * 2. Jika ada folder lama (misal "Folder_Backup_dan_Sync_Administrasi_Guru"), ganti namanya jadi "Administrasi Mengajar" dan pakai kembali.
 * 3. Hanya buat folder baru jika benar-benar belum pernah ada folder "Administrasi Mengajar" di seluruh Drive.
 */
function getBackupFolder(optionalFolderId) {
  // 1. Jika ID Folder diberikan eksplisit
  if (optionalFolderId) {
    try {
      var fById = DriveApp.getFolderById(String(optionalFolderId).trim());
      if (fById && !fById.isTrashed()) {
        saveBackupFolderId(fById.getId());
        return fById;
      }
    } catch(eId) {}
  }

  // 2. Cek ID folder yang sudah tersimpan di Properties
  var savedId = getSavedBackupFolderId();
  if (savedId) {
    try {
      var savedFolder = DriveApp.getFolderById(savedId);
      if (savedFolder && !savedFolder.isTrashed()) {
        if (savedFolder.getName() !== PRIMARY_FOLDER_NAME) {
          try { savedFolder.setName(PRIMARY_FOLDER_NAME); } catch(eRename) {}
        }
        return savedFolder;
      }
    } catch(eSaved) {}
  }

  // 3. Cek apakah Spreadsheet aktif sudah berada di dalam folder "Administrasi Mengajar"
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ssFile = DriveApp.getFileById(ss.getId());
    var parents = ssFile.getParents();
    while (parents.hasNext()) {
      var parent = parents.next();
      if (parent.getId() !== DriveApp.getRootFolder().getId()) {
        if (parent.getName() === PRIMARY_FOLDER_NAME && !parent.isTrashed()) {
          saveBackupFolderId(parent.getId());
          return parent;
        }
      }
    }
  } catch(eParent) {}

  // 4. Cari folder yang sudah ada dengan nama "Administrasi Mengajar" (gunakan yang pertama, JANGAN buat baru)
  try {
    var existingFolders = DriveApp.getFoldersByName(PRIMARY_FOLDER_NAME);
    while (existingFolders.hasNext()) {
      var existing = existingFolders.next();
      if (!existing.isTrashed()) {
        saveBackupFolderId(existing.getId());
        return existing;
      }
    }
  } catch(eSearch) {}

  // 5. Cek folder nama lama, jika ada langsung ubah namanya jadi "Administrasi Mengajar" agar data lama tidak hilang
  var legacyNames = [
    "Folder_Backup_dan_Sync_Administrasi_Guru",
    "Backup_Administrasi_Guru",
    "Backup Administrasi Guru",
    "Administrasi_Guru_Backup"
  ];
  for (var i = 0; i < legacyNames.length; i++) {
    try {
      var legacyFolders = DriveApp.getFoldersByName(legacyNames[i]);
      while (legacyFolders.hasNext()) {
        var legacy = legacyFolders.next();
        if (!legacy.isTrashed()) {
          try { legacy.setName(PRIMARY_FOLDER_NAME); } catch(eRen) {}
          saveBackupFolderId(legacy.getId());
          return legacy;
        }
      }
    } catch(eLeg) {}
  }

  // 6. HANYA JIKA BENAR-BENAR BELUM ADA SATU PUN FOLDER, buat 1 folder dan simpan ID-nya permanen
  var newFolder = DriveApp.createFolder(PRIMARY_FOLDER_NAME);
  saveBackupFolderId(newFolder.getId());
  return newFolder;
}

/**
 * FUNGSI PEMBERSIH & KONSOLIDASI (Merapikan jika sebelumnya ada folder duplikat)
 * Mengumpulkan semua file ke dalam 1 folder utama "Administrasi Mengajar" dan menghapus folder duplikat kosong
 */
function cleanupDuplicateFolders() {
  var mainFolder = getBackupFolder();
  var mainFolderId = mainFolder.getId();
  var consolidatedFiles = 0;
  var removedFolders = 0;

  var namesToCheck = [
    PRIMARY_FOLDER_NAME,
    "Folder_Backup_dan_Sync_Administrasi_Guru",
    "Backup_Administrasi_Guru",
    "Backup Administrasi Guru"
  ];

  for (var i = 0; i < namesToCheck.length; i++) {
    try {
      var folders = DriveApp.getFoldersByName(namesToCheck[i]);
      while (folders.hasNext()) {
        var f = folders.next();
        if (f.getId() !== mainFolderId && !f.isTrashed()) {
          // Pindahkan file ke folder utama
          var files = f.getFiles();
          while (files.hasNext()) {
            var file = files.next();
            try {
              file.moveTo(mainFolder);
              consolidatedFiles++;
            } catch(eMove) {}
          }
          // Hapus folder duplikat
          try {
            f.setTrashed(true);
            removedFolders++;
          } catch(eTrash) {}
        }
      }
    } catch(eDup) {}
  }

  Logger.log("✅ Pembersihan selesai! Dipindahkan: " + consolidatedFiles + " file. Folder duplikat dihapus: " + removedFolders);
  return { consolidatedFiles: consolidatedFiles, removedFolders: removedFolders, mainFolderUrl: mainFolder.getUrl() };
}

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
  Logger.log("Folder Tunggal Administrasi: " + folder.getName() + " (ID: " + folder.getId() + ")");
  Logger.log("Link Folder di Google Drive: " + folder.getUrl());
  Logger.log("====================================");
}

function myFunction() {
  initPermissions();
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = e && e.parameter ? e.parameter.action : null;
    var folderId = e && e.parameter ? e.parameter.folderId : null;

    // 1. List backup files in the 1 unified "Administrasi Mengajar" Google Drive folder
    if (action === 'listBackups') {
      var folder = getBackupFolder(folderId);
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
        folderId: folder.getId(),
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
      var delFileId = e.parameter.fileId;
      if (delFileId) {
        try {
          var delFile = DriveApp.getFileById(delFileId);
          delFile.setTrashed(true);
          return ContentService.createTextOutput(JSON.stringify({
            status: "success",
            message: "File backup '" + delFile.getName() + "' berhasil dihapus dari folder Google Drive!"
          })).setMimeType(ContentService.MimeType.JSON);
        } catch (errDel) {
          return ContentService.createTextOutput(JSON.stringify({
            status: "error",
            message: "Gagal menghapus file: " + errDel.toString()
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // 4. Bersihkan duplikat folder Google Drive yang sempat terbuat sebelumnya
    if (action === 'cleanupDuplicates') {
      var resCleanup = cleanupDuplicateFolders();
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Berhasil membersihkan duplikat folder! Seluruh berkas kini rapi di 1 folder 'Administrasi Mengajar'.",
        details: resCleanup
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5. Status Check / Ping
    var checkFolder = getBackupFolder(folderId);
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      message: "Web App Administrasi Guru Aktif dalam 1 Folder Google Drive ('" + checkFolder.getName() + "')!",
      version: "4.0-administrasi-mengajar",
      folderName: checkFolder.getName(),
      folderUrl: checkFolder.getUrl(),
      folderId: checkFolder.getId(),
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
    var explicitFolderId = (payload && (payload.folderId || payload.driveFolderId)) || (e && e.parameter && e.parameter.folderId);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var folder = getBackupFolder(explicitFolderId);

    // Pastikan Spreadsheet aktif berada di dalam folder "Administrasi Mengajar"
    try {
      var ssFile = DriveApp.getFileById(ss.getId());
      ssFile.moveTo(folder);
    } catch(eMove) {}

    // 1. Simpan File Backup JSON ke dalam 1 Folder "Administrasi Mengajar"
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
        message: "File backup '" + file.getName() + "' tersimpan di folder Google Drive: " + folder.getName(),
        fileId: file.getId(),
        filename: file.getName(),
        folderName: folder.getName(),
        folderUrl: folder.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Sinkronkan semua tabel sheet ke Google Spreadsheet di dalam folder "Administrasi Mengajar"
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

      // Update file auto-sync snapshot di dalam folder "Administrasi Mengajar"
      try {
        var autoFileName = "AutoSync_Administrasi_Guru_Latest.json";
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
        message: "Seluruh data modul & sheet berhasil disinkronkan ke dalam folder Google Drive: " + folder.getName(),
        folderName: folder.getName(),
        folderUrl: folder.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Hapus file backup dari folder Google Drive
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
        message: deletedCount + " file backup berhasil dihapus dari folder Google Drive!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. Bersihkan duplikat folder Google Drive
    if (action === 'cleanupDuplicates') {
      var cleanupResult = cleanupDuplicateFolders();
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Pembersihan duplikat folder selesai!",
        details: cleanupResult
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5. Buat file Google Doc dari konten HTML di dalam folder "Administrasi Mengajar"
    if (action === 'createGoogleDoc') {
      var docTitle = payload.title || "Dokumen_Administrasi_Guru";
      var htmlContent = payload.htmlContent || payload.content || "";
      var htmlBlob = Utilities.newBlob(htmlContent, 'text/html', docTitle + '.html');
      var docFile = folder.createFile(htmlBlob);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Dokumen berhasil disimpan di folder Google Drive: " + folder.getName(),
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
