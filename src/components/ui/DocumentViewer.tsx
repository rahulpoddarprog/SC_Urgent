import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, XCircle, ThumbsUp, Maximize2, X } from 'lucide-react';

export interface DriveAsset {
  key: string;
  label: string;
  url: string;
  fileId: string | null;
  category?: string;
}

interface DocumentViewerProps {
  driveUrls: DriveAsset[];
  rejectedDocs: Record<string, { isRejected: boolean; reason: string }>;
  onToggleRejection: (label: string, reason?: string) => void;
  blobCache?: Record<string, { url: string; type: string }>;
}

const SmartAssetRenderer = ({ fileId, label, className, blobCache }: { fileId: string; label: string; className: string; blobCache?: Record<string, { url: string; type: string }> }) => {
  const blobInfo = blobCache?.[fileId];

  if (!blobInfo) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-900/50 ${className}`}>
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-mono text-xs animate-pulse">Loading Document...</p>
      </div>
    );
  }

  const isImage = blobInfo.type.startsWith('image/');

  if (isImage) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img 
        src={blobInfo.url} 
        alt={label}
        className={`object-contain max-w-full max-h-full ${className}`} 
      />
    );
  }

  return (
    <iframe 
      src={blobInfo.url} 
      title={label}
      className={`object-contain border-0 w-full h-full ${className}`} 
      loading="lazy"
    />
  );
};

export default function DocumentViewer({ driveUrls, rejectedDocs, onToggleRejection, blobCache }: DocumentViewerProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!driveUrls || driveUrls.length === 0) {
    return (
      <div className="w-full h-full border border-pure-white/20 rounded-2xl p-4 flex flex-col items-center justify-center">
        <p className="text-pure-white/50 text-sm">No Document Attached</p>
      </div>
    );
  }

  const activeAsset = driveUrls[currentSlideIndex];
  const rejectionInfo = rejectedDocs[activeAsset?.label] || { isRejected: false, reason: '' };
  const isRejected = rejectionInfo.isRejected;

  const nextSlide = () => {
    if (driveUrls.length > 0) {
      setCurrentSlideIndex((prev) => (prev + 1) % driveUrls.length);
    }
  };

  const prevSlide = () => {
    if (driveUrls.length > 0) {
      setCurrentSlideIndex((prev) => (prev - 1 + driveUrls.length) % driveUrls.length);
    }
  };

  return (
    <div className="w-full h-full flex flex-col border border-pure-white/20 rounded-2xl overflow-hidden relative">
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-pure-black/90 backdrop-blur-sm flex items-center justify-center">
          <button 
            onClick={() => setIsFullscreen(false)} 
            className="absolute top-4 right-4 text-pure-white bg-pure-black/80 p-2 rounded-full hover:bg-stat-red transition-colors z-50"
          >
            <X className="w-6 h-6" />
          </button>
          {activeAsset?.fileId ? (
            <div className="w-full h-full flex flex-col pt-16 pb-4 px-4 relative">
              {isRejected && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10">
                  <div className="px-4 py-2 bg-stat-red/90 text-pure-white font-bold rounded-xl border border-stat-red shadow-2xl flex items-center gap-2 animate-pulse">
                    <XCircle className="w-5 h-5" /> REJECTED
                  </div>
                </div>
              )}
              <SmartAssetRenderer 
                fileId={activeAsset.fileId} 
                label={activeAsset.label} 
                className="w-full flex-1 rounded bg-pure-black/50" 
                blobCache={blobCache}
              />
            </div>
          ) : (
            <p className="text-pure-white/70">Invalid File ID</p>
          )}
        </div>
      )}
      
      {/* Top Header / Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-2 border-b border-pure-white/20 gap-2 shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="text-xs font-bold text-action-cyan truncate">
            📁 {activeAsset?.label}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Custom Message Input */}
          <input 
            type="text" 
            placeholder="Custom reject message..." 
            value={rejectionInfo.reason}
            onChange={(e) => onToggleRejection(activeAsset.label, e.target.value)}
            className="bg-transparent border border-pure-white/30 text-pure-white text-xs px-3 py-1 rounded-full w-48 focus:outline-none focus:border-pure-white transition-all placeholder:text-pure-white/50"
          />

          <button
            onClick={() => {
              if (isRejected) onToggleRejection(activeAsset.label);
            }}
            className={`px-3 py-1 text-[11px] font-bold flex items-center gap-1 transition-all rounded-full ${
              !isRejected ? 'bg-stat-green hover:bg-stat-green/80 text-pure-white shadow' : 'text-pure-white/60 hover:text-pure-white bg-transparent border border-pure-white/20 hover:bg-pure-white/10'
            }`}
          >
            <ThumbsUp className="w-3 h-3" /> Approve Document
          </button>

          <button
            onClick={() => {
              if (!isRejected) onToggleRejection(activeAsset.label, rejectionInfo.reason || '');
            }}
            className={`px-3 py-1 text-[11px] font-bold flex items-center gap-1 transition-all rounded-full ${
              isRejected ? 'bg-stat-red hover:bg-stat-red/80 text-pure-white shadow' : 'text-pure-white/60 hover:text-pure-white bg-transparent border border-pure-white/20 hover:bg-pure-white/10'
            }`}
          >
            <XCircle className="w-3 h-3" /> Reject Document
          </button>
        </div>
      </div>

      {/* Main Viewer Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2 group bg-transparent">
        {driveUrls.length > 1 && (
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-pure-black/80 hover:bg-action-cyan hover:text-pure-black text-pure-white rounded-full border border-pure-white/20 backdrop-blur-md shadow-xl transition-all z-20 opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {driveUrls.length > 1 && (
          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-pure-black/80 hover:bg-action-cyan hover:text-pure-black text-pure-white rounded-full border border-pure-white/20 backdrop-blur-md shadow-xl transition-all z-20 opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {activeAsset?.fileId ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {isRejected && (
              <div className="absolute inset-0 bg-stat-red/20 backdrop-blur-[2px] flex items-center justify-center z-10 pointer-events-none rounded">
                <div className="px-3 py-1.5 bg-stat-red/90 text-pure-white font-bold rounded-xl border border-stat-red shadow-xl flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> REJECTED
                </div>
              </div>
            )}
            
            <button 
              onClick={() => setIsFullscreen(true)}
              className="absolute top-2 right-2 p-1.5 bg-pure-black/80 text-pure-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-action-cyan hover:text-pure-black"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <SmartAssetRenderer 
              fileId={activeAsset.fileId} 
              label={activeAsset.label} 
              className="w-full h-full rounded bg-transparent" 
              blobCache={blobCache}
            />
          </div>
        ) : (
          <p className="text-xs text-pure-white/50">Invalid Drive Link.</p>
        )}
      </div>

      {/* Thumbnail Selector Strip */}
      <div className="border-t border-pure-white/20 flex items-center gap-2 overflow-x-auto p-2 custom-scrollbar shrink-0 bg-transparent">
        {driveUrls.map((item, idx) => {
          const isItemRejected = rejectedDocs[item.label];
          return (
            <button
              key={idx}
              onClick={() => setCurrentSlideIndex(idx)}
              className={`px-3 py-1.5 text-[10px] font-bold shrink-0 border transition-all flex items-center gap-1.5 rounded-lg ${
                idx === currentSlideIndex
                  ? isItemRejected
                    ? 'border-stat-red text-stat-red bg-transparent'
                    : 'border-pure-white text-pure-white bg-transparent'
                  : isItemRejected
                  ? 'border-stat-red text-stat-red opacity-80 bg-transparent'
                  : 'border-pure-white/20 text-pure-white/60 hover:border-pure-white/40 bg-transparent'
              }`}
            >
              <span>{idx + 1}. {item.label}</span>
              {isItemRejected && <XCircle className="w-3 h-3 text-stat-red" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
