# DrawTrace 개선 백로그

> game.nutalk.co.kr — 미니게임 허브 (따라그리기, 반응속도, 기억력, 컬러매치, 벽돌깨기)
> 우선순위: 🔴 높음 / 🟡 보통 / 🟢 낮음
> 상태: ⬜ 미시작 / 🔧 진행 중 / ✅ 완료

---

## 🔴 높음 (High)

### 1. ⬜ Leaderboard 백엔드 연동
- **설명:** 현재 localStorage 기반 리더보드를 서버 기반으로 전환
- **방법:** Cloudflare Workers + KV/D1, 또는 Supabase로 글로벌 리더보드 구현
- **현재:** `lib/leaderboard.js` — localStorage only, 기기 내 랭킹만 표시
- **기대효과:** 실제 경쟁 요소, 재방문율 대폭 향상

### 2. ⬜ 공유 기능 정상화
- **설명:** 카카오 공유 URL이 비표준이라 작동 안 함
- **방법:** Kakao JS SDK 연동 또는 `kakaotalk://` 스킴 사용, 네이버 밴드 공유 추가
- **현재:** `lib/share.js`의 `https://sharer.kakao.com/talk/friends/picker/link?url=...` 작동 안함
- **기대효과:** 바이럴 확산, 유입 증가

### 3. ⬜ 추가 게임 콘텐츠
- **설명:** 게임 수 확장으로 허브 가치 증대
- **방법:** 퍼즐/보드게임류 추가 (2048, 테트리스, 스도쿠, 지뢰찾기 등)
- **현재:** 5종 게임 (따라그리기, 반응속도, 기억력카드, 컬러매치, 벽돌깨기)
- **기대효과:** 타겟 오디언스 확대, 체류 시간 증가

### 4. ⬜ PWA 및 오프라인 지원
- **설명:** 모바일 게임은 오프라인 플레이가 필수
- **방법:** manifest.json + Workbox service worker (게임 에셋 캐싱)
- **현재:** PWA 설정 없음, `viewport-fit=cover`, pull-to-refresh 방지만 있음
- **기대효과:** 네트워크 없이도 게임 플레이, 앱스토어 대체

### 5. ⬜ GA4 / 분석 도구 연동
- **설명:** 게임별 플레이 수, 이탈률, 평균 점수 추적 부재
- **방법:** GA4 이벤트 (game_start, game_end, score_submit, share_click)
- **현재:** 분석 도구 전무
- **기대효과:** 데이터 기반 게임 밸런싱, 인기 게임 파악

---

## 🟡 보통 (Medium)

### 6. ⬜ BrickBreaker 게임 밸런스 개선
- **설명:** 공 수평 각도 시 무한 반복 버그, 아이템 밸런스 조정
- **방법:** 최소 수직 속도 보장 (`|dy| < speed * 0.2` 시 보정)
- **현재:** `BrickBreakerGame.vue:500-504` 수평 각도 루프 발생 가능
- **기대효과:** 플레이 경험 개선, 좌절감 방지

### 7. ⬜ scorer.js SpatialGrid 안정성 강화
- **설명:** XOR 해시 충돌 가능성, 먼 포인트 Infinity 반환
- **방법:** 문자열 키 `` `${cx},${cy}` `` 사용 또는 5x5 검색 + Infinity fallback
- **현재:** 32비트 XOR 해시, 3x3 셀만 검색 → 점수 0 가능성
- **기대효과:** 채점 정확도 향상, 점수 편차 감소

### 8. ⬜ ColorMatchGame 초기 화면 개선
- **설명:** idle 상태에서 빈 화면 노출
- **방법:** intro 오버레이 추가 (다른 게임들은 이미 있음)
- **현재:** `ColorMatchGame.vue:28-43` idle 시 displayText/displayColor 빈 문자열
- **기대효과:** 첫인상 개선, 플레이 유도

### 9. ⬜ MemoryGame 점수 밸런스
- **설명:** 페널티가 보너스보다 커지면 0점 가능
- **방법:** 최소 보너스 보장 또는 패널티 계수 조정
- **현재:** `MemoryGame.vue:145-149` 이동 패널티 > 페어 보너스 시 0점
- **기대효과:** 플레이어 보상감 유지

### 10. ⬜ vite 코드 스플리팅 완성
- **설명:** 일부 게임만 manualChunks로 분리됨
- **방법:** 5개 게임 모두 별도 청크로 분리
- **현재:** BrickBreakerGame, DrawGame, scorer만 분리, 나머지 3개는 메인 번들
- **기대효과:** 초기 로딩 속도 향상, 게임별 지연 로딩

### 11. ⬜ 다국어 지원 (i18n)
- **설명:** 영어 지원으로 글로벌 게임 허브 확장
- **방법:** 게임 설명, UI 텍스트 번역, 언어 토글
- **현재:** 한국어만 지원
- **기대효과:** 해외 트래픽 유입

---

## 🟢 낮음 (Low)

### 12. ⬜ ReactionGame 백그라운드 탭 시간 측정 수정
- **설명:** 탭 전환 후 복귀 시 반응 시간이 실제보다 짧게 측정
- **방법:** visibilitychange 이벤트로 탭 복귀 시 wait 상태로 되돌리기
- **현재:** `ReactionGame.vue:65-68` performance.now() 사용
- **기대효과:** 부정 점수 방지

### 13. ⬜ DrawGame 이중 드로우 최적화
- **설명:** onTouchStart에서 drawFrame() 직접 호출 후 requestDraw()도 호출
- **방법:** 첫 프레임만 직접 호출, requestDraw 제거
- **현재:** `DrawGame.vue:336-337` 동일 데이터로 2번 렌더링
- **기대효과:** 불필요한 렌더링 제거

### 14. ⬜ share.js BASE_URL 하드코딩 제거
- **설명:** 운영 URL 하드코딩
- **방법:** `import.meta.env.VITE_BASE_URL || window.location.origin`
- **현재:** `'https://game.nutalk.co.kr'` 고정
- **기대효과:** 개발/스테이징 전환 용이

### 15. ⬜ 라우터 404 처리
- **설명:** 정의되지 않은 경로 시 빈 화면
- **방법:** `{ path: '/:pathMatch(.*)*', redirect: '/' }` 추가
- **현재:** catch-all 라우트 없음
- **기대효과:** UX 개선

### 16. ⬜ 접근성(a11y) 강화
- **설명:** 스크린 리더, 키보드 플레이 지원
- **방법:** 게임별 aria-live 영역, 키보드 컨트롤 매핑
- **현재:** 기본 aria-label만 적용
- **기대효과:** 웹 접근성 준수

---

## 완료됨 (Done)

### ✅ 5종 미니게임
- 모양 따라그리기 (DrawGame + scorer.js 정밀 채점 엔진)
- 반응 속도 테스트 (ReactionGame)
- 기억력 카드 (MemoryGame)
- 컬러 매치 (ColorMatchGame)
- 핑퐁 벽돌깨기 (BrickBreakerGame)

### ✅ 채점 시스템
- scorer.js — 6요소 가중 평점 (형태 35%, 커버리지 25%, 크기 20%, 방향 10%, 위치 10%)
- SpatialGrid O(n) 최근접이웃 탐색
- 다운샘플링 (100포인트), 최소 크기 필터
- 상세 점수 분석 (shape/size/coverage/direction/position)

### ✅ UI/UX
- 모바일 최적화 (`max-width: 480px`, `viewport-fit=cover`)
- 다크 그라데이션 헤더 + 라이트 본문
- 전체 랭킹 TOP 5 (홈화면)
- 게임별 개별 리더보드
- 공유 모달, 풀투리프레시 방지

### ✅ 인프라
- Vue 3 + Vite 8 + Vue Router 4
- vitest 테스트 환경
- JSON-LD 구조화된 데이터 (WebApplication/Game)
- Open Graph / Twitter Card 메타
- robots.txt, _headers, _redirects
- 동적 SVG 파비콘

### ✅ SEO
- 키워드 메타 (미니게임, 따라그리기 등)
- canonical URL
- Cache-Control 헤더

---

_최종 업데이트: 2026-07-01_
