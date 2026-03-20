import { ReactNode } from "react";
import { Link } from "wouter";
import { Sparkles, Code } from "lucide-react";
import { useDevMode } from "@/hooks/use-dev-mode";

export function AppLayout({ children }: { children: ReactNode }) {
  const [devMode, toggleDevMode] = useDevMode();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      <header className="px-6 py-4 flex items-center justify-between z-10 border-b border-white/5 bg-background/50 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight group-hover:text-primary transition-colors">
            Click-to-Ad
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <a href="#" className="hover:text-foreground transition-colors">Templates</a>
            <a href="#" className="hover:text-foreground transition-colors">Pricing</a>
          </div>
          <button
            onClick={toggleDevMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${devMode ? 'bg-primary/20 text-primary border border-primary/30' : 'hover:bg-muted border border-transparent'}`}
          >
            <Code className="w-3.5 h-3.5" />
            Dev
          </button>
        </nav>
      </header>
      
      <main className="flex-1 flex flex-col z-10">
        {children}
      </main>
    </div>
  );
}
