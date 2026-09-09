import { isSameIstDay } from "@/lib/ist";

export const efficiencyOptions = [
  {
    max: 1,
    label: "0%",
    swatch: "#ff6b6b",
    rowClass: "bg-[#ff6b6b]/70",
  },
  {
    min: 1,
    max: 30,
    label: "1-30%",
    swatch: "#ed9a7b",
    rowClass: "bg-[#ed9a7b]/70",
  },
  {
    min: 30,
    max: 50,
    label: "30-50%",
    swatch: "#FED18C",
    rowClass: "bg-[#FED18C]/80",
  },
  {
    min: 50,
    max: 70,
    label: "50-70%",
    swatch: "#FCF4AC",
    rowClass: "bg-[#FCF4AC]/80",
  },
  {
    min: 70,
    label: "70% +",
    swatch: "#E0FAEE",
    rowClass: "bg-[#E0FAEE]",
  },
] as const;

export function isTodayInKolkata(value?: Date | string | null) {
  return isSameIstDay(value);
}

export function todayEfficiency(
  date?: Date | string | null,
  overall?: number | null,
) {
  if (!isTodayInKolkata(date)) return 0;
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
