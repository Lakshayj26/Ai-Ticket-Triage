import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ticketService } from "../api/ticket.service";
import { Upload, X, AlertCircle, CheckCircle, ArrowLeft, File, Building } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const CreateTicket = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);

  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles) => {
    const totalFiles = [...files, ...newFiles];
    if (totalFiles.length > 5) {
      setError("You can upload a maximum of 5 attachments.");
      return;
    }
    setFiles(totalFiles);
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!title || !description) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await ticketService.createTicket(title, description, files);
      if (res.success) {
        setSuccess("Ticket filed successfully! AI analysis has been triggered.");
        setTitle("");
        setDescription("");
        setFiles([]);
        setTimeout(() => {
          navigate("/");
        }, 3000);
      }
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      let msg = data?.message || "Failed to submit ticket. Please try again.";
      if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        const validation = data.errors.map(e => Object.values(e)[0]).join(", ");
        msg = `${msg} (${validation})`;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.organization_id) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center shadow-xl backdrop-blur-xl">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 mb-4 border border-rose-500/20">
          <Building className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Setup Your Workspace First</h2>
        <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
          You don't belong to any organization yet. To start creating support tickets and using the AI Triage agent, please set up a new organization or accept an invite first.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            to="/organization"
            className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
          >
            Go to Organization Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back link */}
      <div className="flex items-center gap-2">
        <Link to="/" className="text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-100">Create Support Ticket</h1>
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

      <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900/30 border border-slate-800/80 p-6 rounded-2xl">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Issue Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="e.g. Database connection timeouts under heavy load"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Description / Logs
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors font-sans"
            placeholder="Describe the issue in detail. You can copy-paste log trace snippets here."
            required
          />
        </div>

        {/* Attachments Drag & Drop Area */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Attachments (Max 5 files)
          </label>
          
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 ${
              dragActive
                ? "border-indigo-500 bg-indigo-500/5"
                : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/10"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="h-10 w-10 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-400">
              <Upload className="h-5 w-5" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-300">
                Drag and drop your files here, or <span className="text-indigo-400">browse</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">Supports logs, screenshots, configurations (max 10MB)</p>
            </div>
          </div>

          {/* Uploaded Files List */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <File className="h-4.5 w-4.5 text-indigo-400 shrink-0" />
                    <span className="truncate font-medium">{file.name}</span>
                    <span className="text-xs text-slate-500 shrink-0">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="p-1 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            "File Support Ticket"
          )}
        </button>
      </form>
    </div>
  );
};

export default CreateTicket;
