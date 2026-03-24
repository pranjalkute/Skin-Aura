import type { ApprovePayload, Product, Stats } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function scanProduct(front: File, back: File): Promise<{ product_id: number }> {
  const form = new FormData();
  form.append("front_image", front);
  form.append("back_image", back);
  return request("/api/scan", { method: "POST", body: form });
}

export async function getProduct(id: number): Promise<Product> {
  return request(`/api/products/${id}`);
}

export async function getPendingProducts(): Promise<Product[]> {
  return request("/api/products/status/pending");
}

export async function getApprovedProducts(): Promise<Product[]> {
  return request("/api/products/status/approved");
}

export async function approveProduct(id: number, payload: ApprovePayload): Promise<void> {
  await request(`/api/products/${id}/approve`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function rejectProduct(id: number): Promise<void> {
  await request(`/api/products/${id}/reject`, { method: "PUT" });
}

export async function getStats(): Promise<Stats> {
  return request("/api/stats");
}

export function imageUrl(path: string | null): string | null {
  if (!path) return null;
  // path is like "uploads/abc.jpg" — backend serves it at /uploads/abc.jpg
  const filename = path.replace(/\\/g, "/").split("/").pop();
  return `${BASE}/uploads/${filename}`;
}
