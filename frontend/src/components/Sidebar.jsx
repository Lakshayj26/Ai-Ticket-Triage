import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  PlusCircle,
  Building2,
  LogOut,
  Ticket,
} from "lucide-react";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const links = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Create Ticket", path: "/create-ticket", icon: PlusCircle },
    { name: "Organization", path: "/organization", icon: Building2 },
  ];

  return (
    <aside className="w-64 bg-[#0f172a] border-r border-slate-800 flex flex-col hidden md:flex shrink-0">
      {/* Brand */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <Ticket className="h-6 w-6 text-indigo-500" />
        <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          AI Ticket Triage
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Icon className="h-5 w-5" />
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile info */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/20">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">
              {user?.username}
            </p>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">
              {user?.role}
            </p>
          </div>
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-sm shrink-0">
            {user?.username?.substring(0, 2).toUpperCase()}
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-md hover:bg-rose-500/10 hover:border-rose-500/20 transition-all duration-200 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
