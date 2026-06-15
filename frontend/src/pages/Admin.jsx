import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Star, Users, Calendar } from "lucide-react";
import { api, formatApiErrorDetail } from "../lib/api";

export default function Admin() {
  const [tab, setTab] = useState("events");
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);

  const reload = async () => {
    const [e, u] = await Promise.all([
      api.get("/admin/events"),
      api.get("/admin/users"),
    ]);
    setEvents(e.data);
    setUsers(u.data);
  };

  useEffect(() => {
    reload();
  }, []);

  const toggleFeatured = async (id, current) => {
    try {
      await api.patch(`/admin/events/${id}/feature?featured=${!current}`);
      toast.success(!current ? "Marked as featured" : "Removed from featured");
      reload();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  };

  return (
    <main className="pt-28 pb-24 max-w-7xl mx-auto px-6 lg:px-10">
      <div className="mb-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#FF2E93] mb-3">
          · Admin console ·
        </div>
        <h1 className="font-display text-5xl uppercase">Mission Control</h1>
      </div>

      <div className="flex gap-2 mb-10 border-b border-white/10">
        {[
          { key: "events", label: `Events (${events.length})`, icon: Calendar },
          { key: "users", label: `Users (${users.length})`, icon: Users },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              data-testid={`admin-tab-${t.key}`}
              className={`font-mono text-xs uppercase tracking-[0.2em] px-5 py-3 border-b-2 inline-flex items-center gap-2 transition-all ${
                active
                  ? "border-[#D3FF24] text-[#D3FF24]"
                  : "border-transparent text-white/40 hover:text-white"
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "events" && (
        <div className="space-y-3" data-testid="admin-event-list">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="glass p-5 flex flex-wrap items-center gap-4"
              style={{ borderRadius: "16px" }}
            >
              <img src={ev.image_url} alt="" className="w-20 h-20 object-cover rounded-lg" />
              <div className="flex-1 min-w-[200px]">
                <div className="font-display text-lg">{ev.title}</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mt-1">
                  {ev.category} · {ev.city} · {ev.organizer_name || "—"}
                </div>
                <div className="font-mono text-xs text-white/50 mt-1">
                  {new Date(ev.date).toLocaleDateString()} · status: {ev.status || "published"}
                </div>
              </div>
              <button
                onClick={() => toggleFeatured(ev.id, ev.featured)}
                data-testid={`feature-${ev.id}`}
                className={`font-mono text-xs uppercase tracking-widest px-4 py-2 transition-all inline-flex items-center gap-2 border ${
                  ev.featured
                    ? "bg-[#FF2E93] border-[#FF2E93] text-white"
                    : "border-white/20 text-white/60 hover:border-[#FF2E93] hover:text-[#FF2E93]"
                }`}
              >
                <Star size={12} fill={ev.featured ? "currentColor" : "none"} />
                {ev.featured ? "Featured" : "Mark featured"}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-3" data-testid="admin-user-list">
          {users.map((u) => (
            <div
              key={u.id}
              className="glass p-5 flex flex-wrap items-center justify-between gap-4"
              style={{ borderRadius: "16px" }}
            >
              <div>
                <div className="font-display text-lg">{u.name}</div>
                <div className="font-mono text-xs text-white/50 mt-1">{u.email}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 border border-white/15 text-white/70">
                  {u.role}
                </span>
                <span
                  className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 border"
                  style={{
                    color:
                      u.plan === "platinum"
                        ? "#FF2E93"
                        : u.plan === "pro"
                          ? "#00F0FF"
                          : "rgba(255,255,255,0.5)",
                    borderColor:
                      u.plan === "platinum"
                        ? "#FF2E93"
                        : u.plan === "pro"
                          ? "#00F0FF"
                          : "rgba(255,255,255,0.15)",
                  }}
                >
                  {u.plan}
                </span>
                <span className="font-mono text-xs text-white/50">
                  {u.event_count} events
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
