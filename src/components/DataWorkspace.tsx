import React, { useState, useEffect } from "react";
import { IdentityRecord } from "./ui/Search";
import RecordViewer from "./ui/RecordViewer";
import DocumentViewer, { DriveAsset } from "./ui/DocumentViewer";
import { getCleanLabel, sortFieldsByCanonicalOrder } from '@/lib/header_map';
import { TargetRecordInfo } from '@/lib/sheet/targetpull';

interface DataWorkspaceProps {
  record: IdentityRecord | undefined;
  rawData?: Record<string, string>;
  targetRecords?: TargetRecordInfo[];
  rejectedDocs?: Record<string, { isRejected: boolean; reason: string }>;
  onToggleRejection?: (label: string, reason?: string) => void;
}

export default function DataWorkspace({ record, rawData, targetRecords, rejectedDocs: propRejectedDocs, onToggleRejection: propOnToggleRejection }: DataWorkspaceProps) {
  // Parse rawData for Google Drive links
  const driveUrls = React.useMemo(() => {
    if (!rawData) return [];
    const assets: DriveAsset[] = [];
    Object.entries(rawData).forEach(([key, value]) => {
      const valStr = String(value || '');
      if (valStr.includes('drive.google.com') || valStr.includes('docs.google.com')) {
        let fileId = null;
        try {
          const urlObj = new URL(valStr);
          fileId = urlObj.searchParams.get('id') || urlObj.pathname.split('/').pop() || null;
        } catch {
          // ignore invalid urls
        }
        assets.push({
          key,
          label: getCleanLabel(key), // Use the column header as the clean label
          url: valStr,
          fileId,
        });
      }
    });
    return sortFieldsByCanonicalOrder(assets);
  }, [rawData]);

  const [internalRejectedDocs, setInternalRejectedDocs] = useState<Record<string, { isRejected: boolean; reason: string }>>({});
  const rejectedDocs = propRejectedDocs !== undefined ? propRejectedDocs : internalRejectedDocs;
  const [blobCache, setBlobCache] = useState<Record<string, { url: string; type: string }>>({});

  useEffect(() => {
    // We store the object URLs here to revoke them later
    const objectUrls: string[] = [];

    const fetchBlobs = async () => {
      const newBlobCache: Record<string, { url: string; type: string }> = {};
      
      const promises = driveUrls.map(async (asset) => {
        if (!asset.fileId) return;
        try {
          const res = await fetch(`/api/drive/fileproxy?fileId=${asset.fileId}`);
          if (res.ok) {
            const type = res.headers.get('content-type') || '';
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            objectUrls.push(objectUrl);
            newBlobCache[asset.fileId] = { url: objectUrl, type };
          }
        } catch (err) {
          console.error(`Failed to prefetch blob for ${asset.fileId}`, err);
        }
      });

      await Promise.all(promises);
      setBlobCache(newBlobCache);
    };

    if (driveUrls.length > 0) {
      fetchBlobs();
    }

    // Cleanup function to avoid memory leaks
    return () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [driveUrls]);

  const handleToggleRejection = (label: string, reason?: string) => {
    if (propOnToggleRejection) {
      propOnToggleRejection(label, reason);
      return;
    }
    setInternalRejectedDocs(prev => {
      const current = prev[label];
      // If a reason string is explicitly passed (including empty string ""), set as rejected with that reason
      if (reason !== undefined) {
        return {
          ...prev,
          [label]: { isRejected: true, reason: reason }
        };
      }
      if (current?.isRejected) {
        // Un-reject (Approve)
        const updated = { ...prev };
        delete updated[label];
        return updated;
      } else {
        // Reject with empty default reason
        return {
          ...prev,
          [label]: { isRejected: true, reason: '' }
        };
      }
    });
  };

  return (
    <div className="w-full h-full flex-1 flex flex-col lg:flex-row gap-4 p-4">
      {/* Left Pane: RecordViewer */}
      <div className="w-full lg:w-[350px] shrink-0 h-full flex flex-col">
        <RecordViewer record={record} rawData={rawData} targetRecords={targetRecords} rejectedDocs={rejectedDocs} />
      </div>

      {/* Right Pane: DocumentViewer */}
      <div className="flex-1 h-full flex flex-col min-w-0">
        <DocumentViewer 
          driveUrls={driveUrls}
          rejectedDocs={rejectedDocs}
          onToggleRejection={handleToggleRejection}
          blobCache={blobCache}
        />
      </div>
    </div>
  );
}
