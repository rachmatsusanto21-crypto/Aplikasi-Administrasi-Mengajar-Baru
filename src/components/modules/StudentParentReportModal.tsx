import React, { useState, useMemo } from "react";
import { Student, GradeRecord, IncidentRecord, SchoolIdentity } from "../../types";
import {
  Mail,
  Send,
  Copy,
  Printer,
  X,
  Award,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  BookOpen,
  FileText,
  Sparkles,
  Heart,
  ShieldAlert,
  Check,
  Phone,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { exportHtmlToDoc } from "../../lib/exportDoc";

interface StudentParentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  grades: GradeRecord[];
  incidents: IncidentRecord[];
  subjects: string[];
  schoolIdentity: SchoolIdentity;
  initialStudentId?: string;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

export const StudentParentReportModal: React.FC<StudentParentReportModalProps> = ({
  isOpen,
  onClose,
  students,
  grades,
  incidents,
  subjects,
  schoolIdentity,
  initialStudentId,
  onOpenPrint,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || students[0]?.id || ""
  );

  const [parentEmailInput, setParentEmailInput] = useState<string>("");
  const [parentPhoneInput, setParentPhoneInput] = useState<string>("");
  const [activePreviewTab, setActivePreviewTab] = useState<"wa" | "email">("wa");
  const [customTeacherNote, setCustomTeacherNote] = useState<string>(
    "Ananda menunjukkan perkembangan belajar yang positif. Harap tetap didampingi saat belajar mandiri di rumah."
  );
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Attitude / Character ratings state (Profil Pelajar Pancasila)
  const [attitudeRatings, setAttitudeRatings] = useState({
    beriman: "Sangat Baik",
    gotongRoyong: "Baik",
    bernalarKritis: "Sangat Baik",
    mandiri: "Baik",
    kreatif: "Baik",
  });

  // 1. Calculate overall class ranking and average scores for all students
  const classRankingList = useMemo(() => {
    return students
      .map((student) => {
        let totalScore = 0;
        const subjectBreakdown: Array<{ subject: string; score: number; status: string }> = [];

        subjects.forEach((sub) => {
          const rec = grades.find((g) => g.studentId === student.id && g.subject === sub);
          let finalScore = 75; // fallback
          if (rec) {
            const tpVals: number[] = Object.values(rec.tpScores || {})
              .map((v) => Number(v))
              .filter((v) => !isNaN(v));
            const avgTP = tpVals.length > 0 ? tpVals.reduce((a, b) => a + b, 0) / tpVals.length : 75;
            const mid = rec.midSummative ?? avgTP;
            const finalS = rec.finalSummative ?? avgTP;
            finalScore = Math.round(avgTP * 0.5 + mid * 0.25 + finalS * 0.25);
          }
          totalScore += finalScore;
          subjectBreakdown.push({
            subject: sub,
            score: finalScore,
            status: finalScore >= 75 ? "Tuntas" : "Perlu Remedial",
          });
        });

        const overallAvg = Math.round(totalScore / (subjects.length || 1));

        return {
          student,
          overallAvg,
          subjectBreakdown,
        };
      })
      .sort((a, b) => b.overallAvg - a.overallAvg);
  }, [students, grades, subjects]);

  // Current Selected Student Data
  const currentRankingData = useMemo(() => {
    const index = classRankingList.findIndex((item) => item.student.id === selectedStudentId);
    if (index === -1) return null;
    return {
      rank: index + 1,
      totalStudents: classRankingList.length,
      ...classRankingList[index],
    };
  }, [classRankingList, selectedStudentId]);

  const currentStudent = currentRankingData?.student;

  // Student Incidents / Discipline Records
  const studentIncidents = useMemo(() => {
    if (!selectedStudentId) return [];
    return incidents.filter((i) => i.studentId === selectedStudentId);
  }, [incidents, selectedStudentId]);

  const incidentSummary = useMemo(() => {
    const pelanggaran = studentIncidents.filter((i) => i.type === "Pelanggaran").length;
    const bk = studentIncidents.filter((i) => i.type === "Bimbingan Konseling").length;
    const prestasi = studentIncidents.filter((i) => i.type === "Prestasi").length;
    return { pelanggaran, bk, prestasi };
  }, [studentIncidents]);

  // Sync email & phone when student changes
  React.useEffect(() => {
    if (currentStudent) {
      setParentEmailInput(
        currentStudent.parentEmail ||
          currentStudent.customFields?.["Email Orang Tua"] ||
          `${currentStudent.name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`
      );
      setParentPhoneInput(
        currentStudent.parentPhone ||
          currentStudent.customFields?.["No HP Orang Tua"] ||
          currentStudent.customFields?.["No HP"] ||
          currentStudent.customFields?.["No WA"] ||
          ""
      );
    }
  }, [currentStudent]);

  if (!isOpen || !currentRankingData || !currentStudent) return null;

  // Construct Email Subject & Formatted Text Body
  const emailSubject = `[Laporan Perkembangan Belajar & Kedisiplinan] Ananda ${currentStudent.name} - ${schoolIdentity.schoolName}`;

  const emailBodyText = `Yth. Bapak/Ibu Orang Tua / Wali dari ${currentStudent.name},

Berikut kami sampaikan Ringkasan Laporan Perkembangan Belajar, Peringkat Kelas, Sikap, dan Kedisiplinan Siswa semester ini di ${schoolIdentity.schoolName}:

==================================================
1. IDENTITAS SISWA
==================================================
• Nama Murid : ${currentStudent.name}
• NIS / NISN : ${currentStudent.nis} / ${currentStudent.nisn || "-"}
• Kelas      : ${schoolIdentity.gradeClass} (${schoolIdentity.academicYear})
• Wali Kelas : ${schoolIdentity.teacherName}

==================================================
2. CAPAIAN AKADEMIK & PERINGKAT KELAS
==================================================
• Peringkat Kelas : Urutan ke-${currentRankingData.rank} dari ${currentRankingData.totalStudents} Siswa
• Rata-Rata Nilai : ${currentRankingData.overallAvg} / 100

Nilai Mata Pelajaran:
${currentRankingData.subjectBreakdown.map((s) => `- ${s.subject}: ${s.score} (${s.status})`).join("\n")}

==================================================
3. CATATAN SIKAP & KARAKTER (PROFIL PELAJAR PANCASILA)
==================================================
• Beriman & Bertakwa : ${attitudeRatings.beriman}
• Gotong Royong      : ${attitudeRatings.gotongRoyong}
• Bernalar Kritis    : ${attitudeRatings.bernalarKritis}
• Mandiri            : ${attitudeRatings.mandiri}
• Kreatif            : ${attitudeRatings.kreatif}

==================================================
4. REKAPITULASI KEDISIPLINAN & BK
==================================================
• Catatan Pelanggaran : ${incidentSummary.pelanggaran} Kejadian
• Sesi Konseling (BK) : ${incidentSummary.bk} Sesi
• Poin Prestasi       : ${incidentSummary.prestasi} Poin

==================================================
5. PESAN KHUSUS WALI KELAS
==================================================
"${customTeacherNote}"

Atas perhatian dan kerja sama Bapak/Ibu Orang Tua/Wali Murid, kami ucapkan terima kasih.

Hormat Kami,
Wali Kelas ${schoolIdentity.gradeClass}
${schoolIdentity.teacherName}
${schoolIdentity.schoolName}`;

  // Formatted WhatsApp Message Body with WhatsApp Markdown & Emojis
  const waBodyText = `🎓 *LAPORAN PERKEMBANGAN BELAJAR & KEDISIPLINAN MURID*
🏫 *${schoolIdentity.schoolName}*
--------------------------------------------------

Yth. Bapak/Ibu Orang Tua / Wali dari *${currentStudent.name}*,

Berikut ringkasan capaian akademik, peringkat kelas, perkembangan sikap, dan kedisiplinan ananda semester ini:

👤 *1. IDENTITAS MURID*
• Nama Murid : *${currentStudent.name}*
• NIS / NISN : ${currentStudent.nis} / ${currentStudent.nisn || "-"}
• Kelas : ${schoolIdentity.gradeClass} (${schoolIdentity.academicYear})
• Wali Kelas : ${schoolIdentity.teacherName}

📊 *2. CAPAIAN AKADEMIK & PERINGKAT KELAS*
🏆 *Peringkat Kelas : Rank #${currentRankingData.rank}* dari ${currentRankingData.totalStudents} Murid
⭐ *Rata-Rata Nilai : ${currentRankingData.overallAvg} / 100*

*Rincian Nilai Mata Pelajaran:*
${currentRankingData.subjectBreakdown.map((s) => `• ${s.subject}: *${s.score}* (${s.status})`).join("\n")}

🌟 *3. SIKAP & PROFIL PELAJAR PANCASILA*
• Beriman & Bertakwa : *${attitudeRatings.beriman}*
• Gotong Royong : *${attitudeRatings.gotongRoyong}*
• Bernalar Kritis : *${attitudeRatings.bernalarKritis}*
• Mandiri : *${attitudeRatings.mandiri}*
• Kreatif : *${attitudeRatings.kreatif}*

📋 *4. CATATAN KEDISIPLINAN & BK*
• Catatan Pelanggaran : ${incidentSummary.pelanggaran} Kejadian
• Sesi Konseling (BK) : ${incidentSummary.bk} Sesi
• Poin Prestasi : ${incidentSummary.prestasi} Poin

💬 *5. PESAN & REKOMENDASI WALI KELAS*
_"${customTeacherNote}"_

--------------------------------------------------
Atas perhatian dan pendampingan Bapak/Ibu di rumah, kami ucapkan terima kasih.

Salam hangat,
*${schoolIdentity.teacherName}*
Wali Kelas ${schoolIdentity.gradeClass}`;

  const formatPhoneForWa = (phone: string) => {
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "62" + cleaned.slice(1);
    }
    return cleaned;
  };

  const handleSendWhatsApp = () => {
    const phone = formatPhoneForWa(parentPhoneInput || "081234567890");
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waBodyText)}`;
    window.open(waUrl, "_blank");
  };

  const handleSendEmailDirect = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(parentEmailInput)}?subject=${encodeURIComponent(
      emailSubject
    )}&body=${encodeURIComponent(emailBodyText)}`;
    window.location.href = mailtoUrl;
  };

  const handleCopyText = () => {
    const textToCopy = activePreviewTab === "wa" ? waBodyText : emailBodyText;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  const handlePrintDoc = () => {
    onOpenPrint(
      "LAPORAN PERKEMBANGAN BELAJAR & KEDISIPLINAN SISWA",
      `Murid: ${currentStudent.name} (NIS: ${currentStudent.nis}) | Kelas: ${schoolIdentity.gradeClass}`,
      (
        <div className="space-y-6 text-xs font-sans text-slate-800">
          <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">{schoolIdentity.schoolName}</h3>
              <p className="text-slate-600 text-[11px]">{schoolIdentity.address}</p>
            </div>
            <div className="text-right text-[11px]">
              <p className="font-bold">Tahun Pelajaran: {schoolIdentity.academicYear}</p>
              <p>Semester: {schoolIdentity.semester}</p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border rounded-xl grid grid-cols-2 gap-2 text-xs">
            <div>
              <p><b>Nama Murid:</b> {currentStudent.name}</p>
              <p><b>NIS / NISN:</b> {currentStudent.nis} / {currentStudent.nisn || "-"}</p>
            </div>
            <div>
              <p><b>Kelas / Fase:</b> {schoolIdentity.gradeClass} ({schoolIdentity.phase})</p>
              <p><b>Wali Kelas:</b> {schoolIdentity.teacherName}</p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-2 border-b pb-1">I. CAPAIAN AKADEMIK & PERINGKAT</h4>
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex justify-between items-center mb-3">
              <div>
                <p className="text-indigo-900 text-[11px]">Peringkat / Rank Kelas:</p>
                <p className="text-2xl font-extrabold text-indigo-700">Rank #{currentRankingData.rank} <span className="text-xs font-normal text-indigo-900">dari {currentRankingData.totalStudents} Siswa</span></p>
              </div>
              <div className="text-right">
                <p className="text-indigo-900 text-[11px]">Rata-Rata Akademik:</p>
                <p className="text-2xl font-extrabold text-indigo-900">{currentRankingData.overallAvg} <span className="text-xs font-normal text-indigo-700">/ 100</span></p>
              </div>
            </div>

            <table className="w-full border-collapse border text-xs">
              <thead>
                <tr className="bg-slate-100 font-bold">
                  <th className="border p-2 text-center w-10">No</th>
                  <th className="border p-2 text-left">Mata Pelajaran</th>
                  <th className="border p-2 text-center w-24">Nilai Akhir</th>
                  <th className="border p-2 text-center w-32">Status Ketuntasan</th>
                </tr>
              </thead>
              <tbody>
                {currentRankingData.subjectBreakdown.map((s, idx) => (
                  <tr key={s.subject} className="odd:bg-white even:bg-slate-50">
                    <td className="border p-2 text-center font-mono">{idx + 1}</td>
                    <td className="border p-2 font-bold">{s.subject}</td>
                    <td className="border p-2 text-center font-mono font-bold">{s.score}</td>
                    <td className={`border p-2 text-center font-semibold ${s.score >= 75 ? "text-emerald-700" : "text-rose-700"}`}>{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-2 border-b pb-1">II. PERKEMBANGAN SIKAP & KEDISIPLINAN</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="border p-3 rounded-xl bg-slate-50 space-y-1">
                <p className="font-bold text-slate-800 border-b pb-1 mb-1">Capaian Profil Pelajar Pancasila:</p>
                <p>• Beriman & Bertakwa: <b>{attitudeRatings.beriman}</b></p>
                <p>• Gotong Royong: <b>{attitudeRatings.gotongRoyong}</b></p>
                <p>• Bernalar Kritis: <b>{attitudeRatings.bernalarKritis}</b></p>
                <p>• Mandiri: <b>{attitudeRatings.mandiri}</b></p>
                <p>• Kreatif: <b>{attitudeRatings.kreatif}</b></p>
              </div>
              <div className="border p-3 rounded-xl bg-slate-50 space-y-1">
                <p className="font-bold text-slate-800 border-b pb-1 mb-1">Catatan Kedisiplinan & BK:</p>
                <p>• Pelanggaran: <b>{incidentSummary.pelanggaran} Kejadian</b></p>
                <p>• Sesi Bimbingan BK: <b>{incidentSummary.bk} Sesi</b></p>
                <p>• Poin Prestasi: <b>{incidentSummary.prestasi} Poin</b></p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
            <h4 className="font-bold text-amber-950">III. CATATAN & REKOMENDASI WALI KELAS</h4>
            <p className="italic text-slate-800 text-xs">"{customTeacherNote}"</p>
          </div>

          <div className="pt-8 flex justify-between text-center text-xs">
            <div>
              <p>Mengetahui,</p>
              <p className="font-bold">Orang Tua / Wali Murid</p>
              <div className="h-16"></div>
              <p className="font-bold underline">(............................................)</p>
            </div>
            <div>
              <p>{schoolIdentity.regency}, {new Date().toLocaleDateString("id-ID")}</p>
              <p className="font-bold">Wali Kelas {schoolIdentity.gradeClass}</p>
              <div className="h-16"></div>
              <p className="font-bold underline">{schoolIdentity.teacherName}</p>
              <p className="text-[11px] text-slate-600">NIP. {schoolIdentity.teacherNip || "-"}</p>
            </div>
          </div>
        </div>
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                Laporan Perkembangan Belajar (Kirim via WA & Email)
              </h3>
              <p className="text-xs text-slate-500">
                Kirim pesan laporan nilai, peringkat kelas, sikap, dan kedisiplinan langsung ke WhatsApp / Email Orang Tua
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Selector Bar */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Pilih Murid:</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold text-slate-900"
            >
              {classRankingList.map((item, idx) => (
                <option key={item.student.id} value={item.student.id}>
                  Rank #{idx + 1}: {item.student.name} (Rata-Rata: {item.overallAvg})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 text-indigo-900">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Peringkat ke-{currentRankingData.rank} dari {currentRankingData.totalStudents} Siswa</span>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <p className="text-[10px] uppercase font-bold text-emerald-800">Rata-Rata Nilai</p>
            <p className="text-2xl font-extrabold text-emerald-900">{currentRankingData.overallAvg}</p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
            <p className="text-[10px] uppercase font-bold text-blue-800">Total Mapel</p>
            <p className="text-2xl font-extrabold text-blue-900">{subjects.length}</p>
          </div>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
            <p className="text-[10px] uppercase font-bold text-rose-800">Pelanggaran BK</p>
            <p className="text-2xl font-extrabold text-rose-900">{incidentSummary.pelanggaran}</p>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-[10px] uppercase font-bold text-amber-800">Poin Prestasi</p>
            <p className="text-2xl font-extrabold text-amber-900">{incidentSummary.prestasi}</p>
          </div>
        </div>

        {/* Contact Info Lookup & Custom Note */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>No HP / WA Orang Tua:</span>
                  <span className="text-[10px] font-normal text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Database Lookup</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={parentPhoneInput}
                    onChange={(e) => setParentPhoneInput(e.target.value)}
                    placeholder="081234567890"
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-mono bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>Email Orang Tua:</span>
                  <span className="text-[10px] font-normal text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Database Lookup</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={parentEmailInput}
                    onChange={(e) => setParentEmailInput(e.target.value)}
                    placeholder="orangtua@gmail.com"
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-mono bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Catatan & Rekomendasi Wali Kelas untuk Orang Tua:
              </label>
              <textarea
                rows={3}
                value={customTeacherNote}
                onChange={(e) => setCustomTeacherNote(e.target.value)}
                placeholder="Tulis pesan khusus untuk orang tua murid..."
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white"
              />
            </div>
          </div>

          <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs">
            <p className="font-bold text-slate-900 border-b pb-1.5 flex items-center justify-between">
              <span>Sikap & Profil Pelajar Pancasila</span>
              <span className="text-[10px] font-normal text-slate-500">(Dapat Disesuaikan)</span>
            </p>
            <div className="space-y-2 pt-1">
              {Object.entries({
                beriman: "Beriman & Bertakwa",
                gotongRoyong: "Gotong Royong",
                bernalarKritis: "Bernalar Kritis",
                mandiri: "Kemandirian",
                kreatif: "Kreativitas",
              }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-slate-700">{label}:</span>
                  <select
                    value={(attitudeRatings as any)[key]}
                    onChange={(e) =>
                      setAttitudeRatings({ ...attitudeRatings, [key]: e.target.value })
                    }
                    className="px-2 py-1 text-[11px] border rounded-lg bg-white font-semibold text-slate-800"
                  >
                    <option value="Sangat Baik">Sangat Baik</option>
                    <option value="Baik">Baik</option>
                    <option value="Cukup">Cukup</option>
                    <option value="Perlu Bimbingan">Perlu Bimbingan</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Message Content Preview with Tabs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b pb-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActivePreviewTab("wa")}
                className={`px-3 py-1.5 rounded-t-lg font-bold text-xs flex items-center gap-1.5 transition-colors ${
                  activePreviewTab === "wa"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" /> Pratinjau Teks WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab("email")}
                className={`px-3 py-1.5 rounded-t-lg font-bold text-xs flex items-center gap-1.5 transition-colors ${
                  activePreviewTab === "email"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Mail className="w-3.5 h-3.5" /> Pratinjau Draf Email
              </button>
            </div>
            <span className="text-[11px] text-slate-500 italic">
              {activePreviewTab === "wa" ? "Format pesan WhatsApp siap kirim" : "Format surel formal"}
            </span>
          </div>

          <div className="p-3 bg-slate-900 text-slate-100 font-mono text-[11px] rounded-xl max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner border border-slate-800">
            {activePreviewTab === "wa" ? waBodyText : emailBodyText}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
          >
            Tutup
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyText}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
              title="Salin teks ke clipboard"
            >
              {copiedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copiedSuccess ? "Tersalin!" : activePreviewTab === "wa" ? "Salin Teks WA" : "Salin Teks Email"}
            </button>

            <button
              onClick={handlePrintDoc}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-indigo-600" /> Cetak / PDF
            </button>

            <button
              onClick={handleSendEmailDirect}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Mail className="w-4 h-4" /> Kirim Email
            </button>

            <button
              onClick={handleSendWhatsApp}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all transform hover:scale-[1.02]"
              title="Buka WhatsApp & Kirim Pesan Laporan ke Orang Tua"
            >
              <MessageCircle className="w-4 h-4 text-emerald-100 fill-emerald-100" />
              <span>Kirim via WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-200 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
