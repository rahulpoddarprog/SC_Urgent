import { NextResponse } from 'next/server';
import { checkRecordVerification } from '@/lib/shared/verifyts';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const timestamp = searchParams.get('timestamp');

    if (!id || !timestamp) {
      return NextResponse.json({
        success: false,
        error: 'Missing id or timestamp parameter',
      }, { status: 400 });
    }

    const status = await checkRecordVerification(id, timestamp);

    return NextResponse.json({
      success: true,
      processed: status !== null,
      status,
    });
  } catch (err) {
    console.error('API /api/shared/verifyts GET Error:', err);
    return NextResponse.json({
      success: false,
      error: (err as Error).message,
    }, { status: 500 });
  }
}
