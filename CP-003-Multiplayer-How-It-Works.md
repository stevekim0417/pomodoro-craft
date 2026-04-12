# CP-003 — 멀티플레이가 어떻게 돌아가는지 + 당신이 할 일

> 이 문서는 **그림으로** 멀티플레이 시스템이 어떻게 돌아가는지 보여주고, **당신이 실제로 해야 할 일을 단계별로** 안내해요.
> 기술 배경 없어도 따라 할 수 있게 작성했어요.
> 총 소요 시간: **약 30분** (Cloudflare 계정 가입 ~5분 + 배포 ~5분 + 테스트 ~10분)

---

## 📖 목차

1. [큰 그림 — 전체가 어떻게 연결되는가](#1-큰-그림)
2. [예시 A — 두 명이 같이 있을 때](#2-예시-a)
3. [예시 B — 한 명이 세션을 완료할 때](#3-예시-b)
4. [예시 C — 공유 이미지로 새 유저가 유입될 때](#4-예시-c)
5. [당신이 해야 할 일 — 8단계](#5-당신이-해야-할-일)
6. [각 단계 상세 설명](#6-각-단계-상세-설명)
7. [배포 후 테스트하는 법](#7-배포-후-테스트)
8. [비용 얼마나 들어요?](#8-비용)
9. [문제 해결 트리](#9-문제-해결)
10. [용어 사전 — 초보자용](#10-용어-사전)

---

<a name="1-큰-그림"></a>
## 1. 🏗️ 큰 그림 — 전체가 어떻게 연결되는가

### 세 개의 조각

```
┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
│                          │  │                          │  │                          │
│   📱 사용자 브라우저       │  │   ☁️  Cloudflare Worker    │  │   💾 Durable Object      │
│                          │  │                          │  │   (서버의 "두뇌")          │
│   - index.html           │  │   - API 엔드포인트        │  │                          │
│   - Steve 애니메이션       │  │   - WebSocket 받음        │  │   - 현재 접속자 수         │
│   - 타이머                │  │   - 들어온 요청을          │  │   - 오늘의 세션 기록       │
│   - 내 로컬 기록           │  │     Durable Object 로    │  │   - 최근 10개 피드         │
│                          │  │     전달                  │  │   - SQLite 저장소         │
└──────────┬───────────────┘  └──────────┬───────────────┘  └──────────┬───────────────┘
           │                             │                             │
           │   HTTPS + WebSocket         │    내부 RPC 호출              │
           ├────────────────────────────▶│────────────────────────────▶│
           │                             │                             │
           ◀─────────────────────────────┤◀────────────────────────────┤
           │   JSON + 실시간 메시지       │                             │
           │                             │                             │
```

### 역할 요약

| 조각 | 하는 일 | 어디에 살아있음 |
|---|---|---|
| **브라우저 (index.html)** | 예쁜 UI 보여주고, 타이머 돌리고, 세션 끝나면 서버에 알림 | GitHub Pages (현재 당신이 호스팅하는 곳) |
| **Worker** | 세계의 모든 브라우저에서 오는 요청을 받아서 처리 | Cloudflare 전 세계 250+ 데이터센터 |
| **Durable Object** | 실제 "상태"를 저장하고 관리. 동접자 수, 세션 기록 등 | Cloudflare 데이터센터 1곳에 고정 |

> 💡 **왜 이렇게 나뉘어 있나요?** Worker 는 매 요청마다 새로 실행되는 "요리사" 같은 거예요. 주문만 받고 요리해요. Durable Object 는 "냉장고" 예요 — 모든 재료와 재고가 거기 있어요. 요리사는 여러 명이 동시에 일할 수 있지만, 냉장고는 하나여야 재고가 꼬이지 않아요.

---

<a name="2-예시-a"></a>
## 2. 👥 예시 A — 두 명이 같이 있을 때

**시나리오**: 당신이 서울 PC 에서 앱을 열고, 친구가 부산 폰에서 같은 앱을 엽니다.

```
  서울 PC (유저 A)                                         부산 폰 (유저 B)
       │                                                        │
       │  (1) 앱 열기                                             │
       │  HTTPS 요청                                              │  (1) 앱 열기
       ├────────────────────┐                                    │
       │                     │                                   │
       │                     ▼                                   │
       │               ┌─────────────┐                           │
       │               │ GitHub Pages│                           │
       │               │ (정적 호스팅)│                           │
       │               └──────┬──────┘                           │
       │                      │                                  │
       │  (2) index.html      │                                  │
       ◀──────────────────────┘                                  │
       │                                                         │
       │                                                         │
       │  (3) WebSocket 연결                                      │
       │  wss://.../api/presence                                  │
       ├───────────────────────────────▶  Cloudflare Worker       │
       │                                  │                      │
       │                                  ▼                      │
       │                            ┌──────────┐                 │
       │                            │ FocusHub │                 │
       │                            │ (DO)     │                 │
       │                            │          │                 │
       │                            │ onlineNow│                 │
       │                            │   = 1    │                 │
       │                            └──────────┘                 │
       │                                                         │
       │  (4) { onlineNow: 1 }                                    │
       ◀──────────────────────────────── Worker                  │
       │                                                         │
       │  UI 업데이트:                                             │
       │  "🌱 Join 1 others · LIVE"                               │
       │                                                         │
       │                                                         │
       │                        (5) WebSocket 연결                │
       │                        wss://.../api/presence            │
       │                                  ▲──────────────────────┤
       │                                  │                      │
       │                                  ▼                      │
       │                            ┌──────────┐                 │
       │                            │ FocusHub │                 │
       │                            │ onlineNow│                 │
       │                            │   = 2    │                 │
       │                            └──────────┘                 │
       │                                                         │
       │  (6) broadcast:              (6) broadcast:              │
       │      { onlineNow: 2 }            { onlineNow: 2 }        │
       ◀─────────────────────────── Worker ─────────────────────▶│
       │                                                         │
       │  UI 업데이트:                                  UI 업데이트:│
       │  "🌱 Join 2 others · LIVE"                "🌱 Join 2 ..." │
```

**결과**: 양쪽 화면에서 `Join 2 others focusing right now · LIVE` 가 보여요. 친구가 앱을 닫으면 즉시 `Join 1 others` 로 내려갑니다.

---

<a name="3-예시-b"></a>
## 3. 🍅 예시 B — 한 명이 세션을 완료할 때

**시나리오**: 유저 A가 25분 포커스 세션을 완료했어요. 이게 유저 B 화면에 어떻게 나타날까요?

```
  유저 A 브라우저                 Worker                    유저 B 브라우저
       │                            │                             │
       │  [25분 타이머가             │                             │
       │   0:00 이 됨]               │                             │
       │                            │                             │
       │  (1) recordSession 호출     │                             │
       │     (로컬 localStorage)     │                             │
       │                            │                             │
       │  (2) POST /api/session     │                             │
       │  {                         │                             │
       │    minutes: 25,            │                             │
       │    theme: 'tomato'         │                             │
       │  }                         │                             │
       ├──────────────────────────▶│                             │
       │                            │                             │
       │                            │  (3) FocusHub 에 전달        │
       │                            │  ┌──────────────────────┐   │
       │                            │  │ INSERT INTO sessions │   │
       │                            │  │ UPDATE daily_totals  │   │
       │                            │  │ UPDATE lifetime      │   │
       │                            │  └──────────────────────┘   │
       │                            │                             │
       │  (4) { ok: true }          │                             │
       ◀──────────────────────────┤                             │
       │                            │                             │
       │                            │  (5) WebSocket broadcast     │
       │                            │  { type: 'session',          │
       │                            │    minutes: 25,              │
       │                            │    theme: 'tomato' }         │
       │                            ├────────────────────────────▶│
       │                            │                             │
       │                            │                             │
       │                            │                             │  UI 업데이트:
       │                            │                             │  live feed 에
       │                            │                             │  "🍅 someone
       │                            │                             │   harvested · 25m
       │                            │                             │   · just now"
       │                            │                             │  추가됨 (슬라이드
       │                            │                             │   애니메이션)
```

**결과**: 유저 B는 본인이 아무것도 안 했는데도, **유저 A가 세션 끝낸 순간 자기 화면의 라이브 피드에 바로 새 아이템**이 뜹니다. 이게 "같이 있는 느낌" 의 핵심이에요.

---

<a name="4-예시-c"></a>
## 4. 📸 예시 C — 공유 이미지로 새 유저 유입

**시나리오**: 유저 A 가 Share 버튼을 눌러 인스타에 올렸어요. 팔로워인 유저 C 가 그걸 보고 앱에 들어옵니다.

```
  유저 A 브라우저             인스타그램                유저 C 브라우저
       │                          │                           │
       │  (1) Share 버튼 클릭      │                           │
       │                          │                           │
       │  (2) Canvas 로            │                           │
       │  1080x1080 PNG 생성       │                           │
       │                          │                           │
       │  (3) Web Share API        │                           │
       │  → 네이티브 공유 시트       │                           │
       │                          │                           │
       │  (4) 인스타그램 선택        │                           │
       ├────────────────────────▶ │                           │
       │                          │                           │
       │                          │  (5) 스토리에              │
       │                          │  업로드됨                  │
       │                          │                           │
       │                          │                           │
       │                          │  (6) 유저 C 가 스토리 봄    │
       │                          │──────────────────────────▶│
       │                          │                           │
       │                          │  이미지 워터마크:            │
       │                          │  "pomodorocraft.com"       │
       │                          │                           │
       │                          │                           │
       │                          │  (7) "링크 붙여넣기"        │
       │                          │  또는 URL 직접 입력         │
       │                          │                           │
       │                          │                  ┌─────────────┐
       │                          │                  │ GitHub Pages│
       │                          │                  │ pomodoro... │
       │                          │                  └──────┬──────┘
       │                          │                         │
       │                          │                         ▼
       │                          │                 (8) 앱 로드됨
       │                          │                 유저 C 는 이제
       │                          │                 멀티플레이에 참여
       │                          │
       │                          │                 (9) 유저 C 의 세션이
       │                          │                 유저 A 의 피드에
       │                          │                 실시간으로 나타남
       │                          │                        │
       ◀─────────────────────── Worker ◀─────────────────────┤
       │                          │
       │  UI 업데이트:              │
       │  "🍅 someone harvested..." │
```

**결과**: 유저 A → 인스타 → 유저 C → 앱 → 유저 A 의 피드에 나타남 → **고리 완성**. 이게 바이럴 루프예요. 한 명이 들어와서 또 다른 한 명 이상을 데려오면 K-factor > 1 이 되고, **지수 성장** 이 시작됩니다.

---

<a name="5-당신이-해야-할-일"></a>
## 5. ✅ 당신이 해야 할 일 — 8단계 요약

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   Step 1: ☁️  Cloudflare 계정 가입 (5분, 무료)                   │
│      ↓                                                       │
│   Step 2: 💻 Node.js 설치 (이미 있으면 건너뜀)                    │
│      ↓                                                       │
│   Step 3: ⚡ wrangler CLI 설치                                 │
│      ↓                                                       │
│   Step 4: 🔐 wrangler login 으로 계정 연결                      │
│      ↓                                                       │
│   Step 5: 🚀 wrangler deploy 로 Worker 배포                    │
│      ↓                                                       │
│   Step 6: 📋 받은 URL 복사                                     │
│      ↓                                                       │
│   Step 7: 📝 index.html 의 DEFAULT_API 에 붙여넣기               │
│      ↓                                                       │
│   Step 8: 🧪 폰 + PC 로 테스트 (2명이 보이는지 확인)              │
│                                                              │
│   완료! 🎉                                                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

<a name="6-각-단계-상세-설명"></a>
## 6. 📘 각 단계 상세 설명

### Step 1 — Cloudflare 계정 가입

1. https://dash.cloudflare.com/sign-up 접속
2. 이메일 + 비밀번호 입력
3. 인증 메일 확인 → 링크 클릭
4. 대시보드 들어가면 성공 ✅

**신용카드 필요 없음**. 무료 티어로 충분해요.

**확인 방법**: https://dash.cloudflare.com 접속해서 로그인 되면 OK.

---

### Step 2 — Node.js 설치 확인

터미널(Terminal.app / iTerm) 열고:

```bash
node --version
```

- **v18 이상** 이 나오면: 👍 Step 3 으로
- **"command not found"** 또는 **v17 이하**: https://nodejs.org 에서 LTS 버전 다운로드 후 설치

**확인 방법**:
```bash
node --version
# v20.11.0 (이렇게 뭔가 나오면 OK)

npm --version
# 10.2.4 (이것도 나와야 함)
```

---

### Step 3 — wrangler 설치

```bash
npm install -g wrangler
```

이 명령은 Cloudflare Worker 를 배포할 때 쓰는 CLI 도구를 전역으로 설치해요.

**확인 방법**:
```bash
wrangler --version
# ⛅️ wrangler 3.78.12 (이런 식으로 나오면 OK)
```

> ⚠️ **권한 에러 (EACCES) 나면**: `sudo npm install -g wrangler` 로 재시도. macOS 에선 비밀번호 입력 필요.

---

### Step 4 — Cloudflare 계정 연결

```bash
wrangler login
```

- 브라우저가 자동으로 열려요
- Cloudflare 로그인 상태에서 `Allow` 버튼 클릭
- 터미널로 돌아오면 `Successfully logged in` 출력

**확인 방법**:
```bash
wrangler whoami
# You are logged in with the account: your@email.com
```

---

### Step 5 — Worker 배포

프로젝트 폴더로 이동 후 배포:

```bash
cd /Users/steve/no_sync_project/pomodo_timer/worker
wrangler deploy
```

**처음 배포하면 대화형 질문이 떠요**:

```
? You have no workers.dev subdomain. Register a subdomain? [Y/n]
```
→ `Y` 입력 (엔터)

```
? What would you like your workers.dev subdomain to be?
```
→ 원하는 이름 입력 (예: `stevekim`). 이건 전역 고유 이름이에요.

**성공 출력 예시**:

```
⛅️ wrangler 3.78.12
-------------------

Total Upload: 12.45 KiB / gzip: 3.21 KiB
Uploaded pomodoro-craft-api (1.23 sec)
Published pomodoro-craft-api (5.67 sec)
  https://pomodoro-craft-api.steve-kim-0417.workers.dev      ← 이 URL 중요! 복사하세요
Current Version ID: 8f3a0d1c-xxxx-xxxx-xxxx-xxxxxxxxxx
```

> 🔖 **이 URL 을 메모해두세요**. 다음 단계에서 사용합니다.

---

### Step 6 — URL 작동 확인

브라우저에서 방금 받은 URL 의 `/health` 경로를 열어보세요:

```
https://pomodoro-craft-api.steve-kim-0417.workers.dev/health
```

화면에 **`Pomodoro Craft API is running 🍅`** 이 보이면 성공이에요.

그 다음 `/api/stats` 도 확인:

```
https://pomodoro-craft-api.steve-kim-0417.workers.dev/api/stats
```

JSON 이 보여야 해요:

```json
{
  "onlineNow": 0,
  "today": { "sessions": 0, "minutes": 0 },
  "lifetime": { "sessions": 0, "minutes": 0 },
  "feed": []
}
```

> 💡 `onlineNow: 0` 인 이유는 아직 아무도 WebSocket 으로 연결 안 했기 때문이에요. 다음 단계에서 해결됩니다.

---

### Step 7 — index.html 에 URL 연결

에디터(VS Code / Cursor / Sublime 등)로 `index.html` 을 열고 **Ctrl+F** (Mac: **⌘F**) 로 `DEFAULT_API` 검색.

찾으면 이렇게 보여요:

```javascript
const DEFAULT_API = '';  // ← paste wrangler deploy URL here after deployment
```

따옴표 안에 방금 받은 URL 을 붙여넣기:

```javascript
const DEFAULT_API = 'https://pomodoro-craft-api.steve-kim-0417.workers.dev';
```

저장 → 터미널에서:

```bash
cd /Users/steve/no_sync_project/pomodo_timer
git add index.html
git commit -m "Connect frontend to deployed multiplayer worker"
git push
```

**1-5분 뒤** https://pomodoro-craft-api.steve-kim-0417.workers.dev/ 에 자동 반영됩니다.

---

### Step 8 — 진짜 멀티플레이 테스트

**테스트 시나리오**:

```
1. PC 에서 https://pomodoro-craft-api.steve-kim-0417.workers.dev/ 열기
   → "🌱 Join 1 others focusing right now · LIVE" 가 보여야 함

2. 폰에서 같은 URL 열기
   → PC 의 숫자가 "Join 2 others" 로 변함
   → 폰에서도 "Join 2 others" 로 보임

3. 폰에서 1분짜리 세션 설정 (FOCUS - 버튼으로 1분 까지 줄임)

4. START → 1분 기다림 → 완료

5. PC 화면 하단에 "🍅 someone harvested · 1m · just now" 가 뜸

6. 폰 닫기 → PC 의 숫자가 "Join 1 others" 로 돌아감
```

**이 모든 게 정상 동작하면 축하해요** 🎉 — 진짜 멀티플레이 완성입니다.

---

<a name="7-배포-후-테스트"></a>
## 7. 🧪 배포 후 테스트 체크리스트

배포 직후 확인해야 할 것들:

| 체크 항목 | 어떻게 확인 | 성공 신호 |
|---|---|---|
| ✅ Worker 가 살아있음 | `/health` 페이지 열기 | `🍅` 문구 |
| ✅ API 가 응답함 | `/api/stats` 열기 | JSON 응답 |
| ✅ 프론트가 연결함 | 콘솔 (F12) 열기 | 에러 없음 |
| ✅ 동접자 카운트 | 사이드바 "LIVE" 표시 | 황금색 문구 |
| ✅ 세션 브로드캐스트 | 두 기기로 동시 열고 한쪽 세션 완료 | 반대쪽 피드에 나타남 |
| ✅ WebSocket 재연결 | Wi-Fi 껐다 켜기 | 자동 재연결 |

---

<a name="8-비용"></a>
## 8. 💰 비용 얼마나 들어요?

**결론부터**: 대부분 무료예요.

### Cloudflare 무료 티어 한도

| 자원 | 무료 한도 | 초과 시 |
|---|---|---|
| **Workers 요청 수** | 일 **100,000** 건 | $5/월 부터 (Paid 플랜) |
| **Durable Object 요청 수** | 일 **100,000** 건 | 유료 전환 |
| **Durable Object 스토리지** | **5 GB** | — |
| **WebSocket 연결** | 무제한 (Hibernation API 사용 시) | — |
| **대역폭** | 무제한 | — |

### 실제 사용량 예상

- **사용자 1 명** (앱 열고 세션 1개 완료):
  - WebSocket 연결: 1
  - HTTP 요청: ~5 (stats fetch 3번 + session post 1번 + health check 1번)
  - **하루 ~5~10 요청 생성**

- **일일 활성 유저 1,000 명이 각자 5세션 완료**:
  - 요청 수: ~25,000~50,000
  - **여전히 무료 한도 안** ✅

- **일일 활성 유저 10,000 명**:
  - 요청 수: ~250,000~500,000
  - **초과 → Workers Paid $5/월 플랜 필요**

### 현실적 시나리오

```
┌──────────────────────────────────────┐
│ Phase 0: 나 + 친구 몇 명                │
│ → 비용: $0                            │
├──────────────────────────────────────┤
│ Phase 1: 1,000 MAU 까지               │
│ → 비용: $0                            │
├──────────────────────────────────────┤
│ Phase 2: 10,000 MAU (바이럴 초기)     │
│ → 비용: $5/월 (Workers Paid 최소)     │
├──────────────────────────────────────┤
│ Phase 3: 100,000 MAU                 │
│ → 비용: ~$20~50/월                    │
├──────────────────────────────────────┤
│ Phase 4: 1M+ MAU (Forest 급)         │
│ → 비용: ~$100~300/월                  │
└──────────────────────────────────────┘
```

**비교**: Forest 앱은 Taiwan 회사가 2M 유료 유저까지 운영 중이에요. 이 구조면 그 규모까지 월 몇백 달러로 충분해요.

---

<a name="9-문제-해결"></a>
## 9. 🚨 문제 해결 트리

### Problem 1: `wrangler deploy` 가 에러남

```
에러: "You are not logged in"
  └─▶ wrangler login 다시 실행

에러: "No account found"
  └─▶ dash.cloudflare.com 에서 계정이 활성화됐는지 확인
      이메일 인증 안 끝났을 수도

에러: "Durable Objects not available"
  └─▶ wrangler --version 이 3.78 이상인지 확인
      낮으면 npm install -g wrangler@latest
```

### Problem 2: 배포는 됐는데 프론트에서 연결 안 됨

```
증상: "LIVE" 문구가 안 뜸
  │
  ├─▶ F12 콘솔 열기
  │   ├─ CORS 에러? 
  │   │   └─▶ Worker URL 이 정확한지 재확인
  │   │       (끝에 / 붙으면 안 됨)
  │   │
  │   ├─ WebSocket failed?
  │   │   └─▶ URL 이 https:// 인지 확인 (자동으로 wss:// 변환됨)
  │   │
  │   └─ 아무 에러 없음?
  │       └─▶ DEFAULT_API 에 URL 이 실제로 붙여넣어졌는지 재확인
  │
  └─▶ /health 페이지가 여전히 동작하는지 확인
```

### Problem 3: 동접자 카운트가 계속 0 이나 1

```
증상: 두 기기로 열었는데 "Join 1 others" 만 보임
  │
  ├─▶ 둘 다 같은 Worker URL 을 쓰는지 확인
  ├─▶ 브라우저 새로고침
  ├─▶ 네트워크 탭에서 WebSocket 연결이 `101 Switching Protocols` 로 성공했는지 확인
  │
  └─▶ Cloudflare 대시보드 > Workers & Pages > pomodoro-craft-api > Logs
      에서 실시간 요청 들어오는지 확인
```

### Problem 4: 무료 한도 초과 경고 이메일 받음

```
행동 1: 실제 사용량 확인
  └─▶ dash.cloudflare.com > Workers > pomodoro-craft-api > Metrics

행동 2: 즉시 롤백하려면
  └─▶ index.html 의 DEFAULT_API = '' 로 되돌리고 git push
      (앱은 솔로 모드로 자동 전환됨)

행동 3: 계속 쓰려면
  └─▶ dash.cloudflare.com > Workers > Plans > Upgrade to Workers Paid ($5/월)
```

---

<a name="10-용어-사전"></a>
## 10. 📚 용어 사전 (초보자용)

### 클라우드 관련

- **Cloudflare**: 전 세계 수백 개 데이터센터를 운영하는 회사. CDN/보안/서버리스 제공.
- **Worker**: "서버 없는 서버". 코드를 업로드하면 Cloudflare 가 전 세계에서 실행해줌. 매 요청마다 실행됨.
- **Durable Object**: Worker 와 달리 **상태를 유지하는** 특수한 Worker. 여러 사용자의 데이터를 한 곳에 모을 때 사용.
- **D1**: Cloudflare 의 SQLite 기반 데이터베이스. (이 앱에선 Durable Object 의 SQLite 스토리지를 직접 쓰므로 D1 은 안 씀)
- **Serverless**: "내가 서버 관리 안 하고 코드만 올린다" 는 뜻. 트래픽 없으면 돈 안 냄.

### 개발 관련

- **wrangler**: Cloudflare 가 만든 CLI 도구. 코드를 배포할 때 씀.
- **CLI**: Command Line Interface. 터미널에서 치는 명령어.
- **Node.js**: JavaScript 를 서버/도구로 실행하는 환경. wrangler 가 필요로 함.
- **npm**: Node.js 패키지 매니저. 라이브러리 설치할 때 씀.
- **git push**: 로컬 변경 사항을 GitHub 에 올림.

### 웹 관련

- **WebSocket**: 서버와 브라우저가 **양방향으로** 실시간 메시지를 주고받는 연결. 채팅/알림에 씀.
- **HTTPS**: 암호화된 HTTP. 현대 웹의 기본.
- **WebSocket Hibernation API**: Cloudflare 가 만든 최적화. 연결은 유지하되 idle 상태일 땐 compute 비용 0.
- **CORS**: "다른 도메인에서 내 API 를 쓸 수 있나" 정책. Worker 가 허용하고 있음.

### 앱 관련

- **MAU**: Monthly Active Users. 월간 활성 사용자.
- **K-factor**: 바이럴 계수. "한 사용자가 데려오는 신규 유저 수". K > 1 이면 지수 성장.
- **Presence**: "지금 누가 접속해있나" 개념.
- **Broadcast**: 한 사람에게 온 메시지를 모든 접속자에게 동시에 보냄.

---

## 🎁 보너스 — 이 문서와 함께 있는 다른 문서들

| 문서 | 내용 | 언제 읽나 |
|---|---|---|
| **CP-001-Feature-Guide.md** | 기본 기능 설명 (테마, Share, Companion 등) | 앱 기능 궁금할 때 |
| **CP-002-Multiplayer-Deploy.md** | 배포 기술 문서 (용어 많음) | 개발자용 레퍼런스 |
| **CP-003-Multiplayer-How-It-Works.md** | **← 이 문서** (그림 + 단계별) | 실제 배포 시작할 때 |
| **README.md** | GitHub 메인 소개 | 외부 사람이 리포 방문 시 |

---

## ✨ 마지막으로 — 배포 후 뭐할까?

성공적으로 배포했다면, 다음 마일스톤은:

1. **첫 유저 5명 초대**: 친구 5명에게 링크 보내기. 같이 앱 열고 카운트가 6 되는 거 확인.
2. **첫 스크린샷 공유**: Share 버튼으로 이미지 저장 → 본인 SNS 에 올리기.
3. **첫 24시간 관찰**: Cloudflare 대시보드에서 요청 수 / 에러율 관찰.
4. **다음 기능 결정**: 길드 추가할지, 카테고리 추가할지, 아니면 Streak Freeze 추가할지.

축하해요, 이제 당신은 **진짜 멀티플레이 앱의 운영자** 입니다 🎉

---

**문서 버전**: v1.0
**작성일**: 2026-04-08
**질문**: 배포 중 막히면 각 단계의 정확한 에러 메시지를 복사해서 알려주세요.
