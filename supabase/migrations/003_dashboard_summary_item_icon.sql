-- dashboard_summary: 응답에 item_icon 컬럼 추가
-- RETURNS TABLE 변경은 CREATE OR REPLACE로 불가능하므로 DROP 후 재생성한다.

DROP FUNCTION IF EXISTS dashboard_summary(TEXT);

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
    GROUP BY c.id, c.name, c.icon, c.decay_days, i.id, i.name, i.icon, s.id, s.name, s.decay_days
    ORDER BY c.name, i.name, s.name;
END;
$$ LANGUAGE plpgsql;
