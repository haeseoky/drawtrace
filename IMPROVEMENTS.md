/**
 * DrawTrace 개선 완료 목록 (2026-08-20)
 *
 * 배경: 모바일 캐주얼 게임 트렌드 (hyper-casual 지속 성장, foldables 27.56% CAGR 예상)
 * 참고: smartphones 83.67% 점유율, foldables 2026-2031년 27.56% CAGR 예상
 */

// 완료된 개선사항
const completed = [
  '새 도형 추가 (2026-08-20): 초승달, 지그재그, 파도, 음표 - 난이도 2~3',
  '모바일 호환성: 터치 이벤트 정상 작동 확인 (preventDefault, passive: false)',
  '성능 최적화: 그리드 오프스크린 캐싱, rAF 배칭, 다운샘플링 구현됨',
  '채점 시스템: 형태/크기/커버리지/방향/위치 5가지 요소 다각화',
  '향법 피드백: 모바일 터치 시 진동(10ms) 반응'
]

// 추후 고려사항 (우선순위 낮음)
const futureConsiderations = [
  '게임 모드: 스피드, 정밀, 블리츠 모드 (필요시 구현)',
  'UX 개선: 터치 시작점 안내, 스와이프 취소, 도형 미리보기',
  '접근성: 색맹 지원, 음향 피드백, 시간 확장 옵션'
]

export { completed, futureConsiderations }