import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { CategoryBadge } from "@/components/stories/CategoryBadge";
import { StoryRowActions } from "@/components/admin/StoryRowActions";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminStoriesPage() {
  const stories = await prisma.tourStory.findMany({
    orderBy: [{ publishedAt: { sort: "desc", nulls: "first" } }, { year: "asc" }],
  });

  const total = stories.length;
  const published = stories.filter((s) => s.publishedAt).length;
  const drafts = total - published;

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl uppercase tracking-wide">Histoires du Tour</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} histoires en base — <strong>{published}</strong> publiées,{" "}
          <strong>{drafts}</strong> brouillons.
        </p>
      </header>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5"></th>
              <th className="px-3 py-2.5">Titre</th>
              <th className="px-3 py-2.5">Catégorie</th>
              <th className="px-3 py-2.5">Année</th>
              <th className="px-3 py-2.5">Statut</th>
              <th className="px-3 py-2.5">Publié le</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stories.map((s) => {
              const isPublished = !!s.publishedAt;
              return (
                <tr key={s.id} className="border-t border-border align-middle">
                  <td className="px-3 py-2">
                    <div className="relative h-10 w-16 overflow-hidden rounded bg-muted">
                      {s.heroImageUrl && (
                        <Image
                          src={s.heroImageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-semibold leading-tight">{s.title}</div>
                    {s.subtitle && (
                      <div className="text-xs italic text-muted-foreground">{s.subtitle}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <CategoryBadge category={s.category} />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{s.year}</td>
                  <td className="px-3 py-2">
                    {isPublished ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                        Publiée
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                        Brouillon
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {formatDate(s.publishedAt)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      {isPublished && (
                        <Link
                          href={`/histoires/${s.slug}`}
                          target="_blank"
                          className="text-xs font-semibold text-secondary underline-offset-2 hover:underline"
                        >
                          Voir
                        </Link>
                      )}
                      <StoryRowActions
                        storyId={s.id}
                        title={s.title}
                        isPublished={isPublished}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
