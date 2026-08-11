import React, { useState } from "react";
import { Copy, Check, Sparkles, Presentation, Image as ImageIcon, Video, FileText } from "lucide-react";
import { MediaBananaSlide } from "../../types";

interface GeminiPromptHubProps {
  subject: string;
  targetGrade: string;
  materiTopic: string;
  styleTheme?: string;
  slides?: MediaBananaSlide[];
  animationKeyframes?: string[];
  animationCaption?: string;
  imageUrl?: string;
  customVisualPrompt?: string;
  narrationScript?: string;
  bgmRecommendation?: string;
  keyframes?: any[];
  title?: string;
}

export const GeminiPromptHub: React.FC<GeminiPromptHubProps> = ({
  subject,
  targetGrade,
  materiTopic,
  styleTheme = "Infografis Modern & Kartun SD Ceria",
  slides,
  animationKeyframes,
  animationCaption,
  customVisualPrompt,
  narrationScript,
  bgmRecommendation,
  keyframes,
  title
}) => {
  const [activeTab, setActiveTab] = useState<"slide" | "image" | "video">("slide");
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // 1. Construct Detailed Slide Presentation Prompt for Gemini
  const constructSlidePrompt = (): string => {
    let prompt = `PROMPT PRESENTASI SLIDE GEMINI AI (Materi Ajar Interaktif)
=====================================================
Mata Pelajaran: ${subject}
Kelas / Target: ${targetGrade}
Topik Utama: ${materiTopic}
Judul Media: ${title || materiTopic}
Gaya Visual Slide: ${styleTheme}

INSTRUKSI KHUSUS GEMINI AI:
Tolong buatkan materi presentasi slide interaktif lengkap untuk guru dengan struktur ringkas, mendalam, dan menarik bagi siswa SD/SMP:

`;

    if (slides && slides.length > 0) {
      slides.forEach((slide) => {
        prompt += `SLIDE ${slide.slideNumber}: ${slide.title}
Subtitle: ${slide.subtitle || "-"}
Poin Utama Pembelajaran:
${slide.points.map((pt) => `  - ${pt}`).join("\n")}
Deskripsi Visual Gambar Slide: ${slide.visualPrompt || `Ilustrasi edukatif ${materiTopic}`}
Catatan Guru (Speaker Notes): ${slide.speakerNotes || "Sapa siswa dan ajak berdiskusi seputar materi."}
`;
        if (slide.interactiveQuiz) {
          prompt += `Kuis Interaktif Pemantik:
  * Pertanyaan: ${slide.interactiveQuiz.question}
  * Pilihan Jawaban: ${slide.interactiveQuiz.options.join(" | ")}
  * Kunci Jawaban: ${slide.interactiveQuiz.correctAnswer}
  * Penjelasan: ${slide.interactiveQuiz.explanation || "-"}
`;
        }
        prompt += `-----------------------------------------------------\n`;
      });
    } else {
      prompt += `SLIDE 1: Pembuka & Pengenalan Topik "${materiTopic}"
SLIDE 2: Pemahaman Inti & Contoh Kontekstual Sehari-hari
SLIDE 3: Aktivitas Diskusi Kelompok & Lembar Kerja
SLIDE 4: Kuis Interaktif, Refleksi Belajar & Penutup
`;
    }

    prompt += `
PEDOMAN FORMATTING & TONE:
1. Gunakan bahasa Indonesia yang ramah anak, komunikatif, dan memotivasi.
2. Setiap slide memiliki poin-poin ringkas yang siap ditampilkan di proyektor / TV kelas.
3. Sertakan kuis pemantik untuk mengaktifkan keterlibatan murid secara mendalam.`;

    return prompt;
  };

  // 2. Construct Detailed Image & Graphic Prompt for Gemini / Imagen 3
  const constructImagePrompt = (): string => {
    const promptEng = customVisualPrompt || `An ultra-high resolution 8K educational vector graphic illustration and 3D infographic diagram for primary school students about ${materiTopic}. Features vibrant school colors, a cute friendly SD student mascot character pointing at key elements, clean infographic labels, soft dynamic shadows, high aesthetic quality, bright lit background, no clutter.`;

    return `PROMPT GAMBAR / GRAFIS VISUAL GEMINI AI & IMAGEN 3
=====================================================
Mata Pelajaran: ${subject} (${targetGrade})
Topik Utama: "${materiTopic}"
Gaya Visual: ${styleTheme}

PROMPT TEKS LENGKAP SIAP TEMPEL (BAHASA INGGRIS - IMAGEN 3 / GEMINI):
"${promptEng}"

PETUNJUK PENGGUNAAN & SPESIFIKASI VISUAL:
1. Gaya Ilustrasi: Vektor 3D Edukatif / Infografis Kartun Ceria SD
2. Rasio Aspak (Aspect Ratio): 16:9 untuk Slide Presentasi atau 1:1 untuk Media Sosial/Cetak.
3. Palet Warna Utama: Kuning Amber, Hijau Emerald, Biru Toska, Merah Fushia.
4. Elemen Visual Utama: Diagram Alur Proses ${materiTopic}, Karakter Maskot Siswa Ramah, Label Penjelas Jelas & Mudah Dibaca.`;
  };

  // 3. Construct Detailed Video Animation Prompt for Gemini Omni / Veo
  const constructVideoPrompt = (): string => {
    let prompt = `PROMPT VIDEO ANIMASI INTERAKTIF GEMINI OMNI / VEO AI
=====================================================
Mata Pelajaran: ${subject}
Kelas / Target: ${targetGrade}
Topik Video: ${materiTopic}
Gaya Visual Motion: ${styleTheme}

NASKAH NARASI / VOICEOVER SUARA NARATOR:
"${narrationScript || animationCaption || `Halo anak-anak hebat! Hari ini kita akan menjelajahi petualangan seru tentang ${materiTopic}. Mari kita amati bersama-sama!`}"

REKOMENDASI MUSIK LATAR (BGM):
"${bgmRecommendation || "Ceria, Edukatif, Instrumental Akustik Tempo Sedang Cepat"}"

RINCIAN ADEGAN & KEYFRAME VIDEO:
`;

    if (keyframes && keyframes.length > 0) {
      keyframes.forEach((kf: any, idx: number) => {
        if (typeof kf === "string") {
          prompt += `* Frame ${idx + 1}: ${kf}\n`;
        } else {
          prompt += `* Frame ${kf.frameNumber || idx + 1} (${kf.title || "Adegan"}): ${kf.description || kf.title} | Pergerakan Kamera: ${kf.cameraMovement || "Slow Zoom"} | Voiceover: "${kf.voiceover || "-"}"\n`;
        }
      });
    } else if (animationKeyframes && animationKeyframes.length > 0) {
      animationKeyframes.forEach((kf, idx) => {
        prompt += `* Frame ${idx + 1}: ${kf}\n`;
      });
    } else {
      prompt += `* Frame 1: Opening adegan menyapa murid dengan animasi logo dan karakter masuk (Pan Right & Zoom In)
* Frame 2: Visualisasi proses utama ${materiTopic} dengan efek grafik bergerak (Slow Zoom)
* Frame 3: Elemen interaktif & contoh aplikasi di sekitar lingkungan sekolah (Tracking Shot)
* Frame 4: Penutup, poin refleksi & salam pembelajar sejati (Zoom Out & Fade to White)
`;
    }

    prompt += `
CINEMATOGRAPHY & MOTION GUIDELINES:
1. Pacing adegan disesuaikan untuk usia siswa kelas ${targetGrade} (durasi ~30-60 detik).
2. Transisi antaradegan menggunakan efek slide smooth atau morphing visual.
3. Efek pencahayaan terang, ceria, dan kontras tinggi.`;

    return prompt;
  };

  const slidePromptText = constructSlidePrompt();
  const imagePromptText = constructImagePrompt();
  const videoPromptText = constructVideoPrompt();

  const handleCopy = (text: string, type: "slide" | "image" | "video" | "all") => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const currentPromptText =
    activeTab === "slide"
      ? slidePromptText
      : activeTab === "image"
      ? imagePromptText
      : videoPromptText;

  const handleCopyAll = () => {
    const combined = `=====================================================
BUNDLE PROMPT DESAIN MEDIA PEMBELAJARAN GEMINI AI
Topik: ${materiTopic} | Mapel: ${subject} (${targetGrade})
=====================================================

1. [PROMPT PRESENTASI SLIDE]
${slidePromptText}

=====================================================
2. [PROMPT GAMBAR / GRAFIS VISUAL]
${imagePromptText}

=====================================================
3. [PROMPT VIDEO ANIMASI INTERAKTIF]
${videoPromptText}
`;
    handleCopy(combined, "all");
  };

  return (
    <div className="bg-slate-900 border-2 border-amber-400/80 rounded-2xl p-5 shadow-2xl space-y-4 text-white text-left">
      {/* Header Hub Prompt */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 font-bold">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h4 className="font-black text-sm text-amber-300 flex items-center gap-2">
              <span>KOTAK PROMPT RINCI GEMINI AI (SIAP COPY)</span>
              <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full uppercase">
                Akurat 100%
              </span>
            </h4>
            <p className="text-[11px] text-slate-300">
              Prompt yang diformat spesifik untuk ditempel langsung ke <b>Gemini AI</b> (gemini.google.com) untuk menghasilkan Slide, Gambar, atau Video.
            </p>
          </div>
        </div>

        {/* Copy All Bundle Button */}
        <button
          onClick={handleCopyAll}
          className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95"
        >
          {copiedType === "all" ? (
            <>
              <Check className="w-4 h-4 text-slate-950" />
              <span>Semua Prompt Tersalin!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Salin Bundle 3 Prompt (Slide + Gambar + Video)</span>
            </>
          )}
        </button>
      </div>

      {/* Selector Tab Prompt */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab("slide")}
          className={`flex-1 min-w-[130px] px-3 py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
            activeTab === "slide"
              ? "bg-amber-500 text-slate-950 shadow-md scale-102"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Presentation className="w-4 h-4" />
          <span>Prompt Slide</span>
        </button>

        <button
          onClick={() => setActiveTab("image")}
          className={`flex-1 min-w-[130px] px-3 py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
            activeTab === "image"
              ? "bg-emerald-500 text-slate-950 shadow-md scale-102"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Prompt Gambar</span>
        </button>

        <button
          onClick={() => setActiveTab("video")}
          className={`flex-1 min-w-[130px] px-3 py-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
            activeTab === "video"
              ? "bg-cyan-500 text-slate-950 shadow-md scale-102"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Prompt Video</span>
        </button>
      </div>

      {/* Main Copy Bar & Text Area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1 text-xs">
          <span className="font-bold text-amber-200 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {activeTab === "slide" && "Rincian Prompt Presentasi Slide (Interaktif)"}
              {activeTab === "image" && "Rincian Prompt Gambar / Grafis (Gemini / Imagen 3)"}
              {activeTab === "video" && "Rincian Prompt Video Animasi (Gemini Omni / Veo)"}
            </span>
          </span>

          <button
            onClick={() => handleCopy(currentPromptText, activeTab)}
            className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[11px] rounded-lg flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
          >
            {copiedType === activeTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-slate-950" />
                <span>Prompt Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Prompt {activeTab === "slide" ? "Slide" : activeTab === "image" ? "Gambar" : "Video"}</span>
              </>
            )}
          </button>
        </div>

        <div className="relative group">
          <textarea
            readOnly
            rows={7}
            value={currentPromptText}
            className="w-full p-3.5 bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed border border-slate-800 rounded-xl focus:outline-none resize-none shadow-inner"
          />
        </div>

        <p className="text-[11px] text-slate-400 italic">
          💡 <b>Petunjuk:</b> Klik tombol <b>"Salin Prompt"</b> di atas, lalu buka <b>https://gemini.google.com</b> dan tekan <code>Ctrl + V</code> untuk membuat slide, gambar, atau video berkualitas tinggi.
        </p>
      </div>
    </div>
  );
};
