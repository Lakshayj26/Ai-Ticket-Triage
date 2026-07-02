import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { orgService } from "../api/org.service";
import { authService } from "../api/auth.service";
import {
  Building,
  UserPlus,
  Users,
  Copy,
  Check,
  AlertCircle,
  CheckCircle,
  Plus,
  Award,
  X,
  ShieldAlert,
} from "lucide-react";

const OrganizationSettings = () => {
  const { user, refreshUser } = useAuth();

  // Create organization state
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Listing state
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Skills state
  const [skills, setSkills] = useState(user?.skills || []);
  const [newSkill, setNewSkill] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Alert notices
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const fetchMembers = async () => {
    if (user?.organization_id) {
      try {
        setLoading(true);
        const res = await orgService.getMembers();
        if (res.success) {
          setMembers(res.data?.users || []);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch organization members.");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [user]);

  // Keep local skills state synchronized with Auth context state
  useEffect(() => {
    if (user) {
      setSkills(user.skills || []);
    }
  }, [user]);

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!orgName) {
      setError("Organization name is required.");
      return;
    }

    try {
      const res = await orgService.createOrganization(orgName, orgDescription);
      if (res.success && res.data) {
        setSuccess("Organization created successfully!");
        // Update user state in context to reflect admin role and organization attachment
        refreshUser({
          organization_id: res.data.organization.id,
          role: "admin",
        });
      }
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      let msg = data?.message || "Failed to create organization.";
      if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        const validation = data.errors.map(e => Object.values(e)[0]).join(", ");
        msg = `${msg} (${validation})`;
      }
      setError(msg);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setInviteLink("");

    if (!inviteEmail) {
      setError("Please input email address.");
      return;
    }

    try {
      const res = await orgService.inviteMember(inviteEmail);
      if (res.success && res.data) {
        setInviteLink(res.data.inviteUrl);
        setSuccess("Invitation token generated successfully! Copy the link below.");
        setInviteEmail("");
      }
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      let msg = data?.message || "Failed to generate invitation link.";
      if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        const validation = data.errors.map(e => Object.values(e)[0]).join(", ");
        msg = `${msg} (${validation})`;
      }
      setError(msg);
    }
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    const cleanSkill = newSkill.trim();
    if (cleanSkill && !skills.includes(cleanSkill)) {
      setSkills([...skills, cleanSkill]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };

  const handleSaveSkills = async () => {
    setProfileLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await authService.updateProfile(skills);
      if (res.success) {
        setSuccess("Profile skills updated successfully!");
        refreshUser({ skills: skills });
        await fetchMembers();
      }
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      let msg = data?.message || "Failed to save profile skills.";
      if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        const validation = data.errors.map(e => Object.values(e)[0]).join(", ");
        msg = `${msg} (${validation})`;
      }
      setError(msg);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLeaveOrg = async () => {
    const confirmation = window.confirm(
      user?.role === "admin"
        ? "Are you absolutely sure you want to leave this organization? Since you are the admin, ownership will be transferred to another member, or the workspace will be deleted if you are the last member."
        : "Are you sure you want to leave this organization?"
    );

    if (!confirmation) return;

    setError("");
    setSuccess("");
    try {
      const res = await orgService.leaveOrganization();
      if (res.success) {
        setSuccess("Successfully left the organization workspace.");
        // Clear workspace state in context
        refreshUser({
          organization_id: null,
          role: "member",
        });
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to leave organization.");
    }
  };

  const handleEditMemberSkills = async (member) => {
    const skillsString = prompt(
      `Edit skills for ${member.username} (comma-separated list):`,
      member.skills?.join(", ") || ""
    );

    if (skillsString === null) return; // User cancelled the prompt

    const skillsArray = skillsString
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setError("");
    setSuccess("");
    try {
      const res = await orgService.updateMember(member.id, { skills: skillsArray });
      if (res.success) {
        setSuccess(`Updated skills for ${member.username} successfully.`);
        await fetchMembers();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to update member skills.");
    }
  };

  const handlePromoteMember = async (member) => {
    const confirmation = window.confirm(
      `Are you sure you want to transfer ownership to ${member.username}? Doing so will make them the Administrator of this workspace and demote your account to a standard Member role.`
    );

    if (!confirmation) return;

    setError("");
    setSuccess("");
    try {
      const res = await orgService.updateMember(member.id, { role: "admin" });
      if (res.success) {
        setSuccess(`Successfully transferred workspace ownership to ${member.username}.`);
        refreshUser({ role: "member" });
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to transfer ownership.");
    }
  };

  const handleRemoveMember = async (member) => {
    const confirmation = window.confirm(
      `Are you sure you want to remove ${member.username} from this organization workspace?`
    );

    if (!confirmation) return;

    setError("");
    setSuccess("");
    try {
      const res = await orgService.updateMember(member.id, { remove: true });
      if (res.success) {
        setSuccess(`Successfully removed ${member.username} from organization.`);
        await fetchMembers();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to remove member.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  // State A: User does not belong to an organization, show Create Org Form
  if (!user?.organization_id) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
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

        <div className="flex items-center gap-2 mb-2">
          <Building className="h-6 w-6 text-indigo-500" />
          <h1 className="text-2xl font-bold text-slate-100">Create Organization</h1>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-500/5 border border-rose-500/10 text-rose-400 rounded-lg text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateOrg} className="bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl space-y-5">
          <p className="text-slate-400 text-sm leading-relaxed">
            Create an organization workspace to start filing support tickets, invite teammates, and let our AI Triage assistant analyze and assign issues dynamically.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-650 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="e.g. Acme Tech Solutions"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Description (Optional)
            </label>
            <textarea
              value={orgDescription}
              onChange={(e) => setOrgDescription(e.target.value)}
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-655 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Describe your team workspace..."
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/10 cursor-pointer transition-all duration-200"
          >
            <Plus className="h-5 w-5" />
            Create Workspace
          </button>
        </form>
      </div>
    );
  }

  // State B: User belongs to an organization, show Team List, Invites, and Leave actions
  return (
    <div className="space-y-8">
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
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Organization Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage your workspace members and invitations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Col 1 & 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Skills Profile Panel */}
          <div className="bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
              <Award className="h-5 w-5 text-indigo-400" />
              <h3 className="font-bold text-slate-200 text-sm">My Registered Skills</h3>
            </div>
            
            <p className="text-slate-400 text-xs leading-relaxed">
              Add technical skills to your profile. The AI Triage agent automatically matches incoming support tickets to team members based on their registered skills (e.g. React, Node.js, Python).
            </p>

            <form onSubmit={handleAddSkill} className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 flex-1 focus:outline-none focus:border-indigo-500"
                placeholder="Type a skill (e.g. React, Docker)..."
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
              >
                Add
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5 min-h-[40px] p-3 bg-slate-950/60 border border-slate-855 rounded-xl">
              {skills.length === 0 ? (
                <span className="text-slate-600 text-xs italic">No skills added yet. Add some skills above.</span>
              ) : (
                skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 text-indigo-300 text-[10px] border border-indigo-500/10 font-bold uppercase tracking-wider"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-slate-500 hover:text-rose-400 font-bold transition-colors cursor-pointer ml-1 text-xs"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={handleSaveSkills}
              disabled={profileLoading}
              className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md disabled:opacity-50 transition-colors cursor-pointer w-full sm:w-auto"
            >
              {profileLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Save Skills Profile"
              )}
            </button>
          </div>

          {/* Active Members Panel */}
          <div className="bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-805">
              <Users className="h-5 w-5 text-indigo-400" />
              <h3 className="font-bold text-slate-200 text-sm">Active Members ({members.length})</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                    <th className="pb-3 pr-4">User</th>
                    <th className="pb-3 pr-4">Role</th>
                    <th className="pb-3">Registered Skills</th>
                    {user?.role === "admin" && (
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 text-xs shrink-0">
                            {member.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200">{member.username}</p>
                            <p className="text-[10px] text-slate-500">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                            member.role === "admin"
                              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/10"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {member.role}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {member.skills?.length > 0 ? (
                            member.skills.map((skill) => (
                              <span
                                key={skill}
                                className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 text-[10px] border border-slate-800/60 uppercase tracking-wider"
                              >
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-600 text-xs italic">No skills registered</span>
                          )}
                        </div>
                      </td>
                      {user?.role === "admin" && (
                        <td className="py-3.5 pl-4 text-right text-xs text-slate-500 whitespace-nowrap">
                          {member.id === user.id ? (
                            <span className="italic select-none">You (Admin)</span>
                          ) : (
                            <div className="flex justify-end gap-3.5">
                              <button
                                type="button"
                                onClick={() => handleEditMemberSkills(member)}
                                className="text-indigo-400 hover:text-indigo-350 text-xs font-bold transition-colors cursor-pointer"
                              >
                                Edit Skills
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePromoteMember(member)}
                                className="text-amber-500 hover:text-amber-400 text-xs font-bold transition-colors cursor-pointer"
                              >
                                Promote
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member)}
                                className="text-rose-450 hover:text-rose-400 text-xs font-bold transition-colors cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (Col 3) */}
        <div className="space-y-6">
          {/* Invite Teammates Panel */}
          {user?.role === "admin" && (
            <div className="bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl space-y-4 h-fit">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <UserPlus className="h-5 w-5 text-indigo-400" />
                <h3 className="font-bold text-slate-200 text-sm">Invite Teammate</h3>
              </div>

              <p className="text-slate-400 text-xs leading-relaxed">
                Invite a developer or support agent. The generated JWT invitation link remains valid for 48 hours.
              </p>

              <form onSubmit={handleInvite} className="space-y-4 pt-1">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Invitee Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    placeholder="agent@company.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md cursor-pointer transition-colors"
                >
                  Create Invitation Link
                </button>
              </form>

              {/* Generated token link */}
              {inviteLink && (
                <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
                  <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Invite Link
                  </span>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 p-2.5 rounded-lg">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink}
                      className="bg-transparent text-slate-400 text-xs truncate flex-1 focus:outline-none select-all"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors shrink-0 border border-slate-800 rounded-md hover:bg-slate-900 cursor-pointer"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Danger Zone Panel (Leave Organization) */}
          <div className="bg-slate-900/30 border border-rose-500/15 p-6 rounded-2xl space-y-4 h-fit">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <ShieldAlert className="h-5 w-5 text-rose-450" />
              <h3 className="font-bold text-slate-200 text-sm">Danger Zone</h3>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed">
              {user?.role === "admin"
                ? "As an administrator, leaving this organization will transfer workspace privileges to the next oldest team member. If no other members exist, the organization will be permanently deleted."
                : "Leaving this organization workspace will remove you from the active team. You will no longer be able to view organization tickets or receive automated tasks."}
            </p>

            <button
              type="button"
              onClick={handleLeaveOrg}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 text-xs font-semibold border border-rose-500/20 cursor-pointer transition-colors"
            >
              Leave Organization
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettings;
