import React, { useState } from "react";
import { Bot, Key, Sparkles, X, Check, Globe } from "lucide-react";
import { AISettings } from "../types";
import { generateAIContent } from "../lib/aiHelper";

interface AIAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiSettings: AISettings;
  onSaveSettings: (settings: AISettings) => void;
}

export const AIAgentModal: React.FC<AIAgentModalProps> = ({
  isOpen,
  onClose,
  aiSettings,
  onSaveSettings,
}) => {
  const [selectedAgent, setSelectedAgent] = useState(aiSettings?.selectedAgent || "gemini-3.6-flash");
  const [manualApiKey, setManualApiKey] = useState(aiSettings?.manualApiKey || "");
  const [sheetsUrl, setSheetsUrl] = useState(aiSettings?.sheetsWebAppUrl || "");
  const [autoSync, setAutoSync] = useState(aiSettings?.autoSyncSheets || false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      selectedAgent,
      manualApiKey,
      sheetsWebAppUrl: sheetsUrl,
      autoSyncSheets: autoSync,
    });
    onClose();
  };

  const handleTestAI = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await generateAIContent({
        prompt: "Sapa guru dengan ramah dan konfirmasi bahwa agen AI telah siap bekerja dalam 1 kalimat pendek.",
        model: selectedAgent,
        manualApiKey: manualApiKey || undefined,
      });
      setTestResult(`✅ Koneksi AI Berhasil! (${result.trim()})`);
    } catch (err: any) {
      setTestResult(`❌ ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Pengaturan Agen AI & API Key</h3>
              <p className="text-xs text-emerald-100">
                Pilih model kecerdasan buatan & konfigurasi kunci akses
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-700">
          {/* AI Model Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Pilih Agen / Model AI
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: "gemini-3.6-flash",
                  name: "Gemini 3.6 Flash",
                  desc: "Kecepatan tinggi, ideal untuk CP/TP & Jurnal",
                  badge: "Rekomendasi",
                },
                {
                  id: "gemini-3.1-pro-preview",
                  name: "Gemini 3.1 Pro",
                  desc: "Penalaran mendalam untuk Modul Ajar Kompleks",
                  badge: "Canggih",
                },
                {
                  id: "gemini-3.1-flash-lite",
                  name: "Gemini Flash Lite",
                  desc: "Ringan & hemat kuota respons cepat",
                  badge: "Ringan",
                },
              ].map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setSelectedAgent(model.id)}
                  className={`p-3.5 text-left rounded-xl border transition-all relative flex flex-col justify-between ${
                    selectedAgent === model.id
                      ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 text-emerald-950"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">{model.name}</span>
                      {selectedAgent === model.id && (
                        <Check className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{model.desc}</p>
                  </div>
                  <span className="inline-block mt-2 text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md w-fit">
                    {model.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual API Key */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <label className="block text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-600" />
              Manual Gemini API Key (Opsional)
            </label>
            <p className="text-xs text-slate-500 mb-2.5">
              Secara default sistem menggunakan Kunci AI bawaan server. Jika Anda ingin menggunakan Kunci API Google AI Studio pribadi, masukkan di bawah ini:
            </p>
            <input
              type="password"
              value={manualApiKey}
              onChange={(e) => setManualApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            />
          </div>

          {/* Google Sheets Sync Quick Setting */}
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/60">
            <label className="block text-sm font-semibold text-emerald-900 mb-1 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-700" />
              Google Sheets Web App Deployment URL
            </label>
            <input
              type="text"
              value={sheetsUrl}
              onChange={(e) => setSheetsUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white mb-2"
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoSync"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <label htmlFor="autoSync" className="text-xs text-slate-700 font-medium">
                Otomatis sinkron ke Google Sheet saat menyimpan perubahan
              </label>
            </div>
          </div>

          {/* Test Connection Result */}
          {testResult && (
            <div
              className={`p-3 text-xs rounded-lg font-medium ${
                testResult.startsWith("✅")
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-red-100 text-red-800 border border-red-200"
              }`}
            >
              {testResult}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestAI}
            disabled={isTesting}
            className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            {isTesting ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Uji Koneksi AI
          </button>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md transition-colors"
            >
              Simpan Pengaturan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
