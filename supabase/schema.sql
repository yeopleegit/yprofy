-- ============================================
-- YProficiency - Supabase PostgreSQL Schema
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 1. 테이블 생성

CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    icon        TEXT,
    decay_days  INTEGER NOT NULL DEFAULT 14,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE items (
    id          SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    icon        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE skills (
    id                    SERIAL PRIMARY KEY,
    item_id               INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    name                  TEXT NOT NULL,
    description           TEXT,
    decay_days            INTEGER,
    target_frequency_days INTEGER,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
    id               SERIAL PRIMARY KEY,
    skill_id         INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    practiced_at     TEXT NOT NULL,
    duration_minutes INTEGER,
    rating           INTEGER CHECK(rating BETWEEN 1 AND 5),
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 인덱스

CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_skills_item ON skills(item_id);
CREATE INDEX idx_sessions_skill ON sessions(skill_id);
CREATE INDEX idx_sessions_practiced_at ON sessions(practiced_at);

-- 3. updated_at 자동 갱신 트리거

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER items_updated_at BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER skills_updated_at BEFORE UPDATE ON skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. 대시보드 요약 함수 (복잡한 JOIN + 집계)

CREATE OR REPLACE FUNCTION dashboard_summary(today_date TEXT)
RETURNS TABLE (
    category_id INTEGER,
    category_name TEXT,
    category_icon TEXT,
    category_decay_days INTEGER,
    item_id INTEGER,
    item_name TEXT,
    skill_id INTEGER,
    skill_name TEXT,
    skill_decay_days INTEGER,
    last_practiced TEXT,
    total_sessions BIGINT,
    avg_rating NUMERIC,
    days_since INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id, c.name, c.icon,
        c.decay_days,
        i.id, i.name,
        s.id, s.name, s.decay_days,
        MAX(se.practiced_at),
        COUNT(se.id),
        ROUND(AVG(se.rating), 1),
        (today_date::DATE - MAX(se.practiced_at)::DATE)::INTEGER
    FROM categories c
    LEFT JOIN items i ON i.category_id = c.id
    LEFT JOIN skills s ON s.item_id = i.id
    LEFT JOIN sessions se ON se.skill_id = s.id
    GROUP BY c.id, c.name, c.icon, c.decay_days, i.id, i.name, s.id, s.name, s.decay_days
    ORDER BY c.name, i.name, s.name;
END;
$$ LANGUAGE plpgsql;

-- 5. 대시보드 통계 함수

CREATE OR REPLACE FUNCTION dashboard_stats(today_date TEXT)
RETURNS TABLE (
    total_categories BIGINT,
    total_skills BIGINT,
    total_sessions BIGINT,
    sessions_this_week BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM categories),
        (SELECT COUNT(*) FROM skills),
        (SELECT COUNT(*) FROM sessions),
        (SELECT COUNT(*) FROM sessions WHERE practiced_at >= (today_date::DATE - INTERVAL '7 days')::TEXT);
END;
$$ LANGUAGE plpgsql;

-- 6. 가장 오래된 스킬 조회 함수

CREATE OR REPLACE FUNCTION most_stale_skill(today_date TEXT)
RETURNS TABLE (
    skill_name TEXT,
    item_name TEXT,
    category_name TEXT,
    days_since INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.name, i.name, c.name,
        (today_date::DATE - MAX(se.practiced_at)::DATE)::INTEGER
    FROM skills s
    JOIN items i ON i.id = s.item_id
    JOIN categories c ON c.id = i.category_id
    LEFT JOIN sessions se ON se.skill_id = s.id
    GROUP BY s.id, s.name, i.name, c.name
    ORDER BY CASE WHEN MAX(se.practiced_at) IS NULL THEN 999999
             ELSE (today_date::DATE - MAX(se.practiced_at)::DATE)::INTEGER END DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 7. 연습 빈도 함수

CREATE OR REPLACE FUNCTION session_frequency(p_skill_id INTEGER DEFAULT NULL, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    date TEXT,
    count BIGINT
) AS $$
BEGIN
    IF p_skill_id IS NOT NULL THEN
        RETURN QUERY
        SELECT se.practiced_at::DATE::TEXT, COUNT(*)
        FROM sessions se
        WHERE se.skill_id = p_skill_id
          AND se.practiced_at >= (CURRENT_DATE - (p_days || ' days')::INTERVAL)::TEXT
        GROUP BY se.practiced_at::DATE
        ORDER BY se.practiced_at::DATE;
    ELSE
        RETURN QUERY
        SELECT se.practiced_at::DATE::TEXT, COUNT(*)
        FROM sessions se
        WHERE se.practiced_at >= (CURRENT_DATE - (p_days || ' days')::INTERVAL)::TEXT
        GROUP BY se.practiced_at::DATE
        ORDER BY se.practiced_at::DATE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Row Level Security (RLS) - 퍼블릭 접근 허용 (개인 앱)

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on items" ON items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on skills" ON skills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
