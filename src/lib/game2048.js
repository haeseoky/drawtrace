export const SIZE = 4

// 한 줄(4칸) 처리: 이동 + 병합. 이동 발생 여부 반환
export function slide(line) {
  const vals = line.filter(Boolean)
  const out = []
  let gained = 0
  let moved = false
  for (let i = 0; i < vals.length; i++) {
    if (i + 1 < vals.length && vals[i].value === vals[i + 1].value) {
      const merged = { id: vals[i].id, value: vals[i].value * 2, r: vals[i].r, c: vals[i].c, merged: true }
      vals[i + 1].merged = true // 흡수되는 타일 제거 대상
      out.push(merged)
      gained += merged.value
      i++
    } else {
      out.push({ ...vals[i] })
    }
  }
  while (out.length < SIZE) out.push(null)
  // 위치 갱신 및 이동 감지
  for (let i = 0; i < SIZE; i++) {
    if (line[i] && out[i]) {
      if (line[i].id !== out[i].id || line[i].r !== out[i].r || line[i].c !== out[i].c) moved = true
    } else if (line[i] !== out[i]) moved = true
  }
  return { out, gained, moved }
}
