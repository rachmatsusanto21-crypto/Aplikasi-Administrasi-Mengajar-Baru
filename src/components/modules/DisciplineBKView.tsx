import React, { useState } from "react";
import { Student, IncidentRecord, GradeRecord, SchoolIdentity } from "../../types";
import { ShieldAlert, Plus, Search, Trash2, Edit2, Printer, Download, CheckCircle, AlertTriangle, Heart, BarChart2, UserCheck, X, FileText, CheckSquare, Square, Users, Mail } from "lucide-react";
import { exportToCSV } from "../../lib/storage";
import { exportHtmlToDoc } from "../../lib/exportDoc";
import { StudentParentReportModal } from "./StudentParentReportModal";

interface DisciplineBKViewProps {
  students: Student[];
  incidents: IncidentRecord[];
  grades?: GradeRecord[];
  subjects?: string[];
  schoolIdentity?: SchoolIdentity;
  onSaveIncidents: (updated: IncidentRecord[]) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

export const DisciplineBKView: React.FC<DisciplineBKViewProps> = ({
  students,
  incidents,
  grades = [],
  subjects = ["Bahasa Indonesia", "Matematika", "IPAS", "Pancasila", "Seni Budaya", "PJOK"],
  schoolIdentity = {
    schoolName: "SD Negeri 1",
    npsn: "12345678",
    address: "Jl. Pendidikan",
    village: "-",
    district: "-",
    regency: "-",
    province: "-",
    website: "-",
    email: "-",
    phone: "-",
    logoUrl: "",
    academicYear: "2025/2026",
    semester: "Ganjil",
    phase: "Fase B",
    gradeClass: "Kelas IV",
    headmasterName: "-",
    headmasterNip: "-",
    teacherName: "Guru Kelas",
    teacherNip: "-",
  },
  onSaveIncidents,
  onOpenPrint,
}) => {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("Semua");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Multi-student selection state for BK/Incident creation
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchFilter, setStudentSearchFilter] = useState<string>("");

  // New Modals State for Rekap Klasikal, Per Siswa & Parent Email Report
  const [isKlasikalModalOpen, setIsKlasikalModalOpen] = useState(false);
  const [isPerSiswaModalOpen, setIsPerSiswaModalOpen] = useState(false);
  const [isParentReportModalOpen, setIsParentReportModalOpen] = useState(false);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<string>(students[0]?.id || "");

  const [form, setForm] = useState<Partial<IncidentRecord>>({
    date: new Date().toISOString().slice(0, 10),
    type: "Pelanggaran",
    category: "Ringan",
    status: "Selesai",
  });

  const getStudentName = (id: string) => {
    return students.find((s) => s.id === id)?.name || "Murid Tidak Ditemukan";
  };

  const filteredIncidents = incidents.filter((inc) => {
    const studentName = (getStudentName(inc.studentId) || "").toLowerCase();
    const s = (search || "").toLowerCase();
    const matchSearch =
      studentName.includes(s) ||
      (inc.description || "").toLowerCase().includes(s);
    const matchType = selectedType === "Semua" || inc.type === selectedType;
    return matchSearch && matchType;
  });

  const handleDelete = (id: string) => {
    onSaveIncidents(incidents.filter((i) => i.id !== id));
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({
      date: new Date().toISOString().slice(0, 10),
      type: "Pelanggaran",
      category: "Ringan",
      status: "Selesai",
      studentId: students[0]?.id || "",
    });
    setSelectedStudentIds(students.length > 0 ? [students[0].id] : []);
    setStudentSearchFilter("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (inc: IncidentRecord) => {
    setEditingId(inc.id);
    setForm(inc);
    setSelectedStudentIds([inc.studentId]);
    setIsModalOpen(true);
  };

  const toggleSelectStudent = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter((sId) => sId !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const handleSelectAllStudents = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0 || !form.description) return;

    if (editingId) {
      const updated = incidents.map((i) =>
        i.id === editingId
          ? ({ ...i, ...form, studentId: selectedStudentIds[0] || form.studentId } as IncidentRecord)
          : i
      );
      onSaveIncidents(updated);
    } else {
      // Create separate individual records for each selected student
      const newIncidents: IncidentRecord[] = selectedStudentIds.map((sId, index) => ({
        id: `inc_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
        date: form.date || new Date().toISOString().slice(0, 10),
        studentId: sId,
        type: (form.type as any) || "Pelanggaran",
        category: (form.category as any) || "Ringan",
        description: form.description || "",
        actionTaken: form.actionTaken || "",
        counselorName: form.counselorName || "Guru Kelas",
        status: (form.status as any) || "Selesai",
        parentSignatureNote: form.parentSignatureNote || "",
      }));
      onSaveIncidents([...incidents, ...newIncidents]);
    }
    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    const headers = [
      "No",
      "Tanggal",
      "Nama Murid",
      "Jenis Record",
      "Kategori/Tingkat",
      "Uraian Kejadian/Perilaku",
      "Tindakan/Hasil Bimbingan",
      "Konselor",
      "Status Bimbingan",
    ];
    const rows = filteredIncidents.map((inc, idx) => [
      idx + 1,
      inc.date,
      getStudentName(inc.studentId),
      inc.type,
      inc.category,
      inc.description,
      inc.actionTaken,
      inc.counselorName,
      inc.status,
    ]);
    exportToCSV(headers, rows, "Catatan_BK_Dan_Pelanggaran");
  };

  const handleExportDoc = () => {
    const tableHtml = `
      <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse:collapse; font-size:10pt;">
        <thead>
          <tr style="background-color:#f3f4f6; font-weight:bold;">
            <th style="border:1px solid #333; padding:5px; text-align:center;">No</th>
            <th style="border:1px solid #333; padding:5px; text-align:center;">Tanggal</th>
            <th style="border:1px solid #333; padding:5px; text-align:left;">Nama Murid</th>
            <th style="border:1px solid #333; padding:5px; text-align:center;">Jenis</th>
            <th style="border:1px solid #333; padding:5px; text-align:center;">Kategori</th>
            <th style="border:1px solid #333; padding:5px; text-align:left;">Kejadian/Perilaku</th>
            <th style="border:1px solid #333; padding:5px; text-align:left;">Tindakan/Solusi</th>
            <th style="border:1px solid #333; padding:5px; text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${filteredIncidents
            .map(
              (inc, idx) => `
            <tr>
              <td style="border:1px solid #333; padding:5px; text-align:center;">${idx + 1}</td>
              <td style="border:1px solid #333; padding:5px; text-align:center;">${inc.date}</td>
              <td style="border:1px solid #333; padding:5px;">${getStudentName(inc.studentId)}</td>
              <td style="border:1px solid #333; padding:5px; text-align:center;">${inc.type}</td>
              <td style="border:1px solid #333; padding:5px; text-align:center;">${inc.category}</td>
              <td style="border:1px solid #333; padding:5px;">${inc.description}</td>
              <td style="border:1px solid #333; padding:5px;">${inc.actionTaken}</td>
              <td style="border:1px solid #333; padding:5px; text-align:center;">${inc.status}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

    exportHtmlToDoc({
      htmlContent: tableHtml,
      filename: "Catatan_Kedisiplinan_BK.doc",
      title: "JURNAL CATATAN KEDISIPLINAN & BIMBINGAN KONSELING",
    });
  };

  // Print Full Detailed Discipline Report for All Students
  const handlePrintRekapLengkapKedisiplinan = () => {
    onOpenPrint(
      "REKAPITULASI LENGKAP LAPORAN KEDISIPLINAN & BIMBINGAN KONSELING SISWA",
      `Kelas: ${schoolIdentity.gradeClass} | Tahun Ajaran: ${schoolIdentity.academicYear} | Total Catatan: ${incidents.length} Kejadian`,
      (
        <div className="space-y-6 text-xs text-slate-900">
          {/* Section 1: Summary Table */}
          <div className="space-y-2">
            <h3 className="font-extrabold text-sm uppercase text-slate-800 border-b pb-1">
              I. Ringkasan Rekapitulasi Kedisiplinan Klasikal Siswa
            </h3>
            <table className="w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 font-bold text-center">
                  <th className="border border-slate-300 p-2 w-8">No</th>
                  <th className="border border-slate-300 p-2 text-left">Nama Murid</th>
                  <th className="border border-slate-300 p-2 w-20">NIS / NISN</th>
                  <th className="border border-slate-300 p-2 w-24 bg-rose-50 text-rose-900">Total Pelanggaran</th>
                  <th className="border border-slate-300 p-2 w-24 bg-indigo-50 text-indigo-900">Total Bimbingan BK</th>
                  <th className="border border-slate-300 p-2 w-24 bg-emerald-50 text-emerald-900">Total Prestasi</th>
                  <th className="border border-slate-300 p-2 w-28">Status Kedisiplinan</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => {
                  const sInc = incidents.filter((i) => i.studentId === s.id);
                  const pel = sInc.filter((i) => i.type === "Pelanggaran").length;
                  const bk = sInc.filter((i) => i.type === "Bimbingan Konseling").length;
                  const pres = sInc.filter((i) => i.type === "Prestasi").length;
                  let status = "Sangat Baik / Disiplin";
                  if (pel >= 5) status = "⚠️ Perlu Perhatian Khusus";
                  else if (pel >= 2) status = "⚠️ Bimbingan Rutin";

                  return (
                    <tr key={s.id} className="odd:bg-white even:bg-slate-50">
                      <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 font-bold">{s.name}</td>
                      <td className="border border-slate-300 p-2 text-center font-mono">{s.nis || s.nisn || "-"}</td>
                      <td className={`border border-slate-300 p-2 text-center font-bold ${pel > 0 ? "text-rose-700 bg-rose-50" : "text-slate-400"}`}>{pel}</td>
                      <td className={`border border-slate-300 p-2 text-center font-bold ${bk > 0 ? "text-indigo-700 bg-indigo-50" : "text-slate-400"}`}>{bk}</td>
                      <td className={`border border-slate-300 p-2 text-center font-bold ${pres > 0 ? "text-emerald-700 bg-emerald-50" : "text-slate-400"}`}>{pres}</td>
                      <td className="border border-slate-300 p-2 text-center font-semibold">{status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Section 2: Individual Student Detailed Breakdown */}
          <div className="space-y-4 pt-4">
            <h3 className="font-extrabold text-sm uppercase text-slate-800 border-b pb-1">
              II. Rincian Pelanggaran & Bimbingan Konseling Per Murid
            </h3>

            {students.map((s, sIdx) => {
              const studentLogs = incidents.filter((i) => i.studentId === s.id);
              if (studentLogs.length === 0) return null;

              return (
                <div key={s.id} className="border border-slate-300 rounded-lg p-3 space-y-2 bg-white break-inside-avoid">
                  <div className="flex justify-between items-center bg-slate-100 p-2 rounded border border-slate-200">
                    <span className="font-extrabold text-xs text-slate-900">
                      {sIdx + 1}. {s.name} (NIS: {s.nis || "-"} | NISN: {s.nisn || "-"})
                    </span>
                    <span className="text-[11px] font-bold text-indigo-700">
                      Total {studentLogs.length} Catatan Kejadian
                    </span>
                  </div>

                  <table className="w-full border-collapse border border-slate-300 text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 font-bold text-center">
                        <th className="border border-slate-300 p-1.5 w-6">No</th>
                        <th className="border border-slate-300 p-1.5 w-20">Tanggal</th>
                        <th className="border border-slate-300 p-1.5 w-24">Jenis</th>
                        <th className="border border-slate-300 p-1.5 w-20">Kategori</th>
                        <th className="border border-slate-300 p-1.5 text-left">Uraian Perilaku / Kejadian</th>
                        <th className="border border-slate-300 p-1.5 text-left">Tindakan & Hasil Bimbingan</th>
                        <th className="border border-slate-300 p-1.5 w-24">Konselor</th>
                        <th className="border border-slate-300 p-1.5 w-16">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentLogs.map((log, lIdx) => (
                        <tr key={log.id} className="align-top">
                          <td className="border border-slate-300 p-1.5 text-center">{lIdx + 1}</td>
                          <td className="border border-slate-300 p-1.5 text-center font-mono">{log.date}</td>
                          <td className="border border-slate-300 p-1.5 text-center font-bold">
                            <span className={log.type === "Pelanggaran" ? "text-rose-700" : log.type === "Prestasi" ? "text-emerald-700" : "text-indigo-700"}>
                              {log.type}
                            </span>
                          </td>
                          <td className="border border-slate-300 p-1.5 text-center">{log.category}</td>
                          <td className="border border-slate-300 p-1.5">{log.description}</td>
                          <td className="border border-slate-300 p-1.5 text-emerald-900 font-medium">{log.actionTaken}</td>
                          <td className="border border-slate-300 p-1.5 text-center">{log.counselorName}</td>
                          <td className="border border-slate-300 p-1.5 text-center font-bold">{log.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      )
    );
  };

  // Printable Classical Rekap Report
  const handlePrintKlasikal = () => {
    const summaryData = students.map((s) => {
      const studentIncidents = incidents.filter((i) => i.studentId === s.id);
      const totalPelanggaran = studentIncidents.filter((i) => i.type === "Pelanggaran").length;
      const totalBK = studentIncidents.filter((i) => i.type === "Bimbingan Konseling").length;
      const totalPrestasi = studentIncidents.filter((i) => i.type === "Prestasi").length;
      return {
        student: s,
        totalPelanggaran,
        totalBK,
        totalPrestasi,
      };
    });

    onOpenPrint(
      "REKAPITULASI KLASIKAL PELANGGARAN & BK SISWA KELAS",
      `Total Terdaftar: ${students.length} Murid | Total Kejadian Dicatat: ${incidents.length}`,
      (
        <div className="space-y-4 text-xs text-slate-900">
          <table className="w-full border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 font-bold text-center">
                <th className="border border-slate-300 p-2 w-10">No</th>
                <th className="border border-slate-300 p-2 text-left">Nama Murid</th>
                <th className="border border-slate-300 p-2 w-20">NIS</th>
                <th className="border border-slate-300 p-2 w-14">JK</th>
                <th className="border border-slate-300 p-2 w-28 bg-rose-50 text-rose-900">Jml Pelanggaran</th>
                <th className="border border-slate-300 p-2 w-28 bg-indigo-50 text-indigo-900">Jml Bimbingan BK</th>
                <th className="border border-slate-300 p-2 w-28 bg-emerald-50 text-emerald-900">Jml Prestasi</th>
                <th className="border border-slate-300 p-2 w-28">Status Kedisiplinan</th>
              </tr>
            </thead>
            <tbody>
              {summaryData.map((item, idx) => (
                <tr key={item.student.id} className="odd:bg-white even:bg-slate-50">
                  <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                  <td className="border border-slate-300 p-2 font-semibold">{item.student.name}</td>
                  <td className="border border-slate-300 p-2 text-center font-mono">{item.student.nis}</td>
                  <td className="border border-slate-300 p-2 text-center font-bold">{item.student.gender}</td>
                  <td className={`border border-slate-300 p-2 text-center font-bold ${item.totalPelanggaran > 0 ? "text-rose-700 bg-rose-50/30" : "text-slate-400"}`}>
                    {item.totalPelanggaran} Kasus
                  </td>
                  <td className={`border border-slate-300 p-2 text-center font-bold ${item.totalBK > 0 ? "text-indigo-700 bg-indigo-50/30" : "text-slate-400"}`}>
                    {item.totalBK} Sesi
                  </td>
                  <td className={`border border-slate-300 p-2 text-center font-bold ${item.totalPrestasi > 0 ? "text-emerald-700 bg-emerald-50/30" : "text-slate-400"}`}>
                    {item.totalPrestasi} Penghargaan
                  </td>
                  <td className="border border-slate-300 p-2 text-center font-bold">
                    {item.totalPelanggaran === 0 ? "Sangat Baik" : item.totalPelanggaran <= 2 ? "Perlu Perhatian" : "Perlu Penanganan Khusus"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    );
  };

  // Printable Individual Student Report
  const handlePrintPerSiswa = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const studentLogs = incidents.filter((i) => i.studentId === studentId);

    onOpenPrint(
      `RAPOR CATATAN PERILAKU & BIMBINGAN SISWA`,
      `Nama: ${student.name} | NIS: ${student.nis} | NISN: ${student.nisn || "-"}`,
      (
        <div className="space-y-6 text-xs text-slate-900">
          <div className="border p-4 rounded bg-slate-50 grid grid-cols-2 gap-2">
            <p><b>Nama Murid:</b> {student.name}</p>
            <p><b>NIS / NISN:</b> {student.nis} / {student.nisn || "-"}</p>
            <p><b>Jenis Kelamin:</b> {student.gender === "L" ? "Laki-laki" : "Perempuan"}</p>
            <p><b>Total Rekam Jejak:</b> {studentLogs.length} Catatan ({studentLogs.filter((i) => i.type === "Pelanggaran").length} Pelanggaran)</p>
          </div>

          <h4 className="font-bold text-sm border-b pb-1">RIWAYAT INCIDENT & CATATAN BK:</h4>

          {studentLogs.length === 0 ? (
            <p className="italic text-slate-500 text-center py-4">Belum ada rekam jejak pelanggaran atau bimbingan konseling tercatat untuk murid ini (Sangat Baik).</p>
          ) : (
            <div className="space-y-4">
              {studentLogs.map((inc, idx) => (
                <div key={inc.id} className="border p-3 rounded space-y-2 bg-white">
                  <div className="flex justify-between items-center border-b pb-1 font-bold">
                    <span>{idx + 1}. {inc.date} — {inc.type} ({inc.category})</span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px]">{inc.status}</span>
                  </div>
                  <p><b>Uraian Kejadian:</b> {inc.description}</p>
                  <p><b>Tindakan/Solusi:</b> {inc.actionTaken}</p>
                  <p><b>Guru/Konselor:</b> {inc.counselorName}</p>
                  {inc.parentSignatureNote && (
                    <p className="text-amber-800 bg-amber-50 p-2 rounded italic"><b>Tanggapan Orang Tua:</b> {inc.parentSignatureNote}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    );
  };

  const handlePrintReport = (inc: IncidentRecord) => {
    const student = students.find((s) => s.id === inc.studentId);
    onOpenPrint(
      "LEMBAR DOKUMENTASI BIMBINGAN KONSELING & PERILAKU SISWA",
      `Tanggal Kejadian: ${inc.date} | Jenis: ${inc.type}`,
      (
        <div className="space-y-6 text-xs text-slate-900">
          <div className="border p-4 rounded bg-slate-50 space-y-2">
            <h4 className="font-bold uppercase text-slate-800">1. Identitas Murid</h4>
            <div className="grid grid-cols-2 gap-2">
              <p><b>Nama Murid:</b> {student?.name}</p>
              <p><b>NIS / NISN:</b> {student?.nis} / {student?.nisn}</p>
              <p><b>Jenis Kelamin:</b> {student?.gender === "L" ? "Laki-laki" : "Perempuan"}</p>
              <p><b>Kategori Risiko:</b> {inc.category}</p>
            </div>
          </div>

          <div className="border p-4 rounded space-y-2">
            <h4 className="font-bold uppercase text-slate-800">2. Deskripsi Kejadian / Perilaku / Prestasi</h4>
            <p className="bg-white p-3 border rounded text-slate-800">{inc.description}</p>
          </div>

          <div className="border p-4 rounded space-y-2">
            <h4 className="font-bold uppercase text-slate-800">3. Tindakan / Solusi & Tindak Lanjut Konseling</h4>
            <p className="bg-white p-3 border rounded text-slate-800">{inc.actionTaken}</p>
          </div>

          {inc.parentSignatureNote && (
            <div className="border p-4 rounded bg-amber-50/50 space-y-1">
              <h4 className="font-bold uppercase text-amber-900">4. Catatan Tanggapan Orang Tua / Wali</h4>
              <p className="italic text-slate-800">{inc.parentSignatureNote}</p>
            </div>
          )}
        </div>
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-emerald-600" />
            Catatan Pelanggaran Siswa & Bimbingan Konseling (BK)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan rekam jejak perilaku, pelanggaran kedisiplinan, prestasi, dan hasil konseling murid
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Catatan BK
          </button>

          <button
            onClick={handlePrintRekapLengkapKedisiplinan}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            title="Cetak Rekap Lengkap Laporan Kedisiplinan & Bimbingan Konseling Setiap Siswa"
          >
            <Printer className="w-4 h-4" />
            Rekap Lengkap Laporan Kedisiplinan
          </button>

          <button
            onClick={() => setIsKlasikalModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            Rekap Klasikal
          </button>

          <button
            onClick={() => setIsPerSiswaModalOpen(true)}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <UserCheck className="w-4 h-4 text-amber-600" />
            Rekap Per Siswa
          </button>

          <button
            onClick={() => setIsParentReportModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            title="Kirim Laporan Perkembangan Belajar, Peringkat & Discipline ke Email Orang Tua"
          >
            <Mail className="w-4 h-4" />
            Email Laporan Orang Tua
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 flex items-center gap-1.5"
            title="Ekspor ke Excel / CSV"
          >
            <Download className="w-4 h-4" />
            Excel / CSV
          </button>
          <button
            onClick={handleExportDoc}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            title="Simpan dalam bentuk Word (.docx / .doc)"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            Simpan Word (.docx)
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          {["Semua", "Pelanggaran", "Bimbingan Konseling", "Prestasi"].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedType === type
                  ? "bg-emerald-600 text-white font-bold shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari murid atau deskripsi..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Incident List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredIncidents.length === 0 ? (
          <div className="md:col-span-2 bg-white p-12 text-center text-slate-400 text-xs rounded-2xl border border-slate-200">
            Tidak ada catatan bimbingan konseling yang ditemukan.
          </div>
        ) : (
          filteredIncidents.map((inc) => {
            const studentName = getStudentName(inc.studentId);
            return (
              <div
                key={inc.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <span className="font-bold text-sm text-slate-900">{studentName}</span>
                      <span className="text-[11px] text-slate-400 block font-mono">{inc.date}</span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                        inc.type === "Pelanggaran"
                          ? "bg-red-100 text-red-800"
                          : inc.type === "Prestasi"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {inc.type} ({inc.category})
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    <b>Kejadian:</b> {inc.description}
                  </p>

                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <b>Tindakan/Konseling:</b> {inc.actionTaken}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">
                    Status: <b className="text-slate-800">{inc.status}</b>
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handlePrintReport(inc)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                      title="Cetak Laporan BK"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(inc)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(inc.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-slate-900">
              {editingId ? "Edit Catatan BK" : "Tambah Catatan BK / Pelanggaran Baru"}
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Tanggal Incident / Sesi</label>
                <input
                  type="date"
                  required
                  value={form.date || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full p-2 border rounded-lg bg-white font-medium"
                />
              </div>

              {/* Multi-Student Picker Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-800">
                    {editingId ? "Siswa Terkait:" : "Pilih Nama Siswa (Dapat Pilih Banyak):"}
                  </label>
                  {!editingId && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={handleSelectAllStudents}
                        className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                      >
                        {selectedStudentIds.length === students.length ? "Batal Semua" : "Pilih Semua Siswa"}
                      </button>
                      <span className="text-slate-300">|</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                        {selectedStudentIds.length} Siswa Dipilih
                      </span>
                    </div>
                  )}
                </div>

                {editingId ? (
                  <select
                    value={selectedStudentIds[0] || ""}
                    onChange={(e) => setSelectedStudentIds([e.target.value])}
                    className="w-full p-2 border rounded-lg bg-white font-semibold"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.nis})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50 space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari nama atau NIS siswa..."
                        value={studentSearchFilter}
                        onChange={(e) => setStudentSearchFilter(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-1">
                      {students
                        .filter((s) =>
                          s.name.toLowerCase().includes(studentSearchFilter.toLowerCase()) ||
                          s.nis.includes(studentSearchFilter)
                        )
                        .map((s) => {
                          const isSelected = selectedStudentIds.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleSelectStudent(s.id)}
                              className={`flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all text-[11px] ${
                                isSelected
                                  ? "bg-emerald-500 text-white border-emerald-600 font-bold shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 shrink-0 text-white" />
                              ) : (
                                <Square className="w-4 h-4 shrink-0 text-slate-300" />
                              )}
                              <span className="truncate">{s.name}</span>
                            </button>
                          );
                        })}
                    </div>

                    <div className="text-[10px] text-slate-500 italic bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5 text-amber-900">
                      <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        Satu catatan ini akan <b>secara otomatis disimpan tersendiri/masing-masing</b> untuk setiap siswa yang Anda centang di atas.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Jenis Catatan</label>
                  <select
                    value={form.type || "Pelanggaran"}
                    onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as any }))}
                    className="w-full p-2 border rounded-lg bg-white"
                  >
                    <option value="Pelanggaran">Pelanggaran Kedisiplinan</option>
                    <option value="Bimbingan Konseling">Bimbingan Konseling (BK)</option>
                    <option value="Prestasi">Prestasi / Positif</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tingkat / Kategori</label>
                  <select
                    value={form.category || "Ringan"}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as any }))}
                    className="w-full p-2 border rounded-lg bg-white"
                  >
                    <option value="Ringan">Ringan</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Berat">Berat</option>
                    <option value="Positif">Positif / Penghargaan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Uraian Kejadian / Perilaku</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ceritakan ringkasan kejadian..."
                  value={form.description || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Tindakan / Solusi & Hasil Konseling</label>
                <textarea
                  rows={2}
                  placeholder="Langkah bimbingan yang dilakukan..."
                  value={form.actionTaken || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, actionTaken: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Nama Konselor / Guru</label>
                  <input
                    type="text"
                    value={form.counselorName || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, counselorName: e.target.value }))}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Status Bimbingan</label>
                  <select
                    value={form.status || "Selesai"}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as any }))}
                    className="w-full p-2 border rounded-lg bg-white"
                  >
                    <option value="Selesai">Selesai</option>
                    <option value="Proses Bimbingan">Proses Bimbingan</option>
                    <option value="Panggilan Orang Tua">Panggilan Orang Tua</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Catatan Orang Tua / Wali (Opsional)</label>
                <input
                  type="text"
                  placeholder="Tanggapan orang tua siswa..."
                  value={form.parentSignatureNote || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, parentSignatureNote: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                >
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Rekap Klasikal */}
      {isKlasikalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-indigo-600" />
                Rekapitulasi Pelanggaran & BK Secara Klasikal (Seluruh Siswa)
              </h3>
              <button
                onClick={() => setIsKlasikalModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b text-[11px]">
                    <th className="p-2 text-center w-10">No</th>
                    <th className="p-2">Nama Murid</th>
                    <th className="p-2 text-center">NIS</th>
                    <th className="p-2 text-center">JK</th>
                    <th className="p-2 text-center bg-rose-50 text-rose-900">Jml Pelanggaran</th>
                    <th className="p-2 text-center bg-indigo-50 text-indigo-900">Jml BK</th>
                    <th className="p-2 text-center bg-emerald-50 text-emerald-900">Jml Prestasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s, idx) => {
                    const sInc = incidents.filter((i) => i.studentId === s.id);
                    const pel = sInc.filter((i) => i.type === "Pelanggaran").length;
                    const bk = sInc.filter((i) => i.type === "Bimbingan Konseling").length;
                    const pres = sInc.filter((i) => i.type === "Prestasi").length;

                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-2 text-center font-medium text-slate-400">{idx + 1}</td>
                        <td className="p-2 font-bold text-slate-900">{s.name}</td>
                        <td className="p-2 text-center font-mono text-slate-600">{s.nis}</td>
                        <td className="p-2 text-center font-bold">{s.gender}</td>
                        <td className={`p-2 text-center font-bold ${pel > 0 ? "text-rose-700 bg-rose-50/50" : "text-slate-400"}`}>{pel} Kasus</td>
                        <td className={`p-2 text-center font-bold ${bk > 0 ? "text-indigo-700 bg-indigo-50/50" : "text-slate-400"}`}>{bk} Sesi</td>
                        <td className={`p-2 text-center font-bold ${pres > 0 ? "text-emerald-700 bg-emerald-50/50" : "text-slate-400"}`}>{pres} Poin</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setIsKlasikalModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
              >
                Tutup
              </button>
              <button
                onClick={handlePrintKlasikal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" /> Cetak Rekap Klasikal (PDF/Doc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rekap Per Siswa */}
      {isPerSiswaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-600" />
                Rekapitulasi Catatan Per Murid
              </h3>
              <button
                onClick={() => setIsPerSiswaModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Murid:</label>
                <select
                  value={selectedStudentForReport}
                  onChange={(e) => setSelectedStudentForReport(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-800"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (NIS: {s.nis})
                    </option>
                  ))}
                </select>
              </div>

              {/* Individual Student Summary Card */}
              {(() => {
                const s = students.find((st) => st.id === selectedStudentForReport);
                if (!s) return null;

                const logs = incidents.filter((i) => i.studentId === s.id);
                const totalPelanggaran = logs.filter((i) => i.type === "Pelanggaran").length;

                return (
                  <div className="space-y-3 pt-2">
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm">{s.name}</p>
                        <p className="text-[11px] font-mono">NIS: {s.nis} | NISN: {s.nisn || "-"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-900">{logs.length} Total Catatan</p>
                        <p className="text-[11px] text-rose-700 font-bold">{totalPelanggaran} Pelanggaran</p>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {logs.length === 0 ? (
                        <p className="text-center py-6 text-xs text-slate-400 italic">
                          Belum ada riwayat pelanggaran atau konseling untuk murid ini.
                        </p>
                      ) : (
                        logs.map((inc, iIdx) => (
                          <div key={inc.id} className="p-3 border rounded-xl bg-white text-xs space-y-1">
                            <div className="flex justify-between font-bold text-slate-800">
                              <span>{iIdx + 1}. {inc.date} — {inc.type}</span>
                              <span className="text-[10px] text-slate-500">{inc.category}</span>
                            </div>
                            <p className="text-slate-700 font-mono text-[11px]">"{inc.description}"</p>
                            <p className="text-[11px] text-emerald-800 font-medium">Solusi/Tindakan: {inc.actionTaken}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setIsPerSiswaModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
              >
                Tutup
              </button>
              <button
                onClick={() => handlePrintPerSiswa(selectedStudentForReport)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" /> Cetak Rapor Murid (PDF/Doc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parent Report & Email Delivery Modal */}
      <StudentParentReportModal
        isOpen={isParentReportModalOpen}
        onClose={() => setIsParentReportModalOpen(false)}
        students={students}
        grades={grades}
        incidents={incidents}
        subjects={subjects}
        schoolIdentity={schoolIdentity}
        onOpenPrint={onOpenPrint}
      />
    </div>
  );
};
