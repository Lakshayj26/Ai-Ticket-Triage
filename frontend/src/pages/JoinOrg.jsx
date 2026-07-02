import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { orgService } from "../api/org.service";
import { useAuth } from "../context/AuthContext";
import { Building, ShieldAlert, CheckCircle, AlertCircle, LogIn, UserPlus } from "lucide-react";

const JoinOrg = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser, logout } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get("token") || localStorage.getItem("inviteToken");

  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!token) {
      setError("No invitation token found. Please verify your link.");
      return;
    }

    try {
      // Save token in localStorage to preserve it across login/register redirects
      localStorage.setItem("inviteToken", token);

      // Decode JWT token payload on client side to read details
      const payloadBase64 = token.split(".")[1];
      const decodedPayload = JSON.parse(atob(payloadBase64));
      setInviteData(decodedPayload);

      // Verify email matching only if the user is logged in
      if (user && user.email.toLowerCase() !== decodedPayload.email.toLowerCase()) {
        setError(`This invitation was sent to ${decodedPayload.email}, but you are logged in as ${user.email}. Please switch accounts to accept.`);
      } else if (user) {
        // Clear error if user email matches the decoded invitation email
        setError("");
      }
    } catch (e) {
      console.error(e);
      setError("The invitation link is invalid or corrupted.");
    }
  }, [token, user]);

  const handleJoin = async () => {
    if (!token) return;

    setLoading(true);
    setError("");
    try {
      const res = await orgService.joinOrganization(token);
      if (res.success && res.data) {
        setSuccess("Successfully joined organization workspace!");
        
        // Remove token from localStorage as it has been used
        localStorage.removeItem("inviteToken");

        // Update user details in context
        refreshUser({
          organization_id: res.data.user.organization_id,
          role: "member",
        });
        setTimeout(() => {
          navigate("/");
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      let msg = data?.message || "Failed to join organization. The link might be expired.";
      if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        const validation = data.errors.map(e => Object.values(e)[0]).join(", ");
        msg = `${msg} (${validation})`;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // If the user is NOT logged in, show Guest login/register prompt card
  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900/40 border border-slate-800 rounded-2xl p-8 shadow-xl backdrop-blur-xl text-center space-y-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
          <Building className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-100 font-sans">You've Been Invited!</h1>
          <p className="text-slate-400 text-xs leading-relaxed">
            An invitation was sent to join an organization workspace. To accept this invite and link it to your account, please log in or sign up first.
          </p>
        </div>

        {inviteData && (
          <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl text-slate-300 text-xs text-left">
            <span className="text-slate-500 block mb-1">Target Email Address:</span>
            <span className="font-semibold text-slate-200">{inviteData.email}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </Link>
          <Link
            to="/register"
            className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Sign Up
          </Link>
        </div>
      </div>
    );
  }

  // If the user is logged in, but their email does NOT match the invitation email
  const isEmailMismatch = user && inviteData && user.email.toLowerCase() !== inviteData.email.toLowerCase();

  if (isEmailMismatch) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900/40 border border-slate-800 rounded-2xl p-8 shadow-xl backdrop-blur-xl text-center space-y-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-100 font-sans">Account Mismatch</h1>
          <p className="text-slate-400 text-xs leading-relaxed">
            This invitation was sent to <strong className="text-slate-205">{inviteData.email}</strong>, but you are currently signed in as <strong className="text-slate-205">{user.email}</strong>.
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl text-slate-300 text-xs text-left leading-relaxed">
          To accept this invitation, please sign out and sign in with the correct email address.
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={async () => {
              await logout();
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
          >
            Sign Out / Switch Account
          </button>
          <Link
            to="/"
            className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-12 bg-slate-900/40 border border-slate-800 rounded-2xl p-8 shadow-xl backdrop-blur-xl">
      <div className="text-center mb-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-400 mb-3 border border-indigo-500/20">
          <Building className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-100">Accept Workspace Invitation</h1>
        <p className="text-slate-400 text-xs mt-1">Join your team on AI Ticket Triage</p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2.5 px-4 py-3 bg-rose-500/5 border border-rose-500/10 text-rose-400 rounded-lg text-xs">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 flex items-start gap-2.5 px-4 py-3 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-lg text-xs">
          <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {inviteData && !error && (
        <div className="space-y-6">
          <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-2.5 text-slate-300 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Target Workspace:</span>
              <span className="font-semibold text-slate-200">New Team Invite</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Invited Email:</span>
              <span className="font-semibold text-slate-200">{inviteData.email}</span>
            </div>
          </div>

          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              "Accept Invitation & Join"
            )}
          </button>
        </div>
      )}

      {!inviteData && error && (
        <div className="text-center mt-6">
          <Link to="/" className="text-xs font-bold text-indigo-400 hover:text-indigo-300">
            Go to dashboard
          </Link>
        </div>
      )}
    </div>
  );
};

export default JoinOrg;
