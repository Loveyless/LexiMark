/**
 * 向所有 tab 广播一个轻量通知，让 content script 主动拉新快照。
 * 没注入 content 的页面会失败，忽略即可（DESIGN §8.3）。
 */
export async function broadcastSnapshotUpdated(version: number): Promise<void> {
  const tabs = await chrome.tabs.query({})
  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id) return
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'LM_SNAPSHOT_UPDATED',
          version,
        })
      } catch {
        // 没注入 content / 受限页面，忽略
      }
    }),
  )
}
