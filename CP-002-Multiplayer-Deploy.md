# CP-002 — 멀티플레이 백엔드 배포 가이드

> 이 문서는 **Cloudflare Worker 를 배포해서 Pomodoro Craft 에 진짜 멀티플레이를 켜는 법**을 다룹니다.
> Cloudflare 계정 생성부터 실제 동접자 표시까지 약 **15-30분** 이 걸려요.

---

## 🎯 배포 후에 얻는 것

- 🌱 **진짜 동시 접속자 수** — "Join 42 others focusing · LIVE"
- 🍅 **전 세계 오늘의 수확 카운터** (모든 유저 합계)
- 📣 **라이브 피드** — 다른 사람들이 방금 세션 완료한 기록 실시간 표시
- 🔥 **세션 기록 공유** — 본인 완료 시 다른 유저 화면에 뜸

---

## 📋 사전 요구사항

| 필요 | 없으면 |
|---|---|
| **Cloudflare 계정** | [cloudflare.com](https://cloudflare.com) 무료 가입 |
| **Node.js 18+** | [nodejs.org](https://nodejs.org) 설치 |
| **터미널** | macOS: Terminal.app / Windows: PowerShell |

---

## 🚀 단계별 배포 가이드

### Step 1 — wrangler CLI 설치

```bash
npm install -g wrangler
```

확인:
```bash
wrangler --version
# wrangler 3.78.x 같은 게 나와야 함
```

### Step 2 — Cloudflare 로그인

```bash
wrangler login
```

브라우저가 열리면 계정 로그인 후 권한 허용. 터미널에 `Successfully logged in` 이 뜨면 성공.

### Step 3 — Worker 프로젝트로 이동

```bash
cd /Users/steve/no_sync_project/pomodo_timer/worker
```

### Step 4 — 의존성 설치 (선택, 로컬 개발용)

```bash
npm install
```

`wrangler` 가 전역 설치돼 있으면 이 단계는 건너뛰어도 돼요.

### Step 5 — 배포 🚀

```bash
wrangler deploy
```

처음 배포하면 대화형으로 몇 가지를 물어봐요:
- Workers.dev 서브도메인 사용 여부 → **Yes**
- 서브도메인 이름 → **기본값 사용 (본인 Cloudflare 닉네임)**

성공하면 다음과 비슷한 출력이 나와요:

```
Published pomodoro-craft-api (1.23 sec)
  https://pomodoro-craft-api.steve-kim-0417.workers.dev
Current Version ID: xxxxxxxx-xxxx-xxxx
```

**이 URL 을 복사해두세요 ⚡** — 다음 단계에서 사용합니다.

### Step 6 — 건강 확인

브라우저에서 방금 받은 URL 의 `/health` 를 열어보세요:

```
https://pomodoro-craft-api.steve-kim-0417.workers.dev/health
```

`Pomodoro Craft API is running 🍅` 문구가 보이면 **Worker 가 정상 동작**하는 거예요.

그 다음 `/api/stats` 도 확인:

```
https://pomodoro-craft-api.steve-kim-0417.workers.dev/api/stats
```

JSON 응답이 와야 해요:
```json
{
  "onlineNow": 0,
  "today": { "sessions": 0, "minutes": 0 },
  "lifetime": { "sessions": 0, "minutes": 0 },
  "feed": []
}
```

### Step 7 — 프론트엔드 연결 (두 가지 방법)

#### 방법 A — 하드코딩 (권장, 영구 적용)

`/Users/steve/no_sync_project/pomodo_timer/index.html` 에서 다음 줄을 찾아 수정:

```javascript
// before
const DEFAULT_API = '';

// after — Step 5 에서 받은 URL 붙여넣기
const DEFAULT_API = 'https://pomodoro-craft-api.steve-kim-0417.workers.dev';
```

저장 → git commit → push → 몇 분 뒤 https://pomodoro-craft-api.steve-kim-0417.workers.dev/ 에서 자동으로 백엔드 연결됨.

#### 방법 B — URL 파라미터 (테스트용)

코드 수정 없이 URL 뒤에 `?api=...` 붙이기:

```
https://pomodoro-craft-api.steve-kim-0417.workers.dev/?api=https://pomodoro-craft-api.steve-kim-0417.workers.dev
```

이 방법은 해당 세션에만 적용돼요.

### Step 8 — 작동 확인 🧪

1. 배포한 앱을 브라우저에서 열기
2. 하단 `🌱 Join N others focusing right now` 문구에 **"· LIVE"** 가 붙었는지 확인
3. 폰으로 같은 URL 을 열어보기 → PC 화면의 숫자가 **1 에서 2 로 증가**해야 함
4. 폰에서 세션 완료 → PC 화면 live feed 에 **"🍅 someone harvested · 25m · just now"** 출현

**이게 보이면 진짜 멀티플레이 성공!** 🎉

---

## 🔧 자주 발생하는 문제

### ❓ "CORS 에러" 콘솔에 뜸

Worker 코드가 이미 `Access-Control-Allow-Origin: *` 를 설정해놨어요. 에러가 뜬다면:

1. Worker 가 실제로 배포됐는지 `/health` 로 확인
2. 브라우저 캐시 비우고 재시도

### ❓ "WebSocket connection failed"

- Worker URL 이 `https://` 인지 확인 (`ws://` 가 아님 — 프론트엔드가 자동 변환)
- Cloudflare 대시보드에서 Worker 가 `Active` 상태인지 확인

### ❓ "onlineNow 가 계속 0"

- 브라우저를 새로고침 해보세요 (WebSocket 재연결)
- 배포 직후엔 Durable Object 가 cold start 할 수 있음

### ❓ "무료 티어 한도 초과?"

2026년 1월까지는 SQLite 스토리지 무료. Workers 요청 수는 **일 10만 건** 까지 무료예요. 현실적으로 **몇천 MAU 까지는 $0**. 초과하면 $5/월 Paid 플랜으로 자동 전환 알림이 와요.

---

## 📊 확인/모니터링

### 실시간 로그 보기

```bash
cd worker
wrangler tail
```

누군가 앱을 열거나 세션을 완료할 때마다 터미널에 로그가 찍혀요.

### Cloudflare 대시보드

[dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → `pomodoro-craft-api` 에서:
- 요청 수
- 에러율
- Durable Object 사용량
- 로그

---

## 🗂️ 다음 단계 아이디어

백엔드 인프라가 갖춰졌으니 다음 기능들을 얹을 수 있어요:

- [ ] **닉네임 로그인** — 이메일/소셜 로그인 대신 닉네임만 (마찰 0)
- [ ] **카테고리별 리더보드** — 대입/코딩/어학 등
- [ ] **주간 랭킹** — 매주 월요일 리셋
- [ ] **친구 초대 링크** — 그룹 방 생성
- [ ] **지역 표시** — IP 기반 국가 플래그 (🇰🇷 🇺🇸)

전부 지금 만든 Durable Object 에 테이블 몇 개 추가하면 가능해요.

---

**문서 버전**: v1.0
**작성일**: 2026-04-08
**관련 파일**:
- `worker/src/index.js` — Worker 메인 코드
- `worker/wrangler.toml` — 배포 설정
- `worker/package.json` — npm 스크립트
