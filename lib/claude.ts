import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type Correction = {
  category: string;
  subcategory: string | null;
  field: string;
  original: string;
  corrected: string;
};

function buildFewShotBlock(corrections: Correction[]): string {
  if (corrections.length === 0) return "";

  const lines = corrections.map(
    (c) =>
      `- ${c.category}${c.subcategory ? ` (${c.subcategory})` : ""}: "${c.field}" was "${c.original}" → corrected to "${c.corrected}"`
  );

  return `\nPast corrections to learn from — apply these patterns to similar items:
${lines.join("\n")}\n`;
}

const BASE_PROMPT = `Analyze this clothing item and return ONLY a JSON object with no preamble or markdown. Be precise and literal — do not guess or over-infer.

{
  "name": "short descriptive name e.g. 'White oxford shirt'",
  "category": "one of: tops | bottoms | outerwear | shoes | accessories",
  "subcategory": "specific type e.g. 'oxford shirt' | 'chino trouser' | 'chelsea boot' | 'crewneck sweatshirt'",
  "primaryColor": "most dominant color as a simple label e.g. 'navy' | 'off-white' | 'camel' | 'olive' | 'black'",
  "primaryColorHex": "best estimate hex code for the dominant color e.g. '#1a2a4a'",
  "secondaryColor": "second color if clearly present, else null — for two-tone fabrics like herringbone or tweed, name the threading color",
  "pattern": "one of: solid | stripe | check | plaid | herringbone | floral | graphic | textured | other — use 'herringbone' for diagonal tweed/weave patterns",
  "fabric": "best estimate: cotton | linen | wool | denim | leather | suede | cashmere | synthetic | knit | other",
  "fit": "one of: slim | regular | relaxed | oversized — assess from the garment shape",
  "formality": "integer 1-5. Guide: 1=gym/lounge wear, 2=quality leather sneakers (e.g. Nike Blazers) or very casual tops, 3=chinos/smart trousers/overshirts/henleys, 4=blazers/dress shirts/chelsea boots, 5=suits/formal shoes",
  "seasons": ["array of applicable seasons: spring | summer | fall | winter"],
  "styleTags": ["2-4 style descriptors from: minimal | classic | preppy | workwear | streetwear | earthy | coastal | smart-casual | vintage | athletic | bohemian | utility"],
  "role": "one of: foundation | layer | statement | standalone. foundation=plain tees/tanks/basics worn as a base; layer=cardigans/overshirts/jackets worn open over something; statement=bold pattern or color piece that anchors the look; standalone=complete piece that needs no layering",
  "silhouetteWidth": "one of: fitted | straight | relaxed | wide — how the garment sits on the body regardless of formality. fitted=close to body, straight=clean column, relaxed=slightly roomy, wide=deliberately oversized volume",
  "stylingNote": "one sentence of practical styling advice for this specific piece e.g. 'Wear open over a white tee with straight-leg trousers and loafers' or 'Best as a base layer — tuck into high-waisted trousers for a clean line'"
}`;

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Could not parse JSON from response: ${cleaned.slice(0, 200)}`);
  }
}

async function callWithRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      // Don't retry on 4xx (auth, bad input, etc) — only on transient/server errors
      if (status && status >= 400 && status < 500) throw err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  }
  throw lastErr;
}

export async function tagClothingItem(
  base64Image: string,
  mediaType: string,
  corrections: Correction[] = []
) {
  const fewShot = buildFewShotBlock(corrections);
  const prompt = fewShot ? `${fewShot}\n${BASE_PROMPT}` : BASE_PROMPT;

  const response = await callWithRetry(() =>
    client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: base64Image,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    })
  );

  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  return extractJson(text);
}

const ENRICH_PROMPT = `Look at this clothing item and return ONLY a JSON object — no preamble, no markdown.

{
  "role": "one of: foundation | layer | statement | standalone. foundation=plain tee/tank worn as base layer; layer=cardigan/overshirt/jacket worn open; statement=bold pattern or colour that anchors a look; standalone=complete piece needing no layering",
  "silhouetteWidth": "one of: fitted | straight | relaxed | wide — how the garment sits on the body",
  "stylingNote": "one practical sentence on how to wear this piece e.g. 'Wear open over a white tee with straight trousers and loafers'"
}`;

export async function enrichClothingItem(base64Image: string, mediaType: string): Promise<{
  role: string;
  silhouetteWidth: string;
  stylingNote: string;
}> {
  const response = await callWithRetry(() =>
    client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: base64Image } },
          { type: "text", text: ENRICH_PROMPT },
        ],
      }],
    })
  );
  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  return extractJson(text) as { role: string; silhouetteWidth: string; stylingNote: string };
}

export async function nameOutfit(
  items: Array<{
    name: string | null;
    primaryColor: string;
    styleTags: string;
    subcategory: string | null;
  }>,
  theme: string
): Promise<{ name: string; description: string; occasion: string }> {
  const itemSummary = items
    .map(
      (i) =>
        `${i.name ?? i.subcategory} (${i.primaryColor}, tags: ${i.styleTags})`
    )
    .join(", ");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `These clothing items form an outfit for the theme "${theme}": ${itemSummary}.

Give this outfit a short evocative name, a one-sentence description of the vibe, and a suggested occasion. Write like a fashion editor — grounded and personal, not aspirational marketing speak. Return ONLY JSON:
{"name": "...", "description": "...", "occasion": "..."}`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

export async function generateStyleProfile(
  likedTags: string[],
  dislikedTags: string[]
): Promise<{
  aesthetics: string[];
  colorPalette: string[];
  avoidColors: string[];
  formalityRange: { min: number; max: number };
  notes: string;
}> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Based on these liked aesthetic tags: ${likedTags.join(", ")} and disliked tags: ${dislikedTags.join(", ")}, create a style profile. Return ONLY JSON:
{
  "aesthetics": ["top 3-5 style labels that best describe this person"],
  "colorPalette": ["preferred color families e.g. neutrals, earth tones, navy"],
  "avoidColors": ["colors to de-prioritize"],
  "formalityRange": {"min": 1, "max": 5},
  "notes": "2-3 sentence plain English summary of their style"
}`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}
