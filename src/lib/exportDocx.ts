import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
} from "docx";
import { TeachingModule, SchoolIdentity } from "../types";
import { getDefaultLogoLeft, getDefaultLogoRight } from "./defaultLogos";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface GuestEntryDocx {
  id: string;
  date: string;
  guestName: string;
  institution: string;
  position?: string;
  purpose: string;
  notes?: string;
}

export interface IncidentalJournalDocx {
  id: string;
  date: string;
  incident: string;
  involvedParties: string;
  actionTaken: string;
  followUp: string;
}

// Helper to convert Base64 Data URI to Uint8Array for docx ImageRun
function dataUriToUint8Array(dataUri?: string): Uint8Array | null {
  if (!dataUri) return null;
  try {
    const parts = dataUri.split("base64,");
    if (parts.length < 2) return null;
    const binaryStr = atob(parts[1]);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Failed to convert Data URI to Uint8Array for DOCX image:", e);
    return null;
  }
}

// Utility to create Kop Surat header in Docx with logos
function createKopHeader(school?: Partial<SchoolIdentity>): (Paragraph | Table)[] {
  // Check if uploaded Kop Surat Banner image exists
  if (school?.kopSuratBannerUrl) {
    const bannerBytes = dataUriToUint8Array(school.kopSuratBannerUrl);
    if (bannerBytes) {
      return [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
          },
          children: [
            new ImageRun({
              data: bannerBytes,
              transformation: { width: 550, height: 110 },
              type: "png",
            }),
          ],
        }),
      ];
    }
  }

  const schoolName = school?.schoolName || "SD NEGERI DEMO";
  const address = school?.address || "Jl. Pendidikan No. 1, Desa/Kel. Edukasi";
  const region = `${school?.district ? `Kec. ${school.district}, ` : ""}${school?.regency ? `Kab./Kota ${school.regency}` : ""}`;
  const prov = school?.province ? ` - ${school.province}` : "";

  const govLine1 =
    school?.governmentHeaderLine1 ||
    (school?.regency
      ? `PEMERINTAH ${school.regency.toUpperCase()}`
      : "PEMERINTAH KOTA MALANG");
  const govLine2 =
    school?.governmentHeaderLine2 || "DINAS PENDIDIKAN DAN KEBUDAYAAN";

  // Base64 Data URIs for Logo Left & Logo Right
  const leftDataUri = school?.logoLeftUrl || school?.logoUrl || getDefaultLogoLeft();
  const rightDataUri = school?.logoRightUrl || getDefaultLogoRight();

  const leftBytes = dataUriToUint8Array(leftDataUri);
  const rightBytes = dataUriToUint8Array(rightDataUri);

  const leftChildren: Paragraph[] = leftBytes
    ? [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: leftBytes,
              transformation: { width: 55, height: 55 },
              type: "png",
            }),
          ],
        }),
      ]
    : [];

  const rightChildren: Paragraph[] = rightBytes
    ? [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: rightBytes,
              transformation: { width: 55, height: 55 },
              type: "png",
            }),
          ],
        }),
      ]
    : [];

  const centerChildren = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: govLine1,
          bold: true,
          size: 18,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: govLine2,
          bold: true,
          size: 18,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: schoolName.toUpperCase(),
          bold: true,
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${address} ${region}${prov}`,
          size: 16,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Email: ${school?.email || "-"} | Telp: ${school?.phone || "-"}`,
          size: 14,
          italics: true,
        }),
      ],
    }),
  ];

  const kopTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            children: leftChildren.length ? leftChildren : [new Paragraph({ text: "" })],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: centerChildren,
          }),
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            children: rightChildren.length ? rightChildren : [new Paragraph({ text: "" })],
          }),
        ],
      }),
    ],
  });

  return [kopTable, new Paragraph({ text: "", spacing: { after: 200 } })];
}

// Utility for Signatures block
function createSignatures(school?: Partial<SchoolIdentity>): Table {
  const headmasterName = school?.headmasterName || "Kepala Sekolah, S.Pd.";
  const headmasterNip = school?.headmasterNip || "19800101 200501 1 001";
  const teacherName = school?.teacherName || "Guru Kelas, S.Pd.";
  const teacherNip = school?.teacherNip || "19850202 201001 2 002";
  const city = school?.regency || "Kota";

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ children: [new TextRun({ text: "Mengetahui,", size: 18 })] }),
              new Paragraph({ children: [new TextRun({ text: `Kepala ${school?.schoolName || "Sekolah"}`, bold: true, size: 18 })] }),
              new Paragraph({ text: "", spacing: { after: 800 } }),
              new Paragraph({ children: [new TextRun({ text: headmasterName, bold: true, underline: {}, size: 18 })] }),
              new Paragraph({ children: [new TextRun({ text: `NIP. ${headmasterNip}`, size: 16 })] }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: `${city}, ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`, size: 18 })],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: "Guru Pengampu Kelas / Mapel", bold: true, size: 18 })],
              }),
              new Paragraph({ text: "", spacing: { after: 800 } }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: teacherName, bold: true, underline: {}, size: 18 })],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: `NIP. ${teacherNip}`, size: 16 })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// 1. Export Modul Ajar / RPM ke Format .docx
export async function exportTeachingModuleToDocx(mod: TeachingModule, school?: Partial<SchoolIdentity>) {
  const docChildren: any[] = [];
  const iden = mod.identifikasi || {};
  const desain = mod.desainPembelajaran || {};

  // Kop Surat with embedded Base64 logos
  docChildren.push(...createKopHeader(school));

  // Judul Modul / RPM
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `RENCANA PEMBELAJARAN MENDALAM (RPM)`,
          bold: true,
          size: 24,
        }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `TOPIK: ${(mod.generalInfo?.topik || mod.title || "PEMBELAJARAN").toUpperCase()}`,
          bold: true,
          size: 20,
        }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${school?.schoolName || "SD NEGERI"} | TAHUN AJARAN ${mod.generalInfo?.tahunAjaran || "2026/2027"}`,
          size: 16,
          italics: true,
        }),
      ],
      spacing: { after: 200 },
    })
  );

  // I. INFORMASI UMUM (TABEL)
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "I. INFORMASI UMUM", bold: true, size: 20 })],
      spacing: { after: 100, before: 150 },
    })
  );

  const infoTableRows = [
    new TableRow({
      children: [
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Nama Penyusun", bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: school?.teacherName || "-", size: 16 })] })] }),
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Semester", bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: mod.generalInfo?.semester || "1 (Satu)", size: 16 })] })] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Satuan Pendidikan", bold: true, size: 16 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: school?.schoolName || "-", size: 16 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Bab / Tema", bold: true, size: 16 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: mod.generalInfo?.bab || "Bab 1", size: 16 })] })] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jenjang / Kelas", bold: true, size: 16 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `SD / ${mod.targetClass}`, size: 16 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Topik Pembelajaran", bold: true, size: 16 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: mod.generalInfo?.topik || mod.title, size: 16 })] })] }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Fase / T.A.", bold: true, size: 16 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Fase C / ${mod.generalInfo?.tahunAjaran || "2026/2027"}`, size: 16 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Alokasi Waktu", bold: true, size: 16 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: mod.allocationJP, size: 16 })] })] }),
      ],
    }),
  ];

  docChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: infoTableRows }));

  // II. IDENTIFIKASI
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "II. IDENTIFIKASI", bold: true, size: 20 })],
      spacing: { after: 100, before: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "A. Identifikasi Murid:", bold: true, size: 18 })],
      spacing: { after: 50 },
    }),
    new Paragraph({ children: [new TextRun({ text: `1. Kesiapan Kognitif: `, bold: true, size: 16 }), new TextRun({ text: iden.kesiapanKognitif || "-", size: 16 })] }),
    new Paragraph({ children: [new TextRun({ text: `2. Pengetahuan Awal: `, bold: true, size: 16 }), new TextRun({ text: iden.pengetahuanAwal || "-", size: 16 })] }),
    new Paragraph({ children: [new TextRun({ text: `3. Kebutuhan Belajar: `, bold: true, size: 16 }), new TextRun({ text: iden.kebutuhanBelajar || "-", size: 16 })] }),
    new Paragraph({
      children: [new TextRun({ text: "B. Identifikasi Materi Pembelajaran:", bold: true, size: 18 })],
      spacing: { after: 50, before: 100 },
    }),
    new Paragraph({ children: [new TextRun({ text: `1. Jenis Pengetahuan: `, bold: true, size: 16 }), new TextRun({ text: iden.jenisPengetahuan || "-", size: 16 })] }),
    new Paragraph({ children: [new TextRun({ text: `2. Relevansi & Kesulitan: `, bold: true, size: 16 }), new TextRun({ text: iden.relevansiKesulitan || "-", size: 16 })] }),
    new Paragraph({ children: [new TextRun({ text: `3. Struktur Materi: `, bold: true, size: 16 }), new TextRun({ text: iden.strukturMateri || "-", size: 16 })] }),
    new Paragraph({ children: [new TextRun({ text: `4. Nilai Karakter: `, bold: true, size: 16 }), new TextRun({ text: iden.integrasiNilaiKarakter || "-", size: 16 })] })
  );

  // III. DESAIN PEMBELAJARAN
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "III. DESAIN PEMBELAJARAN", bold: true, size: 20 })],
      spacing: { after: 100, before: 200 },
    }),
    new Paragraph({ children: [new TextRun({ text: "Capaian Pembelajaran (CP): ", bold: true, size: 16 }), new TextRun({ text: desain.capaianPembelajaran || "-", size: 16 })] }),
    new Paragraph({ children: [new TextRun({ text: "Tujuan Pembelajaran (TP): ", bold: true, size: 16 }), new TextRun({ text: desain.tujuanPembelajaran || "-", size: 16 })] }),
    new Paragraph({ children: [new TextRun({ text: "Lintas Disiplin Ilmu: ", bold: true, size: 16 }), new TextRun({ text: desain.lintasDisiplinIlmu || "-", size: 16 })] }),
    new Paragraph({ children: [new TextRun({ text: "Model Pembelajaran: ", bold: true, size: 16 }), new TextRun({ text: `${desain.praktikPedagogis?.model || mod.learningModel} (${desain.praktikPedagogis?.pendekatan || mod.approach})`, size: 16 })] })
  );

  // IV. KEGIATAN PEMBELAJARAN (TABEL SINTAKS)
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "IV. KEGIATAN PEMBELAJARAN (TABEL SINTAKS)", bold: true, size: 20 })],
      spacing: { after: 100, before: 200 },
    })
  );

  if (mod.activitiesTable && mod.activitiesTable.length > 0) {
    const actRows = [
      new TableRow({
        children: [
          new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "No", bold: true, size: 16 })] })] }),
          new TableCell({ width: { size: 27, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Sintaks Model", bold: true, size: 16 })] })] }),
          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Rincian Kegiatan (Mindful, Meaningful, Joyful)", bold: true, size: 16 })] })] }),
          new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Waktu", bold: true, size: 16 })] })] }),
        ],
      }),
      ...mod.activitiesTable.map(
        (act) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(act.no), size: 16 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: act.tahap, bold: true, size: 16 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: act.kegiatan, size: 16 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: act.alokasiWaktu, size: 16 })] })] }),
            ],
          })
      ),
    ];
    docChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: actRows }));
  }

  // V. LAMPIRAN 3: RUBRIK FORMATIF
  if (mod.rubrikFormatif && mod.rubrikFormatif.length > 0) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: "LAMPIRAN: RUBRIK PENILAIAN FORMATIF", bold: true, size: 20 })],
        spacing: { after: 100, before: 200 },
      })
    );

    const formatifRows = [
      new TableRow({
        children: [
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Kriteria", bold: true, size: 16 })] })] }),
          new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Sangat Baik (4)", bold: true, size: 16 })] })] }),
          new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Baik (3)", bold: true, size: 16 })] })] }),
          new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Cukup (2)", bold: true, size: 16 })] })] }),
          new TableCell({ width: { size: 17, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Perlu Bimbingan (1)", bold: true, size: 16 })] })] }),
        ],
      }),
      ...mod.rubrikFormatif.map(
        (rf) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rf.kriteria, bold: true, size: 16 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rf.sangatBaik, size: 16 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rf.baik, size: 16 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rf.cukup, size: 16 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rf.perluBimbingan, size: 16 })] })] }),
            ],
          })
      ),
    ];
    docChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: formatifRows }));
  }

  // VI. LAMPIRAN 5: TABEL KISI-KISI SUMATIF
  if (mod.kisiKisiSumatif && mod.kisiKisiSumatif.length > 0) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: "LAMPIRAN: TABEL KISI-KISI SOAL EVALUASI SUMATIF", bold: true, size: 20 })],
        spacing: { after: 100, before: 200 },
      })
    );

    const kisiRows = [
      new TableRow({
        children: [
          new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "No", bold: true, size: 16 })] })] }),
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Tujuan Pembelajaran", bold: true, size: 16 })] })] }),
          new TableCell({ width: { size: 34, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Indikator Soal", bold: true, size: 16 })] })] }),
          new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Level Kognitif", bold: true, size: 16 })] })] }),
          new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Bentuk Soal", bold: true, size: 16 })] })] }),
        ],
      }),
      ...mod.kisiKisiSumatif.map(
        (kk) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(kk.no), size: 16 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: kk.tujuanPembelajaran || "-", size: 16 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: kk.indikator, size: 16 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: kk.levelKognitif || "C2", size: 16 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: kk.bentukSoal, size: 16 })] })] }),
            ],
          })
      ),
    ];
    docChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: kisiRows }));
  }

  docChildren.push(
    new Paragraph({ text: "", spacing: { after: 300 } }),
    createSignatures(school)
  );

  const doc = new Document({
    sections: [{ children: docChildren }],
  });

  const blob = await Packer.toBlob(doc);
  const cleanTitle = (mod.title || "RPM_Modul_Ajar").replace(/[^a-zA-Z0-9_]/g, "_");
  saveBlob(blob, `RPM_${cleanTitle}.docx`);
}

// 2. Export Buku Tamu & Jurnal Insidental ke Format .docx
export async function exportGuestBookToDocx(
  guests: GuestEntryDocx[],
  incidental: IncidentalJournalDocx[],
  school?: Partial<SchoolIdentity>
) {
  const docChildren: any[] = [];

  // Kop Surat with logos
  docChildren.push(...createKopHeader(school));

  // Judul Dokumen
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "LAPORAN BUKU TAMU & JURNAL INSIDENTAL SEKOLAH",
          bold: true,
          size: 24,
        }),
      ],
      spacing: { after: 300 },
    })
  );

  // Tabel 1: Buku Tamu
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "I. REKAPITULASI BUKU TAMU DINAS / KUNJUNGAN", bold: true, size: 20 })],
      spacing: { after: 100, before: 100 },
    })
  );

  const guestTableRows = [
    new TableRow({
      children: [
        new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "No", bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Tanggal", bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Nama Tamu", bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Instansi / Jabatan", bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Maksud / Keperluan", bold: true, size: 16 })] })] }),
      ],
    }),
    ...guests.map(
      (g, idx) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(idx + 1), size: 16 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: g.date, size: 16 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: g.guestName, bold: true, size: 16 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${g.institution}${g.position ? ` (${g.position})` : ""}`, size: 16 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: g.purpose, size: 16 })] })] }),
          ],
        })
    ),
  ];

  docChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: guestTableRows }));

  // Tabel 2: Jurnal Insidental
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "II. JURNAL KEGIATAN INSIDENTAL & KHUSUS", bold: true, size: 20 })],
      spacing: { after: 100, before: 300 },
    })
  );

  const incidentalRows = [
    new TableRow({
      children: [
        new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "No", bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Tanggal", bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Nama Kegiatan / Peristiwa", bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Pihak Terlibat / Penyelenggara", bold: true, size: 16 })] })] }),
        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Tindakan / Hasil", bold: true, size: 16 })] })] }),
      ],
    }),
    ...incidental.map(
      (inc, idx) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(idx + 1), size: 16 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: inc.date, size: 16 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: inc.incident, bold: true, size: 16 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: inc.involvedParties, size: 16 })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: inc.actionTaken, size: 16 })] })] }),
          ],
        })
    ),
  ];

  docChildren.push(
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: incidentalRows }),
    new Paragraph({ text: "", spacing: { after: 200 } }),
    createSignatures(school)
  );

  const doc = new Document({
    sections: [{ children: docChildren }],
  });

  const blob = await Packer.toBlob(doc);
  saveBlob(blob, "Laporan_Buku_Tamu_dan_Jurnal_Insidental.docx");
}
