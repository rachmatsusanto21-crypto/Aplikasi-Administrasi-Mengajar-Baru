import React from "react";
import { SchoolIdentity } from "../types";
import { getDefaultLogoLeft, getDefaultLogoRight } from "../lib/defaultLogos";

interface KopSuratProps {
  schoolIdentity?: Partial<SchoolIdentity>;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const DEFAULT_LOGO_LEFT = "https://lh3.googleusercontent.com/d/1dMJ8rTQxZkcpPe_xtvmMt7aITLYvf_aT";
export const DEFAULT_LOGO_RIGHT = "https://lh3.googleusercontent.com/d/1y5lRPtb_K0Z9U8xe-OS4hkRx2zRHq1cU";

export const KopSurat: React.FC<KopSuratProps> = ({
  schoolIdentity,
  title,
  subtitle,
  className = "",
}) => {
  const fallbackLeft = getDefaultLogoLeft() || DEFAULT_LOGO_LEFT;
  const fallbackRight = getDefaultLogoRight() || DEFAULT_LOGO_RIGHT;

  const logoLeft = schoolIdentity?.logoLeftUrl || schoolIdentity?.logoUrl || fallbackLeft;
  const logoRight = schoolIdentity?.logoRightUrl || fallbackRight;

  const schoolName = schoolIdentity?.schoolName || "SDN PISANGCANDI 1";
  const npsn = schoolIdentity?.npsn || "20533686";
  const address = schoolIdentity?.address || "Jl. Simpang Raya Langsep 14, Kota Malang Kode Pos 65149";
  const phone = schoolIdentity?.phone || "0341-574056";
  const email = schoolIdentity?.email || "sdnpisangcandi1.mlg@google.com";

  return (
    <div className={`border-b-4 border-double border-slate-900 pb-3 mb-5 ${className}`}>
      {schoolIdentity?.kopSuratBannerUrl ? (
        <div className="w-full flex justify-center mb-1">
          <img
            src={schoolIdentity.kopSuratBannerUrl}
            alt="Kop Surat Banner"
            className="w-full max-h-36 object-contain"
          />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 sm:gap-6">
          {/* Logo Kiri */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center flex-shrink-0">
            <img
              src={logoLeft}
              alt="Logo Kiri"
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackLeft;
              }}
            />
          </div>

          {/* Text Header Kop Surat */}
          <div className="flex-1 text-center leading-tight">
            <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wide text-slate-900">
              PEMERINTAH KOTA MALANG
            </h3>
            <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wide text-slate-900">
              DINAS PENDIDIKAN DAN KEBUDAYAAN
            </h3>
            <h2 className="font-extrabold text-base sm:text-xl uppercase tracking-wider text-slate-900 my-0.5">
              {schoolName}
            </h2>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-800">
              NPSN: {npsn}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-800">
              {address}
            </p>
            <p className="text-[10px] sm:text-[11px] text-slate-700">
              Telp. {phone} &nbsp; email: {email}
            </p>
          </div>

          {/* Logo Kanan */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center flex-shrink-0">
            <img
              src={logoRight}
              alt="Logo Kanan"
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackRight;
              }}
            />
          </div>
        </div>
      )}

      {title && (
        <div className="text-center mt-4 pt-2 border-t border-slate-300">
          <h4 className="font-bold text-sm sm:text-base uppercase underline tracking-wider text-slate-900">
            {title}
          </h4>
          {subtitle && <div className="text-xs text-slate-600 font-medium mt-0.5">{subtitle}</div>}
        </div>
      )}
    </div>
  );
};
