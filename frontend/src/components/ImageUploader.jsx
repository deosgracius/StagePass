import { useRef, useState } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { api, API, formatApiErrorDetail } from "../lib/api";

/**
 * ImageUploader — supports either pasting a URL or uploading a file.
 * Posts to /api/uploads/image and returns the public URL via onChange.
 */
export default function ImageUploader({ value, onChange, testId = "image-uploader" }) {
  const fileInput = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState(value && value.startsWith("/api/uploads") ? "upload" : "url");

  const fullSrc = (v) => {
    if (!v) return "";
    if (v.startsWith("http")) return v;
    // Backend served at API origin
    return `${API.replace(/\/api$/, "")}${v}`;
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/uploads/image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(data.url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div data-testid={testId}>
      <div className="flex items-center gap-1 mb-2">
        {[
          { key: "url", label: "Paste URL" },
          { key: "upload", label: "Upload file" },
        ].map((tab) => (
          <button
            type="button"
            key={tab.key}
            onClick={() => setMode(tab.key)}
            data-testid={`${testId}-mode-${tab.key}`}
            className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 border transition-all ${
              mode === tab.key
                ? "border-[#D3FF24] text-[#D3FF24]"
                : "border-white/15 text-white/50 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "url" ? (
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          data-testid={`${testId}-url-input`}
          className="w-full bg-black/50 border border-white/10 px-4 py-3 font-mono text-sm focus-neon rounded-lg"
          placeholder="https://images.unsplash.com/..."
        />
      ) : (
        <div>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
            data-testid={`${testId}-file-input`}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            data-testid={`${testId}-pick-btn`}
            className="w-full border border-dashed border-white/15 hover:border-[#D3FF24] hover:text-[#D3FF24] px-4 py-5 font-mono text-xs uppercase tracking-widest text-white/60 transition-all inline-flex items-center justify-center gap-3 rounded-lg disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Uploading…" : "Click to pick image (max 5MB)"}
          </button>
        </div>
      )}

      {value && (
        <div className="mt-3 relative inline-block">
          <img
            src={fullSrc(value)}
            alt=""
            className="h-24 rounded-lg border border-white/10 object-cover"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            data-testid={`${testId}-clear-btn`}
            className="absolute -top-2 -right-2 w-6 h-6 bg-black border border-white/20 grid place-items-center rounded-full hover:border-[#FF2E93] hover:text-[#FF2E93]"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
