import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NseStock {
    id: string
    name: string
    symbol: string
    sector: string
    price: number
    change: number
    changePercent: number
    volume?: number
    high?: number
    low?: number
    open?: number
}

// ─── Top NSE Stocks List ──────────────────────────────────────────────────────
// slug = path on afx.kwayisi.org/nse/{slug}.html

const TOP_NSE_STOCKS = [
    { symbol: 'SCOM', slug: 'scom', name: 'Safaricom Plc', sector: 'Telecommunications' },
    { symbol: 'EQTY', slug: 'eqty', name: 'Equity Group Holdings', sector: 'Banking' },
    { symbol: 'KCB', slug: 'kcb', name: 'KCB Group', sector: 'Banking' },
    { symbol: 'COOP', slug: 'coop', name: 'Co-operative Bank', sector: 'Banking' },
    { symbol: 'EABL', slug: 'eabl', name: 'East African Breweries', sector: 'Manufacturing' },
    { symbol: 'ABSA', slug: 'absa', name: 'ABSA Bank Kenya', sector: 'Banking' },
    { symbol: 'SCBK', slug: 'scbk', name: 'Standard Chartered Bank', sector: 'Banking' },
    { symbol: 'SBIC', slug: 'sbic', name: 'Stanbic Holdings', sector: 'Banking' },
    { symbol: 'KEGN', slug: 'kegn', name: 'KenGen Plc', sector: 'Energy' },
    { symbol: 'KPLC', slug: 'kplc', name: 'Kenya Power & Lighting', sector: 'Energy' },
    { symbol: 'BAT', slug: 'bat', name: 'British American Tobacco Kenya', sector: 'Manufacturing' },
    { symbol: 'BAMB', slug: 'bamb', name: 'Bamburi Cement', sector: 'Construction' },
    { symbol: 'CARB', slug: 'carb', name: 'Carbacid Investments', sector: 'Investment' },
    { symbol: 'CIC', slug: 'cic', name: 'CIC Insurance Group', sector: 'Insurance' },
    { symbol: 'BRIT', slug: 'brit', name: 'Britam Holdings', sector: 'Insurance' },
    { symbol: 'JUB', slug: 'jub', name: 'Jubilee Holdings', sector: 'Insurance' },
    { symbol: 'NCBA', slug: 'ncba', name: 'NCBA Group Plc', sector: 'Banking' },
    { symbol: 'DTK', slug: 'dtk', name: 'Diamond Trust Bank', sector: 'Banking' },
    { symbol: 'IMH', slug: 'imh', name: 'I&M Holdings Plc', sector: 'Banking' },
    { symbol: 'NMG', slug: 'nmg', name: 'Nation Media Group', sector: 'Media' },
]

// ─── Scraper ──────────────────────────────────────────────────────────────────

async function scrapeStock(
    stock: typeof TOP_NSE_STOCKS[0]
): Promise<NseStock | null> {
    try {
        const url = `https://afx.kwayisi.org/nse/${stock.slug}.html`
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PesakiApp/1.0)' },
            next: { revalidate: 300 },
        })
        if (!res.ok) return null

        const html = await res.text()

        // Extract: "current share price of ... is KES 32.00"
        const priceMatch = html.match(/is KES ([\d,]+\.?\d*)/i)
        const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0

        // Extract: "recording a X% drop/gain from its previous closing price of Y KES"
        const changePctMatch = html.match(/recording a ([\d.]+)%\s*(drop|gain|rise|fall|decline|increase)/i)
        const changePct = changePctMatch ? parseFloat(changePctMatch[1]) : 0
        const isNegative = changePctMatch
            ? /drop|fall|decline/i.test(changePctMatch[2])
            : false
        const changePercent = isNegative ? -changePct : changePct

        // Extract: "previous closing price of Y KES"
        const prevPriceMatch = html.match(/previous closing price of ([\d,]+\.?\d*) KES/i)
        const prevPrice = prevPriceMatch ? parseFloat(prevPriceMatch[1].replace(/,/g, '')) : price
        const change = parseFloat((price - prevPrice).toFixed(2))

        // Extract volume (e.g. "a total volume of 25,865,485 shares")
        // Look for daily volume from recent trading data
        const volumeMatch = html.match(/total volume of ([\d,]+) shares/i)
        const volume = volumeMatch ? parseInt(volumeMatch[1].replace(/,/g, ''), 10) : undefined

        return {
            id: stock.symbol,
            name: stock.name,
            symbol: stock.symbol,
            sector: stock.sector,
            price,
            change,
            changePercent,
            volume,
        }
    } catch {
        return null
    }
}

// ─── Market Status ────────────────────────────────────────────────────────────

function isMarketOpen(): boolean {
    const now = new Date()
    // EAT = UTC+3
    const eatMs = now.getTime() + 3 * 60 * 60 * 1000
    const eat = new Date(eatMs)
    const dayOfWeek = eat.getUTCDay() // 0=Sun, 6=Sat
    const hour = eat.getUTCHours()
    const minute = eat.getUTCMinutes()
    const timeInMinutes = hour * 60 + minute
    // NSE: Mon–Fri, 09:00–15:00 EAT
    return dayOfWeek >= 1 && dayOfWeek <= 5 && timeInMinutes >= 540 && timeInMinutes < 900
}

// ─── Route Handler ────────────────────────────────────────────────────────────

/**
 * GET /api/nse
 * Scrapes live NSE stock data from afx.kwayisi.org for the top 20 NSE stocks.
 * Falls back gracefully if individual stocks fail.
 *
 * Returns: { stocks: NseStock[], updatedAt: string, marketOpen: boolean }
 */
export async function GET() {
    try {
        // Fetch all stocks in parallel (max concurrency handled by Next.js / node)
        const results = await Promise.allSettled(
            TOP_NSE_STOCKS.map(s => scrapeStock(s))
        )

        const stocks: NseStock[] = results
            .filter((r): r is PromiseFulfilledResult<NseStock | null> => r.status === 'fulfilled')
            .map(r => r.value)
            .filter((s): s is NseStock => s !== null && s.price > 0)

        return NextResponse.json({
            stocks,
            updatedAt: new Date().toISOString(),
            marketOpen: isMarketOpen(),
        })
    } catch (err) {
        console.error('[NSE scraper] Fatal error:', err)
        return NextResponse.json(
            { error: 'SCRAPER_ERROR', message: 'Failed to fetch NSE market data.' },
            { status: 502 }
        )
    }
}
