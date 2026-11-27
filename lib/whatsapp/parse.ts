export type CatalogProduct = {
  id: string
  name: string
  sku?: string | null
  unit_price_fcfa: number
}

export type ParsedLine = {
  raw: string
  qty: number
  query: string
  name: string
  product_id: string | null
  unit_price_fcfa: number
  matched: boolean
}

export type ParsedOrder = {
  customer_hint: string | null
  phone: string | null
  delivery_fee_fcfa: number
  lines: ParsedLine[]
  skipped: string[]
  subtotal_fcfa: number
  total_fcfa: number
}

export type ParsedMomoSms = {
  amount_fcfa: number | null
  provider: 'mtn_momo' | 'orange_money' | 'other'
  reference: string | null
  phone: string | null
}

const FR_NUMBERS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
}

const GREETINGS = [
  'bonjour', 'bonsoir', 'salut', 'hello', 'hi', 'coucou', 'merci', 'ok', 'okay', 'vu', 'bien recu',
  "d'accord", 'daccord', 'stp', 'svp', 'please', 'au revoir', 'a plus',
]

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function normalize(s: string): string {
  return stripAccents(s).toLowerCase().trim()
}

function words(s: string): string[] {
  return normalize(s).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
}

function toInt(s: string): number {
  return parseInt(s.replace(/[^\d]/g, ''), 10) || 0
}

function bestProduct(query: string, products: CatalogProduct[]): CatalogProduct | null {
  const qt = words(query)
  if (qt.length === 0) return null
  let best: CatalogProduct | null = null
  let bestScore = 0
  for (const p of products) {
    const pt = words(p.name)
    const sku = p.sku ? normalize(p.sku) : ''
    let score = 0
    for (const t of qt) {
      if (t.length < 2) continue
      if (sku && t === sku) score += 5
      if (pt.includes(t)) score += 2
      else if (pt.some((x) => x.startsWith(t) || t.startsWith(x))) score += 1
    }
    if (score > bestScore) {
      bestScore = score
      best = p
    }
  }
  return bestScore >= 2 ? best : null
}

function splitSegments(line: string): string[] {
  return line
    .split(/\s*(?:,|;|\+| et | puis | avec | aussi )\s*/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
}

function detectQty(segment: string): { qty: number; rest: string } | null {
  let m = segment.match(/^(\d{1,4})\s*[x*]\s*(.+)$/i)
  if (m) return { qty: toInt(m[1]), rest: m[2].trim() }
  m = segment.match(/^(.+?)\s*[x*]\s*(\d{1,4})$/i)
  if (m) return { qty: toInt(m[2]), rest: m[1].trim() }
  m = segment.match(/^(\d{1,4})\s+(.{2,})$/)
  if (m) return { qty: toInt(m[1]), rest: m[2].trim() }
  m = segment.match(/^(.{2,}?)\s+(\d{1,4})$/)
  if (m) return { qty: toInt(m[2]), rest: m[1].trim() }
  const w = words(segment)
  if (w.length >= 2 && FR_NUMBERS[w[0]] !== undefined) {
    return { qty: FR_NUMBERS[w[0]], rest: w.slice(1).join(' ') }
  }
  return null
}

/** Removes WhatsApp export noise: [05/11/2024, 09:12] and "Name: ". */
function cleanIncoming(rawLine: string): string {
  let s = rawLine
  s = s.replace(/^\s*\[\d{1,4}[./-]\d{1,2}[./-]\d{1,4}[^\]]*\]\s*/, '')
  s = s.replace(/^\s*\d{1,2}\/\d{1,2}\/\d{2,4},?\s*\d{1,2}[:h]\d{2}\s*(?:am|pm)?\s*[-–—]?\s*/i, '')
  s = s.replace(/^\s*\d{1,2}[:h]\d{2}\s*(?:am|pm)?\s*[-–—]?\s*/i, '')
  s = s.replace(/^[^\n:]{1,32}:\s*/, '')
  return s.trim()
}

/**
 * Turns a pasted WhatsApp conversation into editable order lines.
 * Rule-based and offline: no external AI call, so it also works on a 2G phone.
 */
export function parseOrder(text: string, products: CatalogProduct[]): ParsedOrder {
  const rawLines = (text || '').split(/\r?\n/)
  const lines: ParsedLine[] = []
  const skipped: string[] = []
  let customer_hint: string | null = null

  for (const rl of rawLines) {
    const m = rl.match(/^(?:\[[^\]]*\]\s*)?([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'-]{1,24}):\s/)
    if (m) {
      customer_hint = m[1].trim()
      break
    }
  }

  for (const rl of rawLines) {
    const line = cleanIncoming(rl)
    const n = normalize(line)
    if (n.length < 2) continue
    if (GREETINGS.some((g) => n === g || n.startsWith(g + ' ') || n === g + '!')) {
      skipped.push(rl.trim())
      continue
    }
    if (!/\d/.test(line) && !splitSegments(line).some((s) => bestProduct(s, products))) {
      skipped.push(rl.trim())
      continue
    }

    let produced = false
    for (const seg of splitSegments(line)) {
      const d = detectQty(seg)
      const qty = d ? d.qty : 1
      const query = (d ? d.rest : seg).trim()
      if (!query) continue
      if (GREETINGS.some((g) => normalize(query) === g)) continue
      const prod = bestProduct(query, products)
      if (prod) {
        lines.push({ raw: seg, qty, query, name: prod.name, product_id: prod.id, unit_price_fcfa: prod.unit_price_fcfa, matched: true })
        produced = true
      } else if (d && qty > 0 && query.length >= 3) {
        lines.push({ raw: seg, qty, query, name: query, product_id: null, unit_price_fcfa: 0, matched: false })
        produced = true
      }
    }
    if (!produced) skipped.push(rl.trim())
  }

  let delivery_fee_fcfa = 0
  const feeA = text.match(/(\d[\d\s.]{0,9})\s*(?:fcfa|f\s?cfa|fr|francs?)?\s*(?:pour\s+)?(?:la\s+)?(?:livraison|transport|deplacement|frais)/i)
  const feeB = text.match(/(?:livraison|transport|deplacement|frais)\s*(?:de|:)?\s*(\d[\d\s.]{0,9})/i)
  if (feeA) delivery_fee_fcfa = toInt(feeA[1])
  else if (feeB) delivery_fee_fcfa = toInt(feeB[1])

  const phoneMatch = text.match(/(?:\+?237|00237)?[\s.-]?6[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/)
  const phone = phoneMatch ? phoneMatch[0].replace(/[^\d+]/g, '') : null

  const subtotal_fcfa = lines.reduce((s, l) => s + l.qty * l.unit_price_fcfa, 0)
  const total_fcfa = subtotal_fcfa + delivery_fee_fcfa

  return { customer_hint, phone, delivery_fee_fcfa, lines, skipped, subtotal_fcfa, total_fcfa }
}

/** Extracts amount, provider and reference from a pasted MTN/Orange MoMo SMS. */
export function parseMomoSms(text: string): ParsedMomoSms {
  const t = text || ''
  const provider: ParsedMomoSms['provider'] = /orange/i.test(t) ? 'orange_money' : /(mtn|momo)/i.test(t) ? 'mtn_momo' : 'other'
  const amountA = t.match(/(\d[\d\s.,]{2,12})\s*(?:fcfa|f\s?cfa|fr|francs?)/i)
  const amountB = t.match(/(?:recu|reçu|montant|transfert|vers[eé]|paiement)\D{0,20}(\d[\d\s.,]{2,12})/i)
  const amount = amountA ? toInt(amountA[1]) : amountB ? toInt(amountB[1]) : null
  const refA = t.match(/(?:ref|réf|reference|référence|id)\s*[:#]?\s*([A-Za-z0-9._-]{4,})/i)
  const refB = t.match(/\b([A-Z]{2}\d{6}[._-]\d{3,6})\b/)
  const reference = refA ? refA[1] : refB ? refB[1] : null
  const phoneMatch = t.match(/(?:\+?237|00237)?[\s.-]?6[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/)
  const phone = phoneMatch ? phoneMatch[0].replace(/[^\d+]/g, '') : null
  return { amount_fcfa: amount, provider, reference, phone }
}
