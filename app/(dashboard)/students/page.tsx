import { Suspense } from "react";
import { StudentsView } from "@/components/views/StudentsView";
import { LoadingBlock } from "@/components/ui/stat-card";

export default function StudentsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <StudentsView />
    </Suspense>
  );
}
