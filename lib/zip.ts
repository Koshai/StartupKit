import archiver from "archiver";
import { PassThrough } from "stream";
import { finished } from "stream/promises";

type ZipInput = {
  websiteHtml: string;
  blog1Markdown: string;
  blog2Markdown: string;
  socialPostsText: string;
  assets?: Array<{
    zipPath: string;
    content: Buffer;
  }>;
};

export async function generateLaunchKitZip({
  websiteHtml,
  blog1Markdown,
  blog2Markdown,
  socialPostsText,
  assets = [],
}: ZipInput): Promise<Buffer> {
  const output = new PassThrough();
  const chunks: Buffer[] = [];
  const streamDone = finished(output);

  output.on("data", (chunk) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (error) => {
    throw error;
  });
  archive.pipe(output);

  archive.append(websiteHtml, { name: "website/index.html" });
  archive.append(blog1Markdown, { name: "content/blog1.md" });
  archive.append(blog2Markdown, { name: "content/blog2.md" });
  archive.append(socialPostsText, { name: "social/posts.txt" });
  for (const asset of assets) {
    archive.append(asset.content, { name: asset.zipPath });
  }
  await archive.finalize();
  await streamDone;

  return Buffer.concat(chunks);
}
