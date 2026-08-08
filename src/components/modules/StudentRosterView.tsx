import React, { useState, useRef } from "react";
import { Student } from "../../types";
import { Users, Plus, Trash2, Edit2, Download, Upload, Search, Printer, Check, X, UserPlus, Columns, FileText } from "lucide-react";
import { exportToCSV, exportDataToJSON } from "../../lib/storage";
import { exportHtmlToDoc } from "../../lib/exportDoc";
import { exportStudentsToExcel } from "../../lib/exportExcel";

interface StudentRosterViewProps {
  students: Student[];
  onSaveStudents: (students: Student[]) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

export const StudentRosterView: React.FC<StudentRosterViewProps> = ({
  students,
  onSaveStudents,
  onOpenPrint,
}) => {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Student>>({});
  const [isAddingModal, setIsAddingModal] = useState(false);
  const [batchText, setBatchText] = useState("");
  const [isBatchModal, setIsBatchModal] = useState(false);

  // Custom Columns State
  const [customColumns, setCustomColumns] = useState<string[]>(["Alamat", "No HP Orang Tua"]);
  const [isAddColumnModal, setIsAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  // Row Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredStudents = students.filter(
    (s) =>
      (s.name || "").toLowerCase().includes((search || "").toLowerCase()) ||
      (s.nis || "").includes(search) ||
      (s.nisn || "").includes(search)
  );

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredStudents.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const updated = students.filter((s) => !selectedIds.includes(s.id));
    onSaveStudents(updated);
    setSelectedIds([]);
  };

  const handleStartEdit = (student: Student) => {
    setEditingId(student.id);
    setEditForm({ ...student, customFields: { ...student.customFields } });
  };

  const handleSaveEdit = () => {
    if (!editingId || !editForm.name) return;
    const updated = students.map((s) => (s.id === editingId ? ({ ...s, ...editForm } as Student) : s));
    onSaveStudents(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const updated = students.filter((s) => s.id !== id);
    onSaveStudents(updated);
    setSelectedIds((prev) => prev.filter((i) => i !== id));
  };

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name || !editForm.nis) return;
    const newStudent: Student = {
      id: "s_" + Date.now(),
      nis: editForm.nis || "",
      nisn: editForm.nisn || "",
      name: editForm.name,
      gender: (editForm.gender as "L" | "P") || "L",
      parentName: editForm.parentName || "",
      parentEmail: editForm.parentEmail || "",
      parentPhone: editForm.parentPhone || "",
      customFields: editForm.customFields || {},
    };
    onSaveStudents([...students, newStudent]);
    setEditForm({});
    setIsAddingModal(false);
  };

  const handleBatchAdd = () => {
    if (!batchText.trim()) return;
    const lines = batchText.split("\n");
    const newItems: Student[] = [];
    lines.forEach((line, idx) => {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 2) {
        newItems.push({
          id: `s_batch_${Date.now()}_${idx}`,
          nis: parts[0] || `2425${100 + idx}`,
          nisn: parts[1] || "",
          name: parts[2] || parts[0],
          gender: (parts[3] as "L" | "P") || "L",
          parentEmail: parts[4] || "",
          parentPhone: parts[5] || "",
        });
      } else if (line.trim()) {
        newItems.push({
          id: `s_batch_${Date.now()}_${idx}`,
          nis: `2425${100 + students.length + idx}`,
          nisn: "",
          name: line.trim(),
          gender: "L",
        });
      }
    });
    onSaveStudents([...students, ...newItems]);
    setBatchText("");
    setIsBatchModal(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) return;

      const newStudents: Student[] = [];
      const startIdx = lines[0].toLowerCase().includes("nama") || lines[0].toLowerCase().includes("nis") ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const row = lines[i].split(/[,;\t]/).map((c) => c.trim().replace(/^["']|["']$/g, ""));
        if (row.length === 0 || !row[0]) continue;

        let nis = "";
        let nisn = "";
        let name = "";
        let gender: "L" | "P" = "L";
        let parentEmail = "";
        let parentPhone = "";

        if (row.length >= 6) {
          nis = row[0];
          nisn = row[1];
          name = row[2];
          gender = row[3].toUpperCase().startsWith("P") ? "P" : "L";
          parentEmail = row[4];
          parentPhone = row[5];
        } else if (row.length >= 4) {
          nis = row[0];
          nisn = row[1];
          name = row[2];
          gender = row[3].toUpperCase().startsWith("P") ? "P" : "L";
        } else if (row.length === 3) {
          nis = row[0];
          name = row[1];
          gender = row[2].toUpperCase().startsWith("P") ? "P" : "L";
        } else {
          name = row[0];
          nis = `2425${100 + students.length + newStudents.length}`;
        }

        if (name) {
          newStudents.push({
            id: `s_csv_${Date.now()}_${i}`,
            nis,
            nisn,
            name,
            gender,
            parentEmail,
            parentPhone,
          });
        }
      }

      if (newStudents.length > 0) {
        onSaveStudents([...students, ...newStudents]);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;
    const col = newColumnName.trim();
    if (!customColumns.includes(col)) {
      setCustomColumns([...customColumns, col]);
    }
    setNewColumnName("");
    setIsAddColumnModal(false);
  };

  const handleDeleteColumn = (colName: string) => {
    setCustomColumns(customColumns.filter((c) => c !== colName));
  };

  const handleExportCSV = () => {
    const headers = ["No", "NIS", "NISN", "Nama Lengkap Murid", "Jenis Kelamin", "Email Orang Tua", "No HP Orang Tua", ...customColumns];
    const rows = students.map((s, idx) => [
      idx + 1,
      s.nis,
      s.nisn,
      s.name,
      s.gender === "L" ? "Laki-laki" : "Perempuan",
      s.parentEmail || s.customFields?.["Email Orang Tua"] || "-",
      s.parentPhone || s.customFields?.["No HP Orang Tua"] || "-",
      ...customColumns.map((col) => s.customFields?.[col] || "-"),
    ]);
    exportToCSV(headers, rows, "Daftar_Murid_Kelas");
  };

  const handleExportDoc = () => {
    const tableHtml = `
      <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse:collapse; font-size:10pt;">
        <thead>
          <tr style="background-color:#f3f4f6; font-weight:bold;">
            <th style="border:1px solid #333; padding:5px; text-align:center;">No</th>
            <th style="border:1px solid #333; padding:5px; text-align:center;">NIS</th>
            <th style="border:1px solid #333; padding:5px; text-align:center;">NISN</th>
            <th style="border:1px solid #333; padding:5px; text-align:left;">Nama Lengkap Murid</th>
            <th style="border:1px solid #333; padding:5px; text-align:center;">JK</th>
            <th style="border:1px solid #333; padding:5px; text-align:left;">Email Orang Tua</th>
            <th style="border:1px solid #333; padding:5px; text-align:left;">No HP / WA OrtU</th>
            ${customColumns.map((col) => `<th style="border:1px solid #333; padding:5px; text-align:left;">${col}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${students
            .map(
              (s, idx) => `
            <tr>
              <td style="border:1px solid #333; padding:5px; text-align:center;">${idx + 1}</td>
              <td style="border:1px solid #333; padding:5px; text-align:center;">${s.nis || "-"}</td>
              <td style="border:1px solid #333; padding:5px; text-align:center;">${s.nisn || "-"}</td>
              <td style="border:1px solid #333; padding:5px;">${s.name}</td>
              <td style="border:1px solid #333; padding:5px; text-align:center;">${s.gender}</td>
              <td style="border:1px solid #333; padding:5px;">${s.parentEmail || s.customFields?.["Email Orang Tua"] || "-"}</td>
              <td style="border:1px solid #333; padding:5px;">${s.parentPhone || s.customFields?.["No HP Orang Tua"] || "-"}</td>
              ${customColumns.map((col) => `<td style="border:1px solid #333; padding:5px;">${s.customFields?.[col] || "-"}</td>`).join("")}
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

    exportHtmlToDoc({
      htmlContent: tableHtml,
      filename: "Daftar_Induk_Murid.doc",
      title: "DAFTAR INDUK MURID KELAS",
    });
  };

  const handlePrint = () => {
    onOpenPrint(
      "DAFTAR INDUK MURID KELAS",
      `Total Siswa: ${students.length} Anak (${students.filter((s) => s.gender === "L").length} Laki-laki, ${students.filter((s) => s.gender === "P").length} Perempuan)`,
      (
        <table className="w-full border-collapse border border-slate-300 text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-800 font-bold">
              <th className="border border-slate-300 p-2 text-center w-10">No</th>
              <th className="border border-slate-300 p-2 text-center">NIS</th>
              <th className="border border-slate-300 p-2 text-center">NISN</th>
              <th className="border border-slate-300 p-2 text-left">Nama Lengkap Murid</th>
              <th className="border border-slate-300 p-2 text-center w-24">JK (L/P)</th>
              <th className="border border-slate-300 p-2 text-left">Email Orang Tua</th>
              <th className="border border-slate-300 p-2 text-left">No HP / WA OrtU</th>
              {customColumns.map((col) => (
                <th key={col} className="border border-slate-300 p-2 text-left">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s, idx) => (
              <tr key={s.id} className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                <td className="border border-slate-300 p-2 text-center font-mono">{s.nis}</td>
                <td className="border border-slate-300 p-2 text-center font-mono">{s.nisn}</td>
                <td className="border border-slate-300 p-2 font-medium">{s.name}</td>
                <td className="border border-slate-300 p-2 text-center font-bold">{s.gender}</td>
                <td className="border border-slate-300 p-2">{s.parentEmail || s.customFields?.["Email Orang Tua"] || "-"}</td>
                <td className="border border-slate-300 p-2">{s.parentPhone || s.customFields?.["No HP Orang Tua"] || "-"}</td>
                {customColumns.map((col) => (
                  <td key={col} className="border border-slate-300 p-2">{s.customFields?.[col] || "-"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv,.txt,.xlsx,.xls"
        className="hidden"
      />

      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            Daftar Induk Murid ({students.length} Siswa)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Kelola data murid, tambah/edit/hapus baris & kolom, serta unggah CSV/Excel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddingModal(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Murid
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
            title="Unggah file CSV atau Excel"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            Unggah CSV/Excel
          </button>
          <button
            onClick={() => setIsAddColumnModal(true)}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Columns className="w-4 h-4 text-amber-600" />
            Tambah Kolom
          </button>
          <button
            onClick={() => setIsBatchModal(true)}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <UserPlus className="w-4 h-4 text-indigo-600" />
            Input Massal
          </button>
          <button
            onClick={() => exportStudentsToExcel(students)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            title="Ekspor ke Format Excel (.xlsx)"
          >
            <Download className="w-4 h-4 text-emerald-100" />
            Ekspor Excel (.xlsx)
          </button>
          <button
            onClick={handleExportDoc}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            title="Simpan dalam bentuk Word (.docx / .doc)"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            Simpan Word (.docx)
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
            title="Cetak Laporan / PDF"
          >
            <Printer className="w-4 h-4" />
            Cetak / PDF
          </button>
        </div>
      </div>

      {/* Filter & Batch Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama, NIS, atau NISN..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg text-xs">
            <span className="font-semibold text-rose-800">{selectedIds.length} murid dipilih</span>
            <button
              onClick={handleDeleteSelected}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded flex items-center gap-1 text-[11px]"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus Terpilih
            </button>
          </div>
        )}

        <div className="text-xs text-slate-500 font-medium">
          Laki-laki: <b>{students.filter((s) => s.gender === "L").length}</b> | Perempuan: <b>{students.filter((s) => s.gender === "P").length}</b>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-3 py-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="px-3 py-3 text-center w-12">No</th>
                <th className="px-4 py-3">NIS</th>
                <th className="px-4 py-3">NISN</th>
                <th className="px-4 py-3">Nama Lengkap Murid</th>
                <th className="px-4 py-3 text-center">JK</th>
                <th className="px-4 py-3 bg-indigo-50/50 text-indigo-900 border-l border-indigo-200/50">Email Orang Tua</th>
                <th className="px-4 py-3 bg-emerald-50/50 text-emerald-900 border-l border-emerald-200/50">No HP / WA Orang Tua</th>
                {customColumns.map((colName) => (
                  <th key={colName} className="px-4 py-3 bg-amber-50/50 text-amber-900 border-l border-amber-200/50">
                    <div className="flex items-center justify-between gap-1">
                      <span>{colName}</span>
                      <button
                        onClick={() => handleDeleteColumn(colName)}
                        className="text-amber-700 hover:text-rose-600 p-0.5"
                        title="Hapus Kolom ini"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6 + customColumns.length} className="text-center py-8 text-slate-400">
                    Tidak ada data murid yang sesuai pencarian.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => (
                  <tr key={s.id} className={`hover:bg-slate-50/80 transition-colors ${selectedIds.includes(s.id) ? "bg-emerald-50/40" : ""}`}>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(s.id)}
                        onChange={() => handleToggleSelect(s.id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-3 py-3 text-center font-medium text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                      {editingId === s.id ? (
                        <input
                          type="text"
                          value={editForm.nis ?? s.nis}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, nis: e.target.value }))}
                          className="px-2 py-1 text-xs border rounded w-24"
                        />
                      ) : (
                        s.nis
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {editingId === s.id ? (
                        <input
                          type="text"
                          value={editForm.nisn ?? s.nisn}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, nisn: e.target.value }))}
                          className="px-2 py-1 text-xs border rounded w-28"
                        />
                      ) : (
                        s.nisn || "-"
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {editingId === s.id ? (
                        <input
                          type="text"
                          value={editForm.name ?? s.name}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="px-2 py-1 text-xs border rounded w-full"
                        />
                      ) : (
                        s.name
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editingId === s.id ? (
                        <select
                          value={editForm.gender ?? s.gender}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, gender: e.target.value as "L" | "P" }))}
                          className="px-2 py-1 text-xs border rounded bg-white"
                        >
                          <option value="L">L</option>
                          <option value="P">P</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            s.gender === "L"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-pink-100 text-pink-800"
                          }`}
                        >
                          {s.gender === "L" ? "Laki-laki (L)" : "Perempuan (P)"}
                        </span>
                      )}
                    </td>
                    {/* Email Orang Tua */}
                    <td className="px-4 py-3 bg-indigo-50/20 border-l border-indigo-100 font-mono text-slate-700">
                      {editingId === s.id ? (
                        <input
                          type="email"
                          value={editForm.parentEmail ?? s.parentEmail ?? s.customFields?.["Email Orang Tua"] ?? ""}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, parentEmail: e.target.value }))}
                          className="px-2 py-1 text-xs border rounded w-full bg-white"
                          placeholder="email@gmail.com"
                        />
                      ) : (
                        <span className="text-slate-700">{s.parentEmail || s.customFields?.["Email Orang Tua"] || "-"}</span>
                      )}
                    </td>
                    {/* No HP / WA Orang Tua */}
                    <td className="px-4 py-3 bg-emerald-50/20 border-l border-emerald-100 font-mono text-slate-700">
                      {editingId === s.id ? (
                        <input
                          type="text"
                          value={editForm.parentPhone ?? s.parentPhone ?? s.customFields?.["No HP Orang Tua"] ?? ""}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, parentPhone: e.target.value }))}
                          className="px-2 py-1 text-xs border rounded w-full bg-white"
                          placeholder="081234567890"
                        />
                      ) : (
                        <span className="text-slate-700">{s.parentPhone || s.customFields?.["No HP Orang Tua"] || "-"}</span>
                      )}
                    </td>
                    {customColumns.map((colName) => (
                      <td key={colName} className="px-4 py-3 bg-amber-50/20 border-l border-amber-100">
                        {editingId === s.id ? (
                          <input
                            type="text"
                            value={editForm.customFields?.[colName] ?? s.customFields?.[colName] ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditForm((prev) => ({
                                ...prev,
                                customFields: {
                                  ...prev.customFields,
                                  [colName]: val,
                                },
                              }));
                            }}
                            className="px-2 py-1 text-xs border rounded w-full bg-white"
                            placeholder="..."
                          />
                        ) : (
                          <span className="text-slate-600">{s.customFields?.[colName] || "-"}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      {editingId === s.id ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                            title="Simpan"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                            title="Batal"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(s)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Custom Column Modal */}
      {isAddColumnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Columns className="w-5 h-5 text-amber-600" />
              Tambah Kolom Kustom Baru
            </h3>
            <p className="text-xs text-slate-500">
              Masukkan nama header kolom baru (contoh: Alamat, Agama, Hobi, Nama Orang Tua, No HP).
            </p>
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="Nama Kolom..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddColumnModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddColumn}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg"
              >
                Tambah Kolom
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">Tambah Murid Baru</h3>
            <form onSubmit={handleAddSingle} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Nama Lengkap Murid</label>
                <input
                  type="text"
                  required
                  value={editForm.name || ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Contoh: Budi Pratama"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">NIS</label>
                  <input
                    type="text"
                    required
                    value={editForm.nis || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, nis: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="2425021"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">NISN (Opsional)</label>
                  <input
                    type="text"
                    value={editForm.nisn || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, nisn: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="0145..."
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Jenis Kelamin</label>
                <select
                  value={editForm.gender || "L"}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, gender: e.target.value as "L" | "P" }))}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Email Orang Tua</label>
                  <input
                    type="email"
                    value={editForm.parentEmail || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, parentEmail: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="ortu@gmail.com"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">No HP / WA Orang Tua</label>
                  <input
                    type="text"
                    value={editForm.parentPhone || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, parentPhone: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="081234567890"
                  />
                </div>
              </div>

              {customColumns.map((colName) => (
                <div key={colName}>
                  <label className="block font-semibold mb-1">{colName}</label>
                  <input
                    type="text"
                    value={editForm.customFields?.[colName] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditForm((prev) => ({
                        ...prev,
                        customFields: { ...prev.customFields, [colName]: val },
                      }));
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder={`Isi ${colName}...`}
                  />
                </div>
              ))}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddingModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                >
                  Simpan Murid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Add Modal */}
      {isBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">Input Massal Daftar Murid</h3>
            <p className="text-xs text-slate-500">
              Salin dan tempel daftar nama murid. Format: <code>NIS, NISN, Nama Lengkap, JK(L/P)</code> atau cukup nama murid per baris:
            </p>
            <textarea
              rows={8}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder="2425021, 0145829121, Muhammad Aris, L&#10;2425022, 0145829122, Nabila Rahma, P&#10;Dedi Kurniawan"
              className="w-full px-3 py-2 border text-xs font-mono rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBatchModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBatchAdd}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg"
              >
                Proses Tambah Massal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
