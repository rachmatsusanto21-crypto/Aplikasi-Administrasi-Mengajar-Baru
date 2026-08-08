import React, { useState, useCallback, useRef } from "react";

export interface PrintState {
  isOpen: boolean;
  title: string;
  subtitle: string;
  content: React.ReactNode | null;
  defaultOrientation?: "portrait" | "landscape";
  defaultPaperSize?: "A4" | "F4" | "Letter" | "Legal" | "Auto";
  enablePageBreaks?: boolean;
}

export function usePrintHandler(delayMs: number = 300) {
  const [printState, setPrintState] = useState<PrintState>({
    isOpen: false,
    title: "",
    subtitle: "",
    content: null,
    defaultOrientation: "portrait",
    defaultPaperSize: "A4",
    enablePageBreaks: true,
  });

  const [isPreparing, setIsPreparing] = useState<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Encapsulates the setTimeout delay logic to ensure DOM stability
   * before setting print state and displaying the print preview modal.
   */
  const handleOpenPrint = useCallback(
    (
      title: string,
      subtitle: string,
      content: React.ReactNode,
      defaultOrientation?: "portrait" | "landscape",
      defaultPaperSize?: "A4" | "F4" | "Letter" | "Legal" | "Auto",
      enablePageBreaks: boolean = true
    ) => {
      setIsPreparing(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setPrintState({
          isOpen: true,
          title,
          subtitle,
          content,
          defaultOrientation: defaultOrientation || "portrait",
          defaultPaperSize: defaultPaperSize || "A4",
          enablePageBreaks,
        });
        setIsPreparing(false);
      }, delayMs);
    },
    [delayMs]
  );

  const handleClosePrint = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setPrintState((prev) => ({ ...prev, isOpen: false }));
    setIsPreparing(false);
  }, []);

  /**
   * Helper to trigger window.print with DOM stabilization delay
   */
  const triggerPrintWithDelay = useCallback((delay: number = 300) => {
    setTimeout(() => {
      if (typeof window !== "undefined") {
        try {
          window.print();
        } catch (err) {
          console.warn("Browser print dialog error:", err);
        }
      }
    }, delay);
  }, []);

  const togglePageBreaks = useCallback(() => {
    setPrintState((prev) => ({
      ...prev,
      enablePageBreaks: !prev.enablePageBreaks,
    }));
  }, []);

  return {
    printState,
    setPrintState,
    handleOpenPrint,
    handleClosePrint,
    triggerPrintWithDelay,
    togglePageBreaks,
    isPreparing,
  };
}
