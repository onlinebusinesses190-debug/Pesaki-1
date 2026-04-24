import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'


/**
 * GET /api/nse
 * Proxies NSE stock data from the backend server (pesaki-server).
 * The backend scrapes afx.kwayisi.org — this is done from the backend's server IP
 * which is NOT blocked by Cloudflare, unlike Vercel's AWS IP range which gets blocked.
 *
 * Returns: { stocks: NseStock[], updatedAt: string, marketOpen: boolean }
 */
export async function GET() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pesaki-server.onrender.com'

    try {
        const res = await fetch(`${apiUrl}/games/nse/stocks`, {
            headers: { 'Content-Type': 'application/json' },
            // No-store so every request is fresh (backend handles its own caching needs)
            cache: 'no-store',
            signal: AbortSignal.timeout(30_000), // 30s: 20 stocks × ~1s each
        })

        const data = await res.json()

        if (!res.ok || !data.success) {
            return NextResponse.json(
                { error: 'FETCH_ERROR', message: data.error || 'Backend returned an error.' },
                { status: res.status || 502 }
            )
        }

        return NextResponse.json({
            stocks: data.stocks ?? [],
            updatedAt: data.updatedAt ?? new Date().toISOString(),
            marketOpen: data.marketOpen ?? false,
        })
    } catch (err: any) {
        console.error('[NSE proxy] Error calling backend:', err?.message)
        return NextResponse.json(
            { error: 'PROXY_ERROR', message: 'Could not reach the data server.' },
            { status: 503 }
        )
    }
}
