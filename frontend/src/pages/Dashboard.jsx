import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Ticket as TicketIcon, Calendar, MapPin } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/bookings/me")
      .then((r) => setBookings(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="pt-28 pb-24 max-w-7xl mx-auto px-6 lg:px-10">
      <div className="mb-12">
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#D3FF24] mb-3">
          · Hi {user?.name?.split(" ")[0] || "there"} ·
        </div>
        <h1 className="font-display text-5xl sm:text-6xl uppercase">
          My Tickets
        </h1>
      </div>

      {loading ? (
        <div className="font-mono text-sm text-white/40">Loading tickets…</div>
      ) : bookings.length === 0 ? (
        <div className="glass p-12 text-center" style={{ borderRadius: "24px" }}>
          <TicketIcon size={36} className="text-[#D3FF24] mx-auto mb-4" />
          <div className="font-display text-3xl mb-2">No tickets yet</div>
          <p className="text-white/50 mb-6 font-light">Your future memories live here.</p>
          <Link
            to="/events"
            data-testid="browse-events-empty"
            className="inline-block bg-[#D3FF24] text-black font-mono uppercase tracking-[0.18em] text-xs px-6 py-3.5 hover:bg-white transition-all"
          >
            Browse events
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5" data-testid="booking-list">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="glass p-6 flex flex-col gap-4 hover:-translate-y-1 transition-all duration-500"
              style={{ borderRadius: "20px" }}
              data-testid={`booking-${b.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">
                    {b.status}
                  </div>
                  <div className="font-display text-2xl leading-tight">
                    {b.event_title}
                  </div>
                </div>
                <TicketIcon size={22} className="text-[#D3FF24] shrink-0" />
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-[11px] text-white/60">
                <span className="flex items-center gap-1.5">
                  <Calendar size={12} />
                  {new Date(b.event_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={12} />
                  {b.event_venue}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {b.seats.map((s, i) => (
                  <span
                    key={i}
                    className="font-mono text-[10px] px-2 py-1 border border-white/15 text-white/80"
                  >
                    {String.fromCharCode(65 + s.row)}
                    {s.col + 1}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                  Total
                </span>
                <span className="font-display text-2xl text-[#D3FF24]">
                  ${b.total.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
