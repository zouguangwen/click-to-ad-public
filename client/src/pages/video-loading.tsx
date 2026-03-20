import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Loader2, AlertCircle, RotateCcw, ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { useVideo } from "@/hooks/use-videos";
import { useProduct } from "@/hooks/use-products";
import { motion } from "framer-motion";

export default function VideoLoading() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  
  // Enable polling until status complete
  const { data: video, isError: videoError } = useVideo(Number(id), true);
  // Fetch product data just to show a nice summary while waiting
  const { data: productData } = useProduct(video?.productId ?? 0);

  useEffect(() => {
    if (video?.status === 'complete') {
      setLocation(`/videos/${video.id}`);
    }
  }, [video, setLocation]);

  const isFailed = video?.status === 'failed';

  if (videoError) return <AppLayout><div className="p-8 text-center text-destructive">Error loading status.</div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto w-full">

        {isFailed ? (
          <>
            <div className="w-20 h-20 mb-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-3xl font-display font-bold mb-4">Generation Failed</h2>
            <p className="text-muted-foreground text-lg mb-8">
              Video generation failed due to a network or API error. You can go back and try again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.history.back()}
                className="px-5 py-3 rounded-xl border border-border font-medium hover:bg-muted transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Go Back
              </button>
              <button
                onClick={() => setLocation("/")}
                className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover-elevate flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Start Over
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="relative w-32 h-32 mb-12 flex items-center justify-center">
              {/* Animated rings */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-t-2 border-primary border-r-2 border-r-transparent border-b-2 border-primary/20 border-l-2 border-l-transparent"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 rounded-full border-l-2 border-secondary-foreground border-r-2 border-r-transparent"
              />
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>

            <h2 className="text-3xl font-display font-bold mb-4 neon-text-glow">Rendering your ad</h2>
            <p className="text-muted-foreground text-lg mb-8">
              This usually takes 2-5 minutes. Our AI is compositing images, animating text, and syncing audio...
            </p>
          </>
        )}

        {productData && !isFailed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-card border border-border rounded-2xl p-6 flex items-center gap-4 text-left"
          >
            <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden shrink-0">
              {productData.images.find(i => i.isSelected)?.imageUrl ? (
                <img src={productData.images.find(i => i.isSelected)?.imageUrl} className="w-full h-full object-cover" alt="thumb" />
              ) : (
                <div className="w-full h-full bg-primary/20" />
              )}
            </div>
            <div className="overflow-hidden">
              <div className="font-semibold text-sm text-primary mb-1">Target Product</div>
              <div className="font-bold text-foreground truncate">{productData.product.name}</div>
              <div className="text-xs text-muted-foreground truncate">{productData.product.url}</div>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
