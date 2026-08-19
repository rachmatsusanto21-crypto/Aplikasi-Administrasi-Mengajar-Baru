import React, { useRef, useState, useEffect } from "react";
import {
  Printer,
  X,
  FileText,
  Edit3,
  Check,
  RotateCcw,
  Sliders,
  FileCheck,
  FileCode,
  Download,
  Loader2,
  ExternalLink,
  Scissors,
} from "lucide-react";
import html2pdf from "html2pdf.js";
import { SchoolIdentity } from "../types";
import { KopSurat } from "./KopSurat";
import { exportHtmlToDoc } from "../lib/exportDoc";

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  schoolIdentity: SchoolIdentity;
  children: React.ReactNode;
  defaultOrientation?: "portrait" | "landscape";
  defaultPaperSize?: "A4" | "F4";
  enablePageBreaks?: boolean;
  onTogglePageBreaks?: () => void;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  schoolIdentity,
  children,
  defaultOrientation = "portrait",
  defaultPaperSize,
  enablePageBreaks = true,
  onTogglePageBreaks,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const printablePaperRef = useRef<HTMLDivElement>(null);

  // Document Section Selection
  const [documentScope, setDocumentScope] = useState<
    "ALL" | "HEADER_TITLE" | "BODY_ONLY" | "SIGNATURE_ONLY"
  >("ALL");

  // Paper Size & Orientation (Persisted in localStorage)
  const [paperSize, setPaperSize] = useState<"A4" | "F4">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("adm_guru_paper_size");
      if (saved === "A4" || saved === "F4") return saved;
    }
    return defaultPaperSize || "A4";
  });

  const [orientation, setOrientation] = useState<"portrait" | "landscape">(defaultOrientation);

  // Page Break Utilities Toggle
  const [pageBreaksActive, setPageBreaksActive] = useState<boolean>(enablePageBreaks);

  // Margin Configuration (in mm):
  // Portrait: Kiri 25mm (2.5cm), Atas 20mm (2cm), Kanan 20mm (2cm), Bawah 20mm (2cm)
  // Landscape: Atas 25mm (2.5cm), Kiri 20mm (2cm), Kanan 20mm (2cm), Bawah 20mm (2cm)
  const [marginPreset, setMarginPreset] = useState<"standard" | "narrow" | "custom">("standard");
  const [marginTop, setMarginTop] = useState<number>(defaultOrientation === "landscape" ? 25 : 20);
  const [marginBottom, setMarginBottom] = useState<number>(20);
  const [marginLeft, setMarginLeft] = useState<number>(defaultOrientation === "portrait" ? 25 : 20);
  const [marginRight, setMarginRight] = useState<number>(20);

  // Update margins whenever orientation changes to follow strict rules
  const handleOrientationChange = (newOrientation: "portrait" | "landscape") => {
    setOrientation(newOrientation);
    if (marginPreset === "standard") {
      if (newOrientation === "portrait") {
        setMarginTop(20);
        setMarginBottom(20);
        setMarginLeft(25); // Batas Kiri 2.5 cm
        setMarginRight(20);
      } else {
        setMarginTop(25); // Batas Atas 2.5 cm
        setMarginBottom(20);
        setMarginLeft(20);
        setMarginRight(20);
      }
    }
  };

  const handlePaperSizeChange = (newSize: "A4" | "F4") => {
    setPaperSize(newSize);
    try {
      localStorage.setItem("adm_guru_paper_size", newSize);
    } catch {
      /* ignore */
    }
  };

  // Sync state when modal opens or defaults change
  useEffect(() => {
    if (isOpen) {
      setOrientation(defaultOrientation);
      if (defaultOrientation === "portrait") {
        setMarginTop(20);
        setMarginBottom(20);
        setMarginLeft(25);
        setMarginRight(20);
      } else {
        setMarginTop(25);
        setMarginBottom(20);
        setMarginLeft(20);
        setMarginRight(20);
      }

      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("adm_guru_paper_size");
        if (saved === "A4" || saved === "F4") {
          setPaperSize(saved);
        } else if (defaultPaperSize) {
          setPaperSize(defaultPaperSize);
        }
      }
      setPageBreaksActive(enablePageBreaks);
    }
  }, [isOpen, defaultOrientation, defaultPaperSize, enablePageBreaks]);

  // Inject dynamic @page style for browser print dialog
  useEffect(() => {
    if (!isOpen) return;

    let styleEl = document.getElementById("dynamic-print-page-style") as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "dynamic-print-page-style";
      document.head.appendChild(styleEl);
    }

    const sizeSpec = paperSize === "F4" ? "215mm 330mm" : "210mm 297mm";

    styleEl.innerHTML = `
      @media print {
        @page {
          size: ${sizeSpec} ${orientation};
          margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
        }
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        table {
          width: 100% !important;
          max-width: 100% !important;
          table-layout: auto !important;
          page-break-inside: auto;
          word-break: break-word !important;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        th, td {
          word-break: break-word !important;
          overflow-wrap: break-word !important;
        }
      }
    `;

    return () => {
      if (styleEl && styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, [isOpen, paperSize, orientation, marginTop, marginBottom, marginLeft, marginRight]);

  // Interactive Live Edit Mode & Loading
  const [isEditable, setIsEditable] = useState<boolean>(false);
  const [isEdited, setIsEdited] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Handle ESC key, scroll locking, and print event lifecycle
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("print-modal-open");
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };

      const handleBeforePrint = () => {
        document.body.classList.add("is-printing");
      };

      const handleAfterPrint = () => {
        document.body.classList.remove("is-printing");
        // Force window focus and unfreeze pointer/scroll state after print dialog closes/cancels
        window.focus();
        if (isOpen) {
          document.body.style.overflow = "hidden";
        } else {
          document.body.style.overflow = "unset";
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("beforeprint", handleBeforePrint);
      window.addEventListener("afterprint", handleAfterPrint);

      return () => {
        document.body.classList.remove("print-modal-open");
        document.body.style.overflow = originalOverflow || "unset";
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("beforeprint", handleBeforePrint);
        window.removeEventListener("afterprint", handleAfterPrint);
        document.body.classList.remove("is-printing");
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle preset margin changes
  const handlePresetChange = (preset: "standard" | "narrow" | "custom") => {
    setMarginPreset(preset);
    if (preset === "standard") {
      if (orientation === "portrait") {
        setMarginTop(20);
        setMarginBottom(20);
        setMarginLeft(25); // Batas Kiri 2.5 cm
        setMarginRight(20);
      } else {
        setMarginTop(25); // Batas Atas 2.5 cm
        setMarginBottom(20);
        setMarginLeft(20);
        setMarginRight(20);
      }
    } else if (preset === "narrow") {
      setMarginTop(10);
      setMarginBottom(10);
      setMarginLeft(10);
      setMarginRight(10);
    }
  };

  const handlePrint = () => {
    try {
      if (typeof window !== "undefined") {
        const wasEditable = isEditable;
        if (wasEditable) setIsEditable(false);

        // Ensure DOM updates cleanly before triggering print dialog
        setTimeout(() => {
          try {
            window.print();
          } catch (e) {
            console.warn("Error invoking browser print:", e);
          } finally {
            if (wasEditable) {
              setTimeout(() => setIsEditable(true), 300);
            }
            // Always ensure page focus is restored so browser doesn't freeze interaction
            window.focus();
          }
        }, 50);
      }
    } catch (err) {
      console.warn("Print dialog suppressed or unavailable in sandboxed environment:", err);
    }
  };

  const handleDownloadPdf = async () => {
    if (!printablePaperRef.current) return;
    setIsExportingPdf(true);
    const wasEditable = isEditable;
    if (wasEditable) setIsEditable(false);

    try {
      const cleanTitle = (title || "Dokumen_Administrasi_Guru").replace(/[^a-zA-Z0-9_]/g, "_");
      const filename = `${cleanTitle}.pdf`;

      const jsPdfFormat =
        paperSize === "Auto"
          ? orientation === "landscape"
            ? [297, 420]
            : [210, 350]
          : paperSize.toLowerCase();

      const opt = {
        margin: [marginTop || 10, marginLeft || 10, marginBottom || 10, marginRight || 10] as [number, number, number, number],
        filename: filename,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: { unit: "mm", format: jsPdfFormat, orientation: orientation },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      await html2pdf().set(opt).from(printablePaperRef.current).save();
    } catch (err) {
      console.error("Gagal mengunduh PDF:", err);
      handlePrint();
    } finally {
      if (wasEditable) setIsEditable(true);
      setIsExportingPdf(false);
    }
  };

  const handleExportDoc = () => {
    const targetHtml = contentRef.current?.innerHTML || printablePaperRef.current?.innerHTML || "";
    if (targetHtml) {
      exportHtmlToDoc({
        htmlContent: targetHtml,
        filename: `${title.replace(/[^a-zA-Z0-9_]/g, "_")}.doc`,
        title,
        schoolIdentity,
        paperSize,
        orientation,
      });
    }
  };

  // Dimension helpers for paper preview box
  const getPaperDimensionsClass = () => {
    if (orientation === "landscape") {
      return "max-w-6xl w-full";
    }
    return "max-w-4xl w-full";
  };

  const getPaperPreviewStyle = () => {
    let baseWidthMm = paperSize === "F4" ? 215 : 210;
    let baseHeightMm = paperSize === "F4" ? 330 : 297;

    if (orientation === "landscape") {
      const temp = baseWidthMm;
      baseWidthMm = baseHeightMm;
      baseHeightMm = temp;
    }

    return {
      width: `${baseWidthMm}mm`,
      maxWidth: "100%",
      minHeight: `${baseHeightMm}mm`,
      paddingTop: `${marginTop}mm`,
      paddingBottom: `${marginBottom}mm`,
      paddingLeft: `${marginLeft}mm`,
      paddingRight: `${marginRight}mm`,
      boxSizing: "border-box" as const,
    };
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 animate-fadeIn print-overlay overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl ${getPaperDimensionsClass()} flex flex-col h-[95vh] max-h-[95vh] overflow-hidden border border-slate-200 dark:border-slate-800 print-dialog`}>
        {/* Modal Header & Actions Bar (Hidden on window.print) */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 no-print border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
              <Printer className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">Pratinjau Cetak & Pengaturan Dokumen</h3>
              <p className="text-xs text-slate-400">{title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Live Editable Toggle Button */}
            <button
              onClick={() => setIsEditable(!isEditable)}
              className={`px-3 py-1.5 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs ${
                isEditable
                  ? "bg-amber-500 text-slate-950 hover:bg-amber-400 ring-2 ring-amber-300"
                  : "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"
              }`}
              title="Aktifkan mode edit langsung pada pratinjau teks/tabel sebelum dicetak"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditable ? "Mode Edit Aktif (Klik Teks)" : "Edit Teks Pratinjau"}</span>
            </button>

            {/* Direct PDF Download Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
              title="Unduh langsung sebagai berkas PDF (.pdf) ke komputer Anda"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isExportingPdf ? "Membuat PDF..." : "Unduh File PDF (.pdf)"}</span>
            </button>

            {/* Word Export Button */}
            <button
              onClick={handleExportDoc}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
              title="Unduh sebagai dokumen Word (.doc / .docx)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Simpan Word (.docx)</span>
            </button>

            {/* Print Dialog Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
              title="Buka dialog cetak browser (Ctrl+P / Command+P)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Dialog</span>
            </button>

            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-rose-500/30"
              title="Tutup Pratinjau (ESC)"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Tutup</span>
            </button>
          </div>
        </div>

        {/* Print Configuration Control Panel (No-Print Toolbar) */}
        <div className="bg-slate-100 dark:bg-slate-950/80 p-3 border-b border-slate-200 dark:border-slate-800 no-print flex flex-wrap items-center justify-between gap-3 text-xs font-semibold shrink-0">
          {/* Document Section Selector */}
          <div className="flex items-center gap-2">
            <label className="text-slate-600 dark:text-slate-400 font-bold whitespace-nowrap flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5 text-indigo-500" />
              Cetak Bagian:
            </label>
            <select
              value={documentScope}
              onChange={(e) => setDocumentScope(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Bagian (Lengkap)</option>
              <option value="HEADER_TITLE">Hanya Kop & Judul Dokumen</option>
              <option value="BODY_ONLY">Hanya Isi Utama / Tabel Data</option>
              <option value="SIGNATURE_ONLY">Hanya Lembar Tanda Tangan</option>
            </select>
          </div>

          {/* Paper Size & Orientation */}
          <div className="flex items-center gap-2">
            <label className="text-slate-600 dark:text-slate-400 font-bold whitespace-nowrap">
              Kertas:
            </label>
            <select
              value={paperSize}
              onChange={(e) => handlePaperSizeChange(e.target.value as "A4" | "F4")}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="A4">A4 (210 x 297 mm)</option>
              <option value="F4">F4 / Folio (215 x 330 mm)</option>
            </select>

            <select
              value={orientation}
              onChange={(e) => handleOrientationChange(e.target.value as "portrait" | "landscape")}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="portrait">Tegak (Portrait - Kiri 2.5cm)</option>
              <option value="landscape">Mendatar (Landscape - Atas 2.5cm)</option>
            </select>
          </div>

          {/* Page Break Control & Indicator */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const nextState = !pageBreaksActive;
                setPageBreaksActive(nextState);
                if (onTogglePageBreaks) onTogglePageBreaks();
              }}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                pageBreaksActive
                  ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
                  : "bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400"
              }`}
              title="Aktifkan/nonaktifkan aturan pemotongan halaman (page-break-after) untuk dokumen panjang seperti Prota/Promes"
            >
              <Scissors className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                Pemisah Halaman (Page Break):{" "}
                <span className={pageBreaksActive ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : "text-slate-500 font-normal"}>
                  {pageBreaksActive ? "Aktif" : "Menerus"}
                </span>
              </span>
            </button>
          </div>

          {/* Margin Editor Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-slate-600 dark:text-slate-400 font-bold whitespace-nowrap flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              Margin:
            </label>

            {/* Presets */}
            <select
              value={marginPreset}
              onChange={(e) => handlePresetChange(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="standard">
                Standar Baku ({orientation === "portrait" ? "Kiri 2.5cm, Lainnya 2cm" : "Atas 2.5cm, Lainnya 2cm"})
              </option>
              <option value="narrow">Sempit (10mm)</option>
              <option value="custom">Kustom mm</option>
            </select>

            {/* Custom Margin Inputs */}
            {marginPreset === "custom" && (
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-300 dark:border-slate-700">
                <span className="text-[11px] text-slate-500">Atas:</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={marginTop}
                  onChange={(e) => setMarginTop(Number(e.target.value))}
                  className="w-10 text-center font-bold bg-transparent border-b border-slate-400"
                />
                <span className="text-[11px] text-slate-500">Bawah:</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={marginBottom}
                  onChange={(e) => setMarginBottom(Number(e.target.value))}
                  className="w-10 text-center font-bold bg-transparent border-b border-slate-400"
                />
                <span className="text-[11px] text-slate-500">Kiri:</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={marginLeft}
                  onChange={(e) => setMarginLeft(Number(e.target.value))}
                  className="w-10 text-center font-bold bg-transparent border-b border-slate-400"
                />
                <span className="text-[11px] text-slate-500">Kanan:</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={marginRight}
                  onChange={(e) => setMarginRight(Number(e.target.value))}
                  className="w-10 text-center font-bold bg-transparent border-b border-slate-400"
                />
              </div>
            )}
          </div>
        </div>

        {/* Live Edit Mode Banner Notification */}
        {isEditable && (
          <div className="no-print bg-amber-500/20 dark:bg-amber-950/50 border-b border-amber-500/40 p-2 text-center text-xs text-amber-900 dark:text-amber-200 font-bold flex items-center justify-center gap-2 shrink-0">
            <Edit3 className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-bounce" />
            <span>
              Mode Edit Aktif: Anda dapat mengklik dan mengubah teks/tabel secara langsung di area pratinjau di bawah ini sebelum dicetak!
            </span>
          </div>
        )}

        {/* Printable Paper Canvas Viewport */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-200 dark:bg-slate-950 flex justify-center">
          <div
            ref={printablePaperRef}
            style={getPaperPreviewStyle()}
            className={`bg-white text-slate-900 shadow-xl rounded-sm printable-area area-cetak-pdf font-sans transition-all mx-auto ${
              pageBreaksActive ? "print-page-breaks-active" : ""
            } ${
              isEditable
                ? "ring-4 ring-amber-400 ring-offset-2 outline-none cursor-text"
                : ""
            }`}
            contentEditable={isEditable}
            suppressContentEditableWarning={true}
            onInput={() => setIsEdited(true)}
          >
            {/* Kop Surat Resmi */}
            {(documentScope === "ALL" || documentScope === "HEADER_TITLE") && (
              <KopSurat schoolIdentity={schoolIdentity} />
            )}

            {/* Document Title & Metadata */}
            {(documentScope === "ALL" || documentScope === "HEADER_TITLE") && (
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold uppercase underline tracking-wider text-slate-900">
                  {title}
                </h3>
                {subtitle && <div className="text-xs text-slate-600 font-medium mt-1">{subtitle}</div>}
                <div className="flex justify-between items-center text-xs text-slate-700 mt-3 pt-2 border-t border-slate-200">
                  <div>
                    <b>Tahun Pelajaran:</b> {schoolIdentity.academicYear} | <b>Semester:</b> {schoolIdentity.semester}
                  </div>
                  <div>
                    <b>Kelas/Fase:</b> {schoolIdentity.gradeClass} ({schoolIdentity.phase})
                  </div>
                </div>
              </div>
            )}

            {/* Document Dynamic Content */}
            {(documentScope === "ALL" || documentScope === "BODY_ONLY") && (
              <div ref={contentRef} className="my-4 text-xs sm:text-sm leading-relaxed text-slate-900">
                {children}
              </div>
            )}

            {/* Signature Block */}
            {(documentScope === "ALL" || documentScope === "SIGNATURE_ONLY") && (
              <div className="mt-12 pt-6 grid grid-cols-2 gap-8 text-center text-xs text-slate-900 break-inside-avoid">
                <div>
                  <p>Mengetahui,</p>
                  <p className="font-semibold mb-16">Kepala Sekolah {schoolIdentity.schoolName}</p>
                  <p className="font-bold underline uppercase">{schoolIdentity.headmasterName}</p>
                  <p className="text-xs text-slate-700">NIP. {schoolIdentity.headmasterNip}</p>
                </div>
                <div>
                  <p>
                    {schoolIdentity.regency || schoolIdentity.district || "Malang"},{" "}
                    {new Date().toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="font-semibold mb-16">Guru Kelas / Mata Pelajaran</p>
                  <p className="font-bold underline uppercase">{schoolIdentity.teacherName}</p>
                  <p className="text-xs text-slate-700">NIP. {schoolIdentity.teacherNip}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer Action Bar */}
        <div className="no-print bg-slate-900 text-white p-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="font-semibold text-slate-300">Petunjuk:</span> Tekan <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700 font-mono text-[10px]">ESC</kbd> atau klik di luar kertas untuk menutup pratinjau.
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <X className="w-4 h-4 text-rose-400" />
              <span>Tutup Pratinjau</span>
            </button>
            <button
              onClick={handleExportDoc}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <FileText className="w-3 h-3.5" />
              <span>Simpan Word (.docx)</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isExportingPdf ? "Membuat PDF..." : "Unduh File PDF (.pdf)"}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-md"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Dialog</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
