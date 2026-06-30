import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export function FeistyLogo({ to = "/", showName = true }: { to?: string; showName?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2 group">
      <div className="size-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 grid place-items-center shadow-glow group-hover:scale-105 transition-transform">
        <Zap className="size-4 text-white" strokeWidth={2.5} />
      </div>
      {showName && <span className="font-bold text-lg tracking-tight">Feisty Hub</span>}
    </Link>
  );
}