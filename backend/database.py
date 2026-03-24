import aiosqlite
from config import DB_PATH


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                brand TEXT,
                category TEXT,
                description TEXT,
                safety REAL,
                eco REAL,
                image_front TEXT,
                image_back TEXT,
                status TEXT DEFAULT 'processing',
                pipeline_step TEXT DEFAULT 'queued',
                raw_text TEXT,
                safety_reasoning TEXT,
                eco_reasoning TEXT,
                pipeline_error TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS ingredients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                safety TEXT DEFAULT 'unknown',
                description TEXT
            )
        """)
        await db.commit()


async def create_product(image_front: str, image_back: str) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO products (image_front, image_back, status, pipeline_step) VALUES (?, ?, 'processing', 'queued')",
            (image_front, image_back),
        )
        await db.commit()
        return cursor.lastrowid


async def update_pipeline_step(product_id: int, step: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE products SET pipeline_step=?, updated_at=datetime('now') WHERE id=?",
            (step, product_id),
        )
        await db.commit()


async def update_raw_text(product_id: int, raw_text: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE products SET raw_text=?, updated_at=datetime('now') WHERE id=?",
            (raw_text, product_id),
        )
        await db.commit()


async def update_structured_data(product_id: int, data: dict):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """UPDATE products SET name=?, brand=?, category=?, description=?,
               updated_at=datetime('now') WHERE id=?""",
            (data.get("name"), data.get("brand"), data.get("category"), data.get("description"), product_id),
        )
        await db.execute("DELETE FROM ingredients WHERE product_id=?", (product_id,))
        for ing in data.get("ingredients", []):
            await db.execute(
                "INSERT INTO ingredients (product_id, name, safety, description) VALUES (?, ?, ?, ?)",
                (product_id, ing.get("name"), ing.get("safety", "unknown"), ing.get("description", "")),
            )
        await db.commit()


async def update_scores(product_id: int, safety: float, eco: float, safety_reasoning: str, eco_reasoning: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """UPDATE products SET safety=?, eco=?, safety_reasoning=?, eco_reasoning=?,
               updated_at=datetime('now') WHERE id=?""",
            (safety, eco, safety_reasoning, eco_reasoning, product_id),
        )
        await db.commit()


async def set_pending_review(product_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE products SET status='pending_review', pipeline_step='ready', updated_at=datetime('now') WHERE id=?",
            (product_id,),
        )
        await db.commit()


async def set_failed(product_id: int, error: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE products SET status='failed', pipeline_error=?, updated_at=datetime('now') WHERE id=?",
            (error, product_id),
        )
        await db.commit()


async def get_product(product_id: int) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM products WHERE id=?", (product_id,)) as cursor:
            row = await cursor.fetchone()
        if not row:
            return None
        product = dict(row)
        async with db.execute(
            "SELECT * FROM ingredients WHERE product_id=?", (product_id,)
        ) as cursor:
            rows = await cursor.fetchall()
        product["ingredients"] = [dict(r) for r in rows]
        return product


async def get_products_by_status(status: str) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM products WHERE status=? ORDER BY created_at DESC", (status,)
        ) as cursor:
            rows = await cursor.fetchall()
        products = []
        for row in rows:
            p = dict(row)
            async with db.execute(
                "SELECT * FROM ingredients WHERE product_id=?", (p["id"],)
            ) as icursor:
                ings = await icursor.fetchall()
            p["ingredients"] = [dict(i) for i in ings]
            products.append(p)
        return products


async def approve_product(product_id: int, updates: dict):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """UPDATE products SET name=?, brand=?, category=?, description=?,
               safety=?, eco=?, status='approved', updated_at=datetime('now') WHERE id=?""",
            (
                updates["name"], updates["brand"], updates["category"],
                updates["description"], updates["safety"], updates["eco"],
                product_id,
            ),
        )
        await db.execute("DELETE FROM ingredients WHERE product_id=?", (product_id,))
        for ing in updates.get("ingredients", []):
            await db.execute(
                "INSERT INTO ingredients (product_id, name, safety, description) VALUES (?, ?, ?, ?)",
                (product_id, ing["name"], ing.get("safety", "unknown"), ing.get("description", "")),
            )
        await db.commit()


async def reject_product(product_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE products SET status='rejected', updated_at=datetime('now') WHERE id=?",
            (product_id,),
        )
        await db.commit()


async def get_stats() -> dict:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT COUNT(*) FROM products WHERE status='approved'") as c:
            approved = (await c.fetchone())[0]
        async with db.execute("SELECT COUNT(*) FROM products WHERE status='pending_review'") as c:
            pending = (await c.fetchone())[0]
        async with db.execute("SELECT COUNT(*) FROM products WHERE status='rejected'") as c:
            rejected = (await c.fetchone())[0]
        async with db.execute("SELECT COUNT(*) FROM products WHERE status IN ('processing','failed')") as c:
            processing = (await c.fetchone())[0]
        async with db.execute(
            "SELECT * FROM products ORDER BY created_at DESC LIMIT 5"
        ) as c:
            db.row_factory = aiosqlite.Row
            rows = await c.fetchall()
        return {
            "approved": approved,
            "pending": pending,
            "rejected": rejected,
            "processing": processing,
            "total": approved + pending + rejected + processing,
            "recent": [dict(r) for r in rows],
        }
