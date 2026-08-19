import * as XLSX from "xlsx";
import { Student, AttendanceRecord, AttendanceStatus, SchoolIdentity } from "../types";
import { applyPageSetup } from "./exportExcel";

// Helper to save workbook
function saveWorkbook(wb: XLSX.WorkBook, filename: string) {
  const cleanBase = filename.replace(/\.(xlsx|xls|csv)$/i, "");
  XLSX.writeFile(wb, `${cleanBase}.xlsx`, { bookType: "xlsx", type: "binary" });
}

// --------------------------------------------------------------------------------------
// 1. TEMPLATE MATRIKS BULANAN (GOOGLE SHEETS & EXCEL COMPATIBLE)
// --------------------------------------------------------------------------------------
export function downloadMonthlyMatrixTemplate(
  students: Student[],
  schoolIdentity: Partial<SchoolIdentity> = {},
  monthStr: string = "2025-07",
  monthLabel: string = "Juli 2025",
  existingAttendance: AttendanceRecord[] = []
) {
  const [yStr, mStr] = monthStr.split("-");
  const year = parseInt(yStr || "2025", 10);
  const month = parseInt(mStr || "7", 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  const workbook = XLSX.utils.book_new();

  // --- SHEET 1: Matriks Presensi Bulanan ---
  const headerData: (string | number)[][] = [
    ["PEMERINTAH KABUPATEN / KOTA"],
    [(schoolIdentity.schoolName || "SD NEGERI 1 MERDEKA").toUpperCase()],
    [`TEMPLATE & REKAPITULASI PRESENSI SISWA - BULAN ${monthLabel.toUpperCase()}`],
    [
      `Kelas/Fase: ${schoolIdentity.gradeClass || "Kelas IV"} (${schoolIdentity.phase || "Fase B"})`,
      "",
      `Semester: ${schoolIdentity.semester || "Semester Ganjil"}`,
      "",
      `Tahun Pelajaran: ${schoolIdentity.academicYear || "2025/2026"}`,
      "",
      `Kode Bulan: ${monthStr}`,
    ],
    [], // Blank separator row (Row index 4)
  ];

  // Table Column Headers (Row 6)
  const colHeaders: string[] = [
    "No",
    "NIS",
    "NISN",
    "Nama Siswa",
    "L/P",
  ];

  for (let d = 1; d <= 31; d++) {
    colHeaders.push(`${d}`);
  }

  colHeaders.push(
    "Hadir (H)",
    "Sakit (S)",
    "Izin (I)",
    "Alpa (A)",
    "Total Efektif",
    "% Kehadiran"
  );

  headerData.push(colHeaders);

  // Student rows
  const studentRows = (students.length > 0 ? students : [
    { id: "s1", name: "Ahmad Fauzi", nis: "1001", nisn: "0123456781", gender: "L" as const },
    { id: "s2", name: "Budi Pratama", nis: "1002", nisn: "0123456782", gender: "L" as const },
    { id: "s3", name: "Citra Lestari", nis: "1003", nisn: "0123456783", gender: "P" as const },
  ]).map((s, idx) => {
    const row: (string | number)[] = [
      idx + 1,
      s.nis || "-",
      s.nisn || "-",
      s.name,
      s.gender || "L",
    ];

    let hCount = 0, sCount = 0, iCount = 0, aCount = 0;

    for (let day = 1; day <= 31; day++) {
      if (day > daysInMonth) {
        row.push("-");
        continue;
      }
      const dayPad = day < 10 ? `0${day}` : `${day}`;
      const dateKey = `${monthStr}-${dayPad}`;
      const rec = existingAttendance.find((r) => r.studentId === s.id && r.date === dateKey);

      if (rec) {
        row.push(rec.status);
        if (rec.status === "H") hCount++;
        if (rec.status === "S") sCount++;
        if (rec.status === "I") iCount++;
        if (rec.status === "A") aCount++;
      } else {
        // Default empty for teacher to fill in Google Sheets / Excel
        row.push("");
      }
    }

    const totalRecorded = hCount + sCount + iCount + aCount;
    const pct = totalRecorded > 0 ? Math.round((hCount / totalRecorded) * 100) + "%" : "-";

    row.push(
      hCount > 0 ? hCount : "",
      sCount > 0 ? sCount : "",
      iCount > 0 ? iCount : "",
      aCount > 0 ? aCount : "",
      totalRecorded > 0 ? totalRecorded : "",
      pct
    );

    return row;
  });

  const allRows = [...headerData, ...studentRows];
  const matrixWorksheet = XLSX.utils.aoa_to_sheet(allRows);

  // Set column widths
  const cols = [
    { wch: 4 },  // No
    { wch: 8 },  // NIS
    { wch: 12 }, // NISN
    { wch: 26 }, // Nama Siswa
    { wch: 5 },  // L/P
  ];
  for (let i = 0; i < 31; i++) {
    cols.push({ wch: 3.5 }); // Dates 1-31
  }
  cols.push(
    { wch: 9 },  // H
    { wch: 9 },  // S
    { wch: 9 },  // I
    { wch: 9 },  // A
    { wch: 12 }, // Total
    { wch: 12 }  // %
  );
  matrixWorksheet["!cols"] = cols;
  applyPageSetup(matrixWorksheet, undefined, "landscape");

  XLSX.utils.book_append_sheet(workbook, matrixWorksheet, "Matriks_Presensi_Bulanan");

  // --- SHEET 2: Petunjuk Pengisian ---
  const guideRows = [
    ["PETUNJUK PENGISIAN TEMPLATE MATRIKS PRESENSI BULANAN"],
    [""],
    ["1. KODE KEHADIRAN:"],
    ["   - H = Hadir"],
    ["   - S = Sakit"],
    ["   - I = Izin"],
    ["   - A = Alpa / Tanpa Keterangan"],
    ["   - Kolom tanggal dapat dikosongkan (atau diisi '-') pada hari Minggu, libur nasional, atau hari non-efektif."],
    [""],
    ["2. ATURAN PENGUNGGAHAN KE APLIKASI:"],
    ["   - Jangan mengubah baris judul 'Bulan:' atau Kode Bulan pada header agar sistem dapat mendeteksi bulan secara otomatis."],
    ["   - Jangan mengubah nama kolom: 'Nama Siswa', 'NIS', 'NISN', dan kolom tanggal 1 sampai 31."],
    ["   - Data siswa dicocokkan otomatis berdasarkan NISN, NIS, atau Nama Lengkap."],
    ["   - Format file yang didukung saat diunggah: .xlsx, .xls, .csv, atau Google Sheets yang diunduh ke Excel."],
    [""],
    ["3. SINKRONISASI DENGAN GOOGLE SHEETS:"],
    ["   - Anda dapat mengunggah file ini ke Google Drive, lalu membukanya dengan Google Sheets."],
    ["   - Setelah selesai mengedit di Google Sheets, klik File -> Unduh -> Microsoft Excel (.xlsx), lalu unggah ke aplikasi."],
  ];
  const guideWorksheet = XLSX.utils.aoa_to_sheet(guideRows);
  guideWorksheet["!cols"] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(workbook, guideWorksheet, "Petunjuk_Pengisian");

  const cleanMonth = monthLabel.replace(/\s+/g, "_");
  const cleanSchool = (schoolIdentity.schoolName || "SD").replace(/\s+/g, "_");
  saveWorkbook(workbook, `Template_Matriks_Presensi_${cleanSchool}_${cleanMonth}.xlsx`);
}

// --------------------------------------------------------------------------------------
// 2. TEMPLATE REKAP SEMESTER & LOG DETAIL (GOOGLE SHEETS & EXCEL COMPATIBLE)
// --------------------------------------------------------------------------------------
export function downloadSemesterRecapTemplate(
  students: Student[],
  attendanceRecords: AttendanceRecord[] = [],
  schoolIdentity: Partial<SchoolIdentity> = {},
  semester: string = "Semester Ganjil"
) {
  const workbook = XLSX.utils.book_new();

  // --- SHEET 1: Rekapitulasi Presensi Per Semester ---
  const headerData: (string | number)[][] = [
    ["PEMERINTAH KABUPATEN / KOTA"],
    [(schoolIdentity.schoolName || "SD NEGERI 1 MERDEKA").toUpperCase()],
    [`TEMPLATE & REKAPITULASI PRESENSI PER SEMESTER (${semester.toUpperCase()})`],
    [
      `Kelas/Fase: ${schoolIdentity.gradeClass || "Kelas IV"} (${schoolIdentity.phase || "Fase B"})`,
      "",
      `Semester: ${semester}`,
      "",
      `Tahun Pelajaran: ${schoolIdentity.academicYear || "2025/2026"}`,
    ],
    [], // Blank separator
  ];

  const colHeaders = [
    "No",
    "NIS",
    "NISN",
    "Nama Siswa",
    "L/P",
    "Sakit (S)",
    "Izin (I)",
    "Alpa (A)",
    "Hadir (H)",
    "Total Pertemuan",
    "% Kehadiran",
    "Log Keterangan / Tanggal & Alasan Absen",
  ];

  headerData.push(colHeaders);

  const studentRows = (students.length > 0 ? students : [
    { id: "s1", name: "Ahmad Fauzi", nis: "1001", nisn: "0123456781", gender: "L" as const },
    { id: "s2", name: "Budi Pratama", nis: "1002", nisn: "0123456782", gender: "L" as const },
    { id: "s3", name: "Citra Lestari", nis: "1003", nisn: "0123456783", gender: "P" as const },
  ]).map((s, idx) => {
    const studentRecs = attendanceRecords.filter((r) => r.studentId === s.id);
    const hadir = studentRecs.filter((r) => r.status === "H").length;
    const sakit = studentRecs.filter((r) => r.status === "S").length;
    const izin = studentRecs.filter((r) => r.status === "I").length;
    const alpa = studentRecs.filter((r) => r.status === "A").length;
    const total = hadir + sakit + izin + alpa;
    const pct = total > 0 ? Math.round((hadir / total) * 100) + "%" : "100%";

    const logs = studentRecs
      .filter((r) => r.status !== "H")
      .map((r) => {
        const [, m, d] = (r.date || "").split("-");
        const formattedDate = m && d ? `${d}/${m}` : r.date;
        return `${formattedDate} [${r.status}]${r.reason ? " - " + r.reason : ""}`;
      })
      .join(" ; ");

    return [
      idx + 1,
      s.nis || "-",
      s.nisn || "-",
      s.name,
      s.gender || "L",
      sakit,
      izin,
      alpa,
      hadir,
      total,
      pct,
      logs || "Hadir Penuh",
    ];
  });

  const allRows = [...headerData, ...studentRows];
  const summaryWorksheet = XLSX.utils.aoa_to_sheet(allRows);

  summaryWorksheet["!cols"] = [
    { wch: 4 },  // No
    { wch: 8 },  // NIS
    { wch: 12 }, // NISN
    { wch: 26 }, // Nama Siswa
    { wch: 5 },  // L/P
    { wch: 10 }, // S
    { wch: 10 }, // I
    { wch: 10 }, // A
    { wch: 10 }, // H
    { wch: 14 }, // Total
    { wch: 12 }, // %
    { wch: 55 }, // Log detail
  ];
  applyPageSetup(summaryWorksheet, undefined, "landscape");
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Rekap_Presensi_Semester");

  // --- SHEET 2: Log Detail Harian (Opsional untuk input rinci) ---
  const detailLogHeaders = [
    ["RINCIAN LOG PRESENSI HARIAN"],
    ["No", "Tanggal (YYYY-MM-DD)", "NISN", "Nama Siswa", "Status (H/S/I/A)", "Alasan / Keterangan"],
  ];
  const detailLogRows: (string | number)[][] = [];

  attendanceRecords
    .filter((r) => r.status !== "H")
    .forEach((r, idx) => {
      const student = students.find((s) => s.id === r.studentId);
      detailLogRows.push([
        idx + 1,
        r.date,
        student?.nisn || "-",
        student?.name || `ID: ${r.studentId}`,
        r.status,
        r.reason || "-",
      ]);
    });

  if (detailLogRows.length === 0) {
    detailLogRows.push([1, "2025-08-05", "0123456781", "Ahmad Fauzi", "S", "Demam tinggi"]);
    detailLogRows.push([2, "2025-08-12", "0123456782", "Budi Pratama", "I", "Acara keluarga"]);
  }

  const detailLogWorksheet = XLSX.utils.aoa_to_sheet([...detailLogHeaders, ...detailLogRows]);
  detailLogWorksheet["!cols"] = [
    { wch: 4 },
    { wch: 18 },
    { wch: 14 },
    { wch: 26 },
    { wch: 14 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(workbook, detailLogWorksheet, "Log_Detail_Harian");

  // --- SHEET 3: Petunjuk Pengisian ---
  const guideRows = [
    ["PETUNJUK PENGISIAN TEMPLATE REKAP SEMESTER & LOG DETAIL"],
    [""],
    ["1. CARA MENGISI KOLOM 'Log Keterangan / Tanggal & Alasan Absen':"],
    ["   - Format penulisan: DD/MM [Status] - Alasan"],
    ["   - Contoh 1: 05/08 [S] - Demam ; 12/09 [I] - Acara keluarga"],
    ["   - Contoh 2: 15/10 [A] - Tanpa Keterangan"],
    ["   - Pisahkan setiap tanggal ketidakhadiran dengan tanda titik koma (;)."],
    [""],
    ["2. CARA MENGGUNAKAN SHEET 'Log_Detail_Harian':"],
    ["   - Anda juga dapat mengisi presensi tanggal per tanggal pada sheet 'Log_Detail_Harian'."],
    ["   - Kolom Tanggal harus berformat YYYY-MM-DD (Contoh: 2025-08-05)."],
    [""],
    ["3. PENGUNGGAHAN KE APLIKASI:"],
    ["   - Simpan file ini lalu unggah ke aplikasi menggunakan tombol 'Unggah Template Rekap Semester'."],
    ["   - Sistem akan otomatis membaca dan membuat log presensi untuk setiap siswa."],
  ];
  const guideWorksheet = XLSX.utils.aoa_to_sheet(guideRows);
  guideWorksheet["!cols"] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(workbook, guideWorksheet, "Petunjuk_Pengisian");

  const cleanSem = semester.replace(/\s+/g, "_");
  const cleanSchool = (schoolIdentity.schoolName || "SD").replace(/\s+/g, "_");
  saveWorkbook(workbook, `Template_Rekap_Presensi_Semester_${cleanSchool}_${cleanSem}.xlsx`);
}

// --------------------------------------------------------------------------------------
// 3. PARSER ENGINE FOR UPLOADED TEMPLATES
// --------------------------------------------------------------------------------------

export interface ParsedAttendanceResult {
  status: "success" | "error";
  type: "matrix" | "semester";
  detectedMonth?: string;
  detectedSemester?: string;
  records: AttendanceRecord[];
  matchedStudentsCount: number;
  totalStudentsCount: number;
  counts: {
    H: number;
    S: number;
    I: number;
    A: number;
  };
  unmappedStudents: string[];
  previewList: {
    studentName: string;
    nis: string;
    nisn: string;
    hCount: number;
    sCount: number;
    iCount: number;
    aCount: number;
    logSample?: string;
  }[];
  errorMessage?: string;
}

// Helper: Normalize string for matching
function normalizeText(val: any): string {
  if (val === undefined || val === null) return "";
  return String(val).toLowerCase().trim().replace(/[\s._-]+/g, "");
}

// Helper: Find student by NISN, NIS, or Name
function findMatchingStudent(
  rowNISN: any,
  rowNIS: any,
  rowName: any,
  students: Student[]
): Student | undefined {
  const normNISN = normalizeText(rowNISN);
  const normNIS = normalizeText(rowNIS);
  const normName = normalizeText(rowName);

  if (normNISN && normNISN !== "-") {
    const byNISN = students.find((s) => normalizeText(s.nisn) === normNISN);
    if (byNISN) return byNISN;
  }

  if (normNIS && normNIS !== "-") {
    const byNIS = students.find((s) => normalizeText(s.nis) === normNIS);
    if (byNIS) return byNIS;
  }

  if (normName) {
    const byExactName = students.find((s) => normalizeText(s.name) === normName);
    if (byExactName) return byExactName;

    // Fuzzy contains check
    const byPartialName = students.find(
      (s) =>
        normalizeText(s.name).includes(normName) ||
        normName.includes(normalizeText(s.name))
    );
    if (byPartialName) return byPartialName;
  }

  return undefined;
}

// Parse Monthly Matrix Template (.xlsx, .xls, .csv)
export function parseMonthlyMatrixUpload(
  fileData: ArrayBuffer | Uint8Array,
  students: Student[],
  fallbackMonthStr: string = "2025-07"
): ParsedAttendanceResult {
  try {
    const workbook = XLSX.read(fileData, { type: "array" });
    const sheetName =
      workbook.SheetNames.find((n) => n.toLowerCase().includes("matriks") || n.toLowerCase().includes("matrix")) ||
      workbook.SheetNames[0];

    if (!sheetName) {
      return {
        status: "error",
        type: "matrix",
        records: [],
        matchedStudentsCount: 0,
        totalStudentsCount: students.length,
        counts: { H: 0, S: 0, I: 0, A: 0 },
        unmappedStudents: [],
        previewList: [],
        errorMessage: "File tidak memiliki lembar kerja (worksheet) yang valid.",
      };
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

    if (rawRows.length === 0) {
      return {
        status: "error",
        type: "matrix",
        records: [],
        matchedStudentsCount: 0,
        totalStudentsCount: students.length,
        counts: { H: 0, S: 0, I: 0, A: 0 },
        unmappedStudents: [],
        previewList: [],
        errorMessage: "Lembar kerja kosong atau tidak dapat dibaca.",
      };
    }

    // 1. Detect Month from header rows
    let detectedMonth = fallbackMonthStr;
    for (let r = 0; r < Math.min(rawRows.length, 8); r++) {
      const rowText = rawRows[r].join(" ");
      const matchMonthCode = rowText.match(/(20\d{2})-(0[1-9]|1[0-2])/);
      if (matchMonthCode) {
        detectedMonth = matchMonthCode[0];
        break;
      }
      const monthNames = [
        { name: "januari", code: "01" },
        { name: "februari", code: "02" },
        { name: "maret", code: "03" },
        { name: "april", code: "04" },
        { name: "mei", code: "05" },
        { name: "juni", code: "06" },
        { name: "juli", code: "07" },
        { name: "agustus", code: "08" },
        { name: "september", code: "09" },
        { name: "oktober", code: "10" },
        { name: "november", code: "11" },
        { name: "desember", code: "12" },
      ];
      for (const m of monthNames) {
        if (rowText.toLowerCase().includes(m.name)) {
          const yearMatch = rowText.match(/20\d{2}/);
          const y = yearMatch ? yearMatch[0] : fallbackMonthStr.split("-")[0] || "2025";
          detectedMonth = `${y}-${m.code}`;
          break;
        }
      }
    }

    // 2. Find table header row
    let headerRowIdx = -1;
    let nameColIdx = -1;
    let nisColIdx = -1;
    let nisnColIdx = -1;
    const dateColIndices: { day: number; colIdx: number }[] = [];

    for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
      const row = rawRows[r];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || "").trim().toLowerCase();
        if (val.includes("nama siswa") || val.includes("nama lengkap") || val === "nama") {
          headerRowIdx = r;
          nameColIdx = c;
        }
        if (val === "nis") nisColIdx = c;
        if (val === "nisn") nisnColIdx = c;
      }
      if (headerRowIdx !== -1) {
        // Collect day columns (1 to 31)
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || "").trim();
          const dayNum = parseInt(val, 10);
          if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
            dateColIndices.push({ day: dayNum, colIdx: c });
          } else {
            const tglMatch = val.match(/tgl\s*([0-9]{1,2})/i);
            if (tglMatch) {
              const dNum = parseInt(tglMatch[1], 10);
              if (dNum >= 1 && dNum <= 31) {
                dateColIndices.push({ day: dNum, colIdx: c });
              }
            }
          }
        }
        break;
      }
    }

    if (headerRowIdx === -1 || nameColIdx === -1 || dateColIndices.length === 0) {
      return {
        status: "error",
        type: "matrix",
        records: [],
        matchedStudentsCount: 0,
        totalStudentsCount: students.length,
        counts: { H: 0, S: 0, I: 0, A: 0 },
        unmappedStudents: [],
        previewList: [],
        errorMessage: "Format tabel matriks tidak dikenali. Pastikan terdapat kolom 'Nama Siswa' dan kolom tanggal '1' s.d. '31'.",
      };
    }

    // 3. Process each student row
    const newRecords: AttendanceRecord[] = [];
    const matchedStudentIds = new Set<string>();
    const unmapped: string[] = [];
    const previewList: ParsedAttendanceResult["previewList"] = [];
    const counts = { H: 0, S: 0, I: 0, A: 0 };

    const [yStr, mStr] = detectedMonth.split("-");
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const rawName = row[nameColIdx];
      const rawNIS = nisColIdx >= 0 ? row[nisColIdx] : "";
      const rawNISN = nisnColIdx >= 0 ? row[nisnColIdx] : "";

      if (!rawName || String(rawName).trim() === "") continue;

      const studentNameStr = String(rawName).trim();
      const student = findMatchingStudent(rawNISN, rawNIS, studentNameStr, students);

      if (!student) {
        unmapped.push(studentNameStr);
        continue;
      }

      matchedStudentIds.add(student.id);

      let rowH = 0, rowS = 0, rowI = 0, rowA = 0;

      dateColIndices.forEach(({ day, colIdx }) => {
        if (day > daysInMonth) return;
        const cellVal = String(row[colIdx] || "").trim().toUpperCase();
        if (!cellVal || cellVal === "-" || cellVal === "0") return;

        let status: AttendanceStatus | null = null;
        if (cellVal === "H" || cellVal === "HADIR" || cellVal === "V" || cellVal === "1") {
          status = "H";
          rowH++;
          counts.H++;
        } else if (cellVal === "S" || cellVal === "SAKIT") {
          status = "S";
          rowS++;
          counts.S++;
        } else if (cellVal === "I" || cellVal === "IZIN" || cellVal === "IJIN") {
          status = "I";
          rowI++;
          counts.I++;
        } else if (cellVal === "A" || cellVal === "ALPA" || cellVal === "ALFA" || cellVal === "TK") {
          status = "A";
          rowA++;
          counts.A++;
        }

        if (status) {
          const dayPad = day < 10 ? `0${day}` : `${day}`;
          const dateKey = `${detectedMonth}-${dayPad}`;
          newRecords.push({
            id: `att_${dateKey}_${student.id}`,
            date: dateKey,
            studentId: student.id,
            status,
            reason: "",
          });
        }
      });

      previewList.push({
        studentName: student.name,
        nis: student.nis || "-",
        nisn: student.nisn || "-",
        hCount: rowH,
        sCount: rowS,
        iCount: rowI,
        aCount: rowA,
      });
    }

    return {
      status: "success",
      type: "matrix",
      detectedMonth,
      records: newRecords,
      matchedStudentsCount: matchedStudentIds.size,
      totalStudentsCount: students.length,
      counts,
      unmappedStudents: unmapped,
      previewList,
    };
  } catch (err: any) {
    return {
      status: "error",
      type: "matrix",
      records: [],
      matchedStudentsCount: 0,
      totalStudentsCount: students.length,
      counts: { H: 0, S: 0, I: 0, A: 0 },
      unmappedStudents: [],
      previewList: [],
      errorMessage: `Gagal membaca file: ${err.message || err}`,
    };
  }
}

// Parse Semester Recap & Detail Log Template (.xlsx, .xls, .csv)
export function parseSemesterRecapUpload(
  fileData: ArrayBuffer | Uint8Array,
  students: Student[],
  academicYearFallback: string = "2025/2026"
): ParsedAttendanceResult {
  try {
    const workbook = XLSX.read(fileData, { type: "array" });

    // Check if there is a "Log_Detail_Harian" sheet first
    const detailSheetName = workbook.SheetNames.find(
      (n) => n.toLowerCase().includes("detail") || n.toLowerCase().includes("harian")
    );

    const summarySheetName =
      workbook.SheetNames.find(
        (n) => n.toLowerCase().includes("semester") || n.toLowerCase().includes("rekap")
      ) || workbook.SheetNames[0];

    const newRecords: AttendanceRecord[] = [];
    const matchedStudentIds = new Set<string>();
    const unmapped: string[] = [];
    const previewList: ParsedAttendanceResult["previewList"] = [];
    const counts = { H: 0, S: 0, I: 0, A: 0 };

    const startYear = academicYearFallback.split("/")[0] || "2025";

    // 1. If detail sheet exists, parse explicit dates from it
    if (detailSheetName) {
      const detailWs = workbook.Sheets[detailSheetName];
      const detailRows: any[][] = XLSX.utils.sheet_to_json(detailWs, { header: 1, defval: "" });

      let dateCol = -1, nameCol = -1, statusCol = -1, reasonCol = -1, nisnCol = -1;
      let headerIdx = -1;

      for (let r = 0; r < Math.min(detailRows.length, 10); r++) {
        const row = detailRows[r];
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || "").trim().toLowerCase();
          if (val.includes("tanggal")) { dateCol = c; headerIdx = r; }
          if (val.includes("nama")) { nameCol = c; headerIdx = r; }
          if (val.includes("status")) { statusCol = c; }
          if (val.includes("alasan") || val.includes("keterangan")) { reasonCol = c; }
          if (val.includes("nisn") || val.includes("nis")) { nisnCol = c; }
        }
        if (dateCol !== -1 && nameCol !== -1) break;
      }

      if (headerIdx !== -1 && dateCol !== -1 && nameCol !== -1) {
        for (let r = headerIdx + 1; r < detailRows.length; r++) {
          const row = detailRows[r];
          if (!row || row.length === 0) continue;

          const rawDate = String(row[dateCol] || "").trim();
          const rawName = String(row[nameCol] || "").trim();
          const rawStatus = String(statusCol >= 0 ? row[statusCol] : "H").trim().toUpperCase();
          const rawReason = String(reasonCol >= 0 ? row[reasonCol] : "").trim();
          const rawNISN = String(nisnCol >= 0 ? row[nisnCol] : "").trim();

          if (!rawName || !rawDate) continue;

          const student = findMatchingStudent(rawNISN, "", rawName, students);
          if (!student) {
            unmapped.push(rawName);
            continue;
          }

          matchedStudentIds.add(student.id);

          let st: AttendanceStatus = "H";
          if (rawStatus.startsWith("S")) st = "S";
          else if (rawStatus.startsWith("I")) st = "I";
          else if (rawStatus.startsWith("A")) st = "A";

          counts[st]++;

          // Format Date YYYY-MM-DD
          let formattedDate = rawDate;
          if (rawDate.includes("/")) {
            const parts = rawDate.split("/");
            if (parts.length === 2) {
              const d = parts[0].padStart(2, "0");
              const m = parts[1].padStart(2, "0");
              formattedDate = `${startYear}-${m}-${d}`;
            } else if (parts.length === 3) {
              formattedDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
            }
          }

          newRecords.push({
            id: `att_${formattedDate}_${student.id}`,
            date: formattedDate,
            studentId: student.id,
            status: st,
            reason: rawReason,
          });
        }
      }
    }

    // 2. Also parse Summary sheet and extract embedded log strings (e.g. "05/08 [S] - Demam ; 12/09 [I]")
    if (summarySheetName) {
      const summaryWs = workbook.Sheets[summarySheetName];
      const summaryRows: any[][] = XLSX.utils.sheet_to_json(summaryWs, { header: 1, defval: "" });

      let nameCol = -1, nisCol = -1, nisnCol = -1, logCol = -1;
      let sCol = -1, iCol = -1, aCol = -1, hCol = -1;
      let headerIdx = -1;

      for (let r = 0; r < Math.min(summaryRows.length, 12); r++) {
        const row = summaryRows[r];
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || "").trim().toLowerCase();
          if (val.includes("nama siswa") || val.includes("nama murid") || val === "nama") {
            nameCol = c;
            headerIdx = r;
          }
          if (val === "nis") nisCol = c;
          if (val === "nisn") nisnCol = c;
          if (val.includes("log") || val.includes("keterangan") || val.includes("penyebab")) logCol = c;
          if (val.includes("sakit") || val === "s") sCol = c;
          if (val.includes("izin") || val === "i") iCol = c;
          if (val.includes("alpa") || val === "a") aCol = c;
          if (val.includes("hadir") || val === "h") hCol = c;
        }
        if (nameCol !== -1 && headerIdx !== -1) break;
      }

      if (headerIdx !== -1 && nameCol !== -1) {
        for (let r = headerIdx + 1; r < summaryRows.length; r++) {
          const row = summaryRows[r];
          if (!row || row.length === 0) continue;

          const rawName = String(row[nameCol] || "").trim();
          const rawNIS = nisCol >= 0 ? String(row[nisCol] || "").trim() : "";
          const rawNISN = nisnCol >= 0 ? String(row[nisnCol] || "").trim() : "";
          const rawLog = logCol >= 0 ? String(row[logCol] || "").trim() : "";

          if (!rawName || rawName === "-") continue;

          const student = findMatchingStudent(rawNISN, rawNIS, rawName, students);
          if (!student) {
            unmapped.push(rawName);
            continue;
          }

          matchedStudentIds.add(student.id);

          const sNum = sCol >= 0 ? parseInt(row[sCol], 10) || 0 : 0;
          const iNum = iCol >= 0 ? parseInt(row[iCol], 10) || 0 : 0;
          const aNum = aCol >= 0 ? parseInt(row[aCol], 10) || 0 : 0;
          const hNum = hCol >= 0 ? parseInt(row[hCol], 10) || 0 : 0;

          // Parse embedded logs if detail records weren't already added
          if (rawLog && rawLog.toLowerCase() !== "hadir penuh" && rawLog !== "-") {
            const entries = rawLog.split(";");
            entries.forEach((entryStr) => {
              const trimmed = entryStr.trim();
              if (!trimmed) return;

              // Pattern: DD/MM [Status] - Reason OR DD/MM (Status) - Reason
              const logMatch = trimmed.match(/(\d{1,2})\/(\d{1,2})\s*[\[\(\-]?\s*([SHIAshia])\s*[\]\)]?\s*(?:-?\s*(.*))?/);
              if (logMatch) {
                const day = logMatch[1].padStart(2, "0");
                const month = logMatch[2].padStart(2, "0");
                const st = logMatch[3].toUpperCase() as AttendanceStatus;
                const reason = (logMatch[4] || "").trim();
                const dateKey = `${startYear}-${month}-${day}`;

                // Avoid duplicates
                if (!newRecords.some((rec) => rec.studentId === student.id && rec.date === dateKey)) {
                  newRecords.push({
                    id: `att_${dateKey}_${student.id}`,
                    date: dateKey,
                    studentId: student.id,
                    status: st,
                    reason,
                  });
                  counts[st]++;
                }
              }
            });
          }

          previewList.push({
            studentName: student.name,
            nis: student.nis || "-",
            nisn: student.nisn || "-",
            hCount: hNum,
            sCount: sNum,
            iCount: iNum,
            aCount: aNum,
            logSample: rawLog || "Hadir Penuh",
          });
        }
      }
    }

    return {
      status: "success",
      type: "semester",
      records: newRecords,
      matchedStudentsCount: matchedStudentIds.size,
      totalStudentsCount: students.length,
      counts,
      unmappedStudents: Array.from(new Set(unmapped)),
      previewList,
    };
  } catch (err: any) {
    return {
      status: "error",
      type: "semester",
      records: [],
      matchedStudentsCount: 0,
      totalStudentsCount: students.length,
      counts: { H: 0, S: 0, I: 0, A: 0 },
      unmappedStudents: [],
      previewList: [],
      errorMessage: `Gagal membaca file: ${err.message || err}`,
    };
  }
}
