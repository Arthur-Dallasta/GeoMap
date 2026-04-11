import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted py-12 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-primary mb-8">GeoMap</h1>
        <div className="bg-card rounded-lg shadow-sm border p-6">
          <h2 className="text-2xl font-semibold mb-6">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}
