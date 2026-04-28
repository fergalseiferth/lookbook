import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

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
  "styleTags": ["2-4 style descriptors from: minimal | classic | preppy | workwear | streetwear | earthy | coastal | smart-casual | vintage | athletic | bohemian | utility"]
}`;

export async function tagClothingItem(
  base64Image: string,
  mediaType: string,
  corrections: Correction[] = []
) {
  const fewShot = buildFewShotBlock(corrections);

  // BASE_PROMPT goes in system with cache_control so it's cached across the
  // bulk intake session — only the image (and optional few-shot) vary per call.
  const userContent: MessageParam["content"] = [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: base64Image,
      },
    },
  ];
  if (fewShot) {
    userContent.push({ type: "text", text: fewShot });
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: BASE_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userContent }],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
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
