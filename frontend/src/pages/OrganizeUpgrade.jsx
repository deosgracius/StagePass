import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Crown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

const PLAN_ACCENT = {
  starter: "#FFFFFF",
  pro: "#00F0FF",
  platinum: "#FF2E93",
};

export default function OrganizeUpgrade() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    api.get("/plans").then((r) => setPlans(r.data));
  }, []);

  const purchase = async (planKey) => {
    if (planKey === user?.plan) {
      toast.info("You're already on this plan");
      return;
    }
    setBusy(planKey);
    try {
      if (planKey === "starter") {
        // Downgrade is free — keep mock endpoint for now
        await api.post("/auth/upgrade", { plan: planKey });
        await refreshUser();
        toast.success("Switched to starter");
        navigate("/organize");
        return;
      }
      const { data } = await api.post("/payments/checkout/plan", {
        plan: planKey,
        origin_url: window.location.origin,
      });
      window.location.href = data.url;
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
      setBusy(null);
    }
  };

  return (
    <main className="pt-28 pb-24 max-w-7xl mx-auto px-6 lg:px-10">
      <div className="text-center mb-16">
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#FF2E93] mb-3">
          · Choose your plan ·
        </div>
        <h1 className="font-display text-5xl sm:text-6xl uppercase leading-[0.95] mb-4">
          Unlock<br />the front row.
        </h1>
        <p className="text-white/55 max-w-xl mx-auto font-light">
          Every host starts free. Upgrade when your venue grows, your audience
          scales, and you need the data to prove it.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6" data-testid="plans-grid">
        {plans.map((p) => {
          const accent = PLAN_ACCENT[p.key];
          const isCurrent = user?.plan === p.key;
          const isHighlight = p.key === "pro";
          return (
            <div
              key={p.key}
              className={`relative glass p-8 flex flex-col ${
                isHighlight ? "lg:-translate-y-2 lg:scale-[1.02]" : ""
              } transition-all`}
              style={{
                borderRadius: "24px",
                borderColor: isHighlight ? `${accent}88` : "rgba(255,255,255,0.1)",
              }}
              data-testid={`plan-${p.key}`}
            >
              {isHighlight && (
                <span
                  className="absolute -top-3 left-8 px-3 py-1 text-[9px] uppercase tracking-[0.25em] font-mono"
                  style={{ background: accent, color: "#000" }}
                >
                  Most popular
                </span>
              )}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.3em]"
                  style={{ color: accent }}
                >
                  {p.name}
                </span>
                {p.key === "platinum" && <Crown size={14} style={{ color: accent }} />}
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-display text-6xl" style={{ color: accent }}>
                  ${p.price}
                </span>
                <span className="font-mono text-xs text-white/40">/ mo</span>
              </div>
              <div className="text-white/40 text-xs font-mono uppercase tracking-widest mb-6">
                {p.max_events === 999 ? "Unlimited events" : `${p.max_events} active event${p.max_events > 1 ? "s" : ""}`}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-3 text-sm text-white/80 font-light">
                    <Check size={16} style={{ color: accent }} className="shrink-0 mt-0.5" />
                    {perk}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => purchase(p.key)}
                disabled={isCurrent || busy === p.key}
                data-testid={`select-plan-${p.key}`}
                className="w-full font-mono uppercase tracking-[0.18em] text-xs px-6 py-3.5 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: isCurrent ? "transparent" : isHighlight ? accent : "transparent",
                  color: isCurrent ? "rgba(255,255,255,0.6)" : isHighlight ? "#000" : accent,
                  border: isHighlight && !isCurrent ? `1px solid ${accent}` : `1px solid ${accent}66`,
                }}
              >
                {busy === p.key ? "Activating…" : isCurrent ? "Current plan" : (
                  <>
                    <Sparkles size={14} /> Select {p.name}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="text-center mt-12 text-[11px] text-white/30 font-mono uppercase tracking-widest">
        Secure checkout via Stripe · cancel anytime
      </div>
    </main>
  );
}
