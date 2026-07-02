import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Menu,
  X,
  Ticket,
  LayoutDashboard,
  PlusCircle,
  Building2,
  LogOut,
} from "lucide-react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const links = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Create Ticket", path: "/create-ticket", icon: PlusCircle },
    { name: "Organization", path: "/organization", icon: Building2 },
  ];

  return (
    <header className="h-16 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-50">
      {/* Page Title / Organization */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileMenu}
          className="p-1.5 text-slate-400 hover:text-slate-200 md:hidden rounded-lg hover:bg-slate-800"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        <div className="hidden sm:block">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Workspace
          </span>
          <span className="text-sm font-semibold text-slate-200">
            {user?.organization_id ? "Active Team Workspace" : "Personal Sandbox (No Org)"}
          </span>
        </div>
      </div>

      {/* User Status / Info */}
      <div className="flex items-center gap-4">
        {user?.organization_id && (
          <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        )}

        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs md:hidden">
            {user?.username?.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-sm text-slate-300 hidden md:block">
            Hello, <span className="font-semibold">{user?.username}</span>
          </span>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 bg-[#0b0f19] z-40 flex flex-col p-6 md:hidden animate-in fade-in slide-in-from-top-4 duration-200">
          <nav className="space-y-2 flex-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-lg text-base font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-indigo-600/10 text-indigo-400 border-l-4 border-indigo-500"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {link.name}
                </Link>
              );
            })}
          </nav>
          <div className="pt-6 border-t border-slate-800">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-lg hover:bg-rose-500/10"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
