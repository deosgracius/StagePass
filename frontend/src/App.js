import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Landing from "@/pages/Landing";
import Events from "@/pages/Events";
import EventDetail from "@/pages/EventDetail";
import SeatSelection from "@/pages/SeatSelection";
import Checkout from "@/pages/Checkout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Organize from "@/pages/Organize";
import OrganizeNew from "@/pages/OrganizeNew";
import OrganizeUpgrade from "@/pages/OrganizeUpgrade";
import Admin from "@/pages/Admin";
import EventEdit from "@/pages/EventEdit";
import PaymentReturn from "@/pages/PaymentReturn";

function Protected({ children, admin }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

function AppShell() {
  return (
    <div className="App grain min-h-screen text-white">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route
          path="/events/:id/seats"
          element={
            <Protected>
              <SeatSelection />
            </Protected>
          }
        />
        <Route
          path="/checkout/:bookingId"
          element={
            <Protected>
              <Checkout />
            </Protected>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />
        <Route
          path="/organize"
          element={
            <Protected>
              <Organize />
            </Protected>
          }
        />
        <Route
          path="/organize/new"
          element={
            <Protected>
              <OrganizeNew />
            </Protected>
          }
        />
        <Route
          path="/organize/upgrade"
          element={
            <Protected>
              <OrganizeUpgrade />
            </Protected>
          }
        />
        <Route
          path="/organize/events/:id/edit"
          element={
            <Protected>
              <EventEdit />
            </Protected>
          }
        />
        <Route
          path="/payment-return"
          element={
            <Protected>
              <PaymentReturn />
            </Protected>
          }
        />
        <Route
          path="/admin"
          element={
            <Protected admin>
              <Admin />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" theme="dark" richColors />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
