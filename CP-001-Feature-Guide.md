# CP-001 — Pomodoro Craft 신규 기능 가이드

> 이 문서는 2026-04-08에 추가된 성장/그로스용 기능들이 **무엇이고**, **어떻게 쓰는지**, **당신이 추가로 뭘 해야 하는지** 를 정리한 가이드예요.
> 기술을 잘 몰라도 읽을 수 있도록 "뭘 했는지 → 왜 했는지 → 어떻게 쓰는지" 순서로 썼어요.

---

## 🎯 한 줄 요약

**앱 코드에 7가지 기능을 추가했어요.** 이 기능들의 목적은 단 하나 — 당신이 채널(유튜브/블로그/SNS)에서 이 앱을 **콘텐츠 안으로 자연스럽게 녹여서** 시청자를 앱으로 유입시키는 거예요.

---

## 📦 추가한 기능 목록 (전체)

| # | 기능 | 한 마디 설명 |
|---|---|---|
| 1 | **SEO 메타 태그** | 구글/트위터/디스코드에 링크 붙였을 때 예쁜 미리보기 카드가 뜸 |
| 2 | **URL 파라미터** | 링크 하나로 "Ruby 테마 + 30분 집중 + 자동 시작" 같은 프리셋 실행 |
| 3 | **Focus Companion Mode** | 앱을 OBS 배경/유튜브 라이브 배경으로 쓸 수 있는 풀스크린 모드 |
| 4 | **HARVEST 인벤토리** | 오늘 완료한 집중 세션을 이모지로 모으는 게임 루프 |
| 5 | **Share 버튼** | 원클릭으로 "오늘 수확" 트윗 생성 |
| 6 | **Social Proof 카운터** | "🌱 N명이 지금 집중 중" 표시 |
| 7 | **애널리틱스 자리** | Plausible/GA4 주석으로 삽입 위치 표시 (나중에 붙이기 쉽게) |

---

## 1️⃣ SEO 메타 태그 — "링크 붙였을 때 예뻐지기"

### 뭘 했나요?

HTML 상단 `<head>` 에 **검색 엔진과 소셜미디어가 읽는 태그들**을 넣었어요.

- **제목**: `Pomodoro Craft — Minecraft Focus Timer 🍅 Study with Steve`
- **설명**: "A free Minecraft-themed pomodoro timer..."
- **키워드**: `pomodoro timer, minecraft pomodoro, pixel timer, cute study timer...`
- **OG 이미지**: 공유 시 표시될 큰 이미지 링크 (아직 실제 이미지 파일은 없음 — 아래 "당신이 할 일" 참조)
- **Twitter Card**: 트위터 전용 대형 이미지 카드
- **JSON-LD 구조화 데이터**: 구글이 이 앱을 "WebApplication" 으로 인식하게 해주는 메타

### 왜 했나요?

- **구글 검색 최적화(SEO)**: 누군가 "minecraft pomodoro" 라고 검색했을 때 이 앱이 뜰 가능성이 생김
- **소셜 공유 시 리치 카드**: 디스코드/트위터/슬랙/카톡에 링크 붙이면 제목 + 설명 + 이미지가 큰 카드로 떠서 클릭률 2-3배 상승

### 확인 방법

1. 브라우저 탭 제목을 보세요 → "Pomodoro Craft — Minecraft Focus Timer 🍅 Study with Steve"
2. [OpenGraph Debugger](https://www.opengraph.xyz/) 같은 사이트에 앱 URL 붙여넣으면 미리보기 확인 가능

---

## 2️⃣ URL 파라미터 — "링크 하나로 프리셋 실행"

### 뭘 했나요?

앱 URL 뒤에 `?` 뒤에 파라미터를 붙이면 **기본값을 바꿔서 시작**할 수 있어요.

### 지원하는 파라미터

| 파라미터 | 값 | 설명 |
|---|---|---|
| `theme` | `tomato`, `diamond`, `emerald`, `gold`, `ruby` | 시작 시 테마 지정 |
| `mode` | `companion` | Companion Mode (풀스크린, UI 숨김) |
| `focus` | 1~180 | 집중 시간(분) |
| `break` | 1~60 | 짧은 휴식 시간(분) |
| `long` | 1~120 | 긴 휴식 시간(분) |
| `autostart` | `1` 또는 `true` | 페이지 로드 직후 타이머 자동 시작 |

### 실전 예시 링크

```
기본:
https://stevekim0417.github.io/pomodoro-craft/

50분 Ruby 딥워크 (자동 시작):
https://stevekim0417.github.io/pomodoro-craft/?focus=50&break=10&theme=ruby&autostart=1

25분 기본 + Gold 테마:
https://stevekim0417.github.io/pomodoro-craft/?theme=gold

Companion Mode (OBS/라이브 배경용):
https://stevekim0417.github.io/pomodoro-craft/?mode=companion

Companion Mode + 30분 + 자동 시작:
https://stevekim0417.github.io/pomodoro-craft/?mode=companion&focus=30&autostart=1
```

### 어떻게 활용하나요?

- **유튜브 영상 설명란에 링크**:
  > 📌 영상에서 쓴 타이머: https://stevekim0417.github.io/pomodoro-craft/?focus=25&autostart=1
  >
  > 딥워크 모드 (50분): https://stevekim0417.github.io/pomodoro-craft/?focus=50&theme=ruby&autostart=1
- **트윗/인스타에 링크 공유**: "50분 공부 타이머 돌리는 중 🔥 " + 링크
- **블로그 글 안에 CTA**: "이 글 읽고 바로 집중해보고 싶다면 [여기를 누르세요]"

---

## 3️⃣ Focus Companion Mode — "앱을 방송 배경으로 쓰기"

### 뭘 했나요?

URL에 `?mode=companion` 을 붙이면 앱이 **완전히 다른 레이아웃**으로 바뀌어요:

- **사라지는 것들**: START 버튼, 설정, 핫바, 통계, Share 버튼, 푸터, 타이틀 등 모든 UI
- **남는 것들**: 풀스크린 scene (Steve + 배경) + 상단에 작은 타이머 오버레이

### 왜 했나요?

이 모드는 **YouTube 라이브 스트림이나 OBS의 브라우저 소스**로 쓰기 위한 거예요. Lofi Girl 채널이 "공부하는 여자아이" 애니메이션을 풀스크린으로 띄워놓고 24/7 방송하는 것과 같은 구조입니다.

### 어떻게 활용하나요?

#### 방법 A — OBS에서 브라우저 소스로 쓰기

1. OBS Studio 열기
2. 하단 `소스(Sources)` → `+` → `브라우저(Browser)` 선택
3. URL에 이걸 입력:
   ```
   https://stevekim0417.github.io/pomodoro-craft/?mode=companion&focus=25&autostart=1
   ```
4. 너비 1920, 높이 1080 입력
5. OK → 방송 화면에 Steve가 풀스크린으로 뜸

#### 방법 B — 유튜브 라이브 스트림 배경으로 쓰기

1. 위와 동일하게 OBS 브라우저 소스 추가
2. 그 위에 본인 웹캠을 오버레이로 올리면 "나 + Steve + 타이머" 구성 완성
3. "Study with me — Pomodoro Craft" 같은 제목으로 라이브 시작

#### 방법 C — 데스크톱에서 "분위기 모드" 로 쓰기

그냥 브라우저 창을 새 탭으로 열고 `?mode=companion` 링크 열기 → 풀스크린(F11) → 옆 모니터에 띄워놓고 공부

### 주의사항

- Companion Mode 에선 **START/SKIP/RESET 버튼이 안 보여요**. 그래서 `?autostart=1` 을 붙이지 않으면 타이머가 멈춰 있어요. 항상 같이 쓰세요.
- 키보드 단축키는 여전히 작동합니다: `Space`(시작/일시정지), `S`(스킵), `R`(리셋)

---

## 4️⃣ HARVEST 인벤토리 — "오늘 수확한 것 보여주기"

### 뭘 했나요?

화면 하단 `TODAY` 통계 밑에 **점선 구분선 + HARVEST 행**을 추가했어요. 오늘 완료한 포커스 세션 수만큼 **현재 테마의 이모지**가 표시돼요.

### 테마별 이모지

- 🍅 Tomato
- 💎 Diamond
- 💚 Emerald
- 🟡 Gold
- ❤️ Ruby

### 동작 방식

- 첫 세션 전: `— no harvest yet —`
- 세션 1개 완료: `🍅`
- 세션 5개 완료: `🍅🍅🍅🍅🍅`
- 세션 10개 초과: `🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅 ×15`
- 테마 전환하면: 이모지도 즉시 바뀜 (Diamond로 바꾸면 `💎💎💎...`)

### 왜 했나요?

Forest 앱의 "나무 → 숲" 패턴과 같은 **게임 루프**예요. 숫자만 보는 것보다 **"내가 오늘 수확한 것"** 으로 시각화될 때 성취감이 커져요. 내일 또 하고 싶어지게 만드는 장치예요.

---

## 5️⃣ Share 버튼 — "오늘의 수확 자랑하기"

### 뭘 했나요?

`TODAY` 통계 아래에 **파란 `📣 SHARE TODAY'S HARVEST` 버튼**을 추가했어요.

### 동작

버튼을 누르면:

- **모바일에서**: 네이티브 공유 시트(카톡/인스타/메시지 등)가 뜸
- **데스크톱에서**: 트위터 작성 창이 새 탭으로 열림

### 자동 생성되는 메시지 예시

세션 0개:
```
Starting my focus session with Pomodoro Craft 🍅
A cute Minecraft-themed pomodoro timer.
https://stevekim0417.github.io/pomodoro-craft/
```

세션 3개 (tomato 테마):
```
🍅🍅🍅 Just harvested 3 🍅 today with Pomodoro Craft!
⏱ 75 minutes of focus.

A cozy Minecraft pomodoro timer — try it:
https://stevekim0417.github.io/pomodoro-craft/
```

### 왜 했나요?

**바이럴 루프의 시작점**이에요. Duolingo가 "N일 연속 스트릭" 공유 기능으로 수백만 번 바이럴됐듯이, 이 버튼이 **자신도 모르게 앱을 홍보하는 시스템**을 만들어요. 사용자가 수확 자랑하면 → 팔로워가 본다 → 링크 클릭 → 새 사용자 유입.

---

## 6️⃣ Social Proof — "혼자 공부하는 거 아니에요"

### 뭘 했나요?

progress bar 바로 아래에 **`🌱 N focusing now`** 초록색 텍스트를 표시해요.

### 동작 방식

- 숫자는 **시간대별 활동 곡선**에 따라 달라짐
  - 새벽 3-7시: 20~40명 (낮음)
  - 오전 9-12시: 120~160명 (공부 피크)
  - 오후 2-5시: 140~175명 (피크)
  - 저녁 8-11시: 130~170명 (야간 피크)
- 30초마다 작은 변동(±20)
- **break 모드에선** 글자 색이 파란색으로 바뀜

### 솔직히 말하면...

이건 **실제 동접자 수가 아니에요**. 진짜 동접자를 세려면 백엔드 서버가 필요한데, 지금은 단일 HTML 파일이라 불가능해요. 대신 **시간대별 실제 포모도로 사용 패턴**을 반영한 추정치예요.

나중에 백엔드(Supabase, Firebase, 직접 만든 API 등)가 생기면 진짜 WebSocket 동접자로 바꾸면 돼요. 관련 코드는 `estimateFocusersNow()` 함수 하나만 교체하면 됩니다.

### 왜 했나요?

Lofi Girl 채널의 라이브 스트림에 "12,345 watching now" 가 뜨는 이유와 같아요 — **"나만 공부하는 게 아니다"** 는 심리적 연대감을 만들어서 이탈을 줄여요.

---

## 7️⃣ 애널리틱스 자리 — "나중에 추적 코드 붙이기 쉽게"

### 뭘 했나요?

HTML `<head>` 에 **주석 처리된 Plausible 스크립트 태그**를 넣어놨어요.

```html
<!-- Analytics placeholder — drop your Plausible or GA4 snippet here when ready
<script defer data-domain="pomodorocraft.com" src="https://plausible.io/js/script.js"></script>
-->
```

### 어떻게 활성화하나요?

#### 옵션 1 — Plausible (추천, 유료 $9/월)

1. [plausible.io](https://plausible.io) 가입
2. 도메인 추가
3. 위 주석의 `<!-- ... -->` 를 지우고 `data-domain` 을 본인 도메인으로 변경
4. 커밋 & 배포

#### 옵션 2 — Google Analytics 4 (무료)

1. [analytics.google.com](https://analytics.google.com) 에서 속성 만들기
2. 측정 ID 복사 (예: `G-XXXXXXXXXX`)
3. 위 주석을 지우고 GA4 스니펫으로 교체:
   ```html
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'G-XXXXXXXXXX');
   </script>
   ```

### 뭘 추적해야 하나요?

처음엔 기본 페이지뷰만 충분해요. 나중에 여유가 생기면:

- **"SHARE 버튼 클릭"** 이벤트 → 바이럴 루프 효과 측정
- **"테마 변경"** 이벤트 → 어떤 테마가 인기인지
- **"세션 완료"** 이벤트 → 실제 완주율

---

## 🌐 당신이 직접 해야 할 외부 작업 (코드 밖)

코드로는 할 수 없는 일들. 우선순위 순서입니다.

### 🔥 지금 당장 (오늘~내일)

1. **git commit & push**
   ```bash
   cd /Users/steve/no_sync_project/pomodo_timer
   git add .
   git commit -m "feat: add SEO, URL params, companion mode, harvest, share, social proof"
   git push
   ```
   → 5분 안에 https://stevekim0417.github.io/pomodoro-craft/ 에 반영됨

2. **실제 URL에서 테스트**
   - `https://stevekim0417.github.io/pomodoro-craft/?mode=companion&focus=30&autostart=1` 열어보기
   - 트위터/디스코드에 링크 붙여서 OG 카드 미리보기 확인

### ⭐ 1주일 안에

3. **OG 이미지 만들기** — 공유 시 뜨는 1200×630px 이미지
   - 오늘 찍은 스크린샷 중 예쁜 걸 Figma/Canva/Photoshop 에서 1200×630 으로 리사이즈
   - 파일명 `og-image.png` 로 저장
   - 프로젝트 루트(`index.html` 옆)에 업로드
   - 자동으로 메타 태그가 이 이미지를 참조함

4. **GitHub Repository 정돈**
   - `README.md` 에 Companion Mode 사용법 섹션 추가
   - 스크린샷 2-3장 README 에 삽입
   - "Try it" 버튼 (배지) 추가

### 📅 2주일 안에

5. **도메인 구입 (선택)**
   - `pomodorocraft.com` 또는 `pomocraft.app` 같은 도메인
   - Cloudflare Registrar 가 가장 저렴 (~$10/년)
   - GitHub Pages 설정에서 Custom Domain 연결
   - 메타 태그의 canonical/og:url 업데이트

6. **Discord 서버 개설**
   - 채널 3개만: `#general`, `#screenshots`, `#feedback`
   - 초대 링크를 footer에 추가 (코드 수정 필요 — 알려주시면 제가 해드림)

7. **Product Hunt "Coming Soon" 페이지**
   - https://www.producthunt.com/launches/new 에서 시작
   - 런칭 날짜 2주 후로 설정
   - 사용자분 채널 구독자에게 "런칭 예정" 예고

### 🎬 3-4주 안에

8. **첫 콘텐츠 제작**
   - 유튜브 쇼트폼 1개: "25분 집중 타이머 만들어봤어요" (30-60초)
   - 유튜브 롱폼 1개: "Study with me — Pomodoro Craft" (30-60분 라이브 또는 녹화)
   - 트위터 스레드 1개: "I built a Minecraft pomodoro timer — here's why"

9. **Reddit 배포**
   - r/productivity: "I built a free Minecraft-themed pomodoro timer"
   - r/Minecraft: "Steve helps you focus — a pomodoro timer"
   - r/getStudying, r/studytips, r/GetMotivated
   - 각 subreddit 규칙 먼저 확인 (자기 홍보 허용 여부)

10. **Hacker News Show HN**
    - "Show HN: Pomodoro Craft – a Minecraft-themed focus timer in a single HTML file"
    - 화요일~목요일 오전 10시(PT) 가 최적

---

## ⚡ 빠른 참조 (Cheat Sheet)

### 유용한 URL 템플릿

```
# 기본
https://stevekim0417.github.io/pomodoro-craft/

# 클래식 25분 / Tomato / 자동 시작
?autostart=1

# 50분 딥워크 / Ruby
?focus=50&break=10&theme=ruby&autostart=1

# 포모도로 기본 (25/5) / Emerald
?theme=emerald

# 90분 몰입 / Gold (포모도로 규칙 무시)
?focus=90&break=15&theme=gold&autostart=1

# Companion Mode (라이브 배경)
?mode=companion&focus=25&autostart=1

# Companion Mode + 커스텀 시간 + Ruby
?mode=companion&focus=50&break=10&theme=ruby&autostart=1
```

### 키보드 단축키

| 키 | 동작 |
|---|---|
| `Space` | 시작 / 일시정지 / 재개 |
| `S` | 스킵 |
| `R` | 리셋 |
| `F11` | 브라우저 풀스크린 (Companion Mode 랑 같이 쓰면 극대화) |

### 파일 위치

- **앱 전체 코드**: `index.html` (단일 파일)
- **README**: `README.md`
- **이 문서**: `CP-001-Feature-Guide.md`

---

## ❓ 자주 묻는 질문 (FAQ)

### Q1. Companion Mode 에서 타이머가 안 시작해요

`?autostart=1` 파라미터를 같이 붙여야 해요. Companion Mode 는 START 버튼이 숨겨져 있어서 수동으로 못 시작하거든요.

### Q2. URL 파라미터로 설정한 값이 저장되나요?

**아니요.** URL 파라미터는 일회성이에요. 브라우저를 닫았다 다시 열면 저장된 기본값(또는 토마토)으로 돌아가요. 이건 의도된 동작 — 프리셋 링크를 공유받은 사람의 기본값을 영구히 바꾸지 않기 위해서예요.

### Q3. Social Proof 숫자가 진짜인가요?

**아니요**, 지금은 시간대별 추정치예요. 진짜 동접자를 세려면 백엔드 서버가 필요한데 현재는 단일 HTML 파일이라 불가능합니다. 나중에 Supabase/Firebase 같은 백엔드를 붙이면 진짜로 바꿀 수 있어요.

### Q4. 테마를 바꾸면 저장되나요?

**세션 내에서만** 유효해요. 페이지를 새로고침하면 항상 Tomato로 돌아갑니다. 이건 의도된 동작이에요 — Tomato 가 앱의 정체성이라서.

### Q5. 광고를 넣어도 되나요?

**강력히 비추**예요. 집중 타이머에 광고를 넣으면 사용자가 한 번 보고 영영 이탈해요. Forest/Habitica/Lofi Girl 모두 광고를 쓰지 않거나 최소화합니다. 나중에 유료 테마 팩 ($2-3 원타임) 이나 서포터 후원(Ko-fi, Buy Me a Coffee) 이 더 나은 수익 모델이에요.

### Q6. 모바일에서 Share 버튼이 안 보여요

HTML 의 `<meta viewport>` 는 이미 모바일 지원이에요. 버튼이 안 보이면 스크롤을 내려보세요. 하단 `TODAY 통계` 다음에 있어요.

### Q7. "BLOCKS 669" 같은 큰 숫자는 뭐예요?

Steve 가 땅을 파면서 "언덕을 쌓는" 애니메이션 때문에 누적된 블록 수예요. 집중한 시간이 길어질수록 자동으로 올라갑니다.

---

## 📊 오늘 추가된 코드 요약

| 변경 | 위치 | 줄 수 |
|---|---|---|
| SEO 메타 태그 + JSON-LD | `<head>` | +40줄 |
| URL 파라미터 파싱 | `<script>` 상단 | +15줄 |
| Companion Mode CSS | `<style>` | +30줄 |
| Companion Mode JS | init 블록 | +3줄 |
| HARVEST 인벤토리 | `renderDailyStats` + THEMES | +20줄 |
| Share 버튼 UI | HTML + CSS | +20줄 |
| Share 함수 | `<script>` | +35줄 |
| Social Proof 함수 | `<script>` | +25줄 |
| Social Proof UI | HTML + CSS | +15줄 |

**총 추가 라인**: 약 **200줄** (전체 `index.html` 의 ~10%)

**기존 파일 수**: 단일 `index.html` 유지 (의존성 0 원칙 지켰음)

---

## 🚀 마무리 — 다음 단계는?

이 문서를 다 읽으셨다면, 다음 3가지 중 하나를 오늘 해보세요:

1. **실제로 한 번 써보기** — 지금 브라우저에서 `?mode=companion&focus=25&autostart=1` 링크를 열어 Companion Mode 체험
2. **git commit 후 배포** — GitHub Pages 에 바로 반영. 5분이면 끝.
3. **OG 이미지 하나 만들기** — Canva/Figma 에서 15분이면 만들 수 있어요. 소셜 공유 효과가 즉시 2-3배 상승.

---

**문서 버전**: v1.0
**작성일**: 2026-04-08
**문서 관리**: 기능 추가/변경 시 이 파일을 업데이트하거나 `CP-002-*.md` 로 후속 문서 생성
