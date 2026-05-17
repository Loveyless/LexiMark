/**
 * Token 归一化（DESIGN §1.2 + PRD §8.5）。
 *
 * 流程：
 *   raw → lower
 *   if lemmaMap has lower → 返回 lemma
 *   else → 返回 lower
 *
 * "原词优先" 已经在构建 lemmaMap 时处理（lemma-map.ts 跳过 wordSet 命中的 inflected）。
 * 所以这里只要顺序很简单的查表即可。
 */
export function normalizeWord(
  raw: string,
  lemmaMap: Map<string, string>,
): string {
  const lower = raw.trim().toLowerCase()
  if (!lower) return ''
  const lemma = lemmaMap.get(lower)
  return lemma ?? lower
}

/** 仅做小写，不查 lemma。用于判定阶段：先看原词是否在词典里 */
export function lowerOnly(raw: string): string {
  return raw.trim().toLowerCase()
}
