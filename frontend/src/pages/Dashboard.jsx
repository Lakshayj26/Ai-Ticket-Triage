import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ticketService } from "../api/ticket.service";
import { authService } from "../api/auth.service";
import {
  Search,
  Plus,
  AlertCircle,
  Clock,
  User,
  ShieldAlert,
  Building,
} from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, todo, in_progress, resolved
  const [pendingInvite, setPendingInvite] = useState(null);

  const [resending, setResending] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState("");

  const handleResendVerification = async () => {
    setResending(true);
    setVerifyNotice("");
    try {
      await authService.resendVerification();
      setVerifyNotice("Verification email resent successfully! Check your inbox.");
      setTimeout(() => setVerifyNotice(""), 5000);
    } catch (err) {
      console.error(err);
      setVerifyNotice(err.response?.data?.message || "Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("inviteToken");
    if (token && user) {
      try {
        const payloadBase64 = token.split(".")[1];
        const decodedPayload = JSON.parse(atob(payloadBase64));
        if (user.email.toLowerCase() === decodedPayload.email.toLowerCase()) {
          setPendingInvite(decodedPayload);
        }
      } catch (e) {
        console.error("Failed to parse cached inviteToken", e);
      }
    }
  }, [user]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await ticketService.getTickets();
      if (res.success) {
        setTickets(res.data || []);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch tickets. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.organization_id) {
      fetchTickets();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Filters
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.description &&
        ticket.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getPriorityBadgeColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "low":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
      case "todo":
        return "bg-slate-800 text-slate-300 border-slate-700";
      case "in_progress":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "resolved":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  // Check if user is not in an organization
  if (!user?.organization_id) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {!user?.is_email_verified && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-sm">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
              <span>
                Your email address is not verified yet. Please check your inbox for the verification link.
              </span>
            </div>
            <button
              onClick={handleResendVerification}
              disabled={resending}
              className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition-colors whitespace-nowrap self-stretch sm:self-auto text-center cursor-pointer disabled:opacity-50"
            >
              {resending ? "Resending..." : "Resend Verification Email"}
            </button>
          </div>
        )}

        {verifyNotice && (
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg text-xs text-center">
            {verifyNotice}
          </div>
        )}

        {pendingInvite && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 text-sm">
            <div className="flex items-center gap-2.5">
              <Building className="h-5 w-5 shrink-0 text-indigo-400 animate-pulse" />
              <span>
                You have a pending invitation to join an organization workspace for <strong className="text-slate-205">{pendingInvite.email}</strong>!
              </span>
            </div>
            <Link
              to="/join-org"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-semibold shadow-md transition-colors whitespace-nowrap self-stretch sm:self-auto text-center"
            >
              View & Accept Invite
            </Link>
          </div>
        )}

        <div className="max-w-2xl mx-auto my-12 bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center shadow-xl backdrop-blur-xl">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-400 mb-4 border border-indigo-500/20">
            <Building className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Setup Your Workspace</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
            You don't belong to any organization yet. To start creating support tickets and using the AI Triage agent, please set up a new organization or accept an invite.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              to="/organization"
              className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
            >
              Create Organization
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!user?.is_email_verified && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
            <span>
              Your email address is not verified yet. Please check your inbox for the verification link.
            </span>
          </div>
          <button
            onClick={handleResendVerification}
            disabled={resending}
            className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition-colors whitespace-nowrap self-stretch sm:self-auto text-center cursor-pointer disabled:opacity-50"
          >
            {resending ? "Resending..." : "Resend Verification Email"}
          </button>
        </div>
      )}

      {verifyNotice && (
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg text-xs text-center font-semibold">
          {verifyNotice}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Support Tickets</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Monitor and manage AI triage tickets for your workspace
          </p>
        </div>
        <Link
          to="/create-ticket"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4.5 w-4.5" />
          New Ticket
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/5 border border-rose-500/10 text-rose-400 rounded-lg text-sm">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row items-center gap-4 bg-slate-900/20 border border-slate-800/80 p-4 rounded-xl">
        {/* Search */}
        <div className="relative w-full lg:w-96">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            placeholder="Search tickets..."
          />
        </div>

        {/* Tab Filters */}
        <div className="flex gap-1.5 p-1 bg-slate-950 border border-slate-800/80 rounded-lg w-full lg:w-auto overflow-x-auto">
          {["all", "todo", "in_progress", "resolved"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap ${
                statusFilter === status
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/10 border border-slate-800/50 border-dashed rounded-xl">
            <p className="text-slate-500 text-sm">No tickets found matching your filters.</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <Link
              key={ticket.id}
              to={`/tickets/${ticket.id}`}
              className="block bg-slate-900/30 border border-slate-800/60 rounded-xl p-5 hover:border-slate-700/80 hover:bg-slate-900/50 transition-all duration-200"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Info block */}
                <div className="space-y-2.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 text-xs font-semibold border rounded-full uppercase tracking-wider ${getPriorityBadgeColor(
                        ticket.priority
                      )}`}
                    >
                      {ticket.priority || "Triage Pending"}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 text-xs font-semibold border rounded-full uppercase tracking-wider ${getStatusBadgeColor(
                        ticket.status
                      )}`}
                    >
                      {ticket.status?.replace("_", " ")}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-100 truncate">
                    {ticket.title}
                  </h3>
                  <p className="text-slate-400 text-sm line-clamp-2">
                    {ticket.description}
                  </p>

                  {/* Required skills */}
                  {ticket.required_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {ticket.required_skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-slate-800 text-slate-400 rounded-md border border-slate-700/50"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Meta details */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-4 shrink-0 text-xs text-slate-500 border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>
                      {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    <span>
                      {ticket.users_ticket_assigned_toTousers
                        ? `Assigned: ${ticket.users_ticket_assigned_toTousers.username}`
                        : "Unassigned"}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;
