import React from "react";
import { LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "../hooks/useAuth";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sidebar topo-bg px-6 py-3.5 flex items-center justify-between shadow-sm">
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-md bg-white/15 flex items-center justify-center transition-colors group-hover:bg-white/20">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-none stroke-current stroke-[1.5]">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          </div>
          <span className="text-lg font-heading font-semibold text-white tracking-tight">GeoMap</span>
        </Link>
        <div className="flex items-center gap-3">
          {user?.name && (
            <span className="text-xs text-white/50 hidden sm:block font-mono tracking-wide">
              {user.name}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-3 text-xs"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            Sair
          </Button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
