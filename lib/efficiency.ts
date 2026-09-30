import { addYmd, isSameIstDay, istNowYmd } from "@/lib/ist";

export const efficiencyOptions = [
  {
    id: "0",
    max: 1,
    label: "0%",
    swatch: "#ff6b6b",
    rowClass: "bg-[#ff6b6b]/70",
  },
  {
    id: "1-30",
    min: 1,
    max: 30,
    label: "1-30%",
    swatch: "#ed9a7b",
    rowClass: "bg-[#ed9a7b]/70",
  },
  {
    id: "30-50",
    min: 30,
    max: 50,
    label: "30-50%",
    swatch: "#FED18C",
    rowClass: "bg-[#FED18C]/80",
  },
  {
    id: "50-70",
    min: 50,
    max: 70,
    label: "50-70%",
    swatch: "#FCF4AC",
    rowClass: "bg-[#FCF4AC]/80",
  },
  {
    id: "70+",
    min: 70,
    label: "70% +",
    swatch: "#E0FAEE",
    rowClass: "bg-[#E0FAEE]",
  },
] as const;

export type EfficiencyFilterId = (typeof efficiencyOptions)[number]["id"] | "all";

export function isTodayInKolkata(value?: Date | string | null) {
  return isSameIstDay(value);
}

export function previousDayYmd() {
  return addYmd(istNowYmd(), -1);
}

/** Row color uses yesterday's overall; falls back to 0 when missing. */
export function previousDayEfficiency(overall?: number | null) {
  return Number(overall || 0);
}

export function efficiencyRowClass(efficiency: number) {
  const option = efficiencyOptions.find((opt) => {
    if ("min" in opt && "max" in opt) {
      return efficiency >= opt.min && efficiency < opt.max;
    }
    if ("min" in opt) return efficiency >= opt.min;
    if ("max" in opt) return efficiency < opt.max;
    return false;
  });
  return option?.rowClass || "bg-white";
}

export function matchesEfficiencyFilter(
  overall: number | null | undefined,
  filterId: string,
) {
  if (!filterId || filterId === "all") return true;
  const value = Number(overall || 0);
  const option = efficiencyOptions.find((opt) => opt.id === filterId);
  if (!option) return true;
  if ("min" in option && "max" in option) {
    return value >= option.min && value < option.max;
  }
  if ("min" in option) return value >= option.min;
  if ("max" in option) return value < option.max;
  return true;
}

export function efficiencyFilterLabel(filterId: string) {
  if (!filterId || filterId === "all") return "All";
  return efficiencyOptions.find((opt) => opt.id === filterId)?.label || "All";
}
