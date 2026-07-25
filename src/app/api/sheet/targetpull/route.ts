import { NextResponse } from 'next/server';
import { getTargetData } from '@/lib/sheet/targetpull';

export async function GET() {
  try {
    const data = await getTargetData();
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Target pull error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch target data' }, { status: 500 });
  }
}
