"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ScanLine, ArrowRight, RotateCcw } from "lucide-react";
import ImageDropzone from "@/components/ImageDropzone";
import PipelineProgress from "@/components/PipelineProgress";
import { scanProduct, getProduct } from "@/lib/api";
import type { Product } from "@/lib/types";

type Stage = "idle" | "uploading" | "polling" | "done" | "error";

export default function ScanPage() {
  const router = useRouter();
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [product, setProduct] = useState<Product | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const canScan = front && back && stage === "idle";

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
  };

  useEffect(() => () => stopPolling(), []);

  const handleScan = async () => {
    if (!front || !back) return;
    setStage("uploading");
    setErrorMsg("");
    try {
      const { product_id } = await scanProduct(front, back);
      setStage("polling");

      pollRef.current = setInterval(async () => {
        try {
          const p = await getProduct(product_id);
          setProduct(p);
          if (p.status === "pending_review") {
            stopPolling();
            setStage("done");
          } else if (p.status === "failed") {
            stopPolling();
            setStage("error");
            setErrorMsg(p.pipeline_error ?? "Unknown error");
          }
        } catch {
          stopPolling();
          setStage("error");
          setErrorMsg("Lost connection to backend.");
        }
      }, 2000);
    } catch (e) {
      setStage("error");
      setErrorMsg(e instanceof Error ? e.message : "Upload failed.");
    }
  };

  const reset = () => {
    stopPolling();
    setFront(null);
    setBack(null);
    setStage("idle");
    setProduct(null);
    setErrorMsg("");
  };

  const busy = stage === "uploading" || stage === "polling";

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-1">Scan Product</h1>
        <p className="text-sm text-text-3 mt-1">Upload front and back images to run the ingestion pipeline</p>
      </div>

      {stage === "done" && product ? (
        /* ── Success state ── */
        <div className="card p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
            <ScanLine size={22} className="text-accent" />
          </div>
          <p className="text-lg font-semibold text-text-1 mb-1">Pipeline complete</p>
          <p className="text-sm text-text-3 mb-6">
            <span className="text-text-2 font-medium">{product.name ?? "Product"}</span> is ready for your review.
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={reset} className="btn-ghost">
              <RotateCcw size={14} /> Scan another
            </button>
            <button onClick={() => router.push("/pending")} className="btn-primary">
              Review now <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left — image upload */}
          <div className="space-y-4">
            <ImageDropzone label="Front image" file={front} onChange={setFront} disabled={busy} />
            <ImageDropzone label="Back image" file={back} onChange={setBack} disabled={busy} />

            {stage === "error" && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/20">
                <p className="text-xs text-danger font-semibold">Error</p>
                <p className="text-xs text-text-2 mt-1">{errorMsg}</p>
              </div>
            )}

            <button
              onClick={stage === "error" ? reset : handleScan}
              disabled={stage === "error" ? false : !canScan}
              className="btn-primary w-full justify-center py-3"
            >
              {stage === "error" ? (
                <><RotateCcw size={15} /> Try again</>
              ) : busy ? (
                <><span className="w-4 h-4 border-2 border-bg/40 border-t-bg rounded-full animate-spin" /> Running pipeline…</>
              ) : (
                <><ScanLine size={15} /> Start pipeline</>
              )}
            </button>
          </div>

          {/* Right — progress */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-text-3 uppercase tracking-wider mb-5">Pipeline steps</p>
            {product ? (
              <PipelineProgress
                pipelineStep={product.pipeline_step}
                status={product.status}
                error={product.pipeline_error}
              />
            ) : (
              <PipelineProgress pipelineStep="queued" status="processing" />
            )}

            {busy && (
              <p className="text-xs text-text-3 mt-5 text-center animate-pulse">
                Checking status every 2 seconds…
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
