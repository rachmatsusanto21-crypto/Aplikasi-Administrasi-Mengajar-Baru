import * as XLSX from "xlsx";
import {
  Student,
  GradeRecord,
  DailyGradeEntry,
  AttendanceRecord,
  DailyTeachingLog,
  ProtaItem,
  PromesItem,
  CPTPItem,
  TimetableSlot,
  SchoolIdentity,
} from "../types";

function saveWorkbook(wb: XLSX.WorkBook, filename: string, format: "xlsx" | "xls" | "csv" = "xlsx") {
  const cleanBase = filename.replace(/\.(xlsx|xls|csv)$/i, "");
  if (format === "csv") {
    const firstSheetName = wb.SheetNames[0] || "Sheet1";
    const worksheet = wb.Sheets[firstSheetName];
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${cleanBase}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else if (format === "xls") {
    XLSX.writeFile(wb, `${cleanBase}.xls`, { bookType: "biff8", type: "binary" });
  } else {
    XLSX.writeFile(wb, `${cleanBase}.xlsx`, { bookType: "xlsx", type: "binary" });
  }
}

export function exportTableToExcelFormat(
  headers: string[],
  rows: (string | number)[][],
  filename: string,
  format: "xlsx" | "xls" | "csv" = "xlsx",
  title?: string
) {
  const data = rows.map((row) => {
    const obj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] ?? "";
    });
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  autoWidth(worksheet);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, title || "Sheet1");

  saveWorkbook(workbook, filename, format);
}

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
          maxLen = Math.min(str.length, 50);
        }
      }
    }
    cols.push({ wch: maxLen + 2 });
  }
  worksheet["!cols"] = cols;
}

// 1. Export Data Siswa
export function exportStudentsToExcel(students: Student[], schoolIdentity?: Partial<SchoolIdentity>) {
  const data = students.map((s, idx) => ({
    No: idx + 1,
    "Nama Lengkap": s.name,
    NIS: s.nis || "-",
    NISN: s.nisn || "-",
    "Jenis Kelamin": s.gender === "L" ? "Laki-Laki" : "Perempuan",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  autoWidth(worksheet);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Siswa");

  const school = schoolIdentity?.schoolName ? `${schoolIdentity.schoolName}_` : "";
  saveWorkbook(workbook, `Data_Siswa_${school}${schoolIdentity?.gradeClass || "Kelas"}.xlsx`);
}

// 2. Export Nilai Siswa
export function exportGradesToExcel(
  students: Student[],
  dailyGrades: DailyGradeEntry[],
  gradeRecords: GradeRecord[],
  subjects: string[],
  schoolIdentity?: Partial<SchoolIdentity>
) {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Rekap Matrix Nilai
  const summaryRows = students.map((s, idx) => {
    const row: any = {
      No: idx + 1,
      "Nama Siswa": s.name,
      NISN: s.nisn || "-",
    };

    subjects.forEach((subj) => {
      const rec = gradeRecords.find((g) => g.studentId === s.id && g.subject === subj);
      let avg = "-";
      if (rec && rec.tpScores) {
        const scores = Object.values(rec.tpScores).filter((val) => typeof val === "number");
        if (scores.length > 0) {
          avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
        }
      }
      row[subj] = avg;
      row[`STS_${subj}`] = rec?.midSummative !== undefined ? rec.midSummative : "-";
      row[`SAS_${subj}`] = rec?.finalSummative !== undefined ? rec.finalSummative : "-";
    });

    return row;
  });

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  autoWidth(summarySheet);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Rekap Nilai Matrix");

  // Sheet 2: Detail Nilai Formatif Harian
  if (dailyGrades.length > 0) {
    const detailRows = dailyGrades.map((dg, idx) => {
      const student = students.find((s) => s.id === dg.studentId);
      return {
        No: idx + 1,
        "Nama Siswa": student?.name || "Siswa " + dg.studentId,
        "Mata Pelajaran": dg.subject,
        "Kode TP": dg.tpCode,
        "Tanggal Formatif": dg.dateFormatted,
        "Jenis Asesmen": dg.assessmentType,
        Nilai: dg.score,
      };
    });

    const detailSheet = XLSX.utils.json_to_sheet(detailRows);
    autoWidth(detailSheet);
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Rincian Formatif Harian");
  }

  saveWorkbook(workbook, `Data_Nilai_Siswa_${schoolIdentity?.gradeClass || "Kelas"}.xlsx`);
}

// 3. Export Absensi Siswa
export function exportAttendanceToExcel(
  students: Student[],
  attendanceRecords: AttendanceRecord[],
  periodStr?: string,
  schoolIdentity?: Partial<SchoolIdentity>
) {
  const data = students.map((s, idx) => {
    const studentRecs = attendanceRecords.filter((r) => {
      if (r.studentId !== s.id) return false;
      if (periodStr && periodStr !== "all") {
        return (r.date || "").startsWith(periodStr);
      }
      return true;
    });

    const hadir = studentRecs.filter((r) => r.status === "H").length;
    const sakit = studentRecs.filter((r) => r.status === "S").length;
    const izin = studentRecs.filter((r) => r.status === "I").length;
    const alfa = studentRecs.filter((r) => r.status === "A").length;
    const total = studentRecs.length;
    const persentase = total > 0 ? Math.round((hadir / total) * 100) + "%" : "100%";

    const logs = studentRecs
      .filter((r) => r.status !== "H")
      .map((r) => {
        const [, m, d] = (r.date || "").split("-");
        const formattedDate = m && d ? `${d}/${m}` : r.date;
        return `${formattedDate} [${r.status}]${r.reason ? " - " + r.reason : ""}`;
      })
      .join(" ; ");

    return {
      No: idx + 1,
      NIS: s.nis || "-",
      "Nama Siswa": s.name,
      "Sakit (S)": sakit,
      "Izin (I)": izin,
      "Alpa (A)": alfa,
      "Total Pertemuan Absen": sakit + izin + alfa,
      "Persentase Kehadiran": persentase,
      "Log Keterangan / Penyebab Absen": logs || "Hadir Penuh",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  autoWidth(worksheet);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Presensi");

  const school = schoolIdentity?.schoolName ? `${schoolIdentity.schoolName}_` : "";
  const periodLabel = periodStr && periodStr !== "all" ? `_${periodStr.replace(/\s+/g, "_")}` : "";
  saveWorkbook(workbook, `Rekap_Presensi_Siswa_${school}${schoolIdentity?.gradeClass || "Kelas"}${periodLabel}.xlsx`);
}

// 4. Export Jurnal Mengajar Harian
export function exportTeachingLogsToExcel(logs: DailyTeachingLog[], schoolIdentity?: Partial<SchoolIdentity>) {
  const data = logs.map((l, idx) => ({
    No: idx + 1,
    Tanggal: l.date,
    Kelas: l.classGrade,
    "Mata Pelajaran": l.subject,
    Materi: l.material,
    "Tujuan Pembelajaran (TP)": l.tpDescription,
    "Ringkasan Kehadiran": l.attendanceSummary,
    "Catatan Kendala": l.notes || "-",
    Refleksi: l.reflection || "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  autoWidth(worksheet);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Jurnal Mengajar");

  saveWorkbook(workbook, `Jurnal_Mengajar_Harian_${schoolIdentity?.gradeClass || "Kelas"}.xlsx`);
}

// 5. Export Prota (Program Tahunan)
export function exportProtaToExcel(protaList: ProtaItem[], schoolIdentity?: Partial<SchoolIdentity>) {
  const data = protaList.map((p, idx) => ({
    No: idx + 1,
    Semester: String(p.semester),
    "Mata Pelajaran": p.subject,
    Elemen: p.element || "-",
    "Kode TP": p.codeTP || p.tpCode || "-",
    "Tujuan Pembelajaran (TP)": p.tpDescription,
    "Tanggal / Pekan Pelaksanaan": p.executionDate ? `${p.executionDate} (${p.executionWeek || ''})` : "-",
    "Alokasi Waktu (JP)": p.allocatedJP || p.timeAllocationJP || 0,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  autoWidth(worksheet);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Prota");

  saveWorkbook(workbook, `Program_Tahunan_Prota_${schoolIdentity?.gradeClass || "Kelas"}.xlsx`);
}

// 6. Export Promes (Program Semester) with full weekly matrix (W1-W5 per month)
export function exportPromesToExcel(
  promesList: PromesItem[],
  schoolIdentity?: Partial<SchoolIdentity>,
  currentAllocations?: Record<string, number>,
  currentProta?: ProtaItem[],
  selectedSubject?: string,
  selectedSemester?: number
) {
  const workbook = XLSX.utils.book_new();

  const semesters = [1, 2];

  semesters.forEach((sem) => {
    const semLabel = sem === 1 ? "Ganjil (Sem 1)" : "Genap (Sem 2)";
    const months =
      sem === 1
        ? ["Juli", "Agustus", "September", "Oktober", "November", "Desember"]
        : ["Januari", "Februari", "Maret", "April", "Mei", "Juni"];
    const weeks = [1, 2, 3, 4, 5];

    // Get items for this semester
    let semItems = promesList.filter(
      (p) =>
        String(p.semester) === String(sem) ||
        p.semester === (sem === 1 ? "Ganjil" : "Genap")
    );

    // If active Prota items are passed for current screen view, merge them
    if (
      currentProta &&
      currentProta.length > 0 &&
      selectedSemester === sem &&
      selectedSubject
    ) {
      const activeProta = currentProta.filter(
        (p) =>
          p.subject === selectedSubject &&
          (String(p.semester) === String(sem) || p.semester === (sem === 1 ? "Ganjil" : "Genap"))
      );

      activeProta.forEach((p) => {
        const code = p.tpCode || p.codeTP || "TP-1";
        const existingIdx = semItems.findIndex(
          (item) => item.codeTP === code && item.subject === p.subject
        );
        if (existingIdx === -1) {
          semItems.push({
            id: p.id,
            subject: p.subject,
            codeTP: code,
            tpDescription: p.tpDescription,
            timeAllocationJP: p.allocatedJP || p.timeAllocationJP || 0,
            semester: sem === 1 ? "Ganjil" : "Genap",
            monthlyAllocation: {},
            weeklyAllocations: {},
          } as PromesItem);
        }
      });
    }

    if (semItems.length === 0) return;

    const rows = semItems.map((p, idx) => {
      const rowObj: Record<string, any> = {
        No: idx + 1,
        "Mata Pelajaran": p.subject,
        "Kode TP": p.codeTP || (p as any).tpCode || "-",
        "Tujuan Pembelajaran (TP)": p.tpDescription || "-",
        "Target JP": p.timeAllocationJP || (p as any).allocatedJP || 0,
      };

      let sumAllocated = 0;

      months.forEach((m) => {
        weeks.forEach((w) => {
          const colName = `${m} (W${w})`;
          const key1 = `${p.id}_${m}_w${w}`;
          const key2 = `${m}_w${w}`;

          let val = 0;
          if (currentAllocations && currentAllocations[key1] !== undefined) {
            val = currentAllocations[key1];
          } else if (p.weeklyAllocations && p.weeklyAllocations[key1] !== undefined) {
            val = p.weeklyAllocations[key1];
          } else if (p.weeklyAllocations && p.weeklyAllocations[key2] !== undefined) {
            val = p.weeklyAllocations[key2];
          } else if (p.monthlyAllocation && Array.isArray(p.monthlyAllocation[m])) {
            val = p.monthlyAllocation[m][w - 1] || 0;
          }

          sumAllocated += val;
          rowObj[colName] = val > 0 ? val : "";
        });
      });

      rowObj["Total Teralokasi (JP)"] = sumAllocated;
      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    autoWidth(worksheet);
    XLSX.utils.book_append_sheet(workbook, worksheet, `Promes ${semLabel}`);
  });

  // Fallback if no sheets were added
  if (workbook.SheetNames.length === 0) {
    const defaultSheet = XLSX.utils.json_to_sheet([
      { Information: "Belum ada data Program Semester (Promes)." },
    ]);
    XLSX.utils.book_append_sheet(workbook, defaultSheet, "Promes");
  }

  saveWorkbook(
    workbook,
    `Program_Semester_Promes_${schoolIdentity?.gradeClass || "Kelas"}.xlsx`
  );
}

// 7. Export CP / TP Kurikulum
export function exportCurriculumToExcel(cptpItems: CPTPItem[], schoolIdentity?: Partial<SchoolIdentity>) {
  const data = cptpItems.map((c, idx) => ({
    No: idx + 1,
    "Mata Pelajaran": c.subject,
    Kelas: c.targetClass || "Kelas IV",
    Elemen: c.element || "-",
    "Kode CP": c.codeCP || "-",
    "Capaian Pembelajaran (CP)": c.descriptionCP || "-",
    "Kode TP": c.codeTP || "-",
    "Tujuan Pembelajaran (TP)": c.descriptionTP || "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  autoWidth(worksheet);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "CP dan TP Kurikulum");

  saveWorkbook(workbook, `Capaian_dan_Tujuan_Pembelajaran_CP_TP.xlsx`);
}

// 8. Export Jadwal Pelajaran (Timetable)
export function exportTimetableToExcel(
  timetable: TimetableSlot[],
  periods: number[],
  subjects: string[],
  schoolIdentity?: Partial<SchoolIdentity>
) {
  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const rows = periods.map((pNum) => {
    const row: any = { "Jam Ke": pNum };
    days.forEach((day) => {
      const slot = timetable.find((t) => t.day === day && t.period === pNum);
      row[day] = slot ? `${slot.subject}${slot.roomOrTeacher ? ` (${slot.roomOrTeacher})` : ""}` : "-";
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  autoWidth(worksheet);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Jadwal Pelajaran");

  saveWorkbook(workbook, `Jadwal_Pelajaran_${schoolIdentity?.gradeClass || "Kelas"}.xlsx`);
}

// 9. Export Matriks Absensi Bulanan 1-31
export function exportMonthlyMatrixToExcel(
  students: Student[],
  attendanceRecords: AttendanceRecord[],
  monthStr: string,
  monthLabel: string
) {
  const [yearStr, mStr] = monthStr.split("-");
  const year = parseInt(yearStr || "2025", 10);
  const month = parseInt(mStr || "7", 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  const rows = students.map((s, idx) => {
    const row: any = {
      No: idx + 1,
      NIS: s.nis || "-",
      "Nama Siswa": s.name,
    };

    let totalS = 0;
    let totalI = 0;
    let totalA = 0;

    for (let day = 1; day <= 31; day++) {
      if (day > daysInMonth) {
        row[`Tgl ${day}`] = "-";
        continue;
      }
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const dateKey = `${monthStr}-${dayStr}`;
      const rec = attendanceRecords.find((r) => r.studentId === s.id && r.date === dateKey);

      if (rec) {
        row[`Tgl ${day}`] = rec.status;
        if (rec.status === "S") totalS++;
        if (rec.status === "I") totalI++;
        if (rec.status === "A") totalA++;
      } else {
        row[`Tgl ${day}`] = "-";
      }
    }

    row["Sakit (S)"] = totalS;
    row["Izin (I)"] = totalI;
    row["Alpa (A)"] = totalA;

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  autoWidth(worksheet);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Matriks_${monthLabel.replace(/\s+/g, "_")}`);
  saveWorkbook(workbook, `Rekap_Presensi_Matriks_${monthLabel.replace(/\s+/g, "_")}.xlsx`);
}
