import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Ticket as TicketIcon, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../lib/api";

export default function Checkout() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    api.get("/bookings/me").then((r) => {
      const b = r.data.find((x) => x.id === bookingId);
      setBooking(b);
    });
  }, [bookingId]);

  const code = useMemo(
    () => (bookingId ? bookingId.split("-")[0].toUpperCase() : ""),
    [bookingId]
  );

  if (!booking) {
    return <main className="pt-40 text-center text-white/40 font-mono text-sm">Loading ticket…</main>;
  }

  return (
    <main className="pt-28 pb-24 max-w-3xl mx-auto px-6 lg:px-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-3 text-[#D3FF24] mb-6">
          <CheckCircle2 size={22} />
          <span className="font-mono text-xs uppercase tracking-[0.3em]">
            Booking confirmed
          </span>
        </div>
        <h1 className="font-display text-5xl sm:text-6xl uppercase leading-[0.95] mb-3">
          You&apos;re in.
        </h1>
        <p className="text-white/55 max-w-xl font-light">
          We&apos;ve locked your seats. Show the code at the door — or find this
          ticket later under <Link to="/dashboard" className="text-[#D3FF24] hover:underline">My Tickets</Link>.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="mt-12 relative"
        data-testid="ticket-card"
      >
        <div
          className="glass overflow-hidden"
          style={{ borderRadius: "24px" }}
        >
          <div className="flex flex-col sm:flex-row">
            {/* Stub */}
            <div className="sm:w-1/3 p-8 bg-[#0a0a0a] border-r border-dashed border-white/15 flex flex-col items-center justify-center text-center">
              <TicketIcon size={36} className="text-[#D3FF24] mb-4" />
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">
                Entry code
              </div>
              <div className="font-display text-3xl tracking-tight">{code}</div>
              <div className="mt-6 grid grid-cols-5 gap-1">
                {/* mini barcode */}
                {Array.from({ length: 30 }).map((_, i) => (
                  <span
                    key={i}
                    className="block"
                    style={{
                      width: 3,
                      height: 28,
                      background: i % 3 === 0 ? "#D3FF24" : i % 2 === 0 ? "#fff" : "rgba(255,255,255,0.3)",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Main */}
            <div className="flex-1 p-8 space-y-6">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">
                  Event
                </div>
                <div className="font-display text-3xl leading-tight">
                  {booking.event_title}
                </div>
                <div className="font-mono text-xs text-white/50 mt-2">
                  {new Date(booking.event_date).toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  · {booking.event_venue}
                </div>
              </div>

              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">
                  Seats ({booking.seats.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {booking.seats.map((s, i) => (
                    <span
                      key={i}
                      className="font-mono text-xs px-2.5 py-1.5 border"
                      style={{
                        borderColor:
                          s.tier === "vip"
                            ? "#FF2E93"
                            : s.tier === "premium"
                              ? "#00F0FF"
                              : "rgba(255,255,255,0.3)",
                        color:
                          s.tier === "vip"
                            ? "#FF2E93"
                            : s.tier === "premium"
                              ? "#00F0FF"
                              : "#FFFFFF",
                      }}
                    >
                      {String.fromCharCode(65 + s.row)}
                      {s.col + 1}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-5">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Total paid
                </span>
                <span className="font-display text-3xl text-[#D3FF24]">
                  ${booking.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Punch holes */}
        <span className="hidden sm:block absolute left-[33.333%] -ml-2 top-0 w-4 h-4 rounded-full bg-[#050505] border border-white/10" />
        <span className="hidden sm:block absolute left-[33.333%] -ml-2 bottom-0 w-4 h-4 rounded-full bg-[#050505] border border-white/10" />
      </motion.div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/dashboard"
          data-testid="go-to-dashboard"
          className="bg-[#D3FF24] text-black font-mono uppercase tracking-[0.18em] text-xs px-6 py-4 hover:bg-white transition-all inline-flex items-center gap-3"
        >
          View my tickets <ArrowRight size={16} />
        </Link>
        <Link
          to="/events"
          className="border border-white/15 hover:border-white/40 font-mono uppercase tracking-[0.18em] text-xs px-6 py-4 transition-all"
        >
          Find another show
        </Link>
      </div>
    </main>
  );
}
