import { db } from "./db";
import {
  products,
  productImages,
  videos,
  type Product,
  type InsertProduct,
  type ProductImage,
  type InsertProductImage,
  type Video,
  type InsertVideo,
  type UpdateProductRequest,
  type UpdateProductImageRequest,
} from "@shared/schema";
import { eq, and, ne } from "drizzle-orm";

export interface IStorage {
  getProduct(id: number): Promise<Product | undefined>;
  getProductImages(productId: number): Promise<ProductImage[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: UpdateProductRequest): Promise<Product>;
  createProductImage(image: InsertProductImage): Promise<ProductImage>;
  updateProductImage(id: number, updates: UpdateProductImageRequest): Promise<ProductImage>;
  createVideo(video: InsertVideo): Promise<Video>;
  getVideo(id: number): Promise<Video | undefined>;
  updateVideoStatus(id: number, status: string, videoUrl?: string, progress?: number): Promise<Video>;
  updateVideoProgress(id: number, progress: number): Promise<Video>;
  listSampleProducts(): Promise<Product[]>;
}

export class DatabaseStorage implements IStorage {
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductImages(productId: number): Promise<ProductImage[]> {
    return await db.select().from(productImages).where(eq(productImages.productId, productId));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, updates: UpdateProductRequest): Promise<Product> {
    const [updated] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return updated;
  }

  async createProductImage(image: InsertProductImage): Promise<ProductImage> {
    const [newImage] = await db.insert(productImages).values(image).returning();
    return newImage;
  }

  async updateProductImage(id: number, updates: UpdateProductImageRequest): Promise<ProductImage> {
    // When selecting an image, deselect all other images for the same product first (single-select)
    if (updates.isSelected) {
      const [image] = await db.select().from(productImages).where(eq(productImages.id, id));
      if (image) {
        await db.update(productImages)
          .set({ isSelected: false })
          .where(and(eq(productImages.productId, image.productId), ne(productImages.id, id)));
      }
    }
    const [updated] = await db.update(productImages).set(updates).where(eq(productImages.id, id)).returning();
    return updated;
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    const [newVideo] = await db.insert(videos).values(video).returning();
    return newVideo;
  }

  async getVideo(id: number): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async updateVideoStatus(id: number, status: string, videoUrl?: string, progress?: number): Promise<Video> {
    const updates: Record<string, unknown> = { status, videoUrl };
    if (progress !== undefined) updates.progress = progress;
    const [updated] = await db.update(videos).set(updates).where(eq(videos.id, id)).returning();
    return updated;
  }

  async updateVideoProgress(id: number, progress: number): Promise<Video> {
    const [updated] = await db.update(videos).set({ progress }).where(eq(videos.id, id)).returning();
    return updated;
  }

  async listSampleProducts(): Promise<Product[]> {
    return await db.select().from(products).limit(5);
  }
}

export const storage = new DatabaseStorage();
