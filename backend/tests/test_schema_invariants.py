"""
Schema-invariant tests — run WITHOUT a live database.

These statically analyze the Supabase project files so CI can catch
schema/seed regressions cheaply:

  * backend/supabase/migrations/*.sql  (schema source of truth)
  * backend/supabase/seed.sql          (deterministic, PII-free fixtures)
  * backend/supabase/config.toml       (local project configuration)

They also import the SQLAlchemy models and assert every mapped column
exists in the migrations, so model/migration drift fails fast.
"""
import re
import uuid
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
SUPABASE_DIR = BACKEND_DIR / "supabase"
MIGRATIONS_DIR = SUPABASE_DIR / "migrations"
SEED_PATH = SUPABASE_DIR / "seed.sql"
CONFIG_PATH = SUPABASE_DIR / "config.toml"

EXPECTED_TABLES = {
    "users",
    "flavor_profiles",
    "venues",
    "dishes",
    "reviews",
    "media",
    "flavor_audit_logs",
}

EXPECTED_INDEXES = {
    "idx_venues_google_place_id": ("venues", "google_place_id"),
    "idx_dishes_venue_id": ("dishes", "venue_id"),
    "idx_reviews_user_id": ("reviews", "user_id"),
    "idx_reviews_venue_id": ("reviews", "venue_id"),
    "idx_media_review_id": ("media", "review_id"),
}

MIGRATION_NAME_RE = re.compile(r"^\d{14}_[a-z0-9_]+\.sql$")


# ── tiny SQL "parser" (good enough for files this repo owns) ─────────────


def _strip_comments(sql: str) -> str:
    return re.sub(r"--[^\n]*", "", sql)


def _split_top_level(text: str) -> list:
    """Split on commas that are outside parens and single-quoted strings."""
    parts, depth, in_str, cur = [], 0, False, []
    for ch in text:
        if in_str:
            cur.append(ch)
            if ch == "'":
                in_str = False
            continue
        if ch == "'":
            in_str = True
            cur.append(ch)
        elif ch == "(":
            depth += 1
            cur.append(ch)
        elif ch == ")":
            depth -= 1
            cur.append(ch)
        elif ch == "," and depth == 0:
            parts.append("".join(cur).strip())
            cur = []
        else:
            cur.append(ch)
    tail = "".join(cur).strip()
    if tail:
        parts.append(tail)
    return parts


def _parse_create_tables(sql: str) -> dict:
    """Return {table: {column: normalized definition string}}."""
    tables = {}
    for m in re.finditer(r"CREATE TABLE\s+(\w+)\s*\(", sql):
        name, i, depth, start = m.group(1), m.end(), 1, m.end()
        while depth:
            ch = sql[i]
            depth += ch == "("
            depth -= ch == ")"
            i += 1
        body = sql[start : i - 1]
        cols = {}
        for entry in _split_top_level(body):
            first = entry.split()[0].upper()
            if first in {"CONSTRAINT", "PRIMARY", "FOREIGN", "UNIQUE", "CHECK"}:
                continue  # table-level constraint, not a column
            colname = entry.split()[0]
            cols[colname] = re.sub(r"\s+", " ", entry).strip()
        tables[name] = cols

    for m in re.finditer(r"ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+([^;]+);", sql, re.IGNORECASE):
        name, coldef = m.group(1), m.group(2).strip()
        colname = coldef.split()[0]
        tables.setdefault(name, {})[colname] = re.sub(r"\s+", " ", coldef).strip()

    return tables


def _parse_inserts(sql: str) -> list:
    """Return [(table, [columns], [row values as python objects])]."""
    inserts = []
    for m in re.finditer(r"INSERT INTO\s+(\w+)\s*\(([^)]*)\)\s*VALUES", sql):
        table = m.group(1)
        columns = [c.strip() for c in m.group(2).split(",")]
        rows, i = [], m.end()
        while True:
            while sql[i] in " \n\t\r":
                i += 1
            if sql[i] != "(":
                break
            depth, in_str, start = 1, False, i + 1
            i += 1
            while depth:
                ch = sql[i]
                if in_str:
                    in_str = ch != "'"
                elif ch == "'":
                    in_str = True
                elif ch == "(":
                    depth += 1
                elif ch == ")":
                    depth -= 1
                i += 1
            rows.append([_parse_value(v) for v in _split_top_level(sql[start : i - 1])])
            while sql[i] in " \n\t\r":
                i += 1
            if sql[i] == ",":
                i += 1
                continue
            break
        inserts.append((table, columns, rows))
    return inserts


def _parse_value(raw: str):
    raw = raw.strip()
    if raw.startswith("'") and raw.endswith("'"):
        return raw[1:-1].replace("''", "'")
    if raw.upper() in {"NULL", "TRUE", "FALSE"}:
        return {"NULL": None, "TRUE": True, "FALSE": False}[raw.upper()]
    return float(raw)


# ── fixtures ─────────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def migration_files():
    assert MIGRATIONS_DIR.is_dir(), "backend/supabase/migrations is missing"
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    assert files, "no migration files found"
    return files


@pytest.fixture(scope="module")
def migration_sql(migration_files):
    return _strip_comments(
        "\n".join(f.read_text(encoding="utf-8") for f in migration_files)
    )


@pytest.fixture(scope="module")
def tables(migration_sql):
    return _parse_create_tables(migration_sql)


@pytest.fixture(scope="module")
def seed_raw():
    assert SEED_PATH.is_file(), "backend/supabase/seed.sql is missing"
    return SEED_PATH.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def seed_sql(seed_raw):
    return _strip_comments(seed_raw)


@pytest.fixture(scope="module")
def seed_inserts(seed_sql):
    inserts = _parse_inserts(seed_sql)
    assert inserts, "seed.sql contains no INSERT statements"
    return inserts


def _seeded(seed_inserts, table, column):
    """All values inserted into table.column across every INSERT."""
    out = []
    for tbl, cols, rows in seed_inserts:
        if tbl == table and column in cols:
            idx = cols.index(column)
            out.extend(row[idx] for row in rows)
    return out


# ── migration layout / single source of truth ────────────────────────────


def test_single_schema_workflow():
    assert not (BACKEND_DIR / "schema.sql").exists(), (
        "backend/schema.sql must not come back — the Supabase migrations "
        "in backend/supabase/migrations are the only schema source"
    )
    for legacy in ("init_db.py", "check_rds.py"):
        assert not (BACKEND_DIR / legacy).exists(), (
            f"legacy RDS helper backend/{legacy} must stay deleted"
        )


def test_migrations_are_timestamped_and_ordered(migration_files):
    names = [f.name for f in migration_files]
    for name in names:
        assert MIGRATION_NAME_RE.match(name), (
            f"{name!r} must look like <YYYYMMDDhhmmss>_<snake_case>.sql"
        )
    stamps = [n.split("_", 1)[0] for n in names]
    assert stamps == sorted(stamps) and len(set(stamps)) == len(stamps), (
        "migration timestamps must be unique and ordered"
    )


def test_config_toml_is_present_and_sane():
    assert CONFIG_PATH.is_file(), "backend/supabase/config.toml is missing"
    text = CONFIG_PATH.read_text(encoding="utf-8")
    assert 'project_id = "justateit"' in text
    for section in ("[api]", "[db]", "[db.seed]", "[studio]"):
        assert section in text, f"config.toml is missing {section}"
    assert "major_version" in text
    assert 'sql_paths = ["./seed.sql"]' in text, "seed must be wired into db reset"


# ── schema shape ─────────────────────────────────────────────────────────


def test_migration_creates_exactly_expected_tables(tables):
    assert set(tables) == EXPECTED_TABLES


def test_expected_columns(tables):
    expected = {
        "users": {"id", "username", "display_name", "avatar_url", "bio",
                  "created_at", "updated_at"},
        "flavor_profiles": {"user_id", "spice", "acid", "umami", "sweet",
                            "texture", "review_count", "last_updated_at",
                            "points_count"},
        "venues": {"id", "google_place_id", "name", "vicinity", "lat", "lng",
                   "created_at"},
        "dishes": {"id", "venue_id", "name", "description", "base_spice",
                   "base_acid", "base_umami", "base_sweet", "base_texture",
                   "created_at", "cuisine"},
        "reviews": {"id", "user_id", "dish_id", "venue_id", "rating",
                    "comment", "created_at"},
        "media": {"id", "review_id", "media_url", "media_type", "created_at"},
        "flavor_audit_logs": {"id", "user_id", "review_id", "delta_spice",
                              "delta_acid", "delta_umami", "delta_sweet",
                              "delta_texture", "new_spice", "new_acid",
                              "new_umami", "new_sweet", "new_texture",
                              "created_at"},
    }
    for table, cols in expected.items():
        assert set(tables[table]) == cols, f"column drift in {table}"


def test_primary_keys(tables):
    assert "TEXT PRIMARY KEY" in tables["users"]["id"]
    assert "TEXT PRIMARY KEY" in tables["flavor_profiles"]["user_id"]
    for table in ("venues", "dishes", "reviews", "media", "flavor_audit_logs"):
        assert re.search(
            r"UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)", tables[table]["id"]
        ), f"{table}.id must be UUID with gen_random_uuid() default"


def test_foreign_key_actions(tables):
    fks = {
        ("flavor_profiles", "user_id"): ("users", "ON DELETE CASCADE"),
        ("dishes", "venue_id"): ("venues", "ON DELETE CASCADE"),
        ("reviews", "user_id"): ("users", "ON DELETE CASCADE"),
        ("reviews", "dish_id"): ("dishes", "ON DELETE CASCADE"),
        ("reviews", "venue_id"): ("venues", "ON DELETE SET NULL"),
        ("media", "review_id"): ("reviews", "ON DELETE CASCADE"),
        ("flavor_audit_logs", "user_id"): ("users", "ON DELETE CASCADE"),
        ("flavor_audit_logs", "review_id"): ("reviews", "ON DELETE SET NULL"),
    }
    for (table, column), (target, action) in fks.items():
        definition = tables[table][column]
        assert f"REFERENCES {target}" in definition, f"{table}.{column} FK target"
        assert action in definition, f"{table}.{column} must be {action}"


def test_rating_range_check(tables):
    definition = tables["reviews"]["rating"]
    assert "NOT NULL" in definition
    assert re.search(r"CHECK \(rating >= 1 AND rating <= 5\)", definition)


def test_flavor_profile_defaults_preserved(tables):
    defaults = {"spice": "0.35", "acid": "0.50", "umami": "0.70",
                "sweet": "0.30", "texture": "0.45"}
    for column, value in defaults.items():
        assert f"DEFAULT {value}" in tables["flavor_profiles"][column]
    assert "DEFAULT 0" in tables["flavor_profiles"]["review_count"]


def test_expected_indexes(migration_sql):
    for index, (table, column) in EXPECTED_INDEXES.items():
        assert re.search(
            rf"CREATE INDEX {index} ON {table}\({column}\)", migration_sql
        ), f"missing index {index}"


def test_no_legacy_or_conditional_ddl(migration_sql):
    up = migration_sql.upper()
    assert "UUID-OSSP" not in up and "UUID_GENERATE_V4" not in up, (
        "use built-in gen_random_uuid(), not the uuid-ossp extension"
    )
    assert "CREATE EXTENSION" not in up, "schema must not require extensions"
    assert "IF NOT EXISTS" not in up, (
        "versioned migrations run exactly once — IF NOT EXISTS only hides drift"
    )


def test_rls_enabled_on_every_table(migration_sql, tables):
    enabled = set(
        re.findall(r"ALTER TABLE\s+(\w+)\s+ENABLE ROW LEVEL SECURITY", migration_sql)
    )
    assert enabled == set(tables), (
        f"RLS must be enabled on every table; missing: {set(tables) - enabled}"
    )


# ── SQLAlchemy models must not drift from the migrations ─────────────────


def test_models_match_migration(tables):
    from services.catalog_service.db import models as catalog_models  # noqa: F401
    from services.user_service.db import models as user_models  # noqa: F401
    from shared.database import Base

    mapped = {name: {c.name for c in table.columns}
              for name, table in Base.metadata.tables.items()}
    assert mapped, "no SQLAlchemy tables were mapped"
    for name, model_cols in mapped.items():
        assert name in tables, f"model table {name} missing from migration"
        missing = model_cols - set(tables[name])
        assert not missing, f"model columns absent from migration {name}: {missing}"


# ── seed data invariants ─────────────────────────────────────────────────


def test_seed_only_touches_schema_tables(seed_inserts, tables):
    assert {t for t, _, _ in seed_inserts} <= set(tables)


def test_seed_covers_every_table(seed_inserts):
    assert {t for t, _, _ in seed_inserts} == EXPECTED_TABLES, (
        "seed should exercise every table (and its FKs)"
    )


def test_seed_is_deterministic(seed_sql, seed_inserts, tables):
    volatile = re.compile(
        r"\b(now\s*\(|gen_random_uuid|uuid_generate|random\s*\(|"
        r"clock_timestamp|current_timestamp|current_date|localtimestamp)",
        re.IGNORECASE,
    )
    assert not volatile.search(seed_sql), (
        "seed.sql must only use fixed literals so every reset is identical"
    )
    pk = {"flavor_profiles": "user_id"}
    for table, cols, _ in seed_inserts:
        required = {pk.get(table, "id")}
        required |= {"created_at", "updated_at", "last_updated_at"} & set(tables[table])
        assert required <= set(cols), (
            f"seed INSERT into {table} must pin {required} explicitly "
            "(never rely on volatile column defaults)"
        )


def test_seed_uuids_are_valid_and_unique(seed_inserts):
    for table in EXPECTED_TABLES - {"users", "flavor_profiles"}:
        ids = _seeded(seed_inserts, table, "id")
        assert ids, f"no seeded ids for {table}"
        parsed = [uuid.UUID(v) for v in ids]
        assert len(set(parsed)) == len(parsed), f"duplicate seeded ids in {table}"


def test_seed_referential_integrity(seed_inserts):
    users = set(_seeded(seed_inserts, "users", "id"))
    venues = set(_seeded(seed_inserts, "venues", "id"))
    dishes = set(_seeded(seed_inserts, "dishes", "id"))
    reviews = set(_seeded(seed_inserts, "reviews", "id"))

    assert set(_seeded(seed_inserts, "flavor_profiles", "user_id")) <= users
    assert set(_seeded(seed_inserts, "dishes", "venue_id")) <= venues | {None}
    assert set(_seeded(seed_inserts, "reviews", "user_id")) <= users
    assert set(_seeded(seed_inserts, "reviews", "dish_id")) <= dishes
    assert set(_seeded(seed_inserts, "reviews", "venue_id")) <= venues | {None}
    assert set(_seeded(seed_inserts, "media", "review_id")) <= reviews
    assert set(_seeded(seed_inserts, "flavor_audit_logs", "user_id")) <= users
    assert set(_seeded(seed_inserts, "flavor_audit_logs", "review_id")) <= reviews | {None}


def test_seed_value_ranges(seed_inserts):
    for rating in _seeded(seed_inserts, "reviews", "rating"):
        assert 1 <= rating <= 5
    for dim in ("spice", "acid", "umami", "sweet", "texture"):
        for value in _seeded(seed_inserts, "flavor_profiles", dim):
            assert 0 <= value <= 1
        for value in _seeded(seed_inserts, "dishes", f"base_{dim}"):
            assert 0 <= value <= 1


def test_seed_profile_counts_match_reviews(seed_inserts):
    per_user = {}
    for user_id in _seeded(seed_inserts, "reviews", "user_id"):
        per_user[user_id] = per_user.get(user_id, 0) + 1
    profiles = dict(
        zip(
            _seeded(seed_inserts, "flavor_profiles", "user_id"),
            _seeded(seed_inserts, "flavor_profiles", "review_count"),
        )
    )
    for user_id, count in profiles.items():
        assert count == per_user.get(user_id, 0), (
            f"flavor_profiles.review_count out of sync for {user_id}"
        )


def test_seed_contains_no_pii(seed_raw, seed_inserts):
    email = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
    phone = re.compile(r"(?<!\d)\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?!\d)")
    ssn = re.compile(r"(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)")
    assert not email.search(seed_raw), "seed.sql must not contain email addresses"
    assert not phone.search(seed_raw), "seed.sql must not contain phone numbers"
    assert not ssn.search(seed_raw), "seed.sql must not contain SSN-like values"

    for user_id in _seeded(seed_inserts, "users", "id"):
        assert user_id.startswith("user_seed_"), (
            f"seeded user id {user_id!r} must be synthetic (user_seed_* prefix), "
            "never a real Clerk id"
        )
    for url in re.findall(r"https?://[^\s'\"]+", seed_raw):
        host = url.split("/")[2]
        assert host == "example.com" or host.endswith(".example.com"), (
            f"seed URLs must stay on example.com, found {url}"
        )
