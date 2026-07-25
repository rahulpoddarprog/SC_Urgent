import { NextResponse } from 'next/server';
import { fetchFullSheetData } from '@/lib/sheet/records';
import { getProcessedTimestamps, updateStatsSummary } from '@/lib/firebase/stats';

export async function GET() {
  try {
    const { totalRows, error: sheetError } = await fetchFullSheetData();

    if (sheetError || totalRows === 0) {
      console.error("Google Sheets fetch failed:", sheetError);
      return NextResponse.json({
        success: false,
        error: sheetError || "No records found in Google Sheet",
        stats: { total: 0, passed: 0, failed: 0, pending: 0 },
      }, { status: 500 });
    }

    const { passedCount, failedCount } = await getProcessedTimestamps();
    const pendingCount = Math.max(0, totalRows - passedCount - failedCount);

    const stats = {
      total: totalRows,
      passed: passedCount,
      failed: failedCount,
      pending: pendingCount,
    };

    // Attempt to update the Firestore summary metadata doc
    try {
      await updateStatsSummary(stats);
    } catch (fsWriteErr) {
      console.warn('Failed writing summary metrics to Firestore:', (fsWriteErr as Error).message);
    }

    return NextResponse.json({
      success: true,
      stats,
      isMocked: false,
    });
  } catch (err) {
    console.error('API /api/firebase/stats GET Error:', err);
    return NextResponse.json({
      success: false,
      error: (err as Error).message,
      stats: { total: 0, passed: 0, failed: 0, pending: 0 },
    }, { status: 500 });
  }
}
