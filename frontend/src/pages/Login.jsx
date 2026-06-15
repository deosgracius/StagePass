import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("demo@stagepass.app");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) {
      toast.success("Welcome back");
      const redirect = location.state?.from || "/events";
      navigate(redirect);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <main className="pt-28 pb-24 min-h-screen flex items-center">
      <div className="max-w-md mx-auto w-full px-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#D3FF24] mb-3">
          · Sign in ·
        </div>
        <h1 className="font-display text-5xl uppercase leading-[0.95] mb-8">
          Welcome back.
        </h1>

        <form onSubmit={submit} className="glass p-8 space-y-5" style={{ borderRadius: "20px" }}>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/50 block mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="login-email"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="login-password"
              className="w-full bg-black/50 border border-white/10 px-4 py-3.5 font-mono text-sm focus-neon rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            data-testid="login-submit"
            className="w-full bg-[#D3FF24] text-black font-mono uppercase tracking-[0.18em] text-xs px-6 py-4 hover:bg-white transition-all neon-glow inline-flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
            {!loading && <ArrowRight size={16} />}
          </button>
          <div className="text-center text-xs text-white/40 font-mono">
            No account?{" "}
            <Link to="/register" className="text-[#D3FF24] hover:underline">
              Create one
            </Link>
          </div>
        </form>
        <div className="mt-6 text-[11px] text-center font-mono text-white/30">
          Demo: demo@stagepass.app · demo1234
        </div>
      </div>
    </main>
  );
}
