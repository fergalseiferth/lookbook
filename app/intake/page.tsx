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

type QueueItem = {
  id: string;
  file: File;
  imageUrl: string;
  tags?: Tags;
  originalTags?: Tags;
  status: "pending" | "analyzing" | "ready" | "saved" | "skipped" | "error";
  error?: string;
};

export default function IntakePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Authoritative ref — always in sync with state, readable in async closures
  const queueRef = useRef<QueueItem[]>([]);
  const analyzingIds = useRef<Set<string>>(new Set());

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, ...patch } : item));
      queueRef.current = next;
      return next;
    });
  }, []);

  // analyzeItem reads from queueRef so it always sees fresh data, never a stale closure
  const analyzeItem = useCallback(async (id: string) => {
    if (analyzingIds.current.has(id)) return;
    const item = queueRef.current.find((i) => i.id === id);
    if (!item || item.status !== "pending") return;

    analyzingIds.current.add(id);
    updateItem(id, { status: "analyzing" });

    const formData = new FormData();
    formData.append("image", item.file);

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
      updateItem(id, { status: "ready", tags: data, originalTags: data });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      updateItem(id, { status: "error", error: msg });
    } finally {
      analyzingIds.current.delete(id);
    }
  }, [updateItem]);

  // Kick analysis for current + next item — reads queueRef so always fresh
  const kickAnalysis = useCallback((idx: number) => {
    const q = queueRef.current;
    [q[idx], q[idx + 1]].forEach((item) => {
      if (item && item.status === "pending") {
        analyzeItem(item.id);
      }
    });
  }, [analyzeItem]);

  const addFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    const newItems: QueueItem[] = imageFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      imageUrl: URL.createObjectURL(file),
      status: "pending" as const,
    }));

    setQueue((prev) => {
      const isFirstBatch = prev.length === 0;
      const next = [...prev, ...newItems];
      queueRef.current = next;
      // Kick after state flush
      const startIdx = isFirstBatch ? 0 : currentIdxRef.current;
      setTimeout(() => kickAnalysis(startIdx), 0);
      return next;
    });

    if (queueRef.current.length === 0) {
      setCurrentIdx(0);
      currentIdxRef.current = 0;
    }
  }, [kickAnalysis]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleSave = async (finalTags: Tags, imageFile: File) => {
    const item = queueRef.current[currentIdxRef.current];
    if (!item) return;

    setSaving(true);
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("tags", JSON.stringify(finalTags));
    if (item.originalTags) {
      formData.append("originalTags", JSON.stringify(item.originalTags));
    }

    const res = await fetch("/api/items", { method: "POST", body: formData });
    if (res.ok) {
      updateItem(item.id, { status: "saved" });
      advance();
    }
    setSaving(false);
  };

  const handleSkip = () => {
    const item = queueRef.current[currentIdxRef.current];
    if (item) updateItem(item.id, { status: "skipped" });
    advance();
  };

  // Ref to track currentIdx synchronously (needed inside setQueue updaters)
  const currentIdxRef = useRef(0);

  const advance = () => {
    setCurrentIdx((prev) => {
      const next = prev + 1;
      currentIdxRef.current = next;
      kickAnalysis(next);
      return next;
    });
  };

  const handleReanalyze = () => {
    const item = queueRef.current[currentIdxRef.current];
    if (!item) return;
    analyzingIds.current.delete(item.id);
    updateItem(item.id, { status: "pending" });
    setTimeout(() => analyzeItem(item.id), 0);
  };

  const reset = () => {
    setQueue([]);
    queueRef.current = [];
    setCurrentIdx(0);
    currentIdxRef.current = 0;
    analyzingIds.current.clear();
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const savedCount = queue.filter((i) => i.status === "saved").length;
  const skippedCount = queue.filter((i) => i.status === "skipped").length;
  const doneCount = savedCount + skippedCount + queue.filter((i) => i.status === "error").length;
  const allDone = queue.length > 0 && currentIdx >= queue.length;
  const currentItem = queue[currentIdx];

  // ── Empty state / drop zone ──────────────────────────────────────────────
  if (queue.length === 0) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-medium text-stone-900 dark:text-stone-100">Add items</h1>
          <p className="text-sm text-stone-400 mt-0.5">Drop all your photos at once — we&apos;ll work through them one by one</p>
        </div>

        <button
          onClick={() => cameraInputRef.current?.click()}
          className="w-full mb-3 py-4 rounded-2xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors md:hidden"
        >
          <span className="text-xl">📷</span> Take photo
        </button>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-2xl p-16 text-center cursor-pointer hover:border-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-all"
        >
          <div className="text-5xl mb-4">🗂️</div>
          <p className="font-medium text-stone-700 dark:text-stone-300 text-lg">Drop all your wardrobe photos here</p>
          <p className="text-sm text-stone-400 mt-1">or click to select — you can select multiple at once</p>
          <p className="text-xs text-stone-300 dark:text-stone-600 mt-3">JPEG · PNG · WEBP · any quantity</p>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
      </div>
    );
  }

  // ── All done ─────────────────────────────────────────────────────────────
  if (allDone) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">✓</div>
        <p className="text-2xl font-medium text-stone-900 dark:text-stone-100">All done</p>
        <p className="text-stone-400 mt-2">
          {savedCount} saved{skippedCount > 0 ? ` · ${skippedCount} skipped` : ""}{queue.filter(i => i.status === "error").length > 0 ? ` · ${queue.filter(i => i.status === "error").length} errored` : ""}
        </p>
        <div className="flex gap-3 justify-center mt-8">
          <button onClick={reset}
            className="px-6 py-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 transition-colors">
            Add more
          </button>
          <Link href="/closet"
            className="px-6 py-3 rounded-xl border border-stone-200 dark:border-stone-700 text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
            View closet →
          </Link>
        </div>
      </div>
    );
  }

  // ── Reviewing ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-stone-700 dark:text-stone-300">
            {currentIdx + 1} of {queue.length}
          </span>
          <span className="text-stone-400">
            {savedCount} saved{skippedCount > 0 ? ` · ${skippedCount} skipped` : ""}
          </span>
        </div>
        <div className="h-1 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-stone-900 dark:bg-stone-100 rounded-full transition-all duration-300"
            style={{ width: `${(doneCount / queue.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {queue.map((item, i) => (
          <button
            key={item.id}
            onClick={() => {
              if (i < currentIdx) {
                setCurrentIdx(i);
                currentIdxRef.current = i;
                kickAnalysis(i);
              }
            }}
            className={`relative flex-shrink-0 w-12 h-16 rounded-lg overflow-hidden border-2 transition-all ${
              i === currentIdx
                ? "border-stone-900 dark:border-stone-100"
                : i < currentIdx
                ? "border-transparent opacity-40 cursor-pointer"
                : "border-transparent opacity-30 cursor-default"
            }`}
          >
            <Image src={item.imageUrl} alt="" fill className="object-cover" />
            {item.status === "saved" && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
            {item.status === "skipped" && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <span className="text-white text-xs">–</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Current item */}
      {currentItem?.status === "analyzing" || currentItem?.status === "pending" ? (
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          <div className="w-32 h-40 relative rounded-xl overflow-hidden shadow-sm">
            <Image src={currentItem.imageUrl} alt="Analyzing" fill className="object-cover" />
          </div>
          <div className="flex items-center gap-2 text-stone-400">
            <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Analyzing with Claude…</span>
          </div>
        </div>
      ) : currentItem?.status === "error" ? (
        <div className="text-center py-12">
          <p className="text-stone-500 mb-1">Could not analyze this photo</p>
          <p className="text-sm text-red-400 mb-6">{currentItem.error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={handleReanalyze}
              className="px-5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
              Try again
            </button>
            <button onClick={handleSkip}
              className="px-5 py-2.5 rounded-xl text-sm text-stone-400 hover:text-stone-600 transition-colors">
              Skip
            </button>
          </div>
        </div>
      ) : currentItem?.status === "ready" && currentItem.tags ? (
        <TagReview
          imageFile={currentItem.file}
          imageUrl={currentItem.imageUrl}
          initialTags={currentItem.tags}
          onSave={handleSave}
          onReanalyze={handleReanalyze}
          saving={saving}
          onSkip={handleSkip}
          itemProgress={{ current: currentIdx + 1, total: queue.length }}
        />
      ) : null}
    </div>
  );
}
