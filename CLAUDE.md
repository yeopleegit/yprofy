# YProficiency

지속적인 연습이 필요한 기술의 기량 유지 상태를 추적하는 웹 앱.

## Tech Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS v4
- **Backend:** Node.js + Express + TypeScript
- **DB:** SQLite via sql.js (순수 JS, 네이티브 컴파일 불필요)
- **Key Libraries:** @tanstack/react-query, recharts, react-router-dom, lucide-react, date-fns, zod, react-hot-toast

## Project Structure

```
yproficiency/
├── package.json          # npm workspaces root
├── server/               # Express API (port 3001)
│   └── src/
│       ├── index.ts      # 엔트리 (async init for sql.js)
│       ├── seed.ts       # 데모 시드 데이터
│       ├── db/           # connection.ts, helpers.ts, schema.sql
│       └── routes/       # categories, items, skills, sessions, dashboard, data
├── client/               # Vite React app (port 5173)
│   └── src/
│       ├── api/client.ts # fetch wrapper for /api/v1
│       ├── components/   # shared/, sessions/
│       ├── pages/        # DashboardPage, CategoryPage, SettingsPage
│       └── lib/decay.ts  # decay 계산 로직
└── shared/types.ts       # 공유 TypeScript 타입
```

## Commands

```bash
npm run dev              # 서버 + 클라이언트 동시 실행 (concurrently)
npm run dev:server       # 서버만 실행 (port 3001)
npm run dev:client       # 클라이언트만 실행 (port 5173)
npm run seed -w server   # 데모 시드 데이터 생성
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
- `GET/POST /categories/:catId/items`, `GET/PUT/DELETE /items/:id`
- `GET/POST /items/:itemId/skills`, `PUT/DELETE /skills/:id`
- `GET/POST /skills/:skillId/sessions`, `PUT/DELETE /sessions/:id`
- `GET /dashboard/summary` — 전체 decay 상태 포함 대시보드
- `GET /dashboard/stats/frequency?skillId=&period=` — 연습 빈도 통계
- `GET /data/export`, `POST /data/import` — JSON 데이터 백업/복원

## Decay Logic

`decay_days` 기준으로 스킬 상태를 3단계로 표시:
- **fresh (초록):** 마지막 연습이 decay_days * 0.5 이내
- **warming (노랑):** decay_days * 0.5 ~ decay_days 사이
- **stale (빨강):** decay_days 초과 또는 연습 기록 없음

## DB

sql.js 사용 (better-sqlite3는 Windows에서 node-gyp/Python 필요하여 사용 불가).
DB 파일: `server/data/proficiency.db` (gitignored). 삭제하면 리셋.
`server/src/db/helpers.ts`에 queryAll, queryOne, execute, insert 헬퍼 함수 제공.

## Notes

- Vite dev server가 `/api` 요청을 localhost:3001로 프록시함
- Tailwind v4 사용 — `@import "tailwindcss"` 방식 (tailwind.config.js 없음)
- sql.js는 비동기 초기화 필요 → `initDb()` 후 서버 시작
- 매 write 작업마다 `saveDb()`로 디스크에 flush
- 반응형 디자인: lg(1024px) 기준, 모바일에서 햄버거 메뉴 + 슬라이드 사이드바
- 삭제 작업은 ConfirmDialog로 확인 후 실행
- GitHub repo: https://github.com/yeopleegit/yproficiency
