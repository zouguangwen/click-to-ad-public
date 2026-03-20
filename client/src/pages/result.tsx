import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Download, Plus, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { useVideo } from "@/hooks/use-videos";
import { useProduct } from "@/hooks/use-products";
import { motion } from "framer-motion";

export default function Result() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { data: video, isLoading: videoLoading } = useVideo(Number(id), true);
  const { data: productData, isLoading: productLoading } = useProduct(video?.productId ?? 0);
  const [downloading, setDownloading] = useState(false);

  if (videoLoading || productLoading) return <AppLayout><div className="flex-1 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div></AppLayout>;
  if (!video || !productData) return <AppLayout><div className="p-8">Not found.</div></AppLayout>;

  const isComplete = video.status === "complete";
  const isFailed = video.status === "failed";
  const isRendering = !isComplete && !isFailed;
  const progress = (video as any).progress ?? 0;

  const getStageText = (p: number) => {
    if (p <= 10) return "Queued...";
    if (p <= 30) return "Preparing assets...";
    if (p <= 80) return "Rendering video...";
    return "Almost done...";
  };

  const selectedImage = productData.images.find(img => img.isSelected);

  const handleDownload = async () => {
    if (!video.videoUrl || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(video.videoUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${productData.product.name || "video"}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 w-full flex-1 flex flex-col">

        <div className="grid lg:grid-cols-12 gap-12 items-start h-full">

          {/* Left: Actions & Summary */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-4 flex flex-col gap-8 order-2 lg:order-1"
          >
            <div>
              <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs mb-4 font-bold tracking-widest uppercase ${isComplete ? 'border-primary/30 bg-primary/10 text-primary' : isFailed ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-muted-foreground/30 bg-muted/50 text-muted-foreground'}`}>
                {isComplete ? "Generation Complete" : isFailed ? "Generation Failed" : "Rendering"}
              </div>
              <h1 className="text-4xl font-display font-bold mb-4">
                {isComplete ? "Your Video is Ready" : isFailed ? "Generation Failed" : "Rendering your ad..."}
              </h1>
              <p className="text-muted-foreground">
                {isComplete
                  ? `High-converting asset generated using the ${video.templateId} template for ${productData.product.name}.`
                  : isFailed
                    ? "Something went wrong during generation. Please try again."
                    : `Generating a ${video.templateId} style video for ${productData.product.name}. This may take a few minutes.`}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleDownload}
                disabled={!isComplete || downloading}
                className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-bold hover-elevate neon-glow flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                Download HD Video
              </button>
            </div>

            <div className="mt-8 pt-8 border-t border-border">
              <button
                onClick={() => setLocation("/")}
                className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 font-medium"
              >
                <Plus className="w-5 h-5" /> Create another ad
              </button>
            </div>
          </motion.div>

          {/* Right: Video Player / Loading State */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-8 order-1 lg:order-2 flex justify-center"
          >
            <div className="w-full max-w-xs aspect-[9/16] bg-card rounded-3xl overflow-hidden border border-border shadow-2xl relative group">
              {isComplete && video.videoUrl ? (
                <video
                  src={video.videoUrl}
                  controls
                  autoPlay
                  loop
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full relative">
                  {/* Product image as background */}
                  {selectedImage ? (
                    <img
                      src={selectedImage.imageUrl}
                      alt={productData.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-6 px-8">
                    {isRendering && (
                      <>
                        {/* Circular progress with spin animation when queued */}
                        <motion.div
                          className="relative w-28 h-28"
                          animate={progress <= 10 ? { rotate: 360 } : { rotate: 0 }}
                          transition={progress <= 10 ? { repeat: Infinity, duration: 2, ease: "linear" } : { duration: 0.3 }}
                        >
                          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
                            {/* Background track */}
                            <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                            {/* Glow filter */}
                            <defs>
                              <filter id="glow">
                                <feGaussianBlur stdDeviation="2" result="blur" />
                                <feMerge>
                                  <feMergeNode in="blur" />
                                  <feMergeNode in="SourceGraphic" />
                                </feMerge>
                              </filter>
                            </defs>
                            {/* Progress arc */}
                            <circle
                              cx="56" cy="56" r="48" fill="none"
                              stroke="currentColor"
                              strokeWidth="5"
                              strokeLinecap="round"
                              strokeDasharray={2 * Math.PI * 48}
                              strokeDashoffset={2 * Math.PI * 48 * (1 - Math.max(progress, 3) / 100)}
                              className="text-primary transition-all duration-700 ease-out"
                              filter="url(#glow)"
                            />
                          </svg>
                          {/* Counter-rotate the text so it stays upright */}
                          <motion.div
                            className="absolute inset-0 flex items-center justify-center"
                            animate={progress <= 10 ? { rotate: -360 } : { rotate: 0 }}
                            transition={progress <= 10 ? { repeat: Infinity, duration: 2, ease: "linear" } : { duration: 0.3 }}
                          >
                            <span className="text-white font-bold text-xl tabular-nums">{progress}%</span>
                          </motion.div>
                        </motion.div>

                        <div className="text-center">
                          <motion.p
                            key={getStageText(progress)}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-white font-medium text-lg"
                          >
                            {getStageText(progress)}
                          </motion.p>
                          <p className="text-white/50 text-sm mt-1.5 animate-pulse">This usually takes 1-3 minutes</p>
                        </div>
                      </>
                    )}
                    {isFailed && (
                      <p className="text-destructive font-medium text-lg">Generation failed</p>
                    )}
                  </div>

                  {/* Bottom product info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent p-6 flex flex-col justify-end">
                    <div className="font-bold text-white text-lg drop-shadow-md">{productData.product.name}</div>
                    <div className="text-white/80 text-sm drop-shadow-md line-clamp-2 mt-1">{productData.product.description}</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </div>
    </AppLayout>
  );
}
