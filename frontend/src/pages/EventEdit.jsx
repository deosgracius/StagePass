import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Ban } from "lucide-react";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import ImageUploader from "../components/ImageUploader";

const CATEGORIES = ["concert", "theater", "sports", "comedy"];

export default function EventEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get(`/events/${id}`).then((r) => {
      if (cancelled) return;
      const ev = r.data;
      const dt = ev.date ? ev.date.slice(0, 16) : "";
      setForm({ ...ev, date: dt });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!form) return <main className="pt-40 text-center text-white/40 font-mono text-sm">Loading…</main>;

  const isOwner = form.organizer_id === user?.id || user?.role === "admin";
  if (!isOwner) {
    return <main className="pt-40 text-center text-white/60">Not your event.</main>;
  }

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/organize/events/${id}`, {
        title: form.title,
        tagline: form.tagline,
        category: form.category,
        venue: form.venue,
        city: form.city,
        date: form.date ? `${form.date}:00` : undefined,
        image_url: form.image_url,
        description: form.description,
        performer: form.performer,
        duration_min: Number(form.duration_min),
      });
      toast.success("Event updated");
      navigate(`/events/${id}`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm("Cancel this event? Existing tickets will remain bookable until refunded.")) return;
    setCancelling(true);
    try {
      await api.delete(`/organize/events/${id}`);
      toast.success("Event cancelled");
      navigate("/organize");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setCancelling(false);
    }
  };

  const inputCls =
    "w-full bg-black/50 border border-white/10 px-4 py-3 font-mono text-sm focus-neon rounded-lg";

  return (
    <main className="pt-28 pb-24 max-w-4xl mx-auto px-6 lg:px-10">
      <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#00F0FF] mb-3">
        · Edit event ·
      </div>
      <h1 className="font-display text-5xl uppercase leading-[0.95] mb-2">
        {form.title}
      </h1>
      <p className="text-white/55 mb-10 font-light">
        Status: <span className="text-white/80">{form.status}</span> · Plan-locked features (venue size, tiers) cannot be changed after publish.
      </p>

      <form onSubmit={submit} className="glass p-8 space-y-6" style={{ borderRadius: "20px" }} data-testid="edit-form">
        <Block label="Title">
          <input value={form.title} onChange={(e) => update("title", e.target.value)} className={inputCls} data-testid="edit-title" />
        </Block>
        <Block label="Tagline">
          <input value={form.tagline} onChange={(e) => update("tagline", e.target.value)} className={inputCls} data-testid="edit-tagline" />
        </Block>
        <Block label="Description">
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className={`${inputCls} min-h-[120px] resize-y`}
            data-testid="edit-description"
          />
        </Block>
        <div className="grid sm:grid-cols-2 gap-4">
          <Block label="Category">
            <select value={form.category} onChange={(e) => update("category", e.target.value)} className={inputCls} data-testid="edit-category">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Block>
          <Block label="Performer">
            <input value={form.performer} onChange={(e) => update("performer", e.target.value)} className={inputCls} data-testid="edit-performer" />
          </Block>
          <Block label="Date & time">
            <input
              type="datetime-local"
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              className={inputCls}
              data-testid="edit-date"
            />
          </Block>
          <Block label="Duration (min)">
            <input
              type="number" min="30" max="600"
              value={form.duration_min}
              onChange={(e) => update("duration_min", e.target.value)}
              className={inputCls}
              data-testid="edit-duration"
            />
          </Block>
          <Block label="Venue">
            <input value={form.venue} onChange={(e) => update("venue", e.target.value)} className={inputCls} data-testid="edit-venue" />
          </Block>
          <Block label="City">
            <input value={form.city} onChange={(e) => update("city", e.target.value)} className={inputCls} data-testid="edit-city" />
          </Block>
        </div>
        <Block label="Cover image">
          <ImageUploader value={form.image_url} onChange={(v) => update("image_url", v)} testId="edit-image" />
        </Block>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            data-testid="save-event-btn"
            className="bg-[#D3FF24] text-black font-mono uppercase tracking-[0.18em] text-xs px-7 py-3.5 hover:bg-white transition-all neon-glow inline-flex items-center gap-3 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save changes"}
            {!submitting && <ArrowRight size={16} />}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={cancelling}
            data-testid="cancel-event-btn"
            className="border border-white/15 hover:border-[#FF2E93] hover:text-[#FF2E93] font-mono uppercase tracking-[0.18em] text-xs px-6 py-3.5 transition-all inline-flex items-center gap-3 disabled:opacity-50"
          >
            <Ban size={14} /> {cancelling ? "Cancelling…" : "Cancel event"}
          </button>
        </div>
      </form>
    </main>
  );
}

function Block({ label, children }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/50 block mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
