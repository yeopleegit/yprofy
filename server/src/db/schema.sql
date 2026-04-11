CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL DEFAULT 'local-dev-user',
    name        TEXT NOT NULL,
    description TEXT,
    icon        TEXT,
    decay_days  INTEGER NOT NULL DEFAULT 14,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL DEFAULT 'local-dev-user',
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    icon        TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skills (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id               TEXT NOT NULL DEFAULT 'local-dev-user',
    item_id               INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    name                  TEXT NOT NULL,
    description           TEXT,
    decay_days            INTEGER,
    target_frequency_days INTEGER,
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          TEXT NOT NULL DEFAULT 'local-dev-user',
    skill_id         INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    practiced_at     TEXT NOT NULL,
    duration_minutes INTEGER,
    rating           INTEGER CHECK(rating BETWEEN 1 AND 5),
    notes            TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_skills_item ON skills(item_id);
CREATE INDEX IF NOT EXISTS idx_sessions_skill ON sessions(skill_id);
CREATE INDEX IF NOT EXISTS idx_sessions_practiced_at ON sessions(practiced_at);
