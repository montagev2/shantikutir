import type { MenuItem } from '../types'

/**
 * Common culinary phonetic transliterations, typos, and regional aliases
 * (Bengali, Hindi, and English variations) mapped to canonical keywords.
 */
export const FOOD_SYNONYMS: Record<string, string[]> = {
  biryani: ['briyani', 'biriyani', 'birani', 'biriani', 'biryany', 'biryn', 'beriyani', 'biri'],
  chicken: ['chiken', 'chikn', 'chikan', 'chikken', 'murgi', 'murga', 'chikin', 'chike'],
  mutton: ['moton', 'muton', 'muttan', 'khasi', 'khasir', 'gosht', 'kosha', 'mangsho'],
  tandoori: ['tanduri', 'tandori', 'tandoor', 'tandur', 'tandoore'],
  kebab: ['kabab', 'kebabs', 'kababs', 'kabob', 'tikka', 'reshmi', 'sheekh', 'seekh'],
  chowmein: ['chawmin', 'chaumin', 'chowmin', 'chow', 'noodles', 'nudles', 'noodle', 'choumin', 'hakka'],
  fried: ['fraid', 'fry', 'fryed', 'frie', 'friedrice', 'frice'],
  rice: ['chawal', 'bhaat', 'bhat', 'polao', 'pulao', 'pilaf', 'polaw', 'basmati'],
  naan: ['nan', 'kulcha', 'paratha', 'porota', 'ruti', 'roti', 'chapati', 'phulka', 'tandoor roti'],
  paneer: ['panir', 'pneer', 'ponir', 'cheese'],
  dosa: ['dhosa', 'dosha', 'dhosaa', 'uttapam', 'uttapa'],
  chilli: ['chili', 'chilly', 'mirchi', 'lanka'],
  burger: ['berger', 'burgur', 'burgir'],
  sandwich: ['sandwhich', 'sandwitch', 'sandvich'],
  pasta: ['pesta', 'alfredo', 'macaroni'],
  kabiraji: ['kobiraji', 'kabirji', 'kabirazi'],
  soup: ['sup', 'sop', 'manchow', 'sweet corn', 'hot sour'],
  momo: ['momos', 'dumpling', 'dimsum'],
  fish: ['mach', 'maach', 'vetki', 'bhetki', 'pomfret'],
  prawn: ['prawns', 'chingri', 'shrimp'],
  egg: ['dim', 'anda', 'omlet', 'omelette', 'bhujia', 'poach'],
  dal: ['daal', 'dhal', 'tadka', 'makhani', 'fry'],
  tea: ['cha', 'chai', 'tandoori tea', 'malai tea'],
  coffee: ['kofe', 'coffe', 'cold coffee', 'black coffee'],
}

// Pre-index inverted lookup table for instant O(1) synonym resolution
const REVERSE_SYNONYMS: Record<string, string> = {}
for (const [canonical, aliases] of Object.entries(FOOD_SYNONYMS)) {
  for (const alias of aliases) {
    REVERSE_SYNONYMS[alias.toLowerCase()] = canonical
  }
}

/**
 * Fast Levenshtein distance computation with early termination
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  const la = a.length
  const lb = b.length
  if (Math.abs(la - lb) > 2) return 99

  const matrix: number[][] = []
  for (let i = 0; i <= lb; i++) matrix[i] = [i]
  for (let j = 0; j <= la; j++) matrix[0][j] = j

  for (let i = 1; i <= lb; i++) {
    for (let j = 1; j <= la; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[lb][la]
}

/**
 * Intelligently matches a menu item against a search query using:
 * 1. Substring matching (exact)
 * 2. Phonetic & regional alias matching (briyani -> biryani, chiken -> chicken)
 * 3. Fuzzy Levenshtein typo-tolerance
 * 4. Multi-word token matching (any order)
 */
export function fuzzyMatchMenuItem(item: MenuItem, query: string): boolean {
  const cleanQuery = query.trim().toLowerCase()
  if (!cleanQuery) return true

  const nameLower = item.name.toLowerCase()
  const bnLower = item.bnName ? item.bnName.toLowerCase() : ''
  const catLower = item.category ? item.category.toLowerCase() : ''
  const descLower = item.description ? item.description.toLowerCase() : ''

  if (
    nameLower.includes(cleanQuery) ||
    bnLower.includes(cleanQuery) ||
    catLower.includes(cleanQuery) ||
    descLower.includes(cleanQuery)
  ) {
    return true
  }

  const tokens = cleanQuery.split(/[\s,\-()/&]+/).filter(Boolean)
  if (tokens.length === 0) return true

  const itemText = `${nameLower} ${bnLower} ${catLower} ${descLower}`
  const itemWords = itemText.split(/[\s,\-()/&]+/).filter(Boolean)

  return tokens.every((tok) => {
    if (itemWords.some((iw) => iw === tok || iw.includes(tok) || tok.includes(iw))) {
      return true
    }

    const canonical = REVERSE_SYNONYMS[tok] || tok
    const synonyms = FOOD_SYNONYMS[canonical] || []
    const searchTargets = [tok, canonical, ...synonyms]

    for (const iw of itemWords) {
      for (const st of searchTargets) {
        if (iw === st || iw.includes(st) || st.includes(iw)) {
          return true
        }
        const maxDist = st.length <= 4 ? 1 : 2
        if (st.length >= 3 && Math.abs(iw.length - st.length) <= maxDist) {
          if (levenshteinDistance(st, iw) <= maxDist) {
            return true
          }
        }
      }
    }

    return false
  })
}

/**
 * Top highway dhaba favorites for one-tap search
 */
export const POPULAR_SEARCH_SUGGESTIONS = [
  'Biryani',
  'Tandoori Chicken',
  'Chowmein',
  'Butter Naan',
  'Chilli Chicken',
  'Fried Rice',
  'Chicken Kabiraji',
  'Double Cheese Burger',
  'Paneer Butter Masala',
  'Hot Coffee & Tea',
]
