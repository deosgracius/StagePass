import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, Ticket, User } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const linkBase = "text-sm uppercase tracking-[0.18em] font-mono transition-colors";
  const linkInactive = "text-white/60 hover:text-white";
  const linkActive = "text-[#D3FF24]";

  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link to="/" data-testid="nav-logo" className="flex items-center gap-2 group">
          <div className="w-8 h-8 grid place-items-center bg-[#D3FF24] text-black -rotate-6 group-hover:rotate-0 transition-transform">
            <Ticket size={18} strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl tracking-tight">STAGEPASS</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <NavLink
            to="/"
            end
            data-testid="nav-home"
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
          >
            Home
          </NavLink>
          <NavLink
            to="/events"
            data-testid="nav-events"
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
          >
            Events
          </NavLink>
          {user && (
            <NavLink
              to="/dashboard"
              data-testid="nav-dashboard"
              className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
            >
              My Tickets
            </NavLink>
          )}
          {user && (
            <NavLink
              to="/organize"
              data-testid="nav-organize"
              className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
            >
              Host
            </NavLink>
          )}
          {user?.role === "admin" && (
            <NavLink
              to="/admin"
              data-testid="nav-admin"
              className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
            >
              Admin
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden sm:flex items-center gap-2 text-sm text-white/70 font-mono">
                <User size={14} /> {user.name}
                {user.plan && user.plan !== "starter" && (
                  <span className="ml-1 text-[9px] uppercase tracking-widest px-1.5 py-0.5 border"
                        style={{
                          color: user.plan === "platinum" ? "#FF2E93" : "#00F0FF",
                          borderColor: user.plan === "platinum" ? "#FF2E93" : "#00F0FF",
                        }}>
                    {user.plan}
                  </span>
                )}
              </span>
              <button
                data-testid="logout-btn"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="text-xs uppercase tracking-widest font-mono text-white/60 hover:text-[#FF2E93] flex items-center gap-1.5 transition-colors"
              >
                <LogOut size={14} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                data-testid="nav-login"
                className="text-xs uppercase tracking-widest font-mono text-white/70 hover:text-white"
              >
                Login
              </Link>
              <Link
                to="/register"
                data-testid="nav-register"
                className="text-xs uppercase tracking-widest font-mono bg-[#D3FF24] text-black px-4 py-2 hover:bg-white transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
