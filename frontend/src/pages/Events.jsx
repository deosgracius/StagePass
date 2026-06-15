import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import EventCard from "../components/EventCard";

const CATS = [
  { key: "all", label: "All" },
  { key: "concert", label: "Concerts" },
  { key: "theater", label: "Theater" },
  { key: "sports", label: "Sports" },
  { key: "comedy", label: "Comedy" },
];

export default function Events() {
  const [events, setEvents] = useState([]);
  const [cat, setCat] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/events", { params: cat !== "all" ? { category: cat } : {} })
      .then((r) => {
        setEvents(r.data);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [cat]);

  const sorted = useMemo(
    () => [...events].sort((a, b) => a.date.localeCompare(b.date)),
    [events]
  );

  return (
    <main className="pt-28 pb-24 max-w-7xl mx-auto px-6 lg:px-10">
      <div className="flex items-end justify-between flex-wrap gap-6 mb-10">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#D3FF24] block mb-3">
            · Calendar 26 ·
          </span>
          <h1 className="font-display text-5xl sm:text-6xl uppercase">
            All Events
          </h1>
        </div>
        <div className="font-mono text-xs text-white/40">
          {sorted.length} live · sorted by date
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-12" data-testid="category-filters">
        {CATS.map((c) => {
          const active = c.key === cat;
          return (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              data-testid={`filter-${c.key}`}
              className={`font-mono text-[11px] uppercase tracking-[0.22em] px-5 py-2.5 border transition-all ${
                active
                  ? "bg-[#D3FF24] text-black border-[#D3FF24]"
                  : "border-white/15 text-white/60 hover:text-white hover:border-white/40"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="font-mono text-sm text-white/40">Loading events...</div>
      ) : sorted.length === 0 ? (
        <div className="font-mono text-sm text-white/40">No events found in this category.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sorted.map((ev, i) => (
            <EventCard key={ev.id} event={ev} index={i} />
          ))}
        </div>
      )}
    </main>
  );
}
