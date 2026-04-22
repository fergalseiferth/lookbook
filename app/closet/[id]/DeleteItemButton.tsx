"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteItemButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async () => {
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    router.push("/closet");
  };

  if (confirming) {
    return (
      <div className="flex gap-2 flex-1">
        <button
          onClick={() => setConfirming(false)}
          className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-sm text-stone-500"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium"
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex-1 py-2.5 rounded-xl border border-red-200 dark:border-red-900 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
    >
      Remove
    </button>
  );
}
