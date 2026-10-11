"use client";

/**
 * High-Resolution Canvas Card Exporter for Social Sharing (Twitter / X, Discord, Reddit)
 * Uses high-DPI HTML5 Canvas rendering with image proxies to prevent CORS canvas tainting.
 */

export interface ExportCardOptions {
  title: string;
  subtitle?: string;
  items: {
    title: string;
    posterImage?: string;
    badge?: string;
  }[];
  category?: "anime" | "manga" | "tierlist";
  authorName?: string;
}

// Loads image as ObjectURL via internal proxy to ensure clean, untainted canvas export
async function loadSafeCanvasImage(src: string, createdUrls: string[]): Promise<HTMLImageElement | null> {
  if (!src) return null;
  let objectUrl: string | null = null;

  try {
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(src)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const blob = await res.blob();
      objectUrl = URL.createObjectURL(blob);
      createdUrls.push(objectUrl);
    }
  } catch {}

  if (!objectUrl) {
    try {
      const res = await fetch(src, { mode: "cors" });
      if (res.ok) {
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        createdUrls.push(objectUrl);
      }
    } catch {}
  }

  if (!objectUrl) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = objectUrl!;
  });
}

/**
 * Generate a 1200x630 (Twitter / OpenGraph aspect ratio) or 1200x800 social preview card PNG
 */
export async function generateCollectionCardBlob({
  title,
  subtitle = "Curated Collection on AniWaveX",
  items,
  category = "anime",
  authorName,
}: ExportCardOptions): Promise<{ blob: Blob; dataUrl: string }> {
  const createdUrls: string[] = [];

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");

    // Standard high-DPI social share dimension: 1200x675 (16:9)
    const width = 1200;
    const height = 675;
    canvas.width = width;
    canvas.height = height;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // 1. Rich dark gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, "#080c14");
    bgGradient.addColorStop(0.5, "#0d1527");
    bgGradient.addColorStop(1, "#070a10");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative ambient glow
    const radialGlow = ctx.createRadialGradient(250, 150, 20, 250, 150, 450);
    radialGlow.addColorStop(0, category === "manga" ? "rgba(6, 182, 212, 0.22)" : "rgba(59, 130, 246, 0.22)");
    radialGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = radialGlow;
    ctx.fillRect(0, 0, width, height);

    // Subtle border stroke
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // 2. Header Branding & Title
    ctx.fillStyle = category === "manga" ? "#22d3ee" : "#60a5fa";
    ctx.font = "900 18px system-ui, -apple-system, sans-serif";
    ctx.fillText("ANIWAVEX  •  " + (category === "manga" ? "MANGA LIBRARY" : "WATCHLIST COLLECTION"), 60, 68);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 38px system-ui, -apple-system, sans-serif";
    const displayTitle = title.length > 40 ? title.slice(0, 37) + "…" : title;
    ctx.fillText(displayTitle, 60, 118);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 18px system-ui, -apple-system, sans-serif";
    ctx.fillText(subtitle, 60, 152);

    // 3. Render Top 6 Showcase Item Cards
    const displayItems = items.slice(0, 6);
    const cardW = 152;
    const cardH = 224;
    const gap = 24;
    const startX = 60;
    const startY = 195;

    // Load poster images concurrently
    const loadedImages = await Promise.all(
      displayItems.map((item) => loadSafeCanvasImage(item.posterImage || "", createdUrls))
    );

    displayItems.forEach((item, idx) => {
      const x = startX + idx * (cardW + gap);
      const y = startY;
      const img = loadedImages[idx];

      // Card shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.beginPath();
      ctx.roundRect(x, y + 6, cardW, cardH, 16);
      ctx.fill();

      // Card border / container
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 16);
      ctx.clip();

      if (img) {
        ctx.drawImage(img, x, y, cardW, cardH);
      } else {
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(x, y, cardW, cardH);
      }

      // Bottom gradient for card title
      const cardGrad = ctx.createLinearGradient(x, y + cardH - 70, x, y + cardH);
      cardGrad.addColorStop(0, "rgba(0,0,0,0)");
      cardGrad.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = cardGrad;
      ctx.fillRect(x, y + cardH - 70, cardW, 70);

      ctx.restore();

      // Card stroke
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 16);
      ctx.stroke();

      // Badge if provided (e.g. status or rating)
      if (item.badge) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.beginPath();
        ctx.roundRect(x + 8, y + 8, 48, 20, 6);
        ctx.fill();

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
        ctx.fillText(item.badge, x + 14, y + 22);
      }

      // Title caption below card
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
      const itemTitle = item.title.length > 16 ? item.title.slice(0, 14) + "…" : item.title;
      ctx.fillText(itemTitle, x, y + cardH + 24);
    });

    // 4. Footer info & CTA
    const footerY = height - 42;
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(60, footerY - 24, width - 120, 1);

    ctx.fillStyle = "#64748b";
    ctx.font = "500 14px system-ui, -apple-system, sans-serif";
    ctx.fillText("Curate & stream at aniwavex.vercel.app", 60, footerY);

    if (authorName) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
      ctx.fillText(`Shared by @${authorName}`, width - 260, footerY);
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to generate image blob"));
          return;
        }
        const dataUrl = canvas.toDataURL("image/png");
        resolve({ blob, dataUrl });
      }, "image/png");
    });
  } finally {
    createdUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
  }
}

/**
 * Native Web Share API helper with automatic fallback to download + clipboard
 */
export async function shareOrDownloadCard({
  blob,
  dataUrl,
  fileName,
  title,
  text,
  url,
}: {
  blob: Blob;
  dataUrl: string;
  fileName: string;
  title: string;
  text: string;
  url?: string;
}): Promise<"shared" | "downloaded"> {
  const file = new File([blob], fileName, { type: "image/png" });

  // 1. Try Navigator Web Share with image attachment (Supported on Mobile Chrome, Safari, Android, iOS)
  if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title,
        text,
        url: url || window.location.href,
        files: [file],
      });
      return "shared";
    } catch (e: any) {
      if (e.name === "AbortError") return "shared"; // User cancelled share sheet
    }
  }

  // 2. Fallback: Trigger instant PNG download
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();

  // Try to copy link to clipboard for convenience
  try {
    if (url || typeof window !== "undefined") {
      await navigator.clipboard.writeText(url || window.location.href);
    }
  } catch {}

  return "downloaded";
}
