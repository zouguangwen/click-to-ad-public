import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Link as LinkIcon, Play, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { useSampleProducts } from "@/hooks/use-products";
import { motion } from "framer-motion";

export default function Home() {
  const [url, setUrl] = useState("");
  const [, setLocation] = useLocation();
  const { data: samples, isLoading } = useSampleProducts();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLocation(`/analyze?url=${encodeURIComponent(url)}`);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24 grid lg:grid-cols-2 gap-16 items-center w-full flex-1">
        
        {/* Left Column: CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-8"
        >
          <div>
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm text-primary mb-6">
              <span className="flex w-2 h-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              AI Video Generation MVP
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold leading-tight text-balance">
              Turn any product into a <span className="text-primary neon-text-glow">video ad</span>.
            </h1>
            <p className="mt-6 text-xl text-muted-foreground text-balance max-w-lg">
              Paste a URL. We extract your images, copy, and brand colors to generate high-converting video creatives in minutes.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                <LinkIcon className="w-5 h-5" />
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste Amazon, Shopify, or any product URL..."
                className="w-full h-14 pl-12 pr-4 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-lg"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={!url}
              className="h-14 px-8 rounded-xl font-bold text-lg bg-primary text-primary-foreground hover-elevate neon-glow disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 whitespace-nowrap transition-all"
            >
              Start Magic <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          {/* Samples Section */}
          <div className="pt-8 border-t border-border/50">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Or try a saved product kit
            </h3>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading samples...
              </div>
            ) : samples && samples.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {samples.slice(0, 3).map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => setLocation(`/products/${sample.id}/kit`)}
                    className="flex-shrink-0 flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors text-left w-64 hover-elevate"
                  >
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      {sample.logoUrl ? (
                        <img src={sample.logoUrl} alt="logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary/20 text-primary flex items-center justify-center font-bold font-display">
                          {sample.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-semibold text-foreground truncate">{sample.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{sample.url}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No samples available.</p>
            )}
          </div>
        </motion.div>

        {/* Right Column: Hero Graphic */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative hidden lg:block"
        >
          <div className="aspect-[4/5] rounded-3xl overflow-hidden glass-panel relative p-2 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-50"></div>
            {/* landing page hero stylized product video mockup */}
            <img 
              src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=1000&fit=crop" 
              alt="Stylish shoe"
              className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-700"
            />
            
            {/* Floating UI Elements */}
            <div className="absolute bottom-8 left-8 right-8 bg-background/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4">
              <button className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center pl-1 hover:scale-105 transition-transform">
                <Play className="w-5 h-5" fill="currentColor" />
              </button>
              <div>
                <div className="font-bold text-sm">Hyper-Targeted Ad</div>
                <div className="text-xs text-muted-foreground">Generating variations...</div>
              </div>
              <div className="ml-auto flex -space-x-2">
                {/* Random color dots */}
                <div className="w-6 h-6 rounded-full border-2 border-background bg-red-500"></div>
                <div className="w-6 h-6 rounded-full border-2 border-background bg-blue-500"></div>
                <div className="w-6 h-6 rounded-full border-2 border-background bg-yellow-500"></div>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </AppLayout>
  );
}
