import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, BarChart3, Crown, Lock, Eye, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

const PLAN_ACCENT = {
  starter: "#FFFFFF",
  pro: "#00F0FF",
  platinum: "#FF2E93",
};

export default function Organize() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [e, p] = await Promise.all([
          api.get("/organize/events"),
          api.get("/plans"),
        ]);
        if (cancelled) return;
        setEvents(e.data);
        setPlans(p.data);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const myPlan = plans.find((p) => p.key === user?.plan) || plans[0];
  const planAccent = PLAN_ACCENT[user?.plan] || "#FFFFFF";

  return (
    <main className="pt-28 pb-24 max-w-7xl mx-auto px-6 lg:px-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-8 mb-12">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#D3FF24] mb-3">
            · Host on StagePass ·
          </div>
          <h1 className="font-display text-5xl sm:text-6xl uppercase leading-[0.95]">
            Your stage,<br />your rules.
          </h1>
          <p className="text-white/55 mt-4 max-w-xl font-light">
            Create events, sell seats, and grow your audience. Upgrade your plan
            to unlock larger venues, analytics, and featured placement.
          </p>
        </div>
        <Link
          to="/organize/new"
          data-testid="create-event-btn"
          className="bg-[#D3FF24] text-black font-mono uppercase tracking-[0.18em] text-xs px-7 py-4 hover:bg-white transition-all neon-glow inline-flex items-center gap-3"
        >
          <Plus size={16} /> Create event
        </Link>
      </div>

      {/* Plan card */}
      {myPlan && (
        <div
          className="glass p-8 mb-12 flex flex-wrap items-center justify-between gap-6"
          style={{ borderRadius: "20px", borderColor: `${planAccent}55` }}
        >
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">
              Current plan
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display text-3xl" style={{ color: planAccent }}>
                {myPlan.name}
              </span>
              {myPlan.key === "platinum" && (
                <Crown size={22} className="text-[#FF2E93]" />
              )}
            </div>
            <div className="text-white/50 text-sm mt-1 font-light">
              {myPlan.max_events === 999 ? "Unlimited" : `Up to ${myPlan.max_events}`} event
              {myPlan.max_events !== 1 ? "s" : ""} · Max venue {myPlan.max_rows}×{myPlan.max_cols}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 max-w-md">
            {myPlan.perks.slice(0, 3).map((p) => (
              <span
                key={p}
                className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-1.5 border border-white/15 text-white/70"
              >
                {p}
              </span>
            ))}
          </div>
          {user?.plan !== "platinum" && (
            <Link
              to="/organize/upgrade"
              data-testid="upgrade-link"
              className="border border-[#FF2E93] text-[#FF2E93] hover:bg-[#FF2E93] hover:text-white font-mono uppercase tracking-[0.18em] text-xs px-6 py-3 transition-all inline-flex items-center gap-2"
            >
              <Sparkles size={14} /> Upgrade
            </Link>
          )}
        </div>
      )}

      {/* My events list */}
      <h2 className="font-display text-2xl uppercase mb-6 flex items-center gap-3">
        <span className="text-white/30 font-mono text-base">/</span> My events
      </h2>

      {loading ? (
        <div className="font-mono text-sm text-white/40">Loading…</div>
      ) : events.length === 0 ? (
        <div className="glass p-12 text-center" style={{ borderRadius: "24px" }}>
          <BarChart3 size={32} className="text-[#D3FF24] mx-auto mb-4" />
          <div className="font-display text-3xl mb-2">No events yet</div>
          <p className="text-white/50 mb-6 font-light">
            Your first event is one click away.
          </p>
          <Link
            to="/organize/new"
            data-testid="first-event-btn"
            className="inline-flex items-center gap-2 bg-[#D3FF24] text-black font-mono uppercase tracking-[0.18em] text-xs px-6 py-3.5 hover:bg-white transition-all"
          >
            <Plus size={14} /> Create your first event
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="organizer-event-list">
          {events.map((ev) => (
            <OrganizerEventCard key={ev.id} event={ev} planAccent={planAccent} canAnalytics={myPlan?.analytics} />
          ))}
        </div>
      )}
    </main>
  );
}

function OrganizerEventCard({ event, planAccent, canAnalytics }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let cancelled = false;
    api
      .get(`/organize/events/${event.id}/stats`)
      .then((r) => {
        if (!cancelled) {
          setStats(r.data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [event.id]);
  return (
    <div className="glass p-6 hover:-translate-y-1 transition-all duration-500"
         style={{ borderRadius: "20px" }}
         data-testid={`org-event-${event.id}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1">
            {event.category} · {event.status}
          </div>
          <div className="font-display text-xl leading-tight">{event.title}</div>
        </div>
        {event.featured && (
          <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-1 bg-[#FF2E93] text-white">
            Featured
          </span>
        )}
      </div>
      <div className="text-xs text-white/55 font-mono mb-4">
        {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })} ·{" "}
        {event.venue}
      </div>
      {stats && (
        <div className="grid grid-cols-3 gap-3 text-center mb-4">
          <div>
            <div className="font-display text-lg" style={{ color: planAccent }}>
              {stats.occupancy_pct}%
            </div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-white/40">
              filled
            </div>
          </div>
          <div>
            <div className="font-display text-lg text-[#D3FF24]">
              {canAnalytics ? `$${stats.revenue}` : <Lock size={14} className="mx-auto" />}
            </div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-white/40">
              revenue
            </div>
          </div>
          <div>
            <div className="font-display text-lg">{stats.booking_count}</div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-white/40">
              orders
            </div>
          </div>
        </div>
      )}
      <Link
        to={`/events/${event.id}`}
        className="font-mono text-[10px] uppercase tracking-widest text-white/60 hover:text-[#D3FF24] inline-flex items-center gap-1.5"
      >
        <Eye size={12} /> View public page →
      </Link>
    </div>
  );
}
