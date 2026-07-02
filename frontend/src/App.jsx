import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreateTicket from "./pages/CreateTicket";
import TicketDetails from "./pages/TicketDetails";
import OrganizationSettings from "./pages/OrganizationSettings";
import JoinOrg from "./pages/JoinOrg";
import VerifyEmail from "./pages/VerifyEmail";

// Loading component
const FullPageLoading = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-[#0b0f19]">
    <div className="flex flex-col items-center gap-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      <p className="text-slate-400 font-medium animate-pulse">Initializing Session...</p>
    </div>
  </div>
);

// Protected routes require authentication
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <FullPageLoading />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
};

// Public routes are only accessible when logged out
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <FullPageLoading />;
  if (user) return <Navigate to="/" replace />;

  return children;
};

// Main Layout wrapping private pages
const MainLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-[#0b0f19]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

// Join Org page that conditionally renders layout based on auth state
const JoinOrgWrapper = () => {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoading />;
  
  if (user) {
    return (
      <MainLayout>
        <JoinOrg />
      </MainLayout>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f19] px-4">
      <JoinOrg />
    </div>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/verify-email"
        element={
          <VerifyEmail />
        }
      />

      {/* Protected App Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-ticket"
        element={
          <ProtectedRoute>
            <MainLayout>
              <CreateTicket />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets/:ticketId"
        element={
          <ProtectedRoute>
            <MainLayout>
              <TicketDetails />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/organization"
        element={
          <ProtectedRoute>
            <MainLayout>
              <OrganizationSettings />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Public/Hybrid Routes */}
      <Route
        path="/join-org"
        element={
          <JoinOrgWrapper />
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
