import { Link } from "react-router-dom";
import { Calendar, MapPin, ArrowUpRight } from "lucide-react";

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const CATEGORY_COLOR = {
  concert: "#D3FF24",
  theater: "#FF2E93",
  sports: "#00F0FF",
  comedy: "#FFB627",
};

export default function EventCard({ event, index = 0 }) {
  const accent = CATEGORY_COLOR[event.category] || "#D3FF24";
  return (
    <Link
      to={`/events/${event.id}`}
      data-testid={`event-card-${event.id}`}
      className="group relative block overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-500"
      style={{ borderRadius: "20px" }}
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={event.image_url}
          alt={event.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 border"
            style={{ borderColor: accent, color: accent }}
          >
            {event.category}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 bg-black/60 border border-white/10 text-white/80">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <div
          className="absolute top-4 right-4 w-9 h-9 grid place-items-center bg-white text-black opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ borderRadius: "999px" }}
        >
          <ArrowUpRight size={18} strokeWidth={2.4} />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5">
          <h3 className="font-display text-2xl sm:text-3xl leading-none mb-3 group-hover:text-[color:var(--accent)] transition-colors"
              style={{ "--accent": accent }}>
            {event.title}
          </h3>
          <p className="text-white/60 text-sm mb-4 line-clamp-2 font-light">
            {event.tagline}
          </p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1 font-mono text-xs text-white/70">
              <span className="flex items-center gap-1.5">
                <Calendar size={12} /> {formatDate(event.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={12} /> {event.city}
              </span>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
                From
              </div>
              <div className="font-display text-xl" style={{ color: accent }}>
                ${Math.min(...event.tiers.map((t) => t.price))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
