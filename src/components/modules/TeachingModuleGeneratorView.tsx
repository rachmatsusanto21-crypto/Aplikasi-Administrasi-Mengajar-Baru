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

function getDefaultActivitiesTable(act?: { pendahuluan?: string; inti?: string; penutup?: string }, modelName = "Problem Based Learning (PBL)"): ActivityTableRow[] {
  return [
    {
      no: 1,
      tahap: "Orientasi terhadap Masalah (PBL - Mindful)",
      kegiatan: "1. Guru menampilkan gambar / video proses perumusan dasar negara atau peristiwa kontekstual.\n2. Guru mengajukan pertanyaan pemantik mendasar: 'Mengapa para pendiri bangsa harus mengadakan sidang untuk menentukan dasar negara?'\n3. Murid mengamati, berdiskusi awal, dan menyampaikan pendapat awal secara percaya diri.",
      alokasiWaktu: "10 Menit",
    },
    {
      no: 2,
      tahap: "Mengorganisasi Murid untuk Belajar (PBL - Meaningful)",
      kegiatan: "1. Guru menjelaskan materi utama menggunakan PowerPoint interaktif / bahan ajar bergambar.\n2. Guru membagi murid menjadi beberapa kelompok heterogen (4-5 orang).\n3. Guru membagikan LKPD dan menjelaskan petunjuk pengerjaan penugasan kelompok.",
      alokasiWaktu: "10 Menit",
    },
    {
      no: 3,
      tahap: "Membimbing Penyelidikan Kelompok (PBL - Meaningful & Deep Learning)",
      kegiatan: "1. Murid membaca bahan ajar dan mengamati timeline kronologi sejarah.\n2. Murid mengidentifikasi tokoh, mengurutkan peristiwa penting pada LKPD, serta mendiskusikan perubahan usulan rumusan dasar negara.\n3. Guru berkeliling membimbing kelompok yang mengalami kesulitan dan memberikan umpan balik langsung.",
      alokasiWaktu: "15 Menit",
    },
    {
      no: 4,
      tahap: "Mengembangkan & Menyajikan Hasil Karya (PBL - Joyful)",
      kegiatan: "1. Ice breaking sejenak 'Yel-Yel Semangat'.\n2. Setiap kelompok mempresentasikan hasil diskusi LKPD dan urutan timeline di depan kelas.\n3. Kelompok lain memberikan tanggapan, apresiasi, dan pertanyaan secara santun.",
      alokasiWaktu: "10 Menit",
    },
    {
      no: 5,
      tahap: "Menganalisis & Mengevaluasi Proses Pemecahan Masalah (PBL)",
      kegiatan: "1. Guru bersama murid menyimpulkan inti materi dan makna nilai-nilai yang dipelajari.\n2. Murid mengerjakan kuis evaluasi/asesmen sumatif secara mandiri.\n3. Guru memberikan penguatan positif terhadap hasil belajar murid.",
      alokasiWaktu: "10 Menit",
    },
  ];
}

function getDefaultRubrikFormatif(topic = "Sejarah Lahirnya Pancasila"): RubrikFormatifItem[] {
  return [
    {
      kriteria: "Menjelaskan Proses Perumusan hingga Pengesahan Pancasila",
      sangatBaik: "Menjelaskan seluruh tahapan perumusan hingga pengesahan secara benar, runtut, dan lengkap.",
      baik: "Menjelaskan sebagian besar tahapan dengan benar, tetapi terdapat sedikit informasi kurang lengkap.",
      cukup: "Penjelasan masih kurang runtut dan memerlukan sedikit arahan guru.",
      perluBimbingan: "Belum mampu menjelaskan proses perumusan meskipun telah dibimbing.",
    },
    {
      kriteria: "Mengurutkan Peristiwa Sejarah berdasarkan Kronologi",
      sangatBaik: "Mengurutkan seluruh peristiwa secara tepat sesuai urutan waktu tanpa kesalahan.",
      baik: "Mengurutkan sebagian besar peristiwa dengan benar, hanya terdapat 1-2 kesalahan urutan.",
      cukup: "Terdapat beberapa kesalahan kronologi dan memerlukan bantuan teman/guru.",
      perluBimbingan: "Belum mampu mengurutkan peristiwa sesuai kronologi.",
    },
    {
      kriteria: "Menganalisis Peran Tokoh dan Perubahan Rumusan Sila Pertama",
      sangatBaik: "Menjelaskan peran tokoh dan menganalisis makna perubahan sila pertama dengan tepat disertai alasan logis.",
      baik: "Menjelaskan peran tokoh dan perubahan sila pertama dengan benar, alasan kurang lengkap.",
      cukup: "Menjelaskan sebagian peran tokoh tetapi analisis perubahan sila pertama masih sederhana.",
      perluBimbingan: "Belum mampu menganalisis peran tokoh maupun perubahan rumusan sila pertama.",
    },
    {
      kriteria: "Kemampuan Menyampaikan Jawaban / Presentasi Lisan",
      sangatBaik: "Menyampaikan jawaban dengan lancar, percaya diri, suara jelas, bahasa santun, dan mampu menanggapi pertanyaan.",
      baik: "Menyampaikan jawaban dengan cukup lancar, namun masih sedikit ragu-ragu.",
      cukup: "Menyampaikan jawaban singkat dan memerlukan dorongan dari guru.",
      perluBimbingan: "Belum mampu menyampaikan hasil diskusi di depan kelas.",
    },
  ];
}

function getDefaultRubrikSumatif(topic = "Materi Pembelajaran"): RubrikSumatifItem[] {
  return [
    {
      kriteria: "Sikap (Ketelitian, Kerja Sama & Tanggung Jawab)",
      indikator: "Sangat aktif bekerja sama, teliti, bertanggung jawab, dan menyelesaikan tugas kelompok tepat waktu.",
      skorMaks: 25,
      pedoman: "Aktif & Tanggung jawab tanpa diingatkan = 25; Perlu sedikit arahan = 20; Kurang aktif = 15; Pasif = 10.",
    },
    {
      kriteria: "Pengetahuan (Penguasaan Konsep PG & Isian)",
      indikator: `Mengidentifikasi tokoh, tanggal penting, lembaga perumus, dan konsep ${topic} pada soal tes tertulis.`,
      skorMaks: 50,
      pedoman: "Setiap soal Pilihan Ganda benar = 4 poin (5 Soal = 20 Poin); Isian Singkat benar = 10 poin (3 Soal = 30 Poin).",
    },
    {
      kriteria: "Keterampilan (Penyusunan Timeline & Analisis Uraian HOTS)",
      indikator: "Menyusun kronologi peristiwa secara runtut pada LKPD dan memberikan analisis pemecahan masalah yang logis.",
      skorMaks: 25,
      pedoman: "Analisis sangat tepat & logis = 25; Cukup tepat = 18; Kurang tepat = 10; Tidak menjawab = 0.",
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

function getDefaultKisiKisi(subject = "Pendidikan Pancasila", topic = "Sejarah Lahirnya Pancasila"): KisiKisiItem[] {
  return [
    { no: 1, tujuanPembelajaran: "Murid dapat menjelaskan proses perumusan hingga pengesahan Pancasila sebagai dasar negara Indonesia.", indikator: "Menjelaskan tujuan dibentuknya BPUPKI oleh pemerintah Jepang.", materi: "BPUPKI", levelKognitif: "C2 (Memahami)", nomorSoal: "1", bentukSoal: "Pilihan Ganda", kunciJawaban: "B. Merumuskan dasar negara Indonesia", skorPerSoal: 4, tingkat: "Mudah" },
    { no: 2, tujuanPembelajaran: "Murid dapat menjelaskan proses perumusan hingga pengesahan Pancasila sebagai dasar negara Indonesia.", indikator: "Menentukan tokoh pendiri bangsa yang pertama kali memperkenalkan istilah 'Pancasila' pada 1 Juni 1945.", materi: "Tokoh Perumus Pancasila", levelKognitif: "C2 (Memahami)", nomorSoal: "2", bentukSoal: "Pilihan Ganda", kunciJawaban: "C. Ir. Soekarno", skorPerSoal: 4, tingkat: "Mudah" },
    { no: 3, tujuanPembelajaran: "Murid dapat menjelaskan proses perumusan hingga pengesahan Pancasila sebagai dasar negara Indonesia.", indikator: "Menentukan nama panitia kecil yang menyusun naskah Piagam Jakarta pada 22 Juni 1945.", materi: "Panitia Sembilan", levelKognitif: "C2 (Memahami)", nomorSoal: "3", bentukSoal: "Pilihan Ganda", kunciJawaban: "B. Panitia Sembilan", skorPerSoal: 4, tingkat: "Sedang" },
    { no: 4, tujuanPembelajaran: "Murid dapat menjelaskan proses perumusan hingga pengesahan Pancasila sebagai dasar negara Indonesia.", indikator: "Menentukan lembaga negara yang mengesahkan Pancasila dan UUD 1945 pada 18 Agustus 1945.", materi: "Sidang PPKI", levelKognitif: "C2 (Memahami)", nomorSoal: "4", bentukSoal: "Pilihan Ganda", kunciJawaban: "C. PPKI", skorPerSoal: 4, tingkat: "Sedang" },
    { no: 5, tujuanPembelajaran: "Murid dapat menjelaskan proses perumusan hingga pengesahan Pancasila sebagai dasar negara Indonesia.", indikator: "Menentukan tanggal resmi pengesahan Pancasila sebagai dasar negara Republik Indonesia.", materi: "Pengesahan Pancasila", levelKognitif: "C2 (Memahami)", nomorSoal: "5", bentukSoal: "Pilihan Ganda", kunciJawaban: "D. 18 Agustus 1945", skorPerSoal: 4, tingkat: "Mudah" },
    { no: 6, tujuanPembelajaran: "Murid dapat mengurutkan peristiwa penting dalam sejarah lahirnya Pancasila berdasarkan kronologi.", indikator: "Mengurutkan kronologi peristiwa proses lahirnya Pancasila secara tepat (BPUPKI -> Panitia Sembilan -> PPKI).", materi: "Kronologi Sejarah", levelKognitif: "C3 (Menerapkan)", nomorSoal: "6", bentukSoal: "Pilihan Ganda", kunciJawaban: "A. Sidang BPUPKI -> Panitia Sembilan -> Sidang PPKI", skorPerSoal: 4, tingkat: "Sedang" },
    { no: 7, tujuanPembelajaran: "Murid dapat menganalisis peran tokoh-tokoh serta makna perubahan rumusan sila pertama.", indikator: "Menganalisis alasan perubahan rumusan sila pertama dalam Piagam Jakarta demi persatuan bangsa.", materi: "Piagam Jakarta", levelKognitif: "C4 (Menganalisis)", nomorSoal: "7", bentukSoal: "Pilihan Ganda", kunciJawaban: "B. Menghargai keberagaman dan menjaga persatuan bangsa", skorPerSoal: 4, tingkat: "Sukar" },
    { no: 8, tujuanPembelajaran: "Murid dapat menganalisis peran tokoh-tokoh serta makna perubahan rumusan sila pertama.", indikator: "Menentukan tokoh pendiri bangsa yang menyampaikan 5 usulan dasar negara dalam sidang BPUPKI.", materi: "Tokoh Perumus Pancasila", levelKognitif: "C4 (Menganalisis)", nomorSoal: "8", bentukSoal: "Pilihan Ganda", kunciJawaban: "D. Mohammad Yamin, Prof. Soepomo, Ir. Soekarno", skorPerSoal: 4, tingkat: "Sedang" },
    { no: 9, tujuanPembelajaran: "Murid dapat menganalisis peran tokoh-tokoh serta makna perubahan rumusan sila pertama.", indikator: "Menganalisis sikap keteladanan para pendiri bangsa yang mengutamakan musyawarah dan kepentingan bersama.", materi: "Nilai Perjuangan Tokoh", levelKognitif: "C4 (Menganalisis)", nomorSoal: "9", bentukSoal: "Pilihan Ganda", kunciJawaban: "B. Bermusyawarah untuk mencapai mufakat", skorPerSoal: 4, tingkat: "Sedang" },
    { no: 10, tujuanPembelajaran: "Murid dapat menganalisis peran tokoh-tokoh serta makna perubahan rumusan sila pertama.", indikator: "Menentukan contoh penerapan nilai-nilai perjuangan perumus Pancasila dalam kehidupan sekolah sehari-hari.", materi: "Penerapan Nilai Pancasila", levelKognitif: "C4 (Menganalisis)", nomorSoal: "10", bentukSoal: "Pilihan Ganda", kunciJawaban: "A. Bekerja sama dan menghargai pendapat teman", skorPerSoal: 4, tingkat: "Sedang" },
    { no: 11, tujuanPembelajaran: "Murid dapat menjelaskan proses perumusan hingga pengesahan Pancasila sebagai dasar negara Indonesia.", indikator: "Jelaskan secara singkat proses perumusan hingga pengesahan Pancasila sebagai dasar negara Indonesia!", materi: "Proses Lahirnya Pancasila", levelKognitif: "C2 (Memahami)", nomorSoal: "1 (Uraian)", bentukSoal: "Uraian", kunciJawaban: "Pancasila dirumuskan melalui sidang BPUPKI (29 Mei - 1 Juni 1945), dilanjutkan pembahasan Panitia Sembilan menghasilkan Piagam Jakarta (22 Juni 1945), dan disahkan oleh PPKI pada 18 Agustus 1945.", skorPerSoal: 12, tingkat: "Sedang" },
    { no: 12, tujuanPembelajaran: "Murid dapat mengurutkan peristiwa penting dalam sejarah lahirnya Pancasila berdasarkan kronologi.", indikator: "Urutkan peristiwa sejarah lahirnya Pancasila berikut berdasarkan kronologi yang benar!", materi: "Kronologi Sejarah", levelKognitif: "C3 (Menerapkan)", nomorSoal: "2 (Uraian)", bentukSoal: "Uraian", kunciJawaban: "1. Sidang BPUPKI I (29 Mei - 1 Juni 1945)\n2. Pembentukan Panitia Sembilan & Piagam Jakarta (22 Juni 1945)\n3. Proklamasi Kemerdekaan (17 Agustus 1945)\n4. Sidang PPKI & Pengesahan Pancasila (18 Agustus 1945)", skorPerSoal: 12, tingkat: "Sedang" },
    { no: 13, tujuanPembelajaran: "Murid dapat menganalisis peran tokoh-tokoh serta makna perubahan rumusan sila pertama.", indikator: "Mengapa rumusan sila pertama dalam Piagam Jakarta mengalami perubahan sebelum disahkan? Jelaskan alasannya!", materi: "Piagam Jakarta", levelKognitif: "C4 (Menganalisis)", nomorSoal: "3 (Uraian)", bentukSoal: "Uraian", kunciJawaban: "Perubahan dilakukan atas usul tokoh-tokoh Indonesia timur demi menjaga persatuan, kesatuan, dan toleransi antarumat beragama di Indonesia yang beragam.", skorPerSoal: 12, tingkat: "Sukar" },
    { no: 14, tujuanPembelajaran: "Murid dapat menganalisis peran tokoh-tokoh serta makna perubahan rumusan sila pertama.", indikator: "Jelaskan peran Ir. Soekarno, Mohammad Yamin, dan Prof. Dr. Soepomo dalam perumusan Pancasila!", materi: "Tokoh Perumus Pancasila", levelKognitif: "C4 (Menganalisis)", nomorSoal: "4 (Uraian)", bentukSoal: "Uraian", kunciJawaban: "Ketiga tokoh menyampaikan gagasan rumusan dasar negara pada sidang BPUPKI. Ir. Soekarno juga memberikan nama 'Pancasila' pada tanggal 1 Juni 1945.", skorPerSoal: 12, tingkat: "Sukar" },
    { no: 15, tujuanPembelajaran: "Murid dapat menganalisis peran tokoh-tokoh serta makna perubahan rumusan sila pertama.", indikator: "Sebutkan dua contoh penerapan nilai perjuangan para pendiri bangsa yang dapat kamu lakukan di sekolah!", materi: "Nilai-Nilai Pancasila", levelKognitif: "C4 (Menganalisis)", nomorSoal: "5 (Uraian)", bentukSoal: "Uraian", kunciJawaban: "1. Bermusyawarah dalam menentukan ketua kelas atau pembagian tugas kelompok.\n2. Saling menghargai perbedaan pendapat dan membantu teman yang mengalami kesulitan.", skorPerSoal: 12, tingkat: "Sedang" },
  ];
}

function getDefaultSoalSumatif(topic = "Sejarah Lahirnya Pancasila"): SoalItem[] {
  return [
    {
      no: 1,
      pertanyaan: `Tujuan utama dibentuknya BPUPKI oleh pemerintah Jepang pada tanggal 29 April 1945 adalah...`,
      pilihan: [
        "A. Memilih Presiden dan Wakil Presiden pertama",
        "B. Mempersiapkan dan merumuskan dasar negara Indonesia",
        "C. Menyusun teks Proklamasi Kemerdekaan",
        "D. Membentuk angkatan perang Indonesia"
      ],
      kunciJawaban: "B. Mempersiapkan dan merumuskan dasar negara Indonesia",
    },
    {
      no: 2,
      pertanyaan: `Tokoh pendiri bangsa yang pertama kali mengusulkan istilah 'Pancasila' sebagai nama dasar negara pada tanggal 1 Juni 1945 adalah...`,
      pilihan: [
        "A. Mohammad Yamin",
        "B. Prof. Dr. Soepomo",
        "C. Ir. Soekarno",
        "D. Drs. Mohammad Hatta"
      ],
      kunciJawaban: "C. Ir. Soekarno",
    },
    {
      no: 3,
      pertanyaan: `Panitia kecil yang beranggotakan sembilan orang tokoh pendiri bangsa dan berhasil menyusun naskah Piagam Jakarta pada 22 Juni 1945 disebut...`,
      pilihan: [
        "A. Panitia Lapan",
        "B. Panitia Sembilan",
        "C. Panitia Persiapan Kemerdekaan",
        "D. Badan Penyelidik"
      ],
      kunciJawaban: "B. Panitia Sembilan",
    },
    {
      no: 4,
      pertanyaan: `Lembaga yang bertugas mengesahkan UUD 1945 dan Pancasila sebagai dasar negara Indonesia pada tanggal 18 Agustus 1945 adalah...`,
      pilihan: [
        "A. BPUPKI",
        "B. KNIP",
        "C. PPKI",
        "D. DPR"
      ],
      kunciJawaban: "C. PPKI",
    },
    {
      no: 5,
      pertanyaan: `Pancasila secara resmi disahkan sebagai dasar negara Republik Indonesia pada tanggal...`,
      pilihan: [
        "A. 1 Juni 1945",
        "B. 22 Juni 1945",
        "C. 17 Agustus 1945",
        "D. 18 Agustus 1945"
      ],
      kunciJawaban: "D. 18 Agustus 1945",
    },
    {
      no: 6,
      pertanyaan: `Urutan kronologi peristiwa sejarah lahirnya Pancasila yang benar adalah...`,
      pilihan: [
        "A. Sidang BPUPKI -> Pembentukan Panitia Sembilan -> Sidang PPKI",
        "B. Sidang PPKI -> Sidang BPUPKI -> Panitia Sembilan",
        "C. Panitia Sembilan -> Sidang PPKI -> Sidang BPUPKI",
        "D. Proklamasi -> Sidang BPUPKI -> Panitia Sembilan"
      ],
      kunciJawaban: "A. Sidang BPUPKI -> Pembentukan Panitia Sembilan -> Sidang PPKI",
    },
    {
      no: 7,
      pertanyaan: `Perubahan rumusan sila pertama pada Piagam Jakarta dilakukan sebelum disahkan oleh PPKI bertujuan untuk...`,
      pilihan: [
        "A. Mempercepat proses kemerdekaan",
        "B. Menghargai keberagaman dan menjaga persatuan bangsa Indonesia",
        "C. Mengikuti keinginan penjajah",
        "D. Mengubah seluruh isi Piagam Jakarta"
      ],
      kunciJawaban: "B. Menghargai keberagaman dan menjaga persatuan bangsa Indonesia",
    },
    {
      no: 8,
      pertanyaan: `Tiga tokoh utama yang menyampaikan gagasan rumusan dasar negara pada sidang BPUPKI adalah...`,
      pilihan: [
        "A. Ir. Soekarno, Mohammad Hatta, Sutan Sjahrir",
        "B. Mohammad Yamin, Ahmad Soebardjo, Ki Hajar Dewantara",
        "C. Sayuti Melik, B.M. Diah, Latief Hendraningrat",
        "D. Mohammad Yamin, Prof. Dr. Soepomo, Ir. Soekarno"
      ],
      kunciJawaban: "D. Mohammad Yamin, Prof. Dr. Soepomo, Ir. Soekarno",
    },
    {
      no: 9,
      pertanyaan: `Sikap utama para pendiri bangsa yang patut kita teladani dari peristiwa perubahan rumusan sila pertama adalah...`,
      pilihan: [
        "A. Memaksakan kehendak pribadi",
        "B. Bermusyawarah dan jiwa besar mengutamakan persatuan bangsa",
        "C. Mementingkan kelompok sendiri",
        "D. Menolak perbedaan pendapat"
      ],
      kunciJawaban: "B. Bermusyawarah dan jiwa besar mengutamakan persatuan bangsa",
    },
    {
      no: 10,
      pertanyaan: `Contoh penerapan nilai-nilai perjuangan para perumus Pancasila dalam kehidupan sekolah sehari-hari adalah...`,
      pilihan: [
        "A. Bermusyawarah dalam pembagian tugas kelompok dan menghargai teman",
        "B. Bersaing secara tidak sehat antar teman kelas",
        "C. Mementingkan kelompok sendiri saat piket kelas",
        "D. Memilih-milih teman bermain berdasarkan latar belakang"
      ],
      kunciJawaban: "A. Bermusyawarah dalam pembagian tugas kelompok dan menghargai teman",
    },
    {
      no: 11,
      pertanyaan: `[Soal Uraian 1] Jelaskan secara singkat proses perumusan hingga pengesahan Pancasila sebagai dasar negara Indonesia!`,
      kunciJawaban: "Pancasila dirumuskan melalui sidang BPUPKI I (29 Mei - 1 Juni 1945), disempurnakan oleh Panitia Sembilan dalam naskah Piagam Jakarta (22 Juni 1945), dan secara resmi disahkan oleh PPKI pada tanggal 18 Agustus 1945 setelah penyesuaian sila pertama.",
    },
    {
      no: 12,
      pertanyaan: `[Soal Uraian 2] Urutkan peristiwa penting berikut sesuai kronologi sejarah yang benar:\n• Piagam Jakarta\n• Sidang BPUPKI I\n• Sidang PPKI\n• Proklamasi Kemerdekaan Indonesia`,
      kunciJawaban: "1. Sidang BPUPKI I (29 Mei - 1 Juni 1945)\n2. Piagam Jakarta (22 Juni 1945)\n3. Proklamasi Kemerdekaan Indonesia (17 Agustus 1945)\n4. Sidang PPKI (18 Agustus 1945)",
    },
    {
      no: 13,
      pertanyaan: `[Soal Uraian 3] Mengapa rumusan sila pertama dalam Piagam Jakarta mengalami perubahan sebelum Pancasila disahkan oleh PPKI? Jelaskan dampaknya bagi persatuan Indonesia!`,
      kunciJawaban: "Rumusan sila pertama diubah menjadi 'Ketuhanan Yang Maha Esa' atas usul tokoh-tokoh Indonesia timur demi menjaga persatuan bangsa dan menghargai keberagaman agama seluruh rakyat Indonesia.",
    },
    {
      no: 14,
      pertanyaan: `[Soal Uraian 4] Jelaskan peran Ir. Soekarno, Mohammad Yamin, dan Prof. Dr. Soepomo dalam proses perumusan dasar negara!`,
      kunciJawaban: "Mohammad Yamin, Prof. Dr. Soepomo, dan Ir. Soekarno menyampaikan gagasan dasar negara pada sidang BPUPKI. Ir. Soekarno juga mengenalkan istilah 'Pancasila' pada tanggal 1 Juni 1945.",
    },
    {
      no: 15,
      pertanyaan: `[Soal Uraian 5] Sebutkan dua contoh penerapan nilai-nilai perjuangan para pendiri bangsa yang dapat kamu lakukan di lingkungan sekolah!`,
      kunciJawaban: "1. Saling menghargai pendapat teman saat berdiskusi menentukan kegiatan kelas.\n2. Bekerja sama dengan rukun saat tugas kelompok tanpa membeda-bedakan latar belakang teman.",
    },
  ];
}

function getDefaultRefleksiGuru(): RefleksiItem[] {
  return [
    { no: 1, pertanyaan: "Apakah seluruh peserta didik telah memahami proses sejarah lahirnya Pancasila dan tokoh-tokohnya?", catatan: "Sebagian besar murid (sekitar 88%) memahami proses perumusan dan tokoh perumus dengan baik melalui media visual timeline." },
    { no: 2, pertanyaan: "Apa kendala utama yang dihadapi selama pelaksanaan kegiatan inti pembelajaran berbasis PBL?", catatan: "Manajemen alokasi waktu saat presentasi kelompok perlu ditertibkan agar seluruh kelompok memiliki waktu yang cukup." },
    { no: 3, pertanyaan: "Langkah perbaikan apa yang akan diterapkan pada sesi pembelajaran berikutnya?", catatan: "Menggunakan penanda waktu visual (timer) dan memperbanyak kartu gambar sejarah interaktif." },
  ];
}

function getDefaultRefleksiSiswa(): RefleksiItem[] {
  return [
    { no: 1, pertanyaan: "Bagaimana perasaan kalian setelah mempelajari sejarah lahirnya Pancasila hari ini?", catatan: "Sangat senang dan bangga karena memahami perjuangan para pendiri bangsa dalam merumuskan dasar negara." },
    { no: 2, pertanyaan: "Bagian mana dari kegiatan pembelajaran yang paling menarik bagi kalian?", catatan: "Saat mengamati video sejarah, berdiskusi dalam kelompok menyusun timeline, dan presentasi di depan kelas." },
    { no: 3, pertanyaan: "Hal penting apa yang dapat kalian teladani dari sikap para pendiri bangsa?", catatan: "Sikap bermusyawarah, saling menghargai perbedaan, dan mengutamakan persatuan Indonesia di atas kepentingan pribadi." },
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

  const subject = safeString(mod.subject, "Pendidikan Pancasila");
  const topic = safeString(mod.title || gen.topik || core.tujuanPembelajaran, "Sejarah Lahirnya Pancasila");
  const modelName = safeString(mod.learningModel || mod.modelPembelajaran || desain.praktikPedagogis?.model, "Problem Based Learning (PBL)");

  let actTable: ActivityTableRow[] = Array.isArray(mod.activitiesTable) && mod.activitiesTable.length > 0
    ? mod.activitiesTable.map((r: any, idx: number) => ({
        no: r.no || idx + 1,
        tahap: safeString(r.tahap, `Tahap ${idx + 1}`),
        kegiatan: safeString(r.kegiatan || r.kegiatanSiswaGuru, "-"),
        alokasiWaktu: safeString(r.alokasiWaktu, "15 Menit"),
      }))
    : getDefaultActivitiesTable(act, modelName);

  let rubFormatif: RubrikFormatifItem[] = Array.isArray(mod.rubrikFormatif) && mod.rubrikFormatif.length > 0
    ? mod.rubrikFormatif.map((r: any) => ({
        kriteria: safeString(r.kriteria, "Aspek Penilaian"),
        sangatBaik: safeString(r.sangatBaik || r.skor3, "Sangat Baik (Skor 3 / 4)"),
        baik: safeString(r.baik || r.skor2, "Baik (Skor 2 / 3)"),
        cukup: safeString(r.cukup || r.skor1, "Cukup (Skor 1 / 2)"),
        perluBimbingan: safeString(r.perluBimbingan, "Perlu Bimbingan (Skor 1)"),
      }))
    : getDefaultRubrikFormatif(topic);

  let rubSumatif: RubrikSumatifItem[] = Array.isArray(mod.rubrikSumatif) && mod.rubrikSumatif.length > 0
    ? mod.rubrikSumatif.map((r: any) => ({
        kriteria: safeString(r.kriteria, "Unsur Penilaian"),
        indikator: safeString(r.indikator, "Indikator KKTP"),
        skorMaks: typeof r.skorMaks === "number" ? r.skorMaks : 25,
        pedoman: safeString(r.pedoman, "Pedoman Penskoran"),
      }))
    : getDefaultRubrikSumatif(topic);

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
        tujuanPembelajaran: safeString(r.tujuanPembelajaran, "Murid dapat menjelaskan proses perumusan hingga pengesahan Pancasila."),
        indikator: safeString(r.indikator, "Indikator Soal"),
        materi: safeString(r.materi, "Sejarah Lahirnya Pancasila"),
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
    : getDefaultSoalSumatif(topic);

  let refGuru: RefleksiItem[] = Array.isArray(mod.refleksiGuru) && mod.refleksiGuru.length > 0
    ? mod.refleksiGuru.map((r: any, idx: number) => ({
        no: r.no || idx + 1,
        pertanyaan: safeString(r.pertanyaan, "Pertanyaan Refleksi Evaluasi Guru"),
        catatan: safeString(r.catatan, "-"),
      }))
    : getDefaultRefleksiGuru();

  let refSiswa: RefleksiItem[] = Array.isArray(mod.refleksiSiswa) && mod.refleksiSiswa.length > 0
    ? mod.refleksiSiswa.map((r: any, idx: number) => ({
        no: r.no || idx + 1,
        pertanyaan: safeString(r.pertanyaan, "Pertanyaan Refleksi Peserta Didik"),
        catatan: safeString(r.catatan, "-"),
      }))
    : getDefaultRefleksiSiswa();

  return {
    id: safeString(mod.id, "mod_" + Date.now()),
    title: safeString(mod.title || gen.topik, "Sejarah Lahirnya Pancasila"),
    moduleType: (safeString(mod.moduleType || mod.category, "Intrakurikuler") === "Kokurikuler" ? "Kokurikuler" : "Intrakurikuler"),
    subject: subject,
    targetClass: safeString(mod.targetClass || mod.gradeClass, "Kelas V / Fase C"),
    approach: (safeString(mod.approach, "Deep Learning") as "Deep Learning" | "STEM" | "Kombinasi Deep Learning & STEM"),
    learningModel: modelName,
    allocationJP: safeString(mod.allocationJP || mod.timeAllocation, "2 x 35 Menit (70 Menit)"),
    generalInfo: {
      instansi: safeString(gen.instansi || mod.instansi, "SD Negeri 1 Merdeka"),
      semester: safeString(gen.semester, "1 (Satu)"),
      bab: safeString(gen.bab, "1 / Pancasila dalam Kehidupanku"),
      topik: safeString(gen.topik || mod.title, "Sejarah Lahirnya Pancasila"),
      tahunAjaran: safeString(gen.tahunAjaran, "2026/2027"),
      kompetensiAwal: safeString(gen.kompetensiAwal || iden.pengetahuanAwal || "Murid kelas V telah mengenal lima sila Pancasila dan simbol Garuda Pancasila, namun belum memahami kronologi proses lahirnya Pancasila.", "-"),
      profilPelajarPancasila: safeStringArray(gen.profilPelajarPancasila || ["Keimanan dan Ketakwaan terhadap Tuhan YME", "Kewargaan", "Penalaran Kritis", "Kolaborasi", "Komunikasi", "Kemandirian"]),
      saranaPrasarana: safeString(gen.saranaPrasarana || "Ruang Kelas, Papan Tulis, Laptop, LCD/Proyektor, Speaker, PowerPoint Interaktif, Video Pembelajaran, LKPD, Bahan Ajar Bergambar", "-"),
      targetPesertaDidik: safeString(gen.targetPesertaDidik || mod.targetSiswa, "Reguler / Tipikal (26 Murid)"),
    },
    identifikasi: {
      kesiapanKognitif: safeString(iden.kesiapanKognitif, "Murid kelas V berada pada fase operasional konkret menuju operasional formal, sehingga mulai mampu memahami hubungan sebab akibat, menganalisis peristiwa sejarah secara sederhana, serta menghubungkan peristiwa sejarah dengan kehidupan masa kini."),
      pengetahuanAwal: safeString(iden.pengetahuanAwal, "Sebagian besar murid telah mengenal Pancasila sebagai dasar negara dan menghafalkan lima sila Pancasila. Namun, sebagian besar belum memahami proses lahirnya Pancasila, pembentukan BPUPKI/PPKI, Panitia Sembilan, dan Piagam Jakarta."),
      kebutuhanBelajar: safeString(iden.kebutuhanBelajar, "Murid membutuhkan media visual berupa video sejarah, gambar tokoh perumus, timeline, PowerPoint interaktif, bahan ajar bergambar, serta kesempatan berdiskusi kelompok (diferensiasi proses & produk)."),
      jenisPengetahuan: safeString(iden.jenisPengetahuan, "Pengetahuan Faktual (mengenal tokoh perumus, BPUPKI, PPKI, tanggal penting), Konseptual (memahami proses perumusan & pengesahan, makna perubahan sila pertama), dan Prosedural (menyusun kronologi timeline & presentasi)."),
      relevansiKesulitan: safeString(iden.relevansiKesulitan, "Materi memiliki tingkat relevansi sangat tinggi dalam membentuk karakter nasionalisme dan persatuan. Tingkat kesulitan sedang, dimudahkan melalui media visual, garis waktu, dan diskusi kelompok."),
      strukturMateri: safeString(iden.strukturMateri, "Disusun menggunakan alur Problem Based Learning (PBL): Mengamati peristiwa sejarah -> Mengidentifikasi masalah -> Berdiskusi usulan dasar negara -> Menganalisis perubahan Piagam Jakarta -> Menyimpulkan makna lahirnya Pancasila."),
      integrasiNilaiKarakter: safeString(iden.integrasiNilaiKarakter, "Kemerdekaan Indonesia, nasionalisme, gotong royong melalui kerja sama kelompok, bernalar kritis melalui analisis sejarah, komunikatif dalam presentasi, serta menghargai keberagaman."),
    },
    desainPembelajaran: {
      capaianPembelajaran: safeString(desain.capaianPembelajaran, "Pada akhir Fase C, murid mampu memahami kedudukan dan fungsi Pancasila sebagai dasar negara, pandangan hidup bangsa, dan ideologi negara. Murid mampu menjelaskan proses perumusan dan pengesahan Pancasila serta menunjukkan sikap menghargai jasa para pendiri bangsa."),
      tujuanPembelajaran: safeString(desain.tujuanPembelajaran || core.tujuanPembelajaran, "• Murid dapat menjelaskan proses perumusan hingga pengesahan Pancasila sebagai dasar negara Indonesia (C2).\n• Murid dapat mengurutkan peristiwa penting dalam sejarah lahirnya Pancasila berdasarkan kronologi (C3).\n• Murid dapat menganalisis peran tokoh-tokoh serta makna perubahan rumusan sila pertama dalam Piagam Jakarta terhadap persatuan bangsa Indonesia (C4).\n• Murid dapat menyajikan hasil diskusi tentang sejarah lahirnya Pancasila dalam bentuk timeline atau presentasi kelompok (P3)."),
      indikatorTujuanPembelajaran: Array.isArray(desain.indikatorTujuanPembelajaran) ? desain.indikatorTujuanPembelajaran : [
        "Melalui kegiatan mengamati gambar dan video pembelajaran, murid dapat mengidentifikasi tokoh-tokoh perumus Pancasila dan lembaga perumus dengan tepat.",
        "Melalui kegiatan membaca bahan ajar dan timeline, murid dapat mengurutkan kronologi peristiwa perumusan hingga pengesahan Pancasila secara runtut.",
        "Melalui kegiatan diskusi kelompok, murid dapat menganalisis alasan perubahan rumusan sila pertama Piagam Jakarta demi persatuan bangsa secara logis.",
        "Melalui kegiatan presentasi kelompok, murid dapat menyajikan hasil diskusi secara runtut, percaya diri, dan santun."
      ],
      lintasDisiplinIlmu: safeString(desain.lintasDisiplinIlmu, "Bahasa Indonesia: Membaca informasi sejarah, menentukan informasi penting dari bacaan, dan menyampaikan hasil diskusi menggunakan bahasa Indonesia yang runtut dan santun."),
      topikPembelajaran: safeString(desain.topikPembelajaran, "Sejarah Lahirnya Pancasila melalui kegiatan mengamati, berdiskusi, menganalisis kronologi peristiwa, dan menyelesaikan permasalahan secara kolaboratif."),
      praktikPedagogis: {
        pendekatan: safeString(desain.praktikPedagogis?.pendekatan, "Deep Learning (Mindful Learning, Meaningful Learning, Joyful Learning)"),
        model: safeString(desain.praktikPedagogis?.model || modelName, "Problem Based Learning (PBL)"),
        metode: safeString(desain.praktikPedagogis?.metode, "Observasi, Tanya jawab, Diskusi kelompok, Eksplorasi, Presentasi, Penugasan (LKPD)"),
      },
      saranaPrasaranaDetails: {
        sarana: safeString(desain.saranaPrasaranaDetails?.sarana, "Ruang kelas"),
        prasarana: safeString(desain.saranaPrasaranaDetails?.prasarana, "Papan tulis, Laptop, Speaker, LCD/Proyektor"),
        media: safeString(desain.saranaPrasaranaDetails?.media, "PowerPoint Interaktif, Video Pembelajaran, Bahan Ajar Bergambar, LKPD"),
        sumberBelajar: safeString(desain.saranaPrasaranaDetails?.sumberBelajar, "Buku LKS Pendidikan Pancasila Kelas V Kurikulum Merdeka"),
      },
      kemitraanPembelajaran: safeString(desain.kemitraanPembelajaran, "• Murid lain dalam kegiatan kolaborasi kelompok.\n• Orang tua dalam memberikan dukungan belajar di rumah, seperti mendampingi murid membaca kembali materi sejarah lahirnya Pancasila serta berdiskusi mengenai penerapan nilai-nilai Pancasila dalam kehidupan sehari-hari."),
      lingkunganPembelajaran: {
        iklimKelas: safeString(desain.lingkunganPembelajaran?.iklimKelas, "Nyaman, aman, interaktif, menyenangkan, dan mendorong rasa ingin tahu murid melalui kegiatan eksplorasi."),
        budayaBelajar: safeString(desain.lingkunganPembelajaran?.budayaBelajar, "Kolaboratif, komunikatif, dan eksploratif. Murid aktif bertanya, berdiskusi, mengamati, serta menemukan informasi secara mandiri maupun kelompok."),
        sosioEmosional: safeString(desain.lingkunganPembelajaran?.sosioEmosional, "Guru menciptakan suasana pembelajaran yang menghargai setiap pendapat murid, memberikan penguatan positif, membangun rasa percaya diri, serta menumbuhkan kepedulian terhadap teman."),
      },
      dplSelected: Array.isArray(desain.dplSelected) ? desain.dplSelected : [1, 2, 3, 4, 5, 6, 8],
      pertanyaanPemantikDetailed: {
        afektif: safeString(desain.pertanyaanPemantikDetailed?.afektif, '"Bagaimana perasaan kalian jika para pendiri bangsa dahulu tidak mau bermusyawarah dan saling menghargai perbedaan dalam merumuskan dasar negara Indonesia?"'),
        kognitif: safeString(desain.pertanyaanPemantikDetailed?.kognitif, '"Mengapa rumusan sila pertama dalam Piagam Jakarta mengalami perubahan sebelum Pancasila disahkan? Menurut kalian, mengapa perubahan tersebut penting bagi persatuan Indonesia?"'),
        psikomotorik: safeString(desain.pertanyaanPemantikDetailed?.psikomotorik, '"Jika kalian diminta menyusun kartu-kartu peristiwa sejarah lahirnya Pancasila, bagaimana cara kalian mengurutkannya agar menjadi kronologi yang benar dan mudah dipahami teman-teman?"'),
      },
    },
    coreComponent: {
      tujuanPembelajaran: safeString(core.tujuanPembelajaran || "Murid dapat menjelaskan proses perumusan hingga pengesahan Pancasila sebagai dasar negara Indonesia.", "-"),
      pemahamanBermakna: safeString(core.pemahamanBermakna || "Pancasila lahir melalui musyawarah, kerja sama, dan jiwa besar para pendiri bangsa. Nilai-nilai musyawarah dan persatuan tersebut sangat bermanfaat diterapkan dalam kehidupan sehari-hari.", "-"),
      pertanyaanPemantik: safeString(core.pertanyaanPemantik || "Mengapa rumusan sila pertama dalam Piagam Jakarta mengalami perubahan sebelum Pancasila disahkan? Mengapa perubahan tersebut penting bagi persatuan Indonesia?", "-"),
    },
    activities: {
      pendahuluan: safeString(act.pendahuluan, "1. Pembiasaan Budaya Positif: Salam, Doa, Menanyakan kabar & presensi, Menyanyikan lagu nasional 'Garuda Pancasila'.\n2. Apersepsi: Guru mengajak murid mengingat kembali lambang Garuda Pancasila & lima sila Pancasila.\n3. Eksplorasi & Motivasi: Menyampaikan tujuan pembelajaran dan manfaat mempelajari sejarah lahirnya Pancasila.\n4. Ice Breaking: 'Tepuk Konsentrasi'."),
      inti: safeString(act.inti, "1. Orientasi terhadap Masalah: Guru menampilkan gambar sidang BPUPKI/PPKI & video singkat lahirnya Pancasila.\n2. Mengorganisasi Murid: Penjelasan materi PowerPoint 'Sejarah Lahirnya Pancasila', pembagian kelompok (4-5 orang), dan pembagian LKPD.\n3. Membimbing Penyelidikan: Murid membaca bahan ajar, mengamati timeline kronologi, menyusun urutan peristiwa, dan mendiskusikan perubahan sila pertama Piagam Jakarta.\n4. Menyajikan Hasil: Ice breaking 'Yel-Yel Pancasila' & Presentasi hasil diskusi kelompok di depan kelas.\n5. Analisis & Evaluasi: Menyimpulkan bersama guru dan mengerjakan kuis evaluasi individu."),
      penutup: safeString(act.penutup, "1. Kesimpulan bersama murid.\n2. Penguatan nilai-nilai Pancasila dan persatuan.\n3. Umpan balik & Refleksi lembar refleksi emosi murid.\n4. Tindak Lanjut: Informasi materi pertemuan berikutnya.\n5. Penutup: Ice breaking 'Tepuk Panca Indera', Doa & Salam Penutup."),
    },
    activitiesTable: actTable,
    kegiatanAwalText: safeString(mod.kegiatanAwalText, "• Pembiasaan Budaya Positif:\n  - Murid menjawab salam pembuka dari guru.\n  - Murid berdoa sebelum memulai kegiatan pembelajaran.\n  - Murid menjawab pertanyaan guru tentang kabar hari ini & presensi.\n  - Murid menyanyikan lagu nasional 'Garuda Pancasila' untuk meningkatkan rasa cinta tanah air.\n• Apersepsi:\n  - Guru mengajak murid mengingat kembali materi lambang negara Garuda Pancasila.\n  - Guru mengajukan pertanyaan: 'Siapa yang menciptakan rumusan Pancasila?' & 'Apakah Pancasila langsung menjadi dasar negara setelah merdeka?'\n• Eksplorasi & Motivasi:\n  - Guru menyampaikan tujuan pembelajaran dan motivasi: 'Tahukah kalian bahwa dasar negara Indonesia tidak terbentuk dalam satu hari? Hari ini kita akan menjadi peneliti sejarah.'\n• Ice Breaking: 'Tepuk Konsentrasi'"),
    kegiatanPenutupText: safeString(mod.kegiatanPenutupText, "1. Kesimpulan: Guru mengajak murid menyimpulkan pembelajaran ('Bagaimana proses lahirnya Pancasila?, Siapa tokoh yang berperan?, Mengapa sila pertama mengalami perubahan?').\n2. Penguatan: Guru menegaskan bahwa lahirnya Pancasila merupakan hasil musyawarah, persatuan, dan sikap saling menghargai.\n3. Umpan Balik / Refleksi: Guru membagikan lembar refleksi diri kepada murid & memberikan apresiasi.\n4. Tindak Lanjut: Guru menyampaikan bahwa pada pertemuan berikutnya murid akan mempelajari nilai teladan perumus Pancasila.\n5. Penutup: Ice breaking 'Tepuk Panca Indera', doa penutup, dan salam."),
    assessment: {
      diagnostik: safeString(ass.diagnostik, "Tes Lisan & Tanya Jawab Apersepsi di awal pembelajaran"),
      formatif: safeString(ass.formatif, "Penilaian Kinerja / Unjuk Kerja Diskusi Kelompok, Penyusunan Timeline pada LKPD, & Presentasi Lisan"),
      sumatif: safeString(ass.sumatif, "Tes Tertulis Evaluasi Akhir (Pilihan Ganda & Uraian) pada Lampiran Evaluasi"),
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
    rubrikPenilaian: safeString(mod.rubrikPenilaian, "Rubrik Penilaian Formatif (Tes Lisan & LKPD), Rubrik Penilaian Diri (Refleksi), dan Rubrik Penilaian Evaluasi Sumatif."),
    rubrikFormatif: rubFormatif,
    rubrikSumatif: rubSumatif,
    rubrikAsLearning: rubAsLearning,
    kisiKisiSumatif: kisiKisi,
    soalSumatifList: soalList,
    lkpdText: safeString(mod.lkpdText, `LEMBAR KERJA PESERTA DIDIK (LKPD) - LINI MASA SEJARAH LAHIRNYA PANCASILA

Materi: Sejarah Lahirnya Pancasila (Bab 1 Pancasila dalam Kehidupanku)
Nama Kelompok: ........................................
Anggota Kelompok:
1. ..................................................... 3. .....................................................
2. ..................................................... 4. .....................................................

PETUNJUK KERJA:
1. Bacalah bahan ajar dan amati gambar/video tentang sejarah lahirnya Pancasila dengan cermat!
2. Diskusikan bersama kelompokmu untuk menyusun garis waktu (timeline) peristiwa penting di bawah ini!
3. Jawablah pertanyaan analisis di bawah ini dengan tepat dan lengkap!

TUGAS 1: LINI MASA SEJARAH LAHIRNYA PANCASILA
Silakan tempelkan / tuliskan deskripsi peristiwa pada kotak tanggal berikut:
• 29 Mei - 1 Juni 1945 : Sidang pertama BPUPKI (Usulan dasar negara oleh Moh. Yamin, Prof. Soepomo, dan Ir. Soekarno).
• 1 Juni 1945 : Ir. Soekarno menyampaikan pidato memperkenalkan istilah 'Pancasila'.
• 22 Juni 1945 : Panitia Sembilan merumuskan naskah Piagam Jakarta.
• 10 - 16 Juli 1945 : Sidang kedua BPUPKI membahas rancangan UUD.
• 18 Agustus 1945 : PPKI mengesahkan Pancasila sebagai Dasar Negara dengan perubahan rumusan sila pertama.

TUGAS 2: MENGENAL TOKOH PENDIRI BANGSA & PERUBAHAN RUMUSAN SILA PERTAMA
1. Bagaimana bunyi Sila Pertama Pancasila yang terdapat dalam naskah Piagam Jakarta?
   Jawaban: "Ketuhanan dengan kewajiban menjalankan syariat Islam bagi pemeluk-pemeluknya"
2. Mengapa rumusan sila pertama tersebut diubah pada sidang PPKI tanggal 18 Agustus 1945?
   Jawaban: Demi menjaga persatuan dan kesatuan bangsa Indonesia yang memiliki beragam agama dan suku.
3. Nilai luhur atau sikap teladan apa yang ditunjukkan oleh para pendiri bangsa saat mereka setuju untuk mengubah rumusan tersebut? Sebutkan minimal dua!
   Jawaban: Memprioritaskan persatuan nasional, toleransi, jiwa besar, dan bermusyawarah mufakat.`),
    bahanAjarText: safeString(mod.bahanAjarText, `BAHAN AJAR: SEJARAH LAHIRNYA PANCASILA (DASAR NEGARA REPUBLIK INDONESIA)

1. Latar Belakang Perumusan Pancasila:
Pancasila lahir melalui proses panjang perjuangan para pendiri bangsa. Pada tanggal 29 April 1945, Jepang membentuk BPUPKI (Badan Penyelidik Usaha-Usaha Persiapan Kemerdekaan Indonesia) untuk mempersiapkan kemerdekaan Indonesia.

2. Tokoh Perumus Pancasila (Sidang BPUPKI I: 29 Mei - 1 Juni 1945):
Beberapa tokoh memberikan gagasan tentang dasar negara Indonesia:
- Mohammad Yamin (29 Mei 1945): Mengusulkan Peri Kebangsaan, Peri Kemanusiaan, Peri Ketuhanan, Peri Kerakyatan, Keadilan Rakyat.
- Prof. Dr. Soepomo (31 Mei 1945): Mengemukakan gagasan tentang negara yang berdasarkan persatuan, kekeluargaan, dan keseimbangan lahir batin.
- Ir. Soekarno (1 Juni 1945): Mengusulkan lima dasar negara yaitu Kebangsaan Indonesia, Internasionalisme/Perikemanusiaan, Mufakat/Demokrasi, Kesejahteraan Sosial, Ketuhanan yang Berkebudayaan. Ir. Soekarno memperkenalkan istilah "Pancasila".

3. Panitia Sembilan dan Piagam Jakarta (22 Juni 1945):
Panitia Sembilan dibentuk untuk menyempurnakan usulan dasar negara. Pada tanggal 22 Juni 1945, Panitia Sembilan menghasilkan naskah "Piagam Jakarta" (Jakarta Charter) yang memuat rumusan awal Pancasila.

4. Pengesahan Pancasila (18 Agustus 1945):
Setelah Indonesia memproklamasikan kemerdekaan pada 17 Agustus 1945, keesokan harinya tanggal 18 Agustus 1945, PPKI mengadakan sidang. Dalam sidang tersebut, rumusan sila pertama dalam Piagam Jakarta diubah menjadi "Ketuhanan Yang Maha Esa" demi menjaga persatuan bangsa Indonesia yang beragam. Sejak saat itu, Pancasila resmi disahkan sebagai dasar negara Republik Indonesia.`),
    mediaPembelajaranText: safeString(mod.mediaPembelajaranText, `MEDIA PEMBELAJARAN:
A. Video Pembelajaran Sejarah Lahirnya Pancasila: https://youtu.be/HL2Bbo0ldtM (Proses Lahirnya Pancasila)
B. Bahan Tayang Presentation (PPT Interactive): https://canva.link/ta161v6jxjz735g
C. Media Konkret: Kartu Foto Tokoh Pendiri Bangsa (Ir. Soekarno, Moh. Yamin, Prof. Soepomo, Moh. Hatta), Poster Garuda Pancasila, dan Lembar Timeline Sejarah.`),
    remedialPengayaanText: mod.remedialPengayaanText || {
      remedial: "Remedial diberikan kepada murid yang belum mencapai tujuan pembelajaran melalui pendampingan khusus guru, penjelasan ulang menggunakan media gambar/video/timeline sejarah, serta latihan mengurutkan kronologi peristiwa perumusan Pancasila.",
      pengayaan: "Pengayaan diberikan kepada murid yang telah mencapai tujuan pembelajaran melalui tugas membuat peta konsep/infografis sederhana sejarah lahirnya Pancasila serta analisis penerapan nilai-nilai Pancasila dalam kehidupan sehari-hari.",
    },
    glosarium: safeString(mod.glosarium, `GLOSARIUM:
• Pancasila: Dasar negara Republik Indonesia yang menjadi pedoman dalam kehidupan berbangsa dan bernegara.
• BPUPKI: Badan Penyelidik Usaha-Usaha Persiapan Kemerdekaan Indonesia yang dibentuk untuk mempersiapkan kemerdekaan.
• Panitia Sembilan: Panitia kecil yang merumuskan dasar negara dan menghasilkan naskah Piagam Jakarta pada 22 Juni 1945.
• Piagam Jakarta: Naskah perumusan dasar negara hasil Panitia Sembilan sebelum mengalami perubahan sila pertama.
• PPKI: Panitia Persiapan Kemerdekaan Indonesia yang bertugas mempersiapkan pelaksanaan kemerdekaan dan mengesahkan Pancasila pada 18 Agustus 1945.
• Musyawarah: Proses berdiskusi bersama untuk mencapai kesepakatan demi kepentingan bersama.
• Persatuan: Sikap menjaga kebersamaan dan menghargai perbedaan demi keutuhan bangsa Indonesia.`),
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

  const handleGenerateModuleAI = async () => {
    setIsGenerating(true);
    try {
      const prompt = `Anda adalah konsultan pengembang Modul Ajar Kurikulum Merdeka Indonesia tingkat Sekolah Dasar.
Buatkan draft MODUL AJAR ${moduleType.toUpperCase()} yang sangat lengkap, terstruktur, dan siap cetak.

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
  "title": "Judul Modul Ajar - ${materi}",
  "moduleType": "${moduleType}",
  "subject": "${subject}",
  "targetClass": "${targetClass}",
  "approach": "${approach}",
  "learningModel": "${learningModel}",
  "allocationJP": "${allocationJP}",
  "generalInfo": {
    "kompetensiAwal": "Deskripsi kemahiran awal murid sebelum masuk topik",
    "profilPelajarPancasila": ["Bernalar Kritis", "Gotong Royong", "Kreatif"],
    "saranaPrasarana": "Buku bacaan, laptop, proyektor, LKPD",
    "targetPesertaDidik": "Reguler (26 Murid)"
  },
  "coreComponent": {
    "tujuanPembelajaran": "Murid mampu menganalisis konsep dan memecahkan masalah melalui unjuk karya.",
    "pemahamanBermakna": "Konsep materi bermanfaat langsung dalam kehidupan nyata.",
    "pertanyaanPemantik": "Pertanyaan yang memicu rasa ingin tahu siswa"
  },
  "activitiesTable": [
    { "no": 1, "tahap": "Kegiatan Pembukaan (Mindful Learning)", "kegiatan": "Guru menyapa murid dengan kesadaran penuh...", "alokasiWaktu": "15 Menit" },
    { "no": 2, "tahap": "Kegiatan Inti (Meaningful - Sintaks ${learningModel})", "kegiatan": "Murid berdiskusi dalam kelompok mengerjakan LKPD...", "alokasiWaktu": "45 Menit" },
    { "no": 3, "tahap": "Kegiatan Penutup (Joyful Reflection)", "kegiatan": "Murid dan guru merangkum serta melakukan refleksi...", "alokasiWaktu": "10 Menit" }
  ],
  "assessment": {
    "diagnostik": "Tanya jawab lisan diawal",
    "formatif": "Observasi keaktifan kelompok & lembar unjuk kerja LKPD",
    "sumatif": "Tes tertulis analisis konsep"
  },
  "rubrikFormatif": [
    { "kriteria": "Pemahaman Konsep & Diskusi", "sangatBaik": "Sangat aktif & paham penuh", "baik": "Aktif & paham", "cukup": "Cukup aktif", "perluBimbingan": "Pasif & butuh bimbingan" }
  ],
  "rubrikSumatif": [
    { "kriteria": "Penguasaan Materi Tertulis", "indikator": "Mampu menjawab soal PG dan Isian", "skorMaks": 50, "pedoman": "Skor sesuai bobot jawaban benar" }
  ],
  "kisiKisiSumatif": [
    { "no": 1, "indikator": "Menganalisis dan menentukan komposisi nilai uang...", "levelKognitif": "C3 (L2 - Menerapkan)", "bentukSoal": "Pilihan Ganda", "nomorSoal": "1", "kunciJawaban": "A", "skorPerSoal": 4, "tingkat": "Sedang" }
  ],
  "soalSumatifList": [
    { "no": 1, "pertanyaan": "Soal cerita kontekstual & numeratif nyata (misal: 'Jika Andi membeli sebuah sepatu dengan uang 1 lembar 50.000, 2 lembar 10.000, dan 1 lembar 5.000...'). Wajib hasilkan total 10 soal: 5 Pilihan Ganda (ada opsi A,B,C,D), 3 Isian Singkat, 2 Uraian HOTS.", "pilihan": ["A. Rp 75.000,00", "B. Rp 70.000,00", "C. Rp 65.000,00", "D. Rp 80.000,00"], "kunciJawaban": "A. Rp 75.000,00" }
  ],
  "lkpdText": "Lembar Kerja Peserta Didik (LKPD)...",
  "refleksiGuru": [
    { "no": 1, "pertanyaan": "Apakah siswa mencapai KKTP?", "catatan": "88% siswa tuntas..." }
  ],
  "refleksiSiswa": [
    { "no": 1, "pertanyaan": "Bagaimana perasaanmu setelah belajar?", "catatan": "Sangat senang..." }
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
          coreComponent: parsed.coreComponent || {},
          activitiesTable: parsed.activitiesTable || [],
          assessment: parsed.assessment || {},
          rubrikFormatif: parsed.rubrikFormatif || [],
          rubrikSumatif: parsed.rubrikSumatif || [],
          kisiKisiSumatif: parsed.kisiKisiSumatif || [],
          soalSumatifList: parsed.soalSumatifList || [],
          lkpdText: parsed.lkpdText || "",
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
          title: `Modul Ajar Kurikulum Merdeka - ${materi}`,
          moduleType,
          subject,
          targetClass,
          approach,
          learningModel,
          allocationJP,
          generalInfo: {
            instansi: schoolIdentity.schoolName || "SD Negeri 1 Merdeka",
            faseKelas: `${targetClass}`,
            elemen: "Pemahaman Konsep & Keterampilan Proses",
            kompetensiAwal: `Siswa memiliki pemahaman dasar mengenai materi ${materi}.`,
            profilPancasila: "Beriman, Bertakwa kepada Tuhan YME, Bergotong Royong, Bernalar Kritis, Mandiri",
            sarpras: "Buku Paket, Proyektor, Kartu Gambar, LKPD, Laptop",
            targetSiswa: "Siswa Reguler / Tipikal (28-32 Murid)",
            metodePembelajaran: `${learningModel} dengan Pendekatan ${approach}`,
          },
          coreComponent: {
            tujuanPembelajaran: `1. Peserta didik mampu memahami konsep utama ${materi} secara mendalam.\n2. Peserta didik mampu mengaplikasikan pemahaman tentang ${materi} dalam menyelesaikan soal dan persoalan kehidupan sehari-hari.`,
            pemahamanBermakna: `Pemahaman tentang ${materi} membantu peserta didik berpikir logis, analitis, dan solutif dalam kehidupan sehari-hari.`,
            pertanyaanPemantik: `1. Pernahkah kalian menemui contoh ${materi} di lingkungan sekitar?\n2. Bagaimana cara kalian menyelesaikan permasalahan terkait ${materi}?`,
            persiapanPembelajaran: "Membuat rencana modul, menyiapkan lembar kerja peserta didik (LKPD), alat peraga, dan instrumen asesmen.",
          },
          activitiesTable: [
            {
              tahap: "Pendahuluan (15 Menit)",
              kegiatanSiswaGuru: "Guru membuka pelajaran dengan salam, berdoa bersama, memeriksa kehadiran, dan melakukan apersepsi terkait materi sebelumnya. Guru menyampaikan tujuan pembelajaran dan pertanyaan pemantik.",
              alokasiWaktu: "15 Menit",
            },
            {
              tahap: "Kegiatan Inti (50 Menit)",
              kegiatanSiswaGuru: `Guru menjelaskan materi ${materi} dengan alat peraga/media. Siswa dibagi menjadi beberapa kelompok heterogen untuk berdiskusi mengerjakan LKPD. Guru membimbing kelompok dan mengobservasi keaktifan siswa. Masing-masing kelompok mempresentasikan hasil diskusi di depan kelas.`,
              alokasiWaktu: "50 Menit",
            },
            {
              tahap: "Penutup (15 Menit)",
              kegiatanSiswaGuru: "Guru bersama siswa menyimpulkan poin-poin penting pembelajaran. Guru memberikan umpan balik, kuis singkat/asesmen formatif, serta refleksi perasaan belajar siswa sebelum ditutup dengan doa.",
              alokasiWaktu: "15 Menit",
            },
          ],
          assessment: {
            sikap: "Observasi Profil Pelajar Pancasila (Gotong royong, Bernalar kritis, Mandiri)",
            pengetahuan: "Tes Tertulis (Pilihan Ganda & Uraian) pada Kuis / Asesmen Sumatif",
            keterampilan: "Penilaian Kinerja / Unjuk Kerja Diskusi Kelompok dan Presentasi LKPD",
          },
          lkpdText: `LEMBAR KERJA PESERTA DIDIK (LKPD)\nMateri: ${materi}\n\nNama Kelompok: ........................\nAnggota: 1. ......... 2. ......... 3. ......... 4. .........\n\nPETUNJUK:\n1. Bacalah petunjuk soal dengan cermat.\n2. Diskusikan bersama teman sekelompokmu untuk menyelesaikan pertanyaan di bawah ini.\n3. Tuliskan jawaban pada tempat yang telah disediakan.\n\nSOAL DISKUSI:\n1. Jelaskan pemahaman kalian mengenai materi ${materi}!\n2. Berikan 3 contoh penerapan ${materi} dalam kehidupan sehari-hari!`,
          refleksiGuru: [
            { no: 1, pertanyaan: "Apakah seluruh peserta didik mencapai Tujuan Pembelajaran?", catatan: "Sesuai observasi & asesmen formatif" },
            { no: 2, pertanyaan: "Kendala apa yang dihadapi selama kegiatan pembelajaran?", catatan: "Manajemen waktu saat diskusi" },
          ],
          refleksiSiswa: [
            { no: 1, pertanyaan: "Bagian materi mana yang paling kamu sukai?", catatan: "Saat diskusi kelompok dan praktikum" },
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
                  onChange={(e) => setModuleType(e.target.value as any)}
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
