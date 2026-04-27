export type StoryCategory =
  | "duel"
  | "drame"
  | "exploit"
  | "anecdote"
  | "controverse"
  | "victoire"
  | "col"
  | "coureur"
  | "explication";

interface CategoryMeta {
  label: string;
  badgeBg: string;
  badgeText: string;
  gradient: string;
}

export const CATEGORY_META: Record<StoryCategory, CategoryMeta> = {
  duel:        { label: "Duel",        badgeBg: "#C2185B", badgeText: "#FFFFFF", gradient: "linear-gradient(135deg, #C2185B 0%, #880E4F 100%)" },
  drame:       { label: "Drame",       badgeBg: "#5D4037", badgeText: "#FFFFFF", gradient: "linear-gradient(135deg, #5D4037 0%, #3E2723 100%)" },
  exploit:     { label: "Exploit",     badgeBg: "#F57C00", badgeText: "#FFFFFF", gradient: "linear-gradient(135deg, #F57C00 0%, #E65100 100%)" },
  anecdote:    { label: "Anecdote",    badgeBg: "#7B1FA2", badgeText: "#FFFFFF", gradient: "linear-gradient(135deg, #7B1FA2 0%, #4A148C 100%)" },
  controverse: { label: "Controverse", badgeBg: "#424242", badgeText: "#FFFFFF", gradient: "linear-gradient(135deg, #424242 0%, #212121 100%)" },
  victoire:    { label: "Victoire",    badgeBg: "#F2C200", badgeText: "#1B1F3B", gradient: "linear-gradient(135deg, #F2C200 0%, #B38F00 100%)" },
  col:         { label: "Col",         badgeBg: "#2E7D32", badgeText: "#FFFFFF", gradient: "linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)" },
  coureur:     { label: "Coureur",     badgeBg: "#B8860B", badgeText: "#FFFFFF", gradient: "linear-gradient(135deg, #B8860B 0%, #8B6914 100%)" },
  explication: { label: "Explication", badgeBg: "#1B1F3B", badgeText: "#FFFFFF", gradient: "linear-gradient(135deg, #1B1F3B 0%, #2A2F5C 100%)" },
};

export const CATEGORY_ORDER: StoryCategory[] = [
  "duel", "exploit", "drame", "anecdote", "controverse", "col", "coureur", "explication", "victoire",
];

export function categoryMeta(cat: string): CategoryMeta {
  return CATEGORY_META[cat as StoryCategory] ?? CATEGORY_META.explication;
}
