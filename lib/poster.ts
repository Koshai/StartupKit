import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";

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
