import * as XLSX from "xlsx";
import { Student, AttendanceRecord, AttendanceStatus, SchoolIdentity } from "../types";
import { applyPageSetup } from "./exportExcel";

function autoWidth(worksheet: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  const cols: { wch: number }[] = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxLen = 10;
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && cell.v) {
        const str = String(cell.v);
        if (str.length > maxLen) {
          maxLen = Math.min(str.length, 45);
        }
      }
    }
    cols.push({ wch: Math.max(maxLen + 2, 5) });
  }
  worksheet["!cols"] = cols;
}

function saveWorkbook(wb: XLSX.WorkBook, filename: string) {
  const cleanBase = filename.replace(/\.(xlsx|xls|csv)$/i, "");
  XLSX.writeFile(wb, `${cleanBase}.xlsx`, { bookType: "xlsx", type: "binary" });
}

export interface ParseAttendanceResult {
  records: AttendanceRecord[];
  summary: {
    totalParsedRows: number;
    matchedStudentsCount: number;
    unmatchedRowsCount: number;
    datesFound: string[];
    statusCounts: { H: number; S: number; I: number; A: number };
    monthStr?: string;
    sourceType: "matrix_monthly" | "semester_recap" | "detail_log";
  };
  warnings: string[];
}

/**
 * =========================================================================
 * 1. TEMPLATE & EXPORT: REKAP PRESENSI MATRIKS BULANAN (TANGGAL 1 - 31)
 * =========================================================================
 */
export function downloadMonthlyMatrixTemplate(
  students: Student[],
  monthStr: string, // format "YYYY-MM" e.g. "2025-07"
  schoolIdentity?: Partial<SchoolIdentity>,
  currentRecords: AttendanceRecord[] = []
) {
  const [yearStr, mStr] = (monthStr || "2025-07").split("-");
  const year = parseInt(yearStr || "2025", 10);
  const month = parseInt(mStr || "7", 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const monthLabel = `${monthNames[month - 1] || "Bulan"} ${year}`;

  const rows: any[] = [];

  // Metadata Headers
  rows.push(["TEMPLATE REKAPITULASI PRESENSI SISWA - MATRIKS BULANAN"]);
  rows.push([`Bulan / Tahun: ${monthLabel} (${monthStr})`]);
  rows.push([`Nama Sekolah: ${schoolIdentity?.schoolName || "SD Negeri 1 Merdeka"}`]);
  rows.push([`Kelas / Fase: ${schoolIdentity?.gradeClass || "Kelas IV"} (${schoolIdentity?.phase || "Fase B"}) | Semester: ${schoolIdentity?.semester || "Semester Ganjil"}`]);
  rows.push([`Guru Kelas: ${schoolIdentity?.teacherName || "Guru Pengampu"}`]);
  rows.push([]); // Empty row before table header

  // Table Column Headers
  const headerRow: string[] = ["No", "NISN", "NIS", "Nama Lengkap Siswa"];
  for (let d = 1; d <= 31; d++) {
    headerRow.push(d <= daysInMonth ? `Tgl ${d}` : `Tgl ${d} (N/A)`);
  }
  headerRow.push("Hadir (H)", "Sakit (S)", "Izin (I)", "Alpa (A)", "% Kehadiran");
  rows.push(headerRow);

  // Table Data Rows
  const studentList = students.length > 0 ? students : [
    { id: "sample_1", nis: "1001", nisn: "0123456781", name: "Ahmad Fauzi", gender: "L" as const },
    { id: "sample_2", nis: "1002", nisn: "0123456782", name: "Siti Nurhaliza", gender: "P" as const },
    { id: "sample_3", nis: "1003", nisn: "0123456783", name: "Budi Santoso", gender: "L" as const },
  ];

  studentList.forEach((s, idx) => {
    const row: any[] = [idx + 1, s.nisn || "-", s.nis || "-", s.name];

    let countH = 0;
    let countS = 0;
    let countI = 0;
    let countA = 0;

    for (let d = 1; d <= 31; d++) {
      if (d > daysInMonth) {
        row.push("-");
        continue;
      }
      const dayPad = d < 10 ? `0${d}` : `${d}`;
      const dateKey = `${monthStr}-${dayPad}`;
      const rec = currentRecords.find((r) => r.studentId === s.id && r.date === dateKey);

      if (rec) {
        row.push(rec.status);
        if (rec.status === "H") countH++;
        if (rec.status === "S") countS++;
        if (rec.status === "I") countI++;
        if (rec.status === "A") countA++;
      } else {
        // Default present or empty
        row.push("H");
        countH++;
      }
    }

    const totalDays = countH + countS + countI + countA;
    const percentage = totalDays > 0 ? `${Math.round((countH / totalDays) * 100)}%` : "100%";

    row.push(countH, countS, countI, countA, percentage);
    rows.push(row);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  autoWidth(worksheet);
  applyPageSetup(worksheet, undefined, "landscape");

  // Sheet 2: Petunjuk Pengisian
  const guideRows = [
    ["PANDUAN PENGISIAN TEMPLATE MATRIKS PRESENSI BULANAN"],
    [""],
    ["1. KODE STATUS KEHADIRAN:"],
    ["   - H = Hadir"],
    ["   - S = Sakit (Bisa diisi keterangan di log jika ada)"],
    ["   - I = Izin"],
    ["   - A = Alpa / Tanpa Keterangan"],
    ["   - - = Tanggal Libur / Tidak ada KBM / Tanggal di luar hari dalam bulan"],
    [""],
    ["2. PENCOCOKAN SISWA:"],
    ["   - Aplikasi akan otomatis mencocokkan data siswa berdasarkan NISN, NIS, atau Nama Lengkap Siswa."],
    ["   - Jangan mengubah format judul kolom Tgl 1 s.d. Tgl 31 agar data dapat terbaca dengan presisi."],
    [""],
    ["3. PENGGUNAAN DI GOOGLE SHEETS:"],
    ["   - File template .xlsx ini dapat langsung diunggah ke Google Drive dan dibuka via Google Sheets."],
    ["   - Setelah selesai diedit di Google Sheets, pilih 'File > Download > Microsoft Excel (.xlsx)' lalu unggah kembali ke aplikasi Administrasi Guru."],
  ];
  const guideSheet = XLSX.utils.aoa_to_sheet(guideRows);
  autoWidth(guideSheet);
  applyPageSetup(guideSheet);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Matriks_${monthNames[month - 1] || "Bulan"}`);
  XLSX.utils.book_append_sheet(workbook, guideSheet, "Petunjuk_Pengisian");

  const school = schoolIdentity?.schoolName ? `${schoolIdentity.schoolName.replace(/\s+/g, "_")}_` : "";
  saveWorkbook(workbook, `Template_Matriks_Absensi_${school}${monthLabel.replace(/\s+/g, "_")}.xlsx`);
}

/**
 * =========================================================================
 * 2. TEMPLATE & EXPORT: REKAP SEMESTER & LOG DETAIL
 * =========================================================================
 */
export function downloadSemesterRecapTemplate(
  students: Student[],
  semester: "Semester Ganjil" | "Semester Genap" | string = "Semester Ganjil",
  schoolIdentity?: Partial<SchoolIdentity>,
  currentRecords: AttendanceRecord[] = []
) {
  const isGanjil = semester.toLowerCase().includes("ganjil") || semester === "1";
  const months = isGanjil
    ? [
        { code: "07", name: "Juli" },
        { code: "08", name: "Agustus" },
        { code: "09", name: "September" },
        { code: "10", name: "Oktober" },
        { code: "11", name: "November" },
        { code: "12", name: "Desember" },
      ]
    : [
        { code: "01", name: "Januari" },
        { code: "02", name: "Februari" },
        { code: "03", name: "Maret" },
        { code: "04", name: "April" },
        { code: "05", name: "Mei" },
        { code: "06", name: "Juni" },
      ];

  const studentList = students.length > 0 ? students : [
    { id: "sample_1", nis: "1001", nisn: "0123456781", name: "Ahmad Fauzi", gender: "L" as const },
    { id: "sample_2", nis: "1002", nisn: "0123456782", name: "Siti Nurhaliza", gender: "P" as const },
    { id: "sample_3", nis: "1003", nisn: "0123456783", name: "Budi Santoso", gender: "L" as const },
  ];

  // Sheet 1: Rekap_Semester
  const semRows: any[] = [];
  semRows.push(["TEMPLATE REKAPITULASI PRESENSI PER SEMESTER"]);
  semRows.push([`Semester: ${semester} | Tahun Ajaran: ${schoolIdentity?.academicYear || "2025/2026"}`]);
  semRows.push([`Nama Sekolah: ${schoolIdentity?.schoolName || "SD Negeri 1 Merdeka"} | Kelas: ${schoolIdentity?.gradeClass || "Kelas IV"}`]);
  semRows.push([`Guru Kelas: ${schoolIdentity?.teacherName || "Guru Pengampu"}`]);
  semRows.push([]);

  // Column headers
  const semHeader: string[] = ["No", "NISN", "NIS", "Nama Lengkap Siswa"];
  months.forEach((m) => {
    semHeader.push(`${m.name} (H)`, `${m.name} (S)`, `${m.name} (I)`, `${m.name} (A)`);
  });
  semHeader.push("Total Hadir (H)", "Total Sakit (S)", "Total Izin (I)", "Total Alpa (A)", "% Kehadiran");
  semRows.push(semHeader);

  studentList.forEach((s, idx) => {
    const row: any[] = [idx + 1, s.nisn || "-", s.nis || "-", s.name];

    let totalH = 0, totalS = 0, totalI = 0, totalA = 0;

    months.forEach((m) => {
      const monthRecs = currentRecords.filter((r) => {
        if (r.studentId !== s.id) return false;
        const parts = (r.date || "").split("-");
        return parts[1] === m.code;
      });

      const h = monthRecs.filter((r) => r.status === "H").length;
      const sCount = monthRecs.filter((r) => r.status === "S").length;
      const iCount = monthRecs.filter((r) => r.status === "I").length;
      const a = monthRecs.filter((r) => r.status === "A").length;

      row.push(h, sCount, iCount, a);
      totalH += h;
      totalS += sCount;
      totalI += iCount;
      totalA += a;
    });

    const grandTotal = totalH + totalS + totalI + totalA;
    const percentage = grandTotal > 0 ? `${Math.round((totalH / grandTotal) * 100)}%` : "100%";

    row.push(totalH, totalS, totalI, totalA, percentage);
    semRows.push(row);
  });

  const semSheet = XLSX.utils.aoa_to_sheet(semRows);
  autoWidth(semSheet);
  applyPageSetup(semSheet, undefined, "landscape");

  // Sheet 2: Log_Presensi_Detail
  const logRows: any[] = [];
  logRows.push(["No", "Tanggal (YYYY-MM-DD)", "NISN", "NIS", "Nama Lengkap Siswa", "Status (H/S/I/A)", "Keterangan / Alasan"]);

  let logIdx = 1;
  currentRecords.forEach((r) => {
    const student = studentList.find((s) => s.id === r.studentId);
    if (student) {
      logRows.push([
        logIdx++,
        r.date,
        student.nisn || "-",
        student.nis || "-",
        student.name,
        r.status,
        r.reason || "",
      ]);
    }
  });

  // If no current records, add samples
  if (logRows.length === 1) {
    const sampleDate = `${isGanjil ? "2025-07-15" : "2026-01-12"}`;
    logRows.push([1, sampleDate, studentList[0]?.nisn || "0123456781", studentList[0]?.nis || "1001", studentList[0]?.name || "Ahmad Fauzi", "H", ""]);
    logRows.push([2, sampleDate, studentList[1]?.nisn || "0123456782", studentList[1]?.nis || "1002", studentList[1]?.name || "Siti Nurhaliza", "S", "Demam tinggi"]);
    logRows.push([3, sampleDate, studentList[2]?.nisn || "0123456783", studentList[2]?.nis || "1003", studentList[2]?.name || "Budi Santoso", "I", "Acara keluarga"]);
  }

  const logSheet = XLSX.utils.aoa_to_sheet(logRows);
  autoWidth(logSheet);
  applyPageSetup(logSheet);

  // Sheet 3: Petunjuk_Pengisian
  const guideRows = [
    ["PANDUAN PENGISIAN REKAP PRESENSI SEMESTER & LOG DETAIL"],
    [""],
    ["1. DUA CARA IMPORT:"],
    ["   a. Sheet 'Log_Presensi_Detail': Sangat direkomendasikan untuk memasukkan riwayat harian siswa dengan presisi."],
    ["   b. Sheet 'Rekap_Semester': Digunakan untuk mengisi ringkasan total H, S, I, A per bulan."],
    [""],
    ["2. FORMAT TANGGAL:"],
    ["   Gunakan format standar YYYY-MM-DD (contoh: 2025-07-21) atau format tanggal standar Excel."],
    [""],
    ["3. EDITING DI GOOGLE SHEETS:"],
    ["   Unggah file ini ke Google Drive, buka dengan Google Sheets, isi data presensi, lalu Unduh sebagai .xlsx untuk diunggah kembali ke aplikasi Administrasi Guru."],
  ];
  const guideSheet = XLSX.utils.aoa_to_sheet(guideRows);
  autoWidth(guideSheet);
  applyPageSetup(guideSheet);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, semSheet, "Rekap_Semester");
  XLSX.utils.book_append_sheet(workbook, logSheet, "Log_Presensi_Detail");
  XLSX.utils.book_append_sheet(workbook, guideSheet, "Petunjuk_Pengisian");

  const semLabel = isGanjil ? "Semester_Ganjil" : "Semester_Genap";
  saveWorkbook(workbook, `Template_Rekap_Presensi_${semLabel}_${schoolIdentity?.gradeClass || "Kelas"}.xlsx`);
}

/**
 * =========================================================================
 * 3. TEMPLATE & EXPORT: LOG PRESENSI HARIAN
 * =========================================================================
 */
export function downloadDailyLogTemplate(
  students: Student[],
  schoolIdentity?: Partial<SchoolIdentity>,
  currentRecords: AttendanceRecord[] = []
) {
  const rows: any[] = [];
  rows.push(["TEMPLATE LOG PRESENSI HARIAN SISWA"]);
  rows.push([`Sekolah: ${schoolIdentity?.schoolName || "SD Negeri 1 Merdeka"} | Kelas: ${schoolIdentity?.gradeClass || "Kelas IV"}`]);
  rows.push([]);
  rows.push(["No", "Tanggal (YYYY-MM-DD)", "NISN", "NIS", "Nama Lengkap Siswa", "Status (H/S/I/A)", "Keterangan / Alasan"]);

  const studentList = students.length > 0 ? students : [
    { id: "sample_1", nis: "1001", nisn: "0123456781", name: "Ahmad Fauzi", gender: "L" as const },
    { id: "sample_2", nis: "1002", nisn: "0123456782", name: "Siti Nurhaliza", gender: "P" as const },
  ];

  if (currentRecords.length > 0) {
    currentRecords.forEach((r, idx) => {
      const student = studentList.find((s) => s.id === r.studentId);
      rows.push([
        idx + 1,
        r.date,
        student?.nisn || "-",
        student?.nis || "-",
        student?.name || `ID ${r.studentId}`,
        r.status,
        r.reason || "",
      ]);
    });
  } else {
    const today = new Date().toISOString().split("T")[0];
    studentList.forEach((s, idx) => {
      rows.push([idx + 1, today, s.nisn || "-", s.nis || "-", s.name, "H", ""]);
    });
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  autoWidth(worksheet);
  applyPageSetup(worksheet);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Log_Presensi");
  saveWorkbook(workbook, `Template_Log_Presensi_${schoolIdentity?.gradeClass || "Kelas"}.xlsx`);
}

/**
 * =========================================================================
 * HELPER: CLEAN / STANDARDIZE STUDENT FINDER
 * =========================================================================
 */
function findStudent(
  students: Student[],
  rawNisn?: string,
  rawNis?: string,
  rawName?: string
): Student | undefined {
  const cleanNisn = (rawNisn || "").toString().trim().replace(/[^0-9]/g, "");
  const cleanNis = (rawNis || "").toString().trim().toLowerCase();
  const cleanName = (rawName || "").toString().trim().toLowerCase();

  // 1. Match by NISN if valid
  if (cleanNisn.length >= 4) {
    const byNisn = students.find((s) => s.nisn && s.nisn.toString().trim().replace(/[^0-9]/g, "") === cleanNisn);
    if (byNisn) return byNisn;
  }

  // 2. Match by NIS
  if (cleanNis && cleanNis !== "-" && cleanNis !== "") {
    const byNis = students.find((s) => s.nis && s.nis.toString().trim().toLowerCase() === cleanNis);
    if (byNis) return byNis;
  }

  // 3. Match by exact Name
  if (cleanName && cleanName !== "-" && cleanName !== "") {
    const byExactName = students.find((s) => s.name.trim().toLowerCase() === cleanName);
    if (byExactName) return byExactName;

    // 4. Fuzzy match name
    const byFuzzy = students.find((s) => {
      const sName = s.name.trim().toLowerCase();
      return sName.includes(cleanName) || cleanName.includes(sName);
    });
    if (byFuzzy) return byFuzzy;
  }

  return undefined;
}

function normalizeStatus(val: any): { status: AttendanceStatus; reason?: string } | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim().toUpperCase();
  if (!str || str === "-" || str === "/" || str === "N/A") return null;

  if (str.startsWith("H") || str === "HADIR" || str === "1" || str === "V") {
    return { status: "H" };
  }
  if (str.startsWith("S") || str.includes("SAKIT")) {
    const match = str.match(/\((.*?)\)/);
    return { status: "S", reason: match ? match[1] : "" };
  }
  if (str.startsWith("I") || str.includes("IZIN") || str.includes("IJIN")) {
    const match = str.match(/\((.*?)\)/);
    return { status: "I", reason: match ? match[1] : "" };
  }
  if (str.startsWith("A") || str.includes("ALPA") || str.includes("ALPHA") || str.includes("TK")) {
    const match = str.match(/\((.*?)\)/);
    return { status: "A", reason: match ? match[1] : "" };
  }

  return { status: "H" };
}

function parseExcelDate(rawDate: any): string {
  if (!rawDate) return new Date().toISOString().split("T")[0];

  if (typeof rawDate === "number") {
    // Excel serial date to JS Date
    const jsDate = new Date((rawDate - (25567 + 2)) * 86400 * 1000);
    if (!isNaN(jsDate.getTime())) {
      return jsDate.toISOString().split("T")[0];
    }
  }

  const str = String(rawDate).trim();

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // If DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, "0");
    const m = dmyMatch[2].padStart(2, "0");
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Fallback try parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return new Date().toISOString().split("T")[0];
}

/**
 * =========================================================================
 * 4. PARSER: UNGGAH / IMPORT REKAP MATRIKS BULANAN (.xlsx, .xls, .csv)
 * =========================================================================
 */
export async function parseMonthlyMatrixExcel(
  file: File,
  students: Student[],
  fallbackMonthStr: string = "2025-07"
): Promise<ParseAttendanceResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });

  // Choose sheet: look for 'matriks' or take first sheet
  const targetSheetName =
    workbook.SheetNames.find((n) => n.toLowerCase().includes("matrik") || n.toLowerCase().includes("presensi")) ||
    workbook.SheetNames[0];

  const worksheet = workbook.Sheets[targetSheetName];
  if (!worksheet) {
    throw new Error("Lembar sheet tidak ditemukan di dalam file Excel.");
  }

  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  if (rows.length === 0) {
    throw new Error("File Excel kosong atau tidak memiliki baris data.");
  }

  // Detect month from metadata or text
  let detectedMonth = fallbackMonthStr;
  for (let r = 0; r < Math.min(rows.length, 6); r++) {
    const rowText = rows[r].join(" ");
    const matchYearMonth = rowText.match(/(\d{4})[-_\/](\d{2})/);
    if (matchYearMonth) {
      detectedMonth = `${matchYearMonth[1]}-${matchYearMonth[2]}`;
      break;
    }
    // Check Indonesian month names
    const indonesianMonths: Record<string, string> = {
      januari: "01", februari: "02", maret: "03", april: "04", mei: "05", juni: "06",
      juli: "07", agustus: "08", september: "09", oktober: "10", november: "11", desember: "12",
    };
    for (const [name, mm] of Object.entries(indonesianMonths)) {
      if (rowText.toLowerCase().includes(name)) {
        const yearMatch = rowText.match(/\b(20\d{2})\b/);
        const yyyy = yearMatch ? yearMatch[1] : fallbackMonthStr.split("-")[0] || "2025";
        detectedMonth = `${yyyy}-${mm}`;
        break;
      }
    }
  }

  // Find header row containing student name and date columns
  let headerRowIndex = -1;
  let nisnCol = -1;
  let nisCol = -1;
  let nameCol = -1;
  const dayCols: { day: number; colIndex: number }[] = [];

  for (let r = 0; r < Math.min(rows.length, 12); r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || "").trim().toLowerCase();
      if (cellVal.includes("nama") && nameCol === -1) {
        nameCol = c;
      }
      if (cellVal.includes("nisn") && nisnCol === -1) {
        nisnCol = c;
      } else if (cellVal.includes("nis") && !cellVal.includes("nisn") && nisCol === -1) {
        nisCol = c;
      }

      // Check date columns: "1", "2", "Tgl 1", "Tgl 01", "1/7", etc.
      const dayMatch = cellVal.match(/^(?:tgl\s*|tanggal\s*)?(\d{1,2})(?:\s*\(.*\))?$/i);
      if (dayMatch) {
        const dayNum = parseInt(dayMatch[1], 10);
        if (dayNum >= 1 && dayNum <= 31 && !dayCols.some((d) => d.day === dayNum)) {
          dayCols.push({ day: dayNum, colIndex: c });
        }
      }
    }

    if (nameCol !== -1 && dayCols.length >= 5) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex === -1 || nameCol === -1) {
    throw new Error(
      "Format tabel tidak sesuai: Tidak ditemukan kolom 'Nama Siswa' atau kolom tanggal harian (1 s.d. 31). Pastikan menggunakan template yang sesuai."
    );
  }

  const records: AttendanceRecord[] = [];
  const warnings: string[] = [];
  const statusCounts = { H: 0, S: 0, I: 0, A: 0 };
  const matchedStudentIds = new Set<string>();
  let totalParsedRows = 0;
  let unmatchedRowsCount = 0;
  const datesFoundSet = new Set<string>();

  // Process data rows
  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rawName = nameCol !== -1 ? String(row[nameCol] || "").trim() : "";
    const rawNis = nisCol !== -1 ? String(row[nisCol] || "").trim() : "";
    const rawNisn = nisnCol !== -1 ? String(row[nisnCol] || "").trim() : "";

    if (!rawName && !rawNis && !rawNisn) continue;
    if (rawName.toLowerCase().includes("total") || rawName.toLowerCase().includes("keterangan")) continue;

    totalParsedRows++;
    const student = findStudent(students, rawNisn, rawNis, rawName);

    if (!student) {
      unmatchedRowsCount++;
      warnings.push(`Baris ${r + 1}: Siswa "${rawName || rawNisn || rawNis}" tidak ditemukan dalam daftar murid kelas.`);
      continue;
    }

    matchedStudentIds.add(student.id);

    // Extract day columns
    dayCols.forEach(({ day, colIndex }) => {
      const cellVal = row[colIndex];
      const parsedStatus = normalizeStatus(cellVal);
      if (parsedStatus) {
        const dayPad = day < 10 ? `0${day}` : `${day}`;
        const dateKey = `${detectedMonth}-${dayPad}`;
        datesFoundSet.add(dateKey);

        statusCounts[parsedStatus.status]++;

        records.push({
          id: `att_${dateKey}_${student.id}`,
          date: dateKey,
          studentId: student.id,
          status: parsedStatus.status,
          reason: parsedStatus.reason || "",
        });
      }
    });
  }

  return {
    records,
    summary: {
      totalParsedRows,
      matchedStudentsCount: matchedStudentIds.size,
      unmatchedRowsCount,
      datesFound: Array.from(datesFoundSet).sort(),
      statusCounts,
      monthStr: detectedMonth,
      sourceType: "matrix_monthly",
    },
    warnings,
  };
}

/**
 * =========================================================================
 * 5. PARSER: UNGGAH / IMPORT REKAP SEMESTER & DETAIL LOG (.xlsx, .xls, .csv)
 * =========================================================================
 */
export async function parseSemesterRecapExcel(
  file: File,
  students: Student[]
): Promise<ParseAttendanceResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });

  // Priority 1: Check if there is a 'Log_Presensi_Detail' sheet
  const logSheetName = workbook.SheetNames.find(
    (n) => n.toLowerCase().includes("log") || n.toLowerCase().includes("detail") || n.toLowerCase().includes("harian")
  );

  if (logSheetName && workbook.Sheets[logSheetName]) {
    return parseAttendanceLogWorksheet(workbook.Sheets[logSheetName], students, "semester_recap");
  }

  // Priority 2: Parse standard sheet
  const defaultSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!defaultSheet) {
    throw new Error("File Excel tidak memiliki lembar kerja (sheet).");
  }

  return parseAttendanceLogWorksheet(defaultSheet, students, "semester_recap");
}

/**
 * =========================================================================
 * 6. PARSER: UNGGAH / IMPORT LOG PRESENSI HARIAN (.xlsx, .xls, .csv)
 * =========================================================================
 */
export async function parseDailyLogAttendanceExcel(
  file: File,
  students: Student[]
): Promise<ParseAttendanceResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    throw new Error("File Excel kosong.");
  }
  return parseAttendanceLogWorksheet(sheet, students, "detail_log");
}

function parseAttendanceLogWorksheet(
  worksheet: XLSX.WorkSheet,
  students: Student[],
  sourceType: "semester_recap" | "detail_log"
): ParseAttendanceResult {
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  if (rows.length === 0) {
    throw new Error("Sheet kosong.");
  }

  let headerRowIndex = -1;
  let dateCol = -1;
  let nisnCol = -1;
  let nisCol = -1;
  let nameCol = -1;
  let statusCol = -1;
  let reasonCol = -1;

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || "").trim().toLowerCase();
      if (val.includes("tanggal") || val.includes("tgl") || val.includes("date")) {
        dateCol = c;
      } else if (val.includes("nisn")) {
        nisnCol = c;
      } else if (val.includes("nis") && !val.includes("nisn")) {
        nisCol = c;
      } else if (val.includes("nama")) {
        nameCol = c;
      } else if (val.includes("status") || val.includes("kehadiran") || val === "h/s/i/a" || val === "status (h/s/i/a)") {
        statusCol = c;
      } else if (val.includes("alasan") || val.includes("keterangan") || val.includes("catatan") || val.includes("penyebab")) {
        reasonCol = c;
      }
    }

    if ((dateCol !== -1 || statusCol !== -1) && nameCol !== -1) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex === -1 || nameCol === -1) {
    throw new Error("Format kolom tidak dikenali. Pastikan terdapat kolom Tanggal, Nama Siswa, dan Status Kehadiran.");
  }

  const records: AttendanceRecord[] = [];
  const warnings: string[] = [];
  const statusCounts = { H: 0, S: 0, I: 0, A: 0 };
  const matchedStudentIds = new Set<string>();
  let totalParsedRows = 0;
  let unmatchedRowsCount = 0;
  const datesFoundSet = new Set<string>();

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rawName = nameCol !== -1 ? String(row[nameCol] || "").trim() : "";
    const rawNis = nisCol !== -1 ? String(row[nisCol] || "").trim() : "";
    const rawNisn = nisnCol !== -1 ? String(row[nisnCol] || "").trim() : "";

    if (!rawName && !rawNis && !rawNisn) continue;

    totalParsedRows++;
    const student = findStudent(students, rawNisn, rawNis, rawName);

    if (!student) {
      unmatchedRowsCount++;
      warnings.push(`Baris ${r + 1}: Siswa "${rawName || rawNisn || rawNis}" tidak ditemukan dalam daftar murid.`);
      continue;
    }

    matchedStudentIds.add(student.id);

    const rawDate = dateCol !== -1 ? row[dateCol] : new Date();
    const dateStr = parseExcelDate(rawDate);
    datesFoundSet.add(dateStr);

    const rawStatus = statusCol !== -1 ? row[statusCol] : "H";
    const parsedStatus = normalizeStatus(rawStatus) || { status: "H" };

    const reason = reasonCol !== -1 ? String(row[reasonCol] || "").trim() : (parsedStatus.reason || "");

    statusCounts[parsedStatus.status]++;

    records.push({
      id: `att_${dateStr}_${student.id}`,
      date: dateStr,
      studentId: student.id,
      status: parsedStatus.status,
      reason: reason || parsedStatus.reason || "",
    });
  }

  return {
    records,
    summary: {
      totalParsedRows,
      matchedStudentsCount: matchedStudentIds.size,
      unmatchedRowsCount,
      datesFound: Array.from(datesFoundSet).sort(),
      statusCounts,
      sourceType,
    },
    warnings,
  };
}
