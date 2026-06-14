import { notFound } from "next/navigation";
import {
  getBlock1View,
  getBlock2View,
  getBlock3View,
} from "@/features/questionnaire/lib/manifest";
import { PreviewSheet } from "@/features/questionnaire/components/PreviewSheet";

export const dynamic = "force-dynamic";

// Page de calage cadrage photos — dev uniquement, jamais en prod.
export default function QuestionnairePreviewPage({
  searchParams,
}: {
  searchParams: { duels?: string; quiz?: string; block1?: string };
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const duelKeys = searchParams.duels?.split(",").filter(Boolean);
  const quizKeys = searchParams.quiz?.split(",").filter(Boolean);
  const b1Keys = searchParams.block1?.split(",").filter(Boolean);

  const block1 = b1Keys
    ? getBlock1View().filter((q) => b1Keys.includes(q.key))
    : [];
  let block2 = getBlock2View();
  let block3 = getBlock3View();
  if (duelKeys || quizKeys || b1Keys) {
    block2 = duelKeys ? block2.filter((d) => duelKeys.includes(d.key)) : [];
    block3 = quizKeys ? block3.filter((q) => quizKeys.includes(q.key)) : [];
  }

  return <PreviewSheet block1={block1} block2={block2} block3={block3} />;
}
