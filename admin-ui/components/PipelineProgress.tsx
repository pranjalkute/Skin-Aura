import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import type { PipelineStep, ProductStatus } from "@/lib/types";
import clsx from "clsx";

const STEPS: { key: PipelineStep; label: string; sub: string }[] = [
  { key: "extracting_text", label: "Extract Text", sub: "Reading both images with vision model" },
  { key: "structuring_data", label: "Structure Data", sub: "Parsing into product fields" },
  { key: "scoring", label: "Score Product", sub: "Safety & eco scoring with rubrics" },
  { key: "ready", label: "Ready for Review", sub: "Awaiting your approval" },
];

const STEP_ORDER: PipelineStep[] = ["queued", "extracting_text", "structuring_data", "scoring", "ready"];

function stepIndex(step: PipelineStep) {
  return STEP_ORDER.indexOf(step);
}

interface Props {
  pipelineStep: PipelineStep;
  status: ProductStatus;
  error?: string | null;
}

export default function PipelineProgress({ pipelineStep, status, error }: Props) {
  const currentIdx = stepIndex(pipelineStep);
  const failed = status === "failed";

  return (
    <div className="space-y-3">
      {STEPS.map((step, i) => {
        const stepIdx = i + 1; // queued is 0, so actual steps start at 1
        const done = currentIdx > stepIdx;
        const active = currentIdx === stepIdx && !failed;
        const isFailed = failed && currentIdx === stepIdx;

        return (
          <div key={step.key} className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {isFailed ? (
                <XCircle size={18} className="text-danger" />
              ) : done ? (
                <CheckCircle2 size={18} className="text-accent" />
              ) : active ? (
                <Loader2 size={18} className="text-accent animate-spin" />
              ) : (
                <Circle size={18} className="text-text-3" />
              )}
            </div>
            <div>
              <p className={clsx("text-sm font-medium", done || active ? "text-text-1" : "text-text-3")}>
                {step.label}
              </p>
              <p className="text-xs text-text-3 mt-0.5">{step.sub}</p>
            </div>
          </div>
        );
      })}

      {failed && error && (
        <div className="mt-4 p-3 rounded-lg bg-danger/10 border border-danger/20">
          <p className="text-xs font-semibold text-danger mb-1">Pipeline failed</p>
          <p className="text-xs text-text-2 font-mono break-all">{error}</p>
        </div>
      )}
    </div>
  );
}
