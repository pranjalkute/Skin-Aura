"use client";

import { useEffect, useState, useCallback } from "react";
import { Package, RefreshCw, ShieldCheck, Leaf } from "lucide-react";
import { getApprovedProducts, imageUrl } from "@/lib/api";
import type { Product } from "@/lib/types";
import ScorePill from "@/components/ScorePill";

const SAFETY_DOT: Record<string, string> = {
  low: "bg-emerald-400",
  moderate: "bg-yellow-400",
  high: "bg-red-400",
  unknown: "bg-text-3",
};

function ProductRow({ product }: { product: Product }) {
  const [expanded, setExpanded] = useState(false);
  const front = imageUrl(product.image_front);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-surface-2 transition-colors text-left"
      >
        {/* Thumbnail */}
        {front ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={front} alt="" className="w-12 h-12 rounded-lg object-cover border border-border shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-surface-2 border border-border shrink-0 flex items-center justify-center">
            <Package size={16} className="text-text-3" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-3 font-semibold uppercase tracking-wider">{product.brand ?? "—"} · {product.category ?? "—"}</p>
          <p className="text-sm font-semibold text-text-1 mt-0.5 truncate">{product.name ?? "Untitled"}</p>
        </div>

        {/* Scores */}
        <div className="flex gap-2 shrink-0">
          <ScorePill score={product.safety} type="safety" size="sm" />
          <ScorePill score={product.eco} type="eco" size="sm" />
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-text-3 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-border p-5 space-y-5 bg-surface-2">
          <p className="text-sm text-text-2 leading-relaxed">{product.description ?? "No description."}</p>

          {/* Scores detail */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={13} className="text-text-3" />
                <p className="text-xs font-semibold text-text-3 uppercase tracking-wider">Safety</p>
              </div>
              <p className="text-xl font-bold text-text-1 mb-2">{product.safety ?? "—"}<span className="text-xs font-normal text-text-3">/10</span></p>
              {product.safety_reasoning && (
                <p className="text-xs text-text-3 leading-relaxed">{product.safety_reasoning}</p>
              )}
            </div>
            <div className="bg-surface rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Leaf size={13} className="text-text-3" />
                <p className="text-xs font-semibold text-text-3 uppercase tracking-wider">Eco</p>
              </div>
              <p className="text-xl font-bold text-text-1 mb-2">{product.eco ?? "—"}<span className="text-xs font-normal text-text-3">/10</span></p>
              {product.eco_reasoning && (
                <p className="text-xs text-text-3 leading-relaxed">{product.eco_reasoning}</p>
              )}
            </div>
          </div>

          {/* Ingredients */}
          {product.ingredients.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-3 uppercase tracking-wider mb-3">
                Ingredients ({product.ingredients.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {product.ingredients.map((ing, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-border rounded-full text-xs text-text-2"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${SAFETY_DOT[ing.safety] ?? "bg-text-3"}`} />
                    {ing.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getApprovedProducts();
      setProducts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-1">Products</h1>
          <p className="text-sm text-text-3 mt-1">
            {loading ? "Loading…" : `${products.length} approved product${products.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={load} className="btn-ghost" disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-4 flex items-center gap-4 animate-pulse">
              <div className="w-12 h-12 rounded-lg bg-surface-2 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-surface-2 rounded" />
                <div className="h-4 w-48 bg-surface-2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
            <Package size={20} className="text-text-3" />
          </div>
          <p className="text-sm font-semibold text-text-2">No approved products yet</p>
          <p className="text-xs text-text-3 mt-1">Approve products from the Pending Review queue.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
