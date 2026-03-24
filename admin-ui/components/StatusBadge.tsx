import type { ProductStatus } from "@/lib/types";
import clsx from "clsx";

const MAP: Record<ProductStatus, { label: string; cls: string }> = {
  processing:     { label: "Processing",    cls: "text-info bg-info/10 border-info/20" },
  pending_review: { label: "Pending Review",cls: "text-warning bg-warning/10 border-warning/20" },
  approved:       { label: "Approved",      cls: "text-accent bg-accent/10 border-accent/20" },
  rejected:       { label: "Rejected",      cls: "text-danger bg-danger/10 border-danger/20" },
  failed:         { label: "Failed",        cls: "text-danger bg-danger/10 border-danger/20" },
};

export default function StatusBadge({ status }: { status: ProductStatus }) {
  const { label, cls } = MAP[status] ?? MAP.failed;
  return (
    <span className={clsx("badge border", cls)}>{label}</span>
  );
}
