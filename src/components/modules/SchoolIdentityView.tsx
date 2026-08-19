import React, { useState, useRef, useEffect } from "react";
import { SchoolIdentity } from "../../types";
import { Building2, Save, Printer, Image, UserCheck, ShieldCheck, Check, Upload, RefreshCw } from "lucide-react";
import { ExportActionBar } from "../ExportActionBar";
import { getDefaultLogoLeft, getDefaultLogoRight } from "../../lib/defaultLogos";
import { compressImageFile } from "../../lib/imageUtils";
import { saveToStorage, STORAGE_KEYS } from "../../lib/storage";

interface SchoolIdentityViewProps {
  identity: SchoolIdentity;
  onSave: (updated: SchoolIdentity) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

export const SchoolIdentityView: React.FC<SchoolIdentityViewProps> = ({
  identity,
  onSave,
  onOpenPrint,
}) => {
  const [formData, setFormData] = useState<SchoolIdentity>(identity);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setFormData((prev) => {
      const banner = identity.kopSuratBannerUrl || (typeof window !== "undefined" ? localStorage.getItem("adm_guru_kop_banner") || "" : "");
      return {
        ...identity,
        kopSuratBannerUrl: banner || identity.kopSuratBannerUrl || prev.kopSuratBannerUrl || "",
      };
    });
  }, [identity]);

  const logoLeftInputRef = useRef<HTMLInputElement>(null);
  const logoRightInputRef = useRef<HTMLInputElement>(null);
  const kopBannerInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: "logoLeftUrl" | "logoRightUrl" | "logoUrl" | "kopSuratBannerUrl"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const isBanner = fieldName === "kopSuratBannerUrl";
      const maxWidth = isBanner ? 1400 : 400;
      const maxHeight = isBanner ? 500 : 400;

      const base64Data = await compressImageFile(file, maxWidth, maxHeight, 0.88);

      if (base64Data) {
        setFormData((prev) => {
          const updated: SchoolIdentity = {
            ...prev,
            [fieldName]: base64Data,
            ...(fieldName === "logoLeftUrl" ? { logoUrl: base64Data } : {}),
          };

          if (isBanner) {
            try {
              localStorage.setItem("adm_guru_kop_banner", base64Data);
            } catch (err) {
              console.error("Gagal simpan adm_guru_kop_banner di localStorage:", err);
            }
          }

          saveToStorage("schoolIdentity", updated);
          saveToStorage(STORAGE_KEYS.IDENTITY, updated);
          onSave(updated);
          return updated;
        });

        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Gagal memproses dan menyimpan file gambar:", err);
    }
  };

  const handleRemoveBanner = () => {
    try {
      localStorage.removeItem("adm_guru_kop_banner");
    } catch {
      /* ignore */
    }
    setFormData((prev) => {
      const updated: SchoolIdentity = {
        ...prev,
        kopSuratBannerUrl: "",
      };
      saveToStorage("schoolIdentity", updated);
      saveToStorage(STORAGE_KEYS.IDENTITY, updated);
      onSave(updated);
      return updated;
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleResetLogoLeft = () => {
    const defaultLeft = getDefaultLogoLeft();
    setFormData((prev) => {
      const updated: SchoolIdentity = {
        ...prev,
        logoLeftUrl: defaultLeft,
        logoUrl: defaultLeft,
      };
      saveToStorage("schoolIdentity", updated);
      saveToStorage(STORAGE_KEYS.IDENTITY, updated);
      onSave(updated);
      return updated;
    });
  };

  const handleResetLogoRight = () => {
    const defaultRight = getDefaultLogoRight();
    setFormData((prev) => {
      const updated: SchoolIdentity = {
        ...prev,
        logoRightUrl: defaultRight,
      };
      saveToStorage("schoolIdentity", updated);
      saveToStorage(STORAGE_KEYS.IDENTITY, updated);
      onSave(updated);
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.kopSuratBannerUrl) {
      try {
        localStorage.setItem("adm_guru_kop_banner", formData.kopSuratBannerUrl);
      } catch (err) {
        console.error("Error setting banner in localStorage:", err);
      }
    } else {
      try {
        localStorage.removeItem("adm_guru_kop_banner");
      } catch {
        /* ignore */
      }
    }
    saveToStorage("schoolIdentity", formData);
    saveToStorage(STORAGE_KEYS.IDENTITY, formData);
    onSave(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handlePrint = () => {
    onOpenPrint(
      "LEMBAR IDENTITAS SATUAN PENDIDIKAN & GURU",
      `Tahun Pelajaran ${formData.academicYear} - Semester ${formData.semester}`,
      (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 border p-4 rounded-lg bg-slate-50">
            <div>
              <p className="text-xs text-slate-500 font-semibold">Nama Sekolah</p>
              <p className="font-bold text-sm text-slate-900">{formData.schoolName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">NPSN</p>
              <p className="font-bold text-sm text-slate-900">{formData.npsn}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Alamat Lengkap</p>
              <p className="text-xs text-slate-900">{formData.address}, Desa {formData.village}, Kec. {formData.district}, {formData.regency}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">Kontak & Email</p>
              <p className="text-xs text-slate-900">{formData.phone} / {formData.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border p-4 rounded-lg">
            <div>
              <h4 className="font-bold text-xs uppercase mb-2 text-emerald-800">Identitas Kepala Sekolah</h4>
              <p className="text-xs"><b>Nama:</b> {formData.headmasterName}</p>
              <p className="text-xs"><b>NIP:</b> {formData.headmasterNip}</p>
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase mb-2 text-emerald-800">Identitas Guru Kelas / Mapel</h4>
              <p className="text-xs"><b>Nama:</b> {formData.teacherName}</p>
              <p className="text-xs"><b>NIP:</b> {formData.teacherNip}</p>
              <p className="text-xs"><b>Kelas / Fase:</b> {formData.gradeClass} ({formData.phase})</p>
            </div>
          </div>
        </div>
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-600" />
            Identitas Sekolah & Pengaturan Akademik
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Atur data sekolah, logo, tahun pelajaran, semester, fase, serta data Kepala Sekolah & Guru
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-300"
          >
            <Printer className="w-4 h-4" />
            Cetak Identitas
          </button>
        </div>
      </div>

      <ExportActionBar
        title="IDENTITAS SATUAN PENDIDIKAN & GURU"
        filename="Identitas_Sekolah_Dan_Guru"
        schoolIdentity={identity}
        headers={["Field", "Nilai / Keterangan"]}
        rows={[
          ["Nama Sekolah", formData.schoolName || "-"],
          ["NPSN", formData.npsn || "-"],
          ["NSS", formData.nss || "-"],
          ["Alamat", `${formData.address}, Desa ${formData.village}, Kec. ${formData.district}, ${formData.regency}`],
          ["Tahun Pelajaran", formData.academicYear || "-"],
          ["Semester", formData.semester || "-"],
          ["Fase & Kelas", `Fase ${formData.phase} - Kelas ${formData.gradeClass}`],
          ["Kepala Sekolah", `${formData.headmasterName} (NIP: ${formData.headmasterNip})`],
          ["Guru Kelas", `${formData.teacherName} (NIP: ${formData.teacherNip})`],
        ]}
        onOpenPrintModal={handlePrint}
      />

      {savedSuccess && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 font-semibold text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-700" />
          Identitas sekolah dan guru berhasil diperbarui!
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Profil Sekolah & Logo */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Image className="w-4 h-4 text-emerald-600" />
            Data Satuan Pendidikan & Logo Sekolah
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Sekolah</label>
                  <input
                    type="text"
                    name="schoolName"
                    value={formData.schoolName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NPSN</label>
                  <input
                    type="text"
                    name="npsn"
                    value={formData.npsn}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Header Kop Surat Line 1 (Opsional)</label>
                  <input
                    type="text"
                    name="governmentHeaderLine1"
                    value={formData.governmentHeaderLine1 || ""}
                    onChange={handleChange}
                    placeholder="PEMERINTAH KOTA MALANG"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Header Kop Surat Line 2 (Opsional)</label>
                  <input
                    type="text"
                    name="governmentHeaderLine2"
                    value={formData.governmentHeaderLine2 || ""}
                    onChange={handleChange}
                    placeholder="DINAS PENDIDIKAN DAN KEBUDAYAAN"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Jalan</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Desa/Kelurahan</label>
                  <input
                    type="text"
                    name="village"
                    value={formData.village}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kecamatan</label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kabupaten/Kota</label>
                  <input
                    type="text"
                    name="regency"
                    value={formData.regency}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Provinsi</label>
                  <input
                    type="text"
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Sekolah</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telepon</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Website</label>
                  <input
                    type="text"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Single Banner / Dual Logo Kop Surat Management */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col space-y-4">
              <span className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <Image className="w-4 h-4 text-emerald-600" />
                Unggah Kop Surat & Logo Sekolah (Base64)
              </span>

              {/* Unggah Kop Surat Banner Gambar Utuh */}
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>🖼️ Unggah Gambar Kop Surat Banner (Header Utuh)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Jika Anda memiliki gambar banner kop surat lengkap (Header Pemkot + Logo + Alamat utuh), unggah di sini.
                    </p>
                  </div>
                  {formData.kopSuratBannerUrl && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                      Kop Surat Banner Aktif
                    </span>
                  )}
                </div>

                {formData.kopSuratBannerUrl ? (
                  <div className="space-y-2">
                    <div className="p-2 border border-emerald-300 bg-emerald-50/50 rounded-lg flex flex-col items-center justify-center">
                      <img
                        src={formData.kopSuratBannerUrl}
                        alt="Kop Surat Banner"
                        className="max-h-28 w-auto object-contain rounded"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => kopBannerInputRef.current?.click()}
                        className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Ganti Gambar Kop Surat</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveBanner}
                        className="py-1.5 px-3 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold rounded-md flex items-center justify-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Gunakan Kop Teks Otomatis</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => kopBannerInputRef.current?.click()}
                    className="p-4 border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/70 rounded-lg cursor-pointer text-center transition-all"
                  >
                    <Upload className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                    <p className="text-xs font-bold text-emerald-800">Klik di sini untuk Unggah Gambar Kop Surat Utuh</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Format PNG, JPG, atau WebP (Otomatis dikonversi ke Base64)</p>
                  </div>
                )}

                <input
                  ref={kopBannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "kopSuratBannerUrl")}
                  className="hidden"
                />
              </div>

              {/* Logo Kiri & Kanan (Opsi Fallback) */}
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 block mb-2">
                  Atau Gunakan Logo Kiri & Kanan (Kop Teks Generator Otomatis):
                </span>
                <div className="grid grid-cols-2 gap-3 text-center">
                  {/* Logo Kiri (Pemkot / Dinas) */}
                  <div className="flex flex-col items-center space-y-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700">Logo Pemkot / Dinas</span>
                    <img
                      src={formData.logoLeftUrl || formData.logoUrl || getDefaultLogoLeft()}
                      alt="Logo Kiri"
                      className="w-14 h-14 object-contain rounded-md border bg-white p-1"
                    />
                    <div className="flex items-center gap-1 w-full">
                      <button
                        type="button"
                        onClick={() => logoLeftInputRef.current?.click()}
                        className="flex-1 py-1 px-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-md flex items-center justify-center gap-1"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Unggah Logo</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetLogoLeft}
                        className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                    <input
                      ref={logoLeftInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "logoLeftUrl")}
                      className="hidden"
                    />
                  </div>

                  {/* Logo Kanan (Sekolah / Tut Wuri) */}
                  <div className="flex flex-col items-center space-y-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700">Logo Sekolah</span>
                    <img
                      src={formData.logoRightUrl || getDefaultLogoRight()}
                      alt="Logo Kanan"
                      className="w-14 h-14 object-contain rounded-md border bg-white p-1"
                    />
                    <div className="flex items-center gap-1 w-full">
                      <button
                        type="button"
                        onClick={() => logoRightInputRef.current?.click()}
                        className="flex-1 py-1 px-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-md flex items-center justify-center gap-1"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Unggah Logo</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetLogoRight}
                        className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                    <input
                      ref={logoRightInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "logoRightUrl")}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 italic text-left">
                💡 <b>Catatan:</b> Gambar Kop Surat Banner utuh yang diunggah akan otomatis tampil di seluruh dokumen cetak dan laporan resmi.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Tahun Pelajaran & Kelas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            Tahun Pelajaran, Semester, Kelas & Fase
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Pelajaran</label>
              <input
                type="text"
                name="academicYear"
                value={formData.academicYear}
                onChange={handleChange}
                placeholder="2025/2026"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Semester</label>
              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fase Kurikulum</label>
              <select
                name="phase"
                value={formData.phase}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="Fase A">Fase A (Kelas 1-2)</option>
                <option value="Fase B">Fase B (Kelas 3-4)</option>
                <option value="Fase C">Fase C (Kelas 5-6)</option>
                <option value="Fase D">Fase D (Kelas 7-9)</option>
                <option value="Fase E">Fase E (Kelas 10)</option>
                <option value="Fase F">Fase F (Kelas 11-12)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kelas</label>
              <input
                type="text"
                name="gradeClass"
                value={formData.gradeClass}
                onChange={handleChange}
                placeholder="Kelas IV-A"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Kepala Sekolah & Guru */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Identitas Kepala Sekolah & Guru Kelas
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Headmaster */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Kepala Sekolah</h4>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  name="headmasterName"
                  value={formData.headmasterName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  name="headmasterNip"
                  value={formData.headmasterNip}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            {/* Teacher */}
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
              <h4 className="font-bold text-xs text-emerald-900 uppercase tracking-wide">Guru Kelas / Wali Kelas</h4>
              <div>
                <label className="block text-xs font-semibold text-emerald-900 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  name="teacherName"
                  value={formData.teacherName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-emerald-900 mb-1">NIP Guru</label>
                <input
                  type="text"
                  name="teacherNip"
                  value={formData.teacherNip}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Simpan Perubahan Identitas
          </button>
        </div>
      </form>
    </div>
  );
};
