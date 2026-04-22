import { NextResponse } from 'next/server'

const BASE_URL = process.env.DARAJA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'

export async function GET() {
    const consumerKey = process.env.DARAJA_CONSUMER_KEY!
    const consumerSecret = process.env.DARAJA_CONSUMER_SECRET!

    if (!consumerKey || !consumerSecret) {
        return NextResponse.json({ error: 'Daraja credentials not configured' }, { status: 500 })
    }

    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

    try {
        const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
            method: 'GET',
            headers: {
                Authorization: `Basic ${credentials}`,
            },
            cache: 'no-store',
        })

        if (!res.ok) {
            const text = await res.text()
            return NextResponse.json({ error: 'Failed to get token', detail: text }, { status: res.status })
        }

        const data = await res.json()
        return NextResponse.json({ access_token: data.access_token, expires_in: data.expires_in })
    } catch (err) {
        console.error('[Daraja Token Error]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
