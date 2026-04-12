# CP-005 — Cloudflare 배포 가이드

> Pomodoro Craft를 Cloudflare에 배포하는 완전 초보자용 가이드.
> 도메인 없이 무료 `*.workers.dev` 주소만으로 프론트엔드 + 백엔드를 한 번에 배포합니다.

---

## 아키텍처 개요

### 왜 Cloudflare Workers인가?

```
┌─────────────────────────────────────────────┐
│         Cloudflare Workers (무료)            │
│                                             │
│   같은 도메인에서 프론트 + API 동시 서비스   │
│                                             │
│   /              → index.html (정적 파일)   │
│   /api/stats     → Worker JS (API)         │
│   /api/session   → Worker JS (API)         │
│   /api/presence  → WebSocket (실시간)       │
│                                             │
│   ┌─────────────────────┐                   │
│   │  Durable Object     │                   │
│   │  (FocusHub)         │                   │
│   │  - SQLite 저장소    │                   │
│   │  - WebSocket 관리   │                   │
│   │  - 접속자 추적      │                   │
│   └─────────────────────┘                   │
└─────────────────────────────────────────────┘
         ↑
    GitHub에서 push하면 자동 배포
```

**핵심 장점:**
- 프론트엔드와 API가 **같은 도메인** → CORS 문제 없음
- **무료** (일 10만 요청, 5GB 저장소)
- **신용카드 불필요**
- 전 세계 300+ 엣지에서 실행 → 빠름

---

## 준비물 확인

시작하기 전에 아래 3가지가 있는지 확인하세요:

### 1. Node.js 설치 확인
```bash
node -v
# v18.0.0 이상이면 OK
# 없으면: https://nodejs.org 에서 LTS 버전 설치
```

### 2. npm 확인
```bash
npm -v
# 숫자가 나오면 OK (Node와 함께 자동 설치됨)
```

### 3. Git + GitHub
```bash
git --version
# 숫자가 나오면 OK
```

> 이 3가지가 있으면 준비 완료!

---

## Step 1. Cloudflare 계정 만들기

### 1-1. 회원가입

1. 브라우저에서 열기: **https://dash.cloudflare.com/sign-up**
2. 이메일 + 비밀번호 입력
3. **Create Account** 클릭
4. 이메일함에서 인증 메일 확인 → 링크 클릭

> 💡 **신용카드 필요 없음!** Free 플랜으로 충분합니다.

### 1-2. Workers 서브도메인 선택

첫 로그인 후 Workers를 처음 사용하면 서브도메인을 정합니다.

1. 왼쪽 메뉴 → **Workers & Pages** 클릭
2. 서브도메인 입력 화면이 나옴
3. 원하는 이름 입력 (예: `steve-craft`)
4. 나중에 주소가 됨: `https://pomodoro-craft-api.steve-craft.workers.dev`

> ⚠️ **한 번 정하면 변경이 어려우니 신중하게 선택!**

### 1-3. 무료 플랜 한도 (넉넉함)

| 항목 | 무료 한도 |
|---|---|
| 요청 수 | 일 100,000건 |
| CPU 시간 | 요청당 10ms |
| Durable Objects | 포함 (SQLite 5GB) |
| 정적 파일 서빙 | **무제한, 무료** |
| WebSocket | 지원 (Hibernation API) |

---

## Step 2. Wrangler CLI 설치

Wrangler는 Cloudflare의 배포 도구입니다. 터미널에서 실행합니다.

### 2-1. 설치

```bash
npm install -g wrangler
```

### 2-2. 설치 확인

```bash
wrangler --version
```

이런 출력이 나오면 성공:
```
⛅️ wrangler 3.99.0
```

> 💡 **버전이 3.x 이상이면 OK.**
> 만약 에러가 나면 Node.js가 v18 이상인지 확인하세요.

---

## Step 3. Cloudflare에 로그인

### 3-1. 로그인 실행

```bash
wrangler login
```

### 3-2. 진행 과정

1. 자동으로 브라우저가 열림
2. Cloudflare 로그인 (아까 만든 계정)
3. **"Allow Wrangler to make changes..."** 화면 → **Allow** 클릭
4. 터미널로 돌아오면:

```
Successfully logged in.
```

### 3-3. 로그인 확인

```bash
wrangler whoami
```

출력:
```
👋 You are logged in with an OAuth Token, associated with the email your@email.com!
┌──────────────────┬──────────────────────────────────┐
│ Account Name     │ Account ID                       │
├──────────────────┼──────────────────────────────────┤
│ Steve's Account  │ abcdef1234567890abcdef1234567890 │
└──────────────────┴──────────────────────────────────┘
```

> **Account ID**가 보이면 성공! 이 ID를 잠시 후 사용합니다.

---

## Step 4. 프로젝트 설정

### 4-1. 정적 파일 설정

Cloudflare Workers의 **Static Assets** 기능을 사용하면 `index.html`과 API를
같은 도메인에서 서빙할 수 있습니다.

프로젝트 루트에 `.assetsignore` 파일을 만들어, 배포하지 않을 파일을 지정합니다:

```bash
# 프로젝트 루트에서 실행
cat > .assetsignore << 'EOF'
worker/
CP-*.md
README.md
.git/
.github/
.assetsignore
EOF
```

> 이렇게 하면 `index.html`만 정적 파일로 배포됩니다.

### 4-2. wrangler.toml 확인

`worker/wrangler.toml` 파일을 열어 아래 내용과 일치하는지 확인:

```toml
name = "pomodoro-craft-api"
main = "src/index.js"
compatibility_date = "2024-11-01"

# 정적 파일 서빙 — index.html을 프로젝트 루트에서 가져옴
[assets]
directory = ".."

# Durable Object 바인딩
[[durable_objects.bindings]]
name = "FOCUS_HUB"
class_name = "FocusHub"

# DO 마이그레이션 (첫 배포 시 자동 실행)
[[migrations]]
tag = "v1"
new_sqlite_classes = ["FocusHub"]

# 로깅 (무료)
[observability]
enabled = true
```

> 💡 `[assets]` 섹션이 핵심! 이게 프론트엔드를 같은 도메인에서 서빙합니다.

### 4-3. index.html의 API 연결 설정

`index.html`의 약 3353번째 줄을 찾으세요:

```javascript
const DEFAULT_API = '';
```

배포 후 받는 URL을 여기에 넣습니다. (Step 5 이후에 설정)

---

## Step 5. 배포하기

### 5-1. 의존성 설치

```bash
cd worker
npm install
```

출력:
```
added 1 package in 2s
```

### 5-2. 배포 실행

```bash
npx wrangler deploy
```

### 5-3. 예상 출력

```
🌀 Building list of assets...
🌀 Starting asset upload...
Uploaded 1 of 1 assets
Total Upload: 5.12 KiB / gzip: 1.87 KiB
Uploaded pomodoro-craft-api (2.34 sec)
Deployed pomodoro-craft-api triggers (0.45 sec)
  https://pomodoro-craft-api.steve-craft.workers.dev
Current Version ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

> 🎉 **저 URL이 당신의 서비스 주소입니다!** 복사해 두세요.

### 5-4. DEFAULT_API 설정

이제 `index.html`의 3353줄을 업데이트:

```javascript
// 배포 URL을 붙여넣기 (본인 URL로 교체!)
const DEFAULT_API = 'https://pomodoro-craft-api.steve-craft.workers.dev';
```

저장 후 다시 배포:

```bash
npx wrangler deploy
```

> 💡 프론트엔드와 백엔드가 같은 도메인이므로 **CORS 문제가 발생하지 않습니다!**

---

## Step 6. 배포 확인

### 6-1. 브라우저에서 열기

배포 URL을 브라우저에 붙여넣기:
```
https://pomodoro-craft-api.steve-craft.workers.dev
```

Pomodoro Craft 화면이 나오면 **프론트엔드 배포 성공!** 🎉

### 6-2. API 테스트 (터미널)

```bash
# 헬스 체크
curl https://pomodoro-craft-api.YOUR-SUBDOMAIN.workers.dev/health
```
```
Pomodoro Craft API is running 🍅
```

```bash
# 통계 API (Durable Object 동작 확인)
curl https://pomodoro-craft-api.YOUR-SUBDOMAIN.workers.dev/api/stats
```
```json
{
  "onlineNow": 0,
  "users": [],
  "today": { "sessions": 0, "minutes": 0 },
  "lifetime": { "sessions": 0, "minutes": 0 },
  "mountain": { "blocks": 80 },
  "feed": []
}
```

```bash
# 세션 기록 테스트
curl -X POST https://pomodoro-craft-api.YOUR-SUBDOMAIN.workers.dev/api/session \
  -H "Content-Type: application/json" \
  -d '{"minutes":25,"theme":"tomato","nick":"test"}'
```
```json
{"ok":true,"mountain":{"blocks":83,"earned":3}}
```

> ✅ 3개 테스트 모두 통과하면 **백엔드 배포도 완료!**

### 6-3. 멀티플레이어 확인

1. 배포 URL을 **두 개의 브라우저 탭**에서 열기
2. 한쪽에서 **START** 클릭 → focus 시작
3. 다른 탭에서 상대방이 보이는지 확인
4. `📖 2 STUDYING TOGETHER`가 표시되면 **실시간 멀티플레이어 성공!** 🎉

---

## Step 7. 업데이트 배포

코드를 수정한 후:

```bash
cd worker
npx wrangler deploy
```

**30초 안에 전 세계 반영됩니다.**

> 💡 GitHub에 push하고, Cloudflare Workers Builds를 설정하면
> **push만 하면 자동 배포**도 가능합니다. (아래 FAQ 참조)

---

## 전체 요약: 한눈에 보는 명령어

```bash
# === 최초 1회 ===
npm install -g wrangler          # 1. CLI 설치
wrangler login                   # 2. 로그인

# === 배포 ===
cd worker                        # 3. worker 폴더로 이동
npm install                      # 4. 의존성 설치
npx wrangler deploy              # 5. 배포!
# → URL 복사 → index.html DEFAULT_API에 붙여넣기
npx wrangler deploy              # 6. 프론트엔드 반영 재배포

# === 이후 업데이트 ===
npx wrangler deploy              # 코드 수정 후 이것만 실행
```

**총 소요 시간: 약 10분**

---

## FAQ — 자주 묻는 질문

### Q1. 무료로 쓸 수 있나요?
**네.** Cloudflare Workers Free 플랜으로 충분합니다.
- 일 10만 요청 (개인 서비스에 넉넉)
- 정적 파일(index.html) 서빙은 **무제한, 무료**
- Durable Objects + SQLite: 5GB 무료
- 신용카드 등록 불필요

### Q2. 도메인이 없어도 되나요?
**네.** Cloudflare가 제공하는 무료 주소를 사용합니다:
```
https://pomodoro-craft-api.YOUR-SUBDOMAIN.workers.dev
```
나중에 커스텀 도메인(예: `pomodoro.craft`)을 추가할 수 있습니다.

### Q3. GitHub Pages도 써야 하나요?
**아니요.** 이 가이드의 방식(Workers + Static Assets)은 프론트엔드도
Worker에서 직접 서빙합니다. GitHub Pages가 필요 없습니다.
GitHub은 소스코드 저장소로만 사용합니다.

### Q4. CORS 에러가 나면?
이 가이드대로 설정하면 프론트엔드와 API가 **같은 도메인**이므로
CORS 에러가 발생하지 않습니다.

만약 다른 도메인에서 API를 호출해야 한다면, `worker/src/index.js`의
24번째 줄에서 `Access-Control-Allow-Origin`을 해당 도메인으로 변경하세요.

### Q5. `wrangler deploy` 시 에러가 나요

| 에러 메시지 | 해결 방법 |
|---|---|
| `No account id found` | `wrangler login` 다시 실행 |
| `Could not find wrangler.toml` | `cd worker` 후 실행 (worker 폴더 안에서!) |
| `Authentication error` | `wrangler login` 만료됨 → 다시 로그인 |
| `Script too large` | index.html이 너무 큼 → `.assetsignore` 확인 |
| `Migration error` | `wrangler.toml`의 `[[migrations]]` 섹션 확인 |

### Q6. WebSocket이 연결 안 돼요
- 브라우저 주소창 URL이 `https://`인지 확인 (`file://`은 불가)
- `DEFAULT_API`에 URL이 제대로 들어갔는지 확인
- 개발자 도구(F12) → Console에서 에러 메시지 확인

### Q7. 아이패드/폰에서 화면이 꺼져요
**정상 작동합니다.** Screen Wake Lock API가 구현되어 있어
타이머 실행 중에는 화면이 자동으로 꺼지지 않습니다.
(Safari 16.4+, Chrome 84+ 지원)

### Q8. 데이터는 어디에 저장되나요?
Cloudflare의 Durable Object 안에 있는 **SQLite 데이터베이스**에 저장됩니다.
- 세션 기록: 최근 1000개 보관
- 산 블록 수: 영구 보관
- 접속자 정보: 메모리 (연결 끊기면 자동 정리)

### Q9. 동시 접속자가 많아지면?
현재 구조는 **단일 Durable Object** 인스턴스로 모든 사용자를 처리합니다.
Cloudflare DO는 수천 명의 동시 WebSocket을 처리할 수 있습니다.
만약 수만 명 이상으로 스케일해야 하면 지역별 샤딩이 필요합니다.

### Q10. GitHub에 push하면 자동 배포할 수 있나요?
**네.** Cloudflare Workers Builds를 설정하면 가능합니다:
1. Cloudflare 대시보드 → Workers & Pages → 해당 Worker 선택
2. Settings → Builds → Connect to Git
3. GitHub 리포지토리 연결
4. Build command: `cd worker && npm install && npx wrangler deploy`
5. 이후 `main` 브랜치에 push할 때마다 자동 배포!

### Q11. 로컬에서 테스트할 수 있나요?
**네.** Wrangler의 로컬 개발 서버를 사용합니다:
```bash
cd worker
npx wrangler dev
```
`http://localhost:8787`에서 API를 테스트할 수 있습니다.
Durable Objects도 로컬에서 시뮬레이션됩니다.

### Q12. 배포를 롤백할 수 있나요?
**네.** Cloudflare 대시보드에서:
1. Workers & Pages → 해당 Worker
2. Deployments 탭
3. 이전 버전 옆의 **Rollback** 클릭

또는 터미널에서:
```bash
npx wrangler rollback
```

---

## 프로젝트 파일 구조

```
pomodo_timer/
├── index.html                ← 프론트엔드 (Workers Static Assets로 서빙)
├── .assetsignore             ← 정적 파일 배포에서 제외할 목록
├── worker/
│   ├── package.json          ← wrangler 의존성
│   ├── wrangler.toml         ← Worker + DO + Static Assets 설정
│   └── src/
│       └── index.js          ← API + FocusHub Durable Object
├── CP-005-Cloudflare-Deploy-Guide.md  ← 이 문서
└── ...
```

---

## 배포 체크리스트

```
[ ] Cloudflare 계정 만들기
[ ] wrangler 설치 + 로그인
[ ] .assetsignore 파일 생성
[ ] wrangler.toml에 [assets] 섹션 확인
[ ] cd worker && npm install && npx wrangler deploy
[ ] 출력된 URL 복사
[ ] curl /health → "running 🍅" 확인
[ ] curl /api/stats → JSON 응답 확인
[ ] index.html의 DEFAULT_API에 URL 설정
[ ] npx wrangler deploy (재배포)
[ ] 브라우저에서 배포 URL 열기 → 화면 확인
[ ] 두 탭에서 열어 멀티플레이어 확인
```

---

## 다음 단계 (선택)

| 할 일 | 방법 |
|---|---|
| **커스텀 도메인 연결** | 대시보드 → Worker → Settings → Domains → Add Custom Domain |
| **자동 배포 설정** | Workers Builds → GitHub 연결 (FAQ Q10 참조) |
| **모니터링** | 대시보드 → Workers → Analytics (요청 수, 에러율, 응답 시간) |
| **로그 보기** | `cd worker && npx wrangler tail` (실시간 로그 스트림) |

---

*마지막 업데이트: 2026-04-12*
