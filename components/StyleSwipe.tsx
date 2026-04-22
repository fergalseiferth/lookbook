"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Look = {
  id: string;
  path: string;
  tags: string[];
  label?: string;
};

type Props = {
  looks: Look[];
};

export default function StyleSwipe({ looks }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<Look[]>([]);
  const [disliked, setDisliked] = useState<Look[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  const current = looks[index];

  const swipe = useCallback((like: boolean) => {
    if (!current) return;
    setDirection(like ? "right" : "left");

    setTimeout(() => {
      if (like) {
        setLiked((prev) => [...prev, current]);
      } else {
        setDisliked((prev) => [...prev, current]);
      }
      setDirection(null);

      if (index + 1 >= looks.length) {
        setDone(true);
      } else {
        setIndex((i) => i + 1);
      }
    }, 200);
  }, [current, index, looks.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (done || submitting) return;
      if (e.key === "ArrowRight") swipe(true);
      if (e.key === "ArrowLeft") swipe(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [done, submitting, swipe]);

  const handleSubmit = async () => {
    setSubmitting(true);
    const likedTags = liked.flatMap((l) => l.tags);
    const dislikedTags = disliked.flatMap((l) => l.tags);
    const likedLooks = liked.map((l) => l.path);

    await fetch("/api/style", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ likedTags, dislikedTags, likedLooks }),
    });

    router.push("/style/result");
  };

  if (done) {
    return (
      <div className="max-w-sm mx-auto text-center py-12">
        <p className="text-3xl mb-4">Done</p>
        <p className="text-stone-500 mb-2">You liked {liked.length} looks.</p>
        <p className="text-stone-400 text-sm mb-8">
          Claude will now analyze your preferences and build your style profile.
        </p>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 rounded-2xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-medium text-lg hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50"
        >
          {submitting ? "Analyzing…" : "Build my style profile →"}
        </button>
        {liked.length === 0 && (
          <p className="mt-4 text-xs text-stone-400">
            You didn&apos;t like any looks — try swiping again for better results.
          </p>
        )}
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="max-w-sm mx-auto select-none">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-stone-400 mb-1.5">
          <span>{index + 1} of {looks.length}</span>
          <span>{liked.length} liked</span>
        </div>
        <div className="h-0.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-stone-400 dark:bg-stone-500 transition-all duration-300"
            style={{ width: `${((index) / looks.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        className={`aspect-[3/4] relative rounded-3xl overflow-hidden bg-stone-100 dark:bg-stone-800 transition-all duration-200 ${
          direction === "right"
            ? "translate-x-8 rotate-3 opacity-60"
            : direction === "left"
            ? "-translate-x-8 -rotate-3 opacity-60"
            : ""
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.path}
          alt={current.label ?? `Look ${index + 1}`}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {current.label && (
          <div className="absolute bottom-4 left-4 right-4">
            <span className="text-white/80 text-sm bg-black/30 backdrop-blur-sm rounded-full px-3 py-1">
              {current.label}
            </span>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={() => swipe(false)}
          className="flex-1 py-4 rounded-2xl border-2 border-stone-200 dark:border-stone-700 text-stone-400 hover:border-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-all text-xl font-light"
          aria-label="Not for me (←)"
        >
          ✕
        </button>
        <button
          onClick={() => swipe(true)}
          className="flex-1 py-4 rounded-2xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200 transition-all text-xl font-light"
          aria-label="Love it (→)"
        >
          ♥
        </button>
      </div>
      <p className="text-center text-xs text-stone-400 mt-3">← → keyboard shortcuts</p>
    </div>
  );
}
