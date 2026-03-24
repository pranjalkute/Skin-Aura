import io
import logging
import os
import sys
import uuid
from pathlib import Path

# Force UTF-8 on Windows stdout/stderr so Unicode chars from OCR don't crash the process
if sys.stdout and hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr and hasattr(sys.stderr, 'buffer'):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

logging.basicConfig(level=logging.INFO, stream=sys.stderr)

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import database as db
import pipeline
from config import UPLOADS_DIR

app = FastAPI(title="Skin Aura Ingestion API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Path(UPLOADS_DIR).mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


@app.on_event("startup")
async def startup():
    await db.init_db()


# ── helpers ──────────────────────────────────────────────────────────────────

def _save_upload(file: UploadFile) -> str:
    ext = Path(file.filename).suffix if file.filename else ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = Path(UPLOADS_DIR) / filename
    with open(dest, "wb") as f:
        f.write(file.file.read())
    return str(dest)


# ── endpoints ────────────────────────────────────────────────────────────────

@app.post("/api/scan")
async def scan_product(
    background_tasks: BackgroundTasks,
    front_image: UploadFile = File(...),
    back_image: UploadFile = File(...),
):
    front_path = _save_upload(front_image)
    back_path = _save_upload(back_image)
    product_id = await db.create_product(front_path, back_path)
    background_tasks.add_task(pipeline.run, product_id, front_path, back_path)
    return {"product_id": product_id}


@app.get("/api/products/{product_id}")
async def get_product(product_id: int):
    product = await db.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.get("/api/products/status/pending")
async def list_pending():
    return await db.get_products_by_status("pending_review")


@app.get("/api/products/status/approved")
async def list_approved():
    return await db.get_products_by_status("approved")


@app.get("/api/products/status/rejected")
async def list_rejected():
    return await db.get_products_by_status("rejected")


class ApprovePayload(BaseModel):
    name: str
    brand: str
    category: str
    description: str
    safety: float
    eco: float
    ingredients: list[dict]


@app.put("/api/products/{product_id}/approve")
async def approve_product(product_id: int, payload: ApprovePayload):
    product = await db.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.approve_product(product_id, payload.model_dump())
    return {"ok": True}


@app.put("/api/products/{product_id}/reject")
async def reject_product(product_id: int):
    product = await db.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.reject_product(product_id)
    return {"ok": True}


@app.get("/api/stats")
async def stats():
    return await db.get_stats()
