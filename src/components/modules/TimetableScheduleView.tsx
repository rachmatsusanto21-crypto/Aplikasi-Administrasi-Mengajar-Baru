import React, { useState } from "react";
import { TimetableSlot } from "../../types";
import { CalendarDays, Plus, Trash2, Edit2, Printer, Download, Save, Clock, Palette, ExternalLink } from "lucide-react";
import { exportToCSV } from "../../lib/storage";
import { exportTimetableToExcel } from "../../lib/exportExcel";

interface TimetableScheduleViewProps {
  timetable: TimetableSlot[];
  onSaveTimetable: (updated: TimetableSlot[]) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

export const TimetableScheduleView: React.FC<TimetableScheduleViewProps> = ({
  timetable,
  onSaveTimetable,
  onOpenPrint,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const days: ("Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | "Sabtu")[] = [
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ];

  // Helper time ranges for periods 1..12
  const getDefaultTimeRange = (periodNum: number): string => {
    const timeSlots: Record<number, string> = {
      1: "07.00 - 07.35",
      2: "07.35 - 08.10",
      3: "08.10 - 08.45",
      4: "08.45 - 09.20",
      5: "09.35 - 10.10",
      6: "10.10 - 10.45",
      7: "10.45 - 11.20",
      8: "11.20 - 11.55",
      9: "12.30 - 13.05",
      10: "13.05 - 13.40",
      11: "13.40 - 14.15",
      12: "14.15 - 14.50",
    };
    return timeSlots[periodNum] || `Jam ke-${periodNum}`;
  };

  // Default display periods is 1..10, automatically expand if slots have higher period numbers
  const [periods, setPeriods] = useState<number[]>(() => {
    const maxP = timetable.length > 0 ? Math.max(10, ...timetable.map((t) => t.period || 0)) : 10;
    return Array.from({ length: maxP }, (_, i) => i + 1);
  });

  React.useEffect(() => {
    if (timetable && timetable.length > 0) {
      const maxP = Math.max(10, ...timetable.map((t) => t.period || 0));
      setPeriods((prev) => {
        const currentMax = prev.length > 0 ? Math.max(...prev) : 0;
        if (maxP > currentMax) {
          return Array.from({ length: maxP }, (_, i) => i + 1);
        }
        return prev;
      });
    }
  }, [timetable]);

  const handleAddPeriodRow = () => {
    const nextPeriod = periods.length > 0 ? Math.max(...periods) + 1 : 1;
    setPeriods([...periods, nextPeriod]);
  };

  const handleRemovePeriodRow = (pNum: number) => {
    setPeriods(periods.filter((p) => p !== pNum));
    onSaveTimetable(timetable.filter((t) => t.period !== pNum));
  };

  const [form, setForm] = useState<Partial<TimetableSlot>>({
    day: "Senin",
    period: 1,
    timeRange: "07.00 - 07.35",
    subject: "Bahasa Indonesia",
    roomOrTeacher: "Rachmat S.",
  });

  const getSlot = (day: string, period: number) => {
    return timetable.find((t) => t.day === day && t.period === period);
  };

  const handleDeleteSlot = (id: string) => {
    onSaveTimetable(timetable.filter((t) => t.id !== id));
  };

  const handleOpenAddSlot = (day: "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | "Sabtu", period: number) => {
    const existing = getSlot(day, period);
    if (existing) {
      setEditingId(existing.id);
      setForm(existing);
    } else {
      setEditingId(null);
      setForm({
        day,
        period,
        timeRange: getDefaultTimeRange(period),
        subject: "Bahasa Indonesia",
        roomOrTeacher: "Guru Kelas",
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject) return;

    const targetDay = form.day as string;
    const targetPeriod = form.period || 1;

    // Remove any existing slot with same ID or same (day, period) to prevent duplicate rows
    const cleaned = (timetable || []).filter(
      (t) => t.id !== editingId && !(t.day === targetDay && t.period === targetPeriod)
    );

    const savedSlot: TimetableSlot = {
      id: editingId || "tt_" + Date.now(),
      day: targetDay as any,
      period: targetPeriod,
      timeRange: form.timeRange || getDefaultTimeRange(targetPeriod),
      subject: form.subject || "",
      roomOrTeacher: form.roomOrTeacher || "",
    };

    onSaveTimetable([...cleaned, savedSlot]);
    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    const headers = ["Hari", "Jam Ke-", "Waktu", "Mata Pelajaran", "Guru / Ruangan"];
    const rows = timetable.map((t) => [t.day, t.period, t.timeRange, t.subject, t.roomOrTeacher || ""]);
    exportToCSV(headers, rows, "Jadwal_Pelajaran_Kelas");
  };

  const handlePrint = () => {
    onOpenPrint(
      "JADWAL PELAJARAN KELAS & MAPEL",
      "Struktur Pembelajaran Mingguan",
      (
        <table className="w-full border-collapse border border-slate-300 text-xs">
          <thead>
            <tr className="bg-slate-100 font-bold text-slate-800">
              <th className="border border-slate-300 p-2 text-center w-28">Jam & Waktu</th>
              {days.map((d) => (
                <th key={d} className="border border-slate-300 p-2 text-center">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => {
              const defaultTime = getDefaultTimeRange(p);
              return (
                <tr key={p}>
                  <td className="border border-slate-300 p-1.5 text-center bg-slate-50">
                    <div className="font-bold text-slate-900">Ke-{p}</div>
                    <div className="text-[10px] text-emerald-800 font-mono font-semibold whitespace-nowrap">
                      {defaultTime}
                    </div>
                  </td>
                  {days.map((d) => {
                    const slot = getSlot(d, p);
                    return (
                      <td key={d} className="border border-slate-300 p-2 text-center">
                        {slot ? (
                          <div>
                            <p className="font-bold text-slate-900">{slot.subject}</p>
                            <p className="text-[10px] text-slate-600">{slot.roomOrTeacher || "Guru Kelas"}</p>
                            <p className="text-[9px] font-mono text-emerald-700">{slot.timeRange || defaultTime}</p>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-emerald-600" />
            Jadwal Pelajaran Mingguan
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Penataan struktur waktu dan mata pelajaran mingguan (Senin s.d. Sabtu)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleAddPeriodRow}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Baris
          </button>
          <button
            onClick={() => exportTimetableToExcel(timetable, periods, [])}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            title="Ekspor ke Excel (.xlsx)"
          >
            <Download className="w-4 h-4 text-emerald-100" />
            Ekspor Excel (.xlsx)
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Cetak Jadwal
          </button>
        </div>
      </div>

      {/* Grid Timetable */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-3 border border-slate-800 w-16">Jam Ke</th>
                {days.map((d) => (
                  <th key={d} className="p-3 border border-slate-800 min-w-[130px]">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {periods.map((p) => (
                <tr key={p} className="hover:bg-slate-50/50">
                  <td className="p-2 font-bold bg-slate-100 border border-slate-200 text-slate-700 relative group">
                    <span>{p}</span>
                    {periods.length > 1 && (
                      <button
                        onClick={() => handleRemovePeriodRow(p)}
                        className="absolute left-1 top-1.5 opacity-0 group-hover:opacity-100 text-rose-600 hover:text-rose-800 p-0.5"
                        title={`Hapus Baris Jam ke-${p}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                  {days.map((d) => {
                    const slot = getSlot(d, p);
                    return (
                      <td
                        key={d}
                        onClick={() => handleOpenAddSlot(d, p)}
                        className={`p-2 border border-slate-200 cursor-pointer transition-all hover:bg-emerald-50/60 ${
                          slot ? "bg-emerald-50/30" : "bg-white"
                        }`}
                      >
                        {slot ? (
                          <div className="group relative p-2 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-0.5 text-left">
                            <span className="font-bold text-slate-900 text-xs block leading-tight">
                              {slot.subject}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {slot.roomOrTeacher || "Guru Kelas"}
                            </span>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[9px] font-mono text-emerald-700 block">
                                {slot.timeRange}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const query = encodeURIComponent(`Media Pembelajaran ${slot.subject} SD`);
                                  window.open(`https://www.canva.com/search?q=${query}`, "_blank");
                                }}
                                className="px-1.5 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-800 text-[9px] font-extrabold rounded flex items-center gap-0.5 border border-teal-200"
                                title={`Buka Template Media ${slot.subject} di Canva`}
                              >
                                <Palette className="w-2.5 h-2.5 text-teal-600" />
                                <span>Canva</span>
                              </button>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSlot(slot.id);
                              }}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                              title="Hapus"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-medium italic">
                            + Isian Jam {p}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500">Total Baris Jam Pelajaran: <b>{periods.length} Jam</b></span>
          <button
            onClick={handleAddPeriodRow}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Baris Jam
          </button>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              {editingId ? "Edit Jadwal Pelajaran" : "Tambah Slot Jadwal Pelajaran"}
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Hari</label>
                  <select
                    value={form.day || "Senin"}
                    onChange={(e) => setForm((prev) => ({ ...prev, day: e.target.value as any }))}
                    className="w-full p-2 border rounded-lg bg-white"
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Jam Ke-</label>
                  <select
                    value={form.period || 1}
                    onChange={(e) => setForm((prev) => ({ ...prev, period: parseInt(e.target.value, 10) }))}
                    className="w-full p-2 border rounded-lg bg-white"
                  >
                    {periods.map((p) => (
                      <option key={p} value={p}>
                        Jam ke-{p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Waktu Jam Pelajaran</label>
                <input
                  type="text"
                  placeholder="07.00 - 07.35"
                  value={form.timeRange || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, timeRange: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  placeholder="Bahasa Indonesia / Matematika / Upacara..."
                  value={form.subject || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                  className="w-full p-2 border rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Guru Pengampu / Ruangan</label>
                <input
                  type="text"
                  placeholder="Nama Guru atau Ruangan"
                  value={form.roomOrTeacher || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, roomOrTeacher: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
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
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
