import React from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  BookOpen,
  ShieldAlert,
  GraduationCap,
  CalendarDays,
  BookMarked,
  ClipboardList,
  Calendar,
  Sparkles,
  FileSpreadsheet,
  X,
  Layers,
  CheckCircle2,
  TrendingUp,
  Palette,
} from "lucide-react";
import { NavModule } from "../types";

interface SidebarProps {
  activeModule: NavModule;
  onSelectModule: (module: NavModule) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  isOpen,
  onClose,
}) => {
  const menuGroups = [
    {
      title: "Ringkasan & Stats",
      items: [
        { id: "dashboard" as NavModule, label: "Dashboard Ringkasan", icon: LayoutDashboard, color: "text-indigo-400", highlight: true },
      ],
    },
    {
      title: "Core Admin & Data",
      items: [
        { id: "identity" as NavModule, label: "Identitas Sekolah", icon: Building2, color: "text-emerald-400" },
        { id: "students" as NavModule, label: "Database Murid", icon: Users, color: "text-sky-400" },
        { id: "attendance" as NavModule, label: "Absensi Bulk (dd/m)", icon: UserCheck, badge: "Daily", color: "text-amber-400" },
      ],
    },
    {
      title: "Pembelajaran & Kurikulum",
      items: [
        { id: "calendar" as NavModule, label: "Kalender & Hari Efektif", icon: Calendar, color: "text-purple-400" },
        { id: "prota_promes" as NavModule, label: "Prota & Promes", icon: Layers, color: "text-orange-400" },
        { id: "curriculum" as NavModule, label: "Kurikulum CP & TP", icon: BookOpen, hasAI: true, color: "text-violet-400" },
        { id: "teaching_module" as NavModule, label: "Modul Ajar (AI Deep Learning)", icon: Sparkles, hasAI: true, highlight: true, color: "text-fuchsia-400" },
        { id: "exam_generator" as NavModule, label: "Generator Soal & Kisi-Kisi AI", icon: ClipboardList, hasAI: true, highlight: true, color: "text-amber-400" },
        { id: "lkpd_generator" as NavModule, label: "Generate LKPD (AI)", icon: FileSpreadsheet, hasAI: true, highlight: true, color: "text-emerald-400" },
        { id: "canva_studio" as NavModule, label: "Desain Media Pembelajaran AI Banana", icon: Palette, hasAI: true, highlight: true, color: "text-amber-300" },
      ],
    },
    {
      title: "Pencatatan & Jurnal",
      items: [
        { id: "grades" as NavModule, label: "Rekap Nilai & Leger", icon: GraduationCap, color: "text-indigo-400" },
        { id: "learning_analysis" as NavModule, label: "Analisis Hasil Belajar", icon: TrendingUp, highlight: true, color: "text-rose-400" },
        { id: "discipline" as NavModule, label: "Pelanggaran & BK", icon: ShieldAlert, color: "text-red-400" },
        { id: "timetable" as NavModule, label: "Jadwal Pelajaran", icon: CalendarDays, color: "text-cyan-400" },
        { id: "daily_log" as NavModule, label: "Jurnal Mengajar Harian", icon: ClipboardList, color: "text-teal-400" },
        { id: "incidental" as NavModule, label: "Insidental & Buku Tamu", icon: BookMarked, color: "text-pink-400" },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 dark:bg-slate-950 text-slate-300 flex flex-col transition-transform duration-200 border-r border-slate-800 shrink-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 rounded-lg flex items-center justify-center font-extrabold text-white italic text-xs tracking-tighter shadow-md">
              EDU
            </div>
            <div className="leading-tight">
              <h1 className="text-xs font-black text-white uppercase tracking-wider">
                EduAdmin Pro
              </h1>
              <span className="text-xs text-slate-400 font-medium block">v2.4 High-Density</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* High Density Nav Menu */}
        <nav className="flex-1 overflow-y-auto py-2 text-xs font-medium space-y-3">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 py-1 text-slate-400 uppercase tracking-widest text-xs font-bold">
                {group.title}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectModule(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 transition-all rounded-lg mx-1 w-[calc(100%-8px)] ${
                      isActive
                        ? "bg-indigo-600 text-white font-black shadow-xs"
                        : item.highlight
                        ? "text-indigo-200 bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-800/50"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : item.color}`} />
                      <span className="truncate text-xs font-bold">{item.label}</span>
                    </div>
                    {item.hasAI && (
                      <span className="shrink-0 text-xs font-black px-1.5 py-0.5 rounded bg-fuchsia-600 text-white uppercase">
                        AI
                      </span>
                    )}
                    {item.badge && (
                      <span className="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer Status */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs space-y-1.5">
          <div className="flex justify-between items-center text-slate-400">
            <span>Google Sheets Sync</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Aktif
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>AI Agent Engine</span>
            <span className="text-indigo-300 font-mono font-bold">Gemini 3.6</span>
          </div>
        </div>
      </aside>
    </>
  );
};

