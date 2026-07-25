import { NextResponse } from 'next/server';
import { executeRejectOperation } from '@/lib/firebase/rejectoperation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await executeRejectOperation(body);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API /api/firebase/rejectoperation POST Error:', err);
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
