import React, { useState } from "react";
import { GuestBookEntry, IncidentalJournalEntry } from "../../types";
import { BookMarked, Plus, Trash2, Edit2, Download, Printer, Search, User, Calendar, FileText } from "lucide-react";
import { exportToCSV } from "../../lib/storage";
import { exportHtmlToDoc } from "../../lib/exportDoc";
import { exportGuestBookToDocx } from "../../lib/exportDocx";
import { ExportActionBar } from "../ExportActionBar";

interface IncidentalGuestBookViewProps {
  guestBook: GuestBookEntry[];
  incidentalJournals: IncidentalJournalEntry[];
  onSaveGuestBook: (updated: GuestBookEntry[]) => void;
  onSaveIncidentalJournals: (updated: IncidentalJournalEntry[]) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

export const IncidentalGuestBookView: React.FC<IncidentalGuestBookViewProps> = ({
  guestBook,
  incidentalJournals,
  onSaveGuestBook,
  onSaveIncidentalJournals,
  onOpenPrint,
}) => {
  const [activeTab, setActiveTab] = useState<"guest" | "incidental">("guest");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredGuests = guestBook.filter((g) => {
    const s = (search || "").toLowerCase();
    return (
      (g.visitorName || "").toLowerCase().includes(s) ||
      (g.institution || "").toLowerCase().includes(s) ||
      (g.purpose || "").toLowerCase().includes(s) ||
      (g.notes || "").toLowerCase().includes(s)
    );
  });

  const filteredIncidentals = incidentalJournals.filter((j) => {
    const s = (search || "").toLowerCase();
    return (
      (j.activityName || "").toLowerCase().includes(s) ||
      (j.organizer || "").toLowerCase().includes(s) ||
      (j.notes || "").toLowerCase().includes(s)
    );
  });

  const [guestForm, setGuestForm] = useState<Partial<GuestBookEntry>>({
    date: new Date().toISOString().slice(0, 10),
    time: "09.00",
  });

  const [incidentalForm, setIncidentalForm] = useState<Partial<IncidentalJournalEntry>>({
    date: new Date().toISOString().slice(0, 10),
    time: "08.00 - 12.00",
  });

  // Guest Book Actions
  const handleOpenAddGuest = () => {
    setEditingId(null);
    setGuestForm({
      date: new Date().toISOString().slice(0, 10),
      time: "09.00",
      visitorName: "",
      institution: "",
      purpose: "",
      phone: "",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditGuest = (entry: GuestBookEntry) => {
    setEditingId(entry.id);
    setGuestForm(entry);
    setIsModalOpen(true);
  };

  const handleDeleteGuest = (id: string) => {
    onSaveGuestBook(guestBook.filter((g) => g.id !== id));
  };

  const handleSaveGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestForm.visitorName) return;

    if (editingId) {
      onSaveGuestBook(
        guestBook.map((g) => (g.id === editingId ? ({ ...g, ...guestForm } as GuestBookEntry) : g))
      );
    } else {
      const newEntry: GuestBookEntry = {
        id: "gb_" + Date.now(),
        date: guestForm.date || new Date().toISOString().slice(0, 10),
        time: guestForm.time || "09.00",
        visitorName: guestForm.visitorName || "",
        institution: guestForm.institution || "",
        purpose: guestForm.purpose || "",
        phone: guestForm.phone || "",
        notes: guestForm.notes || "",
      };
      onSaveGuestBook([...guestBook, newEntry]);
    }
    setIsModalOpen(false);
  };

  // Incidental Actions
  const handleOpenAddIncidental = () => {
    setEditingId(null);
    setIncidentalForm({
      date: new Date().toISOString().slice(0, 10),
      time: "08.00 - 12.00",
      activityName: "",
      organizer: "",
      location: "",
      description: "",
      followUp: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditIncidental = (entry: IncidentalJournalEntry) => {
    setEditingId(entry.id);
    setIncidentalForm(entry);
    setIsModalOpen(true);
  };

  const handleDeleteIncidental = (id: string) => {
    onSaveIncidentalJournals(incidentalJournals.filter((j) => j.id !== id));
  };

  const handleSaveIncidental = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentalForm.activityName) return;

    if (editingId) {
      onSaveIncidentalJournals(
        incidentalJournals.map((j) =>
          j.id === editingId ? ({ ...j, ...incidentalForm } as IncidentalJournalEntry) : j
        )
      );
    } else {
      const newEntry: IncidentalJournalEntry = {
        id: "ij_" + Date.now(),
        date: incidentalForm.date || new Date().toISOString().slice(0, 10),
        time: incidentalForm.time || "08.00 - 12.00",
        activityName: incidentalForm.activityName || "",
        organizer: incidentalForm.organizer || "",
        location: incidentalForm.location || "",
        description: incidentalForm.description || "",
        followUp: incidentalForm.followUp || "",
      };
      onSaveIncidentalJournals([...incidentalJournals, newEntry]);
    }
    setIsModalOpen(false);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (activeTab === "guest") {
      const headers = ["No", "Tanggal", "Jam", "Nama Tamu", "Instansi/Jabatan", "Keperluan", "No Telp", "Kesan/Pesan"];
      const rows = guestBook.map((g, idx) => [idx + 1, g.date, g.time, g.visitorName, g.institution, g.purpose, g.phone, g.notes]);
      exportToCSV(headers, rows, "Buku_Tamu_Sekolah");
    } else {
      const headers = ["No", "Tanggal", "Waktu", "Nama Kegiatan", "Penyelenggara", "Lokasi", "Uraian Kegiatan", "Tindak Lanjut"];
      const rows = incidentalJournals.map((j, idx) => [idx + 1, j.date, j.time, j.activityName, j.organizer, j.location, j.description, j.followUp]);
      exportToCSV(headers, rows, "Jurnal_Kegiatan_Insidental");
    }
  };

  const handleExportDoc = () => {
    if (activeTab === "guest") {
      const tableHtml = `
        <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse:collapse; font-size:10pt;">
          <thead>
            <tr style="background-color:#f3f4f6; font-weight:bold;">
              <th style="border:1px solid #333; padding:5px; text-align:center;">No</th>
              <th style="border:1px solid #333; padding:5px; text-align:center;">Tanggal</th>
              <th style="border:1px solid #333; padding:5px; text-align:center;">Jam</th>
              <th style="border:1px solid #333; padding:5px; text-align:left;">Nama Tamu</th>
              <th style="border:1px solid #333; padding:5px; text-align:left;">Instansi / Jabatan</th>
              <th style="border:1px solid #333; padding:5px; text-align:left;">Keperluan</th>
              <th style="border:1px solid #333; padding:5px; text-align:left;">No. Telp</th>
              <th style="border:1px solid #333; padding:5px; text-align:left;">Kesan / Pesan</th>
            </tr>
          </thead>
          <tbody>
            ${filteredGuests
              .map(
                (g, idx) => `
              <tr>
                <td style="border:1px solid #333; padding:5px; text-align:center;">${idx + 1}</td>
                <td style="border:1px solid #333; padding:5px; text-align:center;">${g.date}</td>
                <td style="border:1px solid #333; padding:5px; text-align:center;">${g.time}</td>
                <td style="border:1px solid #333; padding:5px;">${g.visitorName}</td>
                <td style="border:1px solid #333; padding:5px;">${g.institution}</td>
                <td style="border:1px solid #333; padding:5px;">${g.purpose}</td>
                <td style="border:1px solid #333; padding:5px;">${g.phone || "-"}</td>
                <td style="border:1px solid #333; padding:5px;">${g.notes || "-"}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;

      exportHtmlToDoc({
        htmlContent: tableHtml,
        filename: "Buku_Tamu_Sekolah.doc",
        title: "BUKU TAMU DINAS & KUNJUNGAN SEKOLAH",
      });
    } else {
      const tableHtml = `
        <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse:collapse; font-size:10pt;">
          <thead>
            <tr style="background-color:#f3f4f6; font-weight:bold;">
              <th style="border:1px solid #333; padding:5px; text-align:center;">No</th>
              <th style="border:1px solid #333; padding:5px; text-align:center;">Tanggal</th>
              <th style="border:1px solid #333; padding:5px; text-align:center;">Waktu</th>
              <th style="border:1px solid #333; padding:5px; text-align:left;">Nama Kegiatan</th>
              <th style="border:1px solid #333; padding:5px; text-align:left;">Penyelenggara & Lokasi</th>
              <th style="border:1px solid #333; padding:5px; text-align:left;">Uraian Kegiatan</th>
              <th style="border:1px solid #333; padding:5px; text-align:left;">Tindak Lanjut</th>
            </tr>
          </thead>
          <tbody>
            ${filteredIncidentals
              .map(
                (j, idx) => `
              <tr>
                <td style="border:1px solid #333; padding:5px; text-align:center;">${idx + 1}</td>
                <td style="border:1px solid #333; padding:5px; text-align:center;">${j.date}</td>
                <td style="border:1px solid #333; padding:5px; text-align:center;">${j.time}</td>
                <td style="border:1px solid #333; padding:5px;">${j.activityName}</td>
                <td style="border:1px solid #333; padding:5px;">${j.organizer} (${j.location})</td>
                <td style="border:1px solid #333; padding:5px;">${j.description}</td>
                <td style="border:1px solid #333; padding:5px;">${j.followUp || "-"}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;

      exportHtmlToDoc({
        htmlContent: tableHtml,
        filename: "Jurnal_Kegiatan_Insidental.doc",
        title: "JURNAL KEGIATAN INSIDENTAL & KHUSUS SEKOLAH",
      });
    }
  };

  // Print
  const handlePrint = () => {
    if (activeTab === "guest") {
      onOpenPrint(
        "BUKU TAMU DINAS & KUNJUNGAN SEKOLAH",
        "Catatan Tamu Kunjungan Pembinaan & Supervisi",
        (
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-800">
                <th className="border border-slate-300 p-2 w-8 text-center">No</th>
                <th className="border border-slate-300 p-2 text-center w-20">Tanggal</th>
                <th className="border border-slate-300 p-2 text-left">Nama Tamu</th>
                <th className="border border-slate-300 p-2 text-left">Instansi / Jabatan</th>
                <th className="border border-slate-300 p-2 text-left">Maksud / Keperluan</th>
                <th className="border border-slate-300 p-2 text-left">Kesan & Pesan</th>
              </tr>
            </thead>
            <tbody>
              {guestBook.map((g, idx) => (
                <tr key={g.id} className="odd:bg-white even:bg-slate-50">
                  <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                  <td className="border border-slate-300 p-2 text-center font-mono">{g.date}</td>
                  <td className="border border-slate-300 p-2 font-bold">{g.visitorName}</td>
                  <td className="border border-slate-300 p-2">{g.institution}</td>
                  <td className="border border-slate-300 p-2">{g.purpose}</td>
                  <td className="border border-slate-300 p-2 italic">{g.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      );
    } else {
      onOpenPrint(
        "JURNAL KEGIATAN INSIDENTAL & KHUSUS SEKOLAH",
        "Dokumentasi Kegiatan di Luar Jam Mengajar Rutin",
        (
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-800">
                <th className="border border-slate-300 p-2 w-8 text-center">No</th>
                <th className="border border-slate-300 p-2 text-center w-24">Tanggal / Waktu</th>
                <th className="border border-slate-300 p-2 text-left">Nama Kegiatan</th>
                <th className="border border-slate-300 p-2 text-left">Penyelenggara & Lokasi</th>
                <th className="border border-slate-300 p-2 text-left">Uraian Kegiatan</th>
                <th className="border border-slate-300 p-2 text-left">Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody>
              {incidentalJournals.map((j, idx) => (
                <tr key={j.id} className="odd:bg-white even:bg-slate-50">
                  <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                  <td className="border border-slate-300 p-2 text-center font-mono">{j.date}<br/>({j.time})</td>
                  <td className="border border-slate-300 p-2 font-bold">{j.activityName}</td>
                  <td className="border border-slate-300 p-2">{j.organizer} @ {j.location}</td>
                  <td className="border border-slate-300 p-2">{j.description}</td>
                  <td className="border border-slate-300 p-2 font-medium text-emerald-800">{j.followUp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-emerald-600" />
            Jurnal Insidental & Buku Tamu
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan tamu dinas/supervisi dan jurnal kegiatan khusus di luar jam mengajar
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("guest")}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === "guest"
                ? "bg-white text-emerald-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Buku Tamu Dinas
          </button>
          <button
            onClick={() => setActiveTab("incidental")}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === "incidental"
                ? "bg-white text-emerald-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Jurnal Insidental
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <ExportActionBar
        title={activeTab === "guest" ? "BUKU TAMU DINAS SEKOLAH" : "JURNAL KEGIATAN INSIDENTAL"}
        filename={activeTab === "guest" ? "Buku_Tamu_Sekolah" : "Jurnal_Kegiatan_Insidental"}
        headers={
          activeTab === "guest"
            ? ["No", "Tanggal", "Jam", "Nama Tamu", "Instansi/Jabatan", "Keperluan", "No Telp", "Kesan/Pesan"]
            : ["No", "Tanggal", "Waktu", "Nama Kegiatan", "Penyelenggara", "Lokasi", "Uraian Kegiatan", "Tindak Lanjut"]
        }
        rows={
          activeTab === "guest"
            ? guestBook.map((g, idx) => [idx + 1, g.date, g.time, g.visitorName, g.institution, g.purpose, g.phone || "-", g.notes || "-"])
            : incidentalJournals.map((j, idx) => [idx + 1, j.date, j.time, j.activityName, j.organizer, j.location, j.description, j.followUp || "-"])
        }
        onOpenPrintModal={handlePrint}
        customButtons={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-44 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari..."
                className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800"
              />
            </div>
            {activeTab === "guest" ? (
              <button
                onClick={handleOpenAddGuest}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Tamu
              </button>
            ) : (
              <button
                onClick={handleOpenAddIncidental}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Kegiatan
              </button>
            )}
          </div>
        }
      />

      {/* TAB 1: BUKU TAMU */}
      {activeTab === "guest" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3 text-center w-12">No</th>
                  <th className="px-4 py-3">Tanggal & Waktu</th>
                  <th className="px-4 py-3">Nama Tamu & Instansi</th>
                  <th className="px-4 py-3">Keperluan Dinas</th>
                  <th className="px-4 py-3">Kesan / Pesan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGuests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      Belum ada catatan buku tamu.
                    </td>
                  </tr>
                ) : (
                  filteredGuests.map((g, idx) => (
                    <tr key={g.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {g.date} <span className="text-emerald-700">({g.time})</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 block">{g.visitorName}</span>
                        <span className="text-[11px] text-slate-500 block">{g.institution}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium">{g.purpose}</td>
                      <td className="px-4 py-3 text-slate-600 italic">{g.notes || "-"}</td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEditGuest(g)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGuest(g.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: JURNAL INSIDENTAL */}
      {activeTab === "incidental" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3 text-center w-12">No</th>
                  <th className="px-4 py-3">Tanggal & Jam</th>
                  <th className="px-4 py-3">Nama Kegiatan</th>
                  <th className="px-4 py-3">Penyelenggara & Lokasi</th>
                  <th className="px-4 py-3">Uraian / Hasil Kegiatan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIncidentals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      Belum ada jurnal kegiatan insidental.
                    </td>
                  </tr>
                ) : (
                  filteredIncidentals.map((j, idx) => (
                    <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {j.date} <span className="text-emerald-700 block text-[10px]">{j.time}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">{j.activityName}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <b>{j.organizer}</b>
                        <span className="block text-[11px]">{j.location}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-800">{j.description}</td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEditIncidental(j)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteIncidental(j.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Guest or Incidental */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              {activeTab === "guest"
                ? editingId
                  ? "Edit Catatan Tamu"
                  : "Tambah Tamu Baru"
                : editingId
                ? "Edit Jurnal Insidental"
                : "Tambah Kegiatan Insidental"}
            </h3>

            {activeTab === "guest" ? (
              <form onSubmit={handleSaveGuest} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Tanggal</label>
                    <input
                      type="date"
                      required
                      value={guestForm.date || ""}
                      onChange={(e) => setGuestForm((prev) => ({ ...prev, date: e.target.value }))}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Jam Kedatangan</label>
                    <input
                      type="text"
                      placeholder="09.30"
                      value={guestForm.time || ""}
                      onChange={(e) => setGuestForm((prev) => ({ ...prev, time: e.target.value }))}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Nama Tamu & Gelar</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Drs. Budi Santoso"
                    value={guestForm.visitorName || ""}
                    onChange={(e) => setGuestForm((prev) => ({ ...prev, visitorName: e.target.value }))}
                    className="w-full p-2 border rounded-lg font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Instansi / Jabatan</label>
                  <input
                    type="text"
                    placeholder="Pengawas Dinas Pendidikan..."
                    value={guestForm.institution || ""}
                    onChange={(e) => setGuestForm((prev) => ({ ...prev, institution: e.target.value }))}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Maksud & Keperluan Dinas</label>
                  <textarea
                    rows={2}
                    placeholder="Tujuan kunjungan..."
                    value={guestForm.purpose || ""}
                    onChange={(e) => setGuestForm((prev) => ({ ...prev, purpose: e.target.value }))}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Kesan & Pesan Tamu</label>
                  <input
                    type="text"
                    placeholder="Catatan dari tamu..."
                    value={guestForm.notes || ""}
                    onChange={(e) => setGuestForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg"
                  >
                    Simpan Tamu
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveIncidental} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Tanggal</label>
                    <input
                      type="date"
                      required
                      value={incidentalForm.date || ""}
                      onChange={(e) => setIncidentalForm((prev) => ({ ...prev, date: e.target.value }))}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Waktu / Jam</label>
                    <input
                      type="text"
                      placeholder="08.00 - 12.00"
                      value={incidentalForm.time || ""}
                      onChange={(e) => setIncidentalForm((prev) => ({ ...prev, time: e.target.value }))}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Nama Kegiatan</label>
                  <input
                    type="text"
                    required
                    placeholder="Peringatan HUT RI / Rapat KKG..."
                    value={incidentalForm.activityName || ""}
                    onChange={(e) => setIncidentalForm((prev) => ({ ...prev, activityName: e.target.value }))}
                    className="w-full p-2 border rounded-lg font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Penyelenggara</label>
                    <input
                      type="text"
                      placeholder="Panitia / Dinas..."
                      value={incidentalForm.organizer || ""}
                      onChange={(e) => setIncidentalForm((prev) => ({ ...prev, organizer: e.target.value }))}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Lokasi</label>
                    <input
                      type="text"
                      placeholder="Lapangan / Aula..."
                      value={incidentalForm.location || ""}
                      onChange={(e) => setIncidentalForm((prev) => ({ ...prev, location: e.target.value }))}
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Uraian Ringkas Kegiatan</label>
                  <textarea
                    rows={2}
                    value={incidentalForm.description || ""}
                    onChange={(e) => setIncidentalForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Rencana Tindak Lanjut</label>
                  <input
                    type="text"
                    placeholder="Tindak lanjut..."
                    value={incidentalForm.followUp || ""}
                    onChange={(e) => setIncidentalForm((prev) => ({ ...prev, followUp: e.target.value }))}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg"
                  >
                    Simpan Jurnal Insidental
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
