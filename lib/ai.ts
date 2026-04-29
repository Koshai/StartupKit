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
- call_to_action must be 2 to 4 words
- call_to_action must be action-driven (verb-led)
- avoid generic phrases like "Learn more"

Good call_to_action examples:
- Shop Now
- Get Started
- Visit Today
- Try It Now

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

export function generateCTA(input: string, businessType?: string): string {
  const text = `${businessType ?? ""} ${input}`.toLowerCase();

  if (
    text.includes("shop") ||
    text.includes("store") ||
    text.includes("product")
  ) {
    return "Shop Now";
  }
  if (
    text.includes("app") ||
    text.includes("platform") ||
    text.includes("software")
  ) {
    return "Get Started";
  }
  if (text.includes("service") || text.includes("booking")) {
    return "Book Now";
  }
  return "Learn More";
}

export function generateWebsiteHTML(
  website: WebsiteResult,
  branding: {
    brandName: string;
    layout?: "centered" | "split";
    logo?: string;
    heroImage?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    socials?: {
      twitter?: string;
      linkedin?: string;
      instagram?: string;
      facebook?: string;
    };
    contactEmail?: string;
  }
): string {
  const logo = branding.logo || "https://via.placeholder.com/120x40";
  const heroImage =
    branding.heroImage || "https://via.placeholder.com/800x400";
  const primary = branding.primaryColor || "#4F46E5";
  const secondary = branding.secondaryColor || "#9333EA";
  const accent = branding.accentColor || "#f59e0b";
  const twitter = branding.socials?.twitter?.trim() || "#";
  const linkedin = branding.socials?.linkedin?.trim() || "#";
  const instagram = branding.socials?.instagram?.trim() || "#";
  const facebook = branding.socials?.facebook?.trim() || "#";
  const contactEmail = branding.contactEmail?.trim() || "hello@yourstartup.com";
  const layout = branding.layout === "split" ? "split" : "centered";
  const socialLinks = [
    twitter !== "#"
      ? `<a href="${escapeHtml(twitter)}" target="_blank"><i class="fab fa-twitter"></i></a>`
      : "",
    linkedin !== "#"
      ? `<a href="${escapeHtml(linkedin)}" target="_blank"><i class="fab fa-linkedin"></i></a>`
      : "",
    instagram !== "#"
      ? `<a href="${escapeHtml(instagram)}" target="_blank"><i class="fab fa-instagram"></i></a>`
      : "",
    facebook !== "#"
      ? `<a href="${escapeHtml(facebook)}" target="_blank"><i class="fab fa-facebook"></i></a>`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  const socialSection = socialLinks
    ? `<section class="text-center py-10">
  <div class="flex justify-center gap-8 text-xl">
${socialLinks}
  </div>
</section>`
    : "";

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
  const heroSection =
    layout === "split"
      ? `<section class="px-6 py-16 md:px-10 md:py-20 text-white"
style="background: linear-gradient(to right, var(--primary), var(--secondary))">
  <div class="mx-auto grid max-w-6xl grid-cols-1 gap-10 md:grid-cols-2 md:items-center">
    <div class="text-center md:text-left">
      <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold">${escapeHtml(
        website.hero_title
      )}</h1>
      <p class="mt-4 text-base md:text-lg">${escapeHtml(website.hero_subtitle)}</p>
      <button class="mt-6 px-6 py-3 bg-white text-black rounded-xl hover:scale-105 transition cta-btn">
${escapeHtml(website.call_to_action)}
      </button>
    </div>
    <div class="flex justify-center md:justify-end">
      <img src="${heroImage}" class="w-full max-w-xl rounded-xl shadow object-cover"/>
    </div>
  </div>
</section>`
      : `<section class="text-center py-20 text-white"
style="background: linear-gradient(to right, var(--primary), var(--secondary))">

<h1 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold">${escapeHtml(
          website.hero_title
        )}</h1>
<p class="mt-4">${escapeHtml(website.hero_subtitle)}</p>

<button class="mt-6 px-6 py-3 bg-white text-black rounded-xl hover:scale-105 transition cta-btn">
${escapeHtml(website.call_to_action)}
</button>

<img src="${heroImage}" class="mx-auto mt-10 rounded-xl shadow"/>

</section>`;

  return `
<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
<meta charset="UTF-8" />
<script src="https://cdn.tailwindcss.com"></script>
<style>
:root {
  --primary: ${primary};
  --secondary: ${secondary};
  --accent: ${accent};
}
.accent-link { color: var(--accent); }
.accent-highlight { border-bottom: 2px solid var(--accent); }
.cta-btn { transition: background-color .2s ease, color .2s ease, transform .2s ease; }
.cta-btn:hover { background-color: var(--accent) !important; color: #fff !important; }
</style>
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
</head>

<body class="bg-gray-50">

<header class="flex items-center justify-between px-6 md:px-10 py-4 bg-white shadow sticky top-0 z-50">

  <div class="flex items-center gap-3">
    <img src="${logo}" class="h-8"/>
    <span class="font-semibold text-lg">${escapeHtml(branding.brandName)}</span>
  </div>

  <!-- NAV LINKS -->
  <nav class="hidden md:flex gap-6 text-sm font-medium">
    <a href="#features" class="hover:text-gray-600 accent-link">Features</a>
    <a href="#contact" class="hover:text-gray-600 accent-link">Contact</a>
  </nav>

  <!-- CTA -->
  <button class="px-4 py-2 rounded-lg text-white cta-btn"
    style="background-color: var(--primary)">
    ${escapeHtml(website.call_to_action)}
  </button>

</header>

${heroSection}

<section id="features" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 px-6 py-12 md:px-10 md:py-20 max-w-6xl mx-auto">
${featureItems}
</section>

${socialSection}

<section id="contact" class="max-w-3xl mx-auto px-6 py-20">
  <h2 class="text-3xl font-bold text-center mb-8 accent-highlight">Contact Us</h2>
  <p class="text-center text-gray-600 mb-6">
    Contact us at: ${escapeHtml(contactEmail)}
  </p>

  <form class="space-y-4">
    <input 
      type="text" 
      placeholder="Your name"
      class="w-full border rounded-lg p-3"
    />

    <input 
      type="email" 
      placeholder="Your email"
      class="w-full border rounded-lg p-3"
    />

    <textarea 
      placeholder="Your message"
      rows="4"
      class="w-full border rounded-lg p-3"
    ></textarea>

    <button 
      type="submit"
      class="w-full py-3 rounded-xl text-white cta-btn"
      style="background-color: var(--primary)"
    >
      Send Message
    </button>
  </form>
</section>

</body>
</html>
`;
}

export function generatePosterHTML(
  style: "promo" | "minimal" | "feature",
  data: {
    brandName: string;
    tagline: string;
    value_proposition: string;
    call_to_action: string;
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
    qrCodeDataUrl?: string;
    benefits?: string[];
  }
): string {
  const primary = data.primaryColor.trim() || "#4F46E5";
  const secondary = data.secondaryColor.trim() || "#9333EA";
  const logo = data.logo?.trim();
  const logoMarkup = logo
    ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(
        data.brandName
      )} logo" style="height: 40px; width: auto; object-fit: contain; flex-shrink: 0;" />`
    : "";
  const qrCodeMarkup = data.qrCodeDataUrl
    ? `<div style="
      position: absolute;
      right: 24px;
      bottom: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      background: white;
      border-radius: 12px;
      padding: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
    ">
      <img src="${escapeHtml(data.qrCodeDataUrl)}" alt="QR code" style="width: 100px; height: 100px; display: block;" />
      <span style="font-size: 12px; font-weight: 700; color: #111827; line-height: 1;">Scan Me</span>
    </div>`
    : "";
  const benefits = (data.benefits ?? [])
    .map((benefit) => benefit.trim())
    .filter(Boolean)
    .slice(0, 2);
  const featureBenefitsMarkup = benefits.length
    ? `<ul style="
      margin: 0;
      padding-left: 1.2em;
      font-size: 22px;
      line-height: 1.35;
      text-align: left;
      max-width: 100%;
      align-self: center;
    ">
      ${benefits
        .map(
          (benefit) =>
            `<li style="margin: 8px 0; overflow-wrap: break-word; word-break: break-word;">${escapeHtml(
              benefit
            )}</li>`
        )
        .join("")}
    </ul>`
    : "";

  const promoContent = `
    <div style="
      display: flex;
      flex-direction: column;
      gap: 20px;
      justify-content: center;
      align-items: center;
      height: 100%;
      max-width: 600px;
      width: 100%;
      margin: 0 auto;
      text-align: center;
      overflow: hidden;
    ">
      <h1 style="
        margin: 0;
        font-size: clamp(34px, 6vw, 56px);
        line-height: 1.04;
        font-weight: 800;
        letter-spacing: -0.03em;
        overflow-wrap: break-word;
        word-break: break-word;
        max-width: 100%;
      ">
        ${escapeHtml(data.tagline)}
      </h1>

      <p style="
        margin: 0;
        font-size: clamp(20px, 2.8vw, 22px);
        line-height: 1.28;
        max-width: 100%;
        opacity: 0.96;
        overflow-wrap: break-word;
        word-break: break-word;
      ">
        ${escapeHtml(data.value_proposition)}
      </p>
    </div>
    <div style="
      display: flex;
      justify-content: center;
      align-items: end;
      width: 100%;
    ">
      <div style="
        background: white;
        color: #111827;
        border-radius: 18px;
        padding: 18px 30px;
        font-size: 24px;
        font-weight: 800;
        line-height: 1.15;
        text-align: center;
        max-width: 100%;
        overflow-wrap: anywhere;
      ">
        ${escapeHtml(data.call_to_action)}
      </div>
    </div>`;

  const minimalContent = `
    <div style="
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      max-width: 600px;
      width: 100%;
      margin: 0 auto;
      text-align: center;
      overflow: hidden;
    ">
      <h1 style="
        margin: 0;
        font-size: clamp(44px, 7.5vw, 72px);
        line-height: 1.06;
        font-weight: 800;
        letter-spacing: -0.03em;
        overflow-wrap: break-word;
        word-break: break-word;
        max-width: 100%;
      ">
        ${escapeHtml(data.tagline)}
      </h1>
    </div>
    <div style="width: 100%; height: 1px;"></div>`;

  const featureContent = `
    <div style="
      display: flex;
      flex-direction: column;
      gap: 16px;
      justify-content: center;
      align-items: center;
      height: 100%;
      max-width: 600px;
      width: 100%;
      margin: 0 auto;
      text-align: center;
      overflow: hidden;
    ">
      <h1 style="
        margin: 0;
        font-size: clamp(36px, 6.5vw, 58px);
        line-height: 1.06;
        font-weight: 800;
        letter-spacing: -0.03em;
        overflow-wrap: break-word;
        word-break: break-word;
        max-width: 100%;
      ">
        ${escapeHtml(data.tagline)}
      </h1>
      ${featureBenefitsMarkup}
    </div>
    <div style="
      display: flex;
      justify-content: center;
      align-items: end;
      width: 100%;
    ">
      <div style="
        background: white;
        color: #111827;
        border-radius: 18px;
        padding: 18px 30px;
        font-size: 24px;
        font-weight: 800;
        line-height: 1.15;
        text-align: center;
        max-width: 100%;
        overflow-wrap: anywhere;
      ">
        ${escapeHtml(data.call_to_action)}
      </div>
    </div>`;

  const styleContent =
    style === "minimal"
      ? minimalContent
      : style === "feature"
        ? featureContent
        : promoContent;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(data.brandName)} Poster</title>
  <style>
    :root {
      --primary: ${escapeHtml(primary)};
      --secondary: ${escapeHtml(secondary)};
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
    }
    html,
    body {
      margin: 0;
      background: white;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 210mm;
      height: 297mm;
      min-height: 297mm;
      padding: 0;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div style="
    width: 210mm;
    height: 297mm;
    display: grid;
    grid-template-rows: auto 1fr auto;
    background: linear-gradient(to bottom, var(--primary), var(--secondary));
    color: white;
    font-family: sans-serif;
    padding: 48px;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
  ">
    <div style="
      display: flex;
      align-items: center;
      gap: 14px;
      align-self: start;
      max-width: 100%;
      overflow: hidden;
    ">
      ${logoMarkup}
      <span style="
        font-size: 20px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        opacity: 0.95;
        overflow-wrap: anywhere;
        word-break: break-word;
      ">
        ${escapeHtml(data.brandName)}
      </span>
    </div>
    ${styleContent}
    ${qrCodeMarkup}
  </div>
</body>
</html>`;
}