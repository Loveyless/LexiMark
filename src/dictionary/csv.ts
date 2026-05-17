/**
 * RFC 4180 风格的最小 CSV 解析器：
 * - 支持 "..." 字段
 * - 内部 "" 表示一个 "
 * - 支持字段内 \n
 * - 不依赖任何第三方库（service worker 环境友好）
 *
 * 仅用于本扩展加载 ecdict.subset.csv，性能在百万级行下不算最优，
 * 但 ecdict 子集行数控制在 5 万级内，可接受。
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  const len = input.length

  while (i < len) {
    const ch = input.charCodeAt(i)

    if (inQuotes) {
      if (ch === 0x22 /* " */) {
        if (i + 1 < len && input.charCodeAt(i + 1) === 0x22) {
          field += '"'
          i += 2
        } else {
          inQuotes = false
          i++
        }
      } else {
        field += input[i]
        i++
      }
      continue
    }

    if (ch === 0x22 /* " */) {
      inQuotes = true
      i++
      continue
    }

    if (ch === 0x2c /* , */) {
      row.push(field)
      field = ''
      i++
      continue
    }

    if (ch === 0x0d /* \r */) {
      // \r\n 视为一次换行
      if (i + 1 < len && input.charCodeAt(i + 1) === 0x0a) i++
      row.push(field)
      field = ''
      rows.push(row)
      row = []
      i++
      continue
    }

    if (ch === 0x0a /* \n */) {
      row.push(field)
      field = ''
      rows.push(row)
      row = []
      i++
      continue
    }

    field += input[i]
    i++
  }

  // 尾部 flush
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

/** 把首行视为 header，剩余行转 record */
export function parseCsvWithHeader<T = Record<string, string>>(
  input: string,
): T[] {
  const rows = parseCsv(input)
  if (rows.length === 0) return []
  const header = rows[0]!
  const out: T[] = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!
    if (row.length === 1 && row[0] === '') continue // 空行
    const obj: Record<string, string> = {}
    for (let c = 0; c < header.length; c++) {
      obj[header[c] ?? ''] = row[c] ?? ''
    }
    out.push(obj as T)
  }
  return out
}
