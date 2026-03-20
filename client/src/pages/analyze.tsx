import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { useAnalyzeProduct } from "@/hooks/use-products";
import { motion } from "framer-motion";

const STEPS = [
  "Connecting to product URL",
  "Extracting hi-res images",
  "Analyzing brand typography & colors",
  "Drafting compelling ad copy",
  "Finalizing product kit"
];

export default function Analyze() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const urlParam = searchParams.get("url");
  
  const { mutate, isPending, isError, error } = useAnalyzeProduct();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!urlParam) {
      setLocation("/");
      return;
    }

    // Start mutation
    mutate(urlParam, {
      onSuccess: (data) => {
        // Force steps to complete before redirect for visual effect
        setCurrentStep(STEPS.length);
        setTimeout(() => {
          setLocation(`/products/${data.product.id}/kit`);
        }, 800);
      }
    });

    // Fake progress simulation while mutation is pending
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [urlParam, mutate, setLocation]);

  if (isError) {
    return (
      <AppLayout>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/20 text-destructive flex items-center justify-center mb-6">
            <span className="font-bold text-2xl">!</span>
          </div>
          <h2 className="text-3xl font-bold mb-2">Analysis Failed</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            {error?.message || "We couldn't analyze that URL. Please check the link and try again."}
          </p>
          <button 
            onClick={() => setLocation("/")}
            className="px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold hover-elevate"
          >
            Go Back
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden"
        >
          {/* Animated progress bar top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: "0%" }}
              animate={{ width: `${(currentStep / STEPS.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <h2 className="text-3xl font-display font-bold mb-8 text-center">Building Product Kit</h2>

          <div className="space-y-6">
            {STEPS.map((step, index) => {
              const isPast = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <motion.div 
                  key={step}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: isPast || isCurrent ? 1 : 0.4, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-4 ${isCurrent ? 'text-primary' : isPast ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  <div className="shrink-0">
                    {isPast ? (
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    ) : isCurrent && isPending ? (
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}
                  </div>
                  <span className={`text-lg font-medium ${isCurrent ? 'neon-text-glow' : ''}`}>
                    {step}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
