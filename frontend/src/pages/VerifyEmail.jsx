import React, { useEffect, useState, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { authService } from "../api/auth.service";
import { Mail, CheckCircle, AlertCircle, ArrowRight, Ticket } from "lucide-react";

const VerifyEmail = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get("token");

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const hasRequested = useRef(false);

  useEffect(() => {

    if (hasRequested.current) return;
    hasRequested.current = true;

    const performVerification = async () => {
      if (!token) {
        setMessage("Verification token is missing in the URL.");
        setLoading(false);
        return;
      }

      try {
        const response = await authService.verifyEmail(token);
        if (response.success) {
          setSuccess(true);
          setMessage("Your email address has been successfully verified! You can now access your dashboard.");
        } else {
          setSuccess(false);
          setMessage(response.message || "Failed to verify email.");
        }
      } catch (error) {
        console.error("Email verification error:", error);
        setSuccess(false);
        setMessage(error.response?.data?.message || "Verification link is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    };

    performVerification();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f19] px-4">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/50 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 shadow-2xl z-10 text-center">
        {/* Brand header */}
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-400 mb-6 border border-indigo-500/20">
          <Ticket className="h-6 w-6" />
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto"></div>
            <h2 className="text-xl font-bold text-slate-100">Verifying Email...</h2>
            <p className="text-slate-400 text-sm">Please wait while we confirm your account details.</p>
          </div>
        ) : success ? (
          <div className="space-y-6">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-100">Email Verified!</h2>
              <p className="text-slate-300 text-sm leading-relaxed">{message}</p>
            </div>
            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/10 transition-all duration-200 cursor-pointer"
            >
              Go to Login
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-100">Verification Failed</h2>
              <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                to="/register"
                className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
              >
                Sign Up Again
              </Link>
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
