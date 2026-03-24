import asyncio
import json
import logging
import re
from pathlib import Path

from openai import AsyncOpenAI

import database as db
from config import (
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    REASONING_MODEL,
    SAFETY_RUBRIC,
    ECO_RUBRIC,
)

logger = logging.getLogger(__name__)

client = AsyncOpenAI(
    base_url=OPENROUTER_BASE_URL,
    api_key=OPENROUTER_API_KEY,
    timeout=90.0,
    default_headers={
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Skin Aura Admin",
    },
)


def _preprocess_for_ocr(path: str) -> str:
    """Preprocess image for better OCR accuracy — enhance contrast, upscale if small."""
    from PIL import Image, ImageEnhance, ImageFilter
    import io, tempfile, os

    img = Image.open(path).convert("RGB")
    w, h = img.size

    # Upscale small images — OCR works best at 300+ DPI equivalent
    if max(w, h) < 1200:
        scale = 1200 / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    # Enhance sharpness and contrast for clearer text
    img = ImageEnhance.Sharpness(img).enhance(2.0)
    img = ImageEnhance.Contrast(img).enhance(1.5)

    # Save to a temp JPEG and return the path
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    img.save(tmp.name, format="JPEG", quality=95)
    tmp.close()
    logger.info("Preprocessed %s → %s (size %dx%d)", path, tmp.name, img.size[0], img.size[1])
    return tmp.name


_ocr_reader = None

def _get_ocr_reader():
    """Lazy-init EasyOCR reader (downloads models on first use, ~200MB)."""
    global _ocr_reader
    if _ocr_reader is None:
        import easyocr
        logger.info("Initialising EasyOCR reader (may download models on first run)...")
        _ocr_reader = easyocr.Reader(["en"], gpu=False)
        logger.info("EasyOCR reader ready.")
    return _ocr_reader


def _clean_ocr_text(text: str) -> str:
    """Remove non-printable and non-ASCII junk that OCR sometimes reads from image artifacts."""
    # Keep standard printable ASCII + common punctuation used in ingredient lists
    cleaned = "".join(
        ch for ch in text
        if ch.isprintable() and (ord(ch) < 128 or ch in "°%®™©–—''""")
    )
    return cleaned.strip()


def _run_ocr_on_image(path: str) -> str:
    """Run EasyOCR on a single image, return cleaned concatenated text."""
    import os
    tmp_path = _preprocess_for_ocr(path)
    try:
        reader = _get_ocr_reader()
        results = reader.readtext(tmp_path, detail=0, paragraph=True)
        text = _clean_ocr_text("\n".join(results))
        logger.info("OCR extracted %d chars from %s", len(text), os.path.basename(path))
        return text
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


def _extract_json(text: str) -> dict:
    """Robustly extract the last JSON object from a model response.
    Using the last match handles reasoning models that quote examples early
    in their thinking and write the actual answer at the end.
    """
    text = text.strip()
    # Strip markdown code fences
    text = re.sub(r"```(?:json)?", "", text).strip().rstrip("`")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Find ALL JSON objects, take the last one (reasoning models put answer last)
    matches = list(re.finditer(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\}", text, re.DOTALL))
    if not matches:
        # Fallback: greedy match
        matches = list(re.finditer(r"\{.*\}", text, re.DOTALL))
    for match in reversed(matches):
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            continue
    raise ValueError(f"Could not parse JSON from model response: {text[:300]}")


VISION_MODELS_FALLBACK = [
    "google/gemma-3-27b-it:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "google/gemma-3-12b-it:free",
]

VISION_PROMPT = (
    "These are the front and back images of a skincare product. "
    "Extract ALL visible text from both images verbatim. "
    "Include: product name, brand, tagline, ingredient list, claims, "
    "directions, warnings, certifications, net weight, and any other text. "
    "Preserve the original text exactly as it appears. "
    "Label each section clearly (e.g. FRONT:, BACK:, INGREDIENTS:). "
    "Do not summarise or interpret — just extract the text."
)


def _image_to_base64(path: str) -> tuple[str, str]:
    """Resize image to max 1024px on longest side, return (base64, media_type)."""
    from PIL import Image
    import base64, io
    img = Image.open(path).convert("RGB")
    w, h = img.size
    if max(w, h) > 1024:
        scale = 1024 / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode(), "image/jpeg"


async def _extract_text_ocr(front_path: str, back_path: str) -> str:
    """Step 1 — extract all text from both images using a vision model via OpenRouter."""
    front_b64, front_mime = _image_to_base64(front_path)
    back_b64, back_mime = _image_to_base64(back_path)

    last_error = "Unknown error"
    for model in VISION_MODELS_FALLBACK:
        try:
            logger.info("Calling vision model=%s for OCR", model)
            response = await client.chat.completions.create(
                model=model,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:{front_mime};base64,{front_b64}"}},
                        {"type": "image_url", "image_url": {"url": f"data:{back_mime};base64,{back_b64}"}},
                        {"type": "text", "text": VISION_PROMPT},
                    ],
                }],
                max_tokens=2000,
            )
            if not response.choices:
                raw = response.model_dump()
                err = raw.get("error") or {}
                last_error = f"{model} [{err.get('code','?')}]: {err.get('message','no choices')}"
                logger.warning("Vision attempt failed: %s", last_error)
                continue
            content = response.choices[0].message.content
            if not content:
                last_error = f"{model}: empty content"
                logger.warning("Vision attempt failed: %s", last_error)
                continue
            logger.info("Vision OCR succeeded with model=%s, %d chars", model, len(content))
            return content
        except Exception as e:
            last_error = f"{model}: {e}"
            logger.warning("Vision attempt exception: %s", last_error)
            continue

    raise RuntimeError(f"Vision OCR failed across all models. Last error: {last_error}")


REASONING_MODELS_FALLBACK = [
    "google/gemma-3-12b-it:free",
    "google/gemma-3-27b-it:free",
    "google/gemma-3-4b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "meta-llama/llama-3.2-3b-instruct:free",
]


async def _call_text_model(prompt: str, max_tokens: int, step: str) -> str:
    """Call a text model with fallback across REASONING_MODELS_FALLBACK."""
    last_error = "Unknown error"
    for model in REASONING_MODELS_FALLBACK:
        try:
            logger.info("Calling %s model=%s", step, model)
            response = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
            )
            if not response.choices:
                raw = response.model_dump()
                err = raw.get("error") or {}
                last_error = f"{model} [{err.get('code','?')}]: {err.get('message','no choices')}"
                logger.warning("%s attempt failed: %s", step, last_error)
                continue
            msg = response.choices[0].message
            content = msg.content or getattr(msg, "reasoning", None)
            if not content:
                last_error = f"{model}: null content"
                logger.warning("%s attempt failed: %s", step, last_error)
                continue
            logger.info("%s succeeded with model=%s", step, model)
            return content
        except Exception as e:
            last_error = f"{model}: {e}"
            logger.warning("%s attempt exception: %s", step, last_error)
            continue
    raise RuntimeError(f"{step} failed across all models. Last error: {last_error}")


async def _call_structure(raw_text: str) -> dict:
    """Step 2 — parse raw OCR text into structured product JSON."""
    prompt = f"""You are a skincare product database assistant.
Given the raw text extracted from a skincare product label, extract and structure the information.

RAW TEXT:
{raw_text}

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{{
  "name": "full product name",
  "brand": "brand name",
  "category": "one of: Cleanser, Face Wash, Moisturizer, Serum, Sunscreen, Toner, Mask, Eye Cream, Other",
  "description": "2-3 sentence product description based on claims and purpose found on label",
  "ingredients": [
    {{
      "name": "ingredient name as listed",
      "safety": "low or moderate or high",
      "description": "brief one-line description of what this ingredient does for skin"
    }}
  ]
}}

For ingredient safety:
- low = well-tolerated, gentle, widely regarded as safe (e.g. glycerin, aloe vera, hyaluronic acid)
- moderate = effective but may cause sensitivity in some (e.g. salicylic acid, AHAs, retinol, essential oils)
- high = known irritants, allergens, or controversial ingredients (e.g. parabens, SLS, synthetic fragrance, formaldehyde releasers)
"""
    content = await _call_text_model(prompt, max_tokens=3000, step="structure")
    return _extract_json(content)


async def _call_scoring(structured: dict) -> dict:
    """Step 3 — score safety and eco using explicit rubrics."""
    ingredient_names = ", ".join(i["name"] for i in structured.get("ingredients", []))
    prompt = f"""You are a skincare ingredient safety and sustainability expert.
Score the following product using the provided rubrics.

PRODUCT: {structured.get('name', 'Unknown')} by {structured.get('brand', 'Unknown')}
CATEGORY: {structured.get('category', 'Unknown')}
DESCRIPTION: {structured.get('description', '')}
INGREDIENTS: {ingredient_names}

{SAFETY_RUBRIC}

{ECO_RUBRIC}

Apply the rubrics step by step. Show your working briefly in the reasoning fields.
Return ONLY valid JSON (no markdown, no explanation):
{{
  "safety": 7.5,
  "safety_reasoning": "Started at 8.0. Deducted X for Y. Added Z for W. Final: 7.5",
  "eco": 6.8,
  "eco_reasoning": "Started at 6.5. Deducted X for Y. Added Z for W. Final: 6.8"
}}
"""
    content = await _call_text_model(prompt, max_tokens=4000, step="scoring")
    result = _extract_json(content)
    result["safety"] = round(max(1.0, min(10.0, float(result.get("safety", 5.0)))), 1)
    result["eco"] = round(max(1.0, min(10.0, float(result.get("eco", 5.0)))), 1)
    return result


async def run(product_id: int, front_path: str, back_path: str):
    """Full pipeline — runs as a background task."""
    try:
        # Step 1 — Extract text
        await db.update_pipeline_step(product_id, "extracting_text")
        raw_text = await _extract_text_ocr(front_path, back_path)
        await db.update_raw_text(product_id, raw_text)

        # Step 2 — Structure
        await db.update_pipeline_step(product_id, "structuring_data")
        structured = await _call_structure(raw_text)
        await db.update_structured_data(product_id, structured)

        # Step 3 — Score
        await db.update_pipeline_step(product_id, "scoring")
        scores = await _call_scoring(structured)
        await db.update_scores(
            product_id,
            scores["safety"],
            scores["eco"],
            scores.get("safety_reasoning", ""),
            scores.get("eco_reasoning", ""),
        )

        await db.set_pending_review(product_id)

    except Exception as e:
        await db.set_failed(product_id, str(e))
        raise
