-- ============================================
-- Migration: 다중 사용자 지원 (user_id 추가)
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 1. 모든 테이블에 user_id 컬럼 추가 (nullable - 기존 데이터 보존)

ALTER TABLE categories ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE items ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE skills ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE sessions ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- 2. 인덱스 추가

CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_items_user ON items(user_id);
CREATE INDEX idx_skills_user ON skills(user_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- 3. 기존 RLS 정책 삭제

DROP POLICY IF EXISTS "Allow all on categories" ON categories;
DROP POLICY IF EXISTS "Allow all on items" ON items;
DROP POLICY IF EXISTS "Allow all on skills" ON skills;
DROP POLICY IF EXISTS "Allow all on sessions" ON sessions;

-- 4. 사용자별 RLS 정책 생성

CREATE POLICY "own_select" ON categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON categories FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own_select" ON items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON items FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own_select" ON skills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON skills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON skills FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON skills FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own_select" ON sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON sessions FOR DELETE USING (auth.uid() = user_id);

-- 5. RPC 함수 업데이트 (user_id 필터 추가)

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
    WHERE c.user_id = auth.uid()
    GROUP BY c.id, c.name, c.icon, c.decay_days, i.id, i.name, s.id, s.name, s.decay_days
    ORDER BY c.name, i.name, s.name;
END;
$$ LANGUAGE plpgsql;

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
        (SELECT COUNT(*) FROM categories WHERE user_id = auth.uid()),
        (SELECT COUNT(*) FROM skills WHERE user_id = auth.uid()),
        (SELECT COUNT(*) FROM sessions WHERE user_id = auth.uid()),
        (SELECT COUNT(*) FROM sessions WHERE user_id = auth.uid() AND practiced_at >= (today_date::DATE - INTERVAL '7 days')::TEXT);
END;
$$ LANGUAGE plpgsql;

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
    WHERE c.user_id = auth.uid()
    GROUP BY s.id, s.name, i.name, c.name
    ORDER BY CASE WHEN MAX(se.practiced_at) IS NULL THEN 999999
             ELSE (today_date::DATE - MAX(se.practiced_at)::DATE)::INTEGER END DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

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
          AND se.user_id = auth.uid()
          AND se.practiced_at >= (CURRENT_DATE - (p_days || ' days')::INTERVAL)::TEXT
        GROUP BY se.practiced_at::DATE
        ORDER BY se.practiced_at::DATE;
    ELSE
        RETURN QUERY
        SELECT se.practiced_at::DATE::TEXT, COUNT(*)
        FROM sessions se
        WHERE se.user_id = auth.uid()
          AND se.practiced_at >= (CURRENT_DATE - (p_days || ' days')::INTERVAL)::TEXT
        GROUP BY se.practiced_at::DATE
        ORDER BY se.practiced_at::DATE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 기존 데이터 마이그레이션 (Google 로그인 후 실행)
-- YOUR-UUID를 실제 사용자 UUID로 교체하세요
-- ============================================
-- UPDATE categories SET user_id = 'YOUR-UUID' WHERE user_id IS NULL;
-- UPDATE items SET user_id = 'YOUR-UUID' WHERE user_id IS NULL;
-- UPDATE skills SET user_id = 'YOUR-UUID' WHERE user_id IS NULL;
-- UPDATE sessions SET user_id = 'YOUR-UUID' WHERE user_id IS NULL;
-- ALTER TABLE categories ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE items ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE skills ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE sessions ALTER COLUMN user_id SET NOT NULL;
