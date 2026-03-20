import { z } from 'zod';
import { insertProductSchema, products, productImages, videos, insertVideoSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  products: {
    analyze: {
      method: 'POST' as const,
      path: '/api/products/analyze' as const,
      input: z.object({ url: z.string().url() }),
      responses: {
        200: z.object({
          product: z.custom<typeof products.$inferSelect>(),
          images: z.array(z.custom<typeof productImages.$inferSelect>())
        }),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:id' as const,
      responses: {
        200: z.object({
          product: z.custom<typeof products.$inferSelect>(),
          images: z.array(z.custom<typeof productImages.$inferSelect>())
        }),
        404: errorSchemas.notFound,
      },
    },
    listSamples: {
      method: 'GET' as const,
      path: '/api/products/samples' as const,
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/products/:id' as const,
      input: insertProductSchema.partial(),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    updateImage: {
      method: 'PATCH' as const,
      path: '/api/products/:productId/images/:imageId' as const,
      input: z.object({ isSelected: z.boolean() }),
      responses: {
        200: z.custom<typeof productImages.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    },
    uploadImage: {
      method: 'POST' as const,
      path: '/api/products/:productId/images/upload' as const,
      // input is FormData (file), not JSON — no zod schema
      responses: {
        201: z.custom<typeof productImages.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      }
    }
  },
  videos: {
    preview: {
      method: 'POST' as const,
      path: '/api/videos/preview' as const,
      input: z.object({ productId: z.number(), templateId: z.string() }),
      responses: {
        200: z.object({
          prompt: z.string(),
          imageUrl: z.string(),
          productName: z.string(),
        }),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/videos' as const,
      input: z.object({ productId: z.number(), templateId: z.string(), seconds: z.number().optional() }),
      responses: {
        201: z.custom<typeof videos.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/videos/:id' as const,
      responses: {
        200: z.custom<typeof videos.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
