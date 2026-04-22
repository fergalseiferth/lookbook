import StyleSwipe from "@/components/StyleSwipe";

const LOOKS = [
  { id: "cm1", path: "/style-seed/cm1.svg", tags: ["minimal", "white", "neutral", "slim"], label: "Clean white tee + slim trousers" },
  { id: "cm2", path: "/style-seed/cm2.svg", tags: ["minimal", "grey", "monochrome", "relaxed"], label: "Grey monochrome layers" },
  { id: "cm3", path: "/style-seed/cm3.svg", tags: ["minimal", "black", "slim", "structured"], label: "Black & structured" },
  { id: "cm4", path: "/style-seed/cm4.svg", tags: ["minimal", "navy", "neutral", "classic"], label: "Navy essentials" },
  { id: "wu1", path: "/style-seed/wu1.svg", tags: ["workwear", "olive", "utility", "chore-coat"], label: "Olive chore coat" },
  { id: "wu2", path: "/style-seed/wu2.svg", tags: ["earthy", "brown", "relaxed", "layered"], label: "Earthy layers" },
  { id: "wu3", path: "/style-seed/wu3.svg", tags: ["workwear", "khaki", "utility", "relaxed"], label: "Khaki utility" },
  { id: "wu4", path: "/style-seed/wu4.svg", tags: ["workwear", "beige", "cotton", "relaxed"], label: "Soft workwear" },
  { id: "sc1", path: "/style-seed/sc1.svg", tags: ["smart-casual", "navy", "chino", "loafer"], label: "Navy chinos + loafers" },
  { id: "sc2", path: "/style-seed/sc2.svg", tags: ["smart-casual", "camel", "trousers", "minimal"], label: "Camel trousers" },
  { id: "sc3", path: "/style-seed/sc3.svg", tags: ["smart-casual", "grey", "blazer", "minimal"], label: "Unstructured blazer" },
  { id: "sc4", path: "/style-seed/sc4.svg", tags: ["smart-casual", "cream", "linen", "relaxed"], label: "Cream linen set" },
  { id: "cp1", path: "/style-seed/cp1.svg", tags: ["coastal", "linen", "white", "summer"], label: "White linen coastal" },
  { id: "cp2", path: "/style-seed/cp2.svg", tags: ["coastal", "light blue", "preppy", "summer"], label: "Light blue preppy" },
  { id: "cp3", path: "/style-seed/cp3.svg", tags: ["preppy", "stripe", "navy", "classic"], label: "Breton stripe classic" },
  { id: "ce1", path: "/style-seed/ce1.svg", tags: ["city", "black", "structured", "minimalist"], label: "All black city" },
  { id: "ce2", path: "/style-seed/ce2.svg", tags: ["city", "charcoal", "slim", "minimal"], label: "Charcoal minimal" },
  { id: "vn1", path: "/style-seed/vn1.svg", tags: ["vintage", "brown", "leather", "relaxed"], label: "Brown leather vintage" },
  { id: "vn2", path: "/style-seed/vn2.svg", tags: ["vintage", "check", "relaxed", "classic"], label: "Classic check" },
  { id: "at1", path: "/style-seed/at1.svg", tags: ["athletic", "grey", "jogger", "casual"], label: "Athletic casual" },
  { id: "at2", path: "/style-seed/at2.svg", tags: ["streetwear", "oversized", "neutral", "casual"], label: "Oversized streetwear" },
  { id: "er1", path: "/style-seed/er1.svg", tags: ["earthy", "rust", "terracotta", "relaxed"], label: "Rust earthy tones" },
  { id: "er2", path: "/style-seed/er2.svg", tags: ["earthy", "olive", "brown", "layered"], label: "Olive + brown layers" },
  { id: "er3", path: "/style-seed/er3.svg", tags: ["earthy", "tan", "camel", "minimal"], label: "Camel earth tones" },
];

export default function StylePage() {
  return (
    <div>
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-medium text-stone-900 dark:text-stone-100">Style profile</h1>
        <p className="text-sm text-stone-400 mt-1.5">
          Swipe through these looks. Love it ♥ or not for you ✕.
        </p>
        <p className="text-xs text-stone-300 dark:text-stone-600 mt-1">
          Note: placeholder images — add your own to /public/style-seed/
        </p>
      </div>
      <StyleSwipe looks={LOOKS} />
    </div>
  );
}
