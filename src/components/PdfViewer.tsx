import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Download,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Loader2,
  Printer,
  Maximize,
} from 'lucide-react';
import {
  isPdfByteArray,
  generateClientQuestionPaperPdf,
  QuestionPaperPdfOptions,
} from '../utils/clientPdfGenerator';

// Configure pdf.js worker using standard CDN matching the version
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/legacy/build/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF.js worker setup note:', e);
}

interface PdfViewerProps {
  url?: string;
  title?: string;
  paperDetails?: QuestionPaperPdfOptions;
  downloadUrl?: string;
  downloadFilename?: string;
  className?: string;
  minHeight?: string;
  showDownloadButton?: boolean;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  url,
  title = 'Examination Question Paper',
  paperDetails,
  downloadUrl,
  downloadFilename,
  className = '',
  minHeight = '650px',
  showDownloadButton = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const canvasRefs = useRef<{ [key: number]: HTMLCanvasElement | null }>({});

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [fitMode, setFitMode] = useState<'width' | 'custom'>('width');
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [generatedBlobUrl, setGeneratedBlobUrl] = useState<string | null>(null);
  const [jumpPageInput, setJumpPageInput] = useState('1');

  // Pinch-to-zoom touch state
  const touchStateRef = useRef<{
    initialDistance: number;
    initialScale: number;
    isPinching: boolean;
    lastTapTime: number;
    lastTapX: number;
    lastTapY: number;
  }>({
    initialDistance: 0,
    initialScale: 1.0,
    isPinching: false,
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,
  });

  // Clean up any generated blob url on unmount
  useEffect(() => {
    return () => {
      if (generatedBlobUrl) {
        URL.revokeObjectURL(generatedBlobUrl);
      }
    };
  }, [generatedBlobUrl]);

  // Effective download link
  const effectiveDownloadUrl = generatedBlobUrl || downloadUrl || url || '#';
  const effectiveDownloadFilename =
    downloadFilename || (title ? `${title.replace(/\s+/g, '_')}.pdf` : 'QuestionPaper.pdf');

  // Calculate automatic fit-width scale based on current container size
  const getFitWidthScale = useCallback((viewportWidth: number) => {
    if (!containerRef.current) return 1.0;
    const containerWidth = containerRef.current.clientWidth;
    const padding = containerWidth < 640 ? 16 : 48;
    const availableWidth = Math.max(containerWidth - padding, 260);
    const targetScale = availableWidth / viewportWidth;
    return Number(targetScale.toFixed(2));
  }, []);

  // Load PDF Document with intelligent validation & fallback
  const loadDocument = useCallback(async () => {
    setLoading(true);
    setError(null);

    let pdfBytes: Uint8Array | null = null;

    if (url && url.startsWith('data:')) {
      try {
        const base64Data = url.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        if (isPdfByteArray(bytes)) {
          pdfBytes = bytes;
        }
      } catch (e) {
        console.warn('Failed parsing data URL in PdfViewer:', e);
      }
    }

    if (!pdfBytes && url) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          if (isPdfByteArray(uint8)) {
            pdfBytes = uint8;
          }
        }
      } catch (fetchErr) {
        console.warn('[PdfViewer] Direct fetch failed or returned non-PDF:', fetchErr);
      }
    }

    if (!pdfBytes) {
      try {
        const generated = await generateClientQuestionPaperPdf({
          collegeName: 'SEMESTER (PYQs)',
          paperTitle: title,
          subjectName: paperDetails?.subjectName || title,
          courseName: paperDetails?.courseName,
          courseCode: paperDetails?.courseCode,
          yearName: paperDetails?.yearName,
          subjectCode: paperDetails?.subjectCode,
          examYear: paperDetails?.examYear,
          examSession: paperDetails?.examSession,
          paperCode: paperDetails?.paperCode,
          totalMarks: paperDetails?.totalMarks,
          duration: paperDetails?.duration,
          ...paperDetails,
        });
        pdfBytes = generated;

        const blob = new Blob([generated as unknown as BlobPart], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        setGeneratedBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return blobUrl;
        });
      } catch (genErr: any) {
        console.error('[PdfViewer] Failed to synthesize fallback PDF:', genErr);
      }
    }

    if (!pdfBytes) {
      setError('Unable to load or render the question paper PDF file.');
      setLoading(false);
      return;
    }

    try {
      const loadingTask = pdfjsLib.getDocument({
        data: pdfBytes,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@legacy/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@legacy/standard_fonts/',
      });

      const loadedPdf = await loadingTask.promise;
      setPdfDoc(loadedPdf);
      setTotalPages(loadedPdf.numPages);
      setCurrentPage(1);
      setJumpPageInput('1');

      const firstPage = await loadedPdf.getPage(1);
      const unscaledViewport = firstPage.getViewport({ scale: 1.0, rotation: 0 });
      const initialScale = getFitWidthScale(unscaledViewport.width);
      setScale(initialScale);
      setLoading(false);
    } catch (err: any) {
      console.error('[PdfViewer] PDF.js parsing error:', err);
      setError(err?.message || 'Unable to render the PDF file.');
      setLoading(false);
    }
  }, [url, title, paperDetails, getFitWidthScale]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Render individual page onto its corresponding Canvas
  const renderSinglePage = useCallback(
    async (pageNum: number, pdf: any) => {
      const canvas = canvasRefs.current[pageNum];
      if (!pdf || !canvas) return;

      try {
        const page = await pdf.getPage(pageNum);
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        const viewport = page.getViewport({ scale, rotation });
        
        // High-DPI / Retina clamp (1.5 to 2.5)
        const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2.5);

        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);

        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`[PdfViewer] Page ${pageNum} render error:`, err);
        }
      }
    },
    [scale, rotation]
  );

  // Render all pages in continuous Google Drive vertical scroll stack
  useEffect(() => {
    if (pdfDoc && totalPages > 0) {
      for (let p = 1; p <= totalPages; p++) {
        renderSinglePage(p, pdfDoc);
      }
    }
  }, [pdfDoc, totalPages, scale, rotation, renderSinglePage]);

  // Track current visible page during continuous vertical scrolling
  const handleScroll = () => {
    if (!containerRef.current || totalPages <= 1) return;
    const containerTop = containerRef.current.getBoundingClientRect().top;
    
    let visiblePage = 1;
    for (let p = 1; p <= totalPages; p++) {
      const el = pageRefs.current[p];
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top - containerTop <= 250) {
          visiblePage = p;
        }
      }
    }
    if (visiblePage !== currentPage) {
      setCurrentPage(visiblePage);
      setJumpPageInput(String(visiblePage));
    }
  };

  // Scroll directly to page
  const scrollToPage = (pageNum: number) => {
    const el = pageRefs.current[pageNum];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(pageNum);
      setJumpPageInput(String(pageNum));
    }
  };

  // Responsive Window Resize Handler
  useEffect(() => {
    const handleResize = () => {
      if (!pdfDoc || fitMode !== 'width') return;
      pdfDoc.getPage(1).then((page: any) => {
        const vp = page.getViewport({ scale: 1.0, rotation });
        const newScale = getFitWidthScale(vp.width);
        setScale(newScale);
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDoc, rotation, fitMode, getFitWidthScale]);

  // Mobile Pinch-to-Zoom and Double-Tap Native Event Handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Multi-touch pinch start
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        touchStateRef.current.initialDistance = dist;
        touchStateRef.current.initialScale = scale;
        touchStateRef.current.isPinching = true;
      } else if (e.touches.length === 1) {
        // Single touch for double tap detection
        const now = Date.now();
        const touch = e.touches[0];
        const lastTime = touchStateRef.current.lastTapTime;
        const lastX = touchStateRef.current.lastTapX;
        const lastY = touchStateRef.current.lastTapY;

        const dist = Math.hypot(touch.clientX - lastX, touch.clientY - lastY);

        if (now - lastTime < 300 && dist < 30) {
          // Double Tap Detected!
          e.preventDefault();
          if (scale > 1.2) {
            handleFitWidth();
          } else {
            setFitMode('custom');
            setScale((s) => Number(Math.min(s * 1.5, 2.5).toFixed(2)));
          }
          touchStateRef.current.lastTapTime = 0;
        } else {
          touchStateRef.current.lastTapTime = now;
          touchStateRef.current.lastTapX = touch.clientX;
          touchStateRef.current.lastTapY = touch.clientY;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStateRef.current.isPinching) {
        e.preventDefault(); // Prevent browser whole-page zoom
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (touchStateRef.current.initialDistance > 0) {
          const ratio = dist / touchStateRef.current.initialDistance;
          const calculatedScale = touchStateRef.current.initialScale * ratio;
          const clampedScale = Math.min(Math.max(calculatedScale, 0.4), 3.0);
          
          setFitMode('custom');
          // Live scale
          setScale(Number(clampedScale.toFixed(2)));
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchStateRef.current.isPinching = false;
        touchStateRef.current.initialDistance = 0;
      }
    };

    // Passive false is crucial to allow e.preventDefault() on pinch
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [scale, getFitWidthScale]);

  // Page navigation
  const prevPage = () => {
    if (currentPage > 1) {
      scrollToPage(currentPage - 1);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      scrollToPage(currentPage + 1);
    }
  };

  const handlePageJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpPageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      scrollToPage(target);
    } else {
      setJumpPageInput(String(currentPage));
    }
  };

  // Zoom controls with instant response
  const zoomIn = () => {
    setFitMode('custom');
    setScale((s) => Math.min(Number((s + 0.2).toFixed(2)), 3.0));
  };

  const zoomOut = () => {
    setFitMode('custom');
    setScale((s) => Math.max(Number((s - 0.2).toFixed(2)), 0.4));
  };

  const handleFitWidth = async () => {
    if (!pdfDoc) return;
    setFitMode('width');
    const page = await pdfDoc.getPage(1);
    const vp = page.getViewport({ scale: 1.0, rotation });
    setScale(getFitWidthScale(vp.width));
  };

  const handleResetZoom100 = () => {
    setFitMode('custom');
    setScale(1.0);
  };

  // Rotation
  const rotateClockwise = () => setRotation((r) => (r + 90) % 360);

  // Full screen toggle
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      if (wrapperRef.current?.requestFullscreen) {
        wrapperRef.current.requestFullscreen();
        setIsFullScreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  // Print support
  const handlePrint = () => {
    if (effectiveDownloadUrl && effectiveDownloadUrl !== '#') {
      const printWindow = window.open(effectiveDownloadUrl, '_blank');
      if (printWindow) printWindow.focus();
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={`flex flex-col bg-[#1e1f20] text-slate-100 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-[#2f3133] transition-all select-none ${className} ${
        isFullScreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : ''
      }`}
      style={{ minHeight: isFullScreen ? '100dvh' : minHeight }}
    >
      {/* ============================================================
          GOOGLE DRIVE STYLE TOP HEADER BAR
      ============================================================ */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 bg-[#18191a] border-b border-[#2d2f31] text-white z-20 shrink-0 gap-2">
        {/* Left: Google Drive Red PDF Icon & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#ea4335] flex items-center justify-center shrink-0 shadow-md">
            <span className="text-white font-extrabold text-[10px] sm:text-xs tracking-wider">PDF</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold truncate text-slate-100 leading-snug">
              {title}
            </h2>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-400">
              <span className="truncate">{paperDetails?.subjectName || 'Question Paper'}</span>
              <span>•</span>
              <span className="text-[#8ab4f8] font-medium">Google Drive Preview</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={handlePrint}
            disabled={loading}
            className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer hidden sm:inline-flex"
            title="Print"
          >
            <Printer className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          <a
            href={effectiveDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Open in new window"
          >
            <ExternalLink className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </a>

          <button
            onClick={toggleFullScreen}
            className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullScreen ? (
              <Minimize2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            ) : (
              <Maximize2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            )}
          </button>

          {showDownloadButton && (
            <a
              href={effectiveDownloadUrl}
              download={effectiveDownloadFilename}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:scale-95 text-white text-xs font-semibold shadow-md transition-all cursor-pointer ml-1"
              title="Download PDF file"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Download</span>
            </a>
          )}
        </div>
      </div>

      {/* ============================================================
          MAIN VIEWER BODY: Continuous Vertical Scroll with Pinch Zoom
      ============================================================ */}
      <div className="relative flex-1 bg-[#131314] overflow-hidden flex flex-col">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-8 flex flex-col items-center gap-6 touch-manipulation"
          style={{ minHeight: '440px', WebkitOverflowScrolling: 'touch' }}
        >
          {loading && (
            <div className="flex flex-col items-center justify-center my-auto text-slate-400 gap-3 py-20">
              <Loader2 className="w-9 h-9 text-[#8ab4f8] animate-spin" />
              <p className="text-xs sm:text-sm font-medium text-slate-300 animate-pulse">
                Loading Google Drive document preview...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="max-w-md w-full my-auto text-center p-6 bg-[#1e1f20] border border-[#2f3133] rounded-2xl space-y-4 shadow-xl">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-white">Preview Notice</h4>
                <p className="text-xs text-slate-400 mt-1">{error}</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                <button
                  onClick={loadDocument}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#2b2c2f] hover:bg-[#383a3d] text-slate-200 text-xs font-semibold rounded-full transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
                <a
                  href={effectiveDownloadUrl}
                  download={effectiveDownloadFilename}
                  className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-bold rounded-full transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </a>
              </div>
            </div>
          )}

          {/* Continuous Pages Stack */}
          {!loading && !error && pdfDoc && (
            <div
              ref={pagesContainerRef}
              className="flex flex-col items-center gap-6 sm:gap-8 pb-20 my-auto"
            >
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                <div
                  key={pageNum}
                  ref={(el) => {
                    pageRefs.current[pageNum] = el;
                  }}
                  className="relative group flex flex-col items-center"
                >
                  <div className="bg-white rounded-xs sm:rounded-sm shadow-[0_8px_30px_rgb(0,0,0,0.6)] ring-1 ring-black/30 overflow-hidden">
                    <canvas
                      ref={(el) => {
                        canvasRefs.current[pageNum] = el;
                      }}
                      className="block max-w-none bg-white"
                    />
                  </div>

                  {totalPages > 1 && (
                    <span className="mt-2 text-[11px] font-medium text-slate-500 select-none">
                      Page {pageNum} of {totalPages}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================
            GOOGLE DRIVE FLOATING BOTTOM PILL CONTROLS (Touch-Optimized)
        ============================================================ */}
        {!loading && !error && pdfDoc && (
          <div className="absolute bottom-3 sm:bottom-4 inset-x-0 mx-auto w-fit z-30 pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#282a2d]/95 backdrop-blur-md text-white shadow-[0_8px_24px_rgba(0,0,0,0.6)] border border-[#3c4043]">
              {/* Pagination Controls */}
              <div className="flex items-center">
                <button
                  onClick={prevPage}
                  disabled={currentPage <= 1}
                  className="p-1.5 sm:p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </button>

                <form onSubmit={handlePageJumpSubmit} className="flex items-center px-1">
                  <input
                    type="text"
                    value={jumpPageInput}
                    onChange={(e) => setJumpPageInput(e.target.value)}
                    onBlur={handlePageJumpSubmit}
                    disabled={totalPages <= 1}
                    className="w-7 sm:w-8 py-0.5 text-center text-xs font-semibold bg-[#18191a] text-white rounded-md border border-[#3c4043] focus:ring-1 focus:ring-[#8ab4f8] focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-400 font-medium ml-1 mr-0.5 select-none">
                    / {totalPages}
                  </span>
                </form>

                <button
                  onClick={nextPage}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 sm:p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </button>
              </div>

              {/* Vertical Divider */}
              <div className="h-4 w-px bg-[#3c4043] mx-0.5" />

              {/* Zoom In & Out Touch Buttons */}
              <div className="flex items-center">
                <button
                  onClick={zoomOut}
                  disabled={scale <= 0.4}
                  className="p-1.5 sm:p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 active:scale-90 text-slate-300 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </button>

                <button
                  onClick={handleResetZoom100}
                  className="px-1.5 py-0.5 rounded hover:bg-white/10 active:bg-white/20 text-[11px] sm:text-xs font-mono font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="100% Zoom"
                >
                  {Math.round(scale * 100)}%
                </button>

                <button
                  onClick={zoomIn}
                  disabled={scale >= 3.0}
                  className="p-1.5 sm:p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 active:scale-90 text-slate-300 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </button>
              </div>

              {/* Vertical Divider */}
              <div className="h-4 w-px bg-[#3c4043] mx-0.5" />

              {/* Fit Width Toggle Button */}
              <button
                onClick={handleFitWidth}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                  fitMode === 'width'
                    ? 'bg-[#1a73e8] text-white shadow-xs'
                    : 'hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white'
                }`}
                title="Fit to width"
              >
                <Maximize className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Fit Width</span>
              </button>

              {/* Rotate 90° */}
              <button
                onClick={rotateClockwise}
                className="p-1.5 sm:p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 active:scale-90 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Rotate 90°"
              >
                <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
