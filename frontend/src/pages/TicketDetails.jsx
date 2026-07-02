import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ticketService } from "../api/ticket.service";
import { orgService } from "../api/org.service";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  AlertCircle,
  Clock,
  User,
  Shield,
  FileText,
  CheckCircle,
  Cpu,
  Bookmark,
} from "lucide-react";

const TicketDetails = () => {
  const { ticketId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [assignmentLoading, setAssignmentLoading] = useState(false);

  const fetchTicketDetails = async () => {
    try {
      const res = await ticketService.getTicketById(ticketId);
      if (res.success) {
        setTicket(res.data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load ticket details.");
    }
  };

  const fetchOrgMembers = async () => {
    if (user?.role === "admin") {
      try {
        const res = await orgService.getMembers();
        if (res.success) {
          setMembers(res.data?.users || []);
        }
      } catch (err) {
        console.error("Failed to load members:", err);
      }
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchTicketDetails();
      await fetchOrgMembers();
      setLoading(false);
    };
    loadData();
  }, [ticketId, user]);

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await ticketService.updateTicket(ticketId, { status: newStatus });
      if (res.success) {
        setSuccess(`Ticket status updated to ${newStatus.replace("_", " ")}`);
        setTicket((prev) => ({ ...prev, status: newStatus }));
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to update status.");
    }
  };

  const handleAssigneeChange = async (e) => {
    const assignedToId = e.target.value;
    if (!assignedToId) return;

    setAssignmentLoading(true);
    setError("");
    try {
      const res = await ticketService.assignTicket(ticketId, assignedToId);
      if (res.success) {
        setSuccess("Ticket assigned successfully.");
        await fetchTicketDetails();
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to assign ticket.");
    } finally {
      setAssignmentLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12 bg-slate-900/30 border border-slate-800 rounded-xl">
        <AlertCircle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-200">Ticket Not Found</h3>
        <p className="text-slate-400 text-sm mt-1">This ticket does not exist or you do not have permission to view it.</p>
        <Link to="/" className="mt-4 inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium">
          <ArrowLeft className="h-4 w-4" /> Go back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top navbar links */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="text-sm font-semibold text-slate-500">
            Ticket ID: #{ticket.id}
          </span>
        </div>

        {/* Action button triggers status update */}
        <div className="flex gap-2">
          {ticket.status !== "resolved" ? (
            <button
              onClick={() => handleStatusChange("resolved")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/5 transition-colors cursor-pointer"
            >
              <CheckCircle className="h-4 w-4" />
              Mark Resolved
            </button>
          ) : (
            <button
              onClick={() => handleStatusChange("in_progress")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-sm font-semibold transition-colors cursor-pointer"
            >
              Reopen Ticket
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-500/5 border border-rose-500/10 text-rose-400 rounded-lg text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-lg text-sm">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details (Col 1 & 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl space-y-4">
            <h1 className="text-xl md:text-2xl font-bold text-slate-100">{ticket.title}</h1>

            <div className="flex flex-wrap gap-4 text-xs text-slate-400 border-y border-slate-800 py-3">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>Filed: {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : ""}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                <span>By: {ticket.users_ticket_created_byTousers?.username || "Unknown"}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</h3>
              <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-sans">
                {ticket.description}
              </p>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Attachments ({ticket.attachment?.length || 0})</h3>
            {ticket.attachment?.length === 0 ? (
              <p className="text-slate-500 text-xs">No files attached to this ticket.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ticket.attachment?.map((file) => (
                  <a
                    key={file.id}
                    href={`http://localhost:3000/${file.file_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 bg-slate-950 border border-slate-850 rounded-lg hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-5 w-5 text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-300 truncate">{file.file_name}</p>
                        <p className="text-[10px] text-slate-500">
                          {file.file_size ? `${(Number(file.file_size) / 1024).toFixed(1)} KB` : "Size unknown"}
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI Insights & Assignment Sidebar (Col 3) */}
        <div className="space-y-6">
          {/* AI Insights Card */}
          <div className="bg-gradient-to-br from-indigo-950/20 via-slate-900/30 to-slate-900/40 border border-indigo-500/20 p-6 rounded-2xl space-y-5 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-indigo-500/5 blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
              <Cpu className="h-5 w-5 text-indigo-400" />
              <h3 className="font-bold text-slate-100 text-sm tracking-wide">AI Triage Insights</h3>
            </div>

            {/* AI Priority */}
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                AI Priority Check
              </span>
              <span
                className={`px-3 py-1 text-xs font-semibold border rounded-full uppercase tracking-wider ${getPriorityColor(
                  ticket.priority
                )}`}
              >
                {ticket.priority || "Pending AI Processing"}
              </span>
            </div>

            {/* AI Skills Match */}
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Required Agent Skills
              </span>
              {ticket.required_skills?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {ticket.required_skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-slate-800 text-slate-300 rounded-md border border-slate-700/50"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-500 text-xs">No skills identified yet.</span>
              )}
            </div>

            {/* AI Troubleshooting Notes */}
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                AI Helpful Notes
              </span>
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl text-xs text-slate-300 leading-relaxed font-sans max-h-48 overflow-y-auto">
                {ticket.helpful_notes || "Processing ticket content... please wait."}
              </div>
            </div>
          </div>

          {/* Ticket Assignment & Status Card */}
          <div className="bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
              <Bookmark className="h-5 w-5 text-indigo-400" />
              <h3 className="font-bold text-slate-200 text-sm">
                {user?.role === "admin" ? "Moderation Panel" : "Ticket Assignment"}
              </h3>
            </div>

            {/* Current Agent Info */}
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Assigned Agent
              </span>
              <div className="flex items-center gap-2 text-sm text-slate-300 py-1">
                <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 text-xs">
                  {ticket.users_ticket_assigned_toTousers?.username
                    ? ticket.users_ticket_assigned_toTousers.username.substring(0, 2).toUpperCase()
                    : "?"}
                </div>
                <span>
                  {ticket.users_ticket_assigned_toTousers?.username || "Not assigned yet"}
                </span>
              </div>
            </div>

            {/* Admin Manual Assign Options */}
            {user?.role === "admin" && (
              <div className="pt-2">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Reassign Ticket
                </label>
                <div className="relative">
                  <select
                    onChange={handleAssigneeChange}
                    defaultValue=""
                    disabled={assignmentLoading}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                  >
                    <option value="" disabled>
                      {assignmentLoading ? "Updating..." : "Select team member..."}
                    </option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.username} ({member.skills.join(", ") || "No skills logged"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetails;
