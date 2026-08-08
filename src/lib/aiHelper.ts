import { GoogleGenAI } from "@google/genai";

interface GenerateAIOptions {
  prompt: string;
  model?: string;
  manualApiKey?: string;
}

export async function generateAIContent({
  prompt,
  model = "gemini-3.6-flash",
  manualApiKey,
}: GenerateAIOptions): Promise<string> {
  // Normalize model name to avoid deprecated models like gemini-2.5-flash or gemini-1.5-flash
  let targetModel = model;
  if (!targetModel || targetModel.includes("2.5") || targetModel.includes("1.5") || targetModel.includes("2.0")) {
    targetModel = "gemini-3.6-flash";
  }

  // 1. Try Backend API Route first
  try {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        model: targetModel,
        manualApiKey: manualApiKey || undefined,
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
    // If the error was explicitly thrown from data.error above, rethrow unless it's a JSON/fetch syntax error
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
  const apiKey = manualApiKey || (import.meta as any).env?.VITE_GEMINI_API_KEY;

  if (apiKey && apiKey.trim()) {
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

      const response = await ai.models.generateContent({
        model: targetModel,
        contents: prompt,
      });

      if (response.text) {
        return response.text;
      }
      throw new Error("Respon AI kosong dari Gemini API");
    } catch (clientErr: any) {
      throw new Error(`Gagal memproses dengan Gemini API Key: ${clientErr.message || clientErr}`);
    }
  }

  // 3. Helpful error message if no API Key provided on static hosting
  throw new Error(
    "Server API backend tidak terjangkau di lingkungan Vercel/Hosting Statis ini.\n\n" +
    "SOLUSI: Silakan buka menu 'Setelan AI Agen' (ikon Bot di kanan atas), lalu masukkan 'Manual Gemini API Key' Anda untuk mengaktifkan AI."
  );
}
