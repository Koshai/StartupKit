import OpenAI from "openai";

export type BrandInput = {
  startupName: string;
  description: string;
  tone: string;
};

export type BrandResult = {
  tagline: string;
  value_proposition: string;
  target_audience: string;
  key_features: string[];
  tone: string;
};

export type WebsiteFeature = {
  title: string;
  description: string;
};

export type WebsiteResult = {
  hero_title: string;
  hero_subtitle: string;
  features: WebsiteFeature[];
  call_to_action: string;
};

export type SocialResult = {
  posts: string[];
};

export type BlogPost = {
  title: string;
  content: string;
};

export type BlogsResult = {
  blogs: BlogPost[];
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateStructured<T>({
  schemaName,
  schema,
  systemPrompt,
  userPrompt,
}: {
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
}): Promise<T> {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: schemaName,
        schema,
        strict: true,
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Model returned empty content.");

  return JSON.parse(content) as T;
}

/* =========================
   SCHEMAS
========================= */

const brandSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    tagline: { type: "string" },
    value_proposition: { type: "string" },
    target_audience: { type: "string" },
    key_features: {
      type: "array",
      items: { type: "string" },
    },
    tone: { type: "string" },
  },
  required: [
    "tagline",
    "value_proposition",
    "target_audience",
    "key_features",
    "tone",
  ],
};

const websiteSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    hero_title: { type: "string" },
    hero_subtitle: { type: "string" },
    features: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: "string" },
        },
        required: ["title", "description"],
      },
    },
    call_to_action: { type: "string" },
  },
  required: ["hero_title", "hero_subtitle", "features", "call_to_action"],
};

const socialSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    posts: {
      type: "array",
      minItems: 10,
      maxItems: 10,
      items: { type: "string" },
    },
  },
  required: ["posts"],
};

const blogsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    blogs: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          content: { type: "string" },
        },
        required: ["title", "content"],
      },
    },
  },
  required: ["blogs"],
};

/* =========================
   GENERATORS
========================= */

export async function generateBrand(input: BrandInput): Promise<BrandResult> {
  return generateStructured<BrandResult>({
    schemaName: "brand_result",
    schema: brandSchema,
    systemPrompt: `You are a startup branding expert.
Avoid hype. Be realistic.`,
    userPrompt: `Create startup brand messaging.

Startup Name: ${input.startupName}
Description: ${input.description}
Tone: ${input.tone}`,
  });
}

export async function generateWebsite(
  brand: BrandResult
): Promise<WebsiteResult> {
  return generateStructured<WebsiteResult>({
    schemaName: "website_result",
    schema: websiteSchema,
    systemPrompt: `You are a professional SaaS landing page copywriter.`,
    userPrompt: `Write clear, modern, realistic landing page copy.

Return JSON with:
- hero_title
- hero_subtitle
- features (array of objects with title + description)
- call_to_action

Rules:
- No buzzwords
- No exaggeration
- Keep it concise

Brand:
Tagline: ${brand.tagline}
Value: ${brand.value_proposition}
Audience: ${brand.target_audience}
Features: ${brand.key_features.join(", ")}`,
  });
}

export async function generateSocial(
  brand: BrandResult
): Promise<SocialResult> {
  return generateStructured<SocialResult>({
    schemaName: "social_result",
    schema: socialSchema,
    systemPrompt: `You are a social strategist.`,
    userPrompt: `Generate 10 short posts under 140 characters.

Brand:
${brand.tagline}`,
  });
}

export async function generateBlogs(
  brand: BrandResult
): Promise<BlogsResult> {
  return generateStructured<BlogsResult>({
    schemaName: "blogs_result",
    schema: blogsSchema,
    systemPrompt: "You are an SEO writer.",
    userPrompt: `Create 2 blog posts.

Audience: ${brand.target_audience}
Topic: ${brand.value_proposition}`,
  });
}

/* =========================
   HTML GENERATOR
========================= */

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function generateWebsiteHTML(
  website: WebsiteResult,
  branding: {
    brandName: string;
    logo?: string;
    heroImage?: string;
    primaryColor?: string;
    secondaryColor?: string;
  }
): string {
  const logo = branding.logo || "https://via.placeholder.com/120x40";
  const heroImage =
    branding.heroImage || "https://via.placeholder.com/800x400";
  const primary = branding.primaryColor || "#4F46E5";
  const secondary = branding.secondaryColor || "#9333EA";

  const icons = ["🚀", "⚡", "📊"];

  const featureItems = website.features
    .map(
      (f, i) => `
<div class="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition">
  <div class="text-3xl mb-3">${icons[i] || "✨"}</div>
  <h3 class="font-semibold text-lg mb-2">${escapeHtml(f.title)}</h3>
  <p class="text-gray-600 text-sm">${escapeHtml(f.description)}</p>
</div>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<script src="https://cdn.tailwindcss.com"></script>
<style>
:root {
  --primary: ${primary};
  --secondary: ${secondary};
}
</style>
</head>

<body class="bg-gray-50">

<header class="flex justify-between p-6 bg-white shadow">
  <div class="flex items-center gap-2">
    <img src="${logo}" class="h-8"/>
    <span>${escapeHtml(branding.brandName)}</span>
  </div>
</header>

<section class="text-center py-20 text-white"
style="background: linear-gradient(to right, var(--primary), var(--secondary))">

<h1 class="text-5xl font-bold">${escapeHtml(
    website.hero_title
  )}</h1>
<p class="mt-4">${escapeHtml(website.hero_subtitle)}</p>

<button class="mt-6 px-6 py-3 bg-white text-black rounded-xl">
${escapeHtml(website.call_to_action)}
</button>

<img src="${heroImage}" class="mx-auto mt-10 rounded-xl shadow"/>

</section>

<section class="grid md:grid-cols-3 gap-6 p-10 max-w-6xl mx-auto">
${featureItems}
</section>

</body>
</html>
`;
}