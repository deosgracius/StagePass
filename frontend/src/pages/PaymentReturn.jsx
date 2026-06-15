import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

const MAX_ATTEMPTS = 8;
const INTERVAL_MS = 2000;

export default function PaymentReturn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { refreshUser } = useAuth();

  const [state, setState] = useState("polling"); // polling | paid | failed | expired
  const [message, setMessage] = useState("Confirming your payment…");
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!sessionId) {
      setState("failed");
      setMessage("Missing session id");
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (cancelled) return;
        if (data.payment_status === "paid") {
          if (data.kind === "plan") {
            await refreshUser();
            setState("paid");
            setMessage("Plan activated. Redirecting…");
            setTimeout(() => navigate("/organize"), 1000);
          } else if (data.kind === "booking" && data.booking_id) {
            setState("paid");
            setMessage("Seats locked in. Loading your ticket…");
            setTimeout(() => navigate(`/checkout/${data.booking_id}`), 800);
          } else {
            setState("paid");
            setMessage("Payment received");
          }
          return;
        }
        if (data.status === "expired" || data.payment_status === "unpaid") {
          setState("expired");
          setMessage("Payment was cancelled or expired.");
          return;
        }
        attemptsRef.current += 1;
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setState("failed");
          setMessage("Still processing… check My Tickets in a minute.");
          return;
        }
        setTimeout(poll, INTERVAL_MS);
      } catch {
        if (cancelled) return;
        setState("failed");
        setMessage("Could not check payment status");
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate, refreshUser]);

  const Icon = state === "paid" ? CheckCircle2 : state === "polling" ? Loader2 : XCircle;
  const accent = state === "paid" ? "#D3FF24" : state === "polling" ? "#00F0FF" : "#FF2E93";

  return (
    <main className="pt-40 pb-24 min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-center" data-testid="payment-return-state">
        <Icon
          size={56}
          className={`mx-auto mb-6 ${state === "polling" ? "animate-spin" : ""}`}
          style={{ color: accent }}
        />
        <div className="font-mono text-[10px] uppercase tracking-[0.4em] mb-3" style={{ color: accent }}>
          {state === "polling" ? "Verifying" : state === "paid" ? "Confirmed" : "Failed"}
        </div>
        <h1 className="font-display text-4xl uppercase mb-3">{message}</h1>
        <div className="font-mono text-xs text-white/40 mt-6">{sessionId}</div>
        {state !== "polling" && state !== "paid" && (
          <button
            onClick={() => navigate("/events")}
            data-testid="payment-return-back"
            className="mt-8 border border-white/15 hover:border-white/40 font-mono uppercase tracking-[0.18em] text-xs px-6 py-3 transition-all"
          >
            Back to events
          </button>
        )}
      </div>
    </main>
  );
}
