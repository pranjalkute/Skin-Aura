"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock, RefreshCw } from "lucide-react";
import { getPendingProducts } from "@/lib/api";
import type { Product } from "@/lib/types";
import ReviewCard from "@/components/ReviewCard";

export default function PendingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPendingProducts();
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
          <h1 className="text-2xl font-bold text-text-1">Pending Review</h1>
          <p className="text-sm text-text-3 mt-1">
            {loading ? "Loading…" : `${products.length} product${products.length !== 1 ? "s" : ""} awaiting review`}
          </p>
        </div>
        <button onClick={load} className="btn-ghost" disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-lg bg-surface-2" />
                <div className="w-16 h-16 rounded-lg bg-surface-2" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 w-32 bg-surface-2 rounded" />
                  <div className="h-4 w-56 bg-surface-2 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
            <Clock size={20} className="text-text-3" />
          </div>
          <p className="text-sm font-semibold text-text-2">Nothing pending</p>
          <p className="text-xs text-text-3 mt-1">Scan a product to create a review entry.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((p) => (
            <ReviewCard key={p.id} product={p} onDone={load} />
          ))}
        </div>
      )}
    </div>
  );
}
