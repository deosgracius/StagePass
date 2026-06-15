import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Calendar, Clock, MapPin, Mic2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../lib/api";

function formatDateTime(iso) {
  try {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
  } catch {
    return { date: iso, time: "" };
  }
}

export default function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/events/${id}`)
      .then((r) => setEvent(r.data))
      .catch(() => setError("Event not found"));
  }, [id]);

  if (error) return <main className="pt-40 text-center text-white/60">{error}</main>;
  if (!event) return <main className="pt-40 text-center text-white/40 font-mono text-sm">Loading...</main>;

  const dt = formatDateTime(event.date);
  const minPrice = Math.min(...event.tiers.map((t) => t.price));

  return (
    <main className="pt-20">
      {/* Hero */}
      <section className="relative h-[70vh] overflow-hidden">
        <img
          src={event.image_url}
          alt={event.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/60 to-black/30" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 h-full flex flex-col justify-end pb-12">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#D3FF24] mb-4"
          >
            {event.category} · {event.city}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-5xl sm:text-7xl lg:text-8xl uppercase leading-[0.92] max-w-5xl"
          >
            {event.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-white/70 text-lg mt-5 max-w-2xl font-light"
          >
            {event.tagline}
          </motion.p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid lg:grid-cols-3 gap-10">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/5">
            {[
              { icon: Calendar, label: "Date", value: dt.date.split(",")[0] + ", " + dt.date.split(",").slice(1).join(",").trim() },
              { icon: Clock, label: "Time", value: `${dt.time} · ${event.duration_min} min` },
              { icon: MapPin, label: "Venue", value: `${event.venue}, ${event.city}` },
              { icon: Mic2, label: "Performer", value: event.performer },
            ].map((b, i) => {
              const Icon = b.icon;
              return (
                <div key={i} className="bg-[#050505] p-5">
                  <Icon size={16} className="text-[#D3FF24] mb-3" />
                  <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40 mb-1.5">
                    {b.label}
                  </div>
                  <div className="text-sm leading-snug text-white/90">{b.value}</div>
                </div>
              );
            })}
          </div>

          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40 mb-4">
              · About the show ·
            </h2>
            <p className="text-white/80 text-lg leading-relaxed max-w-3xl font-light">
              {event.description}
            </p>
          </div>

          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40 mb-4">
              · Seat tiers ·
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {event.tiers.map((t) => (
                <div
                  key={t.key}
                  className="glass p-5"
                  style={{ borderRadius: "16px" }}
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">
                    {t.key}
                  </div>
                  <div className="font-display text-2xl mb-1">{t.label}</div>
                  <div className="font-display text-3xl text-[#D3FF24]">
                    ${t.price}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: sticky CTA */}
        <aside className="lg:sticky lg:top-24 self-start">
          <div
            className="glass p-8"
            style={{ borderRadius: "20px" }}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
              Starting at
            </div>
            <div className="font-display text-5xl text-[#D3FF24] my-3">
              ${minPrice}
            </div>
            <div className="font-mono text-xs text-white/50 mb-6">
              per seat · all taxes included
            </div>
            <Link
              to={`/events/${event.id}/seats`}
              data-testid="choose-seats-btn"
              className="group w-full bg-[#D3FF24] text-black font-mono uppercase tracking-[0.18em] text-xs px-6 py-4 hover:bg-white transition-all neon-glow inline-flex items-center justify-center gap-3"
            >
              Choose your seats
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <div className="mt-5 text-[11px] text-white/40 font-mono leading-relaxed text-center">
              Free cancellation up to 24h before showtime
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
