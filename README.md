# YProfy

지속적인 연습이 필요한 기술의 **기량 유지 상태**를 추적하는 웹 앱입니다.

비행 시뮬레이션, 악기 연주, 외국어 등 꾸준한 연습이 필요한 분야의 스킬을 체계적으로 관리하고, 얼마나 오래 연습하지 않았는지 시각적으로 확인할 수 있습니다.

## Features

- **카테고리 > 아이템 > 스킬** 3단계 구조로 자유롭게 분류
- **연습 세션 기록** — 날짜, 소요 시간, 자기 평가(1-5), 메모
- **기량 감소(Decay) 시각화** — 스킬별 상태를 초록/노랑/빨강으로 표시
- **대시보드** — 전체 통계, 가장 오래된 스킬 경고, 연습 빈도 차트

### 예시: 비행 시뮬레이션

| Category | Item | Skills |
|---|---|---|
| Flight Simulation | F-16C Viper | Takeoff, Landing, A2A Combat, A2G Strike |
| Flight Simulation | F/A-18C Hornet | Carrier Landing, BVR, CAS |

## Tech Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS v4
- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite (sql.js)
- **Libraries:** React Query, Recharts, React Router, Lucide Icons, date-fns, Zod

## Getting Started

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (서버 + 클라이언트 동시)
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001

## Usage

1. **Settings**에서 카테고리 생성 (예: "Flight Simulation", decay 7일)
2. 카테고리 페이지에서 **아이템 추가** (예: F-16C Viper)
3. 아이템 내 **스킬 추가** (예: Takeoff, Landing, A2A)
4. **Log Session** 버튼으로 연습 기록
5. **Dashboard**에서 전체 기량 상태 확인

## Decay Logic

각 스킬의 상태는 마지막 연습 이후 경과일에 따라 결정됩니다:

| 상태 | 조건 | 의미 |
|---|---|---|
| Fresh (초록) | decay_days의 50% 이내 | 기량 유지 중 |
| Warming (노랑) | decay_days의 50% ~ 100% | 곧 연습 필요 |
| Stale (빨강) | decay_days 초과 또는 기록 없음 | 기량 감소 위험 |

## License

MIT
