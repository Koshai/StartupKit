import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";
import QRCode from "qrcode";

export async function generateQRCode(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 100,
    margin: 1,
    errorCorrectionLevel: "M",
  });
}

export async function renderPosterAssets(posterHtml: string): Promise<{
  pngBuffer: Buffer;
  pdfBuffer: Buffer;
}> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 3 });
    await page.setContent(posterHtml, { waitUntil: "networkidle0" });

    const pngBuffer = Buffer.from(
      await page.screenshot({
        type: "png",
        clip: { x: 0, y: 0, width: 794, height: 1123 },
      }),
    );

    const pdfBuffer = Buffer.from(
      await page.pdf({
        format: "A4",
        preferCSSPageSize: true,
        printBackground: true,
        pageRanges: "1",
        margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      }),
    );

    const outputDir = path.join(process.cwd(), "assets");
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, "poster.png"), pngBuffer);
    await writeFile(path.join(outputDir, "poster.pdf"), pdfBuffer);

    return { pngBuffer, pdfBuffer };
  } finally {
    await browser.close();
  }
}

type SocialImageInput = {
  brandName: string;
  tagline: string;
  value_proposition: string;
  call_to_action: string;
  primaryColor: string;
  secondaryColor: string;
  logo?: string;
};

type SocialImageResult = {
  instagram: Buffer;
  twitter: Buffer;
  facebook: Buffer;
};

function buildSocialImageHtml(
  data: SocialImageInput,
  width: number,
  height: number,
): string {
  const logoMarkup = data.logo
    ? `<img src="${data.logo}" alt="${data.brandName} logo" style="height: ${Math.max(
        28,
        Math.round(height * 0.04),
      )}px; width: auto; object-fit: contain;" />`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      font-family: Inter, Arial, sans-serif;
    }
    .frame {
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-rows: auto 1fr auto;
      background: linear-gradient(to bottom, ${data.primaryColor}, ${data.secondaryColor});
      color: #fff;
      padding: ${Math.round(width * 0.06)}px;
      overflow: hidden;
      gap: ${Math.round(height * 0.015)}px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: ${Math.max(14, Math.round(width * 0.028))}px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .center {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      gap: ${Math.round(height * 0.02)}px;
      max-width: 82%;
      margin: 0 auto;
      overflow: hidden;
    }
    h1 {
      margin: 0;
      font-size: clamp(${Math.max(26, Math.round(width * 0.05))}px, ${Math.max(
        34,
        Math.round(width * 0.07),
      )}px, ${Math.max(64, Math.round(width * 0.085))}px);
      line-height: 1.05;
      font-weight: 800;
      letter-spacing: -0.02em;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    p {
      margin: 0;
      font-size: ${Math.max(18, Math.round(width * 0.025))}px;
      line-height: 1.3;
      opacity: 0.95;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .cta-wrap {
      display: flex;
      justify-content: center;
      align-items: end;
    }
    .cta {
      background: #fff;
      color: #111827;
      border-radius: 14px;
      padding: ${Math.max(12, Math.round(height * 0.017))}px ${Math.max(
        20,
        Math.round(width * 0.035),
      )}px;
      font-size: ${Math.max(20, Math.round(width * 0.03))}px;
      font-weight: 800;
      text-align: center;
      max-width: 100%;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
  </style>
</head>
<body>
  <div class="frame">
    <div class="brand">
      ${logoMarkup}
      <span>${data.brandName}</span>
    </div>
    <div class="center">
      <h1>${data.tagline}</h1>
      <p>${data.value_proposition}</p>
    </div>
    <div class="cta-wrap">
      <div class="cta">${data.call_to_action}</div>
    </div>
  </div>
</body>
</html>`;
}

export async function generateSocialImages(
  data: SocialImageInput,
): Promise<SocialImageResult> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const variants = {
      instagram: { width: 1080, height: 1080, fileName: "instagram.png" },
      twitter: { width: 1200, height: 675, fileName: "twitter.png" },
      facebook: { width: 1200, height: 630, fileName: "facebook.png" },
    } as const;

    const outputDir = path.join(process.cwd(), "assets", "social");
    await mkdir(outputDir, { recursive: true });

    const result = {} as SocialImageResult;
    for (const [key, size] of Object.entries(variants) as Array<
      [keyof SocialImageResult, (typeof variants)[keyof typeof variants]]
    >) {
      const page = await browser.newPage();
      await page.setViewport({
        width: size.width,
        height: size.height,
        deviceScaleFactor: 2,
      });
      const html = buildSocialImageHtml(data, size.width, size.height);
      await page.setContent(html, { waitUntil: "networkidle0" });
      const buffer = Buffer.from(
        await page.screenshot({
          type: "png",
          clip: { x: 0, y: 0, width: size.width, height: size.height },
        }),
      );
      await writeFile(path.join(outputDir, size.fileName), buffer);
      result[key] = buffer;
      await page.close();
    }
    return result;
  } finally {
    await browser.close();
  }
}
