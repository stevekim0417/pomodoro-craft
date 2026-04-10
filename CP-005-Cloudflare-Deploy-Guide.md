# CP-005 — Cloudflare Worker 배포 가이드

> Pomodoro Craft 멀티플레이어 백엔드를 Cloudflare에 배포하는 초보자용 가이드.
> 도메인 없이 무료 `*.workers.dev` 주소만으로 완성합니다.

---

## 준비물

| 항목 | 설명 |
|---|---|
| **Node.js** | v18 이상 (`node -v`로 확인) |
| **npm** | Node와 함께 설치됨 (`npm -v`) |
| **이메일** | Cloudflare 가입용 |
| **신용카드** | ❌ 불필요 (Free 플랜) |

---

## Step 1. Cloudflare 계정 만들기

1. 브라우저에서 [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) 열기
2. 이메일 + 비밀번호 입력 → **Sign Up**
3. 이메일 인증 링크 클릭
4. 로그인하면 대시보드가 뜸
5. 왼쪽 메뉴에서 **Workers & Pages** 클릭 → 서브도메인 선택 화면이 나올 수 있음
   - 예: `steve-dev` 입력 → 주소가 `*.steve-dev.workers.dev`가 됨
   - 한 번 정하면 변경 어려우니 신중하게!

### Free 플랜 한도 (충분함)
- 일 10만 요청
- Durable Objects + SQLite: 5GB 무료
- WebSocket 지원 (Hibernation API)

---

## Step 2. Wrangler CLI 설치

Wrangler는 Cloudflare Worker를 배포하는 CLI 도구입니다.

```bash
# 글로벌 설치
npm install -g wrangler

# 설치 확인
wrangler --version
# 출력 예: ⛅️ wrangler 3.99.0
```

> **또는** 프로젝트 내에서 로컬로 사용하려면:
> ```bash
> cd worker
> npm install
> npx wrangler --version
> ```

---

## Step 3. Cloudflare 로그인

```bash
wrangler login
```

- 브라우저가 열리며 Cloudflare 로그인 페이지가 뜸
- 로그인 후 **"Allow"** 클릭
- 터미널에 `Successfully logged in.` 출력되면 성공

### 로그인 확인

```bash
wrangler whoami
```

출력 예:
```
Getting User settings...
👋 You are logged in with an OAuth Token, associated with the email steve@example.com!
┌─────────────────┬──────────────────────────────────┐
│ Account Name    │ Account ID                       │
├─────────────────┼──────────────────────────────────┤
│ Steve's Account │ abcdef1234567890abcdef1234567890 │
└─────────────────┴──────────────────────────────────┘
```

Account Name과 Account ID가 보이면 정상입니다.

---

## Step 4. Worker 배포

```bash
# worker 폴더로 이동
cd worker

# 의존성 설치 (처음 한 번만)
npm install

# 배포!
npx wrangler deploy
```

### 예상 출력

```
Total Upload: 5.12 KiB / gzip: 1.87 KiB
Uploaded pomodoro-craft-api (1.23 sec)
Deployed pomodoro-craft-api triggers (0.45 sec)
  https://pomodoro-craft-api.steve-dev.workers.dev
Current Version ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

> 🎉 저 URL이 배포된 API 주소! **복사해 두세요.**

---

## Step 5. 배포 확인 테스트

### 5-1. 헬스 체크

```bash
curl https://pomodoro-craft-api.YOUR-SUBDOMAIN.workers.dev/
```

정상 출력:
```
Pomodoro Craft API is running 🍅
```

### 5-2. Stats API (Durable Object 동작 확인)

```bash
curl https://pomodoro-craft-api.YOUR-SUBDOMAIN.workers.dev/api/stats
```

정상 출력:
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

### 5-3. 세션 기록 테스트

```bash
curl -X POST https://pomodoro-craft-api.YOUR-SUBDOMAIN.workers.dev/api/session \
  -H "Content-Type: application/json" \
  -d '{"minutes":25,"theme":"tomato","nick":"test"}'
```

정상 출력:
```json
{"ok":true,"mountain":{"blocks":83,"earned":3}}
```

> 3개 테스트 모두 통과하면 백엔드 배포 완료! 🎉

---

## Step 6. 프런트엔드 연결

`index.html`의 **3353번째 줄**에 배포 URL을 붙여넣기:

```javascript
// 변경 전
const DEFAULT_API = '';

// 변경 후 (본인 URL로 교체!)
const DEFAULT_API = 'https://pomodoro-craft-api.YOUR-SUBDOMAIN.workers.dev';
```

### 저장 후 확인

1. `index.html`을 브라우저에서 열기 (또는 GitHub Pages에서)
2. 개발자 도구(F12) → Console 탭 확인
3. WebSocket 연결 에러 없으면 성공
4. "📖 N STUDYING TOGETHER"에 실제 접속자 수가 표시됨

> **임시 테스트**: URL 파라미터로도 가능
> ```
> index.html?api=https://pomodoro-craft-api.YOUR-SUBDOMAIN.workers.dev
> ```

---

## Step 7. 업데이트 배포

코드 수정 후 다시 배포하려면:

```bash
cd worker
npx wrangler deploy
```

이게 전부입니다. 30초 안에 반영됩니다.

---

## 자주 겪는 문제

| 증상 | 원인 & 해결 |
|---|---|
| `Error: No account id found` | `wrangler login` 안 했거나 만료됨 → 다시 `wrangler login` |
| `Durable Object ... not found` | `wrangler.toml`의 `class_name`과 `index.js`의 `export class` 이름 확인 (둘 다 `FocusHub`이어야 함) |
| 브라우저에서 CORS 에러 | Worker 코드에 이미 `Access-Control-Allow-Origin: *` 설정됨. URL 끝에 `/` 빠졌는지 확인 |
| WebSocket 연결 실패 | `wss://` 프로토콜 확인. `http`→`ws` 변환은 `index.html`에 이미 포함 |
| `needs a Paid plan` 에러 | 이 프로젝트는 SQLite 기반 Durable Objects 사용 → Free 플랜에서 동작. KV 백엔드가 아닌지 확인 |
| 배포 후 이전 코드 실행됨 | Worker 전파에 최대 30초 소요. 잠시 후 다시 시도 |
| `npm install` 에러 | Node.js v18 이상인지 확인 (`node -v`) |

---

## 프로젝트 파일 구조

```
pomodo_timer/
├── index.html                    ← 프런트엔드 (Step 6에서 API URL 설정)
├── worker/
│   ├── package.json              ← wrangler 의존성
│   ├── wrangler.toml             ← Worker + DO 설정 (수정 불필요)
│   └── src/
│       └── index.js              ← Worker + FocusHub Durable Object 코드
├── CP-005-Cloudflare-Deploy-Guide.md  ← 이 문서
└── ...
```

---

## 요약: 전체 명령어 한눈에

```bash
# 1. Wrangler 설치 (최초 1회)
npm install -g wrangler

# 2. Cloudflare 로그인 (최초 1회)
wrangler login

# 3. 배포
cd worker
npm install
npx wrangler deploy
# → URL 복사

# 4. 프런트엔드 연결
# index.html 3353번째 줄의 DEFAULT_API에 URL 붙여넣기

# 5. 테스트
curl https://pomodoro-craft-api.YOUR-SUBDOMAIN.workers.dev/api/stats
```

**끝!** 총 5단계, 약 10분이면 완료됩니다.

---

## 다음 단계 (선택)

- **커스텀 도메인 연결**: Cloudflare 대시보드 → Workers → 해당 Worker → Settings → Triggers → Custom Domains
- **GitHub Pages에 프런트엔드 배포**: `index.html`을 GitHub Pages로 서빙하면 `file://` 대신 `https://`로 접근 가능
- **모니터링**: Cloudflare 대시보드 → Workers → Analytics에서 요청 수, 에러율, DO 스토리지 사용량 확인

---

*마지막 업데이트: 2026-04-10*
