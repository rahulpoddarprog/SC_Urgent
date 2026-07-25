import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    const isValid = verifyPassword(password);

    if (isValid) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid password' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Bad request' },
      { status: 400 }
    );
  }
}
