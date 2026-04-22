import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — cartographic hero, hidden on mobile */}
      <div className="hidden lg:flex lg:w-[45%] bg-sidebar topo-bg flex-col items-center justify-center p-14 relative overflow-hidden select-none">
        {/* Decorative topographic rings */}
        <div className="absolute -bottom-32 -right-32 w-[420px] h-[420px] rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute -bottom-8 -right-8 w-[180px] h-[180px] rounded-full border border-white/10 pointer-events-none" />

        <div className="relative z-10 text-center anim-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white/10 mb-6 backdrop-blur-sm">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-none stroke-current stroke-[1.5]">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          </div>
          <h1 className="text-5xl font-heading font-bold text-white mb-3 tracking-tight">GeoMap</h1>
          <p className="text-white/60 text-base leading-relaxed max-w-xs">
            Gestão de propriedades rurais com visualização georreferenciada
          </p>
        </div>

        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="font-mono text-[10px] text-white/25 tracking-[0.2em] uppercase">
            15°47′23″ S · 47°55′11″ O
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-background px-8 py-12">
        <div className="w-full max-w-sm anim-in-1">
          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-heading font-bold text-primary">GeoMap</h1>
          </div>

          <h2 className="text-2xl font-heading font-semibold text-foreground mb-6">{title}</h2>

          {children}
        </div>
      </div>
    </div>
  );
}
