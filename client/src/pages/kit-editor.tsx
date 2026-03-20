import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { Check, CheckCircle2, Settings2, ArrowRight, Plus, Upload, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { useProduct, useUpdateProduct, useUpdateProductImage, useUploadProductImage } from "@/hooks/use-products";
import { motion } from "framer-motion";

export default function KitEditor() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { data, isLoading, isError } = useProduct(Number(id));
  const updateProduct = useUpdateProduct();
  const updateImage = useUpdateProductImage();
  const uploadImage = useUploadProductImage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const colorInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const addColorRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (data?.product) {
      setDescription(data.product.description);
      setName(data.product.name);
    }
  }, [data]);

  if (isLoading) return <AppLayout><div className="flex-1 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div></AppLayout>;
  if (isError || !data) return <AppLayout><div className="flex-1 flex items-center justify-center text-destructive">Error loading kit.</div></AppLayout>;

  const { product, images } = data;

  const handleNameBlur = () => {
    if (name !== product.name && name.trim()) {
      updateProduct.mutate({ id: product.id, updates: { name } });
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== product.description) {
      updateProduct.mutate({ id: product.id, updates: { description } });
    }
  };

  const handleColorChange = (index: number, newColor: string) => {
    const newColors = [...(product.brandColors || [])];
    newColors[index] = newColor;
    updateProduct.mutate({ id: product.id, updates: { brandColors: newColors } });
  };

  const handleAddColor = (color: string) => {
    const newColors = [...(product.brandColors || []), color];
    updateProduct.mutate({ id: product.id, updates: { brandColors: newColors } });
  };

  const handleImageToggle = (imageId: number, currentState: boolean) => {
    // Backend handles deselecting other images when selecting a new one (single-select)
    updateImage.mutate({ productId: product.id, imageId, isSelected: !currentState });
  };

  // Sort images: selected first
  const sortedImages = [...images].sort((a, b) => {
    if (a.isSelected && !b.isSelected) return -1;
    if (!a.isSelected && b.isSelected) return 1;
    return 0;
  });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col h-[calc(100vh-80px)]">

        {/* Header Area */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-display font-bold">Review Product Kit</h1>
            <p className="text-muted-foreground mt-1">We extracted these assets. Edit as needed before styling.</p>
          </div>
          <button
            onClick={() => setLocation(`/products/${product.id}/style`)}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover-elevate neon-glow flex items-center gap-2"
          >
            Next: Choose Style <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 flex-1 min-h-0">

          {/* Left: Text & Brand */}
          <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-hide">
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Brand Profile
              </h3>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Product Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleNameBlur}
                  className="w-full p-3 bg-background rounded-lg border border-border font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Ad Copy / Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescriptionBlur}
                  className="w-full h-32 p-3 bg-background border border-border rounded-lg resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Extracted Colors</label>
                <div className="flex flex-wrap gap-3">
                  {product.brandColors && product.brandColors.length > 0 ? (
                    product.brandColors.map((color, i) => (
                      <div key={i} className="relative">
                        <div
                          className="w-10 h-10 rounded-full border-2 border-border shadow-md cursor-pointer hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          title={color}
                          onClick={() => colorInputRefs.current[i]?.click()}
                        />
                        <input
                          ref={(el) => { colorInputRefs.current[i] = el; }}
                          type="color"
                          value={color}
                          onChange={(e) => handleColorChange(i, e.target.value)}
                          className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No prominent colors found.</div>
                  )}
                  {/* Add color button */}
                  <div className="relative">
                    <div
                      className="w-10 h-10 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary hover:text-primary transition-colors text-muted-foreground"
                      onClick={() => addColorRef.current?.click()}
                      title="Add color"
                    >
                      <Plus className="w-4 h-4" />
                    </div>
                    <input
                      ref={addColorRef}
                      type="color"
                      defaultValue="#000000"
                      onChange={(e) => handleAddColor(e.target.value)}
                      className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Images Grid */}
          <div className="lg:col-span-8 flex flex-col overflow-hidden bg-card border border-border rounded-2xl">
            <div className="p-6 border-b border-border shrink-0 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">Product Media</h3>
                <p className="text-sm text-muted-foreground">Select 1 image as video reference.</p>
              </div>
              <div className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                {images.filter(img => img.isSelected).length === 1 ? "1 Selected (video reference)" : "0 Selected"}
              </div>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-max">
              {sortedImages.map((img) => (
                <motion.div
                  key={img.id}
                  layout
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleImageToggle(img.id, img.isSelected ?? false)}
                  className={`
                    relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-200
                    ${img.isSelected ? 'border-primary ring-4 ring-primary/20' : 'border-transparent opacity-60 hover:opacity-100'}
                  `}
                >
                  <img src={img.imageUrl} alt="product asset" className="w-full h-full object-cover bg-background" />

                  {/* Selection Indicator */}
                  <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${img.isSelected ? 'bg-primary text-primary-foreground' : 'bg-background/50 text-transparent border border-white/50'}`}>
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </div>
                </motion.div>
              ))}

              {/* Upload card */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary cursor-pointer flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                {uploadImage.isPending ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-8 h-8" />
                    <span className="text-sm font-medium">Upload Image</span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      uploadImage.mutate({ productId: product.id, file });
                      e.target.value = "";
                    }
                  }}
                />
              </div>

              {images.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  No images extracted.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
