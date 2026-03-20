import fs from "fs";
import path from "path";
import sharp from "sharp";

// Helper to resolve local image paths to absolute paths
function resolveImagePath(url: string): string | null {
  // If it's a relative path starting with /uploads/, resolve to absolute path
  if (url.startsWith("/uploads/")) {
    return path.resolve(url.slice(1)); // Remove leading slash
  }
  // If it's already an absolute file path, use it
  if (fs.existsSync(url)) {
    return url;
  }
  return null;
}

const TEMPLATE_FILE = path.resolve(
  process.cwd(),
  "style_template_of_ad.md"
);

// Template IDs mapped to their heading names in the markdown
const TEMPLATE_HEADINGS: Record<string, string> = {
  "simple-ugc": "1. Simple UGC",
  "clean-minimal": "2. Clean Minimal",
  "unboxing": "3. Unboxing",
  "customer-reviews": "4. Customer Reviews",
  "viral-chaos": "5. Viral Chaos",
  "luxury": "6. Luxury",
  "product-story": "7. Product Story",
  "cozy-morning": "8. Cozy Morning",
};

function loadTemplateFile(): string {
  return fs.readFileSync(TEMPLATE_FILE, "utf-8");
}

/**
 * Parse a single template section from the markdown file by template ID.
 * Returns the full text between the template's ## heading and the next ## heading (or EOF).
 */
export function parseTemplate(templateId: string): string {
  const heading = TEMPLATE_HEADINGS[templateId];
  if (!heading) {
    throw new Error(`Unknown template ID: ${templateId}`);
  }

  const md = loadTemplateFile();
  const startMarker = `## ${heading}`;
  const startIdx = md.indexOf(startMarker);
  if (startIdx === -1) {
    throw new Error(`Template heading not found in markdown: ${startMarker}`);
  }

  // Find the next ## heading or end of file
  const afterStart = startIdx + startMarker.length;
  const nextHeadingIdx = md.indexOf("\n## ", afterStart);
  const section =
    nextHeadingIdx === -1
      ? md.slice(startIdx)
      : md.slice(startIdx, nextHeadingIdx);

  return section.trim();
}

interface ProductData {
  name: string;
  description: string;
  brandColors: string[];
  logoUrl: string;
}

/**
 * Build the final video generation prompt by replacing placeholders
 * in the template with actual product data.
 * Note: product image is NOT included in the prompt — it's passed separately via input_reference.
 */
export function buildVideoPrompt(
  templateId: string,
  product: ProductData
): string {
  let prompt = parseTemplate(templateId);

  prompt = prompt.replace(/\{product_name\}/g, product.name);
  prompt = prompt.replace(/\{product_description\}/g, product.description);
  prompt = prompt.replace(
    /\{brand_color\}/g,
    product.brandColors?.[0] || "#000000"
  );
  prompt = prompt.replace(/\{logo\}/g, product.logoUrl || "");

  // Append product info at the end
  const footer = `\n\n产品介绍：${product.name} ${product.description}`;
  return prompt + footer;
}

const APIYI_BASE = "https://api.apiyi.com/v1";

function getApiKey(): string {
  const key = process.env.APIYI_API_KEY;
  if (!key) {
    throw new Error("APIYI_API_KEY is not set in environment variables");
  }
  return key;
}

/**
 * Download an image from URL with timeout and retry logic.
 */
async function downloadImageWithTimeout(
  url: string,
  timeoutMs = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/**
 * Load image from URL or local file path and return it as a Blob with filename.
 * Supports both external URLs (http/https) and local file paths (/uploads/...)
 */
async function loadImageAsBlob(
  url: string,
  retries = 3
): Promise<{ blob: Blob; filename: string }> {
  // Check if it's a local file path
  const localPath = resolveImagePath(url);
  
  if (localPath) {
    // Load from local file system
    console.log(`Loading local image: ${localPath}`);
    const buffer = fs.readFileSync(localPath);
    console.log(`Local image loaded: ${buffer.length} bytes`);
    
    const processed = await processImageBuffer(buffer);
    return { blob: processed.blob, filename: processed.filename };
  }
  
  // Otherwise, download from external URL
  let lastError: Error | undefined;
  
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) {
        console.log(`Retrying image download (${i + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, 1000 * i)); // 指数退避
      }
      
      console.log(`Downloading image from: ${url.substring(0, 80)}...`);
      const res = await downloadImageWithTimeout(url, 30000); // 30秒超时
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log(`Image downloaded: ${buffer.length} bytes`);
      
      const processed = await processImageBuffer(buffer);
      return { blob: processed.blob, filename: processed.filename };
    } catch (err) {
      lastError = err as Error;
      console.warn(`Image download attempt ${i + 1} failed:`, (err as Error).message);
    }
  }
  
  throw new Error(`Failed to download image after ${retries} attempts: ${lastError?.message}`);
}

/**
 * Process image buffer: resize to 720x1280 and convert to JPEG blob
 */
async function processImageBuffer(buffer: Buffer): Promise<{ blob: Blob; filename: string }> {
  // Resize to fit within 720x1280, preserving aspect ratio, then place on a 720x1280 white canvas
  const fitted = await sharp(buffer)
    .resize(720, 1280, { fit: "inside", withoutEnlargement: false })
    .jpeg({ quality: 90 })
    .toBuffer();

  const resized = await sharp({
    create: { width: 720, height: 1280, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite([{ input: fitted, gravity: "centre" }])
    .jpeg({ quality: 90 })
    .toBuffer();

  const metadata = await sharp(resized).metadata();
  console.log(`Image resized to ${metadata.width}x${metadata.height} for Sora API`);

  const blob = new Blob([resized], { type: "image/jpeg" });
  return { blob, filename: "product.jpeg" };
}

export interface SoraTaskResponse {
  id: string;
  status: string;
  [key: string]: unknown;
}

/**
 * Submit a video generation request to the Sora API via apiyi.com.
 * Returns the task ID for polling.
 */
export async function generateVideo(
  prompt: string,
  imageUrl: string,
  seconds: number = 4
): Promise<string> {
  const apiKey = getApiKey();

  // Load the product image (supports both external URLs and local file paths)
  const { blob, filename } = await loadImageAsBlob(imageUrl);

  const form = new FormData();
  form.append("model", "sora-2");
  form.append("size", "720x1280");
  form.append("seconds", String(seconds));
  form.append("prompt", prompt);
  form.append(
    "input_reference",
    new File([blob], filename, { type: blob.type })
  );

  console.log(`Submitting to Sora API: ${APIYI_BASE}/videos`);
  const res = await fetch(`${APIYI_BASE}/videos`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Sora API error (${res.status}): ${text}`
    );
  }

  const data = (await res.json()) as SoraTaskResponse;
  console.log("Sora API response:", JSON.stringify(data));

  // The response should contain a task ID
  const taskId = data.id;
  if (!taskId) {
    throw new Error(
      `Sora API did not return a task ID: ${JSON.stringify(data)}`
    );
  }

  return taskId;
}

export interface SoraVideoStatus {
  id: string;
  status: string;
  videoUrl?: string;
  error?: string;
  raw: Record<string, unknown>;
}

/**
 * Poll the Sora API for video generation status.
 */
export async function pollVideoStatus(
  taskId: string
): Promise<SoraVideoStatus> {
  const apiKey = getApiKey();

  const res = await fetch(`${APIYI_BASE}/videos/${taskId}`, {
    headers: {
      Authorization: apiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Sora poll error (${res.status}): ${text}`
    );
  }

  const data = (await res.json()) as Record<string, unknown>;
  console.log("Sora poll response:", JSON.stringify(data));

  // Extract status and video URL from response
  const status = (data.status as string) || "unknown";

  // Look for video URL in common response fields
  let videoUrl: string | undefined;
  if (data.output && typeof data.output === "object") {
    const output = data.output as Record<string, unknown>;
    videoUrl = (output.video_url || output.url || output.video) as
      | string
      | undefined;
  }
  if (!videoUrl && data.video_url) {
    videoUrl = data.video_url as string;
  }
  if (!videoUrl && data.url) {
    videoUrl = data.url as string;
  }
  // Check data array format (OpenAI-style)
  if (!videoUrl && Array.isArray(data.data)) {
    for (const item of data.data) {
      if (item && typeof item === "object" && (item as Record<string, unknown>).url) {
        videoUrl = (item as Record<string, unknown>).url as string;
        break;
      }
    }
  }

  return {
    id: taskId,
    status,
    videoUrl,
    error: data.error as string | undefined,
    raw: data,
  };
}
