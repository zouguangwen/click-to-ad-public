import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Play, Sparkles, Loader2, Eye, Zap } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { useCreateVideo } from "@/hooks/use-videos";
import { useDevMode } from "@/hooks/use-dev-mode";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { api } from "@shared/routes";

// Templates aligned with style_template_of_ad.md
const TEMPLATES = [
  { id: "simple-ugc", name: "Simple UGC", style: "Casual, authentic, handheld camera feel", img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=600&fit=crop" },
  { id: "clean-minimal", name: "Clean Minimal", style: "Sleek, modern, studio-quality product video", img: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=400&h=600&fit=crop" },
  { id: "unboxing", name: "Unboxing", style: "First-person POV unboxing experience", img: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&h=600&fit=crop" },
  { id: "customer-reviews", name: "Customer Reviews", style: "Authentic testimonial, speaking to camera", img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=600&fit=crop" },
  { id: "viral-chaos", name: "Viral Chaos", style: "High-energy, fast-paced, attention-grabbing", img: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&h=600&fit=crop" },
  { id: "luxury", name: "Luxury", style: "Ultra-premium, elegant, slow-paced", img: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=600&fit=crop" },
  { id: "product-story", name: "Product Story", style: "Narrative-driven lifestyle video", img: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=600&fit=crop" },
  { id: "cozy-morning", name: "Cozy Morning", style: "Warm, soft, ASMR-adjacent morning routine", img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=600&fit=crop" },
];

interface PreviewData {
  prompt: string;
  imageUrl: string;
  productName: string;
}

export default function StyleSelector() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedSeconds, setSelectedSeconds] = useState<number>(12);
  const [devMode] = useDevMode();

  const createVideo = useCreateVideo();

  const handlePreview = async () => {
    if (!selectedTemplate) return;
    setPreviewLoading(true);
    try {
      const res = await fetch(api.videos.preview.path, {
        method: api.videos.preview.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: Number(id), templateId: selectedTemplate }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to load preview");
      }
      const data: PreviewData = await res.json();
      setPreviewData(data);
      setPreviewOpen(true);
    } catch (err) {
      console.error("Preview error:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDirectGenerate = () => {
    if (!selectedTemplate) return;
    createVideo.mutate({ productId: Number(id), templateId: selectedTemplate, seconds: 12 }, {
      onSuccess: (data) => {
        setLocation(`/videos/${data.id}`);
      }
    });
  };

  const handleConfirmGenerate = () => {
    if (!selectedTemplate) return;
    setPreviewOpen(false);
    createVideo.mutate({ productId: Number(id), templateId: selectedTemplate, seconds: selectedSeconds }, {
      onSuccess: (data) => {
        setLocation(`/videos/${data.id}`);
      }
    });
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex flex-col min-h-0">

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Select an Ad Style</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose a visual direction for your video. Our AI will map your product assets to the pacing and aesthetics of the template.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {TEMPLATES.map((tpl, i) => (
            <motion.div
              key={tpl.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedTemplate(tpl.id)}
              className={`
                relative group rounded-2xl overflow-hidden cursor-pointer aspect-[3/4] border-2 transition-all duration-300
                ${selectedTemplate === tpl.id ? 'border-primary shadow-[0_0_30px_-5px_rgba(209,242,50,0.3)]' : 'border-transparent hover:border-border'}
              `}
            >
              <img src={tpl.img} alt={tpl.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-xl font-bold text-foreground mb-1">{tpl.name}</h3>
                <p className="text-xs text-muted-foreground">{tpl.style}</p>
              </div>

              {/* Play icon overlay */}
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/50 backdrop-blur-sm flex items-center justify-center transition-all ${selectedTemplate === tpl.id ? 'opacity-100 scale-110 bg-primary/20 text-primary' : 'opacity-0 group-hover:opacity-100'}`}>
                <Play className="w-5 h-5 ml-1" fill="currentColor" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Sticky Action Bar */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl flex items-center gap-4 z-50 transition-all w-[90%] max-w-md">
          <div className="flex-1 px-4 text-sm font-medium truncate">
            {selectedTemplate
              ? <span>Selected: <span className="text-primary">{TEMPLATES.find(t => t.id === selectedTemplate)?.name}</span></span>
              : <span className="text-muted-foreground">Select a style to continue</span>}
          </div>
          <button
            onClick={devMode ? handlePreview : handleDirectGenerate}
            disabled={!selectedTemplate || previewLoading || createVideo.isPending}
            className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-bold hover-elevate disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
          >
            {previewLoading || createVideo.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : devMode ? (
              <Eye className="w-5 h-5" />
            ) : (
              <Zap className="w-5 h-5" />
            )}
            {devMode ? "Preview & Generate" : "Generate"}
          </button>
        </div>

        {/* Preview Confirmation Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Confirm Video Generation</DialogTitle>
              <DialogDescription>
                Review the prompt and image before generating. Each generation costs ~¥2.8.
              </DialogDescription>
            </DialogHeader>

            {previewData && (
              <div className="flex flex-col gap-4 overflow-y-auto flex-1 min-h-0">
                {/* Product info */}
                <div className="flex items-center gap-3">
                  <img
                    src={previewData.imageUrl}
                    alt={previewData.productName}
                    className="w-20 h-20 object-cover rounded-lg border border-border"
                  />
                  <div>
                    <p className="font-semibold">{previewData.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      Template: {TEMPLATES.find(t => t.id === selectedTemplate)?.name}
                    </p>
                  </div>
                </div>

                {/* Duration selector */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Duration (seconds)</p>
                  <div className="inline-flex rounded-lg border border-border overflow-hidden">
                    {[4, 8, 12].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSeconds(s)}
                        className={`px-4 py-1.5 text-sm font-medium transition-colors ${selectedSeconds === s ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                      >
                        {s}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prompt */}
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Generation Prompt</p>
                  <pre className="text-sm whitespace-pre-wrap break-words font-mono leading-relaxed max-h-[40vh] overflow-y-auto">
                    {previewData.prompt}
                  </pre>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <button
                onClick={() => setPreviewOpen(false)}
                className="h-10 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmGenerate}
                disabled={createVideo.isPending}
                className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover-elevate disabled:opacity-50 flex items-center gap-2"
              >
                {createVideo.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Confirm & Generate
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
