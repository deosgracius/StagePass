import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);
    if (result.ok) {
      toast.success("Account created. Lights up.");
      navigate("/events");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <main className="pt-28 pb-24 min-h-screen flex items-center">
      <div className="max-w-md mx-auto w-full px-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#FF2E93] mb-3">
          · Create account ·
        </div>
        <h1 className="font-display text-5xl uppercase leading-[0.95] mb-8">
          Take the<br />front row.
        </h1>

        <form onSubmit={submit} className="glass p-8 space-y-5" style={{ borderRadius: "20px" }}>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/50 block mb-2">
              Full name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="register-name"
              className="w-full bg-black/50 border border-white/10 px-4 py-3.5 font-mono text-sm focus-neon rounded-lg"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/50 block mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="register-email"
              className="w-full bg-black/50 border border-white/10 px-4 py-3.5 font-mono text-sm focus-neon rounded-lg"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/50 block mb-2">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="register-password"
              className="w-full bg-black/50 border border-white/10 px-4 py-3.5 font-mono text-sm focus-neon rounded-lg"
            />
            <div className="text-[10px] text-white/30 font-mono mt-1.5">
              Minimum 6 characters
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            data-testid="register-submit"
            className="w-full bg-[#FF2E93] text-white font-mono uppercase tracking-[0.18em] text-xs px-6 py-4 hover:bg-[#D3FF24] hover:text-black transition-all neon-glow-pink inline-flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
            {!loading && <ArrowRight size={16} />}
          </button>
          <div className="text-center text-xs text-white/40 font-mono">
            Already on StagePass?{" "}
            <Link to="/login" className="text-[#D3FF24] hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
