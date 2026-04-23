"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import TagReview from "@/components/TagReview";
import Link from "next/link";

type Tags = {
  name?: string;
  category: string;
  subcategory?: string;
  primaryColor: string;
  primaryColorHex: string;
  secondaryColor?: string | null;
  pattern?: string;
  fabric?: string;
  fit?: string;
  formality: number;
  seasons: string[];
  styleTags: string[];
  notes?: string;
};

type Stage = "upload" | "analyzing" | "review" | "saved";

export default function IntakePage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [tags, setTags] = useState<Tags | null>(null);
  const [originalTags, setOriginalTags] = useState<Tags | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const analyzeImage = useCallback(async (f: File) => {
    setStage("analyzing");
    setError(null);

    const formData = new FormData();
    formData.append("image", f);

    try {
      const res = await fetch("/api/tag", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Tagging failed");
      }
      const data = await res.json();
      data.seasons = Array.isArray(data.seasons) ? data.seasons : [];
      data.styleTags = Array.isArray(data.styleTags) ? data.styleTags : [];
      data.formality = Number(data.formality) || 3;
      setTags(data);
      setOriginalTags(data);
      setStage("review");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not analyze the image";
      setError(`${msg}. Check your ANTHROPIC_API_KEY and account credits.`);
      setStage("upload");
    }
  }, []);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setImageUrl(URL.createObjectURL(f));
    analyzeImage(f);
  }, [analyzeImage]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSave = async (finalTags: Tags, imageFile: File) => {
    setSaving(true);
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("tags", JSON.stringify(finalTags));
    if (originalTags) {
      formData.append("originalTags", JSON.stringify(originalTags));
    }

    const res = await fetch("/api/items", { method: "POST", body: formData });
    if (res.ok) {
      setSavedCount((n) => n + 1);
      setStage("saved");
    }
    setSaving(false);
  };

  const reset = () => {
    setStage("upload");
    setFile(null);
    setImageUrl("");
    setTags(null);
    setOriginalTags(null);
    setError(null);
    // Reset file inputs so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium text-stone-900 dark:text-stone-100">Add item</h1>
          <p className="text-sm text-stone-400 mt-0.5">Photo → AI tags → review → save</p>
        </div>
        {savedCount > 0 && (
          <span className="text-sm text-stone-400">
            {savedCount} added this session
          </span>
        )}
      </div>

      {stage === "upload" && (
        <div>
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Camera button — prominent on mobile */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full mb-3 py-4 rounded-2xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium text-base flex items-center justify-center gap-2 hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors md:hidden"
          >
            <span className="text-xl">📷</span> Take photo
          </button>

          {/* Drop zone / browse */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-2xl p-12 text-center cursor-pointer hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-all"
          >
            <div className="text-4xl mb-3">🗂️</div>
            <p className="font-medium text-stone-700 dark:text-stone-300">
              Drop a photo here
            </p>
            <p className="text-sm text-stone-400 mt-1">or click to browse files</p>
            <p className="text-xs text-stone-300 dark:text-stone-600 mt-3">
              Flat-lay or hanger shot · JPEG, PNG, WEBP
            </p>
          </div>

          {/* Hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {/* Camera capture — environment-facing on mobile */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      )}

      {stage === "analyzing" && (
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          {imageUrl && (
            <div className="w-28 h-36 relative rounded-xl overflow-hidden shadow-sm">
              <Image src={imageUrl} alt="Analyzing" fill className="object-cover" />
            </div>
          )}
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-stone-900 dark:border-stone-100 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-stone-500">Analyzing with Claude…</p>
          </div>
        </div>
      )}

      {stage === "review" && tags && file && (
        <TagReview
          imageFile={file}
          imageUrl={imageUrl}
          initialTags={tags}
          onSave={handleSave}
          onReanalyze={() => analyzeImage(file)}
          saving={saving}
        />
      )}

      {stage === "saved" && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">✓</div>
          <p className="text-xl font-medium text-stone-900 dark:text-stone-100">
            Saved
          </p>
          <p className="text-sm text-stone-400 mt-1">
            {savedCount} item{savedCount !== 1 ? "s" : ""} added this session
          </p>
          <div className="flex gap-3 justify-center mt-8">
            <button
              onClick={reset}
              className="px-6 py-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
            >
              Add another
            </button>
            <Link
              href="/closet"
              className="px-6 py-3 rounded-xl border border-stone-200 dark:border-stone-700 text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              View closet
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
