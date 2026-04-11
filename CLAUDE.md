# YProficiency

지속적인 연습이 필요한 기술의 기량 유지 상태를 추적하는 웹 앱.

## Tech Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS v4
- **Backend (로컬):** Node.js + Express + TypeScript + SQLite (sql.js)
- **Backend (배포):** Vercel Serverless Functions + Supabase (PostgreSQL)
- **Key Libraries:** @tanstack/react-query, recharts, react-router-dom, lucide-react, date-fns, zod, react-hot-toast, @supabase/supabase-js

## Project Structure

```
yproficiency/
├── package.json          # npm workspaces root
├── api/                  # Vercel serverless (배포용)
│   └── handler.ts        # 단일 catch-all API handler (모든 /api/v1/* 라우트)
├── lib/
│   └── supabase.ts       # Supabase 클라이언트
├── supabase/
│   ├── schema.sql        # PostgreSQL 스키마 + RPC 함수
│   └── migrations/       # DB 마이그레이션 SQL
├── scripts/
│   └── seed.ts           # Supabase 시드 스크립트
├── server/               # Express API (로컬 개발용, port 3001)
│   └── src/
│       ├── index.ts      # 엔트리 (async init for sql.js)
│       ├── seed.ts       # 로컬 데모 시드 데이터
│       ├── db/           # connection.ts, helpers.ts, schema.sql
│       └── routes/       # categories, items, skills, sessions, dashboard, data
├── client/               # Vite React app (port 5173)
│   └── src/
│       ├── api/client.ts # fetch wrapper for /api/v1
│       ├── components/   # shared/, sessions/, auth/
│       ├── contexts/     # AuthContext.tsx
│       ├── pages/        # DashboardPage, CategoryPage, SettingsPage, LoginPage
│       └── lib/          # decay.ts, supabase.ts (브라우저용)
├── shared/types.ts       # 공유 TypeScript 타입
└── vercel.json           # Vercel 빌드/라우팅 설정
```

## Commands

```bash
npm run dev              # 로컬: 서버 + 클라이언트 동시 실행 (concurrently)
npm run dev:server       # 로컬: 서버만 실행 (port 3001)
npm run dev:client       # 로컬: 클라이언트만 실행 (port 5173)
npm run seed -w server   # 로컬: 데모 시드 데이터 생성
npm run seed             # Supabase: 시드 데이터 생성
vercel --prod            # Vercel 프로덕션 배포
```

## Data Model

categories → items → skills → sessions (4계층 구조)

- **categories**: 최상위 분류 (예: Flight Simulation). `decay_days`로 기량 감소 기준일 설정.
- **items**: 카테고리 내 아이템 (예: F-16C Viper)
- **skills**: 아이템 내 스킬 (예: Takeoff, Landing, A2A). `decay_days`로 카테고리 기본값 오버라이드 가능.
- **sessions**: 연습 기록 (날짜, 시간, 평점 1-5, 메모)

CASCADE 삭제 적용. 카테고리 삭제 시 하위 데이터 전부 삭제됨.

## API

모든 엔드포인트 prefix: `/api/v1`

- `GET/POST /categories`, `GET/PUT/DELETE /categories/:id`
- `GET/POST /categories/:catId/items`, `GET/PUT/DELETE /items/:id`, `POST /items/:id/copy`
- `GET/POST /items/:itemId/skills`, `PUT/DELETE /skills/:id`, `POST /skills/:id/copy`
- `GET/POST /skills/:skillId/sessions`, `PUT/DELETE /sessions/:id`
- `GET /dashboard/summary?today=YYYY-MM-DD` — 전체 decay 상태 포함 대시보드 (today: 클라이언트 로컬타임 기준 날짜)
- `GET /dashboard/stats/frequency?skillId=&period=` — 연습 빈도 통계
- `GET /data/export`, `POST /data/import` — JSON 데이터 백업/복원

## Decay Logic

`decay_days` 기준으로 스킬 상태를 3단계로 표시:
- **fresh (초록):** 마지막 연습이 decay_days * 0.5 이내
- **warming (노랑):** decay_days * 0.5 ~ decay_days 사이
- **stale (빨강):** decay_days 초과 또는 연습 기록 없음

## DB

### 로컬 (SQLite)
sql.js 사용 (better-sqlite3는 Windows에서 node-gyp/Python 필요하여 사용 불가).
DB 파일: `server/data/proficiency.db` (gitignored). 삭제하면 리셋.
`server/src/db/helpers.ts`에 queryAll, queryOne, execute, insert 헬퍼 함수 제공.

### 배포 (Supabase PostgreSQL)
- `supabase/schema.sql`: 테이블, 인덱스, RLS 정책, RPC 함수 (dashboard_summary, dashboard_stats, most_stale_skill, session_frequency)
- `lib/supabase.ts`: @supabase/supabase-js 클라이언트 + `createAuthClient()` 팩토리
- `api/handler.ts`: 단일 Vercel serverless function, JWT 인증 + 내부 라우터로 모든 API 분기
- 환경변수: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (`.env.local` / Vercel 환경변수)
- RLS: `auth.uid() = user_id` 기반 사용자별 데이터 격리

## Authentication

- **Supabase Auth + Google OAuth** 기반 다중 사용자 지원
- `client/src/contexts/AuthContext.tsx`: 인증 컨텍스트 (signInWithGoogle, signOut, user/session 상태)
- `client/src/lib/supabase.ts`: 브라우저용 Supabase 클라이언트 (VITE_ 환경변수 사용)
- `client/src/pages/LoginPage.tsx`: Google 로그인 페이지
- `client/src/components/auth/ProtectedRoute.tsx`: 미인증 시 /login 리다이렉트
- API 요청 시 `Authorization: Bearer <token>` 헤더 자동 첨부 (client/src/api/client.ts)
- 모든 테이블에 `user_id` 컬럼 → RLS로 자동 필터링
- 로컬 개발 서버는 인증 없이 `user_id = 'local-dev-user'` 사용

## Dark Mode

- Tailwind v4 class 기반 다크모드 (`@custom-variant dark`)
- `useDarkMode` 훅: localStorage에 테마 저장, OS 설정(`prefers-color-scheme`) 감지
- `document.documentElement`에 `dark` 클래스 토글
- CSS 변수로 recharts Tooltip 스타일링 (`--tooltip-bg`, `--tooltip-border`, `--tooltip-text`)

## UI 언어

- 모든 사용자 대면 텍스트는 한글로 작성
- 기술 용어(JSON, decay_days 등)는 영문 그대로 사용

## Dashboard

- 대시보드에는 주의(warming)/감소(stale) 상태 스킬만 표시, 양호(fresh)는 숨김
- 연습한 지 오래된 스킬부터 정렬
- 주의/감소 스킬이 없는 아이템·카테고리는 자동 숨김
- 모든 스킬이 양호하면 "모든 스킬이 양호합니다" 안내 표시
- 날짜 계산은 클라이언트 로컬타임 기준 (today 쿼리 파라미터로 서버 전달)

## Notes

- Vite dev server가 `/api` 요청을 localhost:3001로 프록시함
- Tailwind v4 사용 — `@import "tailwindcss"` 방식 (tailwind.config.js 없음)
- sql.js는 비동기 초기화 필요 → `initDb()` 후 서버 시작
- 매 write 작업마다 `saveDb()`로 디스크에 flush
- 반응형 디자인: lg(1024px) 기준, 모바일에서 햄버거 메뉴 + 슬라이드 사이드바
- 삭제 작업은 ConfirmDialog로 확인 후 실행
- Item/Skill 복사: "Copy of {이름}"으로 생성, 세션 미복사 (Stale 초기화)
- GitHub repo: https://github.com/yeopleegit/yproficiency
- 배포 URL: https://yprofy.vercel.app
- Vercel rewrite로 `/api/v1/*` → `/api/handler?__path=*` 라우팅 (Hobby 플랜 12개 함수 제한 회피)
