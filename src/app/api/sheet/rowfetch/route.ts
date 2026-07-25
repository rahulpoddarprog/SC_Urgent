import { NextRequest, NextResponse } from 'next/server';
import { fetchRowData } from '@/lib/sheet/rowfetch';

export async function GET(request: NextRequest) {
  const rowIndexStr = request.nextUrl.searchParams.get('rowIndex');

  if (!rowIndexStr) {
    return NextResponse.json({ error: 'Missing rowIndex parameter' }, { status: 400 });
  }

  const rowIndex = parseInt(rowIndexStr, 10);
  if (isNaN(rowIndex)) {
    return NextResponse.json({ error: 'Invalid rowIndex' }, { status: 400 });
  }

  try {
    const { rawData, error } = await fetchRowData(rowIndex);

    if (error || !rawData || Object.keys(rawData).length === 0) {
      console.error("Google Sheets row fetch failed or empty:", error);
      return NextResponse.json({ 
        success: false, 
        error: error || 'Row data not found or empty',
      }, { status: 404 });
    }

    return NextResponse.json({ success: true, rawData, isMocked: false });
  } catch (err: unknown) {
    console.error('Row fetch API Error:', err);
    const message = err instanceof Error ? err.message : 'Failed retrieving row data';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
