// Embedded Base64 PNG Logo Generator for 100% Offline & MS Word (.doc/.docx) Compatibility

let cachedLogoLeft: string | null = null;
let cachedLogoRight: string | null = null;

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

/**
 * Generates high-res Base64 PNG for Logo Pemkot Malang / Dinas Pendidikan (Green Shield with Monument & Star)
 */
export function getDefaultLogoLeft(): string {
  if (cachedLogoLeft) return cachedLogoLeft;
  if (typeof document === "undefined") return "";

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.clearRect(0, 0, 240, 240);

    // Outer Green Shield
    ctx.fillStyle = "#15803d"; // Emerald Green
    ctx.beginPath();
    ctx.moveTo(120, 15);
    ctx.lineTo(205, 45);
    ctx.lineTo(195, 175);
    ctx.quadraticCurveTo(120, 230, 120, 230);
    ctx.quadraticCurveTo(120, 230, 45, 175);
    ctx.lineTo(35, 45);
    ctx.closePath();
    ctx.fill();

    // Yellow Border
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#facc15";
    ctx.stroke();

    // Inner Dark Green Shield
    ctx.fillStyle = "#166534";
    ctx.beginPath();
    ctx.moveTo(120, 28);
    ctx.lineTo(192, 54);
    ctx.lineTo(183, 166);
    ctx.quadraticCurveTo(120, 218, 120, 218);
    ctx.quadraticCurveTo(120, 218, 57, 166);
    ctx.lineTo(48, 54);
    ctx.closePath();
    ctx.fill();

    // Tugu Malang Pedestal (White/Gold)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(80, 152, 80, 14);
    ctx.fillRect(92, 138, 56, 14);

    // Column
    ctx.beginPath();
    ctx.moveTo(100, 138);
    ctx.lineTo(105, 75);
    ctx.lineTo(135, 75);
    ctx.lineTo(140, 138);
    ctx.closePath();
    ctx.fill();

    // Crown Spire
    ctx.beginPath();
    ctx.moveTo(120, 48);
    ctx.lineTo(108, 75);
    ctx.lineTo(132, 75);
    ctx.closePath();
    ctx.fill();

    // Bintang Kuning (Top Star)
    ctx.fillStyle = "#facc15";
    drawStar(ctx, 120, 38, 5, 10, 4);

    // Red Ribbon Banner "KOTA MALANG"
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(55, 172, 130, 18);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#facc15";
    ctx.strokeRect(55, 172, 130, 18);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("KOTA MALANG", 120, 185);

    cachedLogoLeft = canvas.toDataURL("image/png");
    return cachedLogoLeft;
  } catch (e) {
    return "";
  }
}

/**
 * Generates high-res Base64 PNG for Logo Sekolah / Tut Wuri Handayani (Red & Blue Shield with Torch & Star)
 */
export function getDefaultLogoRight(): string {
  if (cachedLogoRight) return cachedLogoRight;
  if (typeof document === "undefined") return "";

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.clearRect(0, 0, 240, 240);

    // Outer Red Crest
    ctx.fillStyle = "#b91c1c"; // Crimson
    ctx.beginPath();
    ctx.arc(120, 120, 105, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 6;
    ctx.strokeStyle = "#1e3a8a"; // Navy
    ctx.stroke();

    // Inner Blue Circle
    ctx.fillStyle = "#1d4ed8"; // Royal Blue
    ctx.beginPath();
    ctx.arc(120, 120, 88, 0, Math.PI * 2);
    ctx.fill();

    // White Wing / Open Book
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(120, 130);
    ctx.quadraticCurveTo(85, 118, 52, 135);
    ctx.lineTo(52, 160);
    ctx.quadraticCurveTo(85, 142, 120, 155);
    ctx.quadraticCurveTo(155, 142, 188, 160);
    ctx.lineTo(188, 135);
    ctx.quadraticCurveTo(155, 118, 120, 130);
    ctx.closePath();
    ctx.fill();

    // Torch Flame (Obor Pendidikan)
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(120, 58);
    ctx.quadraticCurveTo(138, 80, 126, 102);
    ctx.quadraticCurveTo(120, 112, 120, 124);
    ctx.quadraticCurveTo(114, 112, 108, 80);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(120, 95, 11, 0, Math.PI * 2);
    ctx.fill();

    // Text SDN PISANGCANDI 1
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SDN PISANGCANDI 1", 120, 188);

    cachedLogoRight = canvas.toDataURL("image/png");
    return cachedLogoRight;
  } catch (e) {
    return "";
  }
}
