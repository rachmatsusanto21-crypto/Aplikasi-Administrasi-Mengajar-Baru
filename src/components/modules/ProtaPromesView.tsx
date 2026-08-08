import React, { useState, useMemo, useCallback } from "react";
import { ProtaItem, PromesItem, CPTPItem, TimetableSlot, CalendarEvent, IncidentalJournalEntry, SchoolIdentity } from "../../types";
import { CalendarRange, Plus, Trash2, Edit2, Download, Printer, FileText, Check, ChevronRight, Calculator, Save, Calendar, BarChart3, TrendingUp, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Layers, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { exportToCSV, getIndonesianNationalHolidayName } from "../../lib/storage";
import { exportHtmlToDoc } from "../../lib/exportDoc";
import { exportProtaToExcel, exportPromesToExcel } from "../../lib/exportExcel";

interface ProtaPromesViewProps {
  protaList: ProtaItem[];
  promesList: PromesItem[];
  cptpItems: CPTPItem[];
  subjects: string[];
  timetable?: TimetableSlot[];
  calendarEvents?: CalendarEvent[];
  incidentalJournals?: IncidentalJournalEntry[];
  schoolIdentity?: SchoolIdentity;
  onSaveProta: (updated: ProtaItem[]) => void;
  onSavePromes: (updated: PromesItem[]) => void;
  onOpenPrint: (
    title: string,
    subtitle: string,
    content: React.ReactNode,
    defaultOrientation?: "portrait" | "landscape",
    defaultPaperSize?: "A4" | "F4" | "Letter" | "Legal" | "Auto"
  ) => void;
}

export const ProtaPromesView: React.FC<ProtaPromesViewProps> = ({
  protaList,
  promesList,
  cptpItems,
  subjects,
  timetable = [],
  calendarEvents = [],
  incidentalJournals = [],
  schoolIdentity,
  onSaveProta,
  onSavePromes,
  onOpenPrint,
}) => {
  const [activeTab, setActiveTab] = useState<"prota" | "promes">("prota");
  const [selectedSubject, setSelectedSubject] = useState(subjects[0] || "Bahasa Indonesia");
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Dashboard Chart state
  const [showDashboardChart, setShowDashboardChart] = useState(true);
  const [chartViewMode, setChartViewMode] = useState<"all_subjects" | "monthly_distribution">("all_subjects");

  // Precision Calculation for Effective JP & Remaining JP (Sisa JP) per Semester
  const jpSummary = useMemo(() => {
    const parseLocalYMD = (str: string) => {
      const parts = (str || "").split("-").map(Number);
      if (parts.length < 3) return new Date();
      return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    };

    const formatLocalYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const startDateStr = schoolIdentity?.academicYearStartDate || "2026-07-13";
    const endDateStr = schoolIdentity?.academicYearEndDate || "2027-06-25";

    const start = parseLocalYMD(startDateStr);
    const end = parseLocalYMD(endDateStr);

    const normalizeSub = (str: string) => (str || "").toLowerCase().trim().replace(/\s+/g, " ");
    const targetSubNorm = normalizeSub(selectedSubject);

    // Build unique day slot allocations from timetable
    let daySlots: Record<string, number> = {};
    const uniqueSlotsMap = new Map<string, TimetableSlot>();
    (timetable || []).forEach((slot) => {
      if (slot.day && slot.period && slot.subject && slot.subject.trim() !== "") {
        const key = `${slot.day.trim()}_${slot.period}`;
        uniqueSlotsMap.set(key, slot);
      }
    });

    uniqueSlotsMap.forEach((slot) => {
      if (normalizeSub(slot.subject) === targetSubNorm) {
        const dayKey = slot.day.trim();
        daySlots[dayKey] = (daySlots[dayKey] || 0) + 1;
      }
    });

    // Compute effective JP for Semester 1 (July-Dec) and Semester 2 (Jan-June)
    let sem1EffectiveJP = 0;
    let sem2EffectiveJP = 0;

    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
      const curr = new Date(start);
      while (curr <= end) {
        const dayIdx = curr.getDay(); // 0 = Sun
        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const currentDayName = dayNames[dayIdx];

        const dateStr = formatLocalYMD(curr);

        const isHoliday =
          dayIdx === 0 ||
          (calendarEvents || []).some((e) => e.isHoliday && dateStr >= e.startDate && dateStr <= e.endDate) ||
          (incidentalJournals || []).some((i) => i.date === dateStr);

        if (dayIdx !== 0 && !isHoliday) {
          const jpOnDay = daySlots[currentDayName] || 0;
          const isSem1 = curr.getMonth() >= 6; // July(6) - Dec(11) is Sem 1
          if (isSem1) {
            sem1EffectiveJP += jpOnDay;
          } else {
            sem2EffectiveJP += jpOnDay;
          }
        }
        curr.setDate(curr.getDate() + 1);
      }
    }

    // Prota TP JP Allocations for selectedSubject
    const sem1ProtaItems = protaList.filter(
      (p) => normalizeSub(p.subject) === targetSubNorm && (p.semester === 1 || p.semester === "Ganjil" || (p.semester as any) === "1")
    );
    const sem2ProtaItems = protaList.filter(
      (p) => normalizeSub(p.subject) === targetSubNorm && (p.semester === 2 || p.semester === "Genap" || (p.semester as any) === "2")
    );

    const sem1ProtaJP = sem1ProtaItems.reduce(
      (acc, curr) => acc + (curr.allocatedJP || curr.timeAllocationJP || 0),
      0
    );
    const sem2ProtaJP = sem2ProtaItems.reduce(
      (acc, curr) => acc + (curr.allocatedJP || curr.timeAllocationJP || 0),
      0
    );

    const sem1SisaJP = sem1EffectiveJP - sem1ProtaJP;
    const sem2SisaJP = sem2EffectiveJP - sem2ProtaJP;

    return {
      sem1EffectiveJP,
      sem1ProtaJP,
      sem1SisaJP,
      sem2EffectiveJP,
      sem2ProtaJP,
      sem2SisaJP,
    };
  }, [selectedSubject, timetable, calendarEvents, incidentalJournals, schoolIdentity, protaList]);

  const filteredProta = useMemo(
    () =>
      protaList.filter(
        (p) =>
          p.subject === selectedSubject &&
          (p.semester === selectedSemester ||
            p.semester === (selectedSemester === 1 ? "Ganjil" : "Genap"))
      ),
    [protaList, selectedSubject, selectedSemester]
  );

  // Available CPs/TPs for selected subject
  const availableTPs = useMemo(
    () =>
      cptpItems.filter((item) => {
        if (item.subject === selectedSubject) return true;
        const selNorm = selectedSubject.toLowerCase();
        const itemNorm = (item.subject || "").toLowerCase();
        if (
          (selNorm.includes("kokurikuler") || selNorm.includes("p5")) &&
          (itemNorm.includes("kokurikuler") || itemNorm.includes("p5"))
        ) {
          return true;
        }
        return false;
      }),
    [cptpItems, selectedSubject]
  );

  const [protaForm, setProtaForm] = useState<Partial<ProtaItem>>({
    subject: selectedSubject,
    semester: selectedSemester,
    allocatedJP: 6,
    element: "Umum",
    tpCode: "",
    tpDescription: "",
  });

  const handleDeleteProta = (id: string) => {
    onSaveProta(protaList.filter((p) => p.id !== id));
  };

  const handleOpenAddProta = () => {
    setEditingId(null);
    const firstTP = availableTPs[0];
    setProtaForm({
      subject: selectedSubject,
      semester: selectedSemester,
      element: firstTP ? firstTP.element : "Umum",
      tpCode: firstTP ? firstTP.codeTP : `TP-4.${filteredProta.length + 1}`,
      tpDescription: firstTP ? firstTP.descriptionTP : "",
      allocatedJP: 6,
    });
    setIsModalOpen(true);
  };

  const handleSelectTPFromDropdown = (codeTP: string) => {
    const found = availableTPs.find((t) => t.codeTP === codeTP);
    if (found) {
      setProtaForm((prev) => ({
        ...prev,
        tpCode: found.codeTP,
        codeTP: found.codeTP,
        element: found.element,
        tpDescription: found.descriptionTP,
      }));
    } else {
      setProtaForm((prev) => ({
        ...prev,
        tpCode: codeTP,
        codeTP,
      }));
    }
  };

  const handleOpenEditProta = (item: ProtaItem) => {
    setEditingId(item.id);
    setProtaForm(item);
    setIsModalOpen(true);
  };

  const handleSaveProtaForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!protaForm.tpDescription) return;

    if (editingId) {
      onSaveProta(
        protaList.map((p) => (p.id === editingId ? ({ ...p, ...protaForm } as ProtaItem) : p))
      );
    } else {
      const newItem: ProtaItem = {
        id: "prota_" + Date.now(),
        subject: protaForm.subject || selectedSubject,
        element: protaForm.element || "Umum",
        codeTP: protaForm.tpCode || protaForm.codeTP || "TP-1",
        tpCode: protaForm.tpCode || protaForm.codeTP || "TP-1",
        tpDescription: protaForm.tpDescription || "",
        timeAllocationJP: protaForm.allocatedJP || 6,
        allocatedJP: protaForm.allocatedJP || 6,
        semester: (protaForm.semester as any) || selectedSemester,
      };
      onSaveProta([...protaList, newItem]);
    }
    setIsModalOpen(false);
  };

  const totalJP = useMemo(
    () => filteredProta.reduce((acc, curr) => acc + (curr.allocatedJP || curr.timeAllocationJP || 0), 0),
    [filteredProta]
  );

  // Promes Months depending on selected semester
  const promesMonths = useMemo(
    () =>
      selectedSemester === 1
        ? ["Juli", "Agustus", "September", "Oktober", "November", "Desember"]
        : ["Januari", "Februari", "Maret", "April", "Mei", "Juni"],
    [selectedSemester]
  );

  // W1, W2, W3, W4, W5 (5 Minggu per Bulan)
  const weeksPerMonth = useMemo(() => [1, 2, 3, 4, 5], []);

  // Indonesian National Holiday helper function
  const getIndonesianNationalHolidayName = (dateStr: string): string | null => {
    if (!dateStr || dateStr.length < 10) return null;
    const monthDay = dateStr.slice(5);

    // Fixed date national holidays (Every year)
    const fixedHolidays: Record<string, string> = {
      "01-01": "Tahun Baru Masehi",
      "05-01": "Hari Buruh Internasional",
      "06-01": "Hari Lahir Pancasila",
      "08-17": "Hari Kemerdekaan RI",
      "10-28": "Hari Sumpah Pemuda",
      "11-10": "Hari Pahlawan",
      "12-25": "Hari Raya Natal",
      "12-26": "Cuti Bersama Natal",
    };
    if (fixedHolidays[monthDay]) return fixedHolidays[monthDay];

    // Moveable / Lunar National Holidays & Cuti Bersama (2024 - 2028)
    const moveableHolidays: Record<string, string> = {
      // 2024
      "2024-02-08": "Isra Mikraj Nabi Muhammad SAW",
      "2024-02-10": "Tahun Baru Imlek 2575",
      "2024-03-11": "Hari Suci Nyepi Saka 1946",
      "2024-03-29": "Wafat Yesus Kristus",
      "2024-03-31": "Hari Paskah",
      "2024-04-10": "Hari Raya Idul Fitri 1445 H",
      "2024-04-11": "Hari Raya Idul Fitri 1445 H",
      "2024-05-09": "Kenaikan Yesus Kristus",
      "2024-05-23": "Hari Raya Waisak 2568 BE",
      "2024-06-17": "Hari Raya Idul Adha 1445 H",
      "2024-07-07": "Tahun Baru Islam 1446 H",
      "2024-09-16": "Maulid Nabi Muhammad SAW",

      // 2025
      "2025-01-27": "Isra Mikraj Nabi Muhammad SAW",
      "2025-01-29": "Tahun Baru Imlek 2576",
      "2025-03-29": "Hari Suci Nyepi Saka 1947",
      "2025-03-31": "Hari Raya Idul Fitri 1446 H",
      "2025-04-01": "Hari Raya Idul Fitri 1446 H",
      "2025-04-02": "Cuti Bersama Idul Fitri 1446 H",
      "2025-04-03": "Cuti Bersama Idul Fitri 1446 H",
      "2025-04-04": "Cuti Bersama Idul Fitri 1446 H",
      "2025-04-07": "Cuti Bersama Idul Fitri 1446 H",
      "2025-04-18": "Wafat Yesus Kristus",
      "2025-04-20": "Hari Paskah",
      "2025-05-12": "Hari Raya Waisak 2569 BE",
      "2025-05-29": "Kenaikan Yesus Kristus",
      "2025-06-06": "Hari Raya Idul Adha 1446 H",
      "2025-06-27": "Tahun Baru Islam 1447 H",
      "2025-09-05": "Maulid Nabi Muhammad SAW",

      // 2026
      "2026-01-16": "Isra Mikraj Nabi Muhammad SAW",
      "2026-02-17": "Tahun Baru Imlek 2577",
      "2026-03-19": "Hari Suci Nyepi Saka 1948",
      "2026-03-20": "Hari Raya Idul Fitri 1447 H",
      "2026-03-21": "Hari Raya Idul Fitri 1447 H",
      "2026-03-22": "Cuti Bersama Idul Fitri 1447 H",
      "2026-03-23": "Cuti Bersama Idul Fitri 1447 H",
      "2026-03-24": "Cuti Bersama Idul Fitri 1447 H",
      "2026-03-25": "Cuti Bersama Idul Fitri 1447 H",
      "2026-04-03": "Wafat Yesus Kristus",
      "2026-05-14": "Kenaikan Yesus Kristus",
      "2026-05-27": "Hari Raya Idul Adha 1447 H",
      "2026-05-31": "Hari Raya Waisak 2570 BE",
      "2026-06-16": "Tahun Baru Islam 1448 H",
      "2026-08-25": "Maulid Nabi Muhammad SAW",

      // 2027
      "2027-02-06": "Tahun Baru Imlek 2578",
      "2027-02-15": "Isra Mikraj Nabi Muhammad SAW",
      "2027-03-09": "Hari Suci Nyepi Saka 1949",
      "2027-03-10": "Hari Raya Idul Fitri 1448 H",
      "2027-03-11": "Hari Raya Idul Fitri 1448 H",
      "2027-03-26": "Wafat Yesus Kristus",
      "2027-05-06": "Kenaikan Yesus Kristus",
      "2027-05-16": "Hari Raya Idul Adha 1448 H",
      "2027-05-20": "Hari Raya Waisak 2571 BE",
      "2027-06-06": "Tahun Baru Islam 1449 H",
      "2027-08-15": "Maulid Nabi Muhammad SAW",

      // 2028
      "2028-01-24": "Isra Mikraj Nabi Muhammad SAW",
      "2028-01-26": "Tahun Baru Imlek 2579",
      "2028-02-26": "Hari Raya Idul Fitri 1449 H",
      "2028-02-27": "Hari Raya Idul Fitri 1449 H",
      "2028-03-26": "Hari Suci Nyepi Saka 1950",
      "2028-04-14": "Wafat Yesus Kristus",
      "2028-05-08": "Hari Raya Waisak 2572 BE",
      "2028-05-25": "Kenaikan Yesus Kristus",
      "2028-06-05": "Hari Raya Idul Adha 1449 H",
      "2028-06-25": "Tahun Baru Islam 1450 H",
      "2028-08-03": "Maulid Nabi Muhammad SAW",
    };

    return moveableHolidays[dateStr] || null;
  };

  // Precision Week Analysis Map for Partial Week / Event / National Holidays (Orange Amber)
  const weekAnalysisMap = useMemo(() => {
    const map: Record<
      string,
      {
        status: "NORMAL" | "PARTIAL_ORANGE";
        availableJP: number;
        normalJP: number;
        hasNationalHoliday?: boolean;
        nationalHolidaysList?: string[];
        reason: string;
      }
    > = {};

    const parseLocalYMD = (str: string) => {
      const parts = (str || "").split("-").map(Number);
      if (parts.length < 3) return new Date();
      return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    };

    const formatLocalYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const startYMD = schoolIdentity?.academicYearStartDate || "2026-07-13";
    const endYMD = schoolIdentity?.academicYearEndDate || "2027-06-25";

    const startYear = parseInt(startYMD.split("-")[0]) || 2026;
    const endYear = parseInt(endYMD.split("-")[0]) || 2027;

    const monthNameToIndexSem1: Record<string, number> = {
      Juli: 6,
      Agustus: 7,
      September: 8,
      Oktober: 9,
      November: 10,
      Desember: 11,
    };
    const monthNameToIndexSem2: Record<string, number> = {
      Januari: 0,
      Februari: 1,
      Maret: 2,
      April: 3,
      Mei: 4,
      Juni: 5,
    };

    const normalizeSub = (str: string) => (str || "").toLowerCase().trim().replace(/\s+/g, " ");
    const targetSubNorm = normalizeSub(selectedSubject);

    // Build day slots for target subject from Timetable
    const daySlots: Record<string, number> = {};
    const uniqueSlotsMap = new Map<string, TimetableSlot>();
    (timetable || []).forEach((slot) => {
      if (slot.day && slot.period && slot.subject && slot.subject.trim() !== "") {
        const key = `${slot.day.trim()}_${slot.period}`;
        uniqueSlotsMap.set(key, slot);
      }
    });

    uniqueSlotsMap.forEach((slot) => {
      if (normalizeSub(slot.subject) === targetSubNorm) {
        const dayKey = slot.day.trim();
        daySlots[dayKey] = (daySlots[dayKey] || 0) + 1;
      }
    });

    let normalWeeklyJP = Object.values(daySlots).reduce((a, b) => a + b, 0);

    // Fallback if Timetable is not configured for target subject
    if (normalWeeklyJP === 0) {
      const totalProtaAllocated = filteredProta.reduce(
        (sum, p) => sum + (p.allocatedJP || p.timeAllocationJP || 0),
        0
      );
      if (totalProtaAllocated > 0) {
        normalWeeklyJP = Math.max(2, Math.round(totalProtaAllocated / 18));
      } else {
        const normName = normalizeSub(selectedSubject);
        if (normName.includes("indonesia") || normName.includes("indo")) normalWeeklyJP = 6;
        else if (normName.includes("matematika") || normName.includes("ipas")) normalWeeklyJP = 5;
        else if (normName.includes("pancasila") || normName.includes("pkn")) normalWeeklyJP = 4;
        else if (normName.includes("agama") || normName.includes("pjok") || normName.includes("seni")) normalWeeklyJP = 3;
        else if (normName.includes("inggris")) normalWeeklyJP = 2;
        else normalWeeklyJP = 4;
      }

      if (normalWeeklyJP === 6) {
        daySlots["Senin"] = 3;
        daySlots["Rabu"] = 3;
      } else if (normalWeeklyJP === 5) {
        daySlots["Selasa"] = 3;
        daySlots["Kamis"] = 2;
      } else if (normalWeeklyJP === 4) {
        daySlots["Senin"] = 2;
        daySlots["Kamis"] = 2;
      } else if (normalWeeklyJP === 3) {
        daySlots["Jumat"] = 3;
      } else {
        daySlots["Rabu"] = 2;
      }
    }

    const monthsList = selectedSemester === 1 ? Object.keys(monthNameToIndexSem1) : Object.keys(monthNameToIndexSem2);

    monthsList.forEach((m) => {
      const monthIdx = selectedSemester === 1 ? monthNameToIndexSem1[m] : monthNameToIndexSem2[m];
      const yr = selectedSemester === 1 ? startYear : endYear;

      weeksPerMonth.forEach((w) => {
        const key = `${m}_w${w}`;

        const startDayNum = (w - 1) * 7 + 1;
        const daysInMonth = new Date(yr, monthIdx + 1, 0).getDate();
        const endDayNum = w === 5 ? daysInMonth : Math.min(daysInMonth, w * 7);

        let scheduledJPThisWeek = 0;
        let lostJPThisWeek = 0;
        let holidayReasons: string[] = [];
        let nationalHolidaysInWeek: string[] = [];

        for (let dayNum = startDayNum; dayNum <= endDayNum; dayNum++) {
          const testDate = new Date(yr, monthIdx, dayNum, 12, 0, 0);
          const dayOfWeek = testDate.getDay(); // 0 = Sun
          if (dayOfWeek === 0) continue; // skip Sunday

          const dateStr = formatLocalYMD(testDate);

          const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
          const dayName = dayNames[dayOfWeek];
          const jpOnThisDay = daySlots[dayName] || 0;

          const natHolidayName = getIndonesianNationalHolidayName(dateStr);
          const matchEvt = (calendarEvents || []).find(
            (e) => e.startDate && dateStr >= e.startDate && dateStr <= (e.endDate || e.startDate)
          );
          const matchIncidental = (incidentalJournals || []).some((i) => i.date === dateStr);
          const isOutOfTerm = dateStr < startYMD || dateStr > endYMD;

          const isHolidayDay = isOutOfTerm || Boolean(natHolidayName) || Boolean(matchEvt) || matchIncidental;

          if (jpOnThisDay > 0) {
            scheduledJPThisWeek += jpOnThisDay;
            if (isHolidayDay) {
              lostJPThisWeek += jpOnThisDay;
              if (natHolidayName) {
                holidayReasons.push(`${dayName} (Libur Nasional: ${natHolidayName})`);
                nationalHolidaysInWeek.push(`${dayName}: ${natHolidayName}`);
              } else if (matchEvt) {
                holidayReasons.push(`${dayName} (${matchEvt.title})`);
              } else if (isOutOfTerm) {
                holidayReasons.push(`${dayName} (Diluar TP)`);
              } else {
                holidayReasons.push(`${dayName} (Kegiatan/Libur)`);
              }
            }
          } else if (natHolidayName) {
            nationalHolidaysInWeek.push(`${dayName}: ${natHolidayName}`);
          }
        }

        const baseNormal = scheduledJPThisWeek > 0 ? scheduledJPThisWeek : normalWeeklyJP;
        const remainingJP = Math.max(0, baseNormal - lostJPThisWeek);

        if (lostJPThisWeek > 0 || nationalHolidaysInWeek.length > 0) {
          map[key] = {
            status: "PARTIAL_ORANGE",
            availableJP: remainingJP,
            normalJP: baseNormal,
            hasNationalHoliday: nationalHolidaysInWeek.length > 0,
            nationalHolidaysList: nationalHolidaysInWeek,
            reason: lostJPThisWeek > 0
              ? `Ada Libur/Event (${holidayReasons.join(", ")}) — Sisa ${remainingJP} JP dari normal ${baseNormal} JP`
              : `Ada Libur Nasional (${nationalHolidaysInWeek.join(", ")})`,
          };
        } else {
          map[key] = {
            status: "NORMAL",
            availableJP: baseNormal,
            normalJP: baseNormal,
            hasNationalHoliday: false,
            nationalHolidaysList: [],
            reason: `Minggu Efektif Penuh (${baseNormal} JP)`,
          };
        }
      });
    });

    return map;
  }, [selectedSubject, selectedSemester, timetable, calendarEvents, incidentalJournals, schoolIdentity, filteredProta]);

  // State for Promes weekly allocation map
  // Key: `${protaId}_${monthName}_w${weekNumber}` -> JP allocation number (e.g., 2)
  const [promesWeeklyAllocations, setPromesWeeklyAllocations] = useState<Record<string, number>>({});
  const [promesInputMode, setPromesInputMode] = useState<"manual" | "click">("manual");
  const [savedPromesAlert, setSavedPromesAlert] = useState(false);

  // Function to calculate sequential schedule-aware Promes allocation
  const computeAutoFill = useCallback(
    (
      protaItems: ProtaItem[],
      months: string[],
      weeks: number[],
      analysisMap: Record<string, { availableJP: number }>
    ) => {
      const newMap: Record<string, number> = {};
      if (!protaItems || protaItems.length === 0) return newMap;

      const weekKeys: string[] = [];
      months.forEach((m) => {
        weeks.forEach((w) => {
          weekKeys.push(`${m}_w${w}`);
        });
      });

      const weekCapacity: Record<string, number> = {};
      weekKeys.forEach((wk) => {
        const weekAnalysis = analysisMap[wk];
        weekCapacity[wk] = weekAnalysis ? weekAnalysis.availableJP : 0;
      });

      let currentWeekIdx = 0;

      protaItems.forEach((p) => {
        const target = p.allocatedJP || p.timeAllocationJP || 0;
        let remainingTP = target;

        while (remainingTP > 0 && currentWeekIdx < weekKeys.length) {
          const wk = weekKeys[currentWeekIdx];
          const cap = weekCapacity[wk] || 0;

          if (cap <= 0) {
            currentWeekIdx++;
            continue;
          }

          const allocate = Math.min(cap, remainingTP);
          const altCellKey = `${p.id}_${wk}`;
          newMap[altCellKey] = (newMap[altCellKey] || 0) + allocate;

          remainingTP -= allocate;
          weekCapacity[wk] -= allocate;

          if (weekCapacity[wk] <= 0) {
            currentWeekIdx++;
          }
        }
      });

      return newMap;
    },
    []
  );

  // Sync / Load saved Promes data from prop promesList when subject or semester changes
  React.useEffect(() => {
    const loadedMap: Record<string, number> = {};

    filteredProta.forEach((p) => {
      const matchingPromes = promesList.find(
        (item) =>
          (item as any).protaId === p.id ||
          (item.subject === p.subject &&
            item.codeTP === (p.tpCode || p.codeTP) &&
            (item.semester === p.semester || item.semester === (selectedSemester === 1 ? "Ganjil" : "Genap")))
      );

      promesMonths.forEach((m) => {
        weeksPerMonth.forEach((w) => {
          const key = `${p.id}_${m}_w${w}`;
          if (matchingPromes?.weeklyAllocations && matchingPromes.weeklyAllocations[key] !== undefined) {
            loadedMap[key] = matchingPromes.weeklyAllocations[key];
          } else if (matchingPromes?.weeklyAllocations && matchingPromes.weeklyAllocations[`${m}_w${w}`] !== undefined) {
            loadedMap[key] = matchingPromes.weeklyAllocations[`${m}_w${w}`];
          } else if (matchingPromes?.monthlyAllocation && Array.isArray(matchingPromes.monthlyAllocation[m])) {
            const valInArray = matchingPromes.monthlyAllocation[m][w - 1];
            if (valInArray !== undefined) {
              loadedMap[key] = valInArray;
            }
          }
        });
      });
    });

    const hasValues = Object.values(loadedMap).some((v) => v > 0);

    if (hasValues) {
      setPromesWeeklyAllocations(loadedMap);
    } else {
      const autoFilled = computeAutoFill(filteredProta, promesMonths, weeksPerMonth, weekAnalysisMap);
      setPromesWeeklyAllocations(autoFilled);
    }
  }, [selectedSubject, selectedSemester, promesList, protaList]);

  // Workload comparison per subject across the current semester
  const subjectWorkloadStats = useMemo(() => {
    return subjects.map((sub) => {
      const normalizeSub = (str: string) => (str || "").toLowerCase().trim().replace(/\s+/g, " ");
      const subNorm = normalizeSub(sub);

      // Target JP from Prota for selected semester
      const subProta = protaList.filter(
        (p) =>
          normalizeSub(p.subject) === subNorm &&
          (p.semester === selectedSemester || p.semester === (selectedSemester === 1 ? "Ganjil" : "Genap"))
      );
      const targetJP = subProta.reduce((acc, p) => acc + (p.allocatedJP || p.timeAllocationJP || 0), 0);

      // Timetable weekly slots
      const weeklySlots = (timetable || []).filter(
        (t) => t.subject && normalizeSub(t.subject) === subNorm
      ).length;

      // Total filled Promes JP
      let filledPromesJP = 0;
      if (sub === selectedSubject) {
        filledPromesJP = (Object.values(promesWeeklyAllocations) as number[]).reduce((acc: number, v: number) => acc + Number(v || 0), 0);
      } else {
        const subPromes = promesList.filter((pr) => normalizeSub(pr.subject || "") === subNorm);
        filledPromesJP = subPromes.reduce((acc: number, pr) => {
          const alloc = pr.monthlyAllocation || {};
          let sumW = 0;
          Object.values(alloc).forEach((weeks) => {
            if (Array.isArray(weeks)) {
              weeks.forEach((w) => {
                sumW += Number(w || 0);
              });
            }
          });
          return acc + sumW;
        }, 0);
      }

      return {
        subject: sub,
        shortSubject: sub.length > 10 ? sub.substring(0, 9) + "…" : sub,
        "Target Prota (JP)": targetJP,
        "Terisi Promes (JP)": filledPromesJP,
        "Jadwal Mingguan (JP)": weeklySlots,
        balance: filledPromesJP - targetJP,
      };
    });
  }, [subjects, protaList, selectedSemester, timetable, selectedSubject, promesWeeklyAllocations, promesList]);

  // Monthly JP distribution for current selected subject
  const monthlyDistributionData = useMemo(() => {
    return promesMonths.map((m) => {
      let monthFilled = 0;
      let monthCapacity = 0;

      weeksPerMonth.forEach((w) => {
        const wk = `${m}_w${w}`;
        const weekInfo = weekAnalysisMap[wk];
        monthCapacity += weekInfo ? weekInfo.availableJP : 0;

        filteredProta.forEach((p) => {
          const key = `${p.id}_${m}_w${w}`;
          monthFilled += promesWeeklyAllocations[key] || 0;
        });
      });

      return {
        month: m,
        "Kapasitas Efektif (JP)": monthCapacity,
        "Terisi Promes (JP)": monthFilled,
      };
    });
  }, [promesMonths, weeksPerMonth, weekAnalysisMap, filteredProta, promesWeeklyAllocations]);

  // Dashboard summary stats
  const dashboardSummary = useMemo(() => {
    const totalSubjects = subjects.length;
    let optimalCount = 0;
    let underCount = 0;
    let overCount = 0;

    subjectWorkloadStats.forEach((stat) => {
      const target = stat["Target Prota (JP)"];
      const filled = stat["Terisi Promes (JP)"];
      if (filled === target && target > 0) optimalCount++;
      else if (filled < target) underCount++;
      else if (filled > target) overCount++;
    });

    const totalTimetableWeeklySlots = (timetable || []).filter((t) => t.subject && t.subject.trim() !== "").length;

    return {
      totalSubjects,
      optimalCount,
      underCount,
      overCount,
      totalTimetableWeeklySlots,
    };
  }, [subjects, subjectWorkloadStats, timetable]);

  const handleUpdatePromesJP = (protaId: string, month: string, week: number, val: number) => {
    const key = `${protaId}_${month}_w${week}`;
    const cleanVal = isNaN(val) ? 0 : Math.max(0, Math.min(40, val));
    setPromesWeeklyAllocations((prev) => ({
      ...prev,
      [key]: cleanVal,
    }));
  };

  const handleTogglePromesWeek = (protaId: string, month: string, week: number) => {
    const key = `${protaId}_${month}_w${week}`;
    const currentVal = promesWeeklyAllocations[key] || 0;
    const nextVal = currentVal === 0 ? 2 : currentVal === 2 ? 4 : 0; // cycles 0 -> 2 -> 4 -> 0
    setPromesWeeklyAllocations((prev) => ({
      ...prev,
      [key]: nextVal,
    }));
  };

  const handleSavePromes = () => {
    if (filteredProta.length === 0) return;

    const updatedPromesForCurrentSubject = filteredProta.map((p) => {
      const weeklyAllocationsForP: Record<string, number> = {};
      const monthlyAllocationForP: Record<string, number[]> = {};

      promesMonths.forEach((m) => {
        monthlyAllocationForP[m] = [];
        weeksPerMonth.forEach((w) => {
          const key = `${p.id}_${m}_w${w}`;
          const val = promesWeeklyAllocations[key] ?? 0;

          weeklyAllocationsForP[`${m}_w${w}`] = val;
          weeklyAllocationsForP[key] = val;
          monthlyAllocationForP[m].push(val);
        });
      });

      const existing = promesList.find(
        (item) =>
          (item as any).protaId === p.id ||
          (item.subject === p.subject &&
            item.codeTP === (p.tpCode || p.codeTP) &&
            (item.semester === p.semester || item.semester === (selectedSemester === 1 ? "Ganjil" : "Genap")))
      );

      const newItem: PromesItem = {
        id: existing?.id || `prm_${p.id}_${Date.now()}`,
        subject: p.subject,
        codeTP: p.tpCode || p.codeTP,
        tpDescription: p.tpDescription,
        timeAllocationJP: p.allocatedJP || p.timeAllocationJP || 6,
        semester: (p.semester || (selectedSemester === 1 ? "Ganjil" : "Genap")) as any,
        monthlyAllocation: monthlyAllocationForP,
        weeklyAllocations: weeklyAllocationsForP,
        protaId: p.id,
      } as any;

      return newItem;
    });

    const filteredOthers = promesList.filter(
      (item) =>
        !(
          item.subject === selectedSubject &&
          (item.semester === selectedSemester ||
            item.semester === (selectedSemester === 1 ? "Ganjil" : "Genap"))
        )
    );

    const nextPromesList = [...filteredOthers, ...updatedPromesForCurrentSubject];

    onSavePromes(nextPromesList);
    setSavedPromesAlert(true);
    setTimeout(() => setSavedPromesAlert(false), 3500);
  };

  // Helper to calculate total allocated JP for a single Prota item
  const getProtaAllocatedPromesJP = (protaId: string, idx: number) => {
    let sum = 0;
    promesMonths.forEach((m) => {
      weeksPerMonth.forEach((w) => {
        const key = `${protaId}_${m}_w${w}`;
        const val = promesWeeklyAllocations[key] ?? 0;
        sum += val;
      });
    });
    return sum;
  };

  // Helper to calculate total allocated JP for a specific month & week across all Prota items
  const getColumnTotalJP = useCallback((m: string, w: number) => {
    let sum = 0;
    filteredProta.forEach((p) => {
      const key = `${p.id}_${m}_w${w}`;
      const val = promesWeeklyAllocations[key] ?? 0;
      sum += val;
    });
    return sum;
  }, [filteredProta, promesWeeklyAllocations]);

  // Calculation Engine for Prota Execution Dates based on Academic Calendar & Timetable
  const calculateProtaDates = useCallback(
    (protaItemsToCalc: ProtaItem[]) => {
      const startYMD = schoolIdentity?.academicYearStartDate || "2026-07-13";
      const endYMD = schoolIdentity?.academicYearEndDate || "2027-06-25";

      const startYear = parseInt(startYMD.split("-")[0]) || 2026;
      const endYear = parseInt(endYMD.split("-")[0]) || 2027;

      const monthNameToIndexSem1: Record<string, number> = {
        Juli: 6,
        Agustus: 7,
        September: 8,
        Oktober: 9,
        November: 10,
        Desember: 11,
      };
      const monthNameToIndexSem2: Record<string, number> = {
        Januari: 0,
        Februari: 1,
        Maret: 2,
        April: 3,
        Mei: 4,
        Juni: 5,
      };

      const normalizeSub = (str: string) => (str || "").toLowerCase().trim().replace(/\s+/g, " ");
      const targetSubNorm = normalizeSub(selectedSubject);

      // Build day slots for target subject from Timetable
      const daySlots: Record<string, number> = {};
      const uniqueSlotsMap = new Map<string, TimetableSlot>();
      (timetable || []).forEach((slot) => {
        if (slot.day && slot.period && slot.subject && slot.subject.trim() !== "") {
          const key = `${slot.day.trim()}_${slot.period}`;
          uniqueSlotsMap.set(key, slot);
        }
      });

      uniqueSlotsMap.forEach((slot) => {
        if (normalizeSub(slot.subject) === targetSubNorm) {
          const dayKey = slot.day.trim();
          daySlots[dayKey] = (daySlots[dayKey] || 0) + 1;
        }
      });

      let normalWeeklyJP = Object.values(daySlots).reduce((a, b) => a + b, 0);

      // Fallback day slots if timetable not configured
      if (normalWeeklyJP === 0) {
        daySlots["Senin"] = 3;
        daySlots["Rabu"] = 3;
      }

      const monthsList = selectedSemester === 1 ? Object.keys(monthNameToIndexSem1) : Object.keys(monthNameToIndexSem2);

      // Build array of active teaching days in sequential order
      const activeTeachingDays: {
        dateStr: string;
        dateObj: Date;
        monthName: string;
        weekNum: number;
        dayName: string;
        jp: number;
      }[] = [];

      monthsList.forEach((m) => {
        const monthIdx = selectedSemester === 1 ? monthNameToIndexSem1[m] : monthNameToIndexSem2[m];
        const yr = selectedSemester === 1 ? startYear : endYear;

        weeksPerMonth.forEach((w) => {
          const startDayNum = (w - 1) * 7 + 1;
          const daysInMonth = new Date(yr, monthIdx + 1, 0).getDate();
          const endDayNum = w === 5 ? daysInMonth : Math.min(daysInMonth, w * 7);

          for (let dayNum = startDayNum; dayNum <= endDayNum; dayNum++) {
            const testDate = new Date(yr, monthIdx, dayNum, 12, 0, 0);
            const dayOfWeek = testDate.getDay(); // 0 = Sun
            if (dayOfWeek === 0) continue; // skip Sunday

            const y = testDate.getFullYear();
            const mm = String(testDate.getMonth() + 1).padStart(2, "0");
            const dd = String(testDate.getDate()).padStart(2, "0");
            const dateStr = `${y}-${mm}-${dd}`;

            const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
            const dayName = dayNames[dayOfWeek];
            const jpOnThisDay = daySlots[dayName] || 0;

            if (jpOnThisDay <= 0) continue;

            const natHolidayName = getIndonesianNationalHolidayName(dateStr);
            const matchEvt = (calendarEvents || []).find(
              (e) => e.startDate && dateStr >= e.startDate && dateStr <= (e.endDate || e.startDate)
            );
            const matchIncidental = (incidentalJournals || []).some((i) => i.date === dateStr);
            const isOutOfTerm = dateStr < startYMD || dateStr > endYMD;

            const isHolidayDay = isOutOfTerm || Boolean(natHolidayName) || Boolean(matchEvt) || matchIncidental;

            if (!isHolidayDay) {
              activeTeachingDays.push({
                dateStr,
                dateObj: testDate,
                monthName: m,
                weekNum: w,
                dayName,
                jp: jpOnThisDay,
              });
            }
          }
        });
      });

      const formatDateID = (d: Date) => {
        return d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      };

      let currentDayIdx = 0;

      return protaItemsToCalc.map((item) => {
        const itemJP = item.allocatedJP || item.timeAllocationJP || 6;
        let accumulatedJP = 0;
        let startDateObj: Date | null = null;
        let endDateObj: Date | null = null;
        let startWeekStr = "";
        let endWeekStr = "";

        while (accumulatedJP < itemJP && currentDayIdx < activeTeachingDays.length) {
          const dayInfo = activeTeachingDays[currentDayIdx];
          if (!startDateObj) {
            startDateObj = dayInfo.dateObj;
            startWeekStr = `${dayInfo.monthName} M${dayInfo.weekNum}`;
          }
          endDateObj = dayInfo.dateObj;
          endWeekStr = `${dayInfo.monthName} M${dayInfo.weekNum}`;

          accumulatedJP += dayInfo.jp;
          currentDayIdx++;
        }

        let computedDate = item.executionDate || "";
        let computedWeek = item.executionWeek || "";

        if (startDateObj && endDateObj) {
          const startFormatted = formatDateID(startDateObj);
          const endFormatted = formatDateID(endDateObj);

          if (startFormatted === endFormatted) {
            computedDate = startFormatted;
          } else {
            computedDate = `${startFormatted} s/d ${endFormatted}`;
          }

          if (startWeekStr === endWeekStr) {
            computedWeek = startWeekStr;
          } else {
            computedWeek = `${startWeekStr} - ${endWeekStr}`;
          }
        }

        return {
          ...item,
          executionDate: item.executionDate || computedDate || "Kalender Efektif",
          executionWeek: item.executionWeek || computedWeek || "M1 - M4",
        };
      });
    },
    [selectedSubject, selectedSemester, timetable, calendarEvents, incidentalJournals, schoolIdentity, weeksPerMonth]
  );

  // Automatically calculated execution dates map
  const computedProtaWithDates = useMemo(() => {
    return calculateProtaDates(filteredProta);
  }, [calculateProtaDates, filteredProta]);

  const handleAutoCalculateProtaDates = () => {
    const updated = calculateProtaDates(protaList);
    onSaveProta(updated);
    alert(
      "✅ Perhitungan Tanggal Pelaksanaan Prota Berhasil!\n\nSeluruh item Prota telah disesuaikan tanggal dan pekannya secara presisi berdasarkan Kalender Pendidikan & Jam Pelajaran Efektif."
    );
  };

  const handleAutoFillPromes = () => {
    const autoFilled = computeAutoFill(filteredProta, promesMonths, weeksPerMonth, weekAnalysisMap);
    setPromesWeeklyAllocations(autoFilled);
  };

  const handleResetPromes = () => {
    const newMap: Record<string, number> = {};
    filteredProta.forEach((p) => {
      promesMonths.forEach((m) => {
        weeksPerMonth.forEach((w) => {
          newMap[`${p.id}_${m}_w${w}`] = 0;
        });
      });
    });
    setPromesWeeklyAllocations(newMap);
  };

  const handleExportProtaCSV = () => {
    const headers = ["No", "Mata Pelajaran", "Semester", "Elemen", "Kode TP", "Tujuan Pembelajaran (TP)", "Alokasi Waktu (JP)"];
    const rows = filteredProta.map((p, idx) => [
      idx + 1,
      p.subject,
      `Semester ${p.semester}`,
      p.element,
      p.tpCode || p.codeTP,
      p.tpDescription,
      `${p.allocatedJP || p.timeAllocationJP} JP`,
    ]);
    exportToCSV(headers, rows, `Prota_${selectedSubject}_Semester_${selectedSemester}`);
  };

  const handleExportDoc = () => {
    if (activeTab === "prota") {
      const tableHtml = `
        <div style="font-family: Arial, sans-serif; font-size: 11pt;">
          <h3 style="text-align: center; font-size: 14pt; margin-bottom: 5px;">PROGRAM TAHUNAN (PROTA)</h3>
          <p style="text-align: center; margin-top: 0; font-weight: bold;">Mata Pelajaran: ${selectedSubject} | Semester ${selectedSemester}</p>
          <hr style="margin: 15px 0; border: 1px solid #000;"/>

          <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 10pt;">
            <thead>
              <tr style="background-color: #f3f4f6; text-align: center; font-weight: bold;">
                <th style="border: 1px solid #333; padding: 6px; width: 40px;">No</th>
                <th style="border: 1px solid #333; padding: 6px; width: 120px;">Elemen</th>
                <th style="border: 1px solid #333; padding: 6px; width: 90px;">Kode TP</th>
                <th style="border: 1px solid #333; padding: 6px; text-align: left;">Tujuan Pembelajaran (TP)</th>
                <th style="border: 1px solid #333; padding: 6px; width: 90px;">Alokasi Waktu</th>
              </tr>
            </thead>
            <tbody>
              ${filteredProta
                .map(
                  (p, idx) => `
                <tr>
                  <td style="border: 1px solid #333; padding: 6px; text-align: center;">${idx + 1}</td>
                  <td style="border: 1px solid #333; padding: 6px;">${p.element || "Umum"}</td>
                  <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold;">${p.tpCode || p.codeTP}</td>
                  <td style="border: 1px solid #333; padding: 6px;">${p.tpDescription}</td>
                  <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold; background-color: #ecfdf5;">${p.allocatedJP || p.timeAllocationJP} JP</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <p style="margin-top: 15px; font-weight: bold;">Total Alokasi Waktu Semester ${selectedSemester}: ${totalJP} JP</p>
        </div>
      `;

      exportHtmlToDoc({
        htmlContent: tableHtml,
        filename: `Prota_${selectedSubject}_Semester_${selectedSemester}.doc`,
        title: `PROGRAM TAHUNAN (PROTA)`,
      });
    } else {
      const tableHtml = `
        <div style="font-family: Arial, sans-serif; font-size: 10pt;">
          <h3 style="text-align: center; font-size: 13pt; margin-bottom: 5px;">PROGRAM SEMESTER (PROMES)</h3>
          <p style="text-align: center; margin-top: 0; font-weight: bold;">Mata Pelajaran: ${selectedSubject} | Semester ${selectedSemester}</p>
          <hr style="margin: 15px 0; border: 1px solid #000;"/>

          <table border="1" cellpadding="4" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 9pt; text-align: center;">
            <thead>
              <tr style="background-color: #f3f4f6; font-weight: bold;">
                <th rowspan="2" style="border: 1px solid #333; padding: 5px; text-align: left; width: 220px;">Tujuan Pembelajaran (TP)</th>
                <th rowspan="2" style="border: 1px solid #333; padding: 5px; width: 50px;">JP</th>
                ${promesMonths.map((m) => `<th colspan="5" style="border: 1px solid #333; padding: 5px; background-color: #e5e7eb;">${m}</th>`).join("")}
              </tr>
              <tr style="background-color: #f9fafb; font-size: 8pt;">
                ${promesMonths.map(() => weeksPerMonth.map((w) => `<th style="border: 1px solid #333; padding: 3px;">W${w}</th>`).join("")).join("")}
              </tr>
            </thead>
            <tbody>
              ${filteredProta
                .map(
                  (p, idx) => `
                <tr>
                  <td style="border: 1px solid #333; padding: 5px; text-align: left;">
                    <b>${p.tpCode || p.codeTP}</b>: ${p.tpDescription}
                  </td>
                  <td style="border: 1px solid #333; padding: 5px; font-weight: bold; background-color: #ecfdf5;">${p.allocatedJP || p.timeAllocationJP}</td>
                  ${promesMonths
                    .map((m) =>
                      weeksPerMonth
                        .map((w) => {
                          const key = `${p.id}_${m}_w${w}`;
                          const val = promesWeeklyAllocations[key] || ((idx * 2 + w) % 5 === 0 ? 2 : 0);
                          return `<td style="border: 1px solid #333; padding: 3px; ${val ? "background-color: #10b981; color: white; font-weight: bold;" : "color: #ccc;"}">${val || "-"}</td>`;
                        })
                        .join("")
                    )
                    .join("")}
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;

      exportHtmlToDoc({
        htmlContent: tableHtml,
        filename: `Promes_${selectedSubject}_Semester_${selectedSemester}.doc`,
        title: `PROGRAM SEMESTER (PROMES)`,
      });
    }
  };

  const handlePrint = () => {
    if (activeTab === "prota") {
      onOpenPrint(
        `PROGRAM TAHUNAN (PROTA) - ${selectedSubject.toUpperCase()}`,
        `Semester ${selectedSemester} | Total Alokasi Efektif: ${totalJP} JP`,
        (
          <div className="space-y-4 text-xs">
            <div className="flex justify-between font-bold border-b pb-2 text-slate-800">
              <span>Mata Pelajaran: {selectedSubject}</span>
              <span>Semester: {selectedSemester} ({selectedSemester === 1 ? "Ganjil" : "Genap"})</span>
              <span>Total Alokasi Waktu: {totalJP} JP</span>
            </div>

            <table className="w-full border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-800">
                  <th className="border border-slate-400 p-2 w-8 text-center">No</th>
                  <th className="border border-slate-400 p-2 text-center w-20">Kode TP</th>
                  <th className="border border-slate-400 p-2 text-left">Tujuan Pembelajaran (TP)</th>
                  <th className="border border-slate-400 p-2 text-left w-24">Elemen</th>
                  <th className="border border-slate-400 p-2 text-left w-44">Pelaksanaan (Kalender)</th>
                  <th className="border border-slate-400 p-2 text-center w-20">Alokasi JP</th>
                </tr>
              </thead>
              <tbody>
                {computedProtaWithDates.map((p, idx) => (
                  <tr key={p.id} className="odd:bg-white even:bg-slate-50">
                    <td className="border border-slate-400 p-2 text-center font-mono">{idx + 1}</td>
                    <td className="border border-slate-400 p-2 text-center font-mono font-bold">{p.tpCode || p.codeTP}</td>
                    <td className="border border-slate-400 p-2 font-medium">{p.tpDescription}</td>
                    <td className="border border-slate-400 p-2 text-slate-600">{p.element || "Umum"}</td>
                    <td className="border border-slate-400 p-2 text-slate-800 font-semibold text-[11px]">
                      <div>{p.executionDate || "-"}</div>
                      <div className="text-[10px] text-amber-700">{p.executionWeek || ""}</div>
                    </td>
                    <td className="border border-slate-400 p-2 text-center font-bold text-emerald-800 bg-emerald-50/50">{p.allocatedJP || p.timeAllocationJP} JP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
        "portrait",
        "A4"
      );
    } else {
      // Promes Table Matrix with Months and Weeks (W1-W5)
      onOpenPrint(
        `PROGRAM SEMESTER (PROMES) - ${selectedSubject.toUpperCase()}`,
        `Semester ${selectedSemester} (${selectedSemester === 1 ? "Ganjil: Juli - Des" : "Genap: Jan - Juni"}) | Total: ${totalJP} JP`,
        (
          <div className="space-y-4 text-xs">
            <div className="flex justify-between font-bold border-b pb-2 text-slate-800">
              <span>Mata Pelajaran: {selectedSubject}</span>
              <span>Semester: {selectedSemester} ({selectedSemester === 1 ? "Ganjil" : "Genap"})</span>
              <span>Total Alokasi Waktu: {totalJP} JP</span>
            </div>

            {/* Legend for Print */}
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-700 bg-slate-50 p-2 border border-slate-300 rounded">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-emerald-600 inline-block rounded-xs"></span> Minggu Efektif Penuh
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-amber-400 border border-amber-600 inline-block rounded-xs"></span> Ada Libur/Event (Amber)
              </span>
            </div>

            <table className="w-full border-collapse border border-slate-400 text-[9px] table-auto">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-900 text-center">
                  <th rowSpan={2} className="border border-slate-400 p-1.5 text-left w-52">Tujuan Pembelajaran (TP)</th>
                  <th rowSpan={2} className="border border-slate-400 p-1 w-10">JP</th>
                  {promesMonths.map((m) => (
                    <th key={m} colSpan={5} className="border border-slate-400 p-1 bg-emerald-50 text-emerald-900 font-bold">
                      {m}
                    </th>
                  ))}
                </tr>
                <tr className="bg-slate-50 font-bold text-slate-700 text-center text-[8px]">
                  {promesMonths.map((m) =>
                    weeksPerMonth.map((w) => {
                      const weekInfo = weekAnalysisMap[`${m}_w${w}`];
                      const isOrange = weekInfo?.status === "PARTIAL_ORANGE";

                      return (
                        <th
                          key={`${m}_w${w}`}
                          className={`border border-slate-400 p-0.5 w-5 ${
                            isOrange
                              ? "bg-amber-300 text-amber-950 font-black"
                              : "bg-slate-50 text-slate-800"
                          }`}
                          title={weekInfo?.reason || ""}
                        >
                          W{w}{isOrange ? "⚡" : ""}
                        </th>
                      );
                    })
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredProta.map((p) => {
                  const targetJP = Number(p.allocatedJP || p.timeAllocationJP || 0);

                  return (
                    <tr key={p.id} className="odd:bg-white even:bg-slate-50/50">
                      <td className="border border-slate-400 p-1 font-medium text-slate-900">
                        <span className="font-bold text-emerald-900 font-mono mr-1">[{p.tpCode || p.codeTP}]</span>
                        {p.tpDescription}
                      </td>
                      <td className="border border-slate-400 p-1 text-center font-bold bg-slate-100 text-slate-900">
                        {targetJP}
                      </td>
                      {promesMonths.map((m) =>
                        weeksPerMonth.map((w) => {
                          const key = `${p.id}_${m}_w${w}`;
                          const val = promesWeeklyAllocations[key] || 0;
                          const weekInfo = weekAnalysisMap[`${m}_w${w}`];
                          const isOrange = weekInfo?.status === "PARTIAL_ORANGE";

                          return (
                            <td
                              key={key}
                              className={`border border-slate-400 p-0.5 text-center font-bold ${
                                val > 0 && isOrange
                                  ? "bg-amber-300 text-amber-950 font-extrabold"
                                  : val > 0
                                  ? "bg-emerald-100 text-emerald-900 font-mono"
                                  : isOrange
                                  ? "bg-amber-50 text-amber-600"
                                  : "text-slate-300"
                              }`}
                              title={weekInfo?.reason || ""}
                            >
                              {val > 0 ? val : "-"}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ),
        "landscape",
        "A4"
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarRange className="w-6 h-6 text-emerald-600" />
            Program Tahunan (PROTA) & Program Semester (PROMES)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Integrasi otomatis Kode & Deskripsi TP dari Kurikulum CP & TP, serta Promes 5-Minggu per Bulan (W1 - W5)
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("prota")}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === "prota"
                ? "bg-white text-emerald-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Program Tahunan (Prota)
          </button>
          <button
            onClick={() => setActiveTab("promes")}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === "promes"
                ? "bg-white text-emerald-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Program Semester (Promes)
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {subjects.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedSubject === sub
                    ? "bg-emerald-600 text-white font-bold shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setSelectedSemester(1)}
              className={`px-3 py-1 rounded ${
                selectedSemester === 1 ? "bg-emerald-700 text-white" : "text-slate-600"
              }`}
            >
              Sem 1
            </button>
            <button
              onClick={() => setSelectedSemester(2)}
              className={`px-3 py-1 rounded ${
                selectedSemester === 2 ? "bg-emerald-700 text-white" : "text-slate-600"
              }`}
            >
              Sem 2
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === "prota" && (
            <button
              onClick={handleOpenAddProta}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah TP Prota
            </button>
          )}

          {activeTab === "promes" && (
            <button
              onClick={handleSavePromes}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
              title="Simpan alokasi Promes secara permanen"
            >
              <Save className="w-4 h-4" />
              Simpan Promes
            </button>
          )}

          <button
            onClick={() => {
              if (activeTab === "prota") {
                exportProtaToExcel(protaList, schoolIdentity);
              } else {
                exportPromesToExcel(
                  promesList,
                  schoolIdentity,
                  promesWeeklyAllocations,
                  filteredProta,
                  selectedSubject,
                  selectedSemester
                );
              }
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            title="Ekspor ke Excel (.xlsx)"
          >
            <Download className="w-4 h-4 text-emerald-100" />
            Ekspor Excel (.xlsx)
          </button>
          <button
            onClick={handleExportDoc}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            title="Simpan Word (.docx)"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            Simpan Word (.docx)
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            Cetak / PDF
          </button>
        </div>
      </div>

      {/* COUNTER SISA JP PER SEMESTER CARD */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-100 text-emerald-900 rounded-xl">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                Counter Alokasi Waktu & Sisa Jam Pelajaran (JP) — {selectedSubject}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rumus Presisi: <b>Net JP Efektif Kalender</b> dikurangi <b>Total Alokasi JP TP (Prota & Promes)</b>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SEMESTER 1 COUNTER */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              selectedSemester === 1
                ? "bg-teal-50/80 border-teal-300 ring-2 ring-teal-500/20"
                : "bg-slate-50/70 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-teal-950 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                Semester 1 (Ganjil)
              </span>
              <span
                className={`px-3 py-1 rounded-full font-mono font-extrabold text-xs shadow-xs ${
                  jpSummary.sem1SisaJP >= 0
                    ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                    : "bg-red-100 text-red-900 border border-red-300"
                }`}
              >
                Sisa: {jpSummary.sem1SisaJP >= 0 ? `+${jpSummary.sem1SisaJP}` : jpSummary.sem1SisaJP} JP
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs mt-3 bg-white p-2.5 rounded-lg border border-slate-200/80">
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">Net JP Efektif</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{jpSummary.sem1EffectiveJP} JP</span>
              </div>
              <div className="border-x border-slate-200">
                <span className="text-[11px] text-slate-500 block font-medium">Allocated TP Prota</span>
                <span className="font-mono font-bold text-teal-700 text-sm">{jpSummary.sem1ProtaJP} JP</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">Sisa JP Semester 1</span>
                <span
                  className={`font-mono font-extrabold text-sm ${
                    jpSummary.sem1SisaJP >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {jpSummary.sem1SisaJP} JP
                </span>
              </div>
            </div>
          </div>

          {/* SEMESTER 2 COUNTER */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              selectedSemester === 2
                ? "bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20"
                : "bg-slate-50/70 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                Semester 2 (Genap)
              </span>
              <span
                className={`px-3 py-1 rounded-full font-mono font-extrabold text-xs shadow-xs ${
                  jpSummary.sem2SisaJP >= 0
                    ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                    : "bg-red-100 text-red-900 border border-red-300"
                }`}
              >
                Sisa: {jpSummary.sem2SisaJP >= 0 ? `+${jpSummary.sem2SisaJP}` : jpSummary.sem2SisaJP} JP
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs mt-3 bg-white p-2.5 rounded-lg border border-slate-200/80">
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">Net JP Efektif</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{jpSummary.sem2EffectiveJP} JP</span>
              </div>
              <div className="border-x border-slate-200">
                <span className="text-[11px] text-slate-500 block font-medium">Allocated TP Prota</span>
                <span className="font-mono font-bold text-indigo-700 text-sm">{jpSummary.sem2ProtaJP} JP</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">Sisa JP Semester 2</span>
                <span
                  className={`font-mono font-extrabold text-sm ${
                    jpSummary.sem2SisaJP >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {jpSummary.sem2SisaJP} JP
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD VISUAL CHART WORKLOAD MONITORING */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-100 text-emerald-900 rounded-xl">
              <BarChart3 className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                Dashboard Monitoring Beban Kerja & Distribusi JP Kurikulum
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Visualisasi perbandingan Target Prota dan Terisi Promes per Mata Pelajaran (Semester {selectedSemester})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setChartViewMode("all_subjects")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  chartViewMode === "all_subjects"
                    ? "bg-white text-emerald-900 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📊 Semua Mapel vs Target
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode("monthly_distribution")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  chartViewMode === "monthly_distribution"
                    ? "bg-white text-emerald-900 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📅 Distribusi Bulanan ({selectedSubject})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowDashboardChart(!showDashboardChart)}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
              title={showDashboardChart ? "Sembunyikan Grafik" : "Tampilkan Grafik"}
            >
              {showDashboardChart ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-medium block">Total Mata Pelajaran</span>
              <span className="font-mono font-extrabold text-sm text-slate-800">{dashboardSummary.totalSubjects} Mapel</span>
            </div>
          </div>

          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-700 font-medium block">Promes Sesuai Target</span>
              <span className="font-mono font-extrabold text-sm text-emerald-900">{dashboardSummary.optimalCount} Mapel</span>
            </div>
          </div>

          <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-amber-700 font-medium block">Belum Sesuai Target</span>
              <span className="font-mono font-extrabold text-sm text-amber-900">{dashboardSummary.underCount + dashboardSummary.overCount} Mapel</span>
            </div>
          </div>

          <div className="bg-teal-50/70 p-3 rounded-xl border border-teal-200 flex items-center gap-3">
            <div className="p-2 bg-teal-100 text-teal-800 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-teal-700 font-medium block">Beban Jadwal Mingguan</span>
              <span className="font-mono font-extrabold text-sm text-teal-900">{dashboardSummary.totalTimetableWeeklySlots} JP / Minggu</span>
            </div>
          </div>
        </div>

        {showDashboardChart && (
          <div className="pt-2">
            {chartViewMode === "all_subjects" ? (
              <div className="space-y-2">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectWorkloadStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="shortSubject" tick={{ fontSize: 11, fill: '#475569' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#cbd5e1', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        formatter={(val: number) => [`${val} JP`, '']}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar dataKey="Target Prota (JP)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Terisi Promes (JP)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[11px] text-slate-500 text-center italic">
                  * Batang Biru = Target JP Prota, Batang Hijau = Total JP yang Dialokasikan di Promes
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyDistributionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#cbd5e1', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        formatter={(val: number) => [`${val} JP`, '']}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar dataKey="Kapasitas Efektif (JP)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Terisi Promes (JP)" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[11px] text-slate-500 text-center italic">
                  * Distribusi Jam Pelajaran {selectedSubject} per Bulan di Semester {selectedSemester} (Kapasitas Kalender Efektif vs Terisi di Promes)
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PROTA TAB */}
      {activeTab === "prota" && (
        <div className="space-y-4">
          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-emerald-950">
            <div className="flex items-center gap-2">
              <span>Total Alokasi Waktu {selectedSubject} Semester {selectedSemester}:</span>
              <span className="text-base font-extrabold text-emerald-800">{totalJP} JP (Jam Pelajaran)</span>
            </div>

            <button
              type="button"
              onClick={handleAutoCalculateProtaDates}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
              title="Hitung tanggal & pekan pelaksanaan otomatis berdasarkan Kalender Pendidikan & Jadwal Pelajaran"
            >
              <Sparkles className="w-4 h-4 text-amber-100" />
              ⚡ Hitung Tanggal Otomatis (Kalender)
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">No</th>
                    <th className="px-4 py-3">Elemen</th>
                    <th className="px-4 py-3 w-28">Kode TP</th>
                    <th className="px-4 py-3">Tujuan Pembelajaran (TP)</th>
                    <th className="px-4 py-3 w-48">Pelaksanaan (Kalender)</th>
                    <th className="px-4 py-3 text-center w-28">Alokasi Waktu</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {computedProtaWithDates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        Belum ada data Prota untuk mata pelajaran ini. Klik <b>Tambah TP Prota</b> di atas!
                      </td>
                    </tr>
                  ) : (
                    computedProtaWithDates.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{p.element || "Umum"}</td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-700">{p.tpCode || p.codeTP}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{p.tpDescription}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 text-[11px]">
                            {p.executionDate || "-"}
                          </div>
                          <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                            {p.executionWeek || ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-900 bg-emerald-50/40">
                          {p.allocatedJP || p.timeAllocationJP} JP
                        </td>
                        <td className="px-4 py-3 text-right space-x-1">
                          <button
                            onClick={() => handleOpenEditProta(p)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProta(p.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PROMES TAB (WITH MANUAL JP INPUT & W5 ENABLED) */}
      {activeTab === "promes" && (
        <div className="space-y-4">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">💡 Petunjuk Promes:</span>
              <span>
                Ketikkan angka JP secara <b>manual</b> langsung pada kolom minggu (W1–W5) atau gunakan mode klik cepat.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-white p-1 rounded-xl border border-slate-300 font-bold text-xs">
                <button
                  type="button"
                  onClick={() => setPromesInputMode("manual")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    promesInputMode === "manual"
                      ? "bg-emerald-600 text-white font-extrabold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ✏️ Ketik Manual JP
                </button>
                <button
                  type="button"
                  onClick={() => setPromesInputMode("click")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    promesInputMode === "click"
                      ? "bg-emerald-600 text-white font-extrabold shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ⚡ Klik Cepat (0-2-4)
                </button>
              </div>

              <button
                type="button"
                onClick={handleAutoFillPromes}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-300 text-xs"
                title="Isi otomatis 2 JP secara berurutan hingga target Prota terpenuhi"
              >
                ✨ Auto-Fill 2 JP
              </button>
              <button
                type="button"
                onClick={handleResetPromes}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl border border-red-200 text-xs"
                title="Kosongkan seluruh alokasi Promes"
              >
                🔄 Reset Alokasi
              </button>

              <button
                type="button"
                onClick={handleSavePromes}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs flex items-center gap-1.5 text-xs transition-all active:scale-95"
                title="Simpan alokasi Promes secara permanen"
              >
                <Save className="w-4 h-4" />
                Simpan Promes
              </button>
            </div>
          </div>

          {savedPromesAlert && (
            <div className="p-3.5 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all animate-fadeIn">
              <Check className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>Data Alokasi Program Semester (Promes) mata pelajaran <b>{selectedSubject}</b> Semester {selectedSemester} berhasil disimpan secara permanen!</span>
            </div>
          )}



          {/* Legend Box for Week Status Indicators */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Keterangan Status Alokasi Minggu Promes:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200">
                <span className="w-2.5 h-2.5 bg-emerald-600 rounded-xs"></span>
                Minggu Efektif Penuh
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-950/70 border border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-200 font-bold rounded-lg shadow-2xs">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-xs"></span>
                Terpotong Event / Libur
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 bg-red-50 dark:bg-red-950/50 border border-red-300 text-red-900 dark:text-red-300 font-bold rounded-lg">
                <span>🇮🇩</span>
                Libur Nasional
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-center border-collapse table-fixed text-[10px]">
                <thead className="bg-slate-50 dark:bg-slate-900 font-bold border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 uppercase">
                  <tr>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-200 dark:border-slate-800 text-left w-[24%] min-w-[140px]">
                      Tujuan Pembelajaran (TP) / Lingkup Materi
                    </th>
                    <th rowSpan={2} className="p-0.5 border-r border-slate-200 dark:border-slate-800 w-[3.5%] text-[8px] sm:text-[9px]">
                      Target
                    </th>
                    <th rowSpan={2} className="p-0.5 border-r border-slate-200 dark:border-slate-800 w-[3.5%] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 text-[8px] sm:text-[9px]">
                      Terisi
                    </th>
                    {promesMonths.map((m) => (
                      <th colSpan={5} key={m} className="p-1 border-r border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 text-[9px]">
                        {m}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-t border-slate-200 dark:border-slate-800">
                    {promesMonths.map((m) =>
                      weeksPerMonth.map((w) => {
                        const wkKey = `${m}_w${w}`;
                        const weekInfo = weekAnalysisMap[wkKey];
                        const isOrange = weekInfo?.status === "PARTIAL_ORANGE";
                        const hasNatHoliday = weekInfo?.hasNationalHoliday;

                        return (
                          <th
                            key={wkKey}
                            className={`p-0.5 border-r border-slate-200 dark:border-slate-800 text-[8px] font-extrabold transition-all relative ${
                              hasNatHoliday
                                ? "bg-red-100 text-red-950 dark:bg-red-950 dark:text-red-200 border-t-2 border-t-red-500"
                                : isOrange
                                ? "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100"
                                : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300"
                            }`}
                            title={
                              hasNatHoliday
                                ? `🇮🇩 HARI LIBUR NASIONAL: ${weekInfo?.nationalHolidaysList?.join(", ")}. ${weekInfo?.reason || ""}`
                                : weekInfo?.reason || `Minggu ${w} ${m}`
                            }
                          >
                            <div className="flex flex-col items-center justify-center leading-tight py-0.5">
                              <span>W{w}</span>
                              <span className="flex items-center justify-center gap-0.5 text-[8px] font-bold">
                                {hasNatHoliday && <span title={weekInfo?.nationalHolidaysList?.join(", ")}>🇮🇩</span>}
                                {!hasNatHoliday && isOrange && <span>⚡</span>}
                              </span>
                            </div>
                          </th>
                        );
                      })
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {filteredProta.length === 0 ? (
                    <tr>
                      <td colSpan={3 + promesMonths.length * 5} className="text-center py-8 text-slate-400">
                        Belum ada data Prota untuk semester ini.
                      </td>
                    </tr>
                  ) : (
                    filteredProta.map((p, idx) => {
                      const targetJP = p.allocatedJP || p.timeAllocationJP || 6;
                      const currentAllocatedPromes = getProtaAllocatedPromesJP(p.id, idx);
                      const isMatching = currentAllocatedPromes === targetJP;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="p-1.5 text-left border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-slate-100 leading-tight break-words">
                            <span className="font-mono text-emerald-700 dark:text-emerald-400 block text-[9px] font-bold">{p.tpCode || p.codeTP}</span>
                            <span className="text-[10px] leading-snug">{p.tpDescription}</span>
                          </td>
                          <td className="p-0.5 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/50 text-[10px]">
                            {targetJP}
                          </td>
                          <td className="p-0.5 border-r border-slate-200 dark:border-slate-800 font-extrabold font-mono text-[10px]">
                            <span
                              className={`px-1 py-0.5 rounded text-[9px] inline-block ${
                                isMatching
                                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                                  : currentAllocatedPromes > targetJP
                                  ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              }`}
                              title={
                                isMatching
                                  ? "Sesuai Target Prota"
                                  : currentAllocatedPromes > targetJP
                                  ? `Terisi ${currentAllocatedPromes} JP`
                                  : `Kurang ${targetJP - currentAllocatedPromes} JP`
                              }
                            >
                              {currentAllocatedPromes}
                            </span>
                          </td>
                          {promesMonths.map((m) =>
                            weeksPerMonth.map((w) => {
                              const key = `${p.id}_${m}_w${w}`;
                              const val = promesWeeklyAllocations[key] ?? 0;

                              const weekInfo = weekAnalysisMap[`${m}_w${w}`];
                              const isOrange = weekInfo?.status === "PARTIAL_ORANGE";

                              return (
                                <td
                                  key={`${m}_w${w}`}
                                  className={`p-0 border-r border-slate-200 dark:border-slate-800 text-center font-mono ${
                                    isOrange ? "bg-amber-50/40 dark:bg-amber-950/20" : ""
                                  }`}
                                  title={weekInfo?.reason || ""}
                                >
                                  {promesInputMode === "manual" ? (
                                    <input
                                      type="number"
                                      min={0}
                                      max={20}
                                      value={val === 0 ? "" : val}
                                      placeholder="-"
                                      onChange={(e) => handleUpdatePromesJP(p.id, m, w, parseInt(e.target.value, 10) || 0)}
                                      className={`w-full h-6 text-center font-bold text-[10px] rounded-2xs border-0 transition-all p-0 focus:ring-1 ${
                                        val > 0
                                          ? "bg-emerald-600 text-white font-extrabold"
                                          : "bg-transparent text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                      }`}
                                    />
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePromesWeek(p.id, m, w)}
                                      className={`w-full h-6 font-bold text-[10px] rounded-2xs transition-colors p-0 ${
                                        val > 0
                                          ? "bg-emerald-600 text-white font-extrabold"
                                          : "bg-transparent text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                      }`}
                                    >
                                      {val > 0 ? val : "-"}
                                    </button>
                                  )}
                                </td>
                              );
                            })
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredProta.length > 0 && (
                  <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-[10px]">
                    <tr>
                      <td className="p-1.5 text-left border-r border-slate-300 dark:border-slate-700 font-black">
                        TOTAL ALOKASI JP
                      </td>
                      <td className="p-0.5 border-r border-slate-300 dark:border-slate-700 font-black text-slate-900 dark:text-slate-100">
                        {totalJP}
                      </td>
                      <td className="p-0.5 border-r border-slate-300 dark:border-slate-700 font-black text-emerald-800 dark:text-emerald-400">
                        {filteredProta.reduce((acc, p, idx) => acc + getProtaAllocatedPromesJP(p.id, idx), 0)}
                      </td>
                      {promesMonths.map((m) =>
                        weeksPerMonth.map((w) => {
                          const colTotal = getColumnTotalJP(m, w);

                          return (
                            <td
                              key={`total_${m}_w${w}`}
                              className="p-0.5 border-r border-slate-300 dark:border-slate-700 font-extrabold font-mono text-[9px] text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900"
                            >
                              <div className="flex flex-col items-center leading-none py-0.5">
                                <span>{colTotal > 0 ? colTotal : "-"}</span>
                              </div>
                            </td>
                          );
                        })
                      )}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Prota Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              {editingId ? "Edit TP Prota" : "Tambah TP ke Prota"}
            </h3>

            <form onSubmit={handleSaveProtaForm} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  disabled
                  value={selectedSubject}
                  className="w-full p-2 border rounded-lg bg-slate-100 font-bold text-slate-700"
                />
              </div>

              {/* NEW FEATURE: Dropdown pilih Kode TP dari Kurikulum CP & TP */}
              <div>
                <label className="block font-semibold mb-1 text-emerald-800">
                  Pilih Kode TP dari Kurikulum CP & TP
                </label>
                {availableTPs.length > 0 ? (
                  <select
                    value={protaForm.tpCode || ""}
                    onChange={(e) => handleSelectTPFromDropdown(e.target.value)}
                    className="w-full p-2 border border-emerald-300 rounded-lg bg-emerald-50/50 font-bold text-slate-900"
                  >
                    <option value="">-- Pilih Kode TP dari Database Kurikulum --</option>
                    {availableTPs.map((item: any) => {
                      const code = item.codeTP || item.tpCode || "";
                      const desc = item.descriptionTP || item.tpDescription || item.description || "";
                      return (
                        <option key={item.id} value={code}>
                          [{code}] - {desc.slice(0, 60)}...
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="p-2 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-[11px]">
                    Belum ada data CP & TP tersimpan untuk mapel <b>{selectedSubject}</b> di Kurikulum. Anda dapat mengetikkan Kode & Deskripsi TP secara manual di bawah.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Semester</label>
                  <select
                    value={protaForm.semester || selectedSemester}
                    onChange={(e) => setProtaForm((prev) => ({ ...prev, semester: parseInt(e.target.value) as any }))}
                    className="w-full p-2 border rounded-lg bg-white"
                  >
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Kode TP (Manual / Custom)</label>
                  <input
                    type="text"
                    required
                    value={protaForm.tpCode || ""}
                    onChange={(e) => setProtaForm((prev) => ({ ...prev, tpCode: e.target.value, codeTP: e.target.value }))}
                    className="w-full p-2 border rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Elemen Kurikulum</label>
                <input
                  type="text"
                  value={protaForm.element || "Umum"}
                  onChange={(e) => setProtaForm((prev) => ({ ...prev, element: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Deskripsi Tujuan Pembelajaran (TP)</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Deskripsi TP akan muncul otomatis saat memilih Kode TP di atas..."
                  value={protaForm.tpDescription || ""}
                  onChange={(e) => setProtaForm((prev) => ({ ...prev, tpDescription: e.target.value }))}
                  className="w-full p-2 border rounded-lg font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Alokasi Waktu (JP)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={protaForm.allocatedJP || 6}
                    onChange={(e) => setProtaForm((prev) => ({ ...prev, allocatedJP: parseInt(e.target.value, 10) }))}
                    className="w-full p-2 border rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Pekan Pelaksanaan</label>
                  <input
                    type="text"
                    placeholder="misal: Juli M1 - M3"
                    value={protaForm.executionWeek || ""}
                    onChange={(e) => setProtaForm((prev) => ({ ...prev, executionWeek: e.target.value }))}
                    className="w-full p-2 border rounded-lg font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Tanggal Pelaksanaan (Rentang)</label>
                <input
                  type="text"
                  placeholder="misal: 13 Jul 2026 s/d 27 Jul 2026"
                  value={protaForm.executionDate || ""}
                  onChange={(e) => setProtaForm((prev) => ({ ...prev, executionDate: e.target.value }))}
                  className="w-full p-2 border rounded-lg font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg"
                >
                  Simpan TP Prota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
