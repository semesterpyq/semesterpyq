import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Printer,
  AlertCircle,
  RotateCw,
  Maximize,
  ArrowLeft,
} from 'lucide-react';
import { QuestionPaper } from '../types';
import { pdfjsLib, downloadPaperPdf } from '../utils/pdfViewer';
import {
  isPdfByteArray,
  generateClientQuestionPaperPdf,
} from '../utils/clientPdfGenerator';

interface PdfViewerModalProps {
  paper: QuestionPaper;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ paper, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const canvasRefs = useRef<{ [key: number]: HTMLCanvasElement | null }>({});

  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  // High-performance scale state
  const [scale, setScale] = useState<number>(1.0);
  const [renderedScale, setRenderedScale] = useState<number>(1.0);
  const [fitMode, setFitMode] = useState<'width' | 'custom'>('width');
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [blobPdfUrl, setBlobPdfUrl] = useState<string | null>(null);
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');

  // Debounce ref for crystal-clear re-rendering without blocking UI
  const renderDebounceTimer = useRef<any>(null);

  // Pinch-to-zoom & pan focal state
  const touchStateRef = useRef<{
    isPinching: boolean;
    initialDistance: number;
    initialScale: number;
    initialMidX: number;
    initialMidY: number;
    initialScrollLeft: number;
    initialScrollTop: number;
    lastTapTime: number;
    lastTapX: number;
    lastTapY: number;
  }>({
    isPinching: false,
    initialDistance: 0,
    initialScale: 1.0,
    initialMidX: 0,
    initialMidY: 0,
    initialScrollLeft: 0,
    initialScrollTop: 0,
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,
  });

  const pdfFileUrl = paper.file_url || `/api/papers/${paper.id}/file`;

  // Clean up blob URL and timers on unmount
  useEffect(() => {
    return () => {
      if (blobPdfUrl) {
        URL.revokeObjectURL(blobPdfUrl);
      }
      if (renderDebounceTimer.current) {
        clearTimeout(renderDebounceTimer.current);
      }
    };
  }, [blobPdfUrl]);

  // Calculate default responsive scale based on viewport / device
  const calculateFitWidthScale = useCallback((viewportWidth: number) => {
    if (!containerRef.current) return 1.0;
    const containerWidth = containerRef.current.clientWidth;
    const padding = containerWidth < 640 ? 16 : 48;
    const availableWidth = Math.max(containerWidth - padding, 260);
    const fitScale = availableWidth / viewportWidth;
    return Number(fitScale.toFixed(2));
  }, []);

  // Debounced update to re-rasterize canvas at high resolution once pinch/zoom stops
  const queueHighResRender = useCallback((targetScale: number) => {
    if (renderDebounceTimer.current) {
      clearTimeout(renderDebounceTimer.current);
    }
    renderDebounceTimer.current = setTimeout(() => {
      setRenderedScale(targetScale);
    }, 200);
  }, []);

  // Set zoom scale smoothly
  const applyZoom = useCallback(
    (newScale: number, isCustom = true) => {
      const clamped = Math.min(Math.max(Number(newScale.toFixed(2)), 0.4), 3.5);
      setScale(clamped);
      if (isCustom) setFitMode('custom');
      queueHighResRender(clamped);
    },
    [queueHighResRender]
  );

  // 1. Load the PDF document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    const loadPdf = async () => {
      let pdfBytes: Uint8Array | null = null;

      if (paper.file_url && paper.file_url.startsWith('data:')) {
        try {
          const base64Data = paper.file_url.split(',')[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          if (isPdfByteArray(bytes)) {
            pdfBytes = bytes;
          }
        } catch (e) {
          console.warn('Failed parsing data URL:', e);
        }
      }

      if (!pdfBytes) {
        try {
          const response = await fetch(pdfFileUrl);
          if (response.ok) {
            const data = await response.arrayBuffer();
            const uint8 = new Uint8Array(data);
            if (isPdfByteArray(uint8)) {
              pdfBytes = uint8;
            }
          }
        } catch (fetchErr) {
          console.warn('[PdfViewerModal] Direct fetch failed or returned non-PDF:', fetchErr);
        }
      }

      if (!pdfBytes) {
        try {
          const generated = await generateClientQuestionPaperPdf({
            collegeName: 'SEMESTER (PYQs)',
            courseName: paper.course_name || paper.course_code || 'Degree Course',
            courseCode: paper.course_code || 'DEG',
            yearName: paper.year_name || 'Academic Year',
            subjectName: paper.subject_name || paper.title,
            subjectCode: paper.subject_code || paper.paper_code,
            paperTitle: paper.title,
            examYear: paper.paper_year || paper.exam_year || 2024,
            examSession: paper.exam_session || 'Main Semester Examination',
            paperCode: paper.paper_code,
            totalMarks: paper.total_marks || 75,
            duration: paper.duration || '3 Hours',
          });
          pdfBytes = generated;
        } catch (genErr) {
          console.error('[PdfViewerModal] Failed to synthesize fallback PDF:', genErr);
        }
      }

      if (isCancelled) return;

      if (!pdfBytes) {
        setError('Could not load or synthesize question paper PDF.');
        setLoading(false);
        return;
      }

      try {
        const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
        const objUrl = URL.createObjectURL(blob);
        setBlobPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objUrl;
        });
      } catch (e) {
        console.warn('Could not create blob URL:', e);
      }

      try {
        const loadingTask = pdfjsLib.getDocument({
          data: pdfBytes,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + pdfjsLib.version + '/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);

        const firstPage = await doc.getPage(1);
        const unscaledViewport = firstPage.getViewport({ scale: 1.0, rotation: 0 });
        const autoScale = calculateFitWidthScale(unscaledViewport.width);
        setScale(autoScale);
        setRenderedScale(autoScale);
        setLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('Error loading PDF:', err);
        setError(err?.message || 'Could not load PDF document.');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [pdfFileUrl, calculateFitWidthScale, paper]);

  // Render individual page onto its corresponding Canvas
  const renderSinglePage = useCallback(
    async (pageNum: number, pdf: any, currentScale: number) => {
      const canvas = canvasRefs.current[pageNum];
      if (!pdf || !canvas) return;

      try {
        const page = await pdf.getPage(pageNum);
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        const viewport = page.getViewport({ scale: currentScale, rotation });
        
        // High-DPI / Retina clamp
        const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2.5);

        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);

        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport,
        };

        await page.render(renderContext).promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`[PdfViewerModal] Canvas render error for page ${pageNum}:`, err);
        }
      }
    },
    [rotation]
  );

  // Render all pages in continuous Google Drive vertical scroll stack
  useEffect(() => {
    if (pdfDoc && numPages > 0) {
      for (let p = 1; p <= numPages; p++) {
        renderSinglePage(p, pdfDoc, renderedScale);
      }
    }
  }, [pdfDoc, numPages, renderedScale, rotation, renderSinglePage]);

  // Track current visible page during continuous vertical scrolling
  const handleScroll = () => {
    if (!containerRef.current || numPages <= 1) return;
    const containerTop = containerRef.current.getBoundingClientRect().top;
    
    let visiblePage = 1;
    for (let p = 1; p <= numPages; p++) {
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

  const scrollToPage = (pageNum: number) => {
    const el = pageRefs.current[pageNum];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(pageNum);
      setJumpPageInput(String(pageNum));
    }
  };

  // 60FPS Hardware-Accelerated Pinch-to-Zoom & Pan in all positions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const rect = container.getBoundingClientRect();

        touchStateRef.current.isPinching = true;
        touchStateRef.current.initialDistance = dist;
        touchStateRef.current.initialScale = scale;
        touchStateRef.current.initialMidX = (t1.clientX + t2.clientX) / 2 - rect.left;
        touchStateRef.current.initialMidY = (t1.clientY + t2.clientY) / 2 - rect.top;
        touchStateRef.current.initialScrollLeft = container.scrollLeft;
        touchStateRef.current.initialScrollTop = container.scrollTop;
      } else if (e.touches.length === 1) {
        const now = Date.now();
        const touch = e.touches[0];
        const lastTime = touchStateRef.current.lastTapTime;
        const lastX = touchStateRef.current.lastTapX;
        const lastY = touchStateRef.current.lastTapY;
        const dist = Math.hypot(touch.clientX - lastX, touch.clientY - lastY);

        if (now - lastTime < 300 && dist < 35) {
          e.preventDefault();
          if (scale > 1.2) {
            handleFitWidth();
          } else {
            applyZoom(scale * 1.6);
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
        e.preventDefault();

        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

        if (touchStateRef.current.initialDistance > 0) {
          const ratio = dist / touchStateRef.current.initialDistance;
          const newScale = Math.min(
            Math.max(touchStateRef.current.initialScale * ratio, 0.4),
            3.5
          );

          setScale(Number(newScale.toFixed(2)));
          setFitMode('custom');

          const scaleChange = newScale / touchStateRef.current.initialScale;
          const midX = touchStateRef.current.initialMidX;
          const midY = touchStateRef.current.initialMidY;

          container.scrollLeft =
            (touchStateRef.current.initialScrollLeft + midX) * scaleChange - midX;
          container.scrollTop =
            (touchStateRef.current.initialScrollTop + midY) * scaleChange - midY;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStateRef.current.isPinching && e.touches.length < 2) {
        touchStateRef.current.isPinching = false;
        touchStateRef.current.initialDistance = 0;
        queueHighResRender(scale);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.01;
        const newScale = Math.min(Math.max(scale + delta, 0.4), 3.5);
        applyZoom(newScale);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [scale, applyZoom, queueHighResRender]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (currentPage > 1) scrollToPage(currentPage - 1);
      } else if (e.key === 'ArrowRight') {
        if (currentPage < numPages) scrollToPage(currentPage + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, numPages, onClose]);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      if (!pdfDoc || fitMode !== 'width') return;
      pdfDoc.getPage(1).then((page: any) => {
        const vp = page.getViewport({ scale: 1.0, rotation });
        const newScale = calculateFitWidthScale(vp.width);
        setScale(newScale);
        setRenderedScale(newScale);
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDoc, rotation, fitMode, calculateFitWidthScale]);

  // Handle Download action
  const handleDownloadClick = async () => {
    setDownloading(true);
    try {
      await downloadPaperPdf(paper);
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  // Zoom controls
  const handleZoomIn = () => applyZoom(scale + 0.2);
  const handleZoomOut = () => applyZoom(scale - 0.2);

  const handleFitWidth = async () => {
    if (!pdfDoc) return;
    setFitMode('width');
    const page = await pdfDoc.getPage(1);
    const vp = page.getViewport({ scale: 1.0, rotation });
    const fitScale = calculateFitWidthScale(vp.width);
    applyZoom(fitScale, false);
  };

  const handleResetZoom100 = () => applyZoom(1.0);

  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handlePrevPage = () => {
    if (currentPage > 1) scrollToPage(currentPage - 1);
  };
  const handleNextPage = () => {
    if (currentPage < numPages) scrollToPage(currentPage + 1);
  };

  const handlePageJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpPageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= numPages) {
      scrollToPage(target);
    } else {
      setJumpPageInput(String(currentPage));
    }
  };

  const handlePrint = () => {
    const targetUrl = blobPdfUrl || pdfFileUrl;
    const printWindow = window.open(targetUrl, '_blank');
    if (printWindow) printWindow.focus();
  };

  const visualScaleFactor = renderedScale > 0 ? scale / renderedScale : 1.0;

  return (
    <div
      id="pdf-viewer-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-0 sm:p-3 md:p-5 animate-in fade-in duration-200 select-none"
    >
      <div
        id="pdf-viewer-modal"
        className="bg-[#1e1f20] rounded-none sm:rounded-2xl w-full max-w-6xl h-[100dvh] sm:h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-[#2f3133]"
      >
        {/* ============================================================
            GOOGLE DRIVE STYLE TOP HEADER BAR
        ============================================================ */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 bg-[#18191a] border-b border-[#2d2f31] text-white shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Close preview (Esc)"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#ea4335] flex items-center justify-center shrink-0 shadow-md">
              <span className="text-white font-extrabold text-[10px] sm:text-xs tracking-wider">PDF</span>
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-xs sm:text-sm md:text-base truncate text-slate-100 leading-tight">
                {paper.title}
              </h3>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-400 mt-0.5">
                <span className="truncate max-w-[140px] sm:max-w-none">
                  {paper.subject_name || paper.course_name || 'Subject'}
                </span>
                <span>•</span>
                <span className="text-amber-400 font-semibold">
                  {paper.paper_year || paper.exam_year || 2024}
                </span>
                {paper.paper_code && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline font-mono text-[11px] text-[#8ab4f8]">
                      {paper.paper_code}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={handlePrint}
              disabled={loading}
              className="hidden md:inline-flex p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Print"
            >
              <Printer className="w-4.5 h-4.5" />
            </button>

            <a
              href={blobPdfUrl || pdfFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Open in new window"
            >
              <ExternalLink className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </a>

            <button
              onClick={handleDownloadClick}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:scale-95 text-white text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-75 ml-1"
              title="Download PDF directly to your device"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
              <span>Download</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ============================================================
            MAIN VIEWER CANVAS AREA (Smooth Zoom & Pan in All Directions)
        ============================================================ */}
        <div className="relative flex-1 bg-[#131314] overflow-hidden flex flex-col">
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-auto p-4 sm:p-8 flex flex-col items-center select-none"
            style={{
              touchAction: 'pan-x pan-y pinch-zoom',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
            }}
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
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                  <button
                    onClick={handleDownloadClick}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF Document</span>
                  </button>
                </div>
              </div>
            )}

            {/* Continuous Pages Stack with GPU hardware acceleration & transform origin */}
            {!loading && !error && pdfDoc && (
              <div
                ref={pagesContainerRef}
                className="flex flex-col items-center gap-6 sm:gap-8 pb-24 my-auto origin-top transition-transform duration-100 ease-out will-change-transform"
                style={{
                  transform: `scale(${visualScaleFactor})`,
                  transformOrigin: 'top center',
                }}
              >
                {Array.from({ length: numPages }, (_, idx) => idx + 1).map((pageNum) => (
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

                    {numPages > 1 && (
                      <span className="mt-2 text-[11px] font-medium text-slate-500 select-none">
                        Page {pageNum} of {numPages}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ============================================================
              GOOGLE DRIVE FLOATING BOTTOM PILL CONTROLS (Lag-Free)
          ============================================================ */}
          {!loading && !error && pdfDoc && (
            <div className="absolute bottom-3 sm:bottom-4 inset-x-0 mx-auto w-fit z-30 pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#282a2d]/95 backdrop-blur-md text-white shadow-[0_8px_24px_rgba(0,0,0,0.6)] border border-[#3c4043]">
                <div className="flex items-center">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage <= 1}
                    className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                    title="Previous Page (Left Arrow)"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </button>

                  <form onSubmit={handlePageJumpSubmit} className="flex items-center px-1">
                    <input
                      type="text"
                      value={jumpPageInput}
                      onChange={(e) => setJumpPageInput(e.target.value)}
                      onBlur={handlePageJumpSubmit}
                      disabled={numPages <= 1}
                      className="w-7 sm:w-8 py-0.5 text-center text-xs font-semibold bg-[#18191a] text-white rounded-md border border-[#3c4043] focus:ring-1 focus:ring-[#8ab4f8] focus:outline-hidden"
                    />
                    <span className="text-xs text-slate-400 font-medium ml-1 mr-0.5 select-none">
                      / {numPages}
                    </span>
                  </form>

                  <button
                    onClick={handleNextPage}
                    disabled={currentPage >= numPages}
                    className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                    title="Next Page (Right Arrow)"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </button>
                </div>

                <div className="h-4 w-px bg-[#3c4043] mx-0.5" />

                <div className="flex items-center">
                  <button
                    onClick={handleZoomOut}
                    disabled={scale <= 0.4}
                    className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 active:scale-90 text-slate-300 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
                    title="Zoom Out (-)"
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
                    onClick={handleZoomIn}
                    disabled={scale >= 3.5}
                    className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 active:scale-90 text-slate-300 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </button>
                </div>

                <div className="h-4 w-px bg-[#3c4043] mx-0.5" />

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

                <button
                  onClick={handleRotate}
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
    </div>
  );
};
