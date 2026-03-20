import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProductImage } from "@shared/schema";
import { api, buildUrl } from "@shared/routes";

export function useAnalyzeProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (url: string) => {
      const validatedInput = api.products.analyze.input.parse({ url });
      const res = await fetch(api.products.analyze.path, {
        method: api.products.analyze.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatedInput),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const err = api.products.analyze.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to analyze product url");
      }
      return api.products.analyze.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.listSamples.path] });
    }
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: [api.products.get.path, id],
    queryFn: async () => {
      if (!id || isNaN(id)) throw new Error("Invalid ID");
      const url = buildUrl(api.products.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch product");
      return api.products.get.responses[200].parse(await res.json());
    },
    enabled: !!id && !isNaN(id),
  });
}

export function useSampleProducts() {
  return useQuery({
    queryKey: [api.products.listSamples.path],
    queryFn: async () => {
      const res = await fetch(api.products.listSamples.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch samples");
      return api.products.listSamples.responses[200].parse(await res.json());
    }
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number, updates: any }) => {
      const validated = api.products.update.input.parse(updates);
      const url = buildUrl(api.products.update.path, { id });
      const res = await fetch(url, {
        method: api.products.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update product");
      return api.products.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [api.products.get.path, id] });
    }
  });
}

export function useUpdateProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, imageId, isSelected }: { productId: number, imageId: number, isSelected: boolean }) => {
      const validated = api.products.updateImage.input.parse({ isSelected });
      const url = buildUrl(api.products.updateImage.path, { productId, imageId });
      const res = await fetch(url, {
        method: api.products.updateImage.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to update image state");
      return api.products.updateImage.responses[200].parse(await res.json());
    },
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: [api.products.get.path, productId] });
    }
  });
}

export function useUploadProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, file }: { productId: number; file: File }) => {
      const url = buildUrl(api.products.uploadImage.path, { productId });
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(url, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(err.message);
      }
      return res.json() as Promise<ProductImage>;
    },
    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: [api.products.get.path, productId] });
    },
  });
}
