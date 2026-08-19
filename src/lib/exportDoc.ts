import { SchoolIdentity } from "../types";
import { getDefaultLogoLeft, getDefaultLogoRight } from "./defaultLogos";

// Helper to convert image URL to Base64 Data URI for native MS Word embedding
export async function getBase64Image(url: string, fallbackType: "left" | "right" | "banner" = "left"): Promise<string> {
  if (!url) {
    if (fallbackType === "banner") return "";
    return fallbackType === "left" ? getDefaultLogoLeft() : getDefaultLogoRight();
  }
  if (url.startsWith("data:")) return url;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width || 120;
        canvas.height = img.naturalHeight || img.height || 120;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL("image/png");
          resolve(dataURL);
          return;
        }
      } catch (e) {
        // Tainted canvas or CORS failure
      }
      resolve(fallbackType === "left" ? getDefaultLogoLeft() : getDefaultLogoRight());
    };
    img.onerror = () => {
      resolve(fallbackType === "left" ? getDefaultLogoLeft() : getDefaultLogoRight());
    };
    img.src = url;
  });
}

interface EmbeddedImage {
  cid: string;
  contentType: string;
  base64Data: string;
}

function parseBase64DataUri(dataUri: string): { contentType: string; base64Data: string } | null {
  if (!dataUri || !dataUri.startsWith("data:")) return null;
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;
  return {
    contentType: match[1] || "image/png",
    base64Data: match[2].replace(/[\r\n\s]/g, ""),
  };
}

/**
 * Scans HTML content for all <img> tags, converts external URLs to Base64 if needed,
 * and converts all Base64 data URIs into Content-ID (cid:) references for MHTML MIME embedding.
 */
async function processHtmlForMhtml(
  html: string
): Promise<{ processedHtml: string; images: EmbeddedImage[] }> {
  const images: EmbeddedImage[] = [];
  const imgMap = new Map<string, string>(); // src -> cid

  const imgRegex = /<img\s+([^>]*src=["']([^"']+)["'][^>]*>)/gi;
  const matches = [...html.matchAll(imgRegex)];

  let processedHtml = html;
  let counter = 0;

  for (const match of matches) {
    const fullTag = match[0];
    const srcUrl = match[2];

    if (!srcUrl) continue;

    if (imgMap.has(srcUrl)) {
      const existingCid = imgMap.get(srcUrl)!;
      const newTag = fullTag.replace(srcUrl, `cid:${existingCid}`);
      processedHtml = processedHtml.replace(fullTag, newTag);
      continue;
    }

    let base64Uri = srcUrl;
    if (!srcUrl.startsWith("data:")) {
      const isRight = fullTag.toLowerCase().includes("logo kanan") || fullTag.toLowerCase().includes("right");
      base64Uri = await getBase64Image(srcUrl, isRight ? "right" : "left");
    }

    const parsed = parseBase64DataUri(base64Uri);
    if (parsed) {
      counter++;
      const ext = parsed.contentType.split("/")[1] || "png";
      const cid = `image_${counter}.${ext}`;

      imgMap.set(srcUrl, cid);
      images.push({
        cid,
        contentType: parsed.contentType,
        base64Data: parsed.base64Data,
      });

      const newTag = fullTag.replace(srcUrl, `cid:${cid}`);
      processedHtml = processedHtml.replace(fullTag, newTag);
    }
  }

  return { processedHtml, images };
}

export async function exportHtmlToDoc({
  htmlContent,
  filename,
  title,
  schoolIdentity,
  paperSize,
  orientation = "portrait",
}: {
  htmlContent: string;
  filename: string;
  title?: string;
  schoolIdentity?: Partial<SchoolIdentity>;
  paperSize?: "A4" | "F4";
  orientation?: "portrait" | "landscape";
}): Promise<void> {
  const effectivePaperSize: "A4" | "F4" =
    paperSize ||
    (typeof window !== "undefined"
      ? (localStorage.getItem("adm_guru_paper_size") as "A4" | "F4")
      : null) ||
    "A4";

  const fallbackLeft = getDefaultLogoLeft();
  const fallbackRight = getDefaultLogoRight();

  const rawLogoLeft = schoolIdentity?.logoLeftUrl || schoolIdentity?.logoUrl || fallbackLeft;
  const rawLogoRight = schoolIdentity?.logoRightUrl || fallbackRight;

  const logoLeft = await getBase64Image(rawLogoLeft, "left");
  const logoRight = await getBase64Image(rawLogoRight, "right");

  const schoolName = schoolIdentity?.schoolName || "SDN PISANGCANDI 1";
  const npsn = schoolIdentity?.npsn || "20533686";
  const address = schoolIdentity?.address || "Jl. Simpang Raya Langsep 14, Kota Malang Kode Pos 65149";
  const phone = schoolIdentity?.phone || "0341-574056";
  const email = schoolIdentity?.email || "sdnpisangcandi1.mlg@google.com";
  const headmasterName = schoolIdentity?.headmasterName || "Kepala Sekolah";
  const headmasterNip = schoolIdentity?.headmasterNip || "-";
  const teacherName = schoolIdentity?.teacherName || "Guru Kelas";
  const teacherNip = schoolIdentity?.teacherNip || "-";
  const academicYear = schoolIdentity?.academicYear || "2025/2026";
  const semester = schoolIdentity?.semester || "Ganjil";
  const gradeClass = schoolIdentity?.gradeClass || "Kelas IV";

  const govLine1 =
    schoolIdentity?.governmentHeaderLine1 ||
    (schoolIdentity?.regency
      ? `PEMERINTAH ${schoolIdentity.regency.toUpperCase()}`
      : "PEMERINTAH KOTA MALANG");
  const govLine2 =
    schoolIdentity?.governmentHeaderLine2 || "DINAS PENDIDIKAN DAN KEBUDAYAAN";

  const bannerUrl =
    schoolIdentity?.kopSuratBannerUrl ||
    (typeof window !== "undefined" ? localStorage.getItem("adm_guru_kop_banner") : null) ||
    "";

  const hasKopInContent =
    htmlContent.includes("kop-table") ||
    htmlContent.includes("PEMERINTAH") ||
    htmlContent.includes("Kop Surat Banner") ||
    htmlContent.includes("kop-line");

  let kopHeaderHtml = "";
  if (!hasKopInContent) {
    if (bannerUrl) {
      const bannerImg = await getBase64Image(bannerUrl, "banner");
      kopHeaderHtml = `
  <div style="text-align: center; margin-bottom: 8px;">
    <img src="${bannerImg}" style="width: 100%; max-width: 680px; height: auto;" alt="Kop Surat Sekolah" />
  </div>
  <div class="kop-line"></div>
`;
    } else {
      kopHeaderHtml = `
  <table class="kop-table">
    <tr>
      <td style="width: 15%; text-align: left; vertical-align: middle;">
        <img src="${logoLeft}" width="70" height="70" style="width: 70px; height: 70px; max-width: 70px; max-height: 70px;" alt="Logo Kiri" />
      </td>
      <td style="width: 70%;" class="kop-text">
        <div style="font-size: 10.5pt; font-weight: bold; text-transform: uppercase; margin: 0;">${govLine1}</div>
        <div style="font-size: 10.5pt; font-weight: bold; text-transform: uppercase; margin: 0;">${govLine2}</div>
        <div style="font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 1pt 0;">${schoolName}</div>
        <div style="font-size: 8.5pt; font-weight: bold; margin: 0;">NPSN: ${npsn}</div>
        <div style="font-size: 8.5pt; margin: 0;">${address}</div>
        <div style="font-size: 8.5pt; margin: 0;">Telp. ${phone} &nbsp; email: ${email}</div>
      </td>
      <td style="width: 15%; text-align: right; vertical-align: middle;">
        <img src="${logoRight}" width="70" height="70" style="width: 70px; height: 70px; max-width: 70px; max-height: 70px;" alt="Logo Kanan" />
      </td>
    </tr>
  </table>
  <div class="kop-line"></div>
`;
    }
  }

  // Margin and size definition based on user specifications:
  // Portrait: Left 2.5cm, Top/Right/Bottom 2.0cm
  // Landscape: Top 2.5cm, Left/Right/Bottom 2.0cm
  const isLandscape = orientation === "landscape";
  const paperSizeCss = isLandscape
    ? effectivePaperSize === "F4"
      ? "33.0cm 21.5cm"
      : "29.7cm 21.0cm"
    : effectivePaperSize === "F4"
    ? "21.5cm 33.0cm"
    : "21.0cm 29.7cm";

  const marginCss = isLandscape
    ? "2.5cm 2.0cm 2.0cm 2.0cm" // Top: 2.5cm, Right: 2.0cm, Bottom: 2.0cm, Left: 2.0cm
    : "2.0cm 2.0cm 2.0cm 2.5cm"; // Top: 2.0cm, Right: 2.0cm, Bottom: 2.0cm, Left: 2.5cm

  const fullHtmlBody = `
<html xmlns:v="urn:schemas-microsoft-com:vml"
xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>${title || filename}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForCustomXSL/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page WordSection1 {
      size: ${paperSizeCss};
      margin: ${marginCss};
      mso-page-orientation: ${orientation};
      mso-header-margin: 35.4pt;
      mso-footer-margin: 35.4pt;
      mso-paper-source: 0;
    }
    div.WordSection1 {
      page: WordSection1;
    }
    body, p, div, td, th {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 10.5pt;
      line-height: 1.15;
      color: #111111;
      margin: 0;
      padding: 0;
      mso-style-noshow: yes;
      mso-para-margin: 0cm;
      mso-para-margin-bottom: .0001pt;
      mso-pagination: widow-orphan;
    }
    p {
      margin-top: 0pt !important;
      margin-bottom: 2pt !important;
      line-height: 1.15 !important;
    }
    table.kop-table {
      width: 100% !important;
      border-collapse: collapse !important;
      border: none !important;
      margin-bottom: 4pt !important;
    }
    table.kop-table td {
      border: none !important;
      padding: 1pt 2pt !important;
      vertical-align: middle !important;
    }
    .kop-text {
      text-align: center !important;
    }
    .kop-line {
      border-bottom: 3px double #000000 !important;
      margin-top: 2pt !important;
      margin-bottom: 8pt !important;
    }
    .doc-title {
      text-align: center !important;
      font-weight: bold !important;
      font-size: 13pt !important;
      text-transform: uppercase !important;
      text-decoration: underline !important;
      margin-top: 4pt !important;
      margin-bottom: 2pt !important;
    }
    .doc-meta {
      text-align: center !important;
      font-size: 9.5pt !important;
      color: #333333 !important;
      margin-bottom: 8pt !important;
    }
    table {
      border-collapse: collapse !important;
      width: 100% !important;
      max-width: 100% !important;
      table-layout: auto !important;
      margin-top: 4pt !important;
      margin-bottom: 6pt !important;
      mso-table-lspace: 0pt !important;
      mso-table-rspace: 0pt !important;
      mso-padding-alt: 2pt 4pt 2pt 4pt !important;
      word-wrap: break-word !important;
    }
    th, td {
      border: 1px solid #333333 !important;
      padding: 3pt 5pt !important;
      text-align: left !important;
      font-size: 9.5pt !important;
      line-height: 1.15 !important;
      vertical-align: top !important;
      mso-line-height-rule: exactly !important;
      word-break: break-word !important;
      overflow-wrap: break-word !important;
    }
    th {
      background-color: #f1f5f9 !important;
      font-weight: bold !important;
      text-align: center !important;
    }
    .signature-table {
      width: 100% !important;
      border-collapse: collapse !important;
      border: none !important;
      margin-top: 15pt !important;
      page-break-inside: avoid !important;
    }
    .signature-table td {
      border: none !important;
      text-align: center !important;
      vertical-align: top !important;
      width: 50% !important;
      padding: 2pt !important;
    }
  </style>
</head>
<body>
<div class="WordSection1">
  ${kopHeaderHtml}

  ${title && !hasKopInContent ? `<div class="doc-title">${title}</div>` : ""}
  ${!hasKopInContent ? `<div class="doc-meta">Tahun Pelajaran: ${academicYear} | Semester: ${semester} | Kelas: ${gradeClass}</div>` : ""}

  <!-- Content -->
  <div>
    ${htmlContent}
  </div>

  ${!hasKopInContent ? `
  <!-- Tanda Tangan -->
  <table class="signature-table">
    <tr>
      <td>
        <p style="margin:0;">Mengetahui,</p>
        <p style="font-weight: bold; margin-top: 2pt; margin-bottom: 40pt;">Kepala Sekolah ${schoolName}</p>
        <p style="font-weight: bold; text-decoration: underline; text-transform: uppercase; margin: 0;">${headmasterName}</p>
        <p style="margin:0;">NIP. ${headmasterNip}</p>
      </td>
      <td>
        <p style="margin:0;">Malang, ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
        <p style="font-weight: bold; margin-top: 2pt; margin-bottom: 40pt;">Guru Kelas / Mata Pelajaran</p>
        <p style="font-weight: bold; text-decoration: underline; text-transform: uppercase; margin: 0;">${teacherName}</p>
        <p style="margin:0;">NIP. ${teacherNip}</p>
      </td>
    </tr>
  </table>
  ` : ""}
</div>
</body>
</html>
`;

  // Process HTML to convert all image tags to CID references and collect image MIME attachments
  const { processedHtml, images } = await processHtmlForMhtml(fullHtmlBody);

  const boundary = "----=_NextPart_MSWORD_DOC_BUILDER_97E74AC1";

  let mhtml = `MIME-Version: 1.0\r\n`;
  mhtml += `Content-Type: multipart/related; boundary="${boundary}"; type="text/html"\r\n\r\n`;

  // Part 1: Main HTML Document
  mhtml += `--${boundary}\r\n`;
  mhtml += `Content-Type: text/html; charset="utf-8"\r\n`;
  mhtml += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
  mhtml += `${processedHtml}\r\n\r\n`;

  // Part 2..N: Embedded Images
  for (const img of images) {
    mhtml += `--${boundary}\r\n`;
    mhtml += `Content-Type: ${img.contentType}\r\n`;
    mhtml += `Content-Transfer-Encoding: base64\r\n`;
    mhtml += `Content-Location: cid:${img.cid}\r\n`;
    mhtml += `Content-ID: <${img.cid}>\r\n\r\n`;
    mhtml += `${img.base64Data}\r\n\r\n`;
  }

  mhtml += `--${boundary}--\r\n`;

  const blob = new Blob([mhtml], {
    type: "application/msword;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const cleanFilename = filename.endsWith(".doc") || filename.endsWith(".docx") ? filename : `${filename}.doc`;
  a.download = cleanFilename;
  a.click();
  URL.revokeObjectURL(url);
}


