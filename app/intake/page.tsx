"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
  const [autoMode, setAutoMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Synchronous mirrors so async loops always see the latest state
  const queueRef = useRef<QueueItem[]>([]);
  const autoModeRef = useRef(false);
  const workerRunningRef = useRef(false);

  const setQueueAndRef = useCallback(
    (updater: (prev: QueueItem[]) => QueueItem[]) => {
      setQueue((prev) => {
        const next = updater(prev);
        queueRef.current = next;
        return next;
      });
    },
    []
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<QueueItem>) => {
      setQueueAndRef((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
      );
    },
    [setQueueAndRef]
  );

  const syncAutoMode = (val: boolean) => {
    autoModeRef.current = val;
    setAutoMode(val);
    // If switching ON during a session, kick the worker to process any pending items
    if (val) startWorker();
  };

  // Process a single item end-to-end (tag + optionally save)
  const processOne = useCallback(
    async (id: string) => {
      const item = queueRef.current.find((i) => i.id === id);
      if (!item || item.status !== "pending") return;

      updateItem(id, { status: "analyzing" });

      try {
        const formData = new FormData();
        formData.append("image", item.file);
        const res = await fetch("/api/tag", { method: "POST", body: formData });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error ?? `Tagging failed (${res.status})`);
        }
        const data = await res.json();
        data.seasons = Array.isArray(data.seasons) ? data.seasons : [];
        data.styleTags = Array.isArray(data.styleTags) ? data.styleTags : [];
        data.formality = Number(data.formality) || 3;

        if (autoModeRef.current) {
          const saveForm = new FormData();
          saveForm.append("image", item.file);
          saveForm.append("tags", JSON.stringify(data));
          const saveRes = await fetch("/api/items", {
            method: "POST",
            body: saveForm,
          });
          if (!saveRes.ok) throw new Error("Save failed");
          updateItem(id, { status: "saved", tags: data, originalTags: data });
        } else {
          updateItem(id, { status: "ready", tags: data, originalTags: data });
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed";
        updateItem(id, { status: "error", error: msg });
      }
    },
    [updateItem]
  );

  // Worker loop: drains pending items one at a time. Re-entrant-safe via workerRunningRef.
  const startWorker = useCallback(async () => {
    if (workerRunningRef.current) return;
    workerRunningRef.current = true;
    try {
      // Loop until no pending items remain
      // (auto-mode also drains; manual mode pre-tags everything)
      while (true) {
        const pending = queueRef.current.find((i) => i.status === "pending");
        if (!pending) break;
        await processOne(pending.id);
        // Small gap between calls to avoid hammering Claude
        await new Promise((r) => setTimeout(r, 250));
      }
    } finally {
      workerRunningRef.current = false;
    }
  }, [processOne]);

  const addFiles = useCallback(
    (files: File[]) => {
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) return;

      const wasEmpty = queueRef.current.length === 0;

      const newItems: QueueItem[] = imageFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        imageUrl: URL.createObjectURL(file),
        status: "pending" as const,
      }));

      setQueueAndRef((prev) => [...prev, ...newItems]);

      if (wasEmpty) {
        setCurrentIdx(0);
      }
      // Always (re)start the worker — no-op if already running
      startWorker();
    },
    [setQueueAndRef, startWorker]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleSave = async (finalTags: Tags, imageFile: File) => {
    const item = queueRef.current[currentIdx];
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
      setCurrentIdx((prev) => prev + 1);
    }
    setSaving(false);
  };

  const handleSkip = () => {
    const item = queueRef.current[currentIdx];
    if (item) updateItem(item.id, { status: "skipped" });
    setCurrentIdx((prev) => prev + 1);
  };

  const handleReanalyze = () => {
    const item = queueRef.current[currentIdx];
    if (!item) return;
    updateItem(item.id, { status: "pending", error: undefined });
    startWorker();
  };

  const reset = () => {
    setQueueAndRef(() => []);
    setCurrentIdx(0);
    autoModeRef.current = false;
    setAutoMode(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // In auto mode, advance currentIdx as items complete so progress UI tracks
  useEffect(() => {
    if (!autoMode) return;
    const finished = queue.filter(
      (i) =>
        i.status === "saved" || i.status === "skipped" || i.status === "error"
    ).length;
    if (finished !== currentIdx) setCurrentIdx(finished);
  }, [queue, autoMode, currentIdx]);

  const savedCount = queue.filter((i) => i.status === "saved").length;
  const skippedCount = queue.filter((i) => i.status === "skipped").length;
  const errorCount = queue.filter((i) => i.status === "error").length;
  const doneCount = savedCount + skippedCount + errorCount;
  const analyzingCount = queue.filter((i) => i.status === "analyzing").length;
  const allDone = queue.length > 0 && doneCount >= queue.length;
  const currentItem = queue[currentIdx];

  // ── Empty state ───────────────────────────────────────────────────────────
  if (queue.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-medium text-stone-900 dark:text-stone-100">Add items</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            Drop all your photos — Claude tags each one automatically
          </p>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 mb-4">
          <div>
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
              {autoMode ? "Auto-save mode" : "Review mode"}
            </p>
            <p className="text-xs text-stone-400 mt-0.5">
              {autoMode
                ? "Claude saves everything automatically — come back when done"
                : "Review and edit each item before saving"}
            </p>
          </div>
          <button
            onClick={() => syncAutoMode(!autoMode)}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
              autoMode ? "bg-stone-900 dark:bg-stone-100" : "bg-stone-200 dark:bg-stone-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white dark:bg-stone-900 shadow transition-transform ${
                autoMode ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
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
          <p className="font-medium text-stone-700 dark:text-stone-300 text-lg">
            Drop all your wardrobe photos here
          </p>
          <p className="text-sm text-stone-400 mt-1">
            or click to select — pick all photos at once
          </p>
          <p className="text-xs text-stone-300 dark:text-stone-600 mt-3">JPEG · PNG · WEBP</p>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
      </div>
    );
  }

  // ── All done ──────────────────────────────────────────────────────────────
  if (allDone) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">✓</div>
        <p className="text-2xl font-medium text-stone-900 dark:text-stone-100">All done</p>
        <p className="text-stone-400 mt-2">
          {savedCount} saved
          {skippedCount > 0 ? ` · ${skippedCount} skipped` : ""}
          {errorCount > 0 ? ` · ${errorCount} failed` : ""}
        </p>
        {errorCount > 0 && (
          <div className="mt-4 max-w-md mx-auto text-left">
            <p className="text-xs font-medium text-stone-500 mb-2">Errors:</p>
            <ul className="text-xs text-stone-400 space-y-1">
              {queue.filter(i => i.status === "error").slice(0, 5).map(i => (
                <li key={i.id} className="truncate">• {i.error}</li>
              ))}
            </ul>
          </div>
        )}
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

  // ── Auto-save progress ────────────────────────────────────────────────────
  if (autoMode) {
    return (
      <div>
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-medium text-stone-900 dark:text-stone-100">
              Auto-saving…
            </h1>
            <p className="text-sm text-stone-400 mt-0.5">
              {savedCount} of {queue.length} saved
              {analyzingCount > 0 ? " · analyzing…" : ""}
              {errorCount > 0 ? ` · ${errorCount} failed` : ""}
            </p>
          </div>
          <button
            onClick={() => syncAutoMode(false)}
            className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-xs text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            Pause & review
          </button>
        </div>

        <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-stone-900 dark:bg-stone-100 rounded-full transition-all duration-500"
            style={{ width: `${queue.length > 0 ? (savedCount / queue.length) * 100 : 0}%` }}
          />
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5">
          {queue.map((item) => (
            <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800">
              <Image src={item.imageUrl} alt="" fill className="object-cover" />
              {item.status === "saved" && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <span className="text-white text-lg font-medium">✓</span>
                </div>
              )}
              {item.status === "analyzing" && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {item.status === "error" && (
                <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center" title={item.error}>
                  <span className="text-white text-sm">✕</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {errorCount > 0 && (
          <div className="mt-4 text-xs text-stone-400 text-center">
            <p>{errorCount} failed:</p>
            <ul className="mt-1 space-y-0.5 inline-block text-left">
              {queue.filter(i => i.status === "error").slice(0, 3).map(i => (
                <li key={i.id} className="text-red-400">• {i.error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // ── Manual review ─────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-stone-700 dark:text-stone-300">
            {currentIdx + 1} of {queue.length}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-stone-400">
              {savedCount} saved{skippedCount > 0 ? ` · ${skippedCount} skipped` : ""}
            </span>
            <button
              onClick={() => syncAutoMode(true)}
              className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 underline underline-offset-2 transition-colors"
            >
              Auto-save rest
            </button>
          </div>
        </div>
        <div className="h-1 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-stone-900 dark:bg-stone-100 rounded-full transition-all duration-300"
            style={{ width: `${queue.length > 0 ? (doneCount / queue.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {queue.map((item, i) => (
          <button
            key={item.id}
            onClick={() => {
              if (i < currentIdx) setCurrentIdx(i);
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
            {item.status === "analyzing" && i !== currentIdx && (
              <div className="absolute bottom-1 right-1 w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" />
            )}
            {item.status === "error" && (
              <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center">
                <span className="text-white text-xs">!</span>
              </div>
            )}
          </button>
        ))}
      </div>

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
          <p className="text-sm text-red-400 mb-6 max-w-md mx-auto break-words">{currentItem.error}</p>
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
