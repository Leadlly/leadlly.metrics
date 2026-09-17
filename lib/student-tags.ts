export type LeadTagTone = "neutral" | "purple" | "green" | "amber" | "red" | "blue";

export type LeadTag = {
  id: string;
  label: string;
  hint: string;
  tone: LeadTagTone;
};

export const STUDENT_LEAD_TAGS: LeadTag[] = [
  {
    id: "hot-lead",
    label: "Hot lead",
    hint: "Active now and likely to convert",
    tone: "red",
  },
  {
    id: "warm-lead",
    label: "Warm lead",
    hint: "Some usage, needs a sales push",
    tone: "amber",
  },
  {
    id: "cold-lead",
    label: "Cold lead",
    hint: "Little or no recent activity",
    tone: "blue",
  },
  {
    id: "convertible",
    label: "Convertible",
    hint: "High intent, ready to buy",
    tone: "green",
  },
  {
    id: "not-convertible",
    label: "Not convertible",
    hint: "Unlikely to convert from current behavior",
    tone: "neutral",
  },
  {
    id: "follow-up",
    label: "Follow up",
    hint: "Sales should contact this student",
    tone: "purple",
  },
  {
    id: "won",
    label: "Won",
    hint: "Converted to a paid plan",
    tone: "green",
  },
  {
    id: "lost",
    label: "Lost",
    hint: "Did not convert or dropped off",
    tone: "red",
  },
];

export const STUDENT_LEAD_TAG_MAP = new Map(
  STUDENT_LEAD_TAGS.map((tag) => [tag.id, tag]),
);

export function getLeadTag(id?: string | null) {
  if (!id) return null;
  return STUDENT_LEAD_TAG_MAP.get(id) || null;
}
