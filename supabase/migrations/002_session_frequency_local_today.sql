-- session_frequency: 클라이언트 로컬타임 기준 today 파라미터 추가
-- 기존 시그니처(p_skill_id, p_days)를 호출하면 PostgreSQL이 새 정의와 인자 개수 차이로 인식하므로
-- 먼저 구버전을 DROP한 뒤 새 버전을 생성한다.

DROP FUNCTION IF EXISTS session_frequency(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION session_frequency(
    p_skill_id INTEGER DEFAULT NULL,
    p_days INTEGER DEFAULT 30,
    p_today TEXT DEFAULT NULL
)
RETURNS TABLE (
    date TEXT,
    count BIGINT
) AS $$
DECLARE
    anchor DATE := COALESCE(p_today::DATE, CURRENT_DATE);
BEGIN
    IF p_skill_id IS NOT NULL THEN
        RETURN QUERY
        SELECT se.practiced_at::DATE::TEXT, COUNT(*)
        FROM sessions se
        WHERE se.skill_id = p_skill_id
          AND se.user_id = auth.uid()
          AND se.practiced_at >= (anchor - (p_days || ' days')::INTERVAL)::TEXT
        GROUP BY se.practiced_at::DATE
        ORDER BY se.practiced_at::DATE;
    ELSE
        RETURN QUERY
        SELECT se.practiced_at::DATE::TEXT, COUNT(*)
        FROM sessions se
        WHERE se.user_id = auth.uid()
          AND se.practiced_at >= (anchor - (p_days || ' days')::INTERVAL)::TEXT
        GROUP BY se.practiced_at::DATE
        ORDER BY se.practiced_at::DATE;
    END IF;
END;
$$ LANGUAGE plpgsql;
