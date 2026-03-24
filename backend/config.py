import os
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

VISION_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free"
REASONING_MODEL = "google/gemma-3-12b-it:free"

DB_PATH = "skin_aura.db"
UPLOADS_DIR = "uploads"

SAFETY_RUBRIC = """
SAFETY SCORE (start at 8.0, clamp to 1.0–10.0):

Deductions:
- Synthetic fragrance / parfum / perfume: -1.5
- Any paraben (methylparaben, propylparaben, butylparaben, ethylparaben): -2.0
- SLS — Sodium Lauryl Sulfate: -1.5
- SLES — Sodium Laureth Sulfate: -1.0
- Formaldehyde releasers (DMDM Hydantoin, Quaternium-15, Imidazolidinyl Urea): -2.0
- Phthalates (DBP, DEHP, DEP): -2.0
- Mineral oil or petrolatum: -0.5
- Alcohol Denat / Denatured Alcohol (as primary ingredient): -0.5
- Phenoxyethanol: -0.3
- Artificial colorants (CI numbers): -0.2 each

Additions:
- Plant extracts, natural oils, botanical ingredients: +0.2 each (max +1.0)
- "Dermatologist tested" claim on label: +0.3
- "Hypoallergenic" claim on label: +0.2
"""

ECO_RUBRIC = """
ECO SCORE (start at 6.5, clamp to 1.0–10.0):

Deductions:
- Microbeads / Polyethylene particles: -3.0
- Silicones (Dimethicone, Cyclopentasiloxane, Cyclomethicone): -1.0
- PEG compounds: -0.5
- Mineral oil or petrolatum: -0.5

Additions:
- Majority plant-based / natural ingredient list: +1.0
- Cruelty-free or vegan claim: +0.8
- Certified organic claim: +1.0
- Biodegradable formulation claim: +0.8
- Recyclable packaging mentioned: +0.5
- "Made with sustainable ingredients" or similar: +0.5
"""
