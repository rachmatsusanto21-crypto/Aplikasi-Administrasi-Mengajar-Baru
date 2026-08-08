import {
  SchoolIdentity,
  Student,
  AttendanceRecord,
  CPTPItem,
  IncidentRecord,
  GradeRecord,
  TimetableSlot,
  GuestBookEntry,
  IncidentalJournalEntry,
  TeachingJournalEntry,
  CalendarEvent,
  MonthlyEffectiveDays,
  ProtaItem,
  PromesItem,
  ModulAjar,
  AISettings,
  UserAccount,
} from "../types";

export const initialSchoolIdentity: SchoolIdentity = {
  schoolName: "SDN PISANGCANDI 1",
  npsn: "20533686",
  address: "Jl. Simpang Raya Langsep 14, Kota Malang Kode Pos 65149",
  village: "Pisangcandi",
  district: "Sukun",
  regency: "Kota Malang",
  province: "Jawa Timur",
  website: "https://sdnpisangcandi1.sch.id",
  email: "sdnpisangcandi1.mlg@google.com",
  phone: "0341-574056",
  logoUrl: "https://lh3.googleusercontent.com/d/1dMJ8rTQxZkcpPe_xtvmMt7aITLYvf_aT",
  logoLeftUrl: "https://lh3.googleusercontent.com/d/1dMJ8rTQxZkcpPe_xtvmMt7aITLYvf_aT",
  logoRightUrl: "https://lh3.googleusercontent.com/d/1y5lRPtb_K0Z9U8xe-OS4hkRx2zRHq1cU",
  academicYear: "2025/2026",
  academicYearStartDate: "2025-07-14",
  academicYearEndDate: "2026-06-20",
  semester: "Ganjil",
  phase: "Fase B",
  gradeClass: "Kelas IV",
  headmasterName: "Kepala Sekolah SDN Pisangcandi 1",
  headmasterNip: "197501012000031001",
  teacherName: "Rachmat Susanto, S.Pd.",
  teacherNip: "198811202014021003",
};

export const initialStudents: Student[] = [
  { id: "s1", nis: "2425001", nisn: "0145829101", name: "Ahmad Fauzi", gender: "L", parentName: "Bpk. Fauzi", parentEmail: "fauzi.orangtua@gmail.com", parentPhone: "081234567801" },
  { id: "s2", nis: "2425002", nisn: "0145829102", name: "Aisyah Putri Permata", gender: "P", parentName: "Ibu Permata", parentEmail: "permata.ortu@gmail.com", parentPhone: "081234567802" },
  { id: "s3", nis: "2425003", nisn: "0145829103", name: "Bagas Pratama", gender: "L", parentName: "Bpk. Pratama", parentEmail: "pratama.ortu@gmail.com", parentPhone: "081234567803" },
  { id: "s4", nis: "2425004", nisn: "0145829104", name: "Bunga Citra Lestari", gender: "P", parentName: "Ibu Citra", parentEmail: "citra.ortu@gmail.com", parentPhone: "081234567804" },
  { id: "s5", nis: "2425005", nisn: "0145829105", name: "Deni Setiawan", gender: "L", parentName: "Bpk. Setiawan", parentEmail: "setiawan.ortu@gmail.com", parentPhone: "081234567805" },
  { id: "s6", nis: "2425006", nisn: "0145829106", name: "Dina Kirana", gender: "P", parentName: "Ibu Kirana", parentEmail: "kirana.ortu@gmail.com", parentPhone: "081234567806" },
  { id: "s7", nis: "2425007", nisn: "0145829107", name: "Fajar Ramadan", gender: "L", parentName: "Bpk. Ramadan", parentEmail: "ramadan.ortu@gmail.com", parentPhone: "081234567807" },
  { id: "s8", nis: "2425008", nisn: "0145829108", name: "Fitri Rahmawati", gender: "P", parentName: "Ibu Rahmawati", parentEmail: "rahmawati.ortu@gmail.com", parentPhone: "081234567808" },
  { id: "s9", nis: "2425009", nisn: "0145829109", name: "Gilang Nusantara", gender: "L", parentName: "Bpk. Nusantara", parentEmail: "nusantara.ortu@gmail.com", parentPhone: "081234567809" },
  { id: "s10", nis: "2425010", nisn: "0145829110", name: "Hana Nabila", gender: "P", parentName: "Ibu Nabila", parentEmail: "nabila.ortu@gmail.com", parentPhone: "081234567810" },
  { id: "s11", nis: "2425011", nisn: "0145829111", name: "Irfan Hakim", gender: "L", parentName: "Bpk. Hakim", parentEmail: "hakim.ortu@gmail.com", parentPhone: "081234567811" },
  { id: "s12", nis: "2425012", nisn: "0145829112", name: "Intan Nuraini", gender: "P", parentName: "Ibu Nuraini", parentEmail: "nuraini.ortu@gmail.com", parentPhone: "081234567812" },
  { id: "s13", nis: "2425013", nisn: "0145829113", name: "Kiki Rahmat", gender: "L", parentName: "Bpk. Rahmat", parentEmail: "rahmat.ortu@gmail.com", parentPhone: "081234567813" },
  { id: "s14", nis: "2425014", nisn: "0145829114", name: "Larasati Dewi", gender: "P", parentName: "Ibu Dewi", parentEmail: "dewi.ortu@gmail.com", parentPhone: "081234567814" },
  { id: "s15", nis: "2425015", nisn: "0145829115", name: "Muhammad Rizky", gender: "L", parentName: "Bpk. Rizky", parentEmail: "rizky.ortu@gmail.com", parentPhone: "081234567815" },
  { id: "s16", nis: "2425016", nisn: "0145829116", name: "Nabila Syakieb", gender: "P", parentName: "Ibu Syakieb", parentEmail: "syakieb.ortu@gmail.com", parentPhone: "081234567816" },
  { id: "s17", nis: "2425017", nisn: "0145829117", name: "Okta Wijaya", gender: "L", parentName: "Bpk. Wijaya", parentEmail: "wijaya.ortu@gmail.com", parentPhone: "081234567817" },
  { id: "s18", nis: "2425018", nisn: "0145829118", name: "Putri Anggraini", gender: "P", parentName: "Ibu Anggraini", parentEmail: "anggraini.ortu@gmail.com", parentPhone: "081234567818" },
  { id: "s19", nis: "2425019", nisn: "0145829119", name: "Rian Hidayat", gender: "L", parentName: "Bpk. Hidayat", parentEmail: "hidayat.ortu@gmail.com", parentPhone: "081234567819" },
  { id: "s20", nis: "2425020", nisn: "0145829120", name: "Siti Zulaikha", gender: "P", parentName: "Ibu Zulaikha", parentEmail: "zulaikha.ortu@gmail.com", parentPhone: "081234567820" },
];

export const initialAttendanceRecords: AttendanceRecord[] = [
  { id: "a1", date: "2025-08-11", studentId: "s3", status: "S", reason: "Demam tinggi" },
  { id: "a2", date: "2025-08-11", studentId: "s7", status: "I", reason: "Acara keluarga" },
  { id: "a3", date: "2025-08-12", studentId: "s3", status: "S", reason: "Pemulihan sakit" },
  { id: "a4", date: "2025-08-14", studentId: "s11", status: "A", reason: "Tanpa keterangan" },
  { id: "a5", date: "2025-08-18", studentId: "s15", status: "I", reason: "Izin lomba renang" },
];

export const initialCPTP: CPTPItem[] = [
  {
    id: "c1",
    subject: "Bahasa Indonesia",
    element: "Membaca dan Memirsa",
    codeCP: "CP-BI-4.1",
    descriptionCP: "Peserta didik mampu memahami ide pokok dan ide pendukung pada teks informatif dan narasi sederhana.",
    codeTP: "TP-BI-4.1.1",
    descriptionTP: "Menemukan informasi tersurat dan tersirat dalam teks cerita rakyat lokal secara tepat.",
    targetClass: "Kelas IV",
  },
  {
    id: "c2",
    subject: "Bahasa Indonesia",
    element: "Menulis",
    codeCP: "CP-BI-4.2",
    descriptionCP: "Peserta didik mampu menulis teks deskripsi dan narasi dengan rangkaian kalimat yang beragam.",
    codeTP: "TP-BI-4.2.1",
    descriptionTP: "Menyusun karangan deskripsi tentang lingkungan sekolah dengan ejaan EYD yang benar.",
    targetClass: "Kelas IV",
  },
  {
    id: "c3",
    subject: "Matematika",
    element: "Bilangan",
    codeCP: "CP-MAT-4.1",
    descriptionCP: "Peserta didik menunjukkan pemahaman dan intuisi bilangan pada bilangan cacah sampai 10.000.",
    codeTP: "TP-MAT-4.1.1",
    descriptionTP: "Membaca, menulis, dan membandingkan bilangan cacah sampai 10.000 serta menentukan nilai tempatnya.",
    targetClass: "Kelas IV",
  },
  {
    id: "c4",
    subject: "Matematika",
    element: "Geometri",
    codeCP: "CP-MAT-4.2",
    descriptionCP: "Peserta didik dapat mendeskripsikan ciri-ciri berbagai bangun datar dan menentukan keliling serta luasnya.",
    codeTP: "TP-MAT-4.2.1",
    descriptionTP: "Menghitung keliling dan luas bangun datar persegi, persegi panjang, dan segitiga.",
    targetClass: "Kelas IV",
  },
  {
    id: "c5",
    subject: "IPAS",
    element: "Pemahaman IPAS (Sains)",
    codeCP: "CP-IPAS-4.1",
    descriptionCP: "Peserta didik menganalisis hubungan antara bentuk serta fungsi bagian tubuh pada tumbuhan dan hewan.",
    codeTP: "TP-IPAS-4.1.1",
    descriptionTP: "Menganalisis proses fotosintesis pada tumbuhan hijau dan dampaknya bagi kehidupan bumi.",
    targetClass: "Kelas IV",
  },
  {
    id: "c6",
    subject: "Kokurikuler (P5)",
    element: "Gaya Hidup Berkelanjutan",
    codeCP: "CP-P5-4.1",
    descriptionCP: "Peserta didik memahami pentingnya mengelola sampah dan menjaga kelestarian lingkungan sekolah secara bergotong royong.",
    codeTP: "TP-P5-4.1.1",
    descriptionTP: "Merancang dan membuat produk daur ulang sampah plastik menjadi barang bernilai guna bagi kelas.",
    targetClass: "Kelas IV",
  },
];

export const initialIncidents: IncidentRecord[] = [
  {
    id: "inc1",
    date: "2025-08-05",
    studentId: "s11",
    type: "Pelanggaran",
    category: "Ringan",
    description: "Terlambat masuk kelas selama 20 menit setelah jam istirahat pertama.",
    actionTaken: "Diberikan teguran lisan dan bimbingan kedisiplinan waktu.",
    counselorName: "Rachmat Susanto, S.Pd.",
    status: "Selesai",
  },
  {
    id: "inc2",
    date: "2025-08-15",
    studentId: "s3",
    type: "Bimbingan Konseling",
    category: "Sedang",
    description: "Siswa sering mengantuk di kelas dan hasil belajar mengalami penurunan pada materi Matematika.",
    actionTaken: "Konseling pribadi, identifikasi jam tidur di rumah, dan pemberian remedial terpandu.",
    counselorName: "Rachmat Susanto, S.Pd.",
    status: "Proses Bimbingan",
    parentSignatureNote: "Orang tua bersedia membatasi gadget di malam hari.",
  },
  {
    id: "inc3",
    date: "2025-08-18",
    studentId: "s15",
    type: "Prestasi",
    category: "Positif",
    description: "Juara 1 Lomba Renang Gaya Bebas Tingkat Kecamatan Cibinong.",
    actionTaken: "Pemberian piagam penghargaan pada upacara bendera dan pencatatan portofolio.",
    counselorName: "Drs. H. Mulyadi, M.Pd.",
    status: "Selesai",
  },
];

export const initialGrades: GradeRecord[] = [
  {
    studentId: "s1",
    subject: "Bahasa Indonesia",
    tpScores: { "TP-BI-4.1.1": 88, "TP-BI-4.2.1": 85 },
    midSummative: 86,
    finalSummative: 88,
  },
  {
    studentId: "s2",
    subject: "Bahasa Indonesia",
    tpScores: { "TP-BI-4.1.1": 92, "TP-BI-4.2.1": 90 },
    midSummative: 90,
    finalSummative: 94,
  },
  {
    studentId: "s3",
    subject: "Bahasa Indonesia",
    tpScores: { "TP-BI-4.1.1": 75, "TP-BI-4.2.1": 72 },
    midSummative: 70,
    finalSummative: 74,
  },
  {
    studentId: "s1",
    subject: "Matematika",
    tpScores: { "TP-MAT-4.1.1": 82, "TP-MAT-4.2.1": 80 },
    midSummative: 84,
    finalSummative: 86,
  },
  {
    studentId: "s2",
    subject: "Matematika",
    tpScores: { "TP-MAT-4.1.1": 95, "TP-MAT-4.2.1": 92 },
    midSummative: 94,
    finalSummative: 96,
  },
];

export const initialTimetable: TimetableSlot[] = [
  // SENIN (Bahasa Indonesia = 3 JP: Jam 3, 4, 5)
  { id: "tt1", day: "Senin", period: 1, timeRange: "07.00 - 07.35", subject: "Upacara Bendera", roomOrTeacher: "Lapangan Sekolah" },
  { id: "tt2", day: "Senin", period: 2, timeRange: "07.35 - 08.10", subject: "Pancasila", roomOrTeacher: "Rachmat S." },
  { id: "tt3", day: "Senin", period: 3, timeRange: "08.10 - 08.45", subject: "Bahasa Indonesia", roomOrTeacher: "Rachmat S." },
  { id: "tt4", day: "Senin", period: 4, timeRange: "08.45 - 09.20", subject: "Bahasa Indonesia", roomOrTeacher: "Rachmat S." },
  { id: "tt5", day: "Senin", period: 5, timeRange: "09.35 - 10.10", subject: "Bahasa Indonesia", roomOrTeacher: "Rachmat S." },
  { id: "tt6", day: "Senin", period: 6, timeRange: "10.10 - 10.45", subject: "Matematika", roomOrTeacher: "Rachmat S." },
  { id: "tt7", day: "Senin", period: 7, timeRange: "10.45 - 11.20", subject: "IPAS", roomOrTeacher: "Rachmat S." },
  { id: "tt8", day: "Senin", period: 8, timeRange: "11.20 - 11.55", subject: "P5 / Kokurikuler", roomOrTeacher: "Tim P5" },
  { id: "tt9", day: "Senin", period: 9, timeRange: "12.30 - 13.05", subject: "Ekstrakurikuler Wajib", roomOrTeacher: "Pembina Ekskul" },
  { id: "tt10", day: "Senin", period: 10, timeRange: "13.05 - 13.40", subject: "Pembiasaan / Literasi", roomOrTeacher: "Rachmat S." },

  // SELASA (Bahasa Indonesia = 2 JP: Jam 3, 4) -> Total Bahasa Indonesia per minggu = 5 JP
  { id: "tt11", day: "Selasa", period: 1, timeRange: "07.00 - 07.35", subject: "Matematika", roomOrTeacher: "Rachmat S." },
  { id: "tt12", day: "Selasa", period: 2, timeRange: "07.35 - 08.10", subject: "Matematika", roomOrTeacher: "Rachmat S." },
  { id: "tt13", day: "Selasa", period: 3, timeRange: "08.10 - 08.45", subject: "Bahasa Indonesia", roomOrTeacher: "Rachmat S." },
  { id: "tt14", day: "Selasa", period: 4, timeRange: "08.45 - 09.20", subject: "Bahasa Indonesia", roomOrTeacher: "Rachmat S." },
  { id: "tt15", day: "Selasa", period: 5, timeRange: "09.35 - 10.10", subject: "IPAS", roomOrTeacher: "Rachmat S." },
  { id: "tt16", day: "Selasa", period: 6, timeRange: "10.10 - 10.45", subject: "IPAS", roomOrTeacher: "Rachmat S." },
  { id: "tt17", day: "Selasa", period: 7, timeRange: "10.45 - 11.20", subject: "Pendidikan Agama", roomOrTeacher: "Guru Agama" },
  { id: "tt18", day: "Selasa", period: 8, timeRange: "11.20 - 11.55", subject: "Pendidikan Agama", roomOrTeacher: "Guru Agama" },
  { id: "tt19", day: "Selasa", period: 9, timeRange: "12.30 - 13.05", subject: "Bahasa Inggris", roomOrTeacher: "Guru B.Inggris" },
  { id: "tt20", day: "Selasa", period: 10, timeRange: "13.05 - 13.40", subject: "Remedial / Pengayaan", roomOrTeacher: "Rachmat S." },

  // RABU
  { id: "tt21", day: "Rabu", period: 1, timeRange: "07.00 - 07.35", subject: "PJOK", roomOrTeacher: "Pak Heri, S.Pd." },
  { id: "tt22", day: "Rabu", period: 2, timeRange: "07.35 - 08.10", subject: "PJOK", roomOrTeacher: "Pak Heri, S.Pd." },
  { id: "tt23", day: "Rabu", period: 3, timeRange: "08.10 - 08.45", subject: "PJOK", roomOrTeacher: "Pak Heri, S.Pd." },
  { id: "tt24", day: "Rabu", period: 4, timeRange: "08.45 - 09.20", subject: "Matematika", roomOrTeacher: "Rachmat S." },
  { id: "tt25", day: "Rabu", period: 5, timeRange: "09.35 - 10.10", subject: "Matematika", roomOrTeacher: "Rachmat S." },
  { id: "tt26", day: "Rabu", period: 6, timeRange: "10.10 - 10.45", subject: "Bahasa Inggris", roomOrTeacher: "Guru B.Inggris" },
  { id: "tt27", day: "Rabu", period: 7, timeRange: "10.45 - 11.20", subject: "Seni Budaya", roomOrTeacher: "Rachmat S." },
  { id: "tt28", day: "Rabu", period: 8, timeRange: "11.20 - 11.55", subject: "Seni Budaya", roomOrTeacher: "Rachmat S." },
  { id: "tt29", day: "Rabu", period: 9, timeRange: "12.30 - 13.05", subject: "Bahasa Jawa", roomOrTeacher: "Rachmat S." },
  { id: "tt30", day: "Rabu", period: 10, timeRange: "13.05 - 13.40", subject: "Koding & Kecerdasan Artifisial", roomOrTeacher: "Rachmat S." },

  // KAMIS
  { id: "tt31", day: "Kamis", period: 1, timeRange: "07.00 - 07.35", subject: "IPAS", roomOrTeacher: "Rachmat S." },
  { id: "tt32", day: "Kamis", period: 2, timeRange: "07.35 - 08.10", subject: "IPAS", roomOrTeacher: "Rachmat S." },
  { id: "tt33", day: "Kamis", period: 3, timeRange: "08.10 - 08.45", subject: "Pancasila", roomOrTeacher: "Rachmat S." },
  { id: "tt34", day: "Kamis", period: 4, timeRange: "08.45 - 09.20", subject: "Pancasila", roomOrTeacher: "Rachmat S." },
  { id: "tt35", day: "Kamis", period: 5, timeRange: "09.35 - 10.10", subject: "Seni Budaya", roomOrTeacher: "Rachmat S." },
  { id: "tt36", day: "Kamis", period: 6, timeRange: "10.10 - 10.45", subject: "Bahasa Jawa", roomOrTeacher: "Rachmat S." },
  { id: "tt37", day: "Kamis", period: 7, timeRange: "10.45 - 11.20", subject: "P5 / Kokurikuler", roomOrTeacher: "Tim P5" },
  { id: "tt38", day: "Kamis", period: 8, timeRange: "11.20 - 11.55", subject: "P5 / Kokurikuler", roomOrTeacher: "Tim P5" },
  { id: "tt39", day: "Kamis", period: 9, timeRange: "12.30 - 13.05", subject: "Koding & Kecerdasan Artifisial", roomOrTeacher: "Rachmat S." },
  { id: "tt40", day: "Kamis", period: 10, timeRange: "13.05 - 13.40", subject: "Pramuka", roomOrTeacher: "Pembina Pramuka" },

  // JUMAT
  { id: "tt41", day: "Jumat", period: 1, timeRange: "07.00 - 07.35", subject: "P5 / Kokurikuler", roomOrTeacher: "Tim P5" },
  { id: "tt42", day: "Jumat", period: 2, timeRange: "07.35 - 08.10", subject: "P5 / Kokurikuler", roomOrTeacher: "Tim P5" },
  { id: "tt43", day: "Jumat", period: 3, timeRange: "08.10 - 08.45", subject: "Pendidikan Agama", roomOrTeacher: "Guru Agama" },
  { id: "tt44", day: "Jumat", period: 4, timeRange: "08.45 - 09.20", subject: "Pendidikan Agama", roomOrTeacher: "Guru Agama" },
  { id: "tt45", day: "Jumat", period: 5, timeRange: "09.35 - 10.10", subject: "Pembiasaan / Keagamaan", roomOrTeacher: "Rachmat S." },

  // SABTU
  { id: "tt46", day: "Sabtu", period: 1, timeRange: "07.00 - 07.35", subject: "Senam Kesegaran / Olahraga", roomOrTeacher: "Pak Heri, S.Pd." },
  { id: "tt47", day: "Sabtu", period: 2, timeRange: "07.35 - 08.10", subject: "Pengembangan Diri", roomOrTeacher: "Rachmat S." },
  { id: "tt48", day: "Sabtu", period: 3, timeRange: "08.10 - 08.45", subject: "Ekstrakurikuler Pilihan", roomOrTeacher: "Pembina Ekskul" },
  { id: "tt49", day: "Sabtu", period: 4, timeRange: "08.45 - 09.20", subject: "Pramuka / Kepanduan", roomOrTeacher: "Pembina Pramuka" },
];

export const initialGuestBook: GuestBookEntry[] = [
  {
    id: "gb1",
    date: "2025-08-04",
    time: "09.30",
    visitorName: "Drs. Budi Santoso",
    institution: "Pengawas Bina Dinas Pendidikan Kab. Bogor",
    purpose: "Supervisi Akademik dan Pengawasan Administrasi Guru",
    phone: "081298765432",
    notes: "Administrasi kelas IV-A sangat rapi dan terlaksana dengan baik.",
  },
  {
    id: "gb2",
    date: "2025-08-12",
    time: "10.15",
    visitorName: "Ibu Ratna Dewi",
    institution: "Puskesmas Cibinong",
    purpose: "Sosialisasi Imunisasi BIAS dan Pemeriksaan Kesehatan Berkala",
    phone: "085712345678",
    notes: "Anak-anak kelas IV antusias dan tertib mengikuti pemeriksaan.",
  },
];

export const initialIncidentalJournals: IncidentalJournalEntry[] = [
  {
    id: "ij1",
    date: "2025-08-17",
    time: "07.30 - 11.30",
    activityName: "Peringatan HUT Kemerdekaan RI ke-80 & Lomba Antarkelas",
    organizer: "Panitia HUT RI Sekolah",
    location: "Lapangan Sekolah",
    description: "Siswa kelas IV-A mengikuti lomba balap karung, makan kerupuk, dan paduan suara lagu nasional.",
    followUp: "Pemberian piala bergilir dan dokumentasi portofolio kelas.",
  },
  {
    id: "ij2",
    date: "2025-08-22",
    time: "13.00 - 15.30",
    activityName: "Rapat KKG SD Gugus 03 Cibinong",
    organizer: "Pengurus KKG",
    location: "SDN Merdeka Utama",
    description: "Penyusunan Modul Ajar Deep Learning Kurikulum Merdeka dan simulasi asesmen sumatif.",
    followUp: "Pengembangan modul ajar berbasis STEM untuk semester berjalan.",
  },
];

export const initialTeachingJournals: TeachingJournalEntry[] = [
  {
    id: "tj1",
    date: "2025-08-11",
    period: "Jam 2 - 3",
    subject: "Bahasa Indonesia",
    materialOrTP: "TP-BI-4.1.1 Menemukan Informasi Tersurat Teks Cerita Rakyat",
    learningActivity: "Siswa membaca cerita 'Asal Usul Danau Toba' secara berpasangan lalu menganalisis tokoh dan amanat.",
    studentsPresent: 18,
    studentsAbsent: 2,
    absentNotes: "Ahmad Fauzi (Demam), Bagas Pratama (Izin)",
    reflectionNotes: "Pembelajaran aktif, 85% siswa lancar mengidentifikasi ide pokok secara mandiri.",
  },
  {
    id: "tj2",
    date: "2025-08-12",
    period: "Jam 1 - 2",
    subject: "Matematika",
    materialOrTP: "TP-MAT-4.1.1 Membaca dan Membandingkan Bilangan Cacah s.d 10.000",
    learningActivity: "Penggunaan media kartu nilai tempat angka dan permainan tebak bilangan.",
    studentsPresent: 19,
    studentsAbsent: 1,
    absentNotes: "Ahmad Fauzi (Sakit)",
    reflectionNotes: "Anak-anak sangat senang belajar dengan kartu angka. Perlu bimbingan ekstra untuk siswa Rian.",
  },
];

export const initialCalendarEvents: CalendarEvent[] = [
  { id: "cal1", startDate: "2025-07-14", endDate: "2025-07-16", title: "MPLS (Masa Pengenalan Lingkungan Sekolah)", type: "Kegiatan Sekolah", color: "bg-blue-500" },
  { id: "cal2", startDate: "2025-08-17", endDate: "2025-08-17", title: "HUT Kemerdekaan RI ke-80", type: "Libur Nasional", color: "bg-red-500" },
  { id: "cal3", startDate: "2025-09-15", endDate: "2025-09-19", title: "Asesmen Sumatif Tengah Semester Ganjil", type: "Asesmen/Ujian", color: "bg-purple-500" },
  { id: "cal4", startDate: "2025-12-08", endDate: "2025-12-12", title: "Asesmen Sumatif Akhir Semester Ganjil", type: "Asesmen/Ujian", color: "bg-purple-600" },
  { id: "cal5", startDate: "2025-12-22", endDate: "2026-01-02", title: "Libur Semester Ganjil", type: "Libur Semester", color: "bg-amber-500" },
];

export const initialMonthlyEffectiveDays: MonthlyEffectiveDays[] = [
  { monthName: "Juli 2025", totalCalendarDays: 31, totalSundayHolidays: 4, totalNationalHolidays: 2, effectiveDays: 14, effectiveWeeks: 3, notes: "Awal Masuk & MPLS" },
  { monthName: "Agustus 2025", totalCalendarDays: 31, totalSundayHolidays: 5, totalNationalHolidays: 1, effectiveDays: 20, effectiveWeeks: 4, notes: "Kegiatan HUT RI" },
  { monthName: "September 2025", totalCalendarDays: 30, totalSundayHolidays: 4, totalNationalHolidays: 1, effectiveDays: 20, effectiveWeeks: 4, notes: "Sumatif Tengah Semester" },
  { monthName: "Oktober 2025", totalCalendarDays: 31, totalSundayHolidays: 4, totalNationalHolidays: 0, effectiveDays: 23, effectiveWeeks: 5, notes: "Pembelajaran Efektif" },
  { monthName: "November 2025", totalCalendarDays: 30, totalSundayHolidays: 5, totalNationalHolidays: 0, effectiveDays: 21, effectiveWeeks: 4, notes: "Pembelajaran Efektif" },
  { monthName: "Desember 2025", totalCalendarDays: 31, totalSundayHolidays: 4, totalNationalHolidays: 2, effectiveDays: 12, effectiveWeeks: 2, notes: "SAS & Pembagian Raport" },
];

export const initialProta: ProtaItem[] = [
  { id: "pr1", subject: "Bahasa Indonesia", codeTP: "TP-BI-4.1.1", tpDescription: "Menemukan informasi tersurat & tersirat dalam teks narasi lokal", timeAllocationJP: 18, semester: "Ganjil" },
  { id: "pr2", subject: "Bahasa Indonesia", codeTP: "TP-BI-4.2.1", tpDescription: "Menyusun karangan deskripsi tentang lingkungan sekolah dengan ejaan benar", timeAllocationJP: 24, semester: "Ganjil" },
  { id: "pr3", subject: "Matematika", codeTP: "TP-MAT-4.1.1", tpDescription: "Membaca, menulis, membandingkan bilangan cacah sampai 10.000", timeAllocationJP: 20, semester: "Ganjil" },
  { id: "pr4", subject: "Matematika", codeTP: "TP-MAT-4.2.1", tpDescription: "Menhitung keliling dan luas bangun datar sederhana", timeAllocationJP: 22, semester: "Ganjil" },
  { id: "pr5", subject: "IPAS", codeTP: "TP-IPAS-4.1.1", tpDescription: "Menganalisis proses fotosintesis pada tumbuhan hijau", timeAllocationJP: 16, semester: "Ganjil" },
];

export const initialPromes: PromesItem[] = [
  {
    id: "prm1",
    subject: "Bahasa Indonesia",
    codeTP: "TP-BI-4.1.1",
    tpDescription: "Menemukan informasi tersurat & tersirat teks narasi",
    timeAllocationJP: 18,
    semester: "Ganjil",
    monthlyAllocation: {
      "Juli": [0, 0, 4, 4],
      "Agustus": [5, 5, 0, 0],
      "September": [0, 0, 0, 0],
      "Oktober": [0, 0, 0, 0],
      "November": [0, 0, 0, 0],
      "Desember": [0, 0, 0, 0],
    },
  },
  {
    id: "prm2",
    subject: "Matematika",
    codeTP: "TP-MAT-4.1.1",
    tpDescription: "Bilangan Cacah sampai 10.000",
    timeAllocationJP: 20,
    semester: "Ganjil",
    monthlyAllocation: {
      "Juli": [0, 0, 5, 5],
      "Agustus": [5, 5, 0, 0],
      "September": [0, 0, 0, 0],
      "Oktober": [0, 0, 0, 0],
      "November": [0, 0, 0, 0],
      "Desember": [0, 0, 0, 0],
    },
  },
];

export const initialModulAjar: any[] = [
  {
    id: "ma1",
    title: "Modul Ajar IPAS - Fotosintesis Proses Penting di Bumi",
    moduleType: "Intrakurikuler",
    subject: "IPAS",
    gradeClass: "Kelas IV",
    targetClass: "Kelas IV (Fase B)",
    phase: "Fase B",
    category: "Intrakurikuler",
    timeAllocation: "2 x 35 Menit (2 JP)",
    allocationJP: "2 x 35 Menit (2 JP)",
    approach: "Deep Learning",
    learningModel: "Deep Learning (Mindful, Meaningful, Joyful)",
    modelPembelajaran: "Deep Learning (Mindful, Meaningful, Joyful)",
    targetSiswa: "Siswa Reguler (20 Anak)",
    profilPelajarPancasila: ["Bernalar Kritis", "Gotong Royong", "Kreatif"],
    capaianPembelajaran: "Peserta didik menganalisis hubungan antara bentuk serta fungsi bagian tubuh pada tumbuhan dan mengidentifikasi proses fotosintesis.",
    tujuanPembelajaran: "Peserta didik dapat mengidentifikasi kebutuhan tumbuhan untuk melakukan fotosintesis serta memahami dampaknya bagi kehidupan bumi.",
    pemahamanBermakna: "Tumbuhan adalah produsen utama kehidupan di bumi yang menghasilkan oksigen dan makanan melalui proses fotosintesis.",
    pertanyaanPemantik: "Bagaimana tumbuhan makan jika mereka tidak punya mulut seperti manusia?",
    saranaPrasarana: "Daun segar, alkohol 70%, cairan iodium, gelas kimia, air, slide presentasi interaktif.",
    kegiatanPendahuluan: "1. Guru menyapa siswa dengan ramah (Mindful Learning).\n2. Melakukan ice breaking tebak daun hijau (Joyful Learning).\n3. Menyampaikan tujuan pembelajaran dan memantik rasa ingin tahu siswa.",
    kegiatanInti: "Sintaks Deep Learning:\n1. Meaningful Experience: Siswa mengamati tumbuhan hijau di taman sekolah dan merasakan kesegaran udara di dekatnya.\n2. Deep Inquiry: Praktik uji klorofil sederhana dan diskusi kelompok tentang bahan baku fotosintesis (air, CO2, cahaya matahari).\n3. Meaningful Application: Menyusun infografis daur fotosintesis dan mempresentasikannya.",
    kegiatanPenutup: "1. Siswa bersama guru menyimpulkan inti pembelajaran.\n2. Melakukan refleksi perasaan dengan emoticon kuis.\n3. Guru memberikan apresiasi dan doa penutup.",
    asesmenFormatifSumatif: "Asesmen Formatif: Lembar Observasi Diskusi Kelompok & Rubrik Presentasi Infografis.",
    pengayaanRemedial: "Pengayaan: Membuat komik sederhana tentang kisah molekul oksigen.\nRemedial: Bimbingan ulang mengenali 4 syarat fotosintesis.",
    refleksiGuruSiswa: "Guru: 90% siswa aktif berdiskusi. Penggunaan media segar terbukti efektif meningkatkan minat.",
    lampiranLKPD: "LKPD 1: Eksperimen Sederhana Fotosintesis & Lembar Kerja Analisis Bahan Baku Fotosintesis.",
    rubrikPenilaian: "Rubrik Observasi 4 Tingkat Kriteria (Sangat Baik, Baik, Cukup, Perlu Bimbingan)",
    lkpdText: "LKPD 1: Eksperimen Sederhana Fotosintesis & Lembar Kerja Analisis Bahan Baku Fotosintesis.",
    createdAt: "2025-08-10",
    generalInfo: {
      kompetensiAwal: "Peserta didik menganalisis hubungan antara bentuk serta fungsi bagian tubuh pada tumbuhan dan mengidentifikasi proses fotosintesis.",
      profilPelajarPancasila: ["Bernalar Kritis", "Gotong Royong", "Kreatif"],
      saranaPrasarana: "Daun segar, alkohol 70%, cairan iodium, gelas kimia, air, slide presentasi interaktif.",
      targetPesertaDidik: "Siswa Reguler (20 Anak)",
    },
    coreComponent: {
      tujuanPembelajaran: "Peserta didik dapat mengidentifikasi kebutuhan tumbuhan untuk melakukan fotosintesis serta memahami dampaknya bagi kehidupan bumi.",
      pemahamanBermakna: "Tumbuhan adalah produsen utama kehidupan di bumi yang menghasilkan oksigen dan makanan melalui proses fotosintesis.",
      pertanyaanPemantik: "Bagaimana tumbuhan makan jika mereka tidak punya mulut seperti manusia?",
    },
    activities: {
      pendahuluan: "1. Guru menyapa siswa dengan ramah (Mindful Learning).\n2. Melakukan ice breaking tebak daun hijau (Joyful Learning).\n3. Menyampaikan tujuan pembelajaran dan memantik rasa ingin tahu siswa.",
      inti: "Sintaks Deep Learning:\n1. Meaningful Experience: Siswa mengamati tumbuhan hijau di taman sekolah dan merasakan kesegaran udara di dekatnya.\n2. Deep Inquiry: Praktik uji klorofil sederhana dan diskusi kelompok tentang bahan baku fotosintesis (air, CO2, cahaya matahari).\n3. Meaningful Application: Menyusun infografis daur fotosintesis dan mempresentasikannya.",
      penutup: "1. Siswa bersama guru menyimpulkan inti pembelajaran.\n2. Melakukan refleksi perasaan dengan emoticon kuis.\n3. Guru memberikan apresiasi dan doa penutup.",
    },
    assessment: {
      diagnostik: "Tanya jawab lisan diawal tentang tumbuhan hijau",
      formatif: "Asesmen Formatif: Lembar Observasi Diskusi Kelompok & Rubrik Presentasi Infografis.",
      sumatif: "Tes Tertulis Analisis Fotosintesis",
    },
  },
];

export const initialAISettings: AISettings = {
  selectedAgent: "gemini-3.6-flash",
  manualApiKey: "",
  sheetsWebAppUrl: "",
  autoSyncSheets: false,
};

export const initialGASConfig = {
  webAppUrl: "",
  spreadsheetId: "",
  autoSync: false,
};

export const initialUsers: UserAccount[] = [
  {
    id: "usr-1",
    name: "Rachmat Susanto, S.Pd.",
    nip: "198811202014021003",
    email: "rachmatsusanto21@guru.sd.belajar.id",
    role: "Guru Kelas",
    status: "Aktif",
    phone: "081234567890",
  },
  {
    id: "usr-2",
    name: "Kepala Sekolah SDN Pisangcandi 1",
    nip: "197501012000031001",
    email: "kepala.pisangcandi1@sd.belajar.id",
    role: "Kepala Sekolah",
    status: "Aktif",
    phone: "082198765432",
  },
  {
    id: "usr-3",
    name: "Budi Santoso, S.Kom.",
    nip: "199203152019031005",
    email: "operator.pisangcandi1@gmail.com",
    role: "Operator Sekolah",
    status: "Aktif",
    phone: "085712345678",
  },
  {
    id: "usr-4",
    name: "Siti Rahmawati, S.Pd.SD",
    nip: "199005122018012004",
    email: "siti.rahmawati@guru.sd.belajar.id",
    role: "Guru Mapel",
    status: "Aktif",
    phone: "081398761234",
  },
];

export const initialCanvaTemplates = [
  {
    id: "cnv-1",
    title: "Template Modul Ajar Kurikulum Merdeka (Deep Learning)",
    category: "Modul Ajar" as const,
    subject: "Semua Mapel",
    description: "Layout Modul Ajar profesional dengan visual komponen lengkap: Informasi Umum, Komponen Inti, PjBL, dan Rubrik Penilaian.",
    canvaUrl: "https://www.canva.com/templates/?query=modul+ajar+kurikulum+merdeka",
    tags: ["Modul Ajar", "Deep Learning", "Kurikulum Merdeka", "SD/SMP/SMA"],
    isSchoolDefault: true,
  },
  {
    id: "cnv-2",
    title: "Template LKPD Interaktif & Lembar Kerja Siswa Ceria",
    category: "LKPD" as const,
    subject: "Bahasa Indonesia & IPA",
    description: "Lembar Kerja Peserta Didik dengan ilustrasi menarik, tabel pengamatan kelompok, teka-teki, dan kolom refleksi siswa.",
    canvaUrl: "https://www.canva.com/worksheets/templates/",
    tags: ["LKPD", "Worksheet", "LKS", "Interaktif"],
    isSchoolDefault: true,
  },
  {
    id: "cnv-3",
    title: "Slide Presentasi Media Ajar Animatif & Quiz",
    category: "Presentasi" as const,
    subject: "IPAS / Sains",
    description: "Presentasi interaktif dengan peta konsep, animasi pembuka, video singkat, dan kuis pemantik minat belajar murid.",
    canvaUrl: "https://www.canva.com/presentations/templates/",
    tags: ["Presentasi", "Slide Ajar", "IPAS", "Quiz"],
    isSchoolDefault: true,
  },
  {
    id: "cnv-4",
    title: "Banner Sekolah & Infografis Program Profil Pelajar Pancasila",
    category: "Banner / Dekorasi" as const,
    subject: "Kokurikuler P5",
    description: "Template banner kegiatan P5, dekorasi kelas, sudut baca, dan poster aturan kelas ramah anak.",
    canvaUrl: "https://www.canva.com/posters/templates/",
    tags: ["Banner", "P5", "Dekorasi Kelas", "Infografis"],
    isSchoolDefault: true,
  },
  {
    id: "cnv-5",
    title: "Sertifikat Penghargaan & Piagam Prestasi Siswa",
    category: "Sertifikat" as const,
    subject: "Umum / Ekstrakurikuler",
    description: "Piagam penghargaan Bintang Kelas, Juara Lomba, Bintang Kebaikan, dan Kelulusan Fase.",
    canvaUrl: "https://www.canva.com/certificates/templates/",
    tags: ["Sertifikat", "Piagam", "Penghargaan", "Prestasi"],
    isSchoolDefault: true,
  },
];

// Aliases for uppercase imports
export const INITIAL_SCHOOL_IDENTITY = initialSchoolIdentity;
export const INITIAL_STUDENTS = initialStudents;
export const INITIAL_ATTENDANCE = initialAttendanceRecords;
export const INITIAL_CPTP = initialCPTP;
export const INITIAL_INCIDENTS = initialIncidents;
export const INITIAL_GRADES = initialGrades;
export const INITIAL_TIMETABLE = initialTimetable;
export const INITIAL_GUEST_BOOK = initialGuestBook;
export const INITIAL_INCIDENTAL_JOURNALS = initialIncidentalJournals;
export const INITIAL_DAILY_LOGS = initialTeachingJournals;
export const INITIAL_CALENDAR_EVENTS = initialCalendarEvents;
export const INITIAL_PROTA = initialProta;
export const INITIAL_PROMES = initialPromes;
export const INITIAL_TEACHING_MODULES = initialModulAjar;
export const INITIAL_AI_SETTINGS = initialAISettings;
export const INITIAL_GAS_CONFIG = initialGASConfig;
export const INITIAL_USERS = initialUsers;
export const INITIAL_CANVA_TEMPLATES = initialCanvaTemplates;
