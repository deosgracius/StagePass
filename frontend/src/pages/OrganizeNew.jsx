import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

const DEFAULT_TIERS = [
  { key: "vip", label: "VIP", price: 200, rows: [0, 1] },
  { key: "premium", label: "Premium", price: 120, rows: [2, 3, 4] },
  { key: "standard", label: "Standard", price: 60, rows: [5, 6, 7, 8, 9] },
];

const CATEGORIES = ["concert", "theater", "sports", "comedy"];

export default function OrganizeNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    tagline: "",
    category: "concert",
    venue: "",
    city: "",
    date: "",
    image_url: "",
    description: "",
    performer: "",
    duration_min: 120,
    rows: 10,
    cols: 14,
    tiers: DEFAULT_TIERS,
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const updateTier = (i, k, v) =>
    setForm((f) => ({
      ...f,
      tiers: f.tiers.map((t, idx) => (idx === i ? { ...t, [k]: v } : t)),
    }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Auto-allocate rows across 3 tiers based on the selected venue size.
      const splitRows = (rows) => {
        const vipCount = Math.max(1, Math.min(2, Math.floor(rows * 0.15)));
        const premCount = Math.max(1, Math.floor(rows * 0.35));
        const stdStart = vipCount + premCount;
        const all = Array.from({ length: rows }, (_, i) => i);
        return [
          all.slice(0, vipCount),
          all.slice(vipCount, stdStart),
          all.slice(stdStart),
        ];
      };
      const [vipRows, premRows, stdRows] = splitRows(Number(form.rows));
      const tiers = form.tiers.map((t, i) => ({
        ...t,
        price: Number(t.price),
        rows: [vipRows, premRows, stdRows][i],
      }));

      const payload = {
        ...form,
        rows: Number(form.rows),
        cols: Number(form.cols),
        duration_min: Number(form.duration_min),
        // FastAPI accepts ISO; convert datetime-local to ISO with seconds
        date: form.date ? `${form.date}:00` : "",
        tiers,
      };
      const { data } = await api.post("/organize/events", payload);
      toast.success("Event published!");
      navigate(`/events/${data.id}`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="pt-28 pb-24 max-w-4xl mx-auto px-6 lg:px-10">
      <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#D3FF24] mb-3">
        · New event ·
      </div>
      <h1 className="font-display text-5xl uppercase leading-[0.95] mb-2">
        Cast the lights.
      </h1>
      <p className="text-white/55 mb-10 font-light">
        Plan: <span className="text-white/80">{user?.plan || "starter"}</span>. Need bigger venue or analytics?{" "}
        <a href="/organize/upgrade" className="text-[#D3FF24] hover:underline">Upgrade</a>.
      </p>

      <form onSubmit={submit} className="glass p-8 space-y-6" style={{ borderRadius: "20px" }} data-testid="event-form">
        <Section title="Event details">
          <Grid>
            <Field label="Title" required>
              <input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                data-testid="field-title"
                className={inputCls}
                required
                maxLength={80}
              />
            </Field>
            <Field label="Performer">
              <input
                value={form.performer}
                onChange={(e) => update("performer", e.target.value)}
                data-testid="field-performer"
                className={inputCls}
                required
              />
            </Field>
            <Field label="Tagline" full>
              <input
                value={form.tagline}
                onChange={(e) => update("tagline", e.target.value)}
                data-testid="field-tagline"
                className={inputCls}
                required
                maxLength={140}
              />
            </Field>
            <Field label="Description" full>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                data-testid="field-description"
                className={`${inputCls} min-h-[120px] resize-y`}
                required
              />
            </Field>
            <Field label="Category">
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                data-testid="field-category"
                className={inputCls}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date & time">
              <input
                type="datetime-local"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                data-testid="field-date"
                className={inputCls}
                required
              />
            </Field>
            <Field label="Venue">
              <input
                value={form.venue}
                onChange={(e) => update("venue", e.target.value)}
                data-testid="field-venue"
                className={inputCls}
                required
              />
            </Field>
            <Field label="City">
              <input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                data-testid="field-city"
                className={inputCls}
                required
              />
            </Field>
            <Field label="Duration (minutes)">
              <input
                type="number"
                min="30"
                max="600"
                value={form.duration_min}
                onChange={(e) => update("duration_min", e.target.value)}
                data-testid="field-duration"
                className={inputCls}
                required
              />
            </Field>
            <Field label="Cover image URL" full>
              <input
                value={form.image_url}
                onChange={(e) => update("image_url", e.target.value)}
                data-testid="field-image"
                className={inputCls}
                placeholder="https://images.unsplash.com/..."
                required
              />
              <div className="text-[10px] text-white/30 font-mono mt-1.5">
                Paste any direct image URL. Square or landscape works best.
              </div>
            </Field>
          </Grid>
        </Section>

        <Section title="Venue layout">
          <Grid>
            <Field label="Rows">
              <input
                type="number"
                min="4"
                max="25"
                value={form.rows}
                onChange={(e) => update("rows", e.target.value)}
                data-testid="field-rows"
                className={inputCls}
              />
            </Field>
            <Field label="Columns">
              <input
                type="number"
                min="4"
                max="30"
                value={form.cols}
                onChange={(e) => update("cols", e.target.value)}
                data-testid="field-cols"
                className={inputCls}
              />
            </Field>
          </Grid>
        </Section>

        <Section title="Pricing tiers">
          <div className="space-y-3">
            {form.tiers.map((t, i) => (
              <div key={t.key} className="grid grid-cols-3 gap-3 items-center" data-testid={`tier-${t.key}`}>
                <div className="font-mono text-xs uppercase tracking-widest text-white/40">
                  {t.label}
                </div>
                <Field label="Price ($)">
                  <input
                    type="number"
                    min="0"
                    value={t.price}
                    onChange={(e) => updateTier(i, "price", e.target.value)}
                    data-testid={`field-price-${t.key}`}
                    className={inputCls}
                  />
                </Field>
                <div className="font-mono text-[10px] text-white/30">
                  Rows auto-allocated
                </div>
              </div>
            ))}
          </div>
        </Section>

        <button
          type="submit"
          disabled={submitting}
          data-testid="publish-event-btn"
          className="w-full bg-[#D3FF24] text-black font-mono uppercase tracking-[0.18em] text-xs px-6 py-4 hover:bg-white transition-all neon-glow inline-flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {submitting ? "Publishing…" : "Publish event"}
          {!submitting && <ArrowRight size={16} />}
        </button>
      </form>
    </main>
  );
}

const inputCls =
  "w-full bg-black/50 border border-white/10 px-4 py-3 font-mono text-sm focus-neon rounded-lg";

function Section({ title, children }) {
  return (
    <div>
      <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#D3FF24] mb-4">
        · {title} ·
      </h3>
      {children}
    </div>
  );
}

function Grid({ children }) {
  return <div className="grid sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, full, children }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/50 block mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
