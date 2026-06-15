import { motion } from "framer-motion";

/**
 * CSS-only 3D-feeling hero scene.
 * Floating, parallaxing neon tickets + orbital rings.
 * Avoids React Three Fiber to stay compatible with the visual-edits attr injector.
 */
export default function HeroScene() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Radial halos */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full"
           style={{ background: "radial-gradient(closest-side, rgba(211,255,36,0.18), transparent 70%)" }} />
      <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full"
           style={{ background: "radial-gradient(closest-side, rgba(255,46,147,0.16), transparent 70%)" }} />
      <div className="absolute top-1/3 left-1/2 w-[500px] h-[500px] rounded-full -translate-x-1/2"
           style={{ background: "radial-gradient(closest-side, rgba(0,240,255,0.08), transparent 70%)" }} />

      {/* Orbital rings (centered, far right) */}
      <div className="absolute right-[8%] top-1/2 -translate-y-1/2 w-[520px] h-[520px] hidden lg:block"
           style={{ perspective: "1200px" }}>
        <motion.div
          animate={{ rotateZ: [0, 360] }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border border-[#D3FF24]/25"
          style={{ transform: "rotateX(70deg)" }}
        />
        <motion.div
          animate={{ rotateZ: [360, 0] }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
          className="absolute inset-8 rounded-full border border-[#FF2E93]/30"
          style={{ transform: "rotateX(70deg)" }}
        />
        <motion.div
          animate={{ rotateZ: [0, 360] }}
          transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
          className="absolute inset-16 rounded-full border border-[#00F0FF]/20"
          style={{ transform: "rotateX(70deg)" }}
        />
        {/* Central glow */}
        <div
          className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full float-slow"
          style={{
            background:
              "radial-gradient(closest-side, rgba(211,255,36,0.85), rgba(211,255,36,0.1) 60%, transparent)",
            filter: "blur(6px)",
          }}
        />
      </div>

      {/* Floating neon "tickets" - CSS 3D cards */}
      <FloatingTicket
        className="left-[6%] top-[28%] hidden md:block"
        rotate="rotateY(-22deg) rotateZ(-6deg)"
        color="#D3FF24"
        delay={0}
      />
      <FloatingTicket
        className="right-[22%] top-[18%] hidden lg:block"
        rotate="rotateY(18deg) rotateZ(8deg)"
        color="#FF2E93"
        delay={1.2}
      />
      <FloatingTicket
        className="left-[16%] bottom-[8%] hidden xl:block"
        rotate="rotateY(-10deg) rotateZ(4deg)"
        color="#00F0FF"
        delay={2.4}
      />
    </div>
  );
}

function FloatingTicket({ className = "", rotate, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay }}
      className={`absolute ${className}`}
      style={{ perspective: "1000px" }}
    >
      <motion.div
        animate={{ y: [0, -18, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay }}
        style={{ transform: rotate, transformStyle: "preserve-3d" }}
      >
        <div
          className="relative w-44 h-24 rounded-xl border backdrop-blur-md"
          style={{
            background: "rgba(10,10,10,0.6)",
            borderColor: `${color}66`,
            boxShadow: `0 0 30px ${color}33, 0 12px 30px rgba(0,0,0,0.6)`,
          }}
        >
          <div
            className="absolute inset-y-3 left-2.5 w-1 rounded-full"
            style={{ background: color, boxShadow: `0 0 12px ${color}` }}
          />
          <div className="absolute top-3 right-3 font-mono text-[9px] uppercase tracking-[0.25em]" style={{ color }}>
            VIP · 26
          </div>
          <div className="absolute bottom-3 left-6 font-display text-base text-white/80">
            ROW A · 12
          </div>
          <div
            className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-10 rounded-full"
            style={{ background: "#050505" }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
