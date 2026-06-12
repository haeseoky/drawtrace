# DrawTrace 백로그

> 생성일: 2026-06-13 | 프로젝트: game.nutalk.co.kr
> 경로: /Users/haeseoky/work/study/project/website/drawtrace

---

## 🔴 Critical (2)

### BK-01 | Leaderboard gameId 불일치 — 랭킹이 아예 표시되지 않음
- **분류**: Bug
- **파일**: `src/views/DrawTracePage.vue:9` vs `src/components/DrawGame.vue:306`
- **문제**: Page에서 `<Leaderboard game-id="draw" />`로 설정했지만, DrawGame에서는 `addScore({ gameId: 'draw-trace', ... })`로 저장. 키가 달라서 리더보드가 항상 빈 상태로 표시됨.
- **수정**: `DrawTracePage.vue`의 game-id를 `"draw-trace"`로 변경

### BK-02 | 공유 모달에 항상 0점 표시
- **분류**: Bug
- **파일**: `src/views/DrawTracePage.vue:32`
- **문제**: `onScore()`가 점수를 받지만 `shareData.score`를 업데이트하지 않음. 공유 모달이 항상 초기값 0 표시.
- **수정**: `onScore` 안에 `shareData.score = result.score` 추가

---

## 🟠 High (2)

### BK-03 | BrickBreakerPage에 Leaderboard 누락
- **분류**: Bug / Feature
- **파일**: `src/views/BrickBreakerPage.vue`
- **문제**: 다른 4개 게임 페이지에는 Leaderboard가 있지만 벽돌깨기만 없음.
- **수정**: `<Leaderboard ref="lbRef" game-id="brick-breaker" />` 추가

### BK-04 | HomePage 스크롤 불가 — 작은 화면에서 하단 잘림
- **분류**: Bug / UX
- **파일**: `src/style.css:19-25` + `src/views/HomePage.vue`
- **문제**: `html, body`에 `position: fixed; overflow: hidden` 설정됨. HomePage에 `overflow-y: auto` 없어서 iPhone SE 등 작은 화면에서 하단 게임 카드/랭킹이 보이지 않고 스크롤도 불가.
- **수정**: `.home`에 `overflow-y: auto; -webkit-overflow-scrolling: touch;` 추가

---

## 🟡 Medium (7)

### BK-05 | scorer.js SpatialGrid 해시 충돌 가능성
- **분류**: Bug / Performance
- **파일**: `src/lib/scorer.js:109-141`
- **문제**: XOR 기반 해시에서 JS 비트 연산이 32비트 정수로 변환되어 서로 다른 셀이 같은 해시값 가질 수 있음. 또한 3x3 셀만 검색하여 먼 포인트가 Infinity 반환 → 점수 0.
- **수정**: 문자열 키 `` `${cx},${cy}` `` 사용 또는 5x5 검색 + Infinity fallback

### BK-06 | JSON.parse 예외 처리 누락
- **분류**: Bug / Security
- **파일**: `src/lib/leaderboard.js:39,45`
- **문제**: `JSON.parse(localStorage.getItem(...))`에 try-catch 없음. localStorage 손상 시 앱 전체 크래시.
- **수정**: getLeaderboard 전체를 try-catch로 감싸고 catch 시 `return []`

### BK-07 | 라우터 404 처리 없음
- **분류**: UX
- **파일**: `src/router/index.js`
- **문제**: 정의되지 않은 경로 접속 시 빈 화면. catch-all 라우트 없음.
- **수정**: `{ path: '/:pathMatch(.*)*', redirect: '/' }` 추가

### BK-08 | BrickBreaker 리사이즈 시 그라디언트 캐시 무효화 누락
- **분류**: Bug
- **파일**: `src/components/BrickBreakerGame.vue:763-768`
- **문제**: `handleResize()`에서 `setupCanvas()`만 호출. 새 ctx가 생성되지만 `brickGradCache`/`paddleGradCache`는 이전 ctx의 그라디언트 객체 유지 → 렌더링 오류/크래시.
- **수정**: `setupCanvas()` 내에서 캐시 초기화 로직 추가

### BK-09 | DrawGame highScore와 Leaderboard 이중 관리
- **분류**: CodeQuality
- **파일**: `src/components/DrawGame.vue:582-587`
- **문제**: `localStorage.getItem('drawtrace-highscore')`로 별도 관리 + `leaderboard.js`의 `addScore`로도 저장. 두 저장소가 독립적이라 불일치 가능.
- **수정**: `getBestScore('draw-trace')`로 단일 소스 통일

### BK-10 | vite.config.js 불완전한 코드 스플리팅
- **분류**: Performance
- **파일**: `vite.config.js:12-17`
- **문제**: BrickBreakerGame, DrawGame, scorer만 manualChunks로 분리. 나머지 3개 게임은 메인 번들에 포함.
- **수정**: 모든 게임 컴포넌트를 별도 청크로 분리

### BK-11 | 카카오 공유 URL 비표준 — 작동 안 함
- **분류**: Bug
- **파일**: `src/lib/share.js:38-41`
- **문제**: `https://sharer.kakao.com/talk/friends/picker/link?url=...&text=...`는 공식 API가 아님. 작동하지 않거나 빈 페이지 표시.
- **수정**: Kakao JS SDK 연동 또는 `kakaotalk://` 스킴 사용

---

## 🟢 Low (8)

### BK-12 | ColorMatchGame 초기 빈 화면
- **분류**: UX
- **파일**: `src/components/ColorMatchGame.vue:28-43`
- **문제**: idle 상태에서 displayText/displayColor가 빈 문자열. 다른 게임은 intro overlay가 있는데 ColorMatch는 없음.
- **수정**: idle 상태 안내 오버레이 추가

### BK-13 | MemoryGame 완료해도 0점 가능
- **분류**: UX
- **파일**: `src/components/MemoryGame.vue:145-149`
- **문제**: 이동 패널티가 페어 보너스보다 커지면 0점. 시간 초과 시 특히 심함.
- **수정**: 최소 보너스 보장 또는 패널티 계수 조정

### BK-14 | BrickBreaker 공 수평 각도 시 무한 반복
- **분류**: Bug
- **파일**: `src/components/BrickBreakerGame.vue:500-504`
- **문제**: 패들 가장자리에서 튕긴 공이 수평에 가까워지면 벽만 튕기며 벽돌에 닿지 않는 루프 발생.
- **수정**: `Math.abs(ball.dy) < ball.speed * 0.2` 시 최소 수직 속도 보장

### BK-15 | DrawGame onTouchStart 이중 드로우
- **분류**: Performance
- **파일**: `src/components/DrawGame.vue:336-337`
- **문제**: `drawFrame()` 직접 호출 후 `requestDraw()`도 호출. 동일 데이터로 2번 렌더링.
- **수정**: 첫 프레임만 직접 호출, requestDraw 제거

### BK-16 | scorer.js downsample 거리 중복 계산
- **분류**: Performance
- **파일**: `src/lib/scorer.js:58,61-62`
- **문제**: 루프에서 같은 `dist()`를 두 번 계산.
- **수정**: 거리를 변수에 캐시

### BK-17 | share.js BASE_URL 하드코딩
- **분류**: CodeQuality
- **파일**: `src/lib/share.js:5`
- **문제**: `'https://game.nutalk.co.kr'` 하드코딩. 개발/스테이징 전환 불가.
- **수정**: `import.meta.env.VITE_BASE_URL || window.location.origin`

### BK-18 | HomePage 랭킹 객체 직접 변형
- **분류**: CodeQuality
- **파일**: `src/views/HomePage.vue:103`
- **문제**: `getLeaderboard()` 반환 객체에 직접 속성 추가. 향후 캐싱 시 부작용 가능.
- **수정**: map으로 새 객체 생성

### BK-19 | ReactionGame 백그라운드 탭 시간 측정 부정확
- **분류**: Bug
- **파일**: `src/components/ReactionGame.vue:65-68`
- **문제**: `performance.now()`는 백그라운드에서 멈춤. 탭 전환 후 복귀 시 반응 시간이 실제보다 짧게 측정될 수 있음.
- **수정**: 탭 복귀 시 go 상태를 wait로 되돌리기

---

## 우선순위 권장 순서

```
BK-01 → BK-02 → BK-03 → BK-04 → BK-06 → BK-08
(핵심 버그 우선 → UX → 나머지)
```
