import type { Express } from "express";
import type { Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { analyzeUrl } from "./services/url-analyzer";
import { extractProductKit } from "./services/product-extractor";

const uploadsDir = path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
import {
  buildVideoPrompt,
  generateVideo,
  pollVideoStatus,
} from "./services/video-generator";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post(api.products.analyze.path, async (req, res) => {
    try {
      const input = api.products.analyze.input.parse(req.body);

      // Fetch and analyze the real URL
      const rawData = await analyzeUrl(input.url);
      const kit = await extractProductKit(rawData);

      const product = await storage.createProduct(kit.product);

      const images = [];
      for (const img of kit.images) {
        images.push(
          await storage.createProductImage({
            productId: product.id,
            imageUrl: img.imageUrl,
            isSelected: img.isSelected,
          })
        );
      }

      res.status(200).json({ product, images });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      // Handle fetch/analysis errors gracefully
      if (err instanceof Error && !res.headersSent) {
        console.error("URL analysis error:", err.message);
        return res.status(400).json({
          message: `Failed to analyze URL: ${err.message}`,
        });
      }
      throw err;
    }
  });

  app.get(api.products.listSamples.path, async (req, res) => {
    const samples = await storage.listSampleProducts();
    res.json(samples);
  });

  app.get(api.products.get.path, async (req, res) => {
    const productId = Number(req.params.id);
    const product = await storage.getProduct(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const images = await storage.getProductImages(productId);
    res.status(200).json({ product, images });
  });

  app.patch(api.products.update.path, async (req, res) => {
    try {
      const productId = Number(req.params.id);
      const input = api.products.update.input.parse(req.body);
      const product = await storage.updateProduct(productId, input);
      res.status(200).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.products.updateImage.path, async (req, res) => {
    try {
      const imageId = Number(req.params.imageId);
      const input = api.products.updateImage.input.parse(req.body);
      const image = await storage.updateProductImage(imageId, input);
      res.status(200).json(image);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.products.uploadImage.path, upload.single("file"), async (req, res) => {
    try {
      const productId = Number(req.params.productId);
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      const image = await storage.createProductImage({
        productId,
        imageUrl,
        isSelected: false,
      });
      res.status(201).json(image);
    } catch (err) {
      if (err instanceof Error && !res.headersSent) {
        return res.status(400).json({ message: err.message });
      }
      throw err;
    }
  });

  app.post(api.videos.preview.path, async (req, res) => {
    try {
      const input = api.videos.preview.input.parse(req.body);
      const product = await storage.getProduct(input.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      const images = await storage.getProductImages(input.productId);
      const selectedImage = images.find((img) => img.isSelected) || images[0];
      if (!selectedImage) {
        return res.status(400).json({ message: "No product images available" });
      }

      const prompt = buildVideoPrompt(
        input.templateId,
        {
          name: product.name,
          description: product.description ?? "",
          brandColors: product.brandColors as string[] ?? [],
          logoUrl: product.logoUrl ?? "",
        }
      );

      res.status(200).json({
        prompt,
        imageUrl: selectedImage.imageUrl,
        productName: product.name,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      if (err instanceof Error && !res.headersSent) {
        return res.status(400).json({ message: err.message });
      }
      throw err;
    }
  });

  app.post(api.videos.create.path, async (req, res) => {
    try {
      const input = api.videos.create.input.parse(req.body);

      // Get product and images
      const product = await storage.getProduct(input.productId);
      if (!product) {
        return res.status(400).json({ message: "Product not found" });
      }
      const images = await storage.getProductImages(input.productId);
      const selectedImage = images.find((img) => img.isSelected) || images[0];
      if (!selectedImage) {
        return res.status(400).json({ message: "No product images available" });
      }

      // Build prompt (image is passed separately via input_reference, not in prompt text)
      const prompt = buildVideoPrompt(
        input.templateId,
        {
          name: product.name,
          description: product.description ?? "",
          brandColors: (product.brandColors as string[]) ?? [],
          logoUrl: product.logoUrl ?? "",
        }
      );

      // Create video record
      const video = await storage.createVideo({
        productId: input.productId,
        templateId: input.templateId,
      });

      // Check if API key is configured
      if (!process.env.APIYI_API_KEY) {
        // Fallback to mock when no API key
        console.log("APIYI_API_KEY not set, using mock video generation");
        (async () => {
          await new Promise(r => setTimeout(r, 1000));
          await storage.updateVideoStatus(video.id, "processing", undefined, 5);
          await new Promise(r => setTimeout(r, 1500));
          await storage.updateVideoProgress(video.id, 15);
          await new Promise(r => setTimeout(r, 1500));
          await storage.updateVideoProgress(video.id, 35);
          await new Promise(r => setTimeout(r, 1500));
          await storage.updateVideoProgress(video.id, 55);
          await new Promise(r => setTimeout(r, 1500));
          await storage.updateVideoProgress(video.id, 75);
          await new Promise(r => setTimeout(r, 1500));
          await storage.updateVideoProgress(video.id, 90);
          await new Promise(r => setTimeout(r, 1000));
          await storage.updateVideoStatus(
            video.id,
            "complete",
            "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            100
          );
        })();
        return res.status(201).json(video);
      }

      // Call Sora API
      res.status(201).json(video);

      // Run async: submit to Sora and poll until complete
      (async () => {
        try {
          await storage.updateVideoStatus(video.id, "processing", undefined, 5);
          console.log(`Submitting video ${video.id} to Sora API...`);

          const seconds = input.seconds ?? 12;
          const taskId = await generateVideo(prompt, selectedImage.imageUrl, seconds);
          console.log(`Sora task created: ${taskId} for video ${video.id}`);
          await storage.updateVideoProgress(video.id, 10);

          // Poll until complete or failed
          const POLL_INTERVAL = 10_000; // 10 seconds
          const MAX_POLLS = 120; // 20 minutes max
          let consecutiveErrors = 0;
          const MAX_CONSECUTIVE_ERRORS = 20;  // 约 3 分钟网络容错（20 * 10秒轮询间隔）

          for (let i = 0; i < MAX_POLLS; i++) {
            await new Promise((r) => setTimeout(r, POLL_INTERVAL));

            let status;
            try {
              // 单次查询最多等 15 秒，超时算网络错误
              status = await Promise.race([
                pollVideoStatus(taskId),
                new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('poll timeout')), 15000)
                )
              ]);
              consecutiveErrors = 0; // reset on success
            } catch (pollErr) {
              consecutiveErrors++;
              console.warn(
                `Video ${video.id} poll #${i + 1} network error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`,
                (pollErr as Error).message
              );
              if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                await storage.updateVideoStatus(video.id, "failed", undefined);
                console.error(`Video ${video.id} failed after ${MAX_CONSECUTIVE_ERRORS} consecutive poll errors`);
                return;
              }
              continue; // retry next poll
            }

            console.log(
              `Video ${video.id} poll #${i + 1}: status=${status.status}`
            );

            // Update progress: linearly from 10% to 90% over MAX_POLLS
            const pollProgress = Math.min(10 + Math.round((i + 1) / MAX_POLLS * 80), 90);
            await storage.updateVideoProgress(video.id, pollProgress);

            if (
              status.status === "completed" ||
              status.status === "complete" ||
              status.status === "succeeded"
            ) {
              if (status.videoUrl) {
                await storage.updateVideoStatus(
                  video.id,
                  "complete",
                  status.videoUrl,
                  100
                );
                console.log(
                  `Video ${video.id} complete: ${status.videoUrl}`
                );
              } else {
                await storage.updateVideoStatus(
                  video.id,
                  "failed",
                  undefined
                );
                console.error(
                  `Video ${video.id} completed but no URL found:`,
                  JSON.stringify(status.raw)
                );
              }
              return;
            }

            if (
              status.status === "failed" ||
              status.status === "error" ||
              status.status === "cancelled"
            ) {
              await storage.updateVideoStatus(video.id, "failed", undefined);
              console.error(
                `Video ${video.id} failed:`,
                status.error || JSON.stringify(status.raw)
              );
              return;
            }
          }

          // Timed out
          await storage.updateVideoStatus(video.id, "failed", undefined);
          console.error(`Video ${video.id} timed out after polling`);
        } catch (err) {
          console.error(`Video ${video.id} generation error:`, err);
          await storage.updateVideoStatus(video.id, "failed", undefined);
        }
      })();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.get(api.videos.get.path, async (req, res) => {
    const videoId = Number(req.params.id);
    const video = await storage.getVideo(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }
    res.status(200).json(video);
  });

  // Seed database with samples if none exist
  const samples = await storage.listSampleProducts();
  if (samples.length === 0) {
    await storage.createProduct({
      url: "https://www.amazon.com/Audecook-Electric-Steamer-Non-stick",
      name: "Audecook Electric Hot Pot (2L) - Portable Mini...",
      description: "Portable 2L electric hot pot with steamer.",
      logoUrl: "",
      brandColors: ["#ffffff", "#000000"]
    });
    await storage.createProduct({
      url: "https://www.shop.com/ergolite",
      name: "Ergolite Chair",
      description: "Ergonomic office chair for maximum comfort.",
      logoUrl: "",
      brandColors: ["#333333"]
    });
  }

  return httpServer;
}
