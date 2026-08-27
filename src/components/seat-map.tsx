"use client";

import { Check } from "lucide-react";

interface SeatMapProps {
  totalSeats: number;
  occupiedSeats: number[];
  selectedSeat: number | null;
  onSelect: (seat: number) => void;
}

export default function SeatMap({
  totalSeats,
  occupiedSeats,
  selectedSeat,
  onSelect,
}: SeatMapProps) {
  const cols = 4;
  const rows = Math.ceil(totalSeats / cols);

  const getSeatStatus = (seatNum: number): "available" | "occupied" | "selected" | "last" => {
    if (occupiedSeats.includes(seatNum)) return "occupied";
    if (selectedSeat === seatNum) return "selected";
    const availableCount = totalSeats - occupiedSeats.length;
    if (availableCount === 1) return "last";
    return "available";
  };

  const statusStyles: Record<string, string> = {
    available:
      "bg-green-100 border-green-300 text-green-700 hover:bg-green-200 cursor-pointer",
    occupied:
      "bg-ink/10 border-ink/15 text-ink/30 cursor-not-allowed",
    selected:
      "bg-rope border-rope text-white cursor-pointer",
    last:
      "bg-red-100 border-red-300 text-red-600 hover:bg-red-200 cursor-pointer",
  };

  const seatNumbers: (number | null)[] = [];
  for (let i = 1; i <= rows * cols; i++) {
    seatNumbers.push(i <= totalSeats ? i : null);
  }

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="relative">
        <div className="w-full h-3 bg-ink/10 rounded-t-xl mb-4" />
        <p className="text-[10px] text-ink/30 text-center mb-3 uppercase tracking-wider font-medium">
          Front
        </p>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 gap-y-2">
          {Array.from({ length: rows }).map((_, rowIdx) => {
            const leftIndices = [rowIdx * cols, rowIdx * cols + 1];
            const rightIndices = [rowIdx * cols + 2, rowIdx * cols + 3];

            return (
              <div key={rowIdx} className="contents">
                <div className="flex gap-2 justify-end">
                  {leftIndices.map((idx) => {
                    const seatNum = seatNumbers[idx];
                    if (seatNum === null) return <div key={idx} className="w-11 h-11" />;
                    const status = getSeatStatus(seatNum);
                    return (
                      <button
                        key={idx}
                        disabled={status === "occupied"}
                        onClick={() => onSelect(seatNum)}
                        className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg border text-xs font-semibold flex items-center justify-center transition-all ${statusStyles[status]}`}
                        aria-label={`Seat ${seatNum}`}
                      >
                        {status === "selected" ? (
                          <Check size={16} />
                        ) : (
                          seatNum
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-px h-11 bg-ink/8" />
                </div>

                <div className="flex gap-2">
                  {rightIndices.map((idx) => {
                    const seatNum = seatNumbers[idx];
                    if (seatNum === null) return <div key={idx} className="w-11 h-11" />;
                    const status = getSeatStatus(seatNum);
                    return (
                      <button
                        key={idx}
                        disabled={status === "occupied"}
                        onClick={() => onSelect(seatNum)}
                        className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg border text-xs font-semibold flex items-center justify-center transition-all ${statusStyles[status]}`}
                        aria-label={`Seat ${seatNum}`}
                      >
                        {status === "selected" ? (
                          <Check size={16} />
                        ) : (
                          seatNum
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-5 text-xs text-ink/50">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-green-200 border border-green-300" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-ink/10 border border-ink/15" />
          <span>Occupied</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-rope border border-rope" />
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
}
