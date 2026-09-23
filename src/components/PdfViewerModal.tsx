import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Printer,
  AlertCircle,
  RotateCw,
  Maximize,
  Maximize2,
  Minimize2,
  ArrowLeft,
  FileText,
  Share2,
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

interface PageDimension {
  width: number;
  height: number;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ paper, onClose }) => {
  const modalWrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const canvasRefs = useRef<{ [key: number]: HTMLCanvasElement | null }>({});
  const activeRenderTasks = useRef<{ [key: number]: any }>({});

  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [fitMode, setFitMode] = useState<'width' | 'custom'>('width');
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [blobPdfUrl, setBlobPdfUrl] = useState<string | null>(null);
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');
  const [basePageDimensions, setBasePageDimensions] = useState<{ [key: number]: PageDimension }>({});
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const scaleRef = useRef<number>(1.0);
  scaleRef.current = scale;

  const anchorRef = useRef<{
    focalRatioX: number;
    focalRatioY: number;
    viewportFocalX: number;
    viewportFocalY: number;
  } | null>(null);

  // Multi-touch pinch state
  const touchStateRef = useRef<{
    isPinching: boolean;
    initialDistance: number;
    initialScale: number;
    initialMidX: number;
    initialMidY: number;
    initialScrollLeft: number;
    initialScrollTop: number;
  }>({
    isPinching: false,
    initialDistance: 0,
    initialScale: 1.0,
    initialMidX: 0,
    initialMidY: 0,
    initialScrollLeft: 0,
    initialScrollTop: 0,
  });

  const pdfFileUrl = paper.file_url || `/api/papers/${paper.id}/file`;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blobPdfUrl) {
        URL.revokeObjectURL(blobPdfUrl);
      }
      Object.values(activeRenderTasks.current).forEach((task) => {
        try {
          task?.cancel();
        } catch {
          // ignore task cancellation
        }
      });
    };
  }, [blobPdfUrl]);

  // Compute responsive fit-to-width scale
  const calculateFitWidthScale = useCallback((viewportWidth: number) => {
    if (!containerRef.current || !viewportWidth) return 1.0;
    const containerWidth = containerRef.current.clientWidth;
    // Responsive padding based on device size
    const padding = containerWidth < 480 ? 16 : containerWidth < 768 ? 32 : 48;
    const availableWidth = Math.max(containerWidth - padding, 240);
    const fitScale = availableWidth / viewportWidth;
    return Number(fitScale.toFixed(2));
  }, []);

  // Update zoom with focal anchor to eliminate jumping and keep viewport steady
  const setZoomWithAnchor = useCallback(
    (
      newScale: number,
      focalPoint?: { clientX: number; clientY: number },
      mode: 'width' | 'custom' = 'custom'
    ) => {
      const container = containerRef.current;
      const clampedScale = Math.min(Math.max(Number(newScale.toFixed(2)), 0.35), 3.5);

      if (!container || clampedScale === scaleRef.current) {
        setScale(clampedScale);
        setFitMode(mode);
        return;
      }

      const rect = container.getBoundingClientRect();
      const currentScale = scaleRef.current;

      let viewportX = focalPoint ? focalPoint.clientX - rect.left : container.clientWidth / 2;
      let viewportY = focalPoint ? focalPoint.clientY - rect.top : container.clientHeight / 2;

      viewportX = Math.max(0, Math.min(viewportX, container.clientWidth));
      viewportY = Math.max(0, Math.min(viewportY, container.clientHeight));

      const docX = (container.scrollLeft + viewportX) / currentScale;
      const docY = (container.scrollTop + viewportY) / currentScale;

      anchorRef.current = {
        focalRatioX: docX,
        focalRatioY: docY,
        viewportFocalX: viewportX,
        viewportFocalY: viewportY,
      };

      setFitMode(mode);
      setScale(clampedScale);
    },
    []
  );

  // Sync scroll positioning synchronously after zoom change
  useLayoutEffect(() => {
    if (anchorRef.current && containerRef.current) {
      const { focalRatioX, focalRatioY, viewportFocalX, viewportFocalY } = anchorRef.current;
      const container = containerRef.current;
      container.scrollLeft = Math.max(0, focalRatioX * scale - viewportFocalX);
      container.scrollTop = Math.max(0, focalRatioY * scale - viewportFocalY);
      anchorRef.current = null;
    }
  }, [scale]);

  // Load PDF document
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

        const dims: { [key: number]: PageDimension } = {};
        for (let i = 1; i <= doc.numPages; i++) {
          const p = await doc.getPage(i);
          const vp = p.getViewport({ scale: 1.0, rotation: 0 });
          dims[i] = { width: vp.width, height: vp.height };
        }
        setBasePageDimensions(dims);

        const firstPageVp = dims[1] || { width: 612, height: 792 };
        const initialScale = calculateFitWidthScale(firstPageVp.width);
        setScale(initialScale);
        scaleRef.current = initialScale;
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

  // Clean page rendering onto canvas
  const renderSinglePage = useCallback(
    async (pageNum: number, pdf: any, currentScale: number, currentRotation: number) => {
      const canvas = canvasRefs.current[pageNum];
      if (!pdf || !canvas) return;

      if (activeRenderTasks.current[pageNum]) {
        try {
          activeRenderTasks.current[pageNum].cancel();
        } catch {
          // ignore
        }
      }

      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: currentScale, rotation: currentRotation });
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2.5);

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        activeRenderTasks.current[pageNum] = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`[PdfViewerModal] Canvas render error for page ${pageNum}:`, err);
        }
      } finally {
        activeRenderTasks.current[pageNum] = null;
      }
    },
    []
  );

  // Render all pages
  useEffect(() => {
    if (pdfDoc && numPages > 0) {
      for (let p = 1; p <= numPages; p++) {
        renderSinglePage(p, pdfDoc, scale, rotation);
      }
    }
  }, [pdfDoc, numPages, scale, rotation, renderSinglePage]);

  // Track active page when scrolling
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || numPages <= 1) return;

    const containerTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const viewCenter = containerTop + containerHeight * 0.35;

    let bestPage = 1;
    let minDistance = Infinity;

    for (let p = 1; p <= numPages; p++) {
      const pageEl = pageContainerRefs.current[p];
      if (pageEl) {
        const pageTop = pageEl.offsetTop;
        const pageBottom = pageTop + pageEl.offsetHeight;

        if (viewCenter >= pageTop && viewCenter <= pageBottom) {
          bestPage = p;
          break;
        }

        const distance = Math.abs(pageTop - viewCenter);
        if (distance < minDistance) {
          minDistance = distance;
          bestPage = p;
        }
      }
    }

    if (bestPage !== currentPage) {
      setCurrentPage(bestPage);
      setJumpPageInput(String(bestPage));
    }
  }, [numPages, currentPage]);

  const scrollToPage = useCallback((pageNum: number) => {
    const container = containerRef.current;
    const targetEl = pageContainerRefs.current[pageNum];
    if (container && targetEl) {
      const targetTop = Math.max(0, targetEl.offsetTop - 16);
      container.scrollTo({
        top: targetTop,
        behavior: 'smooth',
      });
      setCurrentPage(pageNum);
      setJumpPageInput(String(pageNum));
    }
  }, []);

  // Multi-Touch Pinch-to-Zoom on mobile
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
        touchStateRef.current.initialScale = scaleRef.current;
        touchStateRef.current.initialMidX = (t1.clientX + t2.clientX) / 2 - rect.left;
        touchStateRef.current.initialMidY = (t1.clientY + t2.clientY) / 2 - rect.top;
        touchStateRef.current.initialScrollLeft = container.scrollLeft;
        touchStateRef.current.initialScrollTop = container.scrollTop;
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
          const targetScale = Math.min(
            Math.max(touchStateRef.current.initialScale * ratio, 0.35),
            3.5
          );

          setZoomWithAnchor(targetScale, {
            clientX: (t1.clientX + t2.clientX) / 2,
            clientY: (t1.clientY + t2.clientY) / 2,
          });
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStateRef.current.isPinching && e.touches.length < 2) {
        touchStateRef.current.isPinching = false;
        touchStateRef.current.initialDistance = 0;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.008;
        const newScale = Math.min(Math.max(scaleRef.current + delta, 0.35), 3.5);
        setZoomWithAnchor(newScale, { clientX: e.clientX, clientY: e.clientY });
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
  }, [setZoomWithAnchor]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (!pdfDoc || fitMode !== 'width') return;
      const firstDim = basePageDimensions[1] || { width: 612, height: 792 };
      const newScale = calculateFitWidthScale(firstDim.width);
      setScale(newScale);
      scaleRef.current = newScale;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDoc, fitMode, basePageDimensions, calculateFitWidthScale]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (currentPage > 1) scrollToPage(currentPage - 1);
      } else if (e.key === 'ArrowRight') {
        if (currentPage < numPages) scrollToPage(currentPage + 1);
      } else if (e.key === '+' || e.key === '=') {
        setZoomWithAnchor(scaleRef.current + 0.15);
      } else if (e.key === '-') {
        setZoomWithAnchor(scaleRef.current - 0.15);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, numPages, onClose, scrollToPage, setZoomWithAnchor]);

  // Action Handlers
  const handleZoomIn = () => setZoomWithAnchor(scale + 0.15);
  const handleZoomOut = () => setZoomWithAnchor(scale - 0.15);

  const handleFitWidth = () => {
    if (!pdfDoc) return;
    const firstDim = basePageDimensions[1] || { width: 612, height: 792 };
    const fitScale = calculateFitWidthScale(firstDim.width);
    setZoomWithAnchor(fitScale, undefined, 'width');
  };

  const handleResetZoom100 = () => setZoomWithAnchor(1.0);
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

  const handleDownloadClick = async () => {
    setDownloading(true);
    try {
      await downloadPaperPdf(paper);
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      if (modalWrapperRef.current?.requestFullscreen) {
        modalWrapperRef.current.requestFullscreen();
        setIsFullScreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  const handlePrint = () => {
    const targetUrl = blobPdfUrl || pdfFileUrl;
    const printWindow = window.open(targetUrl, '_blank');
    if (printWindow) printWindow.focus();
  };

  return (
    <div
      id="pdf-viewer-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xs p-0 sm:p-2 md:p-4 select-none"
    >
      <div
        ref={modalWrapperRef}
        id="pdf-viewer-modal"
        className={`bg-[#202124] w-full flex flex-col shadow-2xl overflow-hidden border border-[#3c4043] ${
          isFullScreen
            ? 'fixed inset-0 z-50 rounded-none h-[100dvh]'
            : 'rounded-none sm:rounded-xl max-w-6xl h-[100dvh] sm:h-[96vh]'
        }`}
      >
        {/* ============================================================
            GOOGLE DRIVE / CHROME STYLE TOP TOOLBAR
        ============================================================ */}
        <header className="flex items-center justify-between px-2.5 sm:px-4 py-2 bg-[#323639] border-b border-[#444746] text-white shrink-0 gap-2 z-20 shadow-md">
          {/* Left: Document Info & Back */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <ArrowLeft className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </button>

            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-sm bg-[#ea4335] flex items-center justify-center shrink-0 shadow-xs">
              <span className="text-white font-black text-[9px] sm:text-[10px] tracking-wider">PDF</span>
            </div>

            <div className="min-w-0">
              <h2 className="font-medium text-xs sm:text-sm truncate text-slate-100 leading-tight max-w-[130px] xs:max-w-[200px] sm:max-w-[260px] md:max-w-md">
                {paper.title}
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400 mt-0.5">
                <span className="truncate max-w-[100px] sm:max-w-[160px]">
                  {paper.subject_name || paper.course_name || 'Question Paper'}
                </span>
                <span>•</span>
                <span className="text-[#8ab4f8] font-medium">
                  {paper.paper_year || paper.exam_year || 2024}
                </span>
              </div>
            </div>
          </div>

          {/* Center / Controls: Page Navigation & Zoom Tools */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Page Navigation */}
            <div className="flex items-center bg-[#282a2d] px-1 py-0.5 rounded-md border border-[#444746]">
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1 || loading}
                className="p-1 rounded hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                title="Previous Page (←)"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <form onSubmit={handlePageJumpSubmit} className="flex items-center px-1">
                <input
                  type="text"
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  onBlur={handlePageJumpSubmit}
                  disabled={numPages <= 1 || loading}
                  className="w-5 sm:w-7 py-0 text-center text-xs font-medium bg-transparent text-white border-none focus:ring-1 focus:ring-[#8ab4f8] focus:bg-[#18191a] rounded focus:outline-hidden"
                />
                <span className="text-[11px] sm:text-xs text-slate-400 font-normal select-none">
                  / {numPages || 1}
                </span>
              </form>

              <button
                onClick={handleNextPage}
                disabled={currentPage >= numPages || loading}
                className="p-1 rounded hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                title="Next Page (→)"
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            <div className="h-4 w-px bg-[#444746] hidden xs:block" />

            {/* Zoom Controls */}
            <div className="flex items-center bg-[#282a2d] px-1 py-0.5 rounded-md border border-[#444746]">
              <button
                onClick={handleZoomOut}
                disabled={scale <= 0.35 || loading}
                className="p-1 rounded hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                onClick={handleResetZoom100}
                className="px-1.5 py-0.5 rounded hover:bg-white/10 text-[11px] sm:text-xs font-mono font-medium text-slate-200 hover:text-white transition-colors cursor-pointer"
                title="Reset Zoom to 100%"
              >
                {Math.round(scale * 100)}%
              </button>

              <button
                onClick={handleZoomIn}
                disabled={scale >= 3.5 || loading}
                className="p-1 rounded hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            <div className="h-4 w-px bg-[#444746] hidden sm:block" />

            {/* Fit Width Button */}
            <button
              onClick={handleFitWidth}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                fitMode === 'width'
                  ? 'bg-[#1a73e8] border-[#1a73e8] text-white shadow-xs'
                  : 'bg-[#282a2d] border-[#444746] hover:bg-white/10 text-slate-300 hover:text-white'
              }`}
              title="Fit to Width"
            >
              <Maximize className="w-3.5 h-3.5" />
              <span>Fit Width</span>
            </button>

            {/* Rotate */}
            <button
              onClick={handleRotate}
              className="p-1.5 rounded-md bg-[#282a2d] border border-[#444746] hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer hidden md:inline-flex"
              title="Rotate 90°"
            >
              <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Right: Actions (Fullscreen, Download, Close) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={handlePrint}
              disabled={loading}
              className="hidden lg:inline-flex p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Print"
            >
              <Printer className="w-4 h-4" />
            </button>

            <a
              href={blobPdfUrl || pdfFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Open in new window"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={toggleFullScreen}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer hidden sm:inline-flex"
              title={isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={handleDownloadClick}
              disabled={downloading}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:scale-95 text-white text-xs font-medium shadow-sm transition-all cursor-pointer disabled:opacity-75"
              title="Download PDF"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden xs:inline">Download</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer ml-0.5"
              title="Close (Esc)"
            >
              <X className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </button>
          </div>
        </header>

        {/* ============================================================
            MAIN VIEWER CANVAS AREA (Centered PDF, Smooth Scroll, No Overflow)
        ============================================================ */}
        <main
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 w-full bg-[#202124] overflow-y-auto overflow-x-auto p-2 sm:p-6 md:p-8 flex flex-col items-center select-none"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-x pan-y pinch-zoom',
          }}
        >
          {loading && (
            <div className="flex flex-col items-center justify-center my-auto text-slate-400 gap-3 py-20">
              <Loader2 className="w-8 h-8 text-[#8ab4f8] animate-spin" />
              <p className="text-xs sm:text-sm font-medium text-slate-300 animate-pulse">
                Loading PDF document...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="max-w-md w-full my-auto text-center p-6 bg-[#282a2d] border border-[#3c4043] rounded-xl space-y-4 shadow-xl">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-white">Document Notice</h4>
                <p className="text-xs text-slate-400 mt-1">{error}</p>
              </div>
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleDownloadClick}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF Document</span>
                </button>
              </div>
            </div>
          )}

          {/* Continuous Centered Pages Stack */}
          {!loading && !error && pdfDoc && (
            <div className="flex flex-col items-center gap-4 sm:gap-6 md:gap-8 pb-12 my-auto max-w-full">
              {Array.from({ length: numPages }, (_, idx) => idx + 1).map((pageNum) => {
                const baseDim = basePageDimensions[pageNum] || { width: 612, height: 792 };
                const isRotated = rotation === 90 || rotation === 270;
                const pageWidth = isRotated ? baseDim.height * scale : baseDim.width * scale;
                const pageHeight = isRotated ? baseDim.width * scale : baseDim.height * scale;

                return (
                  <div
                    key={pageNum}
                    ref={(el) => {
                      pageContainerRefs.current[pageNum] = el;
                    }}
                    className="relative flex flex-col items-center mx-auto transition-all duration-75"
                    style={{
                      width: pageWidth ? `${Math.floor(pageWidth)}px` : 'auto',
                      minHeight: pageHeight ? `${Math.floor(pageHeight)}px` : 'auto',
                      maxWidth: '100%',
                    }}
                  >
                    {/* Centered White PDF Sheet with Chrome / Google Drive Box Shadow */}
                    <div className="bg-white rounded-xs sm:rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.6)] ring-1 ring-black/40 overflow-hidden max-w-full">
                      <canvas
                        ref={(el) => {
                          canvasRefs.current[pageNum] = el;
                        }}
                        className="block max-w-full h-auto bg-white"
                      />
                    </div>

                    {numPages > 1 && (
                      <span className="mt-2 text-[10px] sm:text-[11px] font-medium text-slate-400 select-none">
                        Page {pageNum} of {numPages}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
