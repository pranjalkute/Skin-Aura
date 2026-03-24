export type IngredientSafety = "low" | "moderate" | "high" | "unknown";

export interface Ingredient {
  id?: number;
  product_id?: number;
  name: string;
  safety: IngredientSafety;
  description: string;
}

export type ProductStatus = "processing" | "pending_review" | "approved" | "rejected" | "failed";

export type PipelineStep =
  | "queued"
  | "extracting_text"
  | "structuring_data"
  | "scoring"
  | "ready"
  | "failed";

export interface Product {
  id: number;
  name: string | null;
  brand: string | null;
  category: string | null;
  description: string | null;
  safety: number | null;
  eco: number | null;
  image_front: string | null;
  image_back: string | null;
  status: ProductStatus;
  pipeline_step: PipelineStep;
  raw_text: string | null;
  safety_reasoning: string | null;
  eco_reasoning: string | null;
  pipeline_error: string | null;
  created_at: string;
  updated_at: string;
  ingredients: Ingredient[];
}

export interface Stats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  processing: number;
  recent: Product[];
}

export interface ApprovePayload {
  name: string;
  brand: string;
  category: string;
  description: string;
  safety: number;
  eco: number;
  ingredients: Ingredient[];
}
