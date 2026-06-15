import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, X } from "lucide-react";
import { api, formatApiErrorDetail } from "../lib/api";
import SeatMap from "../components/SeatMap";

export default function SeatSelection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [taken, setTaken] = useState([]);
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([api.get(`/events/${id}`), api.get(`/events/${id}/seats`)])
      .then(([e, s]) => {
        setEvent(e.data);
        setTaken(s.data.taken || []);
      })
      .catch(() => toast.error("Could not load event"));
  }, [id]);

  const toggleSeat = (seat) => {
    setSelected((prev) => {
      const exists = prev.find((s) => s.row === seat.row && s.col === seat.col);
      if (exists) return prev.filter((s) => !(s.row === seat.row && s.col === seat.col));
      return [...prev, seat];
    });
  };

  const removeSeat = (seat) => {
    setSelected((prev) =>
      prev.filter((s) => !(s.row === seat.row && s.col === seat.col))
    );
  };

  const total = selected.reduce((sum, s) => sum + s.price, 0);

  const confirm = async () => {
    if (selected.length === 0) {
      toast.error("Pick at least one seat first");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/payments/checkout/booking", {
        event_id: id,
        seats: selected,
        origin_url: window.location.origin,
      });
      // Free events come back with a direct /checkout/{id} url
      if (data.url.startsWith("/checkout/")) {
        toast.success("Seats reserved!");
        navigate(data.url);
        return;
      }
      // Otherwise redirect to Stripe checkout
      window.location.href = data.url;
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
      setSubmitting(false);
    }
  };

  if (!event) {
    return <main className="pt-40 text-center text-white/40 font-mono text-sm">Loading venue…</main>;
  }

  return (
    <main className="pt-24 pb-24 max-w-7xl mx-auto px-6 lg:px-10">
      <div className="mb-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#D3FF24] mb-3">
          · Pick your seats ·
        </div>
        <h1 className="font-display text-4xl sm:text-5xl uppercase leading-[0.95]">
          {event.title}
        </h1>
        <div className="font-mono text-xs text-white/40 mt-3">
          {event.venue}, {event.city}
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Seat map */}
        <div
          className="lg:col-span-3 glass p-6 sm:p-10 overflow-x-auto"
          style={{ borderRadius: "24px" }}
        >
          <SeatMap
            event={event}
            taken={taken}
            selected={selected}
            onToggle={toggleSeat}
          />
        </div>

        {/* Summary sidebar */}
        <aside className="lg:sticky lg:top-24 self-start">
          <div
            className="glass p-7 space-y-5"
            style={{ borderRadius: "20px" }}
          >
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                Selection
              </div>
              <div className="font-display text-3xl mt-2">
                {selected.length}{" "}
                <span className="text-white/30 text-lg font-normal">seat{selected.length === 1 ? "" : "s"}</span>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1" data-testid="selection-list">
              {selected.length === 0 ? (
                <div className="font-mono text-xs text-white/40 py-4">
                  Tap any seat to add it here.
                </div>
              ) : (
                selected.map((s) => (
                  <div
                    key={`${s.row}-${s.col}`}
                    className="flex items-center justify-between border border-white/10 px-3 py-2.5 hover:border-white/25 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{
                          background:
                            s.tier === "vip"
                              ? "#FF2E93"
                              : s.tier === "premium"
                                ? "#00F0FF"
                                : "#FFFFFF",
                        }}
                      />
                      <span className="font-mono text-xs">
                        {String.fromCharCode(65 + s.row)}
                        {s.col + 1}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                        {s.tier}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">${s.price}</span>
                      <button
                        onClick={() => removeSeat(s)}
                        data-testid={`remove-seat-${s.row}-${s.col}`}
                        className="text-white/30 hover:text-[#FF2E93]"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-white/10 pt-5 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
                Total
              </span>
              <span className="font-display text-3xl text-[#D3FF24]" data-testid="total-amount">
                ${total.toFixed(2)}
              </span>
            </div>

            <button
              onClick={confirm}
              disabled={submitting || selected.length === 0}
              data-testid="confirm-booking-btn"
              className="w-full bg-[#D3FF24] text-black font-mono uppercase tracking-[0.18em] text-xs px-6 py-4 hover:bg-white transition-all neon-glow inline-flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
            >
              {submitting ? "Redirecting…" : "Pay & confirm seats"}
              {!submitting && <ArrowRight size={16} />}
            </button>
            <div className="text-[10px] text-center text-white/30 font-mono uppercase tracking-widest">
              Seats locked for 15 min · secure Stripe checkout
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
