"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />

      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 bg-foam rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-sand/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-1 rounded-full bg-ink/15 mx-auto" />
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-sand/30 text-ink/40 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-1 pt-1 pb-2">
          <div className="w-10 h-1 rounded-full bg-ink/10 mx-auto" />
        </div>

        <div className="px-5 pt-1 pb-5 border-b border-sand/15">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
