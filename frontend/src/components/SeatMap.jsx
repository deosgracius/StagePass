import { useMemo } from "react";

const TIER_STYLES = {
  vip: { color: "#FF2E93", label: "VIP" },
  premium: { color: "#00F0FF", label: "Premium" },
  standard: { color: "#FFFFFF", label: "Standard" },
};

export default function SeatMap({ event, taken, selected, onToggle }) {
  const takenSet = useMemo(
    () => new Set(taken.map((s) => `${s.row}-${s.col}`)),
    [taken]
  );
  const selectedSet = useMemo(
    () => new Set(selected.map((s) => `${s.row}-${s.col}`)),
    [selected]
  );

  const tierByRow = useMemo(() => {
    const map = {};
    for (const tier of event.tiers) {
      for (const r of tier.rows) map[r] = tier;
    }
    return map;
  }, [event.tiers]);

  return (
    <div className="w-full" data-testid="seat-map">
      {/* Stage */}
      <div className="mb-10">
        <div className="h-1.5 w-3/4 mx-auto stage-line rounded-full" />
        <div className="text-center mt-3 font-mono text-[10px] tracking-[0.4em] text-white/40 uppercase">
          — Stage —
        </div>
      </div>

      {/* Tilted seat grid for subtle 3D */}
      <div
        className="mx-auto"
        style={{
          perspective: "1200px",
          maxWidth: "880px",
        }}
      >
        <div
          className="flex flex-col gap-2.5"
          style={{
            transform: "rotateX(22deg)",
            transformOrigin: "center top",
          }}
        >
          {Array.from({ length: event.rows }).map((_, row) => {
            const tier = tierByRow[row] || event.tiers[event.tiers.length - 1];
            const tierStyle = TIER_STYLES[tier.key];
            const rowLabel = String.fromCharCode(65 + row);
            return (
              <div key={row} className="flex items-center gap-2 justify-center">
                <span className="font-mono text-[10px] text-white/30 w-5 text-right">
                  {rowLabel}
                </span>
                <div className="flex gap-1.5">
                  {Array.from({ length: event.cols }).map((_, col) => {
                    const key = `${row}-${col}`;
                    const isTaken = takenSet.has(key);
                    const isSelected = selectedSet.has(key);
                    // Add aisle gap in the middle
                    const aisle = col === Math.floor(event.cols / 2);

                    let bg = "transparent";
                    let border = `1px solid ${tierStyle.color}66`;
                    let shadow = "";

                    if (isTaken) {
                      bg = "rgba(255,255,255,0.05)";
                      border = "1px solid rgba(255,255,255,0.08)";
                    } else if (isSelected) {
                      bg = "#D3FF24";
                      border = "1px solid #D3FF24";
                      shadow = "0 0 12px rgba(211,255,36,0.7)";
                    }

                    return (
                      <div key={col} className="flex">
                        {aisle && <div className="w-4" />}
                        <button
                          type="button"
                          disabled={isTaken}
                          onClick={() =>
                            onToggle({
                              row,
                              col,
                              tier: tier.key,
                              price: tier.price,
                            })
                          }
                          data-testid={`seat-${row}-${col}`}
                          aria-label={`Seat ${rowLabel}${col + 1} ${tier.label} ${
                            isTaken ? "taken" : isSelected ? "selected" : "available"
                          }`}
                          className={`seat ${isTaken ? "seat-taken" : ""} w-6 h-6 sm:w-7 sm:h-7 rounded-md`}
                          style={{
                            background: bg,
                            border,
                            boxShadow: shadow,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <span className="font-mono text-[10px] text-white/30 w-5">
                  {rowLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-5 font-mono text-[10px] tracking-widest uppercase">
        {event.tiers.map((t) => {
          const s = TIER_STYLES[t.key];
          return (
            <div key={t.key} className="flex items-center gap-2 text-white/60">
              <span
                className="w-3.5 h-3.5 rounded-sm"
                style={{ border: `1.5px solid ${s.color}` }}
              />
              {t.label} · ${t.price}
            </div>
          );
        })}
        <div className="flex items-center gap-2 text-white/60">
          <span
            className="w-3.5 h-3.5 rounded-sm"
            style={{
              background: "#D3FF24",
              boxShadow: "0 0 8px rgba(211,255,36,0.6)",
            }}
          />
          Selected
        </div>
        <div className="flex items-center gap-2 text-white/40">
          <span className="w-3.5 h-3.5 rounded-sm bg-white/5 border border-white/10" />
          Taken
        </div>
      </div>
    </div>
  );
}
