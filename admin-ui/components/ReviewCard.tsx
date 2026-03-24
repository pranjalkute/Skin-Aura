"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Check, X, Pencil, ShieldCheck, Leaf, Plus, Trash2 } from "lucide-react";
import clsx from "clsx";
import type { ApprovePayload, Ingredient, IngredientSafety, Product } from "@/lib/types";
import { approveProduct, rejectProduct, imageUrl } from "@/lib/api";
import ScorePill from "./ScorePill";

const SAFETY_OPTIONS: IngredientSafety[] = ["low", "moderate", "high", "unknown"];
const SAFETY_DOT: Record<IngredientSafety, string> = {
  low: "bg-emerald-400",
  moderate: "bg-yellow-400",
  high: "bg-red-400",
  unknown: "bg-text-3",
};
const CATEGORIES = ["Cleanser", "Face Wash", "Moisturizer", "Serum", "Sunscreen", "Toner", "Mask", "Eye Cream", "Other"];

interface Props {
  product: Product;
  onDone: () => void;
}

export default function ReviewCard({ product, onDone }: Props) {
  const [editing, setEditing] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  // Editable fields
  const [name, setName] = useState(product.name ?? "");
  const [brand, setBrand] = useState(product.brand ?? "");
  const [category, setCategory] = useState(product.category ?? "Other");
  const [description, setDescription] = useState(product.description ?? "");
  const [safety, setSafety] = useState(product.safety ?? 5);
  const [eco, setEco] = useState(product.eco ?? 5);
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    product.ingredients.map((i) => ({ name: i.name, safety: i.safety, description: i.description }))
  );

  const handleApprove = async () => {
    setLoading("approve");
    try {
      const payload: ApprovePayload = { name, brand, category, description, safety, eco, ingredients };
      await approveProduct(product.id, payload);
      onDone();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setLoading("reject");
    try {
      await rejectProduct(product.id);
      onDone();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const updateIngredient = (idx: number, field: keyof Ingredient, value: string) => {
    setIngredients((prev) => prev.map((ing, i) => i === idx ? { ...ing, [field]: value } : ing));
  };

  const addIngredient = () => {
    setIngredients((prev) => [...prev, { name: "", safety: "unknown", description: "" }]);
  };

  const removeIngredient = (idx: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  };

  const frontUrl = imageUrl(product.image_front);
  const backUrl = imageUrl(product.image_back);

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-4 p-5 border-b border-border">
        {/* Thumbnails */}
        <div className="flex gap-2 shrink-0">
          {[frontUrl, backUrl].map((url, i) =>
            url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={i === 0 ? "Front" : "Back"}
                className="w-16 h-16 object-cover rounded-lg border border-border"
              />
            ) : (
              <div key={i} className="w-16 h-16 rounded-lg border border-border bg-surface-2 flex items-center justify-center">
                <span className="text-[10px] text-text-3">{i === 0 ? "Front" : "Back"}</span>
              </div>
            )
          )}
        </div>

        {/* Product info */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <input className="input text-base font-semibold" value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" />
              <div className="flex gap-2">
                <input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand" />
                <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-text-3 font-semibold uppercase tracking-wider">{brand || "—"} · {category || "—"}</p>
              <p className="text-base font-semibold text-text-1 mt-0.5 truncate">{name || "Untitled product"}</p>
            </>
          )}
          <div className="flex gap-2 mt-2">
            <ScorePill score={safety} type="safety" size="sm" />
            <ScorePill score={eco} type="eco" size="sm" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setEditing(!editing)}
            className={clsx("btn-ghost", editing && "text-accent")}
            title={editing ? "Stop editing" : "Edit fields"}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={handleReject}
            disabled={!!loading}
            className="btn-danger"
          >
            {loading === "reject" ? <span className="w-4 h-4 border-2 border-danger/40 border-t-danger rounded-full animate-spin" /> : <X size={14} />}
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={!!loading}
            className="btn-primary"
          >
            {loading === "approve" ? <span className="w-4 h-4 border-2 border-bg/40 border-t-bg rounded-full animate-spin" /> : <Check size={14} />}
            Approve
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-6">
        {/* Description */}
        <div>
          <p className="text-xs font-semibold text-text-3 uppercase tracking-wider mb-2">Description</p>
          {editing ? (
            <textarea
              className="input resize-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Product description"
            />
          ) : (
            <p className="text-sm text-text-2 leading-relaxed">{description || <span className="text-text-3 italic">No description</span>}</p>
          )}
        </div>

        {/* Scores + Reasoning */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-2 rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-text-3" />
                <p className="text-xs font-semibold text-text-3 uppercase tracking-wider">Safety Score</p>
              </div>
              {editing ? (
                <input
                  type="number"
                  step="0.1" min="1" max="10"
                  className="input w-20 text-right text-lg font-bold"
                  value={safety}
                  onChange={(e) => setSafety(parseFloat(e.target.value))}
                />
              ) : (
                <span className="text-2xl font-bold text-text-1">{safety ?? "—"}<span className="text-sm font-normal text-text-3">/10</span></span>
              )}
            </div>
            {product.safety_reasoning && (
              <p className="text-xs text-text-3 leading-relaxed">{product.safety_reasoning}</p>
            )}
          </div>
          <div className="bg-surface-2 rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Leaf size={14} className="text-text-3" />
                <p className="text-xs font-semibold text-text-3 uppercase tracking-wider">Eco Score</p>
              </div>
              {editing ? (
                <input
                  type="number"
                  step="0.1" min="1" max="10"
                  className="input w-20 text-right text-lg font-bold"
                  value={eco}
                  onChange={(e) => setEco(parseFloat(e.target.value))}
                />
              ) : (
                <span className="text-2xl font-bold text-text-1">{eco ?? "—"}<span className="text-sm font-normal text-text-3">/10</span></span>
              )}
            </div>
            {product.eco_reasoning && (
              <p className="text-xs text-text-3 leading-relaxed">{product.eco_reasoning}</p>
            )}
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-text-3 uppercase tracking-wider">
              Ingredients ({ingredients.length})
            </p>
            {editing && (
              <button onClick={addIngredient} className="btn-ghost text-xs">
                <Plus size={12} /> Add
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {ingredients.map((ing, idx) =>
              editing ? (
                <div key={idx} className="flex items-center gap-2 bg-surface-2 rounded-lg p-2 border border-border">
                  <div className={clsx("w-2.5 h-2.5 rounded-full shrink-0", SAFETY_DOT[ing.safety])} />
                  <input
                    className="input flex-1 py-1"
                    value={ing.name}
                    onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                    placeholder="Ingredient name"
                  />
                  <select
                    className="input w-28 py-1"
                    value={ing.safety}
                    onChange={(e) => updateIngredient(idx, "safety", e.target.value)}
                  >
                    {SAFETY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button onClick={() => removeIngredient(idx)} className="btn-ghost p-1.5">
                    <Trash2 size={12} className="text-danger" />
                  </button>
                </div>
              ) : (
                <div key={idx} className="flex items-center justify-between px-3 py-2 bg-surface-2 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className={clsx("w-2 h-2 rounded-full shrink-0", SAFETY_DOT[ing.safety])} />
                    <div>
                      <p className="text-sm font-medium text-text-1">{ing.name}</p>
                      {ing.description && <p className="text-xs text-text-3 mt-0.5">{ing.description}</p>}
                    </div>
                  </div>
                  <span className="text-xs text-text-3 capitalize shrink-0 ml-2">{ing.safety}</span>
                </div>
              )
            )}
            {ingredients.length === 0 && (
              <p className="text-sm text-text-3 italic text-center py-4">No ingredients extracted</p>
            )}
          </div>
        </div>

        {/* Raw text toggle */}
        {product.raw_text && (
          <div>
            <button
              onClick={() => setShowRawText(!showRawText)}
              className="flex items-center gap-2 text-xs text-text-3 hover:text-text-2 transition-colors"
            >
              {showRawText ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {showRawText ? "Hide" : "Show"} raw extracted text
            </button>
            {showRawText && (
              <pre className="mt-3 p-4 bg-surface-2 border border-border rounded-xl text-xs text-text-3 font-mono whitespace-pre-wrap overflow-auto max-h-64">
                {product.raw_text}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
