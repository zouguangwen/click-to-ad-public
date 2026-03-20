import * as cheerio from "cheerio";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface RawPageData {
  url: string;
  title: string;
  description: string;
  images: string[];
  logoUrl: string;
  brand: string;
  platform: "amazon" | "shopify" | "generic";
  jsonLd: Record<string, any> | null;
  ogData: {
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
  };
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function parseInternalProductId(url: string): number | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/products\/(\d+)\/kit\/?$/);
    if (!match) return null;
    const productId = Number(match[1]);
    return Number.isFinite(productId) ? productId : null;
  } catch {
    return null;
  }
}

function detectPlatform(url: string): RawPageData["platform"] {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes("amazon")) return "amazon";
  if (hostname.includes("shopify") || hostname.includes("myshopify"))
    return "shopify";
  return "generic";
}

function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

function extractOgData($: cheerio.CheerioAPI) {
  return {
    title:
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="og:title"]').attr("content"),
    description:
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="og:description"]').attr("content"),
    image:
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="og:image"]').attr("content"),
    siteName:
      $('meta[property="og:site_name"]').attr("content") ||
      $('meta[name="og:site_name"]').attr("content"),
  };
}

function extractJsonLd($: cheerio.CheerioAPI): Record<string, any> | null {
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    try {
      const data = JSON.parse($(scripts[i]).html() || "");
      // Could be an array or single object
      const item = Array.isArray(data) ? data[0] : data;
      if (
        item["@type"] === "Product" ||
        item["@type"]?.includes?.("Product")
      ) {
        return item;
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }
  // Return the first JSON-LD if no Product found
  try {
    const firstScript = $('script[type="application/ld+json"]').first().html();
    if (firstScript) return JSON.parse(firstScript);
  } catch {}
  return null;
}

function extractAmazon(
  $: cheerio.CheerioAPI,
  url: string,
  ogData: ReturnType<typeof extractOgData>
): Partial<RawPageData> {
  const title =
    $("#productTitle").text().trim() ||
    ogData.title ||
    $("title").text().trim();

  const description =
    $("#productDescription").text().trim() ||
    $("#feature-bullets").text().trim() ||
    $('meta[name="description"]').attr("content") ||
    ogData.description ||
    "";

  const images: string[] = [];

  // Amazon main image
  const mainImg = $("#landingImage").attr("src") || $("#imgBlkFront").attr("src");
  if (mainImg) images.push(mainImg);

  // Amazon image thumbnails (data-old-hires has full-res)
  $(".imgTagWrapper img, #altImages img").each((_, el) => {
    const src =
      $(el).attr("data-old-hires") ||
      $(el).attr("src") ||
      "";
    if (src && !src.includes("sprite") && !src.includes("grey-pixel") && !images.includes(src)) {
      // Upscale Amazon thumbnails
      const fullRes = src.replace(/\._.*_\./, ".");
      images.push(fullRes);
    }
  });

  if (ogData.image && !images.includes(ogData.image)) {
    images.unshift(ogData.image);
  }

  return { title, description, images, brand: "Amazon" };
}

function extractShopify(
  $: cheerio.CheerioAPI,
  url: string,
  ogData: ReturnType<typeof extractOgData>,
  jsonLd: Record<string, any> | null
): Partial<RawPageData> {
  const title =
    $(".product-single__title, .product__title, h1.title").first().text().trim() ||
    jsonLd?.name ||
    ogData.title ||
    $("title").text().trim();

  const description =
    $(".product-single__description, .product__description").first().text().trim() ||
    jsonLd?.description ||
    ogData.description ||
    "";

  const images: string[] = [];

  // From JSON-LD
  if (jsonLd?.image) {
    const jsonImages = Array.isArray(jsonLd.image)
      ? jsonLd.image
      : [jsonLd.image];
    for (const img of jsonImages) {
      const src = typeof img === "string" ? img : img?.url;
      if (src) images.push(src.startsWith("//") ? "https:" + src : src);
    }
  }

  // From product gallery
  $(".product__media img, .product-single__photo img, .product-images img").each(
    (_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || "";
      if (src) {
        const full = src.startsWith("//") ? "https:" + src : resolveUrl(url, src);
        if (!images.includes(full)) images.push(full);
      }
    }
  );

  if (ogData.image && !images.includes(ogData.image)) {
    images.unshift(ogData.image);
  }

  const brand = jsonLd?.brand?.name || ogData.siteName || "";

  return { title, description, images, brand };
}

function extractGeneric(
  $: cheerio.CheerioAPI,
  url: string,
  ogData: ReturnType<typeof extractOgData>,
  jsonLd: Record<string, any> | null
): Partial<RawPageData> {
  const title =
    jsonLd?.name ||
    ogData.title ||
    $("h1").first().text().trim() ||
    $("title").text().trim();

  const description =
    jsonLd?.description ||
    ogData.description ||
    $('meta[name="description"]').attr("content") ||
    "";

  const images: string[] = [];

  // OG image first
  if (ogData.image) images.push(ogData.image);

  // JSON-LD images
  if (jsonLd?.image) {
    const jsonImages = Array.isArray(jsonLd.image)
      ? jsonLd.image
      : [jsonLd.image];
    for (const img of jsonImages) {
      const src = typeof img === "string" ? img : img?.url;
      if (src && !images.includes(src)) images.push(src);
    }
  }

  // Large images from page
  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    if (!src) return;
    const resolved = resolveUrl(url, src);
    // Filter out tiny icons/trackers
    const width = parseInt($(el).attr("width") || "0", 10);
    const height = parseInt($(el).attr("height") || "0", 10);
    if (width > 0 && width < 50) return;
    if (height > 0 && height < 50) return;
    if (
      src.includes("pixel") ||
      src.includes("tracker") ||
      src.includes("spacer") ||
      src.includes(".svg") ||
      src.includes("data:image")
    )
      return;
    if (!images.includes(resolved)) images.push(resolved);
  });

  const brand = jsonLd?.brand?.name || ogData.siteName || "";

  return { title, description, images, brand };
}

/**
 * Fetch HTML using curl to bypass anti-bot detection.
 * Node.js native fetch gets blocked by Amazon and other sites
 * due to TLS fingerprinting differences.
 */
async function fetchHtmlWithCurl(url: string): Promise<string> {
  const { stdout } = await execFileAsync("curl", [
    "-s",
    "-L",
    "--max-time", "30",
    "--compressed",
    "-H", `User-Agent: ${USER_AGENT}`,
    "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "-H", "Accept-Language: en-US,en;q=0.9",
    url,
  ], { maxBuffer: 10 * 1024 * 1024 });

  if (!stdout || stdout.length < 100) {
    throw new Error("Failed to fetch URL: empty response from curl");
  }

  return stdout;
}

async function fetchInternalProductData(url: string, productId: number): Promise<RawPageData | null> {
  try {
    const parsed = new URL(url);
    const apiUrl = new URL(`/api/products/${productId}`, parsed.origin).href;
    const res = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const product = data?.product;
    const images = Array.isArray(data?.images)
      ? data.images
          .map((img: { imageUrl?: string }) => img?.imageUrl)
          .filter((imageUrl: unknown): imageUrl is string => typeof imageUrl === "string" && imageUrl.length > 0)
      : [];

    if (!product) return null;

    return {
      url,
      title: product.name || "Unknown Product",
      description: product.description || "",
      images,
      logoUrl: product.logoUrl || "",
      brand: "",
      platform: "generic",
      jsonLd: null,
      ogData: {
        title: product.name || undefined,
        description: product.description || undefined,
        image: images[0],
      },
    };
  } catch {
    return null;
  }
}

export async function analyzeUrl(url: string): Promise<RawPageData> {
  const internalProductId = parseInternalProductId(url);
  if (internalProductId !== null) {
    const internalProductData = await fetchInternalProductData(url, internalProductId);
    if (internalProductData) return internalProductData;
    throw new Error(
      "This product editor URL is a client-side app route. Failed to resolve its backing /api/products/:id data."
    );
  }

  const html = await fetchHtmlWithCurl(url);
  const $ = cheerio.load(html);
  const platform = detectPlatform(url);
  const ogData = extractOgData($);
  const jsonLd = extractJsonLd($);

  let extracted: Partial<RawPageData>;

  switch (platform) {
    case "amazon":
      extracted = extractAmazon($, url, ogData);
      break;
    case "shopify":
      extracted = extractShopify($, url, ogData, jsonLd);
      break;
    default:
      extracted = extractGeneric($, url, ogData, jsonLd);
  }

  // Deduplicate and limit images
  const uniqueImages = [...new Set(extracted.images || [])].slice(0, 10);

  // Try to find a logo
  let logoUrl =
    $('link[rel="icon"][type="image/png"]').attr("href") ||
    $('link[rel="apple-touch-icon"]').attr("href") ||
    $('link[rel="icon"]').attr("href") ||
    "";
  if (logoUrl && !logoUrl.startsWith("http")) {
    logoUrl = resolveUrl(url, logoUrl);
  }

  return {
    url,
    title: extracted.title || "Unknown Product",
    description: extracted.description || "",
    images: uniqueImages,
    logoUrl: logoUrl,
    brand: extracted.brand || "",
    platform,
    jsonLd,
    ogData,
  };
}
