import React, { useState, useMemo } from "react";
import {
  Palette,
  ExternalLink,
  Plus,
  Search,
  Sparkles,
  Copy,
  Check,
  FileText,
  Presentation,
  BookOpen,
  Award,
  Image as ImageIcon,
  Trash2,
  Share2,
  RefreshCw,
  FolderOpen,
  Filter,
  Wand2,
  Eye,
  Layers,
} from "lucide-react";
import { CanvaTemplateItem, CPTPItem, SchoolIdentity } from "../../types";

interface CanvaStudioViewProps {
  cptpList?: CPTPItem[];
  subjects?: string[];
  schoolIdentity?: SchoolIdentity;
  canvaTemplates?: CanvaTemplateItem[];
  onSaveCanvaTemplates?: (updated: CanvaTemplateItem[]) => void;
  initialSelectedTopic?: string;
}

export const CanvaStudioView: React.FC<CanvaStudioViewProps> = ({
  cptpList = [],
  subjects = ["Bahasa Indonesia", "Matematika", "IPAS", "Pancasila", "Seni Budaya", "PJOK", "Bahasa Inggris"],
  schoolIdentity,
  canvaTemplates = [],
  onSaveCanvaTemplates,
  initialSelectedTopic = "",
}) => {
  const [activeTab, setActiveTab] = useState<"gallery" | "ai_media" | "ai_lkpd" | "embed_preview">("gallery");

  // Gallery Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("Semua");

  // Custom Template Form Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<CanvaTemplateItem>>({
    title: "",
    category: "Modul Ajar",
    subject: "Semua Mapel",
    description: "",
    canvaUrl: "",
    tags: [],
  });
  const [newTagInput, setNewTagInput] = useState("");

  // AI Prompt Generator for Media Pembelajaran State
  const [mediaSubject, setMediaSubject] = useState<string>(subjects[0] || "Bahasa Indonesia");
  const [mediaTopic, setMediaTopic] = useState<string>(initialSelectedTopic || "Ciri-Ciri Karakter & Kata Sifat");
  const [mediaTargetGrade, setMediaTargetGrade] = useState<string>(schoolIdentity?.gradeClass || "Kelas IV SD");
  const [mediaDesignStyle, setMediaDesignStyle] = useState<string>("Minimalis Edukatif Ceria (Colorful Pastel)");
  const [mediaFormat, setMediaFormat] = useState<string>("Presentasi Pembelajaran Interaktif (16:9)");
  const [generatedMediaPrompt, setGeneratedMediaPrompt] = useState<string>("");
  const [isCopyMediaSuccess, setIsCopyMediaSuccess] = useState(false);

  // AI Prompt Generator for LKPD State
  const [lkpdSubject, setLkpdSubject] = useState<string>(subjects[0] || "Bahasa Indonesia");
  const [lkpdTopic, setLkpdTopic] = useState<string>(initialSelectedTopic || "Menulis Kalimat Deskriptif Sederhana");
  const [lkpdTargetGrade, setLkpdTargetGrade] = useState<string>(schoolIdentity?.gradeClass || "Kelas IV SD");
  const [lkpdActivityType, setLkpdActivityType] = useState<string>("Eksperimen & Diskusi Kelompok (PjBL)");
  const [lkpdThemeStyle, setLkpdThemeStyle] = useState<string>("Komik Ilustratif & Petualangan Edukasi");
  const [generatedLkpdPrompt, setGeneratedLkpdPrompt] = useState<string>("");
  const [isCopyLkpdSuccess, setIsCopyLkpdSuccess] = useState(false);

  // Embed Preview State
  const [embedUrlInput, setEmbedUrlInput] = useState<string>("");
  const [activeEmbedUrl, setActiveEmbedUrl] = useState<string>("");

  // Populate topic options from CPTP list
  const topicSuggestions = useMemo(() => {
    return (cptpList || []).map((cp: any) => ({
      subject: cp.subject || "",
      element: cp.element || "",
      tpCode: cp.codeTP || cp.tpCode || "",
      tpDescription: cp.descriptionTP || cp.tpDescription || cp.tpText || "",
    }));
  }, [cptpList]);

  // Categories list
  const categories = ["Semua", "Modul Ajar", "LKPD", "Presentasi", "Banner / Dekorasi", "Sertifikat"];

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return canvaTemplates.filter((item) => {
      const matchesCategory = selectedCategory === "Semua" || item.category === selectedCategory;
      const matchesSubject =
        selectedSubjectFilter === "Semua" ||
        item.subject === "Semua Mapel" ||
        item.subject?.toLowerCase().includes(selectedSubjectFilter.toLowerCase());
      const matchesQuery =
        searchQuery.trim() === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSubject && matchesQuery;
    });
  }, [canvaTemplates, selectedCategory, selectedSubjectFilter, searchQuery]);

  // Handle Add Template
  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplate.title || !newTemplate.canvaUrl) {
      alert("Harap isi Judul dan Tautan Canva!");
      return;
    }

    const itemToAdd: CanvaTemplateItem = {
      id: `cnv-custom-${Date.now()}`,
      title: newTemplate.title || "Template Tanpa Judul",
      category: (newTemplate.category as any) || "Modul Ajar",
      subject: newTemplate.subject || "Semua Mapel",
      description: newTemplate.description || "",
      canvaUrl: newTemplate.canvaUrl || "https://www.canva.com",
      tags: newTemplate.tags || ["Template Guru"],
      isSchoolDefault: false,
    };

    if (onSaveCanvaTemplates) {
      onSaveCanvaTemplates([...canvaTemplates, itemToAdd]);
    }

    setIsAddModalOpen(false);
    setNewTemplate({
      title: "",
      category: "Modul Ajar",
      subject: "Semua Mapel",
      description: "",
      canvaUrl: "",
      tags: [],
    });
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus template ini dari galeri sekolah?")) {
      if (onSaveCanvaTemplates) {
        onSaveCanvaTemplates(canvaTemplates.filter((t) => t.id !== id));
      }
    }
  };

  // Generate Media Prompt for Canva AI Magic Design
  const handleGenerateMediaPrompt = () => {
    const prompt = `Buatkan ${mediaFormat} untuk Mata Pelajaran ${mediaSubject} kelas ${mediaTargetGrade} dengan topik utama: "${mediaTopic}". 

Panduan Desain & Konten Canva Magic Studio:
- Gaya Visual: ${mediaDesignStyle}.
- Struktur Halaman/Slide:
  1. Slide Judul: Judul Menarik, Nama Sekolah (${schoolIdentity?.schoolName || "Sekolah Dasar"}), dan Karakter Ilustrasi Edukatif.
  2. Slide Tujuan Pembelajaran: Poin-poin ringkas & ramah anak.
  3. Slide Pemantik & Apersepsi: Pertanyaan interaktif / Teka-teki singkat.
  4. Slide Inti Materi: Konsep utama dengan diagram, infografis, dan ilustrasi visual berwarna.
  5. Slide Studi Kasus / Aktivitas Siswa: Langkah diskusi kelompok secara visual.
  6. Slide Kuis Interaktif & Kesimpulan: 3 pertanyaan refleksi cepat.
- Warna Utama: Kombinasi pastel edukatif, kontras tinggi, mudah dibaca murid.
- Sertakan ruang/placeholder untuk foto kegiatan belajar siswa.`;

    setGeneratedMediaPrompt(prompt);
  };

  // Generate LKPD Prompt for Canva AI
  const handleGenerateLkpdPrompt = () => {
    const prompt = `Desain Lembar Kerja Peserta Didik (LKPD) / Worksheet A4 siap cetak untuk ${lkpdSubject} kelas ${lkpdTargetGrade}, topik: "${lkpdTopic}".

Panduan Tata Letak & Ilustrasi Canva Magic Design:
- Tema Visual: ${lkpdThemeStyle}.
- Tipe Aktivitas: ${lkpdActivityType}.
- Komponen LKPD di Halaman A4:
  1. Header Resmi: Logo Sekolah, Nama Sekolah (${schoolIdentity?.schoolName || "Sekolah Dasar"}), Nama Kelompok/Siswa, Kelas, Tanggal.
  2. Judul LKPD Kreatif & Tujuan Pembelajaran yang terukur.
  3. Alat & Bahan + Petunjuk Kegiatan PjBL/PBL yang jelas dengan ikon ilustrasi.
  4. Area Lembar Kerja: Tabel pengamatan/hasil karya murid dengan garis tepi rapi & cukup ruang menulis.
  5. Pertanyaan Pemantik & Analisis HOTS (Higher Order Thinking Skills).
  6. Kolom Refleksi Diri (Emoji Perasaan Belajar & Catatan Guru).
- Tipografi: Font ramah anak (contoh: Comic/Fredoka/Nunito), ukuran besar, spasi lega, dan siap cetak hitam-putih maupun berwarna.`;

    setGeneratedLkpdPrompt(prompt);
  };

  const handleCopyPrompt = (text: string, type: "media" | "lkpd") => {
    navigator.clipboard.writeText(text);
    if (type === "media") {
      setIsCopyMediaSuccess(true);
      setTimeout(() => setIsCopyMediaSuccess(false), 2000);
    } else {
      setIsCopyLkpdSuccess(true);
      setTimeout(() => setIsCopyLkpdSuccess(false), 2000);
    }
  };

  const handleOpenCanvaMagicSearch = (topic: string, format: string) => {
    const query = encodeURIComponent(`${format} ${topic} ${mediaSubject} SD Kurikulum Merdeka`);
    window.open(`https://www.canva.com/search?q=${query}`, "_blank");
  };

  // Helper for Category Icons
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Modul Ajar":
        return <BookOpen className="w-4 h-4 text-emerald-600" />;
      case "LKPD":
        return <FileText className="w-4 h-4 text-amber-600" />;
      case "Presentasi":
        return <Presentation className="w-4 h-4 text-indigo-600" />;
      case "Banner / Dekorasi":
        return <ImageIcon className="w-4 h-4 text-purple-600" />;
      case "Sertifikat":
        return <Award className="w-4 h-4 text-rose-600" />;
      default:
        return <FolderOpen className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner Canva Integration */}
      <div className="bg-gradient-to-r from-teal-800 via-indigo-900 to-purple-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 bottom-0 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-teal-200">
              <Palette className="w-3.5 h-3.5 text-teal-300" />
              <span>Integrasi Canva Studio & Canva AI Magic Design</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Studio Desain Media Pembelajaran Canva
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              Akses repositori template Canva sekolah, salin tautan langsung, buat slide presentasi interaktif & LKPD otomatis menggunakan Prompt AI Canva Magic Studio.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href="https://www.canva.com/create/"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka Canva.com</span>
            </a>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/30 font-bold text-xs rounded-xl flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4 text-teal-300" />
              <span>Tambah Template Canva</span>
            </button>
          </div>
        </div>

        {/* Tab Sub-Navigation */}
        <div className="mt-8 flex flex-wrap gap-2 border-t border-white/15 pt-4">
          <button
            onClick={() => setActiveTab("gallery")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "gallery"
                ? "bg-white text-indigo-950 shadow-md scale-102"
                : "text-slate-200 hover:bg-white/10"
            }`}
          >
            <FolderOpen className="w-4 h-4 text-teal-600" />
            <span>Galeri Template Canva ({canvaTemplates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("ai_media")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "ai_media"
                ? "bg-white text-indigo-950 shadow-md scale-102"
                : "text-slate-200 hover:bg-white/10"
            }`}
          >
            <Wand2 className="w-4 h-4 text-purple-600" />
            <span>Generator Media Pembelajaran Canva AI</span>
          </button>

          <button
            onClick={() => setActiveTab("ai_lkpd")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "ai_lkpd"
                ? "bg-white text-indigo-950 shadow-md scale-102"
                : "text-slate-200 hover:bg-white/10"
            }`}
          >
            <FileText className="w-4 h-4 text-amber-600" />
            <span>Generator Desain LKPD Canva AI</span>
          </button>

          <button
            onClick={() => setActiveTab("embed_preview")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "embed_preview"
                ? "bg-white text-indigo-950 shadow-md scale-102"
                : "text-slate-200 hover:bg-white/10"
            }`}
          >
            <Eye className="w-4 h-4 text-sky-600" />
            <span>Pratinjau & Sandbox Canva</span>
          </button>
        </div>
      </div>

      {/* TAB 1: GALERI TEMPLATE CANVA */}
      {activeTab === "gallery" && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari template (contoh: Modul Ajar, P5, LKPD, Presentasi)..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 font-medium"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? "bg-teal-700 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          {filteredTemplates.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <Palette className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Tidak Ada Template Ditemukan</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Coba ubah kata kunci pencarian atau tambahkan link template Canva baru milik sekolah Anda.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Tambah Template Canva Sekarang
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTemplates.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative"
                >
                  <div className="space-y-3">
                    {/* Header Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                        {getCategoryIcon(item.category)}
                        <span>{item.category}</span>
                      </div>

                      {item.isSchoolDefault ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                          Resmi Sekolah
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDeleteTemplate(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Hapus template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-sm group-hover:text-teal-600 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <a
                      href={item.canvaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka / Edit di Canva</span>
                    </a>

                    <button
                      onClick={() => {
                        setEmbedUrlInput(item.canvaUrl);
                        setActiveEmbedUrl(item.canvaUrl);
                        setActiveTab("embed_preview");
                      }}
                      className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                      title="Pratinjau di Sandbox"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GENERATOR MEDIA PEMBELAJARAN CANVA AI */}
      {activeTab === "ai_media" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Input Parameters */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Wand2 className="w-5 h-5" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Parameter Generator Presentasi & Media
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              {/* Subject */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mata Pelajaran
                </label>
                <select
                  value={mediaSubject}
                  onChange={(e) => setMediaSubject(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white"
                >
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic / CP / TP Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Topik / Materi Pembelajaran
                  </label>
                  {topicSuggestions.length > 0 && (
                    <span className="text-[10px] text-teal-600 font-bold">
                      {topicSuggestions.length} TP Tersedia di Kurikulum
                    </span>
                  )}
                </div>

                {topicSuggestions.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) setMediaTopic(e.target.value);
                    }}
                    className="w-full mb-2 p-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg text-indigo-950 dark:text-indigo-200 text-xs font-semibold"
                  >
                    <option value="">-- Pilih dari Tujuan Pembelajaran (TP) --</option>
                    {topicSuggestions.map((tp, idx) => (
                      <option key={idx} value={`${tp.tpCode ? tp.tpCode + ": " : ""}${tp.tpDescription}`}>
                        [{tp.subject}] {tp.tpCode || `TP-${idx + 1}`}: {(tp.tpDescription || "").slice(0, 45)}...
                      </option>
                    ))}
                  </select>
                )}

                <input
                  type="text"
                  value={mediaTopic}
                  onChange={(e) => setMediaTopic(e.target.value)}
                  placeholder="Ketik topik materi atau salin dari modul ajar..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                />
              </div>

              {/* Target Grade */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kelas / Fase
                </label>
                <input
                  type="text"
                  value={mediaTargetGrade}
                  onChange={(e) => setMediaTargetGrade(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              {/* Format Output */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Format Output Media
                </label>
                <select
                  value={mediaFormat}
                  onChange={(e) => setMediaFormat(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  <option value="Presentasi Pembelajaran Interaktif (16:9)">Slide Presentasi Interaktif (16:9)</option>
                  <option value="Infografis Edukasi Vertikal (A4/Poster)">Infografis Edukasi Vertikal (A4)</option>
                  <option value="Poster Dinding Aturan / Sudut Baca Kelas">Poster Dinding Kelas</option>
                  <option value="Komik Edukasi & Cerita Bergambar">Komik Edukasi Bergambar</option>
                  <option value="Modul Ajar Visual & Ringkasan Ringkas">Modul Visual Ringkas</option>
                </select>
              </div>

              {/* Design Style */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Gaya Desain & Warna
                </label>
                <select
                  value={mediaDesignStyle}
                  onChange={(e) => setMediaDesignStyle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  <option value="Minimalis Edukatif Ceria (Colorful Pastel)">Minimalis Edukatif Ceria (Colorful Pastel)</option>
                  <option value="Kartun Ilustratif & Ramah Anak (3D Vector)">Kartun Ilustratif Ramah Anak (3D Vector)</option>
                  <option value="Infografis Modern & Clean Clean High Contrast">Infografis Modern & Clean</option>
                  <option value="Deep Learning Experience (Mindful & Interactive)">Deep Learning Experience (Interactive)</option>
                  <option value="Eksplorasi Alam & Sains Realistis (Nature & Earth Tones)">Alam & Sains Realistis</option>
                </select>
              </div>

              <button
                onClick={handleGenerateMediaPrompt}
                className="w-full py-3 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all active:scale-98"
              >
                <Sparkles className="w-4 h-4 text-teal-300" />
                <span>Buat Prompt AI Canva Magic Design</span>
              </button>
            </div>
          </div>

          {/* Generated Prompt Output & Direct Launch */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Hasil Prompt AI Canva Magic Studio
                  </h3>
                </div>

                {generatedMediaPrompt && (
                  <button
                    onClick={() => handleCopyPrompt(generatedMediaPrompt, "media")}
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    {isCopyMediaSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Prompt</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {!generatedMediaPrompt ? (
                <div className="p-8 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <Palette className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-medium">
                    Klik tombol <b>"Buat Prompt AI Canva Magic Design"</b> di sebelah kiri untuk menghasilkan instruksi struktur desain otomatis.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto border border-slate-800 shadow-inner">
                    {generatedMediaPrompt}
                  </div>

                  {/* Action Steps Guide */}
                  <div className="p-4 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 rounded-xl space-y-2">
                    <h4 className="font-extrabold text-teal-900 dark:text-teal-200 text-xs flex items-center gap-1.5">
                      <ExternalLink className="w-4 h-4" />
                      Langkah Pembuatan di Canva AI:
                    </h4>
                    <ol className="list-decimal list-inside text-xs text-teal-800 dark:text-teal-300 space-y-1 font-medium">
                      <li>Salin prompt di atas menggunakan tombol <b>Salin Prompt</b>.</li>
                      <li>Buka editor Canva Magic Design / Presentations.</li>
                      <li>Tempelkan prompt di kotak pencarian Canva AI Magic Studio.</li>
                      <li>Canva AI akan membuatkan slide presentasi secara otomatis!</li>
                    </ol>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => handleOpenCanvaMagicSearch(mediaTopic, mediaFormat)}
                      className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Buat Langsung di Canva AI Search</span>
                    </button>

                    <a
                      href="https://www.canva.com/create/presentations/"
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5"
                    >
                      <span>Buka Editor Presentasi Canva</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GENERATOR DESAIN LKPD CANVA AI */}
      {activeTab === "ai_lkpd" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Parameters LKPD */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 border-b border-slate-100 dark:border-slate-800 pb-3">
              <FileText className="w-5 h-5" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Parameter LKPD / Worksheet Canva AI
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mata Pelajaran
                </label>
                <select
                  value={lkpdSubject}
                  onChange={(e) => setLkpdSubject(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Topik LKPD
                </label>
                <input
                  type="text"
                  value={lkpdTopic}
                  onChange={(e) => setLkpdTopic(e.target.value)}
                  placeholder="Ketik materi LKPD..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Model Aktivitas Belajar
                </label>
                <select
                  value={lkpdActivityType}
                  onChange={(e) => setLkpdActivityType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  <option value="Eksperimen & Diskusi Kelompok (PjBL)">Eksperimen & Proyek Kelompok (PjBL)</option>
                  <option value="Analisis Kasus & Problem Solving (PBL)">Analisis Kasus & Diskusi (PBL)</option>
                  <option value="Latihan Mandiri & Teka-Teki Silang Silabus">Latihan Mandiri & Teka-Teki</option>
                  <option value="Pengamatan Lapangan & Laporan Grafis">Pengamatan Lapangan & Tabel</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Gaya Tema Visual Canva
                </label>
                <select
                  value={lkpdThemeStyle}
                  onChange={(e) => setLkpdThemeStyle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  <option value="Komik Ilustratif & Petualangan Edukasi">Komik Ilustratif & Ceria</option>
                  <option value="Clean Minimalist A4 Ready Print (Garis Tegas)">Clean Minimalis Siap Cetak (Garis Tegas)</option>
                  <option value="Peta Pikiran & Diagram Vektor Modern">Peta Pikiran & Diagram Vektor</option>
                  <option value="Buku Detektif & Misi Rahasia Sains">Buku Detektif & Misi Rahasia</option>
                </select>
              </div>

              <button
                onClick={handleGenerateLkpdPrompt}
                className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all active:scale-98"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>Buat Prompt LKPD Canva AI</span>
              </button>
            </div>
          </div>

          {/* Generated LKPD Prompt */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Prompt Canva AI Worksheets
                  </h3>
                </div>

                {generatedLkpdPrompt && (
                  <button
                    onClick={() => handleCopyPrompt(generatedLkpdPrompt, "lkpd")}
                    className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950 hover:bg-amber-100 text-amber-800 dark:text-amber-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    {isCopyLkpdSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Prompt LKPD</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {!generatedLkpdPrompt ? (
                <div className="p-8 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-medium">
                    Klik tombol <b>"Buat Prompt LKPD Canva AI"</b> untuk menghasilkan instruksi pembuatan worksheet lengkap.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto border border-slate-800 shadow-inner">
                    {generatedLkpdPrompt}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <a
                      href="https://www.canva.com/worksheets/templates/"
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Buka Template LKPD / Worksheets Canva</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EMBED PREVIEW & SANDBOX */}
      {activeTab === "embed_preview" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Eye className="w-5 h-5 text-sky-600" />
                Pratinjau Langsung Desain & Embed Canva
              </h3>
              <p className="text-xs text-slate-500">
                Masukkan tautan Canva publik atau tautan Embed (`https://www.canva.com/design/...`) untuk melihat pratinjau media di dalam aplikasi.
              </p>
            </div>
          </div>

          {/* URL Input Bar */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={embedUrlInput}
              onChange={(e) => setEmbedUrlInput(e.target.value)}
              placeholder="Tempel tautan Canva di sini (contoh: https://www.canva.com/design/...)"
              className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
            />
            <button
              onClick={() => setActiveEmbedUrl(embedUrlInput)}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <Eye className="w-4 h-4" />
              <span>Muat Pratinjau</span>
            </button>
          </div>

          {/* Frame Container */}
          {activeEmbedUrl ? (
            <div className="space-y-2">
              <div className="w-full h-[520px] bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-lg relative">
                <iframe
                  src={
                    activeEmbedUrl.includes("/watch") || activeEmbedUrl.includes("/view")
                      ? activeEmbedUrl
                      : activeEmbedUrl.replace("/edit", "/view?embed")
                  }
                  title="Canva Design Embedded"
                  className="w-full h-full border-0"
                  allowFullScreen
                />
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500 px-1">
                <span>Tautan aktif: <code className="text-sky-600 font-mono">{activeEmbedUrl}</code></span>
                <a
                  href={activeEmbedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 hover:underline font-bold flex items-center gap-1"
                >
                  <span>Buka di Tab Baru</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 space-y-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <Eye className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-medium max-w-md mx-auto">
                Belum ada tautan yang dimuat. Pilih template dari <b>Galeri Canva</b> atau tempel tautan karya Canva Anda di atas.
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: TAMBAH TEMPLATE CANVA BARU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 animate-fadeIn backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400">
                <Plus className="w-5 h-5" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Tambah Template Canva Baru
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTemplate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Template Canva *
                </label>
                <input
                  type="text"
                  required
                  value={newTemplate.title || ""}
                  onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                  placeholder="Contoh: Modul Ajar IPAS Kelas 5 Bab 1"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori
                  </label>
                  <select
                    value={newTemplate.category || "Modul Ajar"}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                  >
                    <option value="Modul Ajar">Modul Ajar</option>
                    <option value="LKPD">LKPD</option>
                    <option value="Presentasi">Presentasi</option>
                    <option value="Banner / Dekorasi">Banner / Dekorasi</option>
                    <option value="Sertifikat">Sertifikat</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mata Pelajaran
                  </label>
                  <input
                    type="text"
                    value={newTemplate.subject || ""}
                    onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                    placeholder="Contoh: Bahasa Indonesia"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tautan URL Canva (Bagikan / Template) *
                </label>
                <input
                  type="url"
                  required
                  value={newTemplate.canvaUrl || ""}
                  onChange={(e) => setNewTemplate({ ...newTemplate, canvaUrl: e.target.value })}
                  placeholder="https://www.canva.com/design/..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={3}
                  value={newTemplate.description || ""}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Jelaskan isi media pembelajaran, komponen visual, atau peruntukan kelas..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Simpan Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
