-- ============================================
-- 004: categories.sort_order 추가 (드래그 순서 변경 지원)
-- ============================================

-- 1. sort_order 컬럼 추가
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 2. 기존 행 backfill: 사용자별로 이름순 초기 순서 부여
WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY name) AS rn
    FROM categories
)
UPDATE categories c
SET sort_order = ranked.rn
FROM ranked
WHERE c.id = ranked.id AND c.sort_order = 0;

-- 3. dashboard_summary RPC 를 sort_order 기준으로 정렬하도록 갱신
CREATE OR REPLACE FUNCTION dashboard_summary(today_date TEXT)
RETURNS TABLE (
    category_id INTEGER,
    category_name TEXT,
    category_icon TEXT,
    category_decay_days INTEGER,
    item_id INTEGER,
    item_name TEXT,
    item_icon TEXT,
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
        i.id, i.name, i.icon,
        s.id, s.name, s.decay_days,
        MAX(se.practiced_at),
        COUNT(se.id),
        ROUND(AVG(se.rating), 1),
        (today_date::DATE - MAX(se.practiced_at)::DATE)::INTEGER
    FROM categories c
    LEFT JOIN items i ON i.category_id = c.id
    LEFT JOIN skills s ON s.item_id = i.id
    LEFT JOIN sessions se ON se.skill_id = s.id
    WHERE c.user_id = auth.uid()
    GROUP BY c.id, c.name, c.icon, c.decay_days, c.sort_order, i.id, i.name, i.icon, s.id, s.name, s.decay_days
    ORDER BY c.sort_order, c.name, i.name, s.name;
END;
$$ LANGUAGE plpgsql;
