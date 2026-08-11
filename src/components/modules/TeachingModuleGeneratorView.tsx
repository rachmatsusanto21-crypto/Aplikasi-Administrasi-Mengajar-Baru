import React, { useState } from "react";
import { TeachingModule, AISettings, SchoolIdentity, Student, ActivityTableRow, RubrikFormatifItem, RubrikSumatifItem, KisiKisiItem, SoalItem, RefleksiItem } from "../../types";
import { Sparkles, Trash2, Download, Printer, Layers, FileText, CheckCircle2, UserCheck, HelpCircle, Palette, Clock } from "lucide-react";
import { exportDataToJSON } from "../../lib/storage";
import { generateAIContent } from "../../lib/aiHelper";
import { exportHtmlToDoc } from "../../lib/exportDoc";
import { exportTeachingModuleToDocx } from "../../lib/exportDocx";
import { KopSurat } from "../KopSurat";

interface TeachingModuleGeneratorViewProps {
  schoolIdentity: SchoolIdentity;
  students?: Student[];
  teachingModules: TeachingModule[];
  aiSettings: AISettings;
  onSaveModules: (updated: TeachingModule[]) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

function safeString(val: any, fallback = "-"): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return fallback;
    return val.map((v) => safeString(v, "")).filter(Boolean).join(", ");
  }
  if (typeof val === "object") {
    const entries = Object.entries(val);
    if (entries.length === 0) return fallback;
    return entries
      .map(([k, v]) => {
        const keyLabel = k
          .replace(/([A-Z])/g, " $1")
          .replace(/_/g, " ")
          .trim();
        const formattedKey = keyLabel.charAt(0).toUpperCase() + keyLabel.slice(1);
        return `${formattedKey}: ${safeString(v, "-")}`;
      })
      .join("\n");
  }
  return String(val);
}

function safeStringArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((item) => safeString(item, "")).filter(Boolean);
  }
  if (typeof val === "string") {
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (typeof val === "object") {
    return Object.values(val)
      .map((item) => safeString(item, ""))
      .filter(Boolean);
  }
  return [String(val)];
}

function getDefaultActivitiesTable(
  act?: { pendahuluan?: string; inti?: string; penutup?: string },
  modelName = "Problem Based Learning (PBL)",
  subject = "Mata Pelajaran",
  topic = "Topik Pembelajaran",
  moduleType = "Intrakurikuler"
): ActivityTableRow[] {
  return [
    {
      no: 1,
      tahap: `Orientasi Pembelajaran (${modelName} - Mindful)`,
      kegiatan: `1. Guru menyapa murid, memimpin doa, dan memeriksa kehadiran.\n2. Guru menyampaikan apersepsi serta memutar media pemantik terkait materi ${topic} pada kegiatan ${moduleType} ${subject}.\n3. Guru mengajukan pertanyaan pemantik mendasar untuk memicu rasa ingin tahu murid.`,
      alokasiWaktu: "15 Menit",
    },
    {
      no: 2,
      tahap: `Mengorganisasi Murid untuk Belajar (${modelName} - Meaningful)`,
      kegiatan: `1. Guru menjelaskan konsep dasar ${topic} menggunakan bahan ajar dan media interaktif.\n2. Guru membagi murid ke dalam kelompok belajar heterogen (4-5 murid).\n3. Guru membagikan LKPD ${topic} dan menjelaskan petunjuk pengerjaan tugas kelompok.`,
      alokasiWaktu: "15 Menit",
    },
    {
      no: 3,
      tahap: `Membimbing Penyelidikan & Diskusi (${modelName} - Deep Learning)`,
      kegiatan: `1. Murid membaca bahan ajar dan mengamati sumber belajar mengenai ${topic}.\n2. Murid berdiskusi dalam kelompok untuk mengumpulkan informasi, menganalisis persoalan, dan menyelesaikan soal-soal pada LKPD.\n3. Guru berkeliling memberikan pembimbingan, motivasi, dan umpan balik langsung pada setiap kelompok.`,
      alokasiWaktu: "30 Menit",
    },
    {
      no: 4,
      tahap: `Mengembangkan & Menyajikan Hasil Karya (${modelName} - Joyful)`,
      kegiatan: `1. Ice breaking sejenak untuk menyegarkan suasana kelas.\n2. Masing-masing kelompok mempresentasikan hasil pengerjaan LKPD ${topic} di depan kelas secara percaya diri.\n3. Kelompok lain memberikan tanggapan, apresiasi, dan pertanyaan secara santun.`,
      alokasiWaktu: "15 Menit",
    },
    {
      no: 5,
      tahap: `Analisis & Evaluasi Pembelajaran (${modelName})`,
      kegiatan: `1. Guru bersama murid merangkum dan menyimpulkan poin-poin penting dari materi ${topic}.\n2. Murid mengerjakan kuis evaluasi/asesmen sumatif ${topic} secara mandiri.\n3. Guru memberikan penguatan positif dan menutup pembelajaran dengan doa.`,
      alokasiWaktu: "15 Menit",
    },
  ];
}

function getDefaultRubrikFormatif(topic = "Topik Pembelajaran", subject = "Mata Pelajaran"): RubrikFormatifItem[] {
  return [
    {
      kriteria: `Penguasaan Konsep & Pemahaman (${topic})`,
      sangatBaik: `Memahami seluruh konsep utama ${topic} pada ${subject} secara mendalam, tepat, dan runtut.`,
      baik: `Memahami sebagian besar konsep ${topic} dengan benar, terdapat sedikit detail yang kurang lengkap.`,
      cukup: `Penjelasan konsep ${topic} cukup baik namun memerlukan sedikit bimbingan guru.`,
      perluBimbingan: `Belum mampu menjelaskan konsep dasar ${topic} meskipun telah dibimbing.`,
    },
    {
      kriteria: `Analisis & Pemecahan Masalah pada LKPD`,
      sangatBaik: `Mampu menganalisis dan memecahkan soal/tugas ${topic} pada LKPD secara mandiri, kritis, dan logis.`,
      baik: `Mampu memecahkan masalah ${topic} dengan baik, hanya sedikit kesalahan teknis.`,
      cukup: `Memecahkan masalah ${topic} dengan bantuan beberapa arahan dari teman sekelompok/guru.`,
      perluBimbingan: `Belum mampu menyelesaikan tugas analisis pada LKPD secara mandiri.`,
    },
    {
      kriteria: `Kerjasama & Kolaborasi Kelompok`,
      sangatBaik: `Sangat aktif berdiskusi, membantu teman sekelompok, dan bertanggung jawab atas tugas bersama.`,
      baik: `Aktif bekerja sama dalam kelompok dan menyelesaikan bagian tugasnya dengan baik.`,
      cukup: `Cukup terlibat dalam diskusi kelompok namun perlu didorong untuk lebih aktif.`,
      perluBimbingan: `Pasif dalam diskusi kelompok dan bergantung pada teman lain.`,
    },
    {
      kriteria: `Keterampilan Presentasi & Penyampaian Hasil`,
      sangatBaik: `Menyampaikan hasil diskusi ${topic} dengan suara jelas, percaya diri, bahasa santun, dan komunikatif.`,
      baik: `Menyampaikan hasil diskusi dengan cukup lancar dan bahasa yang santun.`,
      cukup: `Menyampaikan hasil diskusi secara singkat dan masih tampak ragu-ragu.`,
      perluBimbingan: `Belum berani atau belum mampu menyampaikan hasil diskusi di depan kelas.`,
    },
  ];
}

function getDefaultRubrikSumatif(topic = "Topik Pembelajaran", subject = "Mata Pelajaran"): RubrikSumatifItem[] {
  return [
    {
      kriteria: "Sikap (Gotong Royong, Bernalar Kritis & Tanggung Jawab)",
      indikator: `Sangat aktif bekerja sama, teliti, dan bertanggung jawab selama proses pembelajaran ${topic}.`,
      skorMaks: 25,
      pedoman: "Sangat Aktif & Mandiri = 25; Cukup Aktif = 20; Perlu Bimbingan = 15; Pasif = 10.",
    },
    {
      kriteria: `Pengetahuan (Tes Tertulis ${topic})`,
      indikator: `Mengidentifikasi, menjelaskan, dan menganalisis konsep ${topic} pada mata pelajaran ${subject}.`,
      skorMaks: 50,
      pedoman: "Pilihan Ganda benar = 4 poin per soal; Uraian benar & lengkap = 12 poin per soal.",
    },
    {
      kriteria: `Keterampilan (Penyelesaian LKPD & Presentasi ${topic})`,
      indikator: `Menyusun jawaban LKPD secara runtut dan mempresentasikan hasil analisis materi ${topic}.`,
      skorMaks: 25,
      pedoman: "Sangat Lengkap & Tepat = 25; Cukup Lengkap = 18; Kurang Tepat = 10; Tidak Menjawab = 0.",
    },
  ];
}

function getDefaultRubrikAsLearning(): RubrikFormatifItem[] {
  return [
    {
      kriteria: "Pemahaman Diri (Self-Awareness)",
      sangatBaik: "Mengisi seluruh lembar refleksi secara jujur, mendalam, dan sesuai kondisi sebenarnya.",
      baik: "Mengisi sebagian besar lembar refleksi secara jujur tetapi uraian masih singkat.",
      cukup: "Mengisi refleksi secara umum dan membutuhkan arahan petunjuk guru.",
      perluBimbingan: "Belum mampu mengisi refleksi diri atau mengisi tidak sesuai kondisi.",
    },
    {
      kriteria: "Partisipasi & Refleksi Belajar",
      sangatBaik: "Menunjukkan keterlibatan aktif dan mampu merefleksikan pengalaman belajarnya dengan jelas.",
      baik: "Cukup aktif mengikuti pembelajaran dan refleksi diri cukup lengkap.",
      cukup: "Kurang aktif dan refleksi belajar belum rinci.",
      perluBimbingan: "Pasif dalam pembelajaran dan belum mampu merefleksikan proses belajarnya.",
    },
    {
      kriteria: "Rencana Perbaikan Belajar",
      sangatBaik: "Menuliskan dengan jelas hal yang sudah dipahami dan langkah konkret perbaikan belajar ke depan.",
      baik: "Menuliskan hal yang sudah dipahami namun rencana perbaikan masih umum.",
      cukup: "Hanya menuliskan salah satu bagian refleksi saja.",
      perluBimbingan: "Belum mampu merumuskan rencana perbaikan belajar secara mandiri.",
    },
  ];
}

function getDefaultKisiKisi(subject = "Mata Pelajaran", topic = "Topik Pembelajaran"): KisiKisiItem[] {
  return [
    { no: 1, tujuanPembelajaran: `Murid dapat mengidentifikasi konsep dasar ${topic} pada ${subject}.`, indikator: `Menjelaskan pengertian dan konsep utama ${topic}.`, materi: topic, levelKognitif: "C2 (Memahami)", nomorSoal: "1", bentukSoal: "Pilihan Ganda", kunciJawaban: "A", skorPerSoal: 4, tingkat: "Mudah" },
    { no: 2, tujuanPembelajaran: `Murid dapat mengidentifikasi prinsip penting ${topic}.`, indikator: `Menentukan ciri-ciri dan unsur utama ${topic}.`, materi: topic, levelKognitif: "C2 (Memahami)", nomorSoal: "2", bentukSoal: "Pilihan Ganda", kunciJawaban: "B", skorPerSoal: 4, tingkat: "Mudah" },
    { no: 3, tujuanPembelajaran: `Murid dapat mengaplikasikan konsep ${topic} dalam kehidupan sehari-hari.`, indikator: `Menentukan contoh penerapan ${topic} yang tepat.`, materi: topic, levelKognitif: "C3 (Menerapkan)", nomorSoal: "3", bentukSoal: "Pilihan Ganda", kunciJawaban: "C", skorPerSoal: 4, tingkat: "Sedang" },
    { no: 4, tujuanPembelajaran: `Murid dapat menganalisis permasalahan kontekstual terkait ${topic}.`, indikator: `Menganalisis sebab-akibat atau solusi pada masalah ${topic}.`, materi: topic, levelKognitif: "C4 (Menganalisis)", nomorSoal: "4", bentukSoal: "Pilihan Ganda", kunciJawaban: "A", skorPerSoal: 4, tingkat: "Sedang" },
    { no: 5, tujuanPembelajaran: `Murid dapat mengevaluasi penerapan materi ${topic}.`, indikator: `Menilai kebenaran langkah atau pernyataan terkait ${topic}.`, materi: topic, levelKognitif: "C4 (Menganalisis)", nomorSoal: "5", bentukSoal: "Pilihan Ganda", kunciJawaban: "D", skorPerSoal: 4, tingkat: "Sukar" },
    { no: 6, tujuanPembelajaran: `Murid dapat mengurutkan atau mengklasifikasikan bagian-bagian ${topic}.`, indikator: `Mengurutkan proses atau tahapan pada ${topic}.`, materi: topic, levelKognitif: "C3 (Menerapkan)", nomorSoal: "6", bentukSoal: "Pilihan Ganda", kunciJawaban: "B", skorPerSoal: 4, tingkat: "Sedang" },
    { no: 7, tujuanPembelajaran: `Murid dapat menghubungkan materi ${topic} dengan kehidupan nyata.`, indikator: `Menjelaskan kaitan ${topic} dengan manfaat sehari-hari.`, materi: topic, levelKognitif: "C3 (Menerapkan)", nomorSoal: "7", bentukSoal: "Pilihan Ganda", kunciJawaban: "C", skorPerSoal: 4, tingkat: "Sedang" },
    { no: 8, tujuanPembelajaran: `Murid dapat membandingkan opsi/solusi dalam materi ${topic}.`, indikator: `Memilih alternatif terbaik dalam persoalan ${topic}.`, materi: topic, levelKognitif: "C4 (Menganalisis)", nomorSoal: "8", bentukSoal: "Pilihan Ganda", kunciJawaban: "A", skorPerSoal: 4, tingkat: "Sukar" },
    { no: 9, tujuanPembelajaran: `Murid dapat menyimpulkan poin utama materi ${topic}.`, indikator: `Menarik kesimpulan dari deskripsi atau data ${topic}.`, materi: topic, levelKognitif: "C4 (Menganalisis)", nomorSoal: "9", bentukSoal: "Pilihan Ganda", kunciJawaban: "B", skorPerSoal: 4, tingkat: "Sedang" },
    { no: 10, tujuanPembelajaran: `Murid dapat menerapkan nilai-nilai pembelajaran ${topic}.`, indikator: `Menentukan sikap positif saat mempelajari ${topic}.`, materi: topic, levelKognitif: "C3 (Menerapkan)", nomorSoal: "10", bentukSoal: "Pilihan Ganda", kunciJawaban: "A", skorPerSoal: 4, tingkat: "Mudah" },
    { no: 11, tujuanPembelajaran: `Murid dapat menjelaskan konsep ${topic} secara komprehensif.`, indikator: `Jelaskan pengertian dan 2 manfaat utama dari ${topic}!`, materi: topic, levelKognitif: "C2 (Memahami)", nomorSoal: "1 (Uraian)", bentukSoal: "Uraian", kunciJawaban: `${topic} adalah bagian dari ${subject} yang dipelajari untuk meningkatkan pemahaman dan keterampilan peserta didik.`, skorPerSoal: 12, tingkat: "Sedang" },
    { no: 12, tujuanPembelajaran: `Murid dapat menyebutkan tahapan/langkah dalam ${topic}.`, indikator: `Tuliskan langkah-langkah utama dalam mempelajari atau menerapkan ${topic}!`, materi: topic, levelKognitif: "C3 (Menerapkan)", nomorSoal: "2 (Uraian)", bentukSoal: "Uraian", kunciJawaban: `1. Pemahaman konsep dasar ${topic}\n2. Eksplorasi & analisis\n3. Penerapan dalam tugas`, skorPerSoal: 12, tingkat: "Sedang" },
    { no: 13, tujuanPembelajaran: `Murid dapat menganalisis persoalan nyata terkait ${topic}.`, indikator: `Mengapa pemahaman tentang ${topic} sangat penting bagi kehidupan sehari-hari? Jelaskan!`, materi: topic, levelKognitif: "C4 (Menganalisis)", nomorSoal: "3 (Uraian)", bentukSoal: "Uraian", kunciJawaban: `Pemahaman tentang ${topic} membantu peserta didik berpikir logis, kritis, dan solutif.`, skorPerSoal: 12, tingkat: "Sukar" },
    { no: 14, tujuanPembelajaran: `Murid dapat memberikan contoh konkret ${topic}.`, indikator: `Berikan 2 contoh konkret penerapan ${topic} di lingkungan sekitar!`, materi: topic, levelKognitif: "C3 (Menerapkan)", nomorSoal: "4 (Uraian)", bentukSoal: "Uraian", kunciJawaban: `Contoh 1: Penerapan di kelas/sekolah\nContoh 2: Penerapan di lingkungan tempat tinggal`, skorPerSoal: 12, tingkat: "Sedang" },
    { no: 15, tujuanPembelajaran: `Murid dapat merumuskan solusi atas permasalahan ${topic}.`, indikator: `Bagaimana solusi terbaik jika menghadapi kendala terkait ${topic}?`, materi: topic, levelKognitif: "C4 (Menganalisis)", nomorSoal: "5 (Uraian)", bentukSoal: "Uraian", kunciJawaban: `Melakukan analisis penyebab masalah, berdiskusi kelompok, dan menerapkan langkah penyelesaian secara tepat.`, skorPerSoal: 12, tingkat: "Sukar" },
  ];
}

function getDefaultSoalSumatif(topic = "Topik Pembelajaran", subject = "Mata Pelajaran"): SoalItem[] {
  return [
    {
      no: 1,
      pertanyaan: `Tujuan utama mempelajari materi ${topic} dalam mata pelajaran ${subject} adalah...`,
      pilihan: [
        `A. Memahami konsep ${topic} secara mendalam dan benar`,
        "B. Menghafal tanpa memahami materi",
        "C. Mengabaikan penerapan materi dalam kehidupan",
        "D. Mempelajari hal yang tidak berkaitan"
      ],
      kunciJawaban: `A. Memahami konsep ${topic} secara mendalam dan benar`,
    },
    {
      no: 2,
      pertanyaan: `Berikut ini yang merupakan salah satu unsur atau bagian penting dari ${topic} adalah...`,
      pilihan: [
        `A. Prinsip utama dan penerapan konsep ${topic}`,
        "B. Hal-hal di luar materi pembelajaran",
        "C. Kegiatan tanpa tujuan belajar",
        "D. Penilaian tanpa kriteria yang jelas"
      ],
      kunciJawaban: `A. Prinsip utama dan penerapan konsep ${topic}`,
    },
    {
      no: 3,
      pertanyaan: `Contoh penerapan konsep ${topic} dalam kehidupan sehari-hari di sekolah adalah...`,
      pilihan: [
        `A. Menerapkan pemahaman ${topic} saat berdiskusi dan menyelesaikan tugas kelompok`,
        "B. Acuh tak acuh terhadap penjelasan guru",
        "C. Mengerjakan tugas lain saat pembelajaran berlangsung",
        "D. Menyelesaikan soal tanpa membaca petunjuk"
      ],
      kunciJawaban: `A. Menerapkan pemahaman ${topic} saat berdiskusi dan menyelesaikan tugas kelompok`,
    },
    {
      no: 4,
      pertanyaan: `Sikap yang perlu ditunjukkan peserta didik saat berdiskusi kelompok membahas ${topic} adalah...`,
      pilihan: [
        "A. Saling menghargai pendapat, aktif, dan bekerja sama",
        "B. Memaksakan pendapat pribadi kepada teman",
        "C. Pasif dan tidak mau memberikan ide",
        "D. Mengganggu kelompok lain saat presentasi"
      ],
      kunciJawaban: "A. Saling menghargai pendapat, aktif, dan bekerja sama",
    },
    {
      no: 5,
      pertanyaan: `Langkah awal yang paling tepat sebelum menyelesaikan persoalan pada materi ${topic} adalah...`,
      pilihan: [
        `A. Membaca dan memahami petunjuk serta konsep dasar ${topic}`,
        "B. Langsung menjawab tanpa membaca soal",
        "C. Menanyakan jawaban langsung kepada teman",
        "D. Mengosongkan lembar kerja"
      ],
      kunciJawaban: `A. Membaca dan memahami petunjuk serta konsep dasar ${topic}`,
    },
    {
      no: 6,
      pertanyaan: `Manfaat utama yang diperoleh peserta didik setelah menguasai materi ${topic} adalah...`,
      pilihan: [
        `A. Mampu berpikir kritis dan solutif terkait ${topic}`,
        "B. Hanya mendapatkan nilai tanpa pemahaman",
        "C. Tidak dapat mengaplikasikan ilmu dalam kehidupan",
        "D. Mengetahui istilah tanpa makna"
      ],
      kunciJawaban: `A. Mampu berpikir kritis dan solutif terkait ${topic}`,
    },
    {
      no: 7,
      pertanyaan: `Dalam kegiatan kelompok ${topic}, pembagian peran yang seimbang bermanfaat untuk...`,
      pilihan: [
        "A. Mencapai tujuan pembelajaran secara efisien dan gotong royong",
        "B. Membiarkan satu orang saja yang bekerja",
        "C. Memperlama waktu pengerjaan tugas",
        "D. Menimbulkan perselisihan antaranggota"
      ],
      kunciJawaban: "A. Mencapai tujuan pembelajaran secara efisien dan gotong royong",
    },
    {
      no: 8,
      pertanyaan: `Apabila dalam pengerjaan LKPD ${topic} terdapat perbedaan pendapat antaranggota, cara penyelesaian terbaik adalah...`,
      pilihan: [
        "A. Bermusyawarah untuk mencari kesepakatan bersama",
        "B. Meninggalkan kelompok",
        "C. Mengabaikan pendapat anggota lain",
        "D. Menentukan jawaban secara acak"
      ],
      kunciJawaban: "A. Bermusyawarah untuk mencari kesepakatan bersama",
    },
    {
      no: 9,
      pertanyaan: `Penggunaan media pembelajaran pada materi ${topic} bertujuan untuk...`,
      pilihan: [
        `A. Mempermudah pemahaman konsep ${topic} secara visual dan kontekstual`,
        "B. Membingungkan peserta didik saat belajar",
        "C. Mengurangi waktu belajar di kelas",
        "D. Menggantikan peran guru secara penuh"
      ],
      kunciJawaban: `A. Mempermudah pemahaman konsep ${topic} secara visual dan kontekstual`,
    },
    {
      no: 10,
      pertanyaan: `Umpan balik yang diberikan guru setelah evaluasi ${topic} berfungsi untuk...`,
      pilihan: [
        "A. Mengetahui kekuatan dan bagian yang perlu diperbaiki dalam belajar",
        "B. Memberikan hukuman kepada peserta didik",
        "C. Menilai tanpa memberikan penjelasan",
        "D. Menghentikan proses pembelajaran"
      ],
      kunciJawaban: "A. Mengetahui kekuatan dan bagian yang perlu diperbaiki dalam belajar",
    },
    {
      no: 11,
      pertanyaan: `[Soal Uraian 1] Jelaskan pengertian dan pemahaman kalian mengenai materi ${topic}!`,
      kunciJawaban: `Materi ${topic} pada mata pelajaran ${subject} membahas konsep-konsep penting yang harus dipahami peserta didik untuk meningkatkan pemahaman dan keterampilan kritis.`,
    },
    {
      no: 12,
      pertanyaan: `[Soal Uraian 2] Sebutkan 2 contoh penerapan materi ${topic} dalam kehidupan sehari-hari!`,
      kunciJawaban: `1. Penerapan di lingkungan sekolah saat berdiskusi dan menyelesaikan penugasan ${topic}.\n2. Penerapan di lingkungan masyarakat dalam memecahkan masalah kontekstual.`,
    },
    {
      no: 13,
      pertanyaan: `[Soal Uraian 3] Mengapa pemahaman tentang ${topic} sangat penting bagi peserta didik? Jelaskan pendapatmu!`,
      kunciJawaban: `Karena pemahaman tentang ${topic} melatih pola pikir yang analitis, kritis, dan memberikan landasan pengetahuan yang kuat pada ${subject}.`,
    },
    {
      no: 14,
      pertanyaan: `[Soal Uraian 4] Tuliskan langkah-langkah atau proses pengerjaan tugas kelompok saat mempelajari ${topic}!`,
      kunciJawaban: "1. Membaca petunjuk LKPD\n2. Melakukan pembagian tugas kelompok\n3. Mengumpulkan data/informasi\n4. Menyusun hasil dan presentasi.",
    },
    {
      no: 15,
      pertanyaan: `[Soal Uraian 5] Bagaimana cara kalian merefleksikan hasil belajar setelah menyelesaikan materi ${topic}?`,
      kunciJawaban: "Dengan mengevaluasi poin materi yang sudah dipahami, mencatat kendala yang dihadapi, serta membuat rencana perbaikan belajar ke depan.",
    },
  ];
}

function getDefaultRefleksiGuru(topic = "Topik Pembelajaran"): RefleksiItem[] {
  return [
    { no: 1, pertanyaan: `Apakah seluruh peserta didik telah memahami materi ${topic} dengan baik?`, catatan: `Sebagian besar murid memahami konsep ${topic} melalui media pembelajaran dan diskusi kelompok.` },
    { no: 2, pertanyaan: `Apa kendala utama yang dihadapi selama pelaksanaan pembelajaran ${topic}?`, catatan: "Manajemen alokasi waktu saat diskusi dan presentasi kelompok perlu dioptimalkan." },
    { no: 3, pertanyaan: "Langkah perbaikan apa yang akan diterapkan pada sesi pembelajaran berikutnya?", catatan: "Memberikan pembimbingan terfokus pada kelompok yang memerlukan bantuan serta menggunakan penanda waktu visual." },
  ];
}

function getDefaultRefleksiSiswa(topic = "Topik Pembelajaran"): RefleksiItem[] {
  return [
    { no: 1, pertanyaan: `Bagaimana perasaan kalian setelah mempelajari materi ${topic} hari ini?`, catatan: `Sangat senang dan antusias karena dapat memahami materi ${topic} dengan cara yang interaktif.` },
    { no: 2, pertanyaan: "Bagian mana dari kegiatan pembelajaran yang paling kalian sukai?", catatan: "Saat berdiskusi dalam kelompok, mengerjakan LKPD, dan mempresentasikan hasil di depan kelas." },
    { no: 3, pertanyaan: `Hal penting apa yang berhasil kalian pahami dari pembelajaran ${topic} hari ini?`, catatan: `Memahami konsep utama ${topic} serta penerapannya secara nyata dalam kehidupan sehari-hari.` },
  ];
}

function getFullStudentGradeList(studentsProps?: Student[]) {
  const defaultNames = [
    "Ahmad Riski Subagja", "Budi Santoso", "Citra Dewi Lestari", "Diki Ramadhan", "Eko Prasetyo",
    "Fitriani Nurhasanah", "Gilang Maulana", "Hesti Putri Pertiwi", "Indra Wijaya", "Joko Susilo",
    "Kiki Amalia", "Lani Rahmawati", "Muhammad Farhan", "Nabila Syahrani", "Okta Dian Pratama",
    "Putu Giri Ananda", "Qori Hafiz", "Rian Hidayat", "Sinta Nur Haliza", "Tono Harso",
    "Utama Putra", "Vina Panduwinata", "Wahyu Setiawan", "Yulia Fitri", "Zidan Ramadhan", "Aditya Perkasa"
  ];

  const result: Array<{
    no: number;
    nisn: string;
    nama: string;
    f1: string;
    f2: string;
    f3: string;
    rataF: string;
    s1: string;
    na: string;
    status: string;
  }> = [];

  const totalCount = Math.max(26, studentsProps?.length || 0);

  for (let i = 0; i < totalCount; i++) {
    const student = studentsProps && studentsProps[i];
    const nama = student ? student.name : defaultNames[i % defaultNames.length];
    const nisn = student ? (student.nisn || `008${1000 + i}`) : `008${1234 + i}`;

    result.push({
      no: i + 1,
      nisn,
      nama,
      f1: "85",
      f2: "88",
      f3: "90",
      rataF: "88",
      s1: "85",
      na: "87",
      status: "Tuntas",
    });
  }

  return result;
}

function ensureModuleStructure(mod: any): TeachingModule {
  if (!mod) mod = {};

  const gen = mod.generalInfo || {};
  const core = mod.coreComponent || {};
  const act = mod.activities || {};
  const ass = mod.assessment || {};
  const iden = mod.identifikasi || {};
  const desain = mod.desainPembelajaran || {};

  const subject = safeString(mod.subject, "Mata Pelajaran");
  const topic = safeString(mod.title || gen.topik || core.tujuanPembelajaran, "Topik Pembelajaran");
  const modelName = safeString(mod.learningModel || mod.modelPembelajaran || desain.praktikPedagogis?.model, "Problem Based Learning (PBL)");
  const moduleType = (safeString(mod.moduleType || mod.category, "Intrakurikuler") === "Kokurikuler" ? "Kokurikuler" : "Intrakurikuler");

  let actTable: ActivityTableRow[] = Array.isArray(mod.activitiesTable) && mod.activitiesTable.length > 0
    ? mod.activitiesTable.map((r: any, idx: number) => ({
        no: r.no || idx + 1,
        tahap: safeString(r.tahap, `Tahap ${idx + 1}`),
        kegiatan: safeString(r.kegiatan || r.kegiatanSiswaGuru, "-"),
        alokasiWaktu: safeString(r.alokasiWaktu, "15 Menit"),
      }))
    : getDefaultActivitiesTable(act, modelName, subject, topic, moduleType);

  let rubFormatif: RubrikFormatifItem[] = Array.isArray(mod.rubrikFormatif) && mod.rubrikFormatif.length > 0
    ? mod.rubrikFormatif.map((r: any) => ({
        kriteria: safeString(r.kriteria, "Aspek Penilaian"),
        sangatBaik: safeString(r.sangatBaik || r.skor3, "Sangat Baik (Skor 3 / 4)"),
        baik: safeString(r.baik || r.skor2, "Baik (Skor 2 / 3)"),
        cukup: safeString(r.cukup || r.skor1, "Cukup (Skor 1 / 2)"),
        perluBimbingan: safeString(r.perluBimbingan, "Perlu Bimbingan (Skor 1)"),
      }))
    : getDefaultRubrikFormatif(topic, subject);

  let rubSumatif: RubrikSumatifItem[] = Array.isArray(mod.rubrikSumatif) && mod.rubrikSumatif.length > 0
    ? mod.rubrikSumatif.map((r: any) => ({
        kriteria: safeString(r.kriteria, "Unsur Penilaian"),
        indikator: safeString(r.indikator, "Indikator KKTP"),
        skorMaks: typeof r.skorMaks === "number" ? r.skorMaks : 25,
        pedoman: safeString(r.pedoman, "Pedoman Penskoran"),
      }))
    : getDefaultRubrikSumatif(topic, subject);

  let rubAsLearning: RubrikFormatifItem[] = Array.isArray(mod.rubrikAsLearning) && mod.rubrikAsLearning.length > 0
    ? mod.rubrikAsLearning.map((r: any) => ({
        kriteria: safeString(r.kriteria, "Aspek Penilaian Diri"),
        sangatBaik: safeString(r.sangatBaik, "Skor 3 (Baik)"),
        baik: safeString(r.baik, "Skor 2 (Cukup)"),
        cukup: safeString(r.cukup, "Skor 1 (Perlu Bimbingan)"),
        perluBimbingan: safeString(r.perluBimbingan, "Belum Mampu"),
      }))
    : getDefaultRubrikAsLearning();

  let kisiKisi: KisiKisiItem[] = Array.isArray(mod.kisiKisiSumatif) && mod.kisiKisiSumatif.length > 0
    ? mod.kisiKisiSumatif.map((r: any, idx: number) => ({
        no: r.no || idx + 1,
        tujuanPembelajaran: safeString(r.tujuanPembelajaran, `Murid dapat memahami dan menganalisis ${topic} pada ${subject}.`),
        indikator: safeString(r.indikator, "Indikator Soal"),
        materi: safeString(r.materi, topic),
        levelKognitif: safeString(r.levelKognitif || r.tingkat, idx < 5 ? "C2 (Memahami)" : (idx < 10 ? "C4 (Menganalisis)" : "C3 (Menerapkan)")),
        bentukSoal: safeString(r.bentukSoal, idx < 10 ? "Pilihan Ganda" : "Uraian"),
        nomorSoal: safeString(r.nomorSoal, `${idx + 1}`),
        tingkat: safeString(r.tingkat, idx < 5 ? "Mudah" : (idx < 10 ? "Sedang" : "Sukar")),
        kunciJawaban: safeString(r.kunciJawaban, "A"),
        skorPerSoal: typeof r.skorPerSoal === "number" ? r.skorPerSoal : (idx < 10 ? 4 : 12),
      }))
    : getDefaultKisiKisi(subject, topic);

  let soalList: SoalItem[] = Array.isArray(mod.soalSumatifList) && mod.soalSumatifList.length > 0
    ? mod.soalSumatifList.map((r: any, idx: number) => ({
        no: r.no || idx + 1,
        pertanyaan: safeString(r.pertanyaan, "Pertanyaan Soal"),
        pilihan: Array.isArray(r.pilihan) ? r.pilihan.map((p: any) => safeString(p, "")) : undefined,
        kunciJawaban: safeString(r.kunciJawaban, "A"),
      }))
    : getDefaultSoalSumatif(topic, subject);

  let refGuru: RefleksiItem[] = Array.isArray(mod.refleksiGuru) && mod.refleksiGuru.length > 0
    ? mod.refleksiGuru.map((r: any, idx: number) => ({
        no: r.no || idx + 1,
        pertanyaan: safeString(r.pertanyaan, "Pertanyaan Refleksi Evaluasi Guru"),
        catatan: safeString(r.catatan, "-"),
      }))
    : getDefaultRefleksiGuru(topic);

  let refSiswa: RefleksiItem[] = Array.isArray(mod.refleksiSiswa) && mod.refleksiSiswa.length > 0
    ? mod.refleksiSiswa.map((r: any, idx: number) => ({
        no: r.no || idx + 1,
        pertanyaan: safeString(r.pertanyaan, "Pertanyaan Refleksi Peserta Didik"),
        catatan: safeString(r.catatan, "-"),
      }))
    : getDefaultRefleksiSiswa(topic);

  const isPancasila = subject.toLowerCase().includes("pancasila") || topic.toLowerCase().includes("pancasila");

  return {
    id: safeString(mod.id, "mod_" + Date.now()),
    title: safeString(mod.title || gen.topik, topic),
    moduleType: moduleType,
    subject: subject,
    targetClass: safeString(mod.targetClass || mod.gradeClass, "Kelas IV / Fase B"),
    approach: (safeString(mod.approach, "Kombinasi Deep Learning & STEM") as "Deep Learning" | "STEM" | "Kombinasi Deep Learning & STEM"),
    learningModel: modelName,
    allocationJP: safeString(mod.allocationJP || mod.timeAllocation, "2 x 35 Menit (70 Menit)"),
    generalInfo: {
      instansi: safeString(gen.instansi || mod.instansi, "SD Negeri 1 Merdeka"),
      semester: safeString(gen.semester, "1 (Satu)"),
      bab: safeString(gen.bab, "Bab 1"),
      topik: safeString(gen.topik || mod.title, topic),
      tahunAjaran: safeString(gen.tahunAjaran, "2026/2027"),
      kompetensiAwal: safeString(gen.kompetensiAwal || iden.pengetahuanAwal, `Murid telah memiliki pemahaman dasar terkait materi ${topic} pada ${subject}.`),
      profilPelajarPancasila: safeStringArray(gen.profilPelajarPancasila || ["Bernalar Kritis", "Gotong Royong", "Mandiri", "Kreatif"]),
      saranaPrasarana: safeString(gen.saranaPrasarana, "Buku Paket, Proyektor, Kartu Gambar, LKPD, Laptop"),
      targetPesertaDidik: safeString(gen.targetPesertaDidik || mod.targetSiswa, "Reguler / Tipikal (26 Murid)"),
    },
    identifikasi: {
      kesiapanKognitif: (safeString(iden.kesiapanKognitif, "").includes("Pancasila") && !isPancasila)
        ? `Murid berada pada tahap perkembangan kognitif yang mulai mampu berpikir analitis, memahami hubungan sebab-akibat, serta mengaplikasikan konsep ${topic} dalam kegiatan pembelajaran.`
        : safeString(iden.kesiapanKognitif, `Murid berada pada tahap perkembangan yang mulai mampu berpikir analitis dan memahami konsep ${topic}.`),
      pengetahuanAwal: (safeString(iden.pengetahuanAwal, "").includes("Pancasila") && !isPancasila)
        ? `Sebagian besar murid memiliki pemahaman awal mengenai ${topic}, namun memerlukan pendalaman melalui aktivitas eksplorasi dan diskusi kelompok.`
        : safeString(iden.pengetahuanAwal, `Sebagian besar murid telah memiliki pengetahuan dasar terkait ${topic}.`),
      kebutuhanBelajar: (safeString(iden.kebutuhanBelajar, "").includes("Pancasila") && !isPancasila)
        ? `Murid membutuhkan media visual, lembar kerja kelompok (LKPD), serta kesempatan berdiskusi aktif untuk memperkuat pemahaman materi ${topic}.`
        : safeString(iden.kebutuhanBelajar, `Murid membutuhkan media pembelajaran interaktif dan diskusi kelompok pada materi ${topic}.`),
      jenisPengetahuan: (safeString(iden.jenisPengetahuan, "").includes("Pancasila") && !isPancasila)
        ? `Pengetahuan Faktual (fakta dan istilah ${topic}), Konseptual (prinsip utama), dan Prosedural (langkah pengerjaan tugas ${topic}).`
        : safeString(iden.jenisPengetahuan, `Pengetahuan Faktual, Konseptual, dan Prosedural materi ${topic}.`),
      relevansiKesulitan: (safeString(iden.relevansiKesulitan, "").includes("Pancasila") && !isPancasila)
        ? `Materi ${topic} memiliki tingkat relevansi tinggi dalam mengembangkan kemampuan bernalar kritis dan pemecahan masalah.`
        : safeString(iden.relevansiKesulitan, `Materi ${topic} memiliki relevansi tinggi dalam pembelajaran kontekstual.`),
      strukturMateri: (safeString(iden.strukturMateri, "").includes("Pancasila") && !isPancasila)
        ? `Materi disusun sistematis: Apersepsi -> Penyampaian konsep utama ${topic} -> Eksplorasi LKPD -> Presentasi -> Evaluasi sumatif.`
        : safeString(iden.strukturMateri, `Materi ${topic} disusun secara terstruktur dari orientasi hingga evaluasi.`),
      integrasiNilaiKarakter: safeString(iden.integrasiNilaiKarakter, "Bernalar kritis, gotong royong melalui kerja kelompok, mandiri, serta komunikatif dalam presentasi."),
    },
    desainPembelajaran: {
      capaianPembelajaran: (safeString(desain.capaianPembelajaran, "").includes("Pancasila") && !isPancasila)
        ? `Pada akhir fase, murid mampu memahami, menganalisis, dan mengaplikasikan konsep ${topic} pada ${subject} secara mandiri maupun kolaboratif.`
        : safeString(desain.capaianPembelajaran, `Pada akhir fase, murid mampu memahami dan menguasai capaian pembelajaran pada materi ${topic}.`),
      tujuanPembelajaran: (safeString(desain.tujuanPembelajaran || core.tujuanPembelajaran, "").includes("Pancasila") && !isPancasila)
        ? `• Murid dapat memahami konsep utama ${topic} pada ${subject}.\n• Murid dapat menganalisis dan menyelesaikan persoalan terkait ${topic} melalui LKPD.\n• Murid dapat menyajikan hasil diskusi ${topic} secara percaya diri dan runtut.`
        : safeString(desain.tujuanPembelajaran || core.tujuanPembelajaran, `• Murid dapat memahami konsep ${topic}.\n• Murid dapat menyelesaikan tugas ${topic} secara kolaboratif.`),
      indikatorTujuanPembelajaran: Array.isArray(desain.indikatorTujuanPembelajaran) && desain.indikatorTujuanPembelajaran.length > 0
        ? desain.indikatorTujuanPembelajaran
        : [
            `Mengidentifikasi dan menjelaskan konsep dasar ${topic} secara tepat.`,
            `Menganalisis permasalahan terkait ${topic} bersama kelompok pada LKPD.`,
            `Menyajikan dan mempresentasikan hasil diskusi materi ${topic} secara komunikatif.`
          ],
      lintasDisiplinIlmu: safeString(desain.lintasDisiplinIlmu, `Keterhubungan ${subject} dengan literasi, numerasi, dan kearifan lokal.`),
      topikPembelajaran: safeString(desain.topikPembelajaran, topic),
      praktikPedagogis: {
        pendekatan: safeString(desain.praktikPedagogis?.pendekatan, "Deep Learning"),
        model: safeString(desain.praktikPedagogis?.model || modelName, "Problem Based Learning (PBL)"),
        metode: safeString(desain.praktikPedagogis?.metode, "Observasi, Diskusi kelompok, Presentasi, Penugasan"),
      },
      saranaPrasaranaDetails: {
        sarana: safeString(desain.saranaPrasaranaDetails?.sarana, "Ruang kelas"),
        prasarana: safeString(desain.saranaPrasaranaDetails?.prasarana, "Papan tulis, Laptop, LCD Proyektor"),
        media: safeString(desain.saranaPrasaranaDetails?.media, `Slide Presentasi ${topic}, LKPD, Alat Peraga`),
        sumberBelajar: safeString(desain.saranaPrasaranaDetails?.sumberBelajar, `Buku Siswa ${subject} & Bahan Ajar Guru`),
      },
      kemitraanPembelajaran: safeString(desain.kemitraanPembelajaran, "Kolaborasi antarmurid dan pendampingan orang tua di rumah."),
      lingkunganPembelajaran: {
        iklimKelas: safeString(desain.lingkunganPembelajaran?.iklimKelas, "Kondusif, menyenangkan, interaktif, dan aman untuk berpendapat."),
        budayaBelajar: safeString(desain.lingkunganPembelajaran?.budayaBelajar, "Kolaboratif, aktif bertanya, dan saling menghargai."),
        sosioEmosional: safeString(desain.lingkunganPembelajaran?.sosioEmosional, "Guru memberikan penguatan positif dan membangun rasa percaya diri peserta didik."),
      },
      dplSelected: Array.isArray(desain.dplSelected) ? desain.dplSelected : [1, 2, 3, 4, 5, 6, 8],
      pertanyaanPemantikDetailed: {
        afektif: safeString(desain.pertanyaanPemantikDetailed?.afektif, `"Bagaimana perasaan kalian saat belajar materi ${topic} bersama kelompok?"`),
        kognitif: safeString(desain.pertanyaanPemantikDetailed?.kognitif, `"Mengapa pemahaman tentang ${topic} penting dalam kehidupan kita?"`),
        psikomotorik: safeString(desain.pertanyaanPemantikDetailed?.psikomotorik, `"Bagaimana cara kelompok kalian menyajikan hasil pengerjaan LKPD ${topic}?"`),
      },
    },
    coreComponent: {
      tujuanPembelajaran: safeString(core.tujuanPembelajaran, `Murid dapat memahami dan mengaplikasikan konsep ${topic} pada ${subject}.`),
      pemahamanBermakna: safeString(core.pemahamanBermakna, `Pemahaman tentang ${topic} membantu murid berpikir logis, analitis, dan solutif.`),
      pertanyaanPemantik: safeString(core.pertanyaanPemantik, `Pernahkah kalian menemui atau menggunakan konsep ${topic} dalam kehidupan sehari-hari?`),
    },
    activities: {
      pendahuluan: safeString(act.pendahuluan, `1. Guru menyapa murid, berdoa bersama, dan apersepsi materi ${topic}.\n2. Guru menyampaikan tujuan pembelajaran dan pertanyaan pemantik.`),
      inti: safeString(act.inti, `1. Penjelasan konsep ${topic} dengan media interaktif.\n2. Pembentukan kelompok untuk pengerjaan LKPD ${topic}.\n3. Presentasi hasil diskusi kelompok dan tanggapan.`),
      penutup: safeString(act.penutup, `1. Merangkum poin penting ${topic}.\n2. Refleksi dan evaluasi sumatif ${topic}.\n3. Doa dan salam penutup.`),
    },
    activitiesTable: actTable,
    kegiatanAwalText: (safeString(mod.kegiatanAwalText, "").includes("Pancasila") && !isPancasila)
      ? `• Pembiasaan Budaya Positif & Apersepsi:\n- Guru membuka pelajaran dengan salam dan doa.\n- Guru mengecek kehadiran dan memberikan apersepsi terkait materi ${topic}.\n- Guru menyampaikan tujuan pembelajaran dan pertanyaan pemantik untuk memicu rasa ingin tahu.`
      : safeString(mod.kegiatanAwalText, `• Pembiasaan Budaya Positif & Apersepsi:\n- Guru membuka pelajaran dengan salam dan doa.\n- Guru mengecek kehadiran dan apersepsi materi ${topic}.`),
    kegiatanPenutupText: (safeString(mod.kegiatanPenutupText, "").includes("Pancasila") && !isPancasila)
      ? `1. Kesimpulan: Guru dan murid merangkum poin-poin utama materi ${topic}.\n2. Refleksi & Evaluasi: Mengerjakan kuis evaluasi singkat dan mengisi lembar refleksi emosi.\n3. Penutup: Doa dan salam penutup.`
      : safeString(mod.kegiatanPenutupText, `1. Kesimpulan bersama murid.\n2. Refleksi dan evaluasi sumatif ${topic}.\n3. Doa dan salam penutup.`),
    assessment: {
      diagnostik: safeString(ass.diagnostik, `Tes Lisan Awal Pembelajaran tentang ${topic}`),
      formatif: safeString(ass.formatif, `Observasi Keaktifan Diskusi & LKPD ${topic}`),
      sumatif: safeString(ass.sumatif, `Tes Tertulis Evaluasi Akhir ${topic}`),
    },
    assessmentForLearningSummary: mod.assessmentForLearningSummary || {
      tujuan: "Membantu guru dan murid mengetahui pemahaman selama proses belajar.",
      teknik: "Tes lisan dan Tulis",
      bentuk: "Tanya jawab dan LKPD",
      waktu: "Di awal dan saat proses pembelajaran",
    },
    assessmentAsLearningSummary: mod.assessmentAsLearningSummary || {
      tujuan: "Melatih siswa merefleksikan pemahamannya.",
      teknik: "Penilaian diri (Self-Assessment)",
      bentuk: "Lembar refleksi",
      waktu: "Saat / Akhir proses pembelajaran",
    },
    assessmentOfLearningSummary: mod.assessmentOfLearningSummary || {
      tujuan: "Menilai pencapaian akhir siswa sebagai dasar penentuan nilai.",
      teknik: "Tes Tertulis Evaluasi",
      bentuk: "Pilihan Ganda dan Uraian",
      waktu: "Di akhir pembelajaran",
    },
    rubrikPenilaian: safeString(mod.rubrikPenilaian, "Rubrik Penilaian Formatif, Penilaian Diri, dan Evaluasi Sumatif."),
    rubrikFormatif: rubFormatif,
    rubrikSumatif: rubSumatif,
    rubrikAsLearning: rubAsLearning,
    kisiKisiSumatif: kisiKisi,
    soalSumatifList: soalList,
    lkpdText: (safeString(mod.lkpdText, "").includes("SEJARAH LAHIRNYA PANCASILA") && !isPancasila) || !mod.lkpdText
      ? `LEMBAR KERJA PESERTA DIDIK (LKPD) - ${topic.toUpperCase()}

Mata Pelajaran / Proyek: ${subject}
Materi Utama: ${topic}
Nama Kelompok: ........................................
Anggota Kelompok:
1. ..................................................... 3. .....................................................
2. ..................................................... 4. .....................................................

PETUNJUK KERJA:
1. Bacalah bahan ajar dan amati penjelasan guru mengenai ${topic} dengan cermat!
2. Diskusikan bersama kelompokmu untuk menyelesaikan tugas dan pertanyaan di bawah ini!
3. Tuliskan hasil diskusi pada tempat yang telah disediakan secara rapi dan jelas!

TUGAS 1: EKSPLORASI KONSEP ${topic.toUpperCase()}
Silakan tuliskan poin-poin penting atau konsep utama dari materi ${topic} yang telah kamu pelajari!

TUGAS 2: ANALISIS & PEMECAHAN MASALAH
1. Jelaskan pemahaman kelompokmu mengenai ${topic}!
2. Sebutkan dan jelaskan 2 contoh penerapan ${topic} dalam kehidupan sehari-hari!
3. Bagaimana cara terbaik untuk menyelesaikan permasalahan terkait ${topic}? Tuliskan alasan kelompokmu!`
      : mod.lkpdText,
    bahanAjarText: (safeString(mod.bahanAjarText, "").includes("SEJARAH LAHIRNYA PANCASILA") && !isPancasila) || !mod.bahanAjarText
      ? `BAHAN AJAR: ${topic.toUpperCase()} (${subject.toUpperCase()})

1. Pengantar Materi ${topic}:
Materi ${topic} pada kegiatan ${moduleType} ${subject} dirancang untuk membantu murid memahami konsep secara mendalam dan kontekstual.

2. Konsep Utama & Indikator Penting:
Dalam mempelajari ${topic}, murid diajak untuk mengamati, menganalisis, dan mengaplikasikan poin-poin utama secara sistematis.

3. Penerapan Konsep dalam Kehidupan Sehari-hari:
Pemahaman mengenai ${topic} sangat bermanfaat dalam mengembangkan pola pikir kritis, kreatif, serta solutif dalam menghadapi berbagai situasi nyata.`
      : mod.bahanAjarText,
    mediaPembelajaranText: (safeString(mod.mediaPembelajaranText, "").includes("Sejarah Lahirnya Pancasila") && !isPancasila) || !mod.mediaPembelajaranText
      ? `MEDIA PEMBELAJARAN: ${subject} - ${topic}
A. Presentation Slides / PowerPoint Interaktif ${topic}
B. Lembar Kerja Peserta Didik (LKPD) Digital & Cetak
C. Alat Peraga & Media Visual Pendukung Pembelajaran ${topic}`
      : mod.mediaPembelajaranText,
    remedialPengayaanText: mod.remedialPengayaanText || {
      remedial: `Remedial diberikan kepada murid yang belum mencapai tujuan pembelajaran melalui bimbingan perorangan/kelompok serta penjelasan ulang materi ${topic}.`,
      pengayaan: `Pengayaan diberikan kepada murid yang telah tuntas berupa penugasan pendalaman konsep ${topic} yang lebih kompleks.`,
    },
    glosarium: (safeString(mod.glosarium, "").includes("Pancasila") && !isPancasila) || !mod.glosarium
      ? `GLOSARIUM:
• ${topic}: Topik utama pembelajaran dalam ${subject}.
• Konsep Utama: Gagasan pokok yang menjadi landasan pemahaman.`
      : mod.glosarium,
    refleksiGuru: refGuru,
    refleksiSiswa: refSiswa,
  };
}

export const TeachingModuleGeneratorView: React.FC<TeachingModuleGeneratorViewProps> = ({
  schoolIdentity,
  students,
  teachingModules,
  aiSettings,
  onSaveModules,
  onOpenPrint,
}) => {
  const [selectedModule, setSelectedModule] = useState<TeachingModule | null>(
    teachingModules[0] ? ensureModuleStructure(teachingModules[0]) : null
  );

  const activeModule = selectedModule ? ensureModuleStructure(selectedModule) : null;
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form for AI Generation
  const [moduleType, setModuleType] = useState<"Intrakurikuler" | "Kokurikuler">(
    "Intrakurikuler"
  );
  const [subject, setSubject] = useState("Bahasa Indonesia");
  const [targetClass, setTargetClass] = useState("Kelas IV (Fase B)");
  const [materi, setMateri] = useState("Teks Cerita Rakyat & Amanat Moral");
  const [approach, setApproach] = useState<"Deep Learning" | "STEM" | "Kombinasi Deep Learning & STEM">(
    "Kombinasi Deep Learning & STEM"
  );
  const [learningModel, setLearningModel] = useState<
    "PjBL (Project Based Learning)" | "PBL (Problem Based Learning)" | "Discovery Learning" | "Inquiry Learning" | "Cooperative Learning"
  >("PjBL (Project Based Learning)");
  const [allocationJP, setAllocationJP] = useState("2 x 35 Menit (2 JP)");

  const handleModuleTypeChange = (newType: "Intrakurikuler" | "Kokurikuler") => {
    setModuleType(newType);
    if (newType === "Kokurikuler") {
      setSubject("Bahasa Indonesia & IPAS");
      setMateri("Proyek Kokurikuler: Pengolahan Sampah Organik & Daur Ulang");
    } else {
      setSubject("Bahasa Indonesia");
      setMateri("Teks Cerita Rakyat & Amanat Moral");
    }
  };

  const handleGenerateModuleAI = async () => {
    setIsGenerating(true);
    try {
      const prompt = `Anda adalah konsultan pengembang Modul Ajar Kurikulum Merdeka Indonesia tingkat Sekolah Dasar.
Buatkan draft MODUL AJAR ${moduleType.toUpperCase()} yang sangat lengkap, terstruktur, dan siap cetak.

PENTING & WAJIB (STRICT ATURAN STERIL):
1. Seluruh isi modul (termasuk Informasi Umum, Identifikasi, Desain Pembelajaran, Kegiatan, Asesmen, Rubrik, Kisi-Kisi, Soal Evaluasi, LKPD, Bahan Ajar, Media Pembelajaran, Refleksi, Remedial/Pengayaan, Glosarium) WAJIB 100% MURNI dan BERSIH HANYA berfokus pada Mata Pelajaran/Proyek (${subject}) dan Topik/Materi (${materi}).
2. DILARANG KERAS menyisipkan atau menyertakan materi dari mata pelajaran lain (seperti Pendidikan Pancasila / Sejarah Lahirnya Pancasila / BPUPKI / PPKI / Piagam Jakarta) KECUALI jika subjek yang diisi oleh pengguna memang Pendidikan Pancasila!
3. Modul ini harus menjadi modul baru yang benar-benar BERSIH dari residu atau sisa dari pembuatan modul sebelumnya.

Detail Input:
- Jenis Modul: ${moduleType}
- Mata Pelajaran / Proyek Kokurikuler: ${subject}
- Kelas & Fase: ${targetClass}
- Topik / Materi Utama: ${materi}
- Pendekatan Pembelajaran: ${approach} (Prinsip Mindful, Meaningful, Joyful Learning)
- Model Pembelajaran: ${learningModel}
- Alokasi Waktu: ${allocationJP}
- Nama Sekolah: ${schoolIdentity.schoolName}
- Nama Guru: ${schoolIdentity.teacherName}

Format Output HARUS berupa JSON murni tanpa markdown lain:
{
  "title": "Modul Ajar ${moduleType} - ${subject} (${materi})",
  "moduleType": "${moduleType}",
  "subject": "${subject}",
  "targetClass": "${targetClass}",
  "approach": "${approach}",
  "learningModel": "${learningModel}",
  "allocationJP": "${allocationJP}",
  "generalInfo": {
    "kompetensiAwal": "Deskripsi kemahiran awal murid sebelum masuk topik ${materi}",
    "profilPelajarPancasila": ["Bernalar Kritis", "Gotong Royong", "Kreatif"],
    "saranaPrasarana": "Buku bacaan ${subject}, laptop, proyektor, LKPD ${materi}",
    "targetPesertaDidik": "Reguler (26 Murid)"
  },
  "identifikasi": {
    "kesiapanKognitif": "Penjelasan kesiapan kognitif murid terkait ${materi}",
    "pengetahuanAwal": "Pengetahuan awal murid tentang ${materi}",
    "kebutuhanBelajar": "Kebutuhan belajar murid untuk materi ${materi}",
    "jenisPengetahuan": "Pengetahuan Faktual, Konseptual, dan Prosedural ${materi}",
    "relevansiKesulitan": "Relevansi dan tingkat kesulitan ${materi}",
    "strukturMateri": "Struktur urutan penyampaian materi ${materi}",
    "integrasiNilaiKarakter": "Nilai karakter yang diintegrasikan"
  },
  "desainPembelajaran": {
    "capaianPembelajaran": "Capaian Pembelajaran ${subject} topik ${materi}",
    "tujuanPembelajaran": "Tujuan Pembelajaran ${materi}",
    "indikatorTujuanPembelajaran": ["Indikator 1", "Indikator 2", "Indikator 3"],
    "lintasDisiplinIlmu": "Keterkaitan ${subject} dengan disiplin ilmu lain",
    "topikPembelajaran": "${materi}",
    "praktikPedagogis": { "pendekatan": "${approach}", "model": "${learningModel}", "metode": "Diskusi, Observasi, Presentasi" },
    "saranaPrasaranaDetails": { "sarana": "Ruang kelas", "prasarana": "Laptop, LCD", "media": "Slide ${materi}, LKPD", "sumberBelajar": "Buku Paket ${subject}" }
  },
  "coreComponent": {
    "tujuanPembelajaran": "Tujuan utama pembelajaran ${materi}",
    "pemahamanBermakna": "Pemahaman bermakna dari materi ${materi}",
    "pertanyaanPemantik": "Pertanyaan pemantik untuk materi ${materi}"
  },
  "activitiesTable": [
    { "no": 1, "tahap": "Kegiatan Pembukaan (Mindful Learning)", "kegiatan": "Guru menyapa murid dan apersepsi materi ${materi}...", "alokasiWaktu": "15 Menit" },
    { "no": 2, "tahap": "Kegiatan Inti (Meaningful - Sintaks ${learningModel})", "kegiatan": "Murid berdiskusi dalam kelompok mengerjakan LKPD ${materi}...", "alokasiWaktu": "45 Menit" },
    { "no": 3, "tahap": "Kegiatan Penutup (Joyful Reflection)", "kegiatan": "Merangkum dan merefleksi pembelajaran ${materi}...", "alokasiWaktu": "10 Menit" }
  ],
  "assessment": {
    "diagnostik": "Tes lisan diawal tentang ${materi}",
    "formatif": "Observasi diskusi & LKPD ${materi}",
    "sumatif": "Tes tertulis evaluasi ${materi}"
  },
  "rubrikFormatif": [
    { "kriteria": "Pemahaman Konsep ${materi}", "sangatBaik": "Sangat paham...", "baik": "Paham...", "cukup": "Cukup...", "perluBimbingan": "Perlu bimbingan..." }
  ],
  "rubrikSumatif": [
    { "kriteria": "Penguasaan Materi ${materi}", "indikator": "Menjawab soal evaluasi...", "skorMaks": 50, "pedoman": "Pedoman skoring..." }
  ],
  "kisiKisiSumatif": [
    { "no": 1, "tujuanPembelajaran": "...", "indikator": "Menentukan...", "materi": "${materi}", "levelKognitif": "C3", "bentukSoal": "Pilihan Ganda", "nomorSoal": "1", "kunciJawaban": "A", "skorPerSoal": 4, "tingkat": "Sedang" }
  ],
  "soalSumatifList": [
    { "no": 1, "pertanyaan": "Soal tentang ${materi} dalam mata pelajaran ${subject}...", "pilihan": ["A. Opsi A", "B. Opsi B", "C. Opsi C", "D. Opsi D"], "kunciJawaban": "A" }
  ],
  "lkpdText": "Isi lengkap Lembar Kerja Peserta Didik (LKPD) khusus materi ${materi}...",
  "bahanAjarText": "Isi lengkap Bahan Ajar khusus materi ${materi}...",
  "mediaPembelajaranText": "Isi lengkap Media Pembelajaran khusus materi ${materi}...",
  "glosarium": "Glosarium istilah penting materi ${materi}...",
  "refleksiGuru": [
    { "no": 1, "pertanyaan": "Apakah seluruh siswa paham materi ${materi}?", "catatan": "Catatan refleksi..." }
  ],
  "refleksiSiswa": [
    { "no": 1, "pertanyaan": "Bagaimana perasaanmu belajar ${materi}?", "catatan": "Catatan siswa..." }
  ]
}`;

      const result = await generateAIContent({
        prompt,
        model: aiSettings?.selectedAgent || "gemini-3.6-flash",
        manualApiKey: aiSettings?.manualApiKey || undefined,
      });

      if (result) {
        let cleanText = result.trim();
        if (cleanText.startsWith("```json")) cleanText = cleanText.slice(7);
        if (cleanText.endsWith("```")) cleanText = cleanText.slice(0, -3);

        const parsed = JSON.parse(cleanText);
        const rawMod = {
          id: "mod_" + Date.now(),
          title: parsed.title || `Modul ${materi}`,
          moduleType: parsed.moduleType || moduleType,
          subject: parsed.subject || subject,
          targetClass: parsed.targetClass || targetClass,
          approach: parsed.approach || approach,
          learningModel: parsed.learningModel || learningModel,
          allocationJP: parsed.allocationJP || allocationJP,
          generalInfo: parsed.generalInfo || {},
          identifikasi: parsed.identifikasi || {},
          desainPembelajaran: parsed.desainPembelajaran || {},
          coreComponent: parsed.coreComponent || {},
          activitiesTable: parsed.activitiesTable || [],
          assessment: parsed.assessment || {},
          rubrikFormatif: parsed.rubrikFormatif || [],
          rubrikSumatif: parsed.rubrikSumatif || [],
          kisiKisiSumatif: parsed.kisiKisiSumatif || [],
          soalSumatifList: parsed.soalSumatifList || [],
          lkpdText: parsed.lkpdText || "",
          bahanAjarText: parsed.bahanAjarText || "",
          mediaPembelajaranText: parsed.mediaPembelajaranText || "",
          kegiatanAwalText: parsed.kegiatanAwalText || "",
          kegiatanPenutupText: parsed.kegiatanPenutupText || "",
          remedialPengayaanText: parsed.remedialPengayaanText || {},
          glosarium: parsed.glosarium || "",
          refleksiGuru: parsed.refleksiGuru || [],
          refleksiSiswa: parsed.refleksiSiswa || [],
        };

        const newMod = ensureModuleStructure(rawMod);

        const updatedList = [newMod, ...teachingModules];
        onSaveModules(updatedList);
        setSelectedModule(newMod);
        setIsAiModalOpen(false);
      }
    } catch (err: any) {
      console.error("AI Generation failed, creating fallback template:", err);
      const fallbackRawMod = {
        id: "mod_" + Date.now(),
        title: `Modul Ajar ${moduleType} - ${subject} (${materi})`,
        moduleType,
        subject,
        targetClass,
        approach,
        learningModel,
        allocationJP,
        generalInfo: {
          instansi: schoolIdentity.schoolName || "SD Negeri 1 Merdeka",
          faseKelas: `${targetClass}`,
          topik: materi,
          kompetensiAwal: `Peserta didik memiliki pemahaman dasar mengenai materi ${materi} pada mata pelajaran ${subject}.`,
          profilPelajarPancasila: ["Bernalar Kritis", "Gotong Royong", "Mandiri", "Kreatif"],
          saranaPrasarana: "Buku Paket, Proyektor, Kartu Gambar, LKPD, Laptop",
          targetPesertaDidik: "Peserta Didik Reguler / Tipikal (26-28 Murid)",
        },
        identifikasi: {
          kesiapanKognitif: `Peserta didik berada pada tahap perkembangan yang mulai mampu berpikir analitis dan menyelesaikan tugas ${materi}.`,
          pengetahuanAwal: `Sebagian besar peserta didik telah memiliki pengetahuan dasar terkait ${materi}.`,
          kebutuhanBelajar: `Peserta didik membutuhkan media visual dan diskusi kelompok pada materi ${materi}.`,
          jenisPengetahuan: `Pengetahuan Faktual, Konseptual, dan Prosedural materi ${materi}.`,
          relevansiKesulitan: `Materi ${materi} sangat relevan dengan pengembangan keterampilan bernalar kritis.`,
          strukturMateri: `Materi disajikan secara terstruktur: Apersepsi -> Penjelasan Konsep ${materi} -> Diskusi LKPD -> Evaluasi.`,
          integrasiNilaiKarakter: "Bernalar Kritis, Gotong Royong, Mandiri, Komunikatif",
        },
        desainPembelajaran: {
          capaianPembelajaran: `Pada akhir fase, peserta didik mampu memahami, menganalisis, dan mengaplikasikan materi ${materi} pada ${subject}.`,
          tujuanPembelajaran: `1. Peserta didik mampu memahami konsep utama ${materi} secara mendalam.\n2. Peserta didik mampu mengaplikasikan pemahaman tentang ${materi} dalam menyelesaikan soal dan persoalan kehidupan sehari-hari.`,
          indikatorTujuanPembelajaran: [
            `Mengidentifikasi dan menjelaskan konsep dasar ${materi} secara tepat.`,
            `Menganalisis permasalahan terkait ${materi} bersama kelompok pada LKPD.`,
            `Menyajikan dan mempresentasikan hasil diskusi materi ${materi} secara komunikatif.`
          ],
          lintasDisiplinIlmu: `Keterhubungan ${subject} dengan literasi, numerasi, dan kearifan lokal.`,
          topikPembelajaran: materi,
          praktikPedagogis: {
            pendekatan: approach,
            model: learningModel,
            metode: "Observasi, Diskusi Kelompok, Presentasi, Penugasan",
          },
          saranaPrasaranaDetails: {
            sarana: "Ruang Kelas",
            prasarana: "Papan Tulis, Laptop, LCD Proyektor",
            media: `Slide Presentasi ${materi}, LKPD, Alat Peraga`,
            sumberBelajar: `Buku Siswa ${subject} & Bahan Ajar Guru`,
          },
          kemitraanPembelajaran: "Kolaborasi antarmurid dan pendampingan orang tua di rumah.",
          lingkunganPembelajaran: {
            iklimKelas: "Kondusif, menyenangkan, interaktif, dan aman untuk berpendapat.",
            budayaBelajar: "Kolaboratif, aktif bertanya, dan saling menghargai.",
            sosioEmosional: "Guru memberikan penguatan positif dan membangun rasa percaya diri peserta didik.",
          },
        },
        coreComponent: {
          tujuanPembelajaran: `1. Peserta didik mampu memahami konsep utama ${materi} secara mendalam.\n2. Peserta didik mampu mengaplikasikan pemahaman tentang ${materi} dalam menyelesaikan soal dan persoalan kehidupan sehari-hari.`,
          pemahamanBermakna: `Pemahaman tentang ${materi} membantu peserta didik berpikir logis, analitis, dan solutif dalam kehidupan sehari-hari.`,
          pertanyaanPemantik: `1. Pernahkah kalian menemui contoh ${materi} di lingkungan sekitar?\n2. Bagaimana cara kalian menyelesaikan permasalahan terkait ${materi}?`,
        },
        activitiesTable: [
          {
            no: 1,
            tahap: "Pendahuluan (15 Menit)",
            kegiatan: `Guru membuka pelajaran dengan salam, berdoa bersama, memeriksa kehadiran, dan apersepsi terkait materi ${materi}. Guru menyampaikan tujuan pembelajaran dan pertanyaan pemantik.`,
            alokasiWaktu: "15 Menit",
          },
          {
            no: 2,
            tahap: "Kegiatan Inti (50 Menit)",
            kegiatan: `Guru menjelaskan materi ${materi} dengan alat peraga/media. Siswa dibagi menjadi kelompok heterogen untuk berdiskusi mengerjakan LKPD ${materi}. Guru membimbing kelompok dan mengobservasi keaktifan siswa. Setiap kelompok mempresentasikan hasil diskusi.`,
            alokasiWaktu: "50 Menit",
          },
          {
            no: 3,
            tahap: "Penutup (15 Menit)",
            kegiatan: `Guru bersama siswa menyimpulkan poin-poin penting pembelajaran ${materi}. Guru memberikan umpan balik, kuis singkat/asesmen sumatif, serta refleksi perasaan belajar siswa sebelum ditutup dengan doa.`,
            alokasiWaktu: "15 Menit",
          },
        ],
        assessment: {
          diagnostik: `Tes Lisan Awal Pembelajaran tentang ${materi}`,
          formatif: `Observasi Keaktifan Diskusi & Lembar Kinerja LKPD ${materi}`,
          sumatif: `Tes Tertulis Evaluasi Akhir (Pilihan Ganda & Uraian) ${materi}`,
        },
        lkpdText: `LEMBAR KERJA PESERTA DIDIK (LKPD) - ${materi.toUpperCase()}
Mata Pelajaran / Proyek: ${subject}
Materi: ${materi}

Nama Kelompok: ........................
Anggota: 1. ......... 2. ......... 3. ......... 4. .........

PETUNJUK KERJA:
1. Bacalah petunjuk soal dengan cermat.
2. Diskusikan bersama teman sekelompokmu untuk menyelesaikan pertanyaan di bawah ini.
3. Tuliskan jawaban pada tempat yang telah disediakan.

SOAL DISKUSI:
1. Jelaskan pemahaman kalian mengenai materi ${materi}!
2. Berikan 3 contoh penerapan ${materi} dalam kehidupan sehari-hari!
3. Bagaimana solusi terbaik kelompokmu dalam menyelesaikan permasalahan terkait ${materi}?`,
        bahanAjarText: `BAHAN AJAR: ${materi.toUpperCase()} (${subject.toUpperCase()})

1. Pengantar Konsep ${materi}:
Materi ini memberikan pemahaman dasar dan penerapan praktis ${materi} dalam pembelajaran ${subject}.

2. Ringkasan Poin Utama:
- Konsep dan definisi utama ${materi}.
- Ciri-ciri dan unsur penting yang wajib dipahami.

3. Contoh Aplikasi Nyata:
Penerapan ${materi} dalam kehidupan sehari-hari untuk melatih pola pikir kritis dan mandiri.`,
        mediaPembelajaranText: `MEDIA PEMBELAJARAN: ${subject} - ${materi}
A. Slide Presentasi / PowerPoint Interaktif ${materi}
B. Lembar Kerja Peserta Didik (LKPD) Cetak/Digital
C. Gambar / Alat Peraga Kontekstual ${materi}`,
        glosarium: `GLOSARIUM:
• ${materi}: Topik utama pembelajaran dalam ${subject}.
• Konsep Utama: Gagasan pokok yang menjadi landasan pemahaman.`,
        refleksiGuru: [
          { no: 1, pertanyaan: `Apakah seluruh peserta didik mencapai Tujuan Pembelajaran ${materi}?`, catatan: "Sesuai observasi & asesmen formatif" },
          { no: 2, pertanyaan: "Kendala apa yang dihadapi selama kegiatan pembelajaran?", catatan: "Manajemen waktu saat diskusi kelompok" },
        ],
        refleksiSiswa: [
          { no: 1, pertanyaan: `Bagian materi ${materi} mana yang paling kamu sukai?`, catatan: "Saat diskusi kelompok dan eksplorasi LKPD" },
          { no: 2, pertanyaan: "Apakah kamu memahami penjelasan materi hari ini?", catatan: "Sangat memahami" },
        ],
      };

      const newMod = ensureModuleStructure(fallbackRawMod);
      onSaveModules([newMod, ...teachingModules]);
      setSelectedModule(newMod);
      setIsAiModalOpen(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteModule = (id: string) => {
    const updated = teachingModules.filter((m) => m.id !== id);
    onSaveModules(updated);
    if (selectedModule?.id === id) {
      setSelectedModule(updated[0] || null);
    }
  };

  const handleExportJSON = () => {
    if (activeModule) {
      exportDataToJSON(activeModule, `Modul_Ajar_${activeModule.title}`);
    }
  };

  const handleExportDoc = () => {
    if (!activeModule) return;
    onOpenPrint(
      `MODUL AJAR KURIKULUM MERDEKA (${(activeModule.moduleType || "INTRAKURIKULER").toUpperCase()})`,
      `${activeModule.subject} - ${activeModule.targetClass} | Model: ${activeModule.learningModel}`,
      renderDocumentContent(activeModule)
    );
  };

  // Render document component shared for Preview and Print
  const renderDocumentContent = (mod: TeachingModule, isForPrintModal = false) => {
    const studentGrades = getFullStudentGradeList(students);
    const iden = mod.identifikasi || {};
    const desain = mod.desainPembelajaran || {};

    return (
      <div className="space-y-6 text-[12px] font-sans leading-normal text-slate-900 bg-white p-2">
        {/* Kop Surat Resmi - Only render in preview card if not inside PrintModal */}
        {!isForPrintModal && (
          <KopSurat
            schoolIdentity={schoolIdentity}
            title={`RENCANA PEMBELAJARAN MENDALAM (RPM)`}
            subtitle={`${mod.subject} • ${mod.targetClass} | ALOKASI WAKTU: ${mod.allocationJP}`}
          />
        )}

        {/* HEADER COVER TITLE */}
        <div className="border-2 border-slate-900 p-4 text-center space-y-1 rounded bg-slate-50">
          <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-900">
            RENCANA PEMBELAJARAN MENDALAM (RPM)
          </h2>
          <p className="text-xs font-bold text-slate-800 uppercase">
            TOPIK: {mod.generalInfo?.topik || mod.title}
          </p>
          <p className="text-[11px] text-slate-600 font-medium">
            {schoolIdentity.schoolName || "SD Negeri 1 Merdeka"} • Tahun Ajaran {mod.generalInfo?.tahunAjaran || "2026/2027"}
          </p>
        </div>

        {/* I. INFORMASI UMUM */}
        <div className="border border-slate-300 rounded p-3 space-y-3 bg-white">
          <h3 className="font-bold uppercase text-[12px] border-b border-slate-300 pb-1 text-slate-900 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-700" />
            I. INFORMASI UMUM
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-400 text-[12px]">
              <tbody>
                <tr className="border-b border-slate-300">
                  <td className="p-2 border-r border-slate-300 font-bold bg-slate-50 w-44">Nama Penyusun</td>
                  <td className="p-2">{schoolIdentity?.teacherName || "-"}</td>
                  <td className="p-2 border-r border-slate-300 font-bold bg-slate-50 w-40">Semester</td>
                  <td className="p-2">{mod.generalInfo?.semester || "1 (Satu)"}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-2 border-r border-slate-300 font-bold bg-slate-50">Instansi / Satuan Pendidikan</td>
                  <td className="p-2">{schoolIdentity?.schoolName || "-"}</td>
                  <td className="p-2 border-r border-slate-300 font-bold bg-slate-50">Bab / Tema</td>
                  <td className="p-2">{mod.generalInfo?.bab || "Bab 1"}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-2 border-r border-slate-300 font-bold bg-slate-50">Jenjang Sekolah / Kelas</td>
                  <td className="p-2">SD / {mod.targetClass}</td>
                  <td className="p-2 border-r border-slate-300 font-bold bg-slate-50">Topik Pembelajaran</td>
                  <td className="p-2">{mod.generalInfo?.topik || mod.title}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-2 border-r border-slate-300 font-bold bg-slate-50">Fase / Tahun Ajaran</td>
                  <td className="p-2">Fase C / {mod.generalInfo?.tahunAjaran || "2026/2027"}</td>
                  <td className="p-2 border-r border-slate-300 font-bold bg-slate-50">Alokasi Waktu</td>
                  <td className="p-2">{mod.allocationJP}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* II. IDENTIFIKASI */}
        <div className="border border-slate-300 rounded p-3 space-y-3 bg-slate-50/50">
          <h3 className="font-bold uppercase text-[12px] border-b border-slate-300 pb-1 text-slate-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-indigo-700" />
            II. IDENTIFIKASI
          </h3>

          <div className="space-y-3 text-[12px]">
            <div>
              <h4 className="font-bold text-slate-900 mb-1">A. Identifikasi Murid:</h4>
              <ul className="list-disc pl-5 space-y-1 text-slate-800">
                <li><b>Kesiapan Kognitif:</b> {iden.kesiapanKognitif}</li>
                <li><b>Pengetahuan Awal:</b> {iden.pengetahuanAwal}</li>
                <li><b>Kebutuhan Belajar Murid:</b> {iden.kebutuhanBelajar}</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1">B. Identifikasi Materi Pembelajaran:</h4>
              <ul className="list-disc pl-5 space-y-1 text-slate-800">
                <li><b>Jenis Pengetahuan:</b> {iden.jenisPengetahuan}</li>
                <li><b>Relevansi & Tingkat Kesulitan:</b> {iden.relevansiKesulitan}</li>
                <li><b>Struktur Materi:</b> {iden.strukturMateri}</li>
                <li><b>Integrasi Nilai & Karakter:</b> {iden.integrasiNilaiKarakter}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* III. DESAIN PEMBELAJARAN */}
        <div className="border border-slate-300 rounded p-3 space-y-3 bg-white">
          <h3 className="font-bold uppercase text-[12px] border-b border-slate-300 pb-1 text-slate-900 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-slate-700" />
            III. DESAIN PEMBELAJARAN
          </h3>

          <div className="space-y-3 text-[12px]">
            <p><b>A. Capaian Pembelajaran (CP):</b> {desain.capaianPembelajaran}</p>
            
            <div>
              <p className="font-bold text-slate-900">B. Tujuan Pembelajaran (TP):</p>
              <div className="whitespace-pre-line pl-3 pt-0.5 text-slate-800">{desain.tujuanPembelajaran}</div>
            </div>

            <div>
              <p className="font-bold text-slate-900">C. Indikator Tujuan Pembelajaran (IKTP):</p>
              <ul className="list-disc pl-5 space-y-0.5 text-slate-800">
                {Array.isArray(desain.indikatorTujuanPembelajaran)
                  ? desain.indikatorTujuanPembelajaran.map((iktp, idx) => (
                      <li key={idx}>{iktp}</li>
                    ))
                  : <li>{String(desain.indikatorTujuanPembelajaran || "-")}</li>
                }
              </ul>
            </div>

            <p><b>D. Lintas Disiplin Ilmu:</b> {desain.lintasDisiplinIlmu}</p>
            <p><b>E. Topik Pembelajaran:</b> {desain.topikPembelajaran}</p>

            <div>
              <p className="font-bold text-slate-900">F. Praktik Pedagogis:</p>
              <ul className="list-disc pl-5 space-y-0.5 text-slate-800">
                <li><b>Pendekatan:</b> {desain.praktikPedagogis?.pendekatan || mod.approach}</li>
                <li><b>Model Pembelajaran:</b> {desain.praktikPedagogis?.model || mod.learningModel}</li>
                <li><b>Metode Pembelajaran:</b> {desain.praktikPedagogis?.metode}</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-slate-900">G. Sarana & Prasarana:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-3 pt-1">
                <p><b>Sarana:</b> {desain.saranaPrasaranaDetails?.sarana}</p>
                <p><b>Prasarana:</b> {desain.saranaPrasaranaDetails?.prasarana}</p>
                <p><b>Media Pembelajaran:</b> {desain.saranaPrasaranaDetails?.media}</p>
                <p><b>Sumber Belajar:</b> {desain.saranaPrasaranaDetails?.sumberBelajar}</p>
              </div>
            </div>

            <p><b>H. Kemitraan Pembelajaran:</b> {desain.kemitraanPembelajaran}</p>

            <div>
              <p className="font-bold text-slate-900">I. Lingkungan Pembelajaran:</p>
              <ul className="list-disc pl-5 space-y-0.5 text-slate-800">
                <li><b>Iklim Kelas:</b> {desain.lingkunganPembelajaran?.iklimKelas}</li>
                <li><b>Budaya Belajar:</b> {desain.lingkunganPembelajaran?.budayaBelajar}</li>
                <li><b>Sosio-Emosional:</b> {desain.lingkunganPembelajaran?.sosioEmosional}</li>
              </ul>
            </div>

            <div>
              <p className="font-bold text-slate-900">J. Dimensi Profil Lulusan (DPL):</p>
              <div className="overflow-x-auto pt-1">
                <table className="w-full border-collapse border border-slate-400 text-[11px] text-center">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-900">
                      <th className="border border-slate-400 p-1">DPL 1</th>
                      <th className="border border-slate-400 p-1">DPL 2</th>
                      <th className="border border-slate-400 p-1">DPL 3</th>
                      <th className="border border-slate-400 p-1">DPL 4</th>
                      <th className="border border-slate-400 p-1">DPL 5</th>
                      <th className="border border-slate-400 p-1">DPL 6</th>
                      <th className="border border-slate-400 p-1">DPL 7</th>
                      <th className="border border-slate-400 p-1">DPL 8</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-400 p-1 font-bold text-emerald-800">✓ Keimanan</td>
                      <td className="border border-slate-400 p-1 font-bold text-emerald-800">✓ Kewargaan</td>
                      <td className="border border-slate-400 p-1 font-bold text-emerald-800">✓ Kritis</td>
                      <td className="border border-slate-400 p-1 font-bold text-emerald-800">✓ Kreativitas</td>
                      <td className="border border-slate-400 p-1 font-bold text-emerald-800">✓ Kolaborasi</td>
                      <td className="border border-slate-400 p-1 font-bold text-emerald-800">✓ Mandiri</td>
                      <td className="border border-slate-400 p-1 text-slate-400">-</td>
                      <td className="border border-slate-400 p-1 font-bold text-emerald-800">✓ Komunikasi</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="font-bold text-slate-900">K. Pertanyaan Pemantik:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-800">
                <li><b>Pertanyaan Afektif:</b> {desain.pertanyaanPemantikDetailed?.afektif}</li>
                <li><b>Pertanyaan Kognitif:</b> {desain.pertanyaanPemantikDetailed?.kognitif}</li>
                <li><b>Pertanyaan Psikomotorik:</b> {desain.pertanyaanPemantikDetailed?.psikomotorik}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* IV. KEGIATAN PEMBELAJARAN */}
        <div className="border border-slate-300 rounded p-3 space-y-3 bg-white">
          <h3 className="font-bold uppercase text-[12px] border-b border-slate-300 pb-1 text-slate-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-700" />
            IV. KEGIATAN PEMBELAJARAN
          </h3>

          <div className="space-y-3 text-[12px]">
            <div>
              <h4 className="font-bold text-slate-900">A. KEGIATAN AWAL (10 Menit)</h4>
              <p className="whitespace-pre-line pl-3 text-slate-800 pt-0.5">{mod.kegiatanAwalText || mod.activities?.pendahuluan}</p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1.5">B. KEGIATAN INTI (50 Menit) - TABEL SINTAKS MODEL {mod.learningModel.toUpperCase()}</h4>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-400 text-[12px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-900 text-center">
                      <th className="border border-slate-400 p-2 w-12">No.</th>
                      <th className="border border-slate-400 p-2 w-52">Sintaks Model Pembelajaran</th>
                      <th className="border border-slate-400 p-2">Rincian Kegiatan Guru & Murid (Mindful, Meaningful, Joyful)</th>
                      <th className="border border-slate-400 p-2 w-28">Alokasi Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mod.activitiesTable?.map((row) => (
                      <tr key={row.no} className="border border-slate-300 align-top">
                        <td className="border border-slate-400 p-2 text-center font-bold">{row.no}</td>
                        <td className="border border-slate-400 p-2 font-semibold text-slate-900 bg-slate-50">{row.tahap}</td>
                        <td className="border border-slate-400 p-2 whitespace-pre-line text-slate-800">{row.kegiatan}</td>
                        <td className="border border-slate-400 p-2 text-center font-medium whitespace-nowrap">{row.alokasiWaktu}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900">C. KEGIATAN PENUTUP (10 Menit)</h4>
              <p className="whitespace-pre-line pl-3 text-slate-800 pt-0.5">{mod.kegiatanPenutupText || mod.activities?.penutup}</p>
            </div>
          </div>
        </div>

        {/* V. ASESMEN / PENILAIAN */}
        <div className="border border-slate-300 rounded p-3 space-y-4 bg-white">
          <h3 className="font-bold uppercase text-[12px] border-b border-slate-300 pb-1 text-slate-900 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-indigo-700" />
            V. ASESMEN / PENILAIAN
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-400 text-[11px]">
              <thead>
                <tr className="bg-slate-200 text-slate-950 font-bold text-center">
                  <th className="border border-slate-400 p-2 w-32">Jenis Asesmen</th>
                  <th className="border border-slate-400 p-2">Tujuan Penilaian</th>
                  <th className="border border-slate-400 p-2 w-28">Teknik</th>
                  <th className="border border-slate-400 p-2 w-32">Bentuk Instrumen</th>
                  <th className="border border-slate-400 p-2 w-32">Waktu Penilaian</th>
                </tr>
              </thead>
              <tbody>
                <tr className="align-top border border-slate-300">
                  <td className="border border-slate-400 p-2 font-bold bg-slate-50 text-slate-900">Assesmen for Learning</td>
                  <td className="border border-slate-400 p-2">{mod.assessmentForLearningSummary?.tujuan}</td>
                  <td className="border border-slate-400 p-2 text-center">{mod.assessmentForLearningSummary?.teknik}</td>
                  <td className="border border-slate-400 p-2 text-center">{mod.assessmentForLearningSummary?.bentuk}</td>
                  <td className="border border-slate-400 p-2 text-center">{mod.assessmentForLearningSummary?.waktu}</td>
                </tr>
                <tr className="align-top border border-slate-300">
                  <td className="border border-slate-400 p-2 font-bold bg-slate-50 text-slate-900">Assesmen as Learning</td>
                  <td className="border border-slate-400 p-2">{mod.assessmentAsLearningSummary?.tujuan}</td>
                  <td className="border border-slate-400 p-2 text-center">{mod.assessmentAsLearningSummary?.teknik}</td>
                  <td className="border border-slate-400 p-2 text-center">{mod.assessmentAsLearningSummary?.bentuk}</td>
                  <td className="border border-slate-400 p-2 text-center">{mod.assessmentAsLearningSummary?.waktu}</td>
                </tr>
                <tr className="align-top border border-slate-300">
                  <td className="border border-slate-400 p-2 font-bold bg-slate-50 text-slate-900">Assesmen of Learning</td>
                  <td className="border border-slate-400 p-2">{mod.assessmentOfLearningSummary?.tujuan}</td>
                  <td className="border border-slate-400 p-2 text-center">{mod.assessmentOfLearningSummary?.teknik}</td>
                  <td className="border border-slate-400 p-2 text-center">{mod.assessmentOfLearningSummary?.bentuk}</td>
                  <td className="border border-slate-400 p-2 text-center">{mod.assessmentOfLearningSummary?.waktu}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-1">REMEDIAL & PENGAYAAN:</h4>
            <div className="space-y-1 pl-3 text-[12px] text-slate-800">
              <p><b>1. Remedial:</b> {mod.remedialPengayaanText?.remedial}</p>
              <p><b>2. Pengayaan:</b> {mod.remedialPengayaanText?.pengayaan}</p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-1">GLOSARIUM:</h4>
            <p className="whitespace-pre-line pl-3 font-mono text-[11px] text-slate-800 bg-slate-50 p-2 rounded border border-slate-300">{mod.glosarium}</p>
          </div>
        </div>

        {/* LAMPIRAN 1: BAHAN BACAAN / AJAR */}
        {mod.bahanAjarText && (
          <div className="border border-slate-300 rounded p-3 space-y-2 bg-slate-50">
            <h3 className="font-bold uppercase text-[12px] border-b border-slate-300 pb-1 text-slate-900">
              LAMPIRAN 1: BAHAN BACAAN / AJAR GURU & PESERTA DIDIK
            </h3>
            <div className="whitespace-pre-line text-[11px] text-slate-800 bg-white p-3 rounded border border-slate-300 leading-relaxed">
              {mod.bahanAjarText}
            </div>
          </div>
        )}

        {/* LAMPIRAN 2: MEDIA PEMBELAJARAN */}
        {mod.mediaPembelajaranText && (
          <div className="border border-slate-300 rounded p-3 space-y-2 bg-slate-50">
            <h3 className="font-bold uppercase text-[12px] border-b border-slate-300 pb-1 text-slate-900">
              LAMPIRAN 2: MEDIA PEMBELAJARAN & BAHAN TAYANG
            </h3>
            <div className="whitespace-pre-line text-[11px] text-slate-800 bg-white p-3 rounded border border-slate-300 leading-relaxed">
              {mod.mediaPembelajaranText}
            </div>
          </div>
        )}

        {/* LAMPIRAN 3: ASSESMEN FOR LEARNING (FORMATIF) */}
        <div className="border border-slate-300 rounded p-3 space-y-3 bg-white">
          <h3 className="font-bold uppercase text-[12px] border-b border-slate-300 pb-1 text-slate-900">
            LAMPIRAN 3: ASSESMEN FOR LEARNING (FORMATIF)
          </h3>
          <p className="font-bold text-slate-900 text-[12px]">A. TABEL RUBRIK PENILAIAN TES LISAN / FORMATIF:</p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-400 text-[11px]">
              <thead>
                <tr className="bg-emerald-100 text-emerald-950 font-bold text-center">
                  <th className="border border-slate-400 p-2 w-48">Aspek yang Dinilai</th>
                  <th className="border border-slate-400 p-2">Skor 3 / 4 (Sangat Baik)</th>
                  <th className="border border-slate-400 p-2">Skor 2 / 3 (Baik)</th>
                  <th className="border border-slate-400 p-2">Skor 1 / 2 (Cukup)</th>
                  <th className="border border-slate-400 p-2">Skor 1 (Perlu Bimbingan)</th>
                </tr>
              </thead>
              <tbody>
                {mod.rubrikFormatif?.map((rf, idx) => (
                  <tr key={idx} className="align-top border border-slate-300">
                    <td className="border border-slate-400 p-2 font-bold text-slate-900 bg-slate-50">{rf.kriteria}</td>
                    <td className="border border-slate-400 p-2">{rf.sangatBaik}</td>
                    <td className="border border-slate-400 p-2">{rf.baik}</td>
                    <td className="border border-slate-400 p-2">{rf.cukup}</td>
                    <td className="border border-slate-400 p-2">{rf.perluBimbingan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* LAMPIRAN 4: ASSESMEN AS LEARNING (PENILAIAN DIRI) */}
        <div className="border border-slate-300 rounded p-3 space-y-3 bg-white">
          <h3 className="font-bold uppercase text-[12px] border-b border-slate-300 pb-1 text-slate-900">
            LAMPIRAN 4: ASSESMEN AS LEARNING (PENILAIAN DIRI & REFLEKSI)
          </h3>
          <p className="font-bold text-slate-900 text-[12px]">A. TABEL RUBRIK PENILAIAN DIRI / REFLEKSI:</p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-400 text-[11px]">
              <thead>
                <tr className="bg-indigo-100 text-indigo-950 font-bold text-center">
                  <th className="border border-slate-400 p-2 w-48">Aspek Penilaian Diri</th>
                  <th className="border border-slate-400 p-2">Skor 3 (Baik)</th>
                  <th className="border border-slate-400 p-2">Skor 2 (Cukup)</th>
                  <th className="border border-slate-400 p-2">Skor 1 (Perlu Bimbingan)</th>
                </tr>
              </thead>
              <tbody>
                {mod.rubrikAsLearning?.map((ra, idx) => (
                  <tr key={idx} className="align-top border border-slate-300">
                    <td className="border border-slate-400 p-2 font-bold text-slate-900 bg-slate-50">{ra.kriteria}</td>
                    <td className="border border-slate-400 p-2">{ra.sangatBaik}</td>
                    <td className="border border-slate-400 p-2">{ra.baik}</td>
                    <td className="border border-slate-400 p-2">{ra.cukup}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 pt-2 bg-slate-50 p-3 rounded border border-slate-300">
            <h4 className="font-bold text-slate-900 text-[12px]">B. Lembar Refleksi Diri Murid:</h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <p><b>Nama:</b> ...................................................</p>
              <p><b>Kelas:</b> {mod.targetClass}</p>
            </div>
            <div className="space-y-2 text-[11px] pt-1">
              {mod.refleksiSiswa?.map((rs) => (
                <div key={rs.no} className="border-b border-dashed border-slate-300 pb-2">
                  <p className="font-semibold text-slate-900">{rs.no}. {rs.pertanyaan}</p>
                  <p className="text-slate-600 italic mt-0.5">Jawaban / Tanggapan: .................................................................................................................</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LAMPIRAN 5: ASSESMEN OF LEARNING (SUMATIF & KISI-KISI) */}
        <div className="border border-slate-300 rounded p-3 space-y-4 bg-white">
          <h3 className="font-bold uppercase text-[12px] border-b border-slate-300 pb-1 text-slate-900">
            LAMPIRAN 5: ASSESMEN OF LEARNING (EVALUASI SUMATIF & KISI-KISI)
          </h3>

          {/* TABEL KISI-KISI SOAL */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-900 text-[12px]">A. TABEL KISI-KISI SOAL EVALUASI SUMATIF:</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-400 text-[11px]">
                <thead>
                  <tr className="bg-slate-200 font-bold text-slate-900 text-center">
                    <th className="border border-slate-400 p-1.5 w-8">No.</th>
                    <th className="border border-slate-400 p-1.5 w-44">Tujuan Pembelajaran</th>
                    <th className="border border-slate-400 p-1.5">Indikator Soal</th>
                    <th className="border border-slate-400 p-1.5 w-24">Materi</th>
                    <th className="border border-slate-400 p-1.5 w-24">Level Kognitif</th>
                    <th className="border border-slate-400 p-1.5 w-16">No. Soal</th>
                    <th className="border border-slate-400 p-1.5 w-24">Bentuk Soal</th>
                  </tr>
                </thead>
                <tbody>
                  {mod.kisiKisiSumatif?.map((kk) => (
                    <tr key={kk.no} className="border border-slate-300 align-top">
                      <td className="border border-slate-400 p-1.5 text-center font-bold">{kk.no}</td>
                      <td className="border border-slate-400 p-1.5">{kk.tujuanPembelajaran || "Murid dapat menjelaskan proses perumusan Pancasila."}</td>
                      <td className="border border-slate-400 p-1.5">{kk.indikator}</td>
                      <td className="border border-slate-400 p-1.5 text-center bg-slate-50">{kk.materi || "Pancasila"}</td>
                      <td className="border border-slate-400 p-1.5 text-center font-medium">{kk.levelKognitif || "C2 (Memahami)"}</td>
                      <td className="border border-slate-400 p-1.5 text-center font-bold">{kk.nomorSoal}</td>
                      <td className="border border-slate-400 p-1.5 text-center font-medium">{kk.bentukSoal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pedoman Penskoran / Perhitungan Skor Akhir */}
            <div className="mt-3 p-3 bg-slate-50 border border-slate-300 rounded text-[11px] space-y-1 leading-relaxed text-slate-800">
              <p className="font-bold text-slate-900 uppercase">PEDOMAN PENSKORAN & RUMUS PERHITUNGAN SKOR AKHIR:</p>
              <ul className="list-disc pl-5 space-y-0.5 text-slate-700">
                <li><b>Pilihan Ganda (Soal 1–10):</b> 10 Soal x 4 Poin = Maksimal 40 Poin</li>
                <li><b>Uraian (Soal 1–5):</b> 5 Soal x 12 Poin = Maksimal 60 Poin</li>
                <li><b>Total Skor Maksimal:</b> 100 Poin</li>
              </ul>
              <div className="pt-1 text-emerald-900 font-bold border-t border-slate-200">
                RUMUS SKOR AKHIR = (Total Skor Perolehan Peserta Didik / Total Skor Maksimal 100) x 100
              </div>
            </div>
          </div>

          {/* Cetak Naskah Soal Sumatif */}
          <div className="space-y-3 pt-2 bg-white p-4 border border-slate-400 rounded">
            <div className="border-b-2 border-slate-900 pb-2 text-center">
              <h4 className="font-bold text-sm uppercase">NASKAH SOAL EVALUASI SUMATIF</h4>
              <p className="text-[12px]">{mod.subject} • {mod.targetClass} • T.A. 2026/2027</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[12px] border-b border-slate-200 pb-2">
              <p><b>Nama Murid:</b> ...................................................</p>
              <p><b>Hari / Tanggal:</b> ...................................................</p>
              <p><b>Nomor Absen:</b> ...................................................</p>
              <p><b>Nilai & Paraf Guru:</b> [ _____ ]</p>
            </div>

            <div className="space-y-3 text-[12px] pt-1">
              <p className="font-semibold text-slate-800">Petunjuk: Jawablah pertanyaan-pertanyaan di bawah ini dengan tepat dan teliti!</p>

              {mod.soalSumatifList?.map((s) => (
                <div key={s.no} className="space-y-1 pl-1">
                  <p className="font-semibold text-slate-900">
                    {s.no}. {s.pertanyaan}
                  </p>
                  {s.pilihan && s.pilihan.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-4 text-slate-800">
                      {s.pilihan.map((pil, pIdx) => (
                        <div key={pIdx}>{pil}</div>
                      ))}
                    </div>
                  )}
                  {!s.pilihan && (
                    <div className="pl-4 pt-2">
                      <div className="border-b border-dashed border-slate-400 h-6 w-full mb-1"></div>
                      <div className="border-b border-dashed border-slate-400 h-6 w-full"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Kunci Jawaban & Pedoman */}
            <div className="mt-4 p-2.5 bg-slate-100 rounded border border-slate-300 text-[11px] space-y-1">
              <h5 className="font-bold text-slate-900 uppercase">Kunci Jawaban Evaluasi:</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {mod.soalSumatifList?.map((s) => (
                  <div key={s.no}>
                    <b>Soal No. {s.no}:</b> {s.kunciJawaban}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* LAMPIRAN 6: DAFTAR NILAI FORMATIF & SUMATIF (26 PESERTA DIDIK) */}
        <div className="border border-slate-300 rounded p-3 space-y-3 bg-white">
          <h3 className="font-bold uppercase text-[12px] border-b border-slate-300 pb-1 text-slate-900">
            LAMPIRAN 6: REKAPITULASI DAFTAR NILAI FORMATIF & SUMATIF ({studentGrades.length} PESERTA DIDIK)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-400 text-[11px]">
              <thead>
                <tr className="bg-slate-200 text-slate-950 font-bold text-center">
                  <th className="border border-slate-400 p-1.5 w-10">No.</th>
                  <th className="border border-slate-400 p-1.5 w-24">NISN</th>
                  <th className="border border-slate-400 p-1.5">Nama Peserta Didik</th>
                  <th className="border border-slate-400 p-1.5 w-12">F1</th>
                  <th className="border border-slate-400 p-1.5 w-12">F2</th>
                  <th className="border border-slate-400 p-1.5 w-12">F3</th>
                  <th className="border border-slate-400 p-1.5 w-16 bg-slate-300">Rata F</th>
                  <th className="border border-slate-400 p-1.5 w-16">Sumatif</th>
                  <th className="border border-slate-400 p-1.5 w-16 bg-emerald-200 text-emerald-950">N. Akhir</th>
                  <th className="border border-slate-400 p-1.5 w-24">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {studentGrades.map((sg) => (
                  <tr key={sg.no} className="border border-slate-300 hover:bg-slate-50">
                    <td className="border border-slate-400 p-1.5 text-center font-bold">{sg.no}</td>
                    <td className="border border-slate-400 p-1.5 text-center font-mono text-[10px]">{sg.nisn}</td>
                    <td className="border border-slate-400 p-1.5 font-semibold text-slate-900">{sg.nama}</td>
                    <td className="border border-slate-400 p-1.5 text-center">{sg.f1}</td>
                    <td className="border border-slate-400 p-1.5 text-center">{sg.f2}</td>
                    <td className="border border-slate-400 p-1.5 text-center">{sg.f3}</td>
                    <td className="border border-slate-400 p-1.5 text-center font-bold bg-slate-100">{sg.rataF}</td>
                    <td className="border border-slate-400 p-1.5 text-center font-bold">{sg.s1}</td>
                    <td className="border border-slate-400 p-1.5 text-center font-bold bg-emerald-50 text-emerald-900">{sg.na}</td>
                    <td className="border border-slate-400 p-1.5 text-center text-[10px] font-semibold text-emerald-700">
                      {sg.status || "Tuntas"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SIGNATURE BLOCK */}
        {!isForPrintModal && (
          <div className="pt-8 grid grid-cols-2 text-[12px] text-slate-900 leading-normal font-sans">
            <div className="text-center space-y-12">
              <div>
                <p>Mengetahui,</p>
                <p className="font-bold">Kepala {schoolIdentity?.schoolName || "Sekolah SD"}</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">{schoolIdentity?.headmasterName || "..................................."}</p>
                <p>NIP. {schoolIdentity?.headmasterNip || "..................................."}</p>
              </div>
            </div>

            <div className="text-center space-y-12">
              <div>
                <p>{(schoolIdentity as any)?.city || schoolIdentity?.regency || "Kota"}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                <p className="font-bold">Guru Pengampu Kelas / Mapel</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">{schoolIdentity?.teacherName || "..................................."}</p>
                <p>NIP. {schoolIdentity?.teacherNip || schoolIdentity?.nip || "..................................."}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handlePrint = () => {
    if (!activeModule) return;
    onOpenPrint(
      `MODUL AJAR KURIKULUM MERDEKA (${(activeModule.moduleType || "INTRAKURIKULER").toUpperCase()})`,
      `${activeModule.subject} - ${activeModule.targetClass} | Model: ${activeModule.learningModel}`,
      renderDocumentContent(activeModule, true)
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-600" />
            Generator Modul Ajar Lengkap (Tabel Kegiatan, Asesmen & Rubrik)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Penyusunan Modul Ajar Intrakurikuler & Kokurikuler berbasis Tabel Kegiatan, Rubrik Formatif/Sumatif, Kisi-Kisi, Naskah Soal, Refleksi, Daftar Nilai & Tanda Tangan
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            Buat Modul Baru dengan AI
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: List of Saved Modules */}
        <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-2 flex items-center justify-between">
            <span>Daftar Modul ({teachingModules.length})</span>
          </h3>

          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {teachingModules.map((m) => {
              const normalizedItem = ensureModuleStructure(m);
              const isSelected = activeModule?.id === normalizedItem.id;
              return (
                <div
                  key={normalizedItem.id}
                  onClick={() => setSelectedModule(normalizedItem)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
                    isSelected
                      ? "bg-emerald-50/80 border-emerald-500 shadow-xs"
                      : "bg-slate-50/60 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                      {normalizedItem.moduleType}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteModule(normalizedItem.id);
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Hapus Modul"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="font-bold text-xs text-slate-900 leading-tight">{normalizedItem.title}</h4>

                  <div className="text-[10px] text-slate-500 space-y-0.5">
                    <p><b>{normalizedItem.subject}</b> • {normalizedItem.targetClass}</p>
                    <p className="text-emerald-800 font-semibold">{normalizedItem.learningModel}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Full Document Preview */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          {activeModule ? (
            <>
              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 inline-block mb-1">
                    {activeModule.moduleType}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{activeModule.title}</h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleExportJSON}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Ekspor JSON
                  </button>
                  <button
                    onClick={() => {
                      if (activeModule) {
                        const q = encodeURIComponent(`LKPD Presentasi ${activeModule.subject} ${activeModule.title}`);
                        window.open(`https://www.canva.com/search?q=${q}`, "_blank");
                      }
                    }}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                    title="Buat Presentasi Media & LKPD di Canva AI"
                  >
                    <Palette className="w-4 h-4 text-teal-200" />
                    <span>Buat LKPD / Media di Canva</span>
                  </button>
                  <button
                    onClick={() => {
                      if (activeModule) {
                        exportTeachingModuleToDocx(activeModule, schoolIdentity);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                    title="Ekspor Modul Ajar ke Format Native Word (.docx)"
                  >
                    <FileText className="w-4 h-4 text-blue-100" />
                    Ekspor Word (.docx)
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak / PDF
                  </button>
                </div>
              </div>

              {/* Document Preview Area */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-inner max-h-[800px] overflow-y-auto">
                {renderDocumentContent(activeModule)}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Pilih modul dari daftar di sebelah kiri atau klik <b>Buat Modul Baru dengan AI</b>.
            </div>
          )}
        </div>
      </div>

      {/* AI Modul Ajar Generator Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-2 text-indigo-700 font-bold text-base">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3>AI Generator Modul Ajar Kurikulum Merdeka</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Jenis Modul Ajar</label>
                <select
                  value={moduleType}
                  onChange={(e) => handleModuleTypeChange(e.target.value as any)}
                  className="w-full p-2 border rounded-lg bg-white font-bold text-emerald-900"
                >
                  <option value="Intrakurikuler">Modul Ajar Intrakurikuler (Mata Pelajaran Regular)</option>
                  <option value="Kokurikuler">Modul Ajar Kokurikuler (P5 / Proyek STEM)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Mata Pelajaran / Tema</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full p-2 border rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Kelas & Fase</label>
                  <input
                    type="text"
                    value={targetClass}
                    onChange={(e) => setTargetClass(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Topik / Materi Pokok</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Teks Cerita Rakyat & Amanat Moral"
                  value={materi}
                  onChange={(e) => setMateri(e.target.value)}
                  className="w-full p-2 border rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Pendekatan Pembelajaran</label>
                <select
                  value={approach}
                  onChange={(e) => setApproach(e.target.value as any)}
                  className="w-full p-2 border rounded-lg bg-white font-semibold text-indigo-900"
                >
                  <option value="Deep Learning">Deep Learning (Mindful, Meaningful, Joyful)</option>
                  <option value="STEM">STEM (Science, Tech, Engineering, Math)</option>
                  <option value="Kombinasi Deep Learning & STEM">Kombinasi Deep Learning & STEM</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Pilih Model Pembelajaran</label>
                <select
                  value={learningModel}
                  onChange={(e) => setLearningModel(e.target.value as any)}
                  className="w-full p-2 border rounded-lg bg-white font-semibold text-slate-800"
                >
                  <option value="PjBL (Project Based Learning)">PjBL (Project Based Learning)</option>
                  <option value="PBL (Problem Based Learning)">PBL (Problem Based Learning)</option>
                  <option value="Discovery Learning">Discovery Learning</option>
                  <option value="Inquiry Learning">Inquiry Learning</option>
                  <option value="Cooperative Learning">Cooperative Learning</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Alokasi Waktu</label>
                <input
                  type="text"
                  value={allocationJP}
                  onChange={(e) => setAllocationJP(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleGenerateModuleAI}
                  disabled={isGenerating}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-md"
                >
                  {isGenerating ? "Menganalisis & Menyusun Modul..." : "Proses Generate AI Modul"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
