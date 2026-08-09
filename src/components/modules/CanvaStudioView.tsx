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
  RefreshCw,
  FolderOpen,
  Filter,
  Wand2,
  Eye,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Volume2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Video,
  Layers,
  Download,
  Share2,
  Save,
  History,
  FileSpreadsheet,
} from "lucide-react";
import pptxgen from "pptxgenjs";
import { CanvaTemplateItem, CPTPItem, SchoolIdentity, MediaBananaItem, MediaBananaSlide } from "../../types";
import { generateAIContent } from "../../lib/aiHelper";
import { STORAGE_KEYS, loadStoredData, saveStoredData } from "../../lib/storage";

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
  const [activeTab, setActiveTab] = useState<"ai_banana" | "history" | "gallery" | "embed_preview">("ai_banana");

  // AI Banana Form Parameters
  const [subject, setSubject] = useState<string>(subjects[0] || "Bahasa Indonesia");
  const [materiTopic, setMateriTopic] = useState<string>(initialSelectedTopic || "Proses Fotosintesis & Daur Hidup Tumbuhan");
  const [targetGrade, setTargetGrade] = useState<string>(schoolIdentity?.gradeClass || "Kelas IV SD");
  const [mediaType, setMediaType] = useState<"gambar" | "video_animasi" | "slide_interaktif">("slide_interaktif");
  const [styleTheme, setStyleTheme] = useState<string>("Warna Ceria & Minimalis Edukatif");
  const [userPromptText, setUserPromptText] = useState<string>("");

  // AI Generation Loading State & Result
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeMediaItem, setActiveMediaItem] = useState<MediaBananaItem | null>(null);
  const [savedMediaItems, setSavedMediaItems] = useState<MediaBananaItem[]>(() =>
    loadStoredData<MediaBananaItem[]>(STORAGE_KEYS.MEDIA_BANANA_HISTORY, [])
  );
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<boolean>(false);

  // Google Slides Modal State
  const [showGoogleSlidesModal, setShowGoogleSlidesModal] = useState<boolean>(false);
  const [selectedItemForGoogleSlides, setSelectedItemForGoogleSlides] = useState<MediaBananaItem | null>(null);
  const [outlineCopied, setOutlineCopied] = useState<boolean>(false);

  // Player / Slide Viewer States
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [showSpeakerNotes, setShowSpeakerNotes] = useState<boolean>(false);
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<number, string>>({});
  const [isAnimationPlaying, setIsAnimationPlaying] = useState<boolean>(true);
  const [currentKeyframeIndex, setCurrentKeyframeIndex] = useState<number>(0);

  // Gallery Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");

  // Embed Preview State
  const [embedUrlInput, setEmbedUrlInput] = useState<string>("");
  const [activeEmbedUrl, setActiveEmbedUrl] = useState<string>("");

  // Topic Suggestions
  const topicSuggestions = useMemo(() => {
    return (cptpList || []).map((cp: any) => ({
      subject: cp.subject || "",
      element: cp.element || "",
      tpCode: cp.codeTP || cp.tpCode || "",
      tpDescription: cp.descriptionTP || cp.tpDescription || cp.tpText || "",
    }));
  }, [cptpList]);

  // Handle Generate Media AI Banana
  const handleGenerateBananaMedia = async () => {
    setIsGenerating(true);
    const effectivePrompt = userPromptText.trim() || `Buatkan media pembelajaran AI Banana tipe ${mediaType} untuk mapel ${subject} kelas ${targetGrade} dengan topik: "${materiTopic}". Gaya visual: ${styleTheme}.`;

    const systemPrompt = `Anda adalah AI Banana Studio (AI Media Pembelajaran). Hasilkan JSON valid dengan struktur berikut:
{
  "title": "Judul Media Ajar Kreatif",
  "mediaType": "${mediaType}",
  "styleTheme": "${styleTheme}",
  "animationKeyframes": ["Frame 1: ...", "Frame 2: ...", "Frame 3: ...", "Frame 4: ..."],
  "animationCaption": "Penjelasan narasi video/animasi...",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Judul Slide 1",
      "subtitle": "Subjudul",
      "points": ["Poin 1", "Poin 2", "Poin 3"],
      "visualPrompt": "Deskripsi visual gambar slide",
      "speakerNotes": "Catatan penjelasan guru saat mengajar",
      "interactiveQuiz": {
        "question": "Pertanyaan pemantik/kuis singkat?",
        "options": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
        "correctAnswer": "Pilihan A",
        "explanation": "Penjelasan ringkas jawaban yang benar."
      }
    }
  ]
}`;

    try {
      const response = await generateAIContent({
        prompt: effectivePrompt,
        systemInstruction: systemPrompt,
      });

      let parsed: any = null;
      if (response) {
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.warn("JSON parsing failed, falling back to structured media template.");
        }
      }

      // Fallback structured content
      const generatedSlides: MediaBananaSlide[] = parsed?.slides || [
        {
          slideNumber: 1,
          title: `Pengenalan ${materiTopic}`,
          subtitle: `Mata Pelajaran ${subject} - ${targetGrade}`,
          points: [
            `Selamat datang di media ajar interaktif AI Banana!`,
            `Topik hari ini: ${materiTopic}`,
            `Mari kita eksplorasi bersama secara seru, kontekstual, dan bermakna.`
          ],
          visualPrompt: `Ilustrasi berwarna ceria tentang ${materiTopic} dengan karakter siswa ramah.`,
          speakerNotes: `Sapa siswa dengan senyum, berikan pertanyaan pemantik awal tentang ${materiTopic}.`,
          interactiveQuiz: {
            question: `Apakah Anda sudah pernah mendengar tentang ${materiTopic} sebelumnya?`,
            options: ["Sudah pernah dan paham", "Pernah dengar sedikit", "Belum pernah sama sekali", "Ingin tahu lebih banyak"],
            correctAnswer: "Sudah pernah dan paham",
            explanation: "Bagus sekali! Pengalaman awal akan membantu pemahaman materi hari ini."
          }
        },
        {
          slideNumber: 2,
          title: "Konsep Utama & Pemahaman Inti",
          subtitle: "Pembelajaran Mendalam (Deep Learning)",
          points: [
            `1. Mengamati bagian-bagian penting dari ${materiTopic}`,
            `2. Menghubungkan proses alami dengan kehidupan sehari-hari`,
            `3. Menganalisis manfaat utamanya bagi lingkungan dan manusia`
          ],
          visualPrompt: `Infografis diagram interaktif yang memperlihatkan struktur ${materiTopic}.`,
          speakerNotes: `Ajak siswa berdiskusi secara berpasangan untuk mengamati diagram.`,
          interactiveQuiz: {
            question: `Mengapa ${materiTopic} sangat penting bagi kehidupan kita?`,
            options: [
              "Menjaga keseimbangan ekosistem bumi",
              "Sebagai hiburan semata",
              "Hanya ada di buku teks",
              "Tidak memiliki pengaruh langsung"
            ],
            correctAnswer: "Menjaga keseimbangan ekosistem bumi",
            explanation: "Tepat! Proses ini mendukung siklus kehidupan di bumi secara berkelanjutan."
          }
        },
        {
          slideNumber: 3,
          title: "Aktivitas Praktik & Diskusi Kelompok",
          subtitle: "Langkah Kerja Kolaboratif Murid",
          points: [
            `Langkah 1: Buka Lembar Kerja Peserta Didik (LKPD)`,
            `Langkah 2: Amati objek/studi kasus yang disajikan di meja kelompok`,
            `Langkah 3: Tuliskan hasil diskusi pada lembar pengamatan`
          ],
          visualPrompt: `Ilustrasi kelompok murid SD sedang berdiskusi dengan gembira membawa alat peraga.`,
          speakerNotes: `Bagi kelas menjadi 4 kelompok. Bimbing siswa yang membutuhkan bantuan ekstra.`
        },
        {
          slideNumber: 4,
          title: "Kuis Interaktif & Refleksi Belajar",
          subtitle: "Evaluasi Pemahaman Cepat",
          points: [
            `Bandingkan hasil pengamatan kelompokmu dengan kelompok lain`,
            `Sampaikan 1 hal paling berkesan yang kamu pelajari hari ini`
          ],
          visualPrompt: `Piala bintang kebaikan dan panggung apresiasi kelas ceria.`,
          speakerNotes: `Apresiasi seluruh jawaban murid, berikan tepuk tangan bersama.`,
          interactiveQuiz: {
            question: `Sikap apa yang paling utama dilatih saat berdiskusi kelompok?`,
            options: ["Gotong Royong & Saling Menghargai", "Ingin Menang Sendiri", "Tidak Mau Mendengar", "Diam Saja"],
            correctAnswer: "Gotong Royong & Saling Menghargai",
            explanation: "Hebat! Gotong royong dan saling menghargai adalah Profil Pelajar Pancasila."
          }
        }
      ];

      const newItem: MediaBananaItem = {
        id: `banana-${Date.now()}`,
        title: parsed?.title || `Media Ajar AI Banana: ${materiTopic}`,
        subject,
        targetGrade,
        materiTopic,
        mediaType,
        promptUsed: effectivePrompt,
        styleTheme,
        animationKeyframes: parsed?.animationKeyframes || [
          `Keyframe 1: Pembukaan animasi ${materiTopic} dengan karakter masuk`,
          `Keyframe 2: Zoom in ke bagian inti proses ${materiTopic}`,
          `Keyframe 3: Animasi pergerakan molekul/elemen interaktif`,
          `Keyframe 4: Penutup dengan kesimpulan dan bintang prestasi`
        ],
        animationCaption: parsed?.animationCaption || `Video animasi interaktif memvisualisasikan ${materiTopic} secara dinamis dengan karakter edukatif ramah anak.`,
        slides: generatedSlides,
        createdAt: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      };

      setActiveMediaItem(newItem);
      setSavedMediaItems((prev) => {
        const updated = [newItem, ...prev];
        saveStoredData(STORAGE_KEYS.MEDIA_BANANA_HISTORY, updated);
        return updated;
      });
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
      setCurrentSlideIndex(0);
      setSelectedQuizAnswers({});
    } catch (error) {
      console.error("Failed to generate AI Banana media:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Save active media item manually
  const handleSaveActiveMedia = (itemToSave?: MediaBananaItem) => {
    const target = itemToSave || activeMediaItem;
    if (!target) return;

    setSavedMediaItems((prev) => {
      const existsIdx = prev.findIndex((i) => i.id === target.id);
      let updated: MediaBananaItem[];
      if (existsIdx >= 0) {
        updated = [...prev];
        updated[existsIdx] = target;
      } else {
        updated = [target, ...prev];
      }
      saveStoredData(STORAGE_KEYS.MEDIA_BANANA_HISTORY, updated);
      return updated;
    });

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  // Delete media item from history
  const handleDeleteMediaFromHistory = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Apakah Anda yakin ingin menghapus media ini dari riwayat tersimpan?")) return;

    setSavedMediaItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveStoredData(STORAGE_KEYS.MEDIA_BANANA_HISTORY, updated);
      return updated;
    });

    if (activeMediaItem?.id === id) {
      setActiveMediaItem(null);
    }
  };

  // Export to PowerPoint (.pptx) using pptxgenjs
  const handleExportPPTX = (itemToExport?: MediaBananaItem) => {
    const media = itemToExport || activeMediaItem;
    if (!media) return;

    try {
      const pptx = new pptxgen();
      pptx.layout = "LAYOUT_16x9";
      pptx.author = "Aplikasi Administrasi Mengajar AI";
      pptx.title = media.title;

      // Title Slide
      const slide1 = pptx.addSlide();
      slide1.background = { color: "0F172A" }; // Dark slate theme
      slide1.addText(media.title, {
        x: 0.8,
        y: 1.8,
        w: 8.4,
        h: 1.5,
        fontSize: 28,
        bold: true,
        color: "38BDF8",
        align: "left",
      });
      slide1.addText(`Mata Pelajaran: ${media.subject} | ${media.targetGrade}\nMateri Pokok: ${media.materiTopic}\nTanggal: ${media.createdAt}`, {
        x: 0.8,
        y: 3.5,
        w: 8.4,
        h: 1.5,
        fontSize: 14,
        color: "F8FAFC",
        align: "left",
      });

      // Slide content
      if (media.slides && media.slides.length > 0) {
        media.slides.forEach((s) => {
          const slide = pptx.addSlide();
          slide.background = { color: "F8FAFC" };

          // Title
          slide.addText(`Slide ${s.slideNumber}: ${s.title}`, {
            x: 0.6,
            y: 0.5,
            w: 8.8,
            h: 0.8,
            fontSize: 22,
            bold: true,
            color: "0F172A",
          });

          // Subtitle
          if (s.subtitle) {
            slide.addText(s.subtitle, {
              x: 0.6,
              y: 1.2,
              w: 8.8,
              h: 0.5,
              fontSize: 14,
              italic: true,
              color: "0369A1",
            });
          }

          // Points
          if (s.points && s.points.length > 0) {
            const pointsText = s.points.map((pt) => `• ${pt}`).join("\n\n");
            slide.addText(pointsText, {
              x: 0.6,
              y: 1.8,
              w: 8.8,
              h: 3.0,
              fontSize: 14,
              color: "1E293B",
            });
          }

          // Quiz if present
          if (s.interactiveQuiz) {
            slide.addText(`Kuis Interaktif: ${s.interactiveQuiz.question}\nPilihan: ${s.interactiveQuiz.options.join(" | ")}`, {
              x: 0.6,
              y: 5.0,
              w: 8.8,
              h: 0.8,
              fontSize: 11,
              color: "047857",
              italic: true,
            });
          }

          // Speaker notes
          if (s.speakerNotes) {
            slide.addNotes(s.speakerNotes);
          }
        });
      }

      const fileNameClean = media.title.replace(/[^a-zA-Z0-9]/g, "_") || "Media_Ajar_AI";
      pptx.writeFile({ fileName: `${fileNameClean}.pptx` });
    } catch (err) {
      console.error("Export PPTX error:", err);
      alert("Gagal mengespor ke PPTX. Silakan periksa kembali data slide.");
    }
  };

  // Open Google Slides Export Modal
  const handleOpenGoogleSlidesModal = (itemToExport?: MediaBananaItem) => {
    const target = itemToExport || activeMediaItem;
    if (!target) return;

    setSelectedItemForGoogleSlides(target);
    setShowGoogleSlidesModal(true);
    setOutlineCopied(false);
  };

  // Copy Google Slides Outline
  const handleCopyGoogleSlidesOutline = () => {
    if (!selectedItemForGoogleSlides) return;

    let text = `PRESENTASI MEDIA AJAR: ${selectedItemForGoogleSlides.title}\n`;
    text += `Mata Pelajaran: ${selectedItemForGoogleSlides.subject} | ${selectedItemForGoogleSlides.targetGrade}\n`;
    text += `Materi: ${selectedItemForGoogleSlides.materiTopic}\n\n`;

    selectedItemForGoogleSlides.slides?.forEach((s) => {
      text += `--- SLIDE ${s.slideNumber}: ${s.title} ---\n`;
      if (s.subtitle) text += `Sub-judul: ${s.subtitle}\n`;
      text += `Poin Utama:\n`;
      s.points.forEach((p) => (text += `- ${p}\n`));
      if (s.speakerNotes) text += `Catatan Guru: ${s.speakerNotes}\n`;
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setOutlineCopied(true);
    setTimeout(() => setOutlineCopied(false), 2500);
  };

  const handleCopyPrompt = () => {
    if (activeMediaItem) {
      navigator.clipboard.writeText(activeMediaItem.promptUsed);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Save Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-amber-200" />
          <span>Media AI Berhasil Disimpan ke Storage!</span>
        </div>
      )}

      {/* Hero Banner AI Banana Studio */}
      <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-emerald-600 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold text-yellow-100">
              <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
              <span>Desain Media Pembelajaran AI Banana Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              🍌 AI Banana Media Studio
            </h1>
            <p className="text-xs sm:text-sm text-yellow-50 leading-relaxed font-medium">
              Buat Gambar Infografis, Video & Gambar Beranimasi, serta Slide Presentasi Interaktif secara otomatis berdasarkan Prompt AI sesuai Mata Pelajaran, Kelas, dan Materi Pokok.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab("ai_banana")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === "ai_banana"
                  ? "bg-white text-amber-900 shadow-md scale-105"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <Wand2 className="w-4 h-4" />
              <span>Generator AI Banana</span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === "history"
                  ? "bg-white text-amber-900 shadow-md scale-105"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Riwayat Media AI ({savedMediaItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("gallery")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === "gallery"
                  ? "bg-white text-amber-900 shadow-md scale-105"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>Galeri & Template ({canvaTemplates.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("embed_preview")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === "embed_preview"
                  ? "bg-white text-amber-900 shadow-md scale-105"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Embed Canva Player</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: AI BANANA GENERATOR */}
      {activeTab === "ai_banana" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Input Menu Prompt */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 text-amber-700 dark:text-amber-400">
              <Wand2 className="w-5 h-5" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                Menu Prompt AI Banana
              </h3>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Jenis Output Media */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tipe Hasil Media AI
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMediaType("gambar")}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      mediaType === "gambar"
                        ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 font-extrabold shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                    <span className="text-[11px]">Gambar / Grafis</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMediaType("video_animasi")}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      mediaType === "video_animasi"
                        ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 font-extrabold shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Video className="w-4 h-4 text-emerald-600" />
                    <span className="text-[11px]">Video Animasi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMediaType("slide_interaktif")}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      mediaType === "slide_interaktif"
                        ? "bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 font-extrabold shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Presentation className="w-4 h-4 text-indigo-600" />
                    <span className="text-[11px]">Slide Interaktif</span>
                  </button>
                </div>
              </div>

              {/* Mata Pelajaran */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mata Pelajaran
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                >
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kelas / Tingkat */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kelas / Tingkat
                </label>
                <select
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="Kelas I SD">Kelas I SD (Fase A)</option>
                  <option value="Kelas II SD">Kelas II SD (Fase A)</option>
                  <option value="Kelas III SD">Kelas III SD (Fase B)</option>
                  <option value="Kelas IV SD">Kelas IV SD (Fase B)</option>
                  <option value="Kelas V SD">Kelas V SD (Fase C)</option>
                  <option value="Kelas VI SD">Kelas VI SD (Fase C)</option>
                </select>
              </div>

              {/* Materi Pokok / Topik */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Materi Pokok / Topik Utama
                  </label>
                  {topicSuggestions.length > 0 && (
                    <span className="text-[10px] text-amber-600 font-bold">
                      {topicSuggestions.length} TP Terhubung
                    </span>
                  )}
                </div>

                {topicSuggestions.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) setMateriTopic(e.target.value);
                    }}
                    className="w-full mb-2 p-2 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-950 dark:text-amber-200 text-xs font-semibold"
                  >
                    <option value="">-- Impor dari Tujuan Pembelajaran (TP) --</option>
                    {topicSuggestions.map((tp, idx) => (
                      <option key={idx} value={`${tp.tpCode ? tp.tpCode + ": " : ""}${tp.tpDescription}`}>
                        [{tp.subject}] {tp.tpCode || `TP-${idx + 1}`}: {(tp.tpDescription || "").slice(0, 40)}...
                      </option>
                    ))}
                  </select>
                )}

                <input
                  type="text"
                  value={materiTopic}
                  onChange={(e) => setMateriTopic(e.target.value)}
                  placeholder="Ketik materi pokok (contoh: Fotosintesis & Tumbuhan Hijau)..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                />
              </div>

              {/* Gaya Desain Visual */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Gaya Desain & Nuansa AI
                </label>
                <select
                  value={styleTheme}
                  onChange={(e) => setStyleTheme(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                >
                  <option value="Warna Ceria & Minimalis Edukatif">Warna Ceria & Minimalis Edukatif</option>
                  <option value="Kartun Ilustratif 3D Ramah Anak">Kartun Ilustratif 3D Ramah Anak</option>
                  <option value="Infografis Modern & Clean Vector">Infografis Modern & Clean Vector</option>
                  <option value="Alam & Eksplorasi Sains Realistis">Alam & Eksplorasi Sains Realistis</option>
                  <option value="Komik Cerita Bergambar Interaktif">Komik Cerita Bergambar Interaktif</option>
                </select>
              </div>

              {/* Intruksi Tambahan Prompt */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Instruksi Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={userPromptText}
                  onChange={(e) => setUserPromptText(e.target.value)}
                  placeholder="Contoh: Tambahkan kuis singkat 3 soal tentang syarat fotosintesis dan karakter kartun kelinci..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateBananaMedia}
                disabled={isGenerating}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-black rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all active:scale-98 disabled:opacity-60"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Membangun Media AI Banana...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-yellow-200" />
                    <span>Generate Media Pembelajaran AI Banana</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Hasil Generate Media Player */}
          <div className="lg:col-span-7 space-y-4">
            {!activeMediaItem ? (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <Palette className="w-7 h-7" />
                </div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-base">
                  Pratinjau Hasil Media AI Banana
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Pilih tipe media (Gambar, Video/Gambar Beranimasi, atau Slide Presentasi Interaktif), lalu klik tombol <b>Generate Media Pembelajaran AI Banana</b>.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                {/* Header Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[10px] uppercase tracking-wider">
                      {activeMediaItem.mediaType === "gambar"
                        ? "🖼️ Gambar / Infografis"
                        : activeMediaItem.mediaType === "video_animasi"
                        ? "🎬 Video & Gambar Beranimasi"
                        : "📊 Slide Presentasi Interaktif"}
                    </span>
                    <h3 className="font-black text-slate-900 dark:text-white text-base mt-1">
                      {activeMediaItem.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleSaveActiveMedia()}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Media</span>
                    </button>

                    <button
                      onClick={() => handleExportPPTX()}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                      title="Ekspor ke PowerPoint (.pptx)"
                    >
                      <Presentation className="w-3.5 h-3.5" />
                      <span>Ekspor PPTX</span>
                    </button>

                    <button
                      onClick={() => handleOpenGoogleSlidesModal()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                      title="Ekspor / Buka di Google Slides"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Google Slides</span>
                    </button>

                    <button
                      onClick={handleCopyPrompt}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5"
                    >
                      {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copySuccess ? "Tersalin" : "Salin Prompt"}</span>
                    </button>
                  </div>
                </div>

                {/* MODE 1: INTERACTIVE SLIDE PRESENTATION PLAYER */}
                {activeMediaItem.mediaType === "slide_interaktif" && activeMediaItem.slides && (
                  <div className="space-y-4">
                    {/* Active Slide Display Box */}
                    {(() => {
                      const currentSlide = activeMediaItem.slides[currentSlideIndex];
                      if (!currentSlide) return null;

                      return (
                        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-2xl relative min-h-[340px] flex flex-col justify-between border border-indigo-900/50">
                          {/* Slide Top Badge */}
                          <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <span className="text-xs font-extrabold text-indigo-300">
                              Slide {currentSlideIndex + 1} dari {activeMediaItem.slides.length}
                            </span>
                            <span className="text-[11px] font-bold text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full">
                              {activeMediaItem.subject} - {activeMediaItem.targetGrade}
                            </span>
                          </div>

                          {/* Slide Main Content */}
                          <div className="my-4 space-y-3">
                            <h2 className="text-xl font-black text-amber-300 tracking-tight">
                              {currentSlide.title}
                            </h2>
                            {currentSlide.subtitle && (
                              <p className="text-xs font-semibold text-indigo-200 italic">
                                {currentSlide.subtitle}
                              </p>
                            )}

                            <ul className="space-y-2 mt-3">
                              {currentSlide.points.map((pt, idx) => (
                                <li key={idx} className="text-xs text-slate-100 flex items-start gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                  <span>{pt}</span>
                                </li>
                              ))}
                            </ul>

                            {/* Interactive Quiz Card on Slide */}
                            {currentSlide.interactiveQuiz && (
                              <div className="bg-amber-950/80 border border-amber-500/40 p-4 rounded-xl mt-4 text-amber-100 space-y-2">
                                <div className="flex items-center gap-1.5 font-extrabold text-xs text-amber-300">
                                  <HelpCircle className="w-4 h-4 text-yellow-300" />
                                  <span>Kuis Interaktif Slide:</span>
                                </div>
                                <p className="text-xs font-bold text-white">
                                  {currentSlide.interactiveQuiz.question}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                  {currentSlide.interactiveQuiz.options.map((opt, oIdx) => {
                                    const isSelected = selectedQuizAnswers[currentSlideIndex] === opt;
                                    const isCorrect = opt === currentSlide.interactiveQuiz?.correctAnswer;

                                    return (
                                      <button
                                        key={oIdx}
                                        onClick={() =>
                                          setSelectedQuizAnswers((prev) => ({
                                            ...prev,
                                            [currentSlideIndex]: opt,
                                          }))
                                        }
                                        className={`p-2 rounded-lg text-xs font-bold text-left transition-all border ${
                                          isSelected
                                            ? isCorrect
                                              ? "bg-emerald-600 text-white border-emerald-400"
                                              : "bg-rose-600 text-white border-rose-400"
                                            : "bg-white/10 hover:bg-white/20 border-white/20 text-slate-200"
                                        }`}
                                      >
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>

                                {selectedQuizAnswers[currentSlideIndex] && (
                                  <p className="text-[11px] italic font-medium pt-1 text-amber-200">
                                    💡 <b>Penjelasan:</b> {currentSlide.interactiveQuiz.explanation}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Slide Navigation Bar */}
                          <div className="flex items-center justify-between border-t border-white/10 pt-3">
                            <button
                              disabled={currentSlideIndex === 0}
                              onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold text-xs rounded-lg flex items-center gap-1"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              <span>Sebelumnya</span>
                            </button>

                            <button
                              onClick={() => setShowSpeakerNotes(!showSpeakerNotes)}
                              className="text-xs font-bold text-indigo-300 hover:text-white underline"
                            >
                              {showSpeakerNotes ? "Sembunyikan Catatan Guru" : "Tampilkan Catatan Guru"}
                            </button>

                            <button
                              disabled={currentSlideIndex === activeMediaItem.slides.length - 1}
                              onClick={() =>
                                setCurrentSlideIndex((prev) =>
                                  Math.min(activeMediaItem.slides!.length - 1, prev + 1)
                                )
                              }
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white font-bold text-xs rounded-lg flex items-center gap-1"
                            >
                              <span>Berikutnya</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Speaker Notes */}
                    {showSpeakerNotes && activeMediaItem.slides[currentSlideIndex]?.speakerNotes && (
                      <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 p-3 rounded-xl text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed font-medium">
                        🗣️ <b>Catatan Guru (Speaker Notes):</b>{" "}
                        {activeMediaItem.slides[currentSlideIndex].speakerNotes}
                      </div>
                    )}
                  </div>
                )}

                {/* MODE 2: ANIMATED MOTION CANVAS / VIDEO PLAYER */}
                {activeMediaItem.mediaType === "video_animasi" && (
                  <div className="space-y-3">
                    <div className="bg-slate-950 text-white rounded-2xl p-6 border border-slate-800 min-h-[300px] flex flex-col justify-between relative overflow-hidden">
                      {/* Video Player Canvas */}
                      <div className="text-center my-auto space-y-3">
                        <div className="w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 rounded-2xl flex items-center justify-center mx-auto shadow-lg animate-pulse">
                          <Video className="w-10 h-10" />
                        </div>
                        <h4 className="text-lg font-black text-emerald-300">
                          {activeMediaItem.animationKeyframes?.[currentKeyframeIndex] || "Animasi Berjalan..."}
                        </h4>
                        <p className="text-xs text-slate-300 max-w-md mx-auto italic font-medium">
                          "{activeMediaItem.animationCaption}"
                        </p>
                      </div>

                      {/* Video Playback Controls */}
                      <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs">
                        <button
                          onClick={() => setIsAnimationPlaying(!isAnimationPlaying)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5"
                        >
                          {isAnimationPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          <span>{isAnimationPlaying ? "Jeda Video" : "Putar Video"}</span>
                        </button>

                        <div className="flex items-center gap-2">
                          {activeMediaItem.animationKeyframes?.map((_, kIdx) => (
                            <button
                              key={kIdx}
                              onClick={() => setCurrentKeyframeIndex(kIdx)}
                              className={`w-3 h-3 rounded-full transition-all ${
                                currentKeyframeIndex === kIdx ? "bg-emerald-400 scale-125" : "bg-slate-700"
                              }`}
                            />
                          ))}
                        </div>

                        <span className="text-slate-400 font-mono text-[11px]">Keyframe {currentKeyframeIndex + 1}/4</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODE 3: GAMBAR / INFOGRAFIS GRAPHIC */}
                {activeMediaItem.mediaType === "gambar" && (
                  <div className="space-y-3">
                    <div className="bg-gradient-to-tr from-amber-500 via-orange-400 to-yellow-300 p-6 rounded-2xl text-slate-950 shadow-md text-center space-y-4">
                      <div className="bg-white/90 backdrop-blur-md rounded-xl p-5 shadow-lg border border-white space-y-2">
                        <span className="px-3 py-1 bg-amber-600 text-white font-black text-xs rounded-full inline-block">
                          INFOGRAFIS EDUKASI SD
                        </span>
                        <h3 className="text-xl font-black text-slate-900">{activeMediaItem.materiTopic}</h3>
                        <p className="text-xs font-semibold text-slate-700">
                          {activeMediaItem.subject} - {activeMediaItem.targetGrade}
                        </p>
                        <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-900 text-left space-y-1 font-medium border border-amber-200">
                          <p>📌 <b>Gaya Visual:</b> {activeMediaItem.styleTheme}</p>
                          <p>💡 <b>Prompt Utama:</b> {activeMediaItem.promptUsed.slice(0, 120)}...</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RIWAYAT MEDIA AI TERSIMPAN */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari media tersimpan berdasarkan judul atau materi..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
              />
            </div>
            <div className="text-xs font-bold text-slate-500">
              Total Media Tersimpan: <span className="text-amber-600 font-black">{savedMediaItems.length}</span>
            </div>
          </div>

          {savedMediaItems.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <History className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">
                Belum Ada Riwayat Media AI Tersimpan
              </h3>
              <p className="text-xs text-slate-500">
                Media pembelajaran yang Anda buat di tab Generator AI Banana akan otomatis tersimpan di sini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedMediaItems
                .filter(
                  (item) =>
                    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.materiTopic.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.subject.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between hover:shadow-md transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[10px] uppercase">
                          {item.mediaType === "gambar"
                            ? "🖼️ Gambar"
                            : item.mediaType === "video_animasi"
                            ? "🎬 Video"
                            : "📊 Slide"}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          {item.createdAt}
                        </span>
                      </div>
                      <h4 className="font-black text-slate-900 dark:text-white text-sm line-clamp-2">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 font-medium">
                        <b>Mapel:</b> {item.subject} | {item.targetGrade}
                      </p>
                      <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                        Topic: {item.materiTopic}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setActiveMediaItem(item);
                            setActiveTab("ai_banana");
                          }}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Buka Player</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleExportPPTX(item)}
                            className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/50 rounded-lg transition-all"
                            title="Ekspor PPTX"
                          >
                            <Presentation className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenGoogleSlidesModal(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-all"
                            title="Buka Google Slides"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => handleDeleteMediaFromHistory(item.id, e)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all"
                            title="Hapus Media"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GALERI & TEMPLATE CANVA */}
      {activeTab === "gallery" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari template Canva sekolah..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
              />
            </div>
            <a
              href="https://www.canva.com/templates/"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Jelajah Canva</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {canvaTemplates.map((item) => (
              <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                    {item.category}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">{item.subject}</span>
                </div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{item.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                <a
                  href={item.canvaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Template di Canva</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: EMBED PREVIEW */}
      {activeTab === "embed_preview" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Eye className="w-5 h-5 text-amber-600" />
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              Pratinjau Embed Media Canva
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={embedUrlInput}
              onChange={(e) => setEmbedUrlInput(e.target.value)}
              placeholder="Tempel tautan Canva di sini (https://www.canva.com/design/...)"
              className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium"
            />
            <button
              onClick={() => setActiveEmbedUrl(embedUrlInput)}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Muat Embed
            </button>
          </div>

          {activeEmbedUrl ? (
            <div className="w-full h-[500px] bg-slate-950 border rounded-2xl overflow-hidden shadow-lg">
              <iframe
                src={activeEmbedUrl.replace("/edit", "/view?embed")}
                title="Canva Design Embed"
                className="w-full h-full border-0"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 space-y-2 border border-dashed rounded-2xl">
              <Eye className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">Tempel tautan Canva untuk melihat pratinjau interaktif di dalam aplikasi.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL EKSPOR KE GOOGLE SLIDES */}
      {showGoogleSlidesModal && selectedItemForGoogleSlides && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-black">
                  📊
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Ekspor ke Google Slides
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedItemForGoogleSlides.title}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowGoogleSlidesModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Pilih metode ekspor Google Slides yang paling nyaman untuk Anda:
              </p>

              {/* Step 1: Download PPTX */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>Metode Terbaik: Unduh PPTX & Buka di Google Slides</span>
                </div>
                <p className="text-slate-500 text-[11px] leading-normal">
                  Unduh file PowerPoint (.pptx), lalu buka Google Slides atau Google Drive Anda dan pilih <b>File &gt; Buka / Impor Slide</b>.
                </p>
                <button
                  onClick={() => handleExportPPTX(selectedItemForGoogleSlides)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh File PPTX Sekarang</span>
                </button>
              </div>

              {/* Step 2: Open Google Slides & Copy Text Outline */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <span>Metode Alternatif: Buka Tab Google Slides Baru</span>
                </div>
                <p className="text-slate-500 text-[11px] leading-normal">
                  Salin outline materi slide AI di bawah ini untuk digunakan pada AI Google Slides / Gemini Workspace.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleCopyGoogleSlidesOutline}
                    className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {outlineCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{outlineCopied ? "Tersalin!" : "Salin Outline"}</span>
                  </button>

                  <a
                    href="https://slides.new"
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs text-center"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Buka Slides.new</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-right">
              <button
                onClick={() => setShowGoogleSlidesModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
