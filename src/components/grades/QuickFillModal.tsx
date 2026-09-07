import React, { useState } from "react";
import { Zap, X, Check, AlertTriangle } from "lucide-react";

interface QuickFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  tpList: { code: string; desc: string }[];
  kkmValue: number;
  onApplyFill: (columnKey: string, actionType: "fixed" | "kkm" | "clear", fixedScore?: number) => void;
}

export const QuickFillModal: React.FC<QuickFillModalProps> = ({
  isOpen,
  onClose,
  tpList,
  kkmValue,
  onApplyFill,
}) => {
  const [selectedColumn, setSelectedColumn] = useState<string>(tpList[0]?.code || "TP-1");
  const [actionType, setActionType] = useState<"fixed" | "kkm" | "clear">("fixed");
  const [fixedScore, setFixedScore] = useState<number>(85);

  const availableColumns = [
    ...tpList.map((tp) => ({ id: tp.code, label: `${tp.code} - ${tp.desc}` })),
    { id: "mid", label: "Sumatif Tengah Semester (STS)" },
    { id: "final", label: "Sumatif Akhir Semester (SAS)" },
    { id: "all_tps", label: "Semua Kolom TP (Formatif Sekaligus)" },
  ];

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyFill(selectedColumn, actionType, fixedScore);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Isi Nilai Cepat Kolom</h3>
              <p className="text-xs text-slate-500">Otomasi pengisian nilai untuk seluruh siswa di kolom tabel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pilih Kolom */}
        <div className="space-y-1.5 text-xs">
          <label className="font-bold text-slate-800">Pilih Kolom Nilai:</label>
          <select
            value={selectedColumn}
            onChange={(e) => setSelectedColumn(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-800 bg-white"
          >
            {availableColumns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Pilih Tindakan */}
        <div className="space-y-2 text-xs">
          <label className="font-bold text-slate-800">Jenis Pengisian:</label>
          <div className="grid grid-cols-1 gap-2">
            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                actionType === "fixed"
                  ? "border-emerald-500 bg-emerald-50/50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="actionType"
                checked={actionType === "fixed"}
                onChange={() => setActionType("fixed")}
                className="mt-0.5 text-emerald-600"
              />
              <div className="flex-1">
                <span className="font-bold text-slate-800 block">Isi Semua dengan Nilai Serentak</span>
                <span className="text-slate-500 text-[11px]">
                  Mengisi seluruh siswa di kolom ini dengan nilai seragam.
                </span>
                {actionType === "fixed" && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-slate-700 font-semibold">Skor:</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={fixedScore}
                      onChange={(e) => setFixedScore(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                      className="w-16 p-1.5 border border-emerald-400 rounded-lg text-center font-mono font-bold text-emerald-900 bg-white"
                    />
                    <div className="flex gap-1">
                      {[75, 80, 85, 90, 95].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFixedScore(preset)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </label>

            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                actionType === "kkm"
                  ? "border-emerald-500 bg-emerald-50/50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="actionType"
                checked={actionType === "kkm"}
                onChange={() => setActionType("kkm")}
                className="mt-0.5 text-emerald-600"
              />
              <div>
                <span className="font-bold text-slate-800 block">
                  Isi Siswa yang Belum Dinilai dengan KKM ({kkmValue})
                </span>
                <span className="text-slate-500 text-[11px]">
                  Hanya siswa yang nilainya masih 0 atau kosong yang akan diisi nilai KKM.
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                actionType === "clear"
                  ? "border-red-500 bg-red-50/50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="actionType"
                checked={actionType === "clear"}
                onChange={() => setActionType("clear")}
                className="mt-0.5 text-red-600"
              />
              <div>
                <span className="font-bold text-red-800 block">Kosongkan / Reset Kolom Ini</span>
                <span className="text-slate-500 text-[11px]">
                  Menghapus semua nilai pada kolom terpilih.
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApply}
            className={`px-5 py-2 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors ${
              actionType === "clear"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            <Check className="w-4 h-4" />
            Terapkan Pengisian
          </button>
        </div>
      </div>
    </div>
  );
};
