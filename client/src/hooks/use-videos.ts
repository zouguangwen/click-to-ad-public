import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useCreateVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, templateId, seconds }: { productId: number, templateId: string, seconds?: number }) => {
      const validated = api.videos.create.input.parse({ productId, templateId, seconds });
      const res = await fetch(api.videos.create.path, {
        method: api.videos.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to start video generation");
      return api.videos.create.responses[201].parse(await res.json());
    }
  });
}

export function useVideo(id: number, enablePolling: boolean = false) {
  return useQuery({
    queryKey: [api.videos.get.path, id],
    queryFn: async () => {
      if (!id || isNaN(id)) throw new Error("Invalid ID");
      const url = buildUrl(api.videos.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch video");
      return api.videos.get.responses[200].parse(await res.json());
    },
    enabled: !!id && !isNaN(id),
    refetchInterval: (query) => {
      if (!enablePolling) return false;
      const data = query.state.data;
      if (data && (data.status === 'complete' || data.status === 'failed')) {
        return false;
      }
      return 2000; // Poll every 2s
    }
  });
}
