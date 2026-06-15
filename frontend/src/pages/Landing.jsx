import { Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, ShieldCheck, Zap } from "lucide-react";
import HeroScene from "../components/HeroScene";
import EventCard from "../components/EventCard";
import { api } from "../lib/api";

const MARQUEE = [
  "CONCERTS",
  "THEATER",
  "SPORTS",
  "COMEDY",
  "FESTIVALS",
  "LIVE",
  "TONIGHT",
];

export default function Landing() {
  const [events, setEvents] = useState([]);
  useEffect(() => {
    api.get("/events").then((r) => {
      setEvents(r.data);
    }).catch(() => {});
  }, []);

  return (
    <main className="relative pt-16">
      {/* HERO */}
      <section className="relative min-h-[92vh] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <Suspense fallback={null}>
            <HeroScene />
          </Suspense>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050505] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-24 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="flex items-center gap-2 mb-8"
          >
            <span className="w-12 h-px bg-[#D3FF24]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#D3FF24]">
              StagePass · Season 26
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1 }}
            className="font-display text-5xl sm:text-7xl lg:text-8xl leading-[0.9] uppercase max-w-5xl"
          >
            Reserve your<br />
            seat to the <span className="text-[#D3FF24]">unforgettable</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.25 }}
            className="mt-8 max-w-xl text-white/60 text-lg font-light"
          >
            Concerts, theater, championship nights and stand-up — all in one
            cinematic booking experience. Pick the row. Feel the room.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link
              to="/events"
              data-testid="hero-cta-events"
              className="group bg-[#D3FF24] text-black font-mono uppercase tracking-[0.18em] text-xs px-7 py-4 hover:bg-white transition-all neon-glow inline-flex items-center gap-3"
            >
              Browse Events
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/events"
              data-testid="hero-cta-tonight"
              className="border border-white/20 hover:border-white/60 text-white font-mono uppercase tracking-[0.18em] text-xs px-7 py-4 transition-all"
            >
              What&apos;s on tonight
            </Link>
          </motion.div>

          {/* Stat strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-20 grid grid-cols-3 max-w-2xl gap-10"
          >
            {[
              { k: "240+", v: "Live Events" },
              { k: "48", v: "Cities Worldwide" },
              { k: "4.9★", v: "Booking Rating" },
            ].map((s) => (
              <div key={s.v}>
                <div className="font-display text-3xl sm:text-4xl">{s.k}</div>
                <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-white/40 mt-1">
                  {s.v}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="relative border-y border-white/5 py-6 overflow-hidden">
        <div className="flex marquee-track whitespace-nowrap">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-8 pr-8">
              {MARQUEE.concat(MARQUEE).map((w, idx) => (
                <span key={`${i}-${idx}`} className="flex items-center gap-8">
                  <span className="font-display text-3xl sm:text-5xl uppercase tracking-tighter text-white/15 hover:text-[#D3FF24] transition-colors">
                    {w}
                  </span>
                  <span className="text-[#FF2E93]">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED EVENTS */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-24 sm:py-32">
        <div className="flex items-end justify-between gap-6 mb-12 flex-wrap">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#D3FF24] mb-3 block">
              · Featured Tonight ·
            </span>
            <h2 className="font-display text-4xl sm:text-5xl uppercase max-w-2xl leading-[1]">
              Hand-picked moments
            </h2>
          </div>
          <Link
            to="/events"
            data-testid="all-events-link"
            className="font-mono text-xs uppercase tracking-[0.2em] text-white/60 hover:text-[#D3FF24] inline-flex items-center gap-2"
          >
            View all → 
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {events.slice(0, 4).map((ev, i) => (
            <EventCard key={ev.id} event={ev} index={i} />
          ))}
        </div>
      </section>

      {/* VALUE PROPS */}
      <section className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24 grid lg:grid-cols-3 gap-8">
          {[
            {
              icon: Sparkles,
              tag: "01",
              title: "Cinematic Seat View",
              body: "Tilted 3D venue map shows you exactly what you book. No surprises at the door.",
              accent: "#D3FF24",
            },
            {
              icon: Zap,
              tag: "02",
              title: "Instant Confirmation",
              body: "From browse to ticket in under sixty seconds. Receipt and seat code, every time.",
              accent: "#FF2E93",
            },
            {
              icon: ShieldCheck,
              tag: "03",
              title: "Holds, Not Holds-Up",
              body: "Your seat is reserved the moment you tap it. No fastest-finger panic.",
              accent: "#00F0FF",
            },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.tag}
                className="glass p-8 hover:-translate-y-1 transition-all duration-500"
                style={{ borderRadius: "20px" }}
              >
                <div className="flex items-center justify-between mb-10">
                  <Icon size={28} style={{ color: f.accent }} />
                  <span className="font-mono text-[10px] tracking-[0.4em] text-white/30">
                    {f.tag}
                  </span>
                </div>
                <h3 className="font-display text-2xl mb-4">{f.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-32 text-center">
          <h2 className="font-display text-5xl sm:text-7xl uppercase leading-[0.95] mb-8">
            The lights<br />are <span className="text-[#FF2E93]">already</span> down.
          </h2>
          <Link
            to="/events"
            data-testid="closing-cta"
            className="inline-flex items-center gap-3 bg-white text-black font-mono uppercase tracking-[0.18em] text-xs px-8 py-4 hover:bg-[#D3FF24] transition-colors"
          >
            Find your seat <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 flex flex-wrap items-center justify-between gap-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
            © 2026 StagePass · All seats reserved
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
            Built for the front row.
          </div>
        </div>
      </footer>
    </main>
  );
}
