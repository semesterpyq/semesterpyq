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

interface PageDimension {
  width: number;
  height: number;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ paper, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const canvasRefs = useRef<{ [key: number]: HTMLCanvasElement | null }>({});
  const renderedPagesRef = useRef<Set<number>>(new Set());
  const activeRenderTasks = useRef<{ [key: number]: any }>({});
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [renderScale, setRenderScale] = useState<number>(1.0);
  const [fitMode, setFitMode] = useState<'width' | 'custom'>('width');
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [blobPdfUrl, setBlobPdfUrl] = useState<string | null>(null);
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');
  const [basePageDimensions, setBasePageDimensions] = useState<{ [key: number]: PageDimension }>({});
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const scaleRef = useRef<number>(1.0);
  scaleRef.current = scale;
  const pdfDocRef = useRef<any>(null);
  pdfDocRef.current = pdfDoc;
  const rotationRef = useRef<number>(0);
  rotationRef.current = rotation;
  const renderScaleRef = useRef<number>(1.0);
  renderScaleRef.current = renderScale;

  const anchorRef = useRef<{
    docX: number;
    docY: number;
    viewportX: number;
    viewportY: number;
  } | null>(null);

  // Mouse drag-to-pan state
  const mouseDragRef = useRef<{
    isDown: boolean;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    hasMoved: boolean;
  }>({
    isDown: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
    hasMoved: false,
  });

  // Multi-touch pinch state for mobile / touchscreens
  const touchStateRef = useRef<{
    isPinching: boolean;
    initialDistance: number;
    initialScale: number;
    focalDocX: number;
    focalDocY: number;
    viewportFocalX: number;
    viewportFocalY: number;
  }>({
    isPinching: false,
    initialDistance: 0,
    initialScale: 1.0,
    focalDocX: 0,
    focalDocY: 0,
    viewportFocalX: 0,
    viewportFocalY: 0,
  });

  const pdfFileUrl = paper.file_url || `/api/papers/${paper.id}/file`;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blobPdfUrl) {
        URL.revokeObjectURL(blobPdfUrl);
      }
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      Object.values(activeRenderTasks.current).forEach((task) => {
        try {
          task?.cancel();
        } catch {
          // ignore
        }
      });
    };
  }, [blobPdfUrl]);

  // Compute responsive edge-to-edge fit-to-width scale (increased default page size for mobile)
  const calculateFitWidthScale = useCallback((viewportWidth: number) => {
    if (!containerRef.current || !viewportWidth) return 1.0;
    const containerWidth = containerRef.current.clientWidth;
    const isMobile = window.innerWidth < 640;
    // On mobile, use full edge-to-edge container width with a comfortable reading multiplier
    const availableWidth = isMobile ? containerWidth : Math.max(containerWidth - 12, 200);
    const fitScale = availableWidth / viewportWidth;
    // Ensure on mobile the page text is large and clearly readable by default
    const effectiveScale = isMobile ? Math.max(fitScale, 1.0) : fitScale;
    return Number(effectiveScale.toFixed(2));
  }, []);

  // Debounced High-DPI rasterization on settle to prevent lag while zooming
  const scheduleHighResRender = useCallback((targetScale: number) => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }
    renderTimeoutRef.current = setTimeout(() => {
      setRenderScale(targetScale);
    }, 120);
  }, []);

  // Update zoom with focal anchor to eliminate jumping and distortion
  const setZoomWithAnchor = useCallback(
    (
      newScale: number,
      focalPoint?: { clientX: number; clientY: number },
      mode: 'width' | 'custom' = 'custom'
    ) => {
      const container = containerRef.current;
      const clampedScale = Math.min(Math.max(Number(newScale.toFixed(3)), 0.35), 4.0);

      if (!container || clampedScale === scaleRef.current) {
        setScale(clampedScale);
        setFitMode(mode);
        scheduleHighResRender(clampedScale);
        return;
      }

      const rect = container.getBoundingClientRect();
      const currentScale = scaleRef.current;

      const viewportX = focalPoint
        ? Math.max(0, Math.min(focalPoint.clientX - rect.left, container.clientWidth))
        : container.clientWidth / 2;
      const viewportY = focalPoint
        ? Math.max(0, Math.min(focalPoint.clientY - rect.top, container.clientHeight))
        : container.clientHeight / 2;

      const docX = (container.scrollLeft + viewportX) / currentScale;
      const docY = (container.scrollTop + viewportY) / currentScale;

      anchorRef.current = {
        docX,
        docY,
        viewportX,
        viewportY,
      };

      setFitMode(mode);
      setScale(clampedScale);
      scheduleHighResRender(clampedScale);
    },
    [scheduleHighResRender]
  );

  // Sync scroll positioning synchronously after zoom change without layout flicker
  useLayoutEffect(() => {
    if (anchorRef.current && containerRef.current) {
      const { docX, docY, viewportX, viewportY } = anchorRef.current;
      const container = containerRef.current;
      container.scrollLeft = Math.max(0, docX * scale - viewportX);
      container.scrollTop = Math.max(0, docY * scale - viewportY);
      anchorRef.current = null;
    }
  }, [scale]);

  // Ultra-crisp High-DPI canvas rendering with memory & lag optimization
  const renderSinglePage = useCallback(
    async (pageNum: number, pdf: any, targetScale: number, currentRotation: number) => {
      const canvas = canvasRefs.current[pageNum];
      if (!pdf || !canvas) return;

      // Cancel any ongoing render task for this specific page
      if (activeRenderTasks.current[pageNum]) {
        try {
          activeRenderTasks.current[pageNum].cancel();
        } catch {
          // ignore cancellation
        }
      }

      try {
        const page = await pdf.getPage(pageNum);
        // Smart devicePixelRatio cap to prevent mobile RAM saturation and lag (keeps razor-sharp 2x quality)
        const dpr = window.devicePixelRatio || 1.5;
        const pixelRatio = Math.min(Math.max(dpr, 1.5), 2.0);

        const highResViewport = page.getViewport({
          scale: targetScale * pixelRatio,
          rotation: currentRotation,
        });

        canvas.width = Math.floor(highResViewport.width);
        canvas.height = Math.floor(highResViewport.height);

        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';

        const renderContext = {
          canvasContext: context,
          viewport: highResViewport,
          intent: 'display',
        };

        const renderTask = page.render(renderContext);
        activeRenderTasks.current[pageNum] = renderTask;
        await renderTask.promise;
        renderedPagesRef.current.add(pageNum);
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

  // Load PDF document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);
    setCurrentPage(1);
    renderedPagesRef.current.clear();

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
          standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + pdfjsLib.version + '/standard_fonts/',
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
        setRenderScale(initialScale);
        scaleRef.current = initialScale;
        renderScaleRef.current = initialScale;
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

  // High-performance Lazy Intersection Observer for instant lag-free scrolling
  useEffect(() => {
    if (!pdfDoc || numPages === 0 || loading) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    renderedPagesRef.current.clear();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNumStr = entry.target.getAttribute('data-page-num');
            if (pageNumStr) {
              const p = parseInt(pageNumStr, 10);
              if (p && pdfDocRef.current) {
                renderSinglePage(p, pdfDocRef.current, renderScaleRef.current, rotationRef.current);
              }
            }
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: '350px 0px',
        threshold: 0.01,
      }
    );

    observerRef.current = observer;

    // Observe all page container elements
    for (let p = 1; p <= numPages; p++) {
      const el = pageContainerRefs.current[p];
      if (el) {
        observer.observe(el);
      }
    }

    // Immediately render current and first page
    renderSinglePage(1, pdfDoc, renderScale, rotation);
    if (numPages > 1) {
      renderSinglePage(2, pdfDoc, renderScale, rotation);
    }

    return () => {
      observer.disconnect();
    };
  }, [pdfDoc, numPages, renderScale, rotation, loading, renderSinglePage]);

  // Track active page during scrolling
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
      const targetTop = Math.max(0, targetEl.offsetTop - 8);
      container.scrollTo({
        top: targetTop,
        behavior: 'smooth',
      });
      setCurrentPage(pageNum);
      setJumpPageInput(String(pageNum));
    }
  }, []);

  // Multi-Touch Pinch-to-Zoom on mobile & Touch Panning
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const rect = container.getBoundingClientRect();

        const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const midY = (t1.clientY + t2.clientY) / 2 - rect.top;
        const curScale = scaleRef.current;

        touchStateRef.current = {
          isPinching: true,
          initialDistance: dist,
          initialScale: curScale,
          focalDocX: (container.scrollLeft + midX) / curScale,
          focalDocY: (container.scrollTop + midY) / curScale,
          viewportFocalX: midX,
          viewportFocalY: midY,
        };
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
            4.0
          );

          const { focalDocX, focalDocY, viewportFocalX, viewportFocalY } = touchStateRef.current;

          anchorRef.current = {
            docX: focalDocX,
            docY: focalDocY,
            viewportX: viewportFocalX,
            viewportY: viewportFocalY,
          };

          setScale(targetScale);
          setFitMode('custom');
          scheduleHighResRender(targetScale);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStateRef.current.isPinching && e.touches.length < 2) {
        touchStateRef.current.isPinching = false;
        touchStateRef.current.initialDistance = 0;
        scheduleHighResRender(scaleRef.current);
      }
    };

    // Smooth Desktop Trackpad Pinch / Ctrl+Wheel Zoom
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 0.006);
        const newScale = Math.min(Math.max(scaleRef.current * factor, 0.35), 4.0);
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
  }, [setZoomWithAnchor, scheduleHighResRender]);

  // Desktop Mouse Drag-to-Pan (when zoomed or panning)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;

    mouseDragRef.current = {
      isDown: true,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
      hasMoved: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mouseDragRef.current.isDown || !containerRef.current) return;
    const dx = e.clientX - mouseDragRef.current.startX;
    const dy = e.clientY - mouseDragRef.current.startY;

    if (!mouseDragRef.current.hasMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      mouseDragRef.current.hasMoved = true;
      setIsDragging(true);
    }

    if (mouseDragRef.current.hasMoved) {
      containerRef.current.scrollLeft = mouseDragRef.current.scrollLeft - dx;
      containerRef.current.scrollTop = mouseDragRef.current.scrollTop - dy;
    }
  };

  const handleMouseUpOrLeave = () => {
    if (mouseDragRef.current.isDown) {
      mouseDragRef.current.isDown = false;
      setIsDragging(false);
    }
  };

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (!pdfDoc || fitMode !== 'width') return;
      const firstDim = basePageDimensions[1] || { width: 612, height: 792 };
      const newScale = calculateFitWidthScale(firstDim.width);
      setScale(newScale);
      setRenderScale(newScale);
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

  const handlePrint = () => {
    const targetUrl = blobPdfUrl || pdfFileUrl;
    const printWindow = window.open(targetUrl, '_blank');
    if (printWindow) printWindow.focus();
  };

  return (
    <div
      id="pdf-viewer-root"
      style={{
        width: '100vw',
        height: '100dvh',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        margin: 0,
        padding: 0,
        borderRadius: 0,
        zIndex: 99999,
      }}
      className="bg-[#202124] text-white flex flex-col overflow-hidden select-none m-0 p-0"
    >
      {/* ============================================================
          FIXED GOOGLE DRIVE / CHROME STYLE TOP TOOLBAR
      ============================================================ */}
      <header
        style={{
          paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
          paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))',
        }}
        className="w-full flex items-center justify-between px-2 sm:px-4 pb-2 bg-[#323639] border-b border-[#444746] text-white shrink-0 gap-1.5 sm:gap-2 z-50 shadow-md transition-all"
      >
        {/* Left: Document Info & Back */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 max-w-[40%] sm:max-w-none">
          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Close (Esc)"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-xs bg-[#ea4335] flex items-center justify-center shrink-0 shadow-xs">
            <span className="text-white font-black text-[8px] sm:text-[10px] tracking-wider">PDF</span>
          </div>

          <div className="min-w-0 truncate">
            <h2 className="font-medium text-xs sm:text-sm truncate text-slate-100 leading-tight">
              {paper.title}
            </h2>
            <div className="hidden xs:flex items-center gap-1 text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
              <span className="truncate">
                {paper.subject_name || paper.course_name || 'Question Paper'}
              </span>
              <span>•</span>
              <span className="text-[#8ab4f8] font-medium shrink-0">
                {paper.paper_year || paper.exam_year || 2024}
              </span>
            </div>
          </div>
        </div>

        {/* Center / Controls: Page Navigation & Zoom Tools */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Page Navigation */}
          <div className="flex items-center bg-[#282a2d] px-0.5 sm:px-1 py-0.5 rounded-md border border-[#444746]">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || loading}
              className="p-0.5 sm:p-1 rounded hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Previous Page (←)"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <form onSubmit={handlePageJumpSubmit} className="flex items-center px-0.5">
              <input
                type="text"
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                onBlur={handlePageJumpSubmit}
                disabled={numPages <= 1 || loading}
                className="w-4 sm:w-7 py-0 text-center text-[11px] sm:text-xs font-medium bg-transparent text-white border-none focus:ring-1 focus:ring-[#8ab4f8] focus:bg-[#18191a] rounded focus:outline-hidden"
              />
              <span className="text-[10px] sm:text-xs text-slate-400 font-normal select-none">
                /{numPages || 1}
              </span>
            </form>

            <button
              onClick={handleNextPage}
              disabled={currentPage >= numPages || loading}
              className="p-0.5 sm:p-1 rounded hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Next Page (→)"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          <div className="h-3.5 w-px bg-[#444746] hidden xs:block" />

          {/* Zoom Controls */}
          <div className="flex items-center bg-[#282a2d] px-0.5 sm:px-1 py-0.5 rounded-md border border-[#444746]">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.35 || loading}
              className="p-0.5 sm:p-1 rounded hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>

            <button
              onClick={handleResetZoom100}
              className="px-1 sm:px-1.5 py-0.5 rounded hover:bg-white/10 text-[10px] sm:text-xs font-mono font-medium text-slate-200 hover:text-white transition-colors cursor-pointer"
              title="Reset Zoom to 100%"
            >
              {Math.round(scale * 100)}%
            </button>

            <button
              onClick={handleZoomIn}
              disabled={scale >= 4.0 || loading}
              className="p-0.5 sm:p-1 rounded hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>

          <div className="h-3.5 w-px bg-[#444746] hidden sm:block" />

          {/* Fit Width Button */}
          <button
            onClick={handleFitWidth}
            className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
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
            className="p-1 rounded-md bg-[#282a2d] border border-[#444746] hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer hidden md:inline-flex"
            title="Rotate 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Actions (Download, Print, Close) */}
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
            onClick={handleDownloadClick}
            disabled={downloading}
            className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:scale-95 text-white text-[11px] sm:text-xs font-medium shadow-sm transition-all cursor-pointer disabled:opacity-75"
            title="Download PDF"
          >
            {downloading ? (
              <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
            ) : (
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            )}
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* ============================================================
          MAIN VIEWER CANVAS AREA (Lag-free 60fps scrolling & large mobile view)
      ============================================================ */}
      <main
        ref={containerRef}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className={`w-full flex-1 bg-[#202124] overflow-y-auto overflow-x-auto p-0 m-0 flex flex-col items-center select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-default'
        }`}
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
              Loading high-resolution PDF...
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

        {/* Continuous High-DPI Centered Pages Stack */}
        {!loading && !error && pdfDoc && (
          <div className="w-full min-w-fit flex flex-col items-center gap-3 sm:gap-4 py-2 sm:py-4 m-0 px-0 sm:px-1">
            {Array.from({ length: numPages }, (_, idx) => idx + 1).map((pageNum) => {
              const baseDim = basePageDimensions[pageNum] || { width: 612, height: 792 };
              const isRotated = rotation === 90 || rotation === 270;
              const displayWidth = isRotated ? baseDim.height * scale : baseDim.width * scale;
              const displayHeight = isRotated ? baseDim.width * scale : baseDim.height * scale;

              return (
                <div
                  key={pageNum}
                  data-page-num={pageNum}
                  ref={(el) => {
                    pageContainerRefs.current[pageNum] = el;
                  }}
                  className="relative flex flex-col items-center mx-auto shrink-0"
                  style={{
                    width: `${Math.floor(displayWidth)}px`,
                    minHeight: `${Math.floor(displayHeight)}px`,
                  }}
                >
                  {/* Razor-sharp High-DPI PDF Canvas with strictly preserved aspect ratio */}
                  <div
                    className="bg-white shadow-[0_2px_12px_rgba(0,0,0,0.5)] overflow-hidden"
                    style={{
                      width: `${Math.floor(displayWidth)}px`,
                      height: `${Math.floor(displayHeight)}px`,
                    }}
                  >
                    <canvas
                      ref={(el) => {
                        canvasRefs.current[pageNum] = el;
                      }}
                      className="block w-full h-full bg-white object-contain"
                      style={{
                        imageRendering: '-webkit-optimize-contrast',
                      }}
                    />
                  </div>

                  {numPages > 1 && (
                    <span className="mt-1 text-[10px] sm:text-[11px] font-medium text-slate-400 select-none">
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
  );
};
