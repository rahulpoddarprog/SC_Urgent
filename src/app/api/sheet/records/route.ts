import { NextResponse } from 'next/server';
import { fetchFullSheetData } from '@/lib/sheet/records';

export async function GET() {
  try {
    const { totalRows, records: sheetRecords, error: sheetError } = await fetchFullSheetData();

    if (sheetError || totalRows === 0) {
      console.error("Google Sheets fetch failed:", sheetError);
      return NextResponse.json({
        success: false,
        error: sheetError || "No records found in Google Sheet",
        records: [],
      }, { status: 500 });
    }



    return NextResponse.json({
      success: true,
      records: sheetRecords,
      isMocked: false,
    });
  } catch (err) {
    console.error('API /api/sheet/records GET Error:', err);
    return NextResponse.json({
      success: false,
      error: (err as Error).message,
      records: [],
    }, { status: 500 });
  }
}
