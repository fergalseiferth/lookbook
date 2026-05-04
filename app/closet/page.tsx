import { prisma } from "@/lib/prisma";
import ClosetGrid from "@/components/ClosetGrid";
import RetagButton from "@/components/RetagButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClosetPage() {
  const items = await prisma.clothingItem.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  const pendingRetag = items.filter((i) => !i.role || !i.silhouetteWidth).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium text-stone-900 dark:text-stone-100">Closet</h1>
          <p className="text-sm text-stone-400 mt-0.5">{items.length} items</p>
        </div>
        <div className="flex items-center gap-4">
          {pendingRetag > 0 && <RetagButton pending={pendingRetag} />}
          <Link
            href="/intake"
            className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
          >
            + Add item
          </Link>
        </div>
      </div>
      <ClosetGrid items={items} />
    </div>
  );
}
