import { notFound } from "next/navigation";
import {
  getBlock2View,
  getBlock3View,
} from "@/features/questionnaire/lib/manifest";
import { PreviewSheet } from "@/features/questionnaire/components/PreviewSheet";

export const dynamic = "force-dynamic";

// Page de calage cadrage photos — dev uniquement, jamais en prod.
export default function QuestionnairePreviewPage({
  searchParams,
}: {
  searchParams: { duels?: string; quiz?: string };
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const duelKeys = searchParams.duels?.split(",").filter(Boolean);
  const quizKeys = searchParams.quiz?.split(",").filter(Boolean);

  let block2 = getBlock2View();
  let block3 = getBlock3View();
  if (duelKeys || quizKeys) {
    block2 = duelKeys ? block2.filter((d) => duelKeys.includes(d.key)) : [];
    block3 = quizKeys ? block3.filter((q) => quizKeys.includes(q.key)) : [];
  }

  return <PreviewSheet block2={block2} block3={block3} />;
}
