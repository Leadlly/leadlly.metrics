import { cn } from "@/lib/utils";

export function TableFrame({
  columnCount,
  children,
  stickyHeader,
  className,
}: {
  columnCount: number;
  children: React.ReactNode;
  stickyHeader?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        stickyHeader
          ? "h-full min-h-0 overflow-auto"
          : "-mx-4 overflow-x-auto sm:-mx-5",
        className,
      )}
    >
      <table
        className="w-full border-separate border-spacing-0 text-left text-sm [&_th]:pb-3 [&_th]:pr-4 [&_th]:font-medium [&_th]:whitespace-nowrap [&_td]:py-3 [&_td]:pr-4 [&_td]:align-top [&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4 sm:[&_th:first-child]:pl-5 sm:[&_td:first-child]:pl-5 sm:[&_th:last-child]:pr-5 sm:[&_td:last-child]:pr-5"
        style={{ minWidth: Math.max(520, columnCount * 130) }}
      >
        {children}
      </table>
    </div>
  );
}
