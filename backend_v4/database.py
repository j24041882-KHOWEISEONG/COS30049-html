import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "forecasts.db"


def connect():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db():
    with connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS forecasts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                population INTEGER NOT NULL,
                income INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                reason TEXT NOT NULL DEFAULT '',
                focus_category TEXT NOT NULL DEFAULT 'car',
                focus_fuel TEXT NOT NULL DEFAULT 'petrol'
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS forecast_rows (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                forecast_id INTEGER NOT NULL,
                category TEXT NOT NULL,
                fuel TEXT NOT NULL,
                count INTEGER NOT NULL,
                FOREIGN KEY (forecast_id) REFERENCES forecasts(id) ON DELETE CASCADE
            )
            """
        )
        existing = {row[1] for row in connection.execute("PRAGMA table_info(forecasts)")}
        for column, definition in (
            ("reason", "TEXT NOT NULL DEFAULT ''"),
            ("focus_category", "TEXT NOT NULL DEFAULT 'car'"),
            ("focus_fuel", "TEXT NOT NULL DEFAULT 'petrol'"),
        ):
            if column not in existing:
                connection.execute(f"ALTER TABLE forecasts ADD COLUMN {column} {definition}")
        init_notices()


def save_forecast(name, reason, focus_category, focus_fuel, population, income, predictions):
    created_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    with connect() as connection:
        cursor = connection.execute(
            """
            INSERT INTO forecasts
                (name, reason, focus_category, focus_fuel, population, income, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (name, reason, focus_category, focus_fuel, population, income, created_at),
        )
        forecast_id = cursor.lastrowid
        connection.executemany(
            "INSERT INTO forecast_rows (forecast_id, category, fuel, count) VALUES (?, ?, ?, ?)",
            [(forecast_id, category, fuel, int(count)) for category, fuel, count in predictions],
        )
    return get_forecast(forecast_id)


def list_forecasts():
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT
                id, name, reason, focus_category, focus_fuel, population, income, created_at,
                (
                    SELECT count FROM forecast_rows
                    WHERE forecast_id = forecasts.id
                      AND category = forecasts.focus_category
                      AND fuel = forecasts.focus_fuel
                ) AS focus_count
            FROM forecasts
            ORDER BY id DESC
            """
        ).fetchall()
    return [dict(row) for row in rows]


def get_forecast(forecast_id):
    with connect() as connection:
        row = connection.execute(
            """
            SELECT id, name, reason, focus_category, focus_fuel, population, income, created_at
            FROM forecasts WHERE id = ?
            """,
            (forecast_id,),
        ).fetchone()
        if row is None:
            return None
        items = connection.execute(
            """
            SELECT category, fuel, count
            FROM forecast_rows
            WHERE forecast_id = ?
            ORDER BY category, fuel
            """,
            (forecast_id,),
        ).fetchall()
    record = dict(row)
    record["predictions"] = [[item["category"], item["fuel"], item["count"]] for item in items]
    return record


def delete_forecast(forecast_id):
    with connect() as connection:
        cursor = connection.execute("DELETE FROM forecasts WHERE id = ?", (forecast_id,))
        return cursor.rowcount > 0


def init_notices():
    with connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS notices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL,
                name TEXT NOT NULL,
                reason TEXT NOT NULL DEFAULT '',
                focus_category TEXT NOT NULL,
                focus_fuel TEXT NOT NULL,
                population INTEGER NOT NULL,
                income INTEGER NOT NULL,
                focus_count INTEGER,
                created_at TEXT NOT NULL,
                seen INTEGER NOT NULL DEFAULT 0
            )
            """
        )


def add_notice(kind, name, reason, category, fuel, population, income, focus_count):
    created_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    with connect() as connection:
        connection.execute(
            """
            INSERT INTO notices
                (kind, name, reason, focus_category, focus_fuel, population, income, focus_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (kind, name, reason, category, fuel, population, income, focus_count, created_at),
        )


def list_notices():
    with connect() as connection:
        rows = connection.execute(
            """
            SELECT id, kind, name, reason, focus_category, focus_fuel,
                   population, income, focus_count, created_at, seen
            FROM notices
            ORDER BY id DESC
            """
        ).fetchall()
        unread = connection.execute("SELECT COUNT(*) FROM notices WHERE seen = 0").fetchone()[0]
    return {"unread": unread, "items": [dict(row) for row in rows]}


def mark_notices_seen():
    with connect() as connection:
        connection.execute("UPDATE notices SET seen = 1 WHERE seen = 0")
