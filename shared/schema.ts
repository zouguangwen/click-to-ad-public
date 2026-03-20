import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  logoUrl: text("logo_url"),
  brandColors: text("brand_colors").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  imageUrl: text("image_url").notNull(),
  isSelected: boolean("is_selected").default(true),
});

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  templateId: text("template_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, complete, failed
  progress: integer("progress").default(0),
  videoUrl: text("video_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertProductImageSchema = createInsertSchema(productImages).omit({ id: true });
export const insertVideoSchema = createInsertSchema(videos).omit({ id: true, createdAt: true, status: true, videoUrl: true });

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type ProductImage = typeof productImages.$inferSelect;
export type InsertProductImage = z.infer<typeof insertProductImageSchema>;

export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;

export type AnalyzeUrlRequest = {
  url: string;
};

export type ProductKitResponse = {
  product: Product;
  images: ProductImage[];
};

export type UpdateProductRequest = Partial<InsertProduct>;
export type UpdateProductImageRequest = Partial<InsertProductImage>;

export type GenerateVideoRequest = {
  productId: number;
  templateId: string;
};
