"use client";

import React, { useState, useEffect, useRef } from "react";
import PassScreen from "@/components/PassScreen";
import TopBar from "@/components/TopBar";
import DataWorkspace from "@/components/DataWorkspace";
import DataOutcome from "@/components/DataOutcome";
import { IdentityRecord } from "@/components/ui/Search";
import { collectRecordProblems } from '@/lib/flags/problemcollector';
import { openRejectWhatsApp } from '@/lib/rejectwp';
import { getCleanLabel } from '@/lib/header_map';

import { TargetRecordInfo } from '@/lib/sheet/targetpull';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [records, setRecords] = useState<IdentityRecord[]>([]);
  const [targetRecords, setTargetRecords] = useState<TargetRecordInfo[]>([]);
  const [currentRecordIndex, setCurrentRecordIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rejectedDocs, setRejectedDocs] = useState<Record<string, { isRejected: boolean; reason: string }>>({});
  const [isOperating, setIsOperating] = useState(false);
  const [operatingText, setOperatingText] = useState("");

  const handleSetRecordIndex = (idx: number | ((prev: number) => number)) => {
    setCurrentRecordIndex(idx);
    setRejectedDocs({});
  };

  const handleToggleRejection = (label: string, reason?: string) => {
    setRejectedDocs(prev => {
      const current = prev[label];
      if (reason !== undefined) {
        return { ...prev, [label]: { isRejected: true, reason: reason } };
      }
      if (current?.isRejected) {
        const updated = { ...prev };
        delete updated[label];
        return updated;
      } else {
        return { ...prev, [label]: { isRejected: true, reason: '' } };
      }
    });
  };

  // Store verification status of records we've explicitly checked
  const [recordStatuses, setRecordStatuses] = useState<Record<number, 'passed' | 'failed' | 'pending'>>({});

  const [stats, setStats] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    pending: 0,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const statsRes = await fetch("/api/firebase/stats");
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }

      const [recordsRes, targetRes] = await Promise.all([
        fetch("/api/sheet/records"),
        fetch("/api/sheet/targetpull")
      ]);

      const recordsData = await recordsRes.json();
      if (recordsData.success) {
        setRecords(recordsData.records || []);
      }

      const targetData = await targetRes.json();
      if (targetData.success) {
        setTargetRecords(targetData.data || []);
      }
    } catch (err) {
      console.error("Failed to load records or stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (isSyncing || isLoading) return;
    setIsSyncing(true);
    try {
      await loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  const [rawRecords, setRawRecords] = useState<Record<number, Record<string, string>>>({});

  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        loadData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  const fetchingRawRef = useRef<Set<number>>(new Set());

  // When currentRecordIndex changes, fetch its status if we don't have it yet.
  useEffect(() => {
    const checkActiveRecord = async () => {
      const activeRecord = records[currentRecordIndex];
      if (!activeRecord || !activeRecord.identityString || !activeRecord.timestamp) return;

      let resolvedStatus = recordStatuses[currentRecordIndex];

      // 1. Fetch verification status if missing
      if (!resolvedStatus) {
        try {
          const url = `/api/shared/verifyts?id=${encodeURIComponent(activeRecord.identityString)}&timestamp=${encodeURIComponent(activeRecord.timestamp)}`;
          const res = await fetch(url);
          const data = await res.json();
          
          if (data.success && data.processed) {
            resolvedStatus = data.status;
            setRecordStatuses(prev => ({ ...prev, [currentRecordIndex]: data.status }));
          } else {
            resolvedStatus = 'pending';
            setRecordStatuses(prev => ({ ...prev, [currentRecordIndex]: 'pending' }));
          }
        } catch (err) {
          console.error("Error verifying active record:", err);
          resolvedStatus = 'pending';
        }
      }

      // 2. Fetch full raw data only if pending and missing
      if (resolvedStatus === 'pending' && !rawRecords[currentRecordIndex] && !fetchingRawRef.current.has(currentRecordIndex)) {
        fetchingRawRef.current.add(currentRecordIndex);
        try {
          const rawUrl = `/api/sheet/rowfetch?rowIndex=${activeRecord.rowIndex}`;
          const rawRes = await fetch(rawUrl);
          const rawData = await rawRes.json();
          if (rawData.success && rawData.rawData) {
            setRawRecords(prev => ({ ...prev, [currentRecordIndex]: rawData.rawData }));
          }
        } catch (err) {
          console.error("Error fetching raw record data:", err);
        }
      }
    };

    if (isAuthenticated && records.length > 0) {
      checkActiveRecord();
    }
  }, [currentRecordIndex, records, isAuthenticated, recordStatuses, rawRecords]);

  const handleApprove = async () => {
    const activeRecord = records[currentRecordIndex];
    if (!activeRecord || isOperating) return;

    setIsOperating(true);
    setOperatingText("OPERATING: APPROVING RECORD & UPLOADING DOCUMENTS...");

    try {
      const rawData = rawRecords[currentRecordIndex];

      // Extract driveUrls from raw data
      const driveUrls: Array<{ url: string; category: string; fileId: string | null }> = [];
      if (rawData) {
        Object.entries(rawData).forEach(([key, value]) => {
          const valStr = String(value || '');
          if (valStr.includes('drive.google.com') || valStr.includes('docs.google.com')) {
            let fileId = null;
            try {
              const urlObj = new URL(valStr);
              fileId = urlObj.searchParams.get('id') || urlObj.pathname.split('/').pop() || null;
            } catch {
              // ignore
            }
            driveUrls.push({
              url: valStr,
              category: getCleanLabel(key),
              fileId,
            });
          }
        });
      }

      // Find targetRowIndex in targetRecords
      let targetRowIndexVal = '';
      if (rawData && targetRecords) {
        const caseType = Object.entries(rawData).find(([k]) => k.toLowerCase().includes('case type'))?.[1]?.trim() || '';
        const serial = Object.entries(rawData).find(([k]) => k.toLowerCase().includes('sl') || k.toLowerCase().includes('serial'))?.[1]?.trim() || '';
        const name = Object.entries(rawData).find(([k]) => k.toLowerCase().includes('name') && !k.toLowerCase().includes('file') && !k.toLowerCase().includes('roll'))?.[1]?.trim() || '';

        let matchedIdx = -1;
        if (caseType && serial) {
          const compKey = `${serial}_${caseType}`.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
          matchedIdx = targetRecords.findIndex(tr => {
            const trKey = `${tr.serial}_${tr.caseType}`.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
            return trKey === compKey;
          });
        }
        if (matchedIdx === -1 && name) {
          const normName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
          matchedIdx = targetRecords.findIndex(tr => {
            const trName = tr.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return trName === normName;
          });
        }

        if (matchedIdx !== -1) {
          targetRowIndexVal = String(matchedIdx + 2);
        }
      }

      // Call API
      const res = await fetch('/api/firebase/approveoperation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityString: activeRecord.identityString,
          timestamp: activeRecord.timestamp,
          recordMap: rawData,
          driveUrls,
          targetRowIndex: targetRowIndexVal,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Approve operation failed or documents could not be copied.");
      }

      setStats((prev) => ({
        ...prev,
        passed: prev.passed + 1,
        pending: Math.max(0, prev.pending - 1),
      }));
      setRecordStatuses(prev => ({ ...prev, [currentRecordIndex]: 'passed' }));
      setRejectedDocs({});

      if (currentRecordIndex < records.length - 1) {
        handleSetRecordIndex((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Error during approve operation:", err);
      alert("Record Halted: " + (err instanceof Error ? err.message : "Unknown error occurred during file upload or approval."));
    } finally {
      setIsOperating(false);
      setOperatingText("");
    }
  };

  const handleReject = async () => {
    const activeRecord = records[currentRecordIndex];
    if (!activeRecord || isOperating) return;

    setIsOperating(true);
    setOperatingText("OPERATING: REJECTING RECORD & SENDING WHATSAPP...");

    try {
      const startTime = Date.now();
      const rawData = rawRecords[currentRecordIndex];
      const { problems, matchedPhone, personName } = collectRecordProblems(rawData, targetRecords, rejectedDocs);

      let phoneToUse = matchedPhone;
      if (!phoneToUse && rawData) {
        const contactKey = Object.keys(rawData).find(k => k.toLowerCase().includes('contact') || k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile'));
        if (contactKey) {
          phoneToUse = rawData[contactKey];
        }
      }

      openRejectWhatsApp(phoneToUse, personName || activeRecord.name, problems);

      const res = await fetch('/api/firebase/rejectoperation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityString: activeRecord.identityString,
          timestamp: activeRecord.timestamp,
          name: activeRecord.name,
          caseType: activeRecord.caseType,
          serialNo: activeRecord.serialNo,
          problems,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update rejection in database.");
      }

      // Enforce minimum 10 seconds wait
      const elapsed = Date.now() - startTime;
      if (elapsed < 10000) {
        let remaining = Math.ceil((10000 - elapsed) / 1000);
        while (remaining > 0) {
          setOperatingText(`WAITING (MINIMUM 10S WAIT... ${remaining}s REMAINING)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          remaining = Math.ceil((10000 - (Date.now() - startTime)) / 1000);
        }
      }

      setStats((prev) => ({
        ...prev,
        failed: prev.failed + 1,
        pending: Math.max(0, prev.pending - 1),
      }));
      setRecordStatuses(prev => ({ ...prev, [currentRecordIndex]: 'failed' }));
      setRejectedDocs({});

      if (currentRecordIndex < records.length - 1) {
        handleSetRecordIndex((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Error during reject operation:", err);
      alert("Reject operation halted: " + (err instanceof Error ? err.message : "Unknown error occurred during rejection."));
    } finally {
      setIsOperating(false);
      setOperatingText("");
    }
  };

  const handlePrev = () => {
    if (currentRecordIndex > 0) {
      handleSetRecordIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentRecordIndex < records.length - 1) {
      handleSetRecordIndex(prev => prev + 1);
    }
  };

  if (!isAuthenticated) {
    return <PassScreen onSuccess={() => setIsAuthenticated(true)} />;
  }

  const activeRecord = records[currentRecordIndex];
  const activeStatus = recordStatuses[currentRecordIndex];
  const isProcessed = activeStatus === 'passed' || activeStatus === 'failed';
  const isVerifyingRecord = activeRecord && activeStatus === undefined;

  return (
    <main className="h-screen flex flex-col bg-pure-black text-pure-white font-sans overflow-hidden">
      <TopBar 
        stats={stats}
        records={records}
        currentRecordIndex={currentRecordIndex}
        isLoading={isLoading}
        isSyncing={isSyncing}
        onSync={handleSync}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setCurrentRecordIndex={handleSetRecordIndex}
        handleApprove={handleApprove}
        handleReject={handleReject}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      <section className="flex-1 flex flex-col relative overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-action-cyan font-mono text-sm tracking-widest animate-pulse">
            LOADING RECORDS...
          </div>
        ) : isVerifyingRecord ? (
          <div className="flex-1 flex items-center justify-center text-action-cyan font-mono text-sm tracking-widest animate-pulse">
            VERIFYING RECORD STATUS...
          </div>
        ) : isProcessed ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <DataOutcome record={activeRecord} status={activeStatus as 'passed' | 'failed'} />
          </div>
        ) : (
          <DataWorkspace 
            record={activeRecord} 
            rawData={rawRecords[currentRecordIndex]} 
            targetRecords={targetRecords}
            rejectedDocs={rejectedDocs}
            onToggleRejection={handleToggleRejection}
          />
        )}
      </section>
      {isOperating && (
        <div className="fixed inset-0 bg-pure-black/85 backdrop-blur-md z-[9999] flex flex-col items-center justify-center select-none cursor-wait">
          <div className="w-12 h-12 border-4 border-stat-red border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-pure-white font-mono text-xl tracking-widest font-bold animate-pulse">
            {operatingText || "OPERATING..."}
          </p>
        </div>
      )}
    </main>
  );
}
