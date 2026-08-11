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
import { CanvaTemplateItem, CPTPItem, SchoolIdentity, MediaBananaItem, MediaBananaSlide, AISettings } from "../../types";
import { generateAIContent, generateAIImage } from "../../lib/aiHelper";
import { STORAGE_KEYS, loadStoredData, saveStoredData } from "../../lib/storage";
import { GeminiPromptHub } from "./GeminiPromptHub";

interface CanvaStudioViewProps {
  cptpList?: CPTPItem[];
  subjects?: string[];
  schoolIdentity?: SchoolIdentity;
  canvaTemplates?: CanvaTemplateItem[];
  onSaveCanvaTemplates?: (updated: CanvaTemplateItem[]) => void;
  initialSelectedTopic?: string;
  aiSettings?: AISettings;
}

export const CanvaStudioView: React.FC<CanvaStudioViewProps> = ({
  cptpList = [],
  subjects = ["Bahasa Indonesia", "Matematika", "IPAS", "Pancasila", "Seni Budaya", "PJOK", "Bahasa Inggris"],
  schoolIdentity,
  canvaTemplates = [],
  onSaveCanvaTemplates,
  initialSelectedTopic = "",
  aiSettings,
}) => {
  const [activeTab, setActiveTab] = useState<"ai_banana" | "nano_image_studio" | "omni_video_studio" | "history" | "gallery" | "embed_preview">("ai_banana");

  // AI Model Engine Selection & Diagnostics
  const [selectedAiEngine, setSelectedAiEngine] = useState<"nano_banana_2" | "gemini_omni" | "gemini_flash">("nano_banana_2");
  const [generationError, setGenerationError] = useState<string | null>(null);

  // AI Banana Form Parameters
  const [subject, setSubject] = useState<string>(subjects[0] || "Bahasa Indonesia");
  const [materiTopic, setMateriTopic] = useState<string>(initialSelectedTopic || "Proses Fotosintesis & Daur Hidup Tumbuhan");
  const [targetGrade, setTargetGrade] = useState<string>(schoolIdentity?.gradeClass || "Kelas IV SD");
  const [mediaType, setMediaType] = useState<"gambar" | "video_animasi" | "slide_interaktif">("slide_interaktif");
  const [styleTheme, setStyleTheme] = useState<string>("Warna Ceria & Minimalis Edukatif");
  const [userPromptText, setUserPromptText] = useState<string>("");

  // Nano Banana 2 Image Studio State
  const [nanoImagePrompt, setNanoImagePrompt] = useState<string>("");
  const [nanoImageStyle, setNanoImageStyle] = useState<string>("Infografis Vektor Edukatif 3D");
  const [isGeneratingNanoImage, setIsGeneratingNanoImage] = useState<boolean>(false);
  const [nanoImageError, setNanoImageError] = useState<string | null>(null);
  const [generatedNanoImageData, setGeneratedNanoImageData] = useState<{
    title: string;
    visualPrompt: string;
    colorPalette: string[];
    layoutDescription: string;
    suggestedCaptions: string[];
    imageUrl?: string;
  } | null>(null);

  // Gemini Omni Video Studio State
  const [omniVideoPrompt, setOmniVideoPrompt] = useState<string>("");
  const [omniVideoDuration, setOmniVideoDuration] = useState<string>("30 Detik (Animasi Singkat)");
  const [isGeneratingOmniVideo, setIsGeneratingOmniVideo] = useState<boolean>(false);
  const [omniVideoError, setOmniVideoError] = useState<string | null>(null);
  const [generatedOmniVideoData, setGeneratedOmniVideoData] = useState<{
    title: string;
    narrationScript: string;
    bgmRecommendation: string;
    keyframes: {
      frameNumber: number;
      title: string;
      description: string;
      cameraMovement: string;
      voiceover: string;
    }[];
  } | null>(null);

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

  // Speech Synthesis Helper for Voiceover Narration
  const handleSpeakNarration = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert("Browser Anda tidak mendukung fitur Text-to-Speech.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  // Download SVG Infographic Graphic Helper
  const handleDownloadInfographicSVG = (item: MediaBananaItem) => {
    const pointsList = item.slides?.[0]?.points || [
      `Topik utama: ${item.materiTopic}`,
      `Mata Pelajaran: ${item.subject}`,
      `Media Ajar Olahan Nano Banana 2`
    ];

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#d97706;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" rx="30" fill="url(#grad1)" />
      <rect x="30" y="30" width="740" height="540" rx="20" fill="#ffffff" opacity="0.96" />
      
      <rect x="50" y="50" width="700" height="85" rx="15" fill="#fef3c7" />
      <text x="70" y="82" font-family="sans-serif" font-size="13" font-weight="bold" fill="#b45309">INFOGRAFIS HASIL OLAHAN NANO BANANA 2</text>
      <text x="70" y="112" font-family="sans-serif" font-size="22" font-weight="900" fill="#1e293b">${item.materiTopic.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>

      <text x="70" y="162" font-family="sans-serif" font-size="14" font-weight="bold" fill="#475569">Mata Pelajaran: ${item.subject} | ${item.targetGrade}</text>
      <text x="70" y="187" font-family="sans-serif" font-size="12" fill="#64748b">Gaya Visual: ${item.styleTheme}</text>

      <rect x="50" y="210" width="700" height="330" rx="15" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2" />
      <text x="70" y="245" font-family="sans-serif" font-size="16" font-weight="bold" fill="#0f172a">Ringkasan Konsep Visual & Poin Utama:</text>

      ${pointsList
        .slice(0, 5)
        .map((pt, idx) => `<g transform="translate(70, ${275 + idx * 48})">
            <circle cx="14" cy="14" r="14" fill="#059669" />
            <text x="14" y="19" font-family="sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">${idx + 1}</text>
            <text x="40" y="19" font-family="sans-serif" font-size="14" font-weight="bold" fill="#334155">${pt.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>
          </g>`)
        .join("")}
    </svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Infografis_NanoBanana2_${item.materiTopic.replace(/\s+/g, "_")}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
    setGenerationError(null);
    setIsGenerating(true);

    const topic = materiTopic.trim() || `Materi ${subject} ${targetGrade}`;
    const effectivePrompt =
      userPromptText.trim() ||
      `Buatkan media pembelajaran AI Banana tipe ${mediaType} untuk mapel ${subject} kelas ${targetGrade} dengan topik: "${topic}". Gaya visual: ${styleTheme}. Gunakan AI Engine: ${selectedAiEngine}.`;

    const systemPrompt = `Anda adalah AI Banana Studio (AI Media Pembelajaran berbasis Nano Banana 2 & Gemini Omni). Hasilkan JSON valid dengan struktur berikut:
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
        model: selectedAiEngine === "nano_banana_2" ? "gemini-3.6-flash" : selectedAiEngine === "gemini_omni" ? "gemini-3.6-flash" : "gemini-3.6-flash",
        manualApiKey: aiSettings?.manualApiKey,
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
          title: `Pengenalan ${topic}`,
          subtitle: `Mata Pelajaran ${subject} - ${targetGrade}`,
          points: [
            `Selamat datang di media ajar interaktif AI Banana!`,
            `Topik hari ini: ${topic}`,
            `Mari kita eksplorasi bersama secara seru, kontekstual, dan bermakna.`
          ],
          visualPrompt: `Ilustrasi berwarna ceria tentang ${topic} dengan karakter siswa ramah. Dibuat oleh ${
            selectedAiEngine === "nano_banana_2" ? "Nano Banana 2 Image Engine" : "Gemini Omni Video Engine"
          }.`,
          speakerNotes: `Sapa siswa dengan senyum, berikan pertanyaan pemantik awal tentang ${topic}.`,
          interactiveQuiz: {
            question: `Apakah Anda sudah pernah mendengar tentang ${topic} sebelumnya?`,
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
            `1. Mengamati bagian-bagian penting dari ${topic}`,
            `2. Menghubungkan proses alami dengan kehidupan sehari-hari`,
            `3. Menganalisis manfaat utamanya bagi lingkungan dan manusia`
          ],
          visualPrompt: `Infografis diagram interaktif yang memperlihatkan struktur ${topic}.`,
          speakerNotes: `Ajak siswa berdiskusi secara berpasangan untuk mengamati diagram.`,
          interactiveQuiz: {
            question: `Mengapa ${topic} sangat penting bagi kehidupan kita?`,
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

      // Generate Real AI Image using AI Agent Nano Banana 2 if mediaType is gambar or nano_banana_2 engine selected
      let generatedImageUrl: string | undefined = undefined;
      if (mediaType === "gambar" || selectedAiEngine === "nano_banana_2") {
        try {
          const imgPrompt = `Educational vector graphic illustration for primary school students, topic: ${topic}, subject: ${subject}, style: ${styleTheme}, vibrant school colors, clean infographic layout, high definition 8k`;
          const imgResult = await generateAIImage({
            prompt: imgPrompt,
            manualApiKey: aiSettings?.manualApiKey,
          });
          generatedImageUrl = imgResult.imageUrl;
        } catch (imgErr) {
          console.warn("AI Image Agent Nano Banana 2 generation warning:", imgErr);
        }
      }

      const newItem: MediaBananaItem = {
        id: `banana-${Date.now()}`,
        title: parsed?.title || `Media Ajar AI Banana: ${topic}`,
        subject,
        targetGrade,
        materiTopic: topic,
        mediaType,
        promptUsed: effectivePrompt,
        styleTheme: `${styleTheme} (${
          selectedAiEngine === "nano_banana_2"
            ? "Nano Banana 2 Image Agent"
            : selectedAiEngine === "gemini_omni"
            ? "Gemini Omni Video"
            : "Gemini Flash"
        })`,
        imageUrl: generatedImageUrl,
        animationKeyframes: parsed?.animationKeyframes || [
          `Keyframe 1: Pembukaan animasi ${topic} dengan karakter masuk`,
          `Keyframe 2: Zoom in ke bagian inti proses ${topic}`,
          `Keyframe 3: Animasi pergerakan molekul/elemen interaktif`,
          `Keyframe 4: Penutup dengan kesimpulan dan bintang prestasi`
        ],
        animationCaption:
          parsed?.animationCaption ||
          `Video animasi interaktif memvisualisasikan ${topic} secara dinamis dengan karakter edukatif ramah anak. Engine: ${selectedAiEngine}.`,
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
    } catch (error: any) {
      console.error("Failed to generate AI Banana media:", error);
      setGenerationError(
        error?.message ||
          "Gagal menghasilkan media pembelajaran AI. Mohon pastikan Kunci API Gemini sudah dikonfigurasi pada menu Setelan AI Agen."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Nano Banana 2 Image Studio Handler
  const handleGenerateNanoImage = async () => {
    setNanoImageError(null);
    setIsGeneratingNanoImage(true);
    const promptToUse =
      nanoImagePrompt.trim() ||
      `Buatkan konsep visual gambar infografis edukatif tentang: "${materiTopic}" untuk mapel ${subject} ${targetGrade}. Gaya: ${nanoImageStyle}.`;

    const systemInstruction = `Anda adalah Nano Banana 2 AI Image Engine. Hasilkan JSON valid untuk desain gambar/grafis edukasi:
{
  "title": "Judul Grafis/Gambar Nano Banana 2",
  "visualPrompt": "Prompt bahasa Inggris sangat detail untuk generator gambar (Nano Banana 2 / Imagen 3)",
  "colorPalette": ["#FFD166", "#06D6A0", "#118AB2", "#EF476F"],
  "layoutDescription": "Panduan susunan tata letak elemen visual pada canvas",
  "suggestedCaptions": ["Teks Penjelas 1", "Teks Penjelas 2", "Teks Penjelas 3"]
}`;

    try {
      const response = await generateAIContent({
        prompt: promptToUse,
        systemInstruction,
        model: "gemini-3.6-flash",
        manualApiKey: aiSettings?.manualApiKey,
      });

      let parsed: any = null;
      if (response) {
        const match = response.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      }

      const visualPrompt =
        parsed?.visualPrompt ||
        `3D rendered educational diagram of ${materiTopic}, vibrant colors, cute SD student character, soft shadows, clear labels, clean vector style.`;

      let generatedImgUrl: string | undefined = undefined;
      try {
        const imgResult = await generateAIImage({
          prompt: visualPrompt,
          manualApiKey: aiSettings?.manualApiKey,
        });
        generatedImgUrl = imgResult.imageUrl;
      } catch (imgErr) {
        console.warn("Nano Banana 2 image generation error:", imgErr);
      }

      setGeneratedNanoImageData({
        title: parsed?.title || `Grafis Nano Banana 2: ${materiTopic}`,
        visualPrompt: visualPrompt,
        colorPalette: parsed?.colorPalette || ["#F59E0B", "#10B981", "#3B82F6", "#EC4899"],
        layoutDescription:
          parsed?.layoutDescription ||
          `Gunakan tata letak terpusat dengan diagram utama di tengah dan 3 kotak fakta di sekelilingnya.`,
        suggestedCaptions: parsed?.suggestedCaptions || [
          `Bagian Utama dari ${materiTopic}`,
          `Proses Kerja Alami & Manfaat Utama`,
          `Kesimpulan Ringkas untuk Kelas`
        ],
        imageUrl: generatedImgUrl,
      });
    } catch (err: any) {
      console.error("Error generating Nano Banana 2 image:", err);
      setNanoImageError(err?.message || "Gagal membuat gambar dengan Nano Banana 2.");
    } finally {
      setIsGeneratingNanoImage(false);
    }
  };

  // Gemini Omni Video Studio Handler
  const handleGenerateOmniVideo = async () => {
    setOmniVideoError(null);
    setIsGeneratingOmniVideo(true);
    const promptToUse =
      omniVideoPrompt.trim() ||
      `Buatkan skenario video animasi interaktif Gemini Omni tentang: "${materiTopic}" untuk mapel ${subject} ${targetGrade}. Durasi: ${omniVideoDuration}.`;

    const systemInstruction = `Anda adalah Gemini Omni AI Video & Motion Engine. Hasilkan JSON valid skenario video animasi interaktif:
{
  "title": "Judul Video Animasi Omni",
  "narrationScript": "Naskah narasi suara lengkap dari awal hingga akhir",
  "bgmRecommendation": "Rekomendasi musik latar (BGM)",
  "keyframes": [
    {
      "frameNumber": 1,
      "title": "Awal / Pembuka",
      "description": "Deskripsi visual adegan",
      "cameraMovement": "Gerakan kamera (Zoom in, Pan left)",
      "voiceover": "Suara narator di frame ini"
    }
  ]
}`;

    try {
      const response = await generateAIContent({
        prompt: promptToUse,
        systemInstruction,
        model: "gemini-3.6-flash",
        manualApiKey: aiSettings?.manualApiKey,
      });

      let parsed: any = null;
      if (response) {
        const match = response.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      }

      setGeneratedOmniVideoData({
        title: parsed?.title || `Video Animasi Gemini Omni: ${materiTopic}`,
        narrationScript:
          parsed?.narrationScript ||
          `Halo anak-anak hebat! Hari ini kita akan menjelajahi petualangan seru tentang ${materiTopic}. Mari kita amati bagaimana proses unik ini terjadi secara menakjubkan!`,
        bgmRecommendation: parsed?.bgmRecommendation || "Ceria, Edukatif, Musik Instrumental Akustik Cepat",
        keyframes: parsed?.keyframes || [
          {
            frameNumber: 1,
            title: "Adegan 1: Perkenalan Karakter",
            description: `Karakter animasi guru masuk menyapa murid dengan latar belakang laboratorium alam ceria ${materiTopic}.`,
            cameraMovement: "Slow Zoom In dari Medium Shot ke Close Up",
            voiceover: `Halo teman-teman! Siap belajar ${materiTopic} hari ini?`
          },
          {
            frameNumber: 2,
            title: "Adegan 2: Visualisasi Inti",
            description: `Animasi molekul / elemen bergerak memperlihatkan proses interaktif secara perlahan.`,
            cameraMovement: "Pan Right menyusuri alur gerakan",
            voiceover: `Lihatlah bagaimana elemen-elemen ini saling berinteraksi secara alami!`
          },
          {
            frameNumber: 3,
            title: "Adegan 3: Aplikasi Praktis",
            description: `Anak-anak sekolah beraktivitas dan menerapkan konsep dalam kehidupan nyata.`,
            cameraMovement: "Wide Shot dengan efek bintang apresiasi",
            voiceover: `Hebat sekali! Sekarang kita tahu manfaatnya bagi bumi.`
          }
        ]
      });
      setCurrentKeyframeIndex(0);
    } catch (err: any) {
      console.error("Error generating Gemini Omni video:", err);
      setOmniVideoError(err?.message || "Gagal membuat skenario video Gemini Omni.");
    } finally {
      setIsGeneratingOmniVideo(false);
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
              Buat Gambar Infografis (Nano Banana 2), Video Animasi (Gemini Omni), dan Slide Presentasi Interaktif secara otomatis dan langsung diproses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab("ai_banana")}
              className={`px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all ${
                activeTab === "ai_banana"
                  ? "bg-white text-amber-950 shadow-md ring-2 ring-white/50 scale-105"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <Wand2 className="w-4 h-4 text-amber-400" />
              <span>AI Media Generator</span>
            </button>

            <button
              onClick={() => setActiveTab("nano_image_studio")}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                activeTab === "nano_image_studio"
                  ? "bg-white text-amber-950 shadow-md ring-2 ring-white/50 scale-105"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>Studio Gambar Nano Banana 2</span>
            </button>

            <button
              onClick={() => setActiveTab("omni_video_studio")}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                activeTab === "omni_video_studio"
                  ? "bg-white text-emerald-950 shadow-md ring-2 ring-white/50 scale-105"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <Video className="w-4 h-4 text-emerald-300" />
              <span>Studio Video Gemini Omni</span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                activeTab === "history"
                  ? "bg-white text-amber-900 shadow-md scale-105"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Riwayat ({savedMediaItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("gallery")}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                activeTab === "gallery"
                  ? "bg-white text-amber-900 shadow-md scale-105"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>Galeri ({canvaTemplates.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("embed_preview")}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                activeTab === "embed_preview"
                  ? "bg-white text-amber-900 shadow-md scale-105"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Embed Canva</span>
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

            {generationError && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-400 text-rose-900 dark:text-rose-100 rounded-xl space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-black text-rose-700 dark:text-rose-300">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Gagal Generasi AI</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGenerationError(null)}
                    className="text-rose-500 hover:text-rose-700 font-bold"
                  >
                    ✕
                  </button>
                </div>
                <p className="whitespace-pre-line leading-relaxed text-[11px] font-medium">
                  {generationError}
                </p>
                <div className="pt-1.5 border-t border-rose-200 dark:border-rose-800/60 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-rose-600 dark:text-rose-300 font-semibold">
                    Pastikan API Key di Setelan AI.
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateBananaMedia}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 shadow-xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Coba Lagi</span>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              {/* AI Engine Selection */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Dukungan Mesin AI (Engine)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedAiEngine("nano_banana_2")}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      selectedAiEngine === "nano_banana_2"
                        ? "bg-amber-100 dark:bg-amber-950/80 border-amber-500 ring-2 ring-amber-400 text-amber-950 dark:text-amber-100 font-black shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[10px]">Nano Banana 2</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAiEngine("gemini_omni")}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      selectedAiEngine === "gemini_omni"
                        ? "bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-400 text-emerald-950 dark:text-emerald-100 font-black shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[10px]">Gemini Omni</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAiEngine("gemini_flash")}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      selectedAiEngine === "gemini_flash"
                        ? "bg-indigo-100 dark:bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-400 text-indigo-950 dark:text-indigo-100 font-black shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-[10px]">Gemini Flash</span>
                  </button>
                </div>
              </div>

              {/* Jenis Output Media */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tipe Hasil Media AI
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMediaType("gambar");
                      setSelectedAiEngine("nano_banana_2");
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      mediaType === "gambar"
                        ? "bg-amber-100 dark:bg-amber-950/80 border-amber-500 text-amber-950 dark:text-amber-100 font-black ring-2 ring-amber-400 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                    <span className="text-[11px] font-extrabold">Gambar / Grafis</span>
                    <span className="text-[9px] text-amber-700 dark:text-amber-300 font-bold">(Nano Banana 2)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMediaType("video_animasi");
                      setSelectedAiEngine("gemini_omni");
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      mediaType === "video_animasi"
                        ? "bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-black ring-2 ring-emerald-400 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Video className="w-4 h-4 text-emerald-600" />
                    <span className="text-[11px] font-extrabold">Video Animasi</span>
                    <span className="text-[9px] text-emerald-700 dark:text-emerald-300 font-bold">(Gemini Omni)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMediaType("slide_interaktif");
                      setSelectedAiEngine("gemini_flash");
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      mediaType === "slide_interaktif"
                        ? "bg-indigo-100 dark:bg-indigo-950/80 border-indigo-500 text-indigo-950 dark:text-indigo-100 font-black ring-2 ring-indigo-400 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Presentation className="w-4 h-4 text-indigo-600" />
                    <span className="text-[11px] font-extrabold">Slide Interaktif</span>
                    <span className="text-[9px] text-indigo-700 dark:text-indigo-300 font-bold">(Gemini Flash)</span>
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

                {/* MODE 2: ANIMATED MOTION CANVAS / VIDEO PLAYER (GEMINI OMNI PROCESSED) */}
                {activeMediaItem.mediaType === "video_animasi" && (
                  <div className="space-y-4">
                    <div className="bg-slate-950 text-white rounded-2xl p-6 border border-slate-800 min-h-[320px] flex flex-col justify-between relative overflow-hidden shadow-2xl">
                      {/* Video Player Canvas */}
                      <div className="text-center my-auto space-y-4">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-[11px] font-black text-emerald-300">
                          <Video className="w-3.5 h-3.5 text-emerald-400" />
                          <span>HASIL OLAHAN LANGSUNG GEMINI OMNI VIDEO</span>
                        </div>

                        <div className="w-24 h-24 bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-300 text-slate-950 rounded-3xl flex items-center justify-center mx-auto shadow-xl animate-pulse">
                          <Video className="w-12 h-12" />
                        </div>

                        <div className="space-y-1 max-w-lg mx-auto">
                          <h4 className="text-xl font-black text-emerald-200">
                            {activeMediaItem.animationKeyframes?.[currentKeyframeIndex] || "Adegan Animasi Berjalan..."}
                          </h4>
                          <p className="text-xs text-slate-300 italic font-medium leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                            "{activeMediaItem.animationCaption}"
                          </p>
                        </div>
                      </div>

                      {/* Video Playback & Voiceover Controls */}
                      <div className="border-t border-slate-800/80 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsAnimationPlaying(!isAnimationPlaying)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl flex items-center gap-1.5 shadow-xs"
                          >
                            {isAnimationPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            <span>{isAnimationPlaying ? "Jeda Video" : "Putar Video"}</span>
                          </button>

                          <button
                            onClick={() =>
                              handleSpeakNarration(
                                activeMediaItem.animationCaption ||
                                  activeMediaItem.animationKeyframes?.[currentKeyframeIndex] ||
                                  activeMediaItem.title
                              )
                            }
                            className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                            title="Putar suara narasi narator pembelajaran"
                          >
                            <Volume2 className="w-4 h-4 text-cyan-200" />
                            <span>Suara Narator</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {activeMediaItem.animationKeyframes?.map((_, kIdx) => (
                            <button
                              key={kIdx}
                              onClick={() => setCurrentKeyframeIndex(kIdx)}
                              className={`w-3.5 h-3.5 rounded-full transition-all ${
                                currentKeyframeIndex === kIdx ? "bg-emerald-400 ring-2 ring-emerald-300 scale-125" : "bg-slate-700"
                              }`}
                              title={`Keyframe ${kIdx + 1}`}
                            />
                          ))}
                        </div>

                        <span className="text-slate-400 font-mono text-[11px] font-bold">
                          Keyframe {currentKeyframeIndex + 1} / {activeMediaItem.animationKeyframes?.length || 4}
                        </span>
                      </div>
                    </div>

                    {/* Keyframe Scenes Breakdown */}
                    {activeMediaItem.animationKeyframes && (
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                        <h5 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-emerald-600" />
                          <span>Rincian Adegan Keyframe Video (Gemini Omni):</span>
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {activeMediaItem.animationKeyframes.map((kf, idx) => (
                            <div
                              key={idx}
                              onClick={() => setCurrentKeyframeIndex(idx)}
                              className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                                currentKeyframeIndex === idx
                                  ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 font-bold text-emerald-950 dark:text-emerald-100"
                                  : "bg-white dark:bg-slate-900 border-slate-200 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                              }`}
                            >
                              <span className="text-[10px] font-black text-emerald-600">Frame {idx + 1}:</span>
                              <p className="text-[11px] font-medium leading-snug">{kf}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* MODE 3: GAMBAR / INFOGRAFIS GRAPHIC (NANO BANANA 2 PROCESSED) */}
                {activeMediaItem.mediaType === "gambar" && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-tr from-amber-500 via-orange-400 to-emerald-500 p-6 rounded-2xl text-slate-950 shadow-xl space-y-4 border border-amber-300">
                      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <span className="px-3 py-1 bg-amber-600 text-white font-black text-xs rounded-full inline-flex items-center gap-1 shadow-xs">
                            <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
                            <span>HASIL OLAHAN LANGSUNG NANO BANANA 2</span>
                          </span>
                          <span className="text-xs font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                            {activeMediaItem.subject} • {activeMediaItem.targetGrade}
                          </span>
                        </div>

                        <div className="space-y-2 text-left">
                          <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                            {activeMediaItem.materiTopic}
                          </h3>
                          <p className="text-xs font-semibold text-slate-600">
                            <b>Gaya Estetika Visual:</b> {activeMediaItem.styleTheme}
                          </p>
                        </div>

                        {/* Real AI Generated Image Container */}
                        {activeMediaItem.imageUrl && (
                          <div className="space-y-3">
                            <div className="relative group overflow-hidden rounded-2xl border-2 border-amber-300 bg-slate-950 shadow-2xl text-center">
                              <img
                                src={activeMediaItem.imageUrl}
                                alt={activeMediaItem.materiTopic}
                                className="w-full max-h-[500px] object-contain mx-auto transition-transform duration-300 group-hover:scale-102"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md text-amber-300 px-3 py-1 rounded-full text-[10px] font-black border border-amber-400/50 shadow-lg">
                                🖼️ Nano Banana 2 AI Image
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <a
                                href={activeMediaItem.imageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                              >
                                <span>Buka Ukuran Penuh</span>
                              </a>
                              <a
                                href={activeMediaItem.imageUrl}
                                download={`NanoBanana2_${activeMediaItem.materiTopic.replace(/\s+/g, "_")}.jpg`}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Unduh Gambar AI</span>
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Interactive Vector Graphic Points Board */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-left">
                          <h5 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-amber-600" />
                            <span>Visualisasi & Elemen Grafis Infografis:</span>
                          </h5>

                          <div className="space-y-2 text-xs">
                            {(activeMediaItem.slides?.[0]?.points || [
                              `1. Diagram visual interaktif topik ${activeMediaItem.materiTopic}`,
                              `2. Karakter edukatif ramah anak dengan gaya ${activeMediaItem.styleTheme}`,
                              `3. Label dan ilustrasi pendukung konsep utama`,
                            ]).map((pt, pIdx) => (
                              <div key={pIdx} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-start gap-2.5 shadow-2xs">
                                <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                  {pIdx + 1}
                                </span>
                                <span className="font-bold text-slate-800">{pt}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons for Graphic */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                          <button
                            type="button"
                            onClick={() => handleDownloadInfographicSVG(activeMediaItem)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md"
                          >
                            <Download className="w-4 h-4" />
                            <span>Unduh Grafis Vector (SVG)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              window.print();
                            }}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5"
                          >
                            <span>Cetak Infografis</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PROMPT GEMINI RINCI HUB (SIAP COPY) */}
                <GeminiPromptHub
                  subject={activeMediaItem.subject}
                  targetGrade={activeMediaItem.targetGrade}
                  materiTopic={activeMediaItem.materiTopic}
                  styleTheme={activeMediaItem.styleTheme}
                  slides={activeMediaItem.slides}
                  animationKeyframes={activeMediaItem.animationKeyframes}
                  animationCaption={activeMediaItem.animationCaption}
                  imageUrl={activeMediaItem.imageUrl}
                  title={activeMediaItem.title}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: STUDIO GAMBAR NANO BANANA 2 */}
      {activeTab === "nano_image_studio" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-lg">
                🖼️
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-lg">
                  Studio Gambar & Grafis Nano Banana 2
                </h3>
                <p className="text-xs text-slate-500">
                  Membuat, mengolah, dan mengkreasikan gambar infografis, diagram 3D, serta ilustrasi edukatif dengan AI Nano Banana 2.
                </p>
              </div>
            </div>
          </div>

          {nanoImageError && (
            <div className="p-4 bg-rose-50 border border-rose-300 text-rose-800 rounded-2xl text-xs space-y-1">
              <span className="font-bold">Error Nano Banana 2:</span> {nanoImageError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mata Pelajaran & Materi Pokok
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Mapel..."
                    className="p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  />
                  <input
                    type="text"
                    value={targetGrade}
                    onChange={(e) => setTargetGrade(e.target.value)}
                    placeholder="Kelas..."
                    className="p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  />
                </div>
                <input
                  type="text"
                  value={materiTopic}
                  onChange={(e) => setMateriTopic(e.target.value)}
                  placeholder="Materi Pokok (contoh: Daur Air & Siklus Hujan)..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Gaya & Estetika Visual Gambar
                </label>
                <select
                  value={nanoImageStyle}
                  onChange={(e) => setNanoImageStyle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-semibold"
                >
                  <option value="Infografis Vektor Edukatif 3D">Infografis Vektor Edukatif 3D</option>
                  <option value="Diagram Kartun SD Berwarna Ceria">Diagram Kartun SD Berwarna Ceria</option>
                  <option value="Ilustrasi Buku Teks Realistis Detail">Ilustrasi Buku Teks Realistis Detail</option>
                  <option value="Komik Edukasi & Karakter Kartun">Komik Edukasi & Karakter Kartun</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Instruksi / Prompt Gambar Tambahan
                </label>
                <textarea
                  rows={3}
                  value={nanoImagePrompt}
                  onChange={(e) => setNanoImagePrompt(e.target.value)}
                  placeholder="Perjelas bagian yang ingin digambar (contoh: Gambar diagram daur air lengkap dengan awan, uap air, hujan, dan sungai dengan label anak panah jelas)..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-medium"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateNanoImage}
                disabled={isGeneratingNanoImage}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50"
              >
                {isGeneratingNanoImage ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mengolah Gambar Nano Banana 2...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-yellow-100" />
                    <span>Generate & Olah Gambar Nano Banana 2</span>
                  </>
                )}
              </button>
            </div>

            <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-800/60 border rounded-2xl p-5 space-y-4">
              {!generatedNanoImageData ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <ImageIcon className="w-12 h-12 mx-auto text-amber-400" />
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                    Studio Gambar Nano Banana 2 Siap
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Masukkan instruksi di sebelah kiri dan klik Generate untuk menghasilkan konsep visual gambar, skema diagram, dan prompt gambar AI.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Generated Real Image Display */}
                  {generatedNanoImageData.imageUrl && (
                    <div className="p-4 bg-slate-900 border-2 border-amber-400/60 rounded-2xl shadow-xl space-y-3">
                      <div className="flex items-center justify-between text-amber-300 font-extrabold text-xs">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                          <span>Gambar AI Hasil Olahan Agent Nano Banana 2:</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <a
                            href={generatedNanoImageData.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] flex items-center gap-1"
                          >
                            <span>Buka Ukuran Penuh</span>
                          </a>
                          <a
                            href={generatedNanoImageData.imageUrl}
                            download={`Nano_Banana_2_${generatedNanoImageData.title.replace(/\s+/g, "_")}.jpg`}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            <span>Unduh Gambar</span>
                          </a>
                        </div>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-slate-700 bg-black/50 text-center">
                        <img
                          src={generatedNanoImageData.imageUrl}
                          alt={generatedNanoImageData.title}
                          className="w-full max-h-[480px] object-contain mx-auto"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-white dark:bg-slate-900 border rounded-xl shadow-xs space-y-2">
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-extrabold rounded-full text-[10px]">
                      🖼️ Nano Banana 2 Result
                    </span>
                    <h4 className="font-black text-slate-900 dark:text-white text-base">
                      {generatedNanoImageData.title}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      <b>Panduan Tata Letak:</b> {generatedNanoImageData.layoutDescription}
                    </p>
                  </div>

                  <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                    <h5 className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Wand2 className="w-4 h-4 text-amber-600" />
                      <span>Prompt Generasi Gambar AI (Nano Banana 2 / Imagen)</span>
                    </h5>
                    <p className="p-2.5 bg-white dark:bg-slate-900 border rounded-lg text-[11px] font-mono text-slate-800 dark:text-slate-200 leading-relaxed">
                      {generatedNanoImageData.visualPrompt}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedNanoImageData.visualPrompt);
                        alert("Prompt Gambar Nano Banana 2 tersalin!");
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg flex items-center gap-1 text-[11px]"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Prompt Gambar</span>
                    </button>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-900 border rounded-xl space-y-2">
                    <h5 className="font-extrabold text-slate-900 dark:text-white">
                      Rekomendasi Palet Warna & Teks Penjelas
                    </h5>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-500">Palet Warna:</span>
                      {generatedNanoImageData.colorPalette.map((col, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <span className="w-5 h-5 rounded-full border shadow-xs" style={{ backgroundColor: col }} />
                          <span className="text-[10px] font-mono">{col}</span>
                        </div>
                      ))}
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 pt-1">
                      {generatedNanoImageData.suggestedCaptions.map((cap, idx) => (
                        <li key={idx}><b>Teks {idx + 1}:</b> {cap}</li>
                      ))}
                    </ul>
                  </div>

                  {/* PROMPT GEMINI RINCI HUB */}
                  <GeminiPromptHub
                    subject={subject}
                    targetGrade={targetGrade}
                    materiTopic={materiTopic}
                    styleTheme={nanoImageStyle}
                    customVisualPrompt={generatedNanoImageData.visualPrompt}
                    imageUrl={generatedNanoImageData.imageUrl}
                    title={generatedNanoImageData.title}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: STUDIO VIDEO GEMINI OMNI */}
      {activeTab === "omni_video_studio" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg">
                🎬
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-lg">
                  Studio Video & Motion Gemini Omni
                </h3>
                <p className="text-xs text-slate-500">
                  Merancang video animasi interaktif, alur keyframe adegan, narasi suara, serta pengolahan gerak dengan AI Gemini Omni.
                </p>
              </div>
            </div>
          </div>

          {omniVideoError && (
            <div className="p-4 bg-rose-50 border border-rose-300 text-rose-800 rounded-2xl text-xs space-y-1">
              <span className="font-bold">Error Gemini Omni:</span> {omniVideoError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mata Pelajaran & Topik Video
                </label>
                <input
                  type="text"
                  value={materiTopic}
                  onChange={(e) => setMateriTopic(e.target.value)}
                  placeholder="Materi Pokok (contoh: Daur Hidup Kupu-kupu)..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-semibold mb-2"
                />
                <select
                  value={omniVideoDuration}
                  onChange={(e) => setOmniVideoDuration(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                >
                  <option value="30 Detik (Animasi Singkat)">30 Detik (Animasi Singkat Pemantik)</option>
                  <option value="1 Menit (Animasi Konsep)">1 Menit (Animasi Konsep Utama)</option>
                  <option value="2 Menit (Animasi Studi Kasus)">2 Menit (Animasi Studi Kasus Lengkap)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Instruksi Skenario Video Gemini Omni
                </label>
                <textarea
                  rows={4}
                  value={omniVideoPrompt}
                  onChange={(e) => setOmniVideoPrompt(e.target.value)}
                  placeholder="Jelaskan kebutuhan adegan animasi (contoh: Buatkan 3 adegan animasi yang menampilkan metamorfosis ulat menjadi kepompong lalu kupu-kupu dengan narasi suara lembut ramah anak)..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-medium"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateOmniVideo}
                disabled={isGeneratingOmniVideo}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50"
              >
                {isGeneratingOmniVideo ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Merancang Skenario Video Omni...</span>
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 text-emerald-100" />
                    <span>Generate Video & Motion Gemini Omni</span>
                  </>
                )}
              </button>
            </div>

            <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-800/60 border rounded-2xl p-5 space-y-4">
              {!generatedOmniVideoData ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <Video className="w-12 h-12 mx-auto text-emerald-500" />
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                    Studio Video Gemini Omni Siap
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Ketik instruksi skenario video di sebelah kiri lalu klik Generate untuk membangun alur adegan keyframe, musik latar, dan narasi Gemini Omni.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-white dark:bg-slate-900 border rounded-xl shadow-xs space-y-2">
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 font-extrabold rounded-full text-[10px]">
                      🎬 Gemini Omni Video Scenario
                    </span>
                    <h4 className="font-black text-slate-900 dark:text-white text-base">
                      {generatedOmniVideoData.title}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      <b>Rekomendasi Musik Latar (BGM):</b> {generatedOmniVideoData.bgmRecommendation}
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                    <h5 className="font-extrabold text-emerald-900 dark:text-emerald-200">
                      Naskah Narasi Suara Pengajar
                    </h5>
                    <p className="p-3 bg-white dark:bg-slate-900 border rounded-lg text-slate-800 dark:text-slate-200 leading-relaxed italic">
                      "{generatedOmniVideoData.narrationScript}"
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
                      <span>Alur Keyframe Adegan Animasi ({generatedOmniVideoData.keyframes.length} Frame)</span>
                    </h5>

                    <div className="space-y-2">
                      {generatedOmniVideoData.keyframes.map((kf) => (
                        <div
                          key={kf.frameNumber}
                          className="p-3 bg-white dark:bg-slate-900 border rounded-xl space-y-1 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-emerald-600 text-xs">
                              Frame {kf.frameNumber}: {kf.title}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded-md text-slate-600">
                              📹 {kf.cameraMovement}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 font-medium">
                            {kf.description}
                          </p>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold italic">
                            <b>Voiceover:</b> "{kf.voiceover}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PROMPT GEMINI RINCI HUB */}
                  <GeminiPromptHub
                    subject={subject}
                    targetGrade={targetGrade}
                    materiTopic={materiTopic}
                    styleTheme={styleTheme || "Animasi 2D/3D Interaktif SD Ceria"}
                    narrationScript={generatedOmniVideoData.narrationScript}
                    bgmRecommendation={generatedOmniVideoData.bgmRecommendation}
                    keyframes={generatedOmniVideoData.keyframes}
                    title={generatedOmniVideoData.title}
                  />
                </div>
              )}
            </div>
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
              {/* Step 3: Direct Detailed Gemini Prompt Hub */}
              <div className="pt-2">
                <GeminiPromptHub
                  subject={selectedItemForGoogleSlides.subject}
                  targetGrade={selectedItemForGoogleSlides.targetGrade}
                  materiTopic={selectedItemForGoogleSlides.materiTopic}
                  styleTheme={selectedItemForGoogleSlides.styleTheme}
                  slides={selectedItemForGoogleSlides.slides}
                  animationKeyframes={selectedItemForGoogleSlides.animationKeyframes}
                  animationCaption={selectedItemForGoogleSlides.animationCaption}
                  imageUrl={selectedItemForGoogleSlides.imageUrl}
                  title={selectedItemForGoogleSlides.title}
                />
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
