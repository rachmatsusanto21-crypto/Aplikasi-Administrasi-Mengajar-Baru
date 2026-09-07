import React, { useState, useMemo } from "react";
import { Student } from "../../types";
import { FileSpreadsheet, X, Check, AlertCircle, ArrowRight, Clipboard } from "lucide-react";

interface ExcelPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  tpList: { code: string; desc: string }[];
  onApplyGrades: (
    updates: { studentId: string; tpCode?: string; field: "tp" | "mid" | "final"; score: number }[]
  ) => void;
}

export const ExcelPasteModal: React.FC<ExcelPasteModalProps> = ({
  isOpen,
  onClose,
  students,
  tpList,
  onApplyGrades,
}) => {
  const [pastedText, setPastedText] = useState("");
  const [targetColumn, setTargetColumn] = useState<string>("auto_all"); // "auto_all" or specific TP code or "mid" or "final"

  // Parse pasted clipboard text (supports tab-separated and newline-separated values from Excel/Sheets)
  const parsedData = useMemo(() => {
    if (!pastedText.trim()) return [];

    const lines = pastedText
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split(/\t|,/).map((cell) => cell.trim()));

    return lines;
  }, [pastedText]);

  // Compute column mapping
  const availableColumns = useMemo(() => {
    const list: { id: string; label: string; field: "tp" | "mid" | "final"; tpCode?: string }[] = [];
    tpList.forEach((tp) => {
      list.push({ id: tp.code, label: `${tp.code} (${tp.desc})`, field: "tp", tpCode: tp.code });
    });
    list.push({ id: "mid", label: "Sumatif Tengah Semester (STS)", field: "mid" });
    list.push({ id: "final", label: "Sumatif Akhir Semester (SAS)", field: "final" });
    return list;
  }, [tpList]);

  // Build planned updates for preview
  const previewUpdates = useMemo(() => {
    const updates: {
      studentIndex: number;
      studentName: string;
      studentId: string;
      cells: { colLabel: string; score: number; field: "tp" | "mid" | "final"; tpCode?: string }[];
    }[] = [];

    parsedData.forEach((row, rowIdx) => {
      if (rowIdx >= students.length) return;
      const student = students[rowIdx];
      const studentCells: {
        colLabel: string;
        score: number;
        field: "tp" | "mid" | "final";
        tpCode?: string;
      }[] = [];

      if (targetColumn === "auto_all") {
        // Multi-column mapping
        row.forEach((cellVal, colIdx) => {
          if (colIdx >= availableColumns.length) return;
          const colDef = availableColumns[colIdx];
          const rawNum = parseFloat(cellVal.replace(",", "."));
          if (!isNaN(rawNum)) {
            const clamped = Math.min(100, Math.max(0, Math.round(rawNum)));
            studentCells.push({
              colLabel: colDef.label,
              score: clamped,
              field: colDef.field,
              tpCode: colDef.tpCode,
            });
          }
        });
      } else {
        // Single targeted column mapping (first cell of row)
        const colDef = availableColumns.find((c) => c.id === targetColumn);
        if (colDef && row.length > 0) {
          const rawNum = parseFloat(row[0].replace(",", "."));
          if (!isNaN(rawNum)) {
            const clamped = Math.min(100, Math.max(0, Math.round(rawNum)));
            studentCells.push({
              colLabel: colDef.label,
              score: clamped,
              field: colDef.field,
              tpCode: colDef.tpCode,
            });
          }
        }
      }

      if (studentCells.length > 0) {
        updates.push({
          studentIndex: rowIdx,
          studentName: student.name,
          studentId: student.id,
          cells: studentCells,
        });
      }
    });

    return updates;
  }, [parsedData, students, targetColumn, availableColumns]);

  const handleApply = () => {
    const flatUpdates: {
      studentId: string;
      tpCode?: string;
      field: "tp" | "mid" | "final";
      score: number;
    }[] = [];

    previewUpdates.forEach((row) => {
      row.cells.forEach((c) => {
        flatUpdates.push({
          studentId: row.studentId,
          tpCode: c.tpCode,
          field: c.field,
          score: c.score,
        });
      });
    });

    onApplyGrades(flatUpdates);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl p-6 max-w-3xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Tempel Data Nilai dari Excel / Spreadsheet
              </h3>
              <p className="text-xs text-slate-500">
                Salin kolom atau tabel nilai dari Excel/Google Sheets, lalu tempel di sini untuk mengisi tabel secara otomatis.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Column Target Selection */}
        <div className="space-y-1 text-xs">
          <label className="font-bold text-slate-800 block">
            Target Penempatan Nilai di Tabel:
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTargetColumn("auto_all")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                targetColumn === "auto_all"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Multi-Kolom Otomatis (TP-1, TP-2, ..., STS, SAS)
            </button>
            {availableColumns.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => setTargetColumn(col.id)}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                  targetColumn === col.id
                    ? "bg-emerald-600 text-white font-bold shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {col.id.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Textarea Paste Input */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <Clipboard className="w-4 h-4 text-emerald-600" />
              Area Penempelan (Ctrl + V):
            </label>
            {pastedText && (
              <button
                type="button"
                onClick={() => setPastedText("")}
                className="text-red-600 hover:underline font-semibold text-[11px]"
              >
                Bersihkan Teks
              </button>
            )}
          </div>
          <textarea
            rows={4}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Klik di sini lalu tekan Ctrl+V (atau Cmd+V di Mac) untuk menempelkan data dari Excel..."
            className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/50"
          />
        </div>

        {/* Preview of Parsed Data */}
        <div className="flex-1 overflow-hidden flex flex-col space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800 flex items-center gap-1">
              Pratinjau Hasil Pembacaan:
              <span className="font-normal text-slate-500 ml-1">
                ({previewUpdates.length} siswa akan diperbarui nilainya)
              </span>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-48 border border-slate-200 rounded-lg bg-white">
            {previewUpdates.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs flex flex-col items-center gap-1.5">
                <AlertCircle className="w-5 h-5 text-slate-300" />
                <span>Belum ada data nilai yang ditempelkan atau terbaca.</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 w-10 text-center">No</th>
                    <th className="px-3 py-2">Nama Siswa</th>
                    <th className="px-3 py-2">Rincian Nilai yang Akan Masuk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewUpdates.map((row) => (
                    <tr key={row.studentId} className="hover:bg-slate-50">
                      <td className="px-3 py-1.5 text-center text-slate-400 font-mono">
                        {row.studentIndex + 1}
                      </td>
                      <td className="px-3 py-1.5 font-bold text-slate-900">{row.studentName}</td>
                      <td className="px-3 py-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {row.cells.map((c, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono font-bold text-[11px]"
                            >
                              {c.tpCode || c.field.toUpperCase()}: {c.score}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={previewUpdates.length === 0}
            onClick={handleApply}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Check className="w-4 h-4" />
            Terapkan ke Tabel Nilai
          </button>
        </div>
      </div>
    </div>
  );
};
