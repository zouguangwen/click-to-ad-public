import type { RawPageData } from "./url-analyzer";
import type { InsertProduct, InsertProductImage } from "@shared/schema";

export interface ExtractedProductKit {
  product: InsertProduct;
  images: Omit<InsertProductImage, "productId">[];
}

const KIMI_BASE = "https://api.moonshot.cn/v1";

interface KimiProductInfo {
  shortName: string;
  brandColors: string[];
}

/**
 * Call Kimi (Moonshot) API to extract a short product name and brand colors
 * from the raw page title + description.
 */
async function extractWithKimi(
  title: string,
  description: string
): Promise<KimiProductInfo | null> {
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${KIMI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `You extract product info. Return ONLY valid JSON, no markdown.`,
          },
          {
            role: "user",
            content: `From this product listing, extract:
1. "shortName": A concise product name, max 20 characters. Keep the brand if recognizable. Examples: "AirPods Pro 2", "Dyson V15", "Stanley Tumbler".
2. "brandColors": An array of 3-4 hex color codes that represent this product/brand. Infer from the brand identity, product category, and description. Use realistic brand colors, not generic ones.

Title: ${title}
Description: ${description.slice(0, 500)}

Return JSON: {"shortName": "...", "brandColors": ["#...", ...]}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.warn(`Kimi API error (${res.status}):`, await res.text());
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // Parse JSON from response (strip markdown fences if present)
    const jsonStr = content.replace(/```json\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    // Validate
    if (
      typeof parsed.shortName === "string" &&
      parsed.shortName.length > 0 &&
      Array.isArray(parsed.brandColors) &&
      parsed.brandColors.length > 0
    ) {
      return {
        shortName: parsed.shortName.slice(0, 30),
        brandColors: parsed.brandColors.slice(0, 4),
      };
    }

    return null;
  } catch (err) {
    console.warn("Kimi extraction failed:", (err as Error).message);
    return null;
  }
}

/**
 * Fallback: derive default brand colors
 */
function deriveBrandColors(): string[] {
  return ["#000000", "#FFFFFF", "#4F46E5", "#F59E0B"];
}

/**
 * Fallback: clean up a product title with regex
 */
function cleanTitle(title: string): string {
  return title
    .replace(/\s*[\|–—-]\s*(Amazon\.com|Amazon|Shopify|Shop).*$/i, "")
    .replace(/\s*:\s*(Amazon\.com|Amazon).*$/i, "")
    .trim();
}

/**
 * Clean up description - truncate if too long, remove extra whitespace
 */
function cleanDescription(description: string): string {
  const cleaned = description.replace(/\s+/g, " ").trim();
  if (cleaned.length > 500) {
    return cleaned.substring(0, 497) + "...";
  }
  return cleaned;
}

/**
 * Filter and rank images - prefer larger, product-focused images
 */
function processImages(
  images: string[]
): Omit<InsertProductImage, "productId">[] {
  return images
    .filter((url) => {
      if (url.startsWith("data:")) return false;
      if (url.includes("pixel")) return false;
      if (url.includes("tracker")) return false;
      if (url.includes("badge")) return false;
      if (url.includes("sprite")) return false;
      if (url.length < 10) return false;
      return true;
    })
    .slice(0, 8)
    .map((imageUrl, index) => ({
      imageUrl,
      isSelected: index === 0,
    }));
}

/**
 * Extract a structured ProductKit from raw page data.
 * Uses Kimi API for short name + brand colors, with regex/defaults as fallback.
 */
export async function extractProductKit(
  raw: RawPageData
): Promise<ExtractedProductKit> {
  const description = cleanDescription(
    raw.description || raw.ogData.description || `Product from ${raw.url}`
  );
  const images = processImages(raw.images);

  // Try Kimi for smart extraction
  const kimiResult = await extractWithKimi(raw.title, description);

  const name = kimiResult?.shortName || cleanTitle(raw.title);
  const brandColors = kimiResult?.brandColors || deriveBrandColors();

  if (kimiResult) {
    console.log(`Kimi extracted: name="${name}", colors=${JSON.stringify(brandColors)}`);
  }

  return {
    product: {
      url: raw.url,
      name,
      description,
      logoUrl: raw.logoUrl || null,
      brandColors,
    },
    images,
  };
}
