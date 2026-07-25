import { NextRequest, NextResponse } from 'next/server';
import { proxyDriveFile } from '@/lib/drive/fileproxy';

export async function GET(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get('fileId');

  if (!fileId) {
    return NextResponse.json({ error: 'Missing fileId parameter' }, { status: 400 });
  }

  try {
    const { webStream, mimeType, name } = await proxyDriveFile(fileId);

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(name)}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (error: unknown) {
    console.error('Drive proxy error for fileId', fileId, ':', error);
    const message = error instanceof Error ? error.message : 'Failed retrieving drive media';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
