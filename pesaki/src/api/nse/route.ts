import { NextResponse } from 'next/server';
import fetchFromApi from '@/utils/api/fetchFromApi';

export async function GET() {
  try {
    const data = await fetchFromApi('/stocks');
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch data', details: error }, { status: 500 });
  }
}