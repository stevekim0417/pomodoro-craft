# CP-004 — Presence Avatars (Level 3+4)

> 이 문서는 **"다른 사람이 씬에서 실제로 보이는"** 기능(Level 3+4)의 설계와 구현을 정리합니다.
> 이전 CP-003 이 **인프라 배포**를 다뤘다면, CP-004 는 **실제 시각적 공존** 레이어를 다뤄요.
> 설계 철학의 핵심은 **"99%는 혼자일 것"** 이라는 현실 인정입니다.

---

## 🎯 이 레벨에서 뭐가 바뀌나

| | Level 2 (이전) | **Level 3+4 (이번)** |
|---|---|---|
| "동접자 수" | 텍스트 카운터 | 카운터 + **실제 아바타 렌더링** |
| "다른 사람이 뭘 하는지" | 라이브 피드 텍스트만 | **씬에 미니 Steve 로 실시간 표시** |
| "타이머 진행률" | 안 보임 | **각 유저 머리 위에 남은 시간 표시** |
| "테마" | 안 보임 | **테마 컬러 점으로 표시** |
| 혼자일 때 UX | "Join 118 others" (가짜) | **"You're focused alone · be the first today ✨"** (정직) |
| 닉네임 | 없음 | **익명 guest_XXXX + 변경 가능** |

---

## 🏗️ 아키텍처 — 3단 구조

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Browser 1 (alice)            Browser 2 (bob)    │
│  ┌───────────────┐            ┌───────────────┐  │
│  │ STEVE_BODY    │            │ STEVE_BODY    │  │
│  │ 스프라이트     │            │ 스프라이트     │  │
│  │ (메인 P=6)    │            │ (메인 P=6)    │  │
│  │               │            │               │  │
│  │ remoteUsers   │            │ remoteUsers   │  │
│  │ 레이어 (P=3): │            │ 레이어 (P=3): │  │
│  │  [bob]        │            │  [alice]      │  │
│  └───────┬───────┘            └───────┬───────┘  │
│          │                            │          │
│          │  WebSocket                 │          │
│          ├────────┐         ┌─────────┤          │
│          │        │         │         │          │
└──────────┼────────┼─────────┼─────────┼──────────┘
           │        │         │         │
           ▼        ▼         ▼         ▼
          ┌─────────────────────────────┐
          │ Cloudflare Worker           │
          │ ┌─────────────────────┐     │
          │ │ FocusHub (DO)       │     │
          │ │                     │     │
          │ │ WebSocket Set:      │     │
          │ │  • ws1 (alice)      │     │
          │ │    └ attachment:    │     │
          │ │      {nick, theme,  │     │
          │ │       timerMode,    │     │
          │ │       remainingSec} │     │
          │ │  • ws2 (bob)        │     │
          │ │    └ attachment:...  │     │
          │ │                     │     │
          │ │ SQLite:             │     │
          │ │  • sessions         │     │
          │ │  • daily_totals     │     │
          │ │  • lifetime_totals  │     │
          │ └─────────────────────┘     │
          └─────────────────────────────┘
```

### 왜 이 구조인가

1. **WebSocket 당 하나의 "사람"** — 각 연결이 곧 한 명의 유저. 연결 끊기면 자동으로 사라짐.
2. **상태는 WebSocket attachment 에 저장** — `ws.serializeAttachment({ nick, theme, ... })` 로 각 ws 에 붙여두고, 필요할 때 `ws.deserializeAttachment()` 로 읽음. Hibernation 해도 살아남음.
3. **Broadcast on change** — hello/state 메시지가 오면 즉시 `collectUsers()` 돌려서 모든 연결에 `{ type: 'users', users: [...] }` 송신.
4. **5초 주기 state 전송** — 클라이언트가 `setInterval(broadcastMyState, 5000)` 으로 주기적 업데이트. 타이머 시작/일시정지/완료 때는 즉시.

---

## 🎨 씬 레이아웃 — 고정 슬롯 8개

복잡한 위치 계산 없이, **미리 정의된 8개 슬롯**에 순서대로 배치:

```
(72, 60)      (176, 56)                  (328, 60)
  🎩alice       🎩bob                      🎩eve
  35:00         22:15                      FOCUS

(48, 110)                                          (360, 110)
  🎩charlie                                         🎩frank
  BREAK                                             18:45

              (128, 116)                  (256, 116)
               🎩dan                        🎩greg
               FOCUS                        IDLE

               [MAIN STEVE — 큰 사이즈, 중앙]                   (408, 116)
                                                                🎩harold
                                                                14:20

              ──────────── 지면 ────────────
```

### 슬롯 선택 기준

- **메인 Steve 와 절대 겹치지 않음** (메인은 x≈200, 중앙)
- **언덕과 안 겹침** (언덕은 x>300, 오른쪽 아래)
- **트리 기둥과 안 겹침** (트리는 x=30, x=410)
- **상단 4개 슬롯은 y<70** (하늘 영역, 구름 근처)
- **하단 4개 슬롯은 y≈110-116** (지면 위 기본 높이)

### 초과 시 처리

9명 이상 접속하면 처음 8명만 표시하고 나머지는 `+N more` 텍스트로 표시:

```javascript
if (others.length > REMOTE_SLOTS.length) {
  const overflow = others.length - REMOTE_SLOTS.length;
  // SVG text: "+N more"
}
```

**현실 체크**: 1-2년 내엔 이 8개 슬롯을 다 채우는 순간 자체가 이벤트예요. 그때까진 여유롭게 씬이 숨 쉽니다.

---

## 🔤 각 미니 Steve 의 구성 요소

```
┌──────────────────────┐
│    [테마 컬러 점]      │ ← 4x4 컬러 마커 (머리 위)
│        ┌─┐            │
│     alice             │ ← 닉네임 (5px Press Start 2P, 흰색 + 검은 아웃라인)
│       🎩🏻             │ ← 빨간 캡 + 얼굴
│       👕              │ ← 청록 셔츠 + 팔
│       👖              │ ← 파란 바지
│       ━━              │ ← 검정 신발
│     24:10             │ ← 타이머 (5px, focus=초록/break=파랑/idle=회색)
└──────────────────────┘
```

**재사용**: 메인 Steve 의 `STEVE_BODY`, `LEG_STAND`, `CHAR` 스프라이트 데이터를 **그대로** 씀. scale 만 절반(P=3)으로. 빨간 모자 버전(야구캡)도 그대로 반영. 새 스프라이트 데이터 안 만듦.

**상태별 색상 매핑**:
| 상태 | 타이머 텍스트 색 | 의미 |
|---|---|---|
| `focus` | `#8DB360` (초록) | 집중 중 — 타이머 카운트다운 |
| `break` / `longbreak` | `#88BBFF` (파랑) | 휴식 중 |
| `idle` | `#888` (회색) | 대기 중 — 타이머 안 돌리는 중 |

---

## 📡 메시지 프로토콜

### Client → Server

```javascript
// 연결 직후 1회
{ type: 'hello', nick: 'alice', theme: 'tomato' }

// 5초마다 (focus 중일 때) + 상태 변경 시 즉시
{ type: 'state',
  timerMode: 'focus',
  remainingSec: 1450,
  totalSec: 1500,
  theme: 'tomato' }

// 타이머 없을 때
{ type: 'state', timerMode: 'idle', remainingSec: 0, totalSec: 0 }

// 선택: keep-alive
{ type: 'ping' }
```

### Server → Client

```javascript
// 연결 직후 응답
{ type: 'welcome',
  yourId: 'abc12345',
  users: [ { id, nick, theme, timerMode, remainingSec, totalSec }, ... ] }

// 누가 들어오거나 상태 변경되면 모든 연결에 브로드캐스트
{ type: 'users',
  users: [ ... ] }

// 세션 완료 시
{ type: 'session',
  session: { minutes: 25, theme: 'tomato', nick: 'alice', at: 1712530800000 } }
```

### 프로토콜 설계 원칙

1. **Stateless 호환**: 새 클라이언트가 붙었을 때 `welcome` 한 메시지로 완전한 상태 복원 가능
2. **증분 업데이트 없음**: 항상 `users: [...]` 전체 리스트 전송. 가볍기 때문 (최대 8명 × ~50바이트 = 400바이트)
3. **Hibernation 호환**: 서버 로직이 in-memory 변수에 의존하지 않음. 모든 상태는 `ws.serializeAttachment()` 에.
4. **Self-healing**: 연결 끊어지면 클라이언트가 5초 후 자동 재연결 + hello 재전송

---

## 🧠 저트래픽 현실 반영 UX

### 동접자 수 별 메시지

| 접속자 | 메시지 | 감정 |
|---|---|---|
| **0** | `🌱 Be the first one focusing today` | 초대 |
| **1 (나만)** | `🌱 You're focused alone · be the first today ✨` | 특권 |
| **2 (나 + 1명)** | `🌱 You're focused with 1 other right now · LIVE` | **매직** |
| **3-5** | `🌱 You're focused with N-1 others right now · LIVE` | 소규모 공동체 |
| **6+** | `🌱 Join N-1 others focusing right now · LIVE` | 대중적 |

**핵심 결정**: 혼자일 때 "외로움" 이 아니라 **"특권(first mover)"** 으로 프레이밍. 주황색 glow 애니메이션이 **"이 순간 당신이 이 앱의 주인공"** 이라는 느낌을 줌.

### 2명 시나리오가 핵심 "매직 모먼트"

친구에게 링크 보내서 둘이 동시에 접속하는 순간이 **이 앱의 첫 바이럴 스파크** 예요:

```
A: 앱 열기
   → "You're focused alone · be the first today ✨"

A: 친구 B 에게 링크 전송
B: 앱 열기

A 화면 실시간 업데이트:
  → "🌱 You're focused with 1 other right now · LIVE"
  → 씬 좌측에 "B" 의 미니 Steve 등장 🎉

B 화면:
  → 똑같이 중앙에 본인 + 씬 우측에 "A" 의 미니 Steve
```

**이 "매직 모먼트" 가 스크린샷 찍혀서 SNS 에 퍼지는 게** 바이럴 루프의 시작점이에요.

---

## 🎭 닉네임 시스템

### 익명 우선주의

1. **첫 방문**: 자동으로 `guest_XXXX` 생성 (4 hex chars)
2. **저장**: `localStorage.pomodocraft_nick`
3. **변경**: 설정 drawer 의 `YOUR NAME` 입력 필드
4. **제약**: 20자, `[a-z A-Z 0-9 가-힣 _ . -]` 만 허용
5. **로그인 없음**: 이메일/비밀번호/소셜 아무것도 없음 — 마찰 0

### 왜 이렇게 간단한가

- 앱의 첫 100 유저에게 **"회원가입하세요"** 는 이탈 시그널
- 익명성이 오히려 공부 앱과 잘 어울림 (부끄러움 없이 공부 시간 보여줌)
- 나중에 로그인 필요한 기능(진짜 친구 목록, 클라우드 싱크) 만들 때 선택적으로 업그레이드 가능
- 현 상태로도 "같은 사람" 은 계속 같은 닉네임 유지됨 (localStorage 기반)

---

## 🧪 테스트 방법

### 로컬에서 (Worker 없이)

브라우저 콘솔에서 가짜 유저 데이터로 렌더링 검증:

```javascript
myUserId = 'me';
liveUsers = [
  { id: 'u1', nick: 'alice', theme: 'tomato', timerMode: 'focus', remainingSec: 1450, totalSec: 1500 },
  { id: 'u2', nick: 'bob',   theme: 'diamond', timerMode: 'focus', remainingSec: 872,  totalSec: 1500 },
  { id: 'u3', nick: 'minji', theme: 'ruby',    timerMode: 'break', remainingSec: 245,  totalSec: 300 },
  { id: 'me', nick: 'guest_test', theme: 'tomato', timerMode: 'idle', remainingSec: 0, totalSec: 0 },
];
liveOnlineCount = 4;
renderRemoteUsers();
updateSocialProof();
```

→ 씬에 3명의 미니 Steve 가 즉시 나타남.

### 배포 후 (Worker 포함)

1. PC + 폰 동시 접속
2. 양쪽 화면에 서로의 미니 Steve 가 보여야 함
3. PC 에서 FOCUS 시작 → 폰 화면의 PC 유저가 초록색 타이머로 업데이트
4. PC 에서 SKIP → 폰 화면에서 BREAK 상태로 변경
5. 폰 닫기 → PC 의 씬에서 폰 유저 사라짐

---

## 💰 비용 영향 분석

### Level 2 vs Level 3+4 의 트래픽 증가

| | Level 2 | Level 3+4 |
|---|---|---|
| 초기 연결 | 1 메시지 (welcome) | 1 메시지 (welcome with users) |
| 상태 갱신 | 0/초 | **0.2/초** (5초마다) |
| 상태 변경 broadcast | count만 | full users array |
| 메시지 크기 | ~20바이트 | **~400바이트** (users 8명) |
| 시간당 유저당 | ~5 msg | **~720 msg** (접속 유지 기준) |

### 무료 티어 한계와 비교

- Cloudflare Workers 무료: 일 100,000 요청
- **포커스 중인 유저 1명이 8시간 연속 접속**: ~5,700 메시지 (broadcast 포함)
- **일 100명 MAU 가 평균 1시간씩 접속**: ~72,000 메시지
- **무료 티어 안전 범위**: ~일 100 MAU 까지

**초과 시나리오**: 일 300+ MAU 가 되면 Workers Paid 플랜 ($5/월) 필요. 하지만 거기까지 가면 앱이 이미 성공한 거예요.

### 최적화 여지 (필요해지면)

1. **state 갱신 주기 늘리기**: 5s → 15s (메시지 1/3 로)
2. **idle 유저는 broadcast 안 함**: focus 중인 유저만 주기 broadcast
3. **WebSocket idle 시 hibernate**: 이미 활성화됨 (cost 0)
4. **Delta 업데이트**: users 전체 대신 changed 유저만

지금은 **현실적으로 필요 없음**. 최대 단순함 원칙 유지.

---

## 🎁 추가 보너스 — 각 유저의 "현재 테마" 가 보이는 의미

각 미니 Steve 머리 위 4×4 컬러 점은 그 유저가 지금 **Tomato/Diamond/Emerald/Gold/Ruby 중 어느 테마**인지 보여줍니다. 색상 의미:

- 🔴 빨강 → Tomato
- 🟢 청록 → Diamond
- 🟢 초록 → Emerald
- 🟡 노랑 → Gold
- 🔴 검붉음 → Ruby

### 이게 왜 중요한가

**소통 없이도 "친밀감" 이 생김**. 누구나 "저 사람도 나처럼 토마토 캐네" 같은 작은 연결감을 느낄 수 있어요. 이건 Roblox 의 "옷 같다" 라는 느낌과 비슷한 사회적 시그널이에요.

---

## 📋 구현된 파일 리스트 (이번 세션)

### Worker (worker/src/index.js)
- ✅ `handlePresence` — WebSocket 연결 수락 + attachment 초기화
- ✅ `webSocketMessage` — hello/state/ping 핸들링
- ✅ `webSocketClose` — 연결 끊김 시 users broadcast
- ✅ `collectUsers` — 모든 연결의 attachment 읽어서 users 배열 생성
- ✅ `broadcastUsers` — 모든 연결에 현재 users 목록 전송
- ✅ `/api/stats` 응답에 `users` 필드 추가

### Frontend (index.html)
- ✅ `currentNick` + `loadNick`/`saveNick` — 닉네임 상태
- ✅ `liveUsers`, `myUserId` — remote user 상태
- ✅ `sendPresenceMessage` / `broadcastMyState` — 상태 전송
- ✅ `connectPresence` 업그레이드 — hello + state 주기 전송
- ✅ `remoteUsersG` SVG 레이어 — buildScene 에 추가
- ✅ `REMOTE_SLOTS`, `renderRemoteUsers`, `drawRemoteSteve` — 렌더링
- ✅ `updateSocialProof` 업그레이드 — 저트래픽 UX 로직
- ✅ 닉네임 input UI + commitNick 이벤트 핸들러
- ✅ `startTimer`/`skipTimer`/`resetTimer`/세션 완료 지점에 `broadcastMyState` 호출
- ✅ `applyTheme` 에 `broadcastMyState` 호출 (테마 변경 즉시 반영)

---

## 🚀 배포 후 확인 체크리스트

1. [ ] `wrangler deploy` 성공
2. [ ] `/api/stats` JSON 에 `users: []` 필드 존재
3. [ ] PC 에서 앱 열기 → 본인만 (접속자 1)
4. [ ] 폰에서 앱 열기 → 양쪽에서 2명 표시
5. [ ] 폰 씬 우측에 PC 유저의 미니 Steve 보임
6. [ ] PC 에서 FOCUS 시작 → 폰에서 PC 유저 타이머가 초록색으로 카운트다운
7. [ ] PC 에서 테마 변경 (Diamond → Ruby) → 폰에서 PC 유저의 테마 점 색 변경
8. [ ] 폰에서 설정 drawer → YOUR NAME 바꾸기 → PC 에서 닉네임 업데이트
9. [ ] 폰 앱 닫기 → PC 씬에서 폰 유저 사라짐
10. [ ] 혼자 상태 → `You're focused alone ✨` 주황 glow 확인

---

**문서 버전**: v1.0
**작성일**: 2026-04-09
**선행 문서**: CP-003 (인프라 배포)
**다음 예상 문서**: CP-005 (카테고리/리더보드 or 길드)
