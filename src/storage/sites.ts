/**
 * 当前域名是否被用户禁用。
 * - 传入 host（如 "github.com"）和设置中的 disabledSites
 * - 列表里若存在 host 或它的父域，都视为禁用
 */
export function isHostDisabled(host: string, disabled: string[]): boolean {
  if (!host) return false
  return disabled.some((d) => d === host || host.endsWith('.' + d))
}

/**
 * 用户在 popup 中切换"当前网站"开关时调用。
 *
 * 语义：
 * - 当前 host 被 list 间接或直接禁用 → 启用：移除 list 中所有等于 host 或视 host 为父域的项；
 *   这意味着在子域上启用会顺带启用父域（已知折中，避免冗余项累积）。
 * - 当前 host 未被禁用 → 禁用：先移除 list 中所有"以 host 为父域的子域项"（将被新 host 覆盖），
 *   再 push host 自身，避免冗余。
 */
export function toggleHostInList(host: string, list: string[]): string[] {
  const h = host.trim().toLowerCase()
  if (!h) return list

  const currentlyDisabled = isHostDisabled(h, list)
  if (currentlyDisabled) {
    // 启用：删除 host 本身 + 所有"host 是其父域"的项（实际上是 host 自己的父域链上的项）
    return list.filter((d) => d !== h && !h.endsWith('.' + d))
  }
  // 禁用：清掉所有"以 host 为父域的子域项"，避免冗余
  const pruned = list.filter((d) => d !== h && !d.endsWith('.' + h))
  return [...pruned, h]
}
