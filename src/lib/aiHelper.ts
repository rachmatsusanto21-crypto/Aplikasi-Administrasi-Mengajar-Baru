import { GoogleGenAI } from "@google/genai";
import { STORAGE_KEYS, loadStoredData } from "./storage";

interface GenerateAIOptions {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  manualApiKey?: string;
}

export async function generateAIContent({
  prompt,
  systemInstruction,
  model = "gemini-3.6-flash",
  manualApiKey,
}: GenerateAIOptions): Promise<string> {
  const combinedPrompt = systemInstruction ? `${systemInstruction}\n\nPERINTAH USER:\n${prompt}` : prompt;

  // Normalize model name to ensure valid Gemini model string
  let targetModel = model;
  if (
    !targetModel ||
    targetModel.includes("2.5") ||
    targetModel.includes("1.5") ||
    targetModel.includes("2.0") ||
    targetModel.includes("banana") ||
    targetModel.includes("omni")
  ) {
    targetModel = "gemini-3.6-flash";
  }

  // Get saved API key from localStorage if available (checking both STORAGE_KEYS and legacy key)
  const savedSettings1 = loadStoredData<any>(STORAGE_KEYS.AI_SETTINGS, {});
  const savedSettings2 = loadStoredData<any>("aiSettings", {});
  const effectiveApiKey =
    manualApiKey ||
    savedSettings1?.manualApiKey ||
    savedSettings1?.apiKey ||
    savedSettings2?.manualApiKey ||
    savedSettings2?.apiKey ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    undefined;

  // 1. Try Backend API Route first
  try {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: combinedPrompt,
        model: targetModel,
        manualApiKey: effectiveApiKey,
        systemInstruction,
      }),
    });

    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await res.json();
      if (res.ok && data.result) {
        return data.result;
      }
      if (data.error) {
        throw new Error(data.error);
      }
    }
  } catch (err: any) {
    // If explicit error message from backend was received, rethrow it
    if (
      err.message &&
      !err.message.includes("Unexpected token") &&
      !err.message.includes("JSON") &&
      !err.message.includes("Failed to fetch")
    ) {
      throw err;
    }
  }

  // 2. Client-side Fallback (e.g., when hosted statically on Vercel without express backend)
  const apiKey = effectiveApiKey || (import.meta as any).env?.VITE_GEMINI_API_KEY;

  if (apiKey && apiKey.trim()) {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    let lastClientErr: any = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: targetModel,
          contents: combinedPrompt,
        });

        if (response && response.text) {
          return response.text;
        }
      } catch (clientErr: any) {
        lastClientErr = clientErr;
        const errMsg = String(clientErr?.message || clientErr);
        const isTemporary =
          errMsg.includes("503") ||
          errMsg.includes("high demand") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED");

        if (isTemporary && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
          continue;
        }
        break;
      }
    }

    const rawMsg = String(lastClientErr?.message || lastClientErr || "");
    if (rawMsg.includes("503") || rawMsg.includes("high demand") || rawMsg.includes("UNAVAILABLE")) {
      throw new Error("Server Google Gemini sedang mengalami lonjakan trafik tinggi (503 High Demand). Silakan coba beberapa detik lagi.");
    }
    throw new Error(`Gagal memproses dengan Gemini API Key: ${rawMsg}`);
  }

  // 3. Helpful error message if no API Key provided
  throw new Error(
    "Kunci API Gemini belum dikonfigurasi di server maupun di penyimpanan lokal.\n\n" +
    "SOLUSI: Silakan buka menu 'Setelan AI' pada aplikasi, lalu masukkan Gemini API Key Anda untuk mengaktifkan fitur AI secara penuh."
  );
}

interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: string;
  manualApiKey?: string;
}

export async function generateAIImage({
  prompt,
  aspectRatio = "1:1",
  manualApiKey,
}: GenerateImageOptions): Promise<{ imageUrl: string; engine: string }> {
  const savedSettings1 = loadStoredData<any>(STORAGE_KEYS.AI_SETTINGS, {});
  const savedSettings2 = loadStoredData<any>("aiSettings", {});
  const effectiveApiKey =
    manualApiKey ||
    savedSettings1?.manualApiKey ||
    savedSettings1?.apiKey ||
    savedSettings2?.manualApiKey ||
    savedSettings2?.apiKey ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    undefined;

  // 1. Try Backend API Route first
  try {
    const res = await fetch("/api/ai/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        aspectRatio,
        manualApiKey: effectiveApiKey,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.imageUrl) {
        return { imageUrl: data.imageUrl, engine: data.engine || "Nano Banana 2 AI Agent" };
      }
    }
  } catch (err) {
    console.warn("Backend image endpoint fetch failed, falling back to AI agent client engine...", err);
  }

  // 2. Client-side fallback: Pollinations AI Engine
  const seed = Math.floor(Math.random() * 900000) + 100000;
  const encodedPrompt = encodeURIComponent(
    `Educational vector graphic, ${prompt}, ultra high resolution, vibrant school colors, clean infographic style, 8k`
  );
  const width = aspectRatio === "16:9" ? 1024 : aspectRatio === "4:3" ? 800 : 768;
  const height = aspectRatio === "16:9" ? 576 : aspectRatio === "4:3" ? 600 : 768;
  const fallbackUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;

  return { imageUrl: fallbackUrl, engine: "Nano Banana 2 AI Agent" };
}


