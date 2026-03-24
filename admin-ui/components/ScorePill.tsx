import clsx from "clsx";

interface Props {
  score: number | null;
  type: "safety" | "eco";
  size?: "sm" | "md";
}

function getColor(score: number | null) {
  if (score === null) return "text-text-3 bg-surface-3 border-border";
  if (score >= 8) return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  if (score >= 6) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
  return "text-red-400 bg-red-400/10 border-red-400/20";
}

export default function ScorePill({ score, type, size = "md" }: Props) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 border rounded-full font-semibold",
        getColor(score),
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      {type === "safety" ? "Safety" : "Eco"}
      <span className="font-bold">{score ?? "—"}</span>
    </span>
  );
}
