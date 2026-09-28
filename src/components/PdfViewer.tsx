import React, { useEffect, useRef, useState, useCallback, useLayoutEffect, useMemo } from 'react';
import { pdfjsLib } from '../utils/pdfViewer';
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
  AlertCircle,
  Loader2,
  Printer,
  Maximize,
} from 'lucide-react';
import { isPdfByteArray } from '../utils/clientPdfGenerator';
import { parsePdfUrl } from '../utils/pdfUrlHelper';

interface PdfViewerProps {
  url?: string;
  title?: string;
  downloadUrl?: string;
  downloadFilename?: string;
  className?: string;
  minHeight?: string;
  showDownloadButton?: boolean;
}

interface PageDimension {
  width: number;
  height: number;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  url,
  title = 'Examination Question Paper',
  downloadUrl,
  downloadFilename,
  className = '',
  minHeight = '620px',
  showDownloadButton = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const pageContainerRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const canvasRefs = useRef<{ [key: number]: HTMLCanvasElement | null }>({});
  const textLayerRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const renderedPagesRef = useRef<Set<number>>(new Set());
  const activeRenderTasks = useRef<{ [key: number]: any }>({});
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pillTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastWidthRef = useRef<number>(typeof window !== 'undefined' ? window.innerWidth : 0);
  const scrollRafRef = useRef<number | null>(null);
  const isRenderingRef = useRef<boolean>(false);
  const renderQueueRef = useRef<number[]>([]);
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [renderScale, setRenderScale] = useState(1.0);
  const [fitMode, setFitMode] = useState<'width' | 'custom'>('width');
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [generatedBlobUrl, setGeneratedBlobUrl] = useState<string | null>(null);
  const [jumpPageInput, setJumpPageInput] = useState('1');
  const [basePageDimensions, setBasePageDimensions] = useState<{ [key: number]: PageDimension }>({});
  const [showPagePill, setShowPagePill] = useState<boolean>(true);

  const parsedPdfInfo = useMemo(() => parsePdfUrl(url), [url]);

  const scaleRef = useRef<number>(1.0);
  scaleRef.current = scale;
  const currentPageRef = useRef<number>(1);
  currentPageRef.current = currentPage;
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

  // Multi-touch pinch state
  const touchStateRef = useRef<{
    isPinching: boolean;
    initialDistance: number;
    initialScale: number;
    currentPinchScale: number;
    focalDocX: number;
    focalDocY: number;
    viewportFocalX: number;
    viewportFocalY: number;
    pinchRafId: number | null;
  }>({
    isPinching: false,
    initialDistance: 0,
    initialScale: 1.0,
    currentPinchScale: 1.0,
    focalDocX: 0,
    focalDocY: 0,
    viewportFocalX: 0,
    viewportFocalY: 0,
    pinchRafId: null,
  });

  // Calculate Fit to Width
  const calculateFitWidthScale = useCallback((pageWidth: number) => {
    if (!containerRef.current || !pageWidth) return 1.0;
    const containerWidth = containerRef.current.clientWidth || window.innerWidth;
    const isMobile = window.innerWidth < 640;
    const paddingOffset = isMobile ? 0 : 24;
    const availableWidth = Math.max(containerWidth - paddingOffset, 200);
    const fitScale = availableWidth / pageWidth;
    return Number(fitScale.toFixed(3));
  }, []);

  // Debounce high-res render on zoom settle
  const scheduleHighResRender = useCallback((targetScale: number) => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }
    renderTimeoutRef.current = setTimeout(() => {
      setRenderScale(targetScale);
    }, 100);
  }, []);

  // Set zoom maintaining anchor
  const setZoomWithAnchor = useCallback(
    (
      newScale: number,
      focalPoint?: { clientX: number; clientY: number },
      mode: 'width' | 'custom' = 'custom'
    ) => {
      const container = containerRef.current;
      const clampedScale = Math.min(Math.max(Number(newScale.toFixed(3)), 0.4), 4.0);

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

  useLayoutEffect(() => {
    if (anchorRef.current && containerRef.current) {
      const { docX, docY, viewportX, viewportY } = anchorRef.current;
      const container = containerRef.current;
      container.scrollLeft = Math.max(0, docX * scale - viewportX);
      container.scrollTop = Math.max(0, docY * scale - viewportY);
      anchorRef.current = null;
    }
  }, [scale]);

  // Render Page with Canvas and Searchable TextLayer
  const renderSinglePage = useCallback(
    async (pageNum: number, pdf: any, targetScale: number, currentRotation: number) => {
      const canvas = canvasRefs.current[pageNum];
      const textLayerDiv = textLayerRefs.current[pageNum];
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
        const isMobile = window.innerWidth < 640;
        const dpr = window.devicePixelRatio || 1;
        const maxDprCap = isMobile ? 1.6 : 2.0;
        const effectiveDpr = Math.min(dpr, maxDprCap);

        const viewport = page.getViewport({
          scale: targetScale * effectiveDpr,
          rotation: currentRotation,
        });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          intent: 'display',
        };

        const renderTask = page.render(renderContext);
        activeRenderTasks.current[pageNum] = renderTask;
        await renderTask.promise;
        renderedPagesRef.current.add(pageNum);

        // Searchable textLayer
        if (textLayerDiv) {
          textLayerDiv.innerHTML = '';
          const cssViewport = page.getViewport({
            scale: targetScale,
            rotation: currentRotation,
          });

          try {
            const textContent = await page.getTextContent();
            if (pdfjsLib.TextLayer) {
              const textLayer = new pdfjsLib.TextLayer({
                textContentSource: textContent,
                container: textLayerDiv,
                viewport: cssViewport,
              });
              await textLayer.render();
            }
          } catch (textErr) {
            console.debug('TextLayer render note:', textErr);
          }
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`[PdfViewer] Canvas error for page ${pageNum}:`, err);
        }
      } finally {
        activeRenderTasks.current[pageNum] = null;
      }
    },
    []
  );

  const processRenderQueue = useCallback(async () => {
    if (isRenderingRef.current) return;
    if (renderQueueRef.current.length === 0) return;

    isRenderingRef.current = true;
    while (renderQueueRef.current.length > 0) {
      const nextPageNum = renderQueueRef.current.shift();
      if (nextPageNum && pdfDocRef.current) {
        await renderSinglePage(
          nextPageNum,
          pdfDocRef.current,
          renderScaleRef.current,
          rotationRef.current
        );
      }
    }
    isRenderingRef.current = false;
  }, [renderSinglePage]);

  const enqueuePageRender = useCallback(
    (pageNum: number) => {
      if (!renderQueueRef.current.includes(pageNum)) {
        renderQueueRef.current.push(pageNum);
      }
      processRenderQueue();
    },
    [processRenderQueue]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (generatedBlobUrl) URL.revokeObjectURL(generatedBlobUrl);
      if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
      if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      if (touchStateRef.current.pinchRafId) cancelAnimationFrame(touchStateRef.current.pinchRafId);
      if (observerRef.current) observerRef.current.disconnect();
      renderQueueRef.current = [];
      Object.values(activeRenderTasks.current).forEach((task) => {
        try {
          task?.cancel();
        } catch {
          // ignore
        }
      });
    };
  }, [generatedBlobUrl]);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);
    setCurrentPage(1);
    currentPageRef.current = 1;
    renderedPagesRef.current.clear();
    renderQueueRef.current = [];

    const loadDocument = async () => {
      if (!url) {
        setError('No question paper PDF file provided');
        setLoading(false);
        return;
      }

      let pdfBytes: Uint8Array | null = null;

      if (url.startsWith('data:')) {
        try {
          const parts = url.split(',');
          const base64Data = (parts[1] || parts[0]).trim().replace(/[\s\r\n]/g, '');
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

      if (!pdfBytes && (url.startsWith('http') || url.startsWith('/') || url.startsWith('blob:'))) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.arrayBuffer();
            const uint8 = new Uint8Array(data);
            if (isPdfByteArray(uint8)) {
              pdfBytes = uint8;
            }
          }
        } catch (fetchErr) {
          console.warn('[PdfViewer] Direct fetch note:', fetchErr);
        }
      }

      if (isCancelled) return;

      if (!pdfBytes && parsedPdfInfo.isGoogleDrive) {
        setLoading(false);
        return;
      }

      try {
        const cMapUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/cmaps/`;
        const standardFontDataUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/standard_fonts/`;

        const docInitParams: any = pdfBytes
          ? { data: pdfBytes, cMapUrl, cMapPacked: true, standardFontDataUrl }
          : { url, cMapUrl, cMapPacked: true, standardFontDataUrl };

        const loadingTask = pdfjsLib.getDocument(docInitParams);
        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
        setJumpPageInput('1');

        const dims: { [key: number]: PageDimension } = {};
        for (let i = 1; i <= doc.numPages; i++) {
          const p = await doc.getPage(i);
          const vp = p.getViewport({ scale: 1.0, rotation: 0 });
          dims[i] = { width: vp.width, height: vp.height };
        }
        setBasePageDimensions(dims);

        const firstDim = dims[1] || { width: 612, height: 792 };
        const initialScale = calculateFitWidthScale(firstDim.width);
        setScale(initialScale);
        setRenderScale(initialScale);
        scaleRef.current = initialScale;
        renderScaleRef.current = initialScale;
        setLoading(false);
      } catch (err: any) {
        console.error('[PdfViewer] Error loading PDF:', err);
        if (!isCancelled) {
          setError('Unable to load original PDF');
          setLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      isCancelled = true;
    };
  }, [url, calculateFitWidthScale]);

  // Observer for Lazy Rendering
  useEffect(() => {
    if (!pdfDoc || totalPages === 0 || loading) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    renderedPagesRef.current.clear();
    renderQueueRef.current = [];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNumStr = entry.target.getAttribute('data-page-num');
            if (pageNumStr) {
              const p = parseInt(pageNumStr, 10);
              if (p && pdfDocRef.current) {
                enqueuePageRender(p);
              }
            }
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: '400px 0px',
        threshold: 0.01,
      }
    );

    observerRef.current = observer;

    for (let p = 1; p <= totalPages; p++) {
      const el = pageContainerRefs.current[p];
      if (el) observer.observe(el);
    }

    enqueuePageRender(1);
    if (totalPages > 1) enqueuePageRender(2);

    return () => {
      observer.disconnect();
    };
  }, [pdfDoc, totalPages, renderScale, rotation, loading, enqueuePageRender]);

  // Page Position calculation
  const pagePositions = useMemo(() => {
    const positions: { top: number; bottom: number; height: number }[] = [];
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 640 : true;
    const gap = isMobile ? 8 : 16;
    const topPadding = isMobile ? 8 : 16;
    let currentTop = topPadding;

    for (let p = 1; p <= totalPages; p++) {
      const baseDim = basePageDimensions[p] || { width: 612, height: 792 };
      const isRotated = rotation === 90 || rotation === 270;
      const displayHeight = Math.floor((isRotated ? baseDim.width : baseDim.height) * scale);
      positions[p] = {
        top: currentTop,
        bottom: currentTop + displayHeight,
        height: displayHeight,
      };
      currentTop += displayHeight + gap;
    }
    return positions;
  }, [totalPages, basePageDimensions, scale, rotation]);

  // Scroll tracking
  const handleScroll = useCallback(() => {
    if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
    setShowPagePill(true);
    pillTimerRef.current = setTimeout(() => {
      setShowPagePill(false);
    }, 2500);

    if (scrollRafRef.current) return;

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const container = containerRef.current;
      if (!container || totalPages <= 1 || pagePositions.length === 0) return;

      const containerTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const viewCenter = containerTop + containerHeight * 0.4;

      let bestPage = 1;
      let minDistance = Infinity;

      for (let p = 1; p <= totalPages; p++) {
        const pos = pagePositions[p];
        if (pos) {
          if (viewCenter >= pos.top && viewCenter <= pos.bottom) {
            bestPage = p;
            break;
          }
          const distance = Math.abs(pos.top - viewCenter);
          if (distance < minDistance) {
            minDistance = distance;
            bestPage = p;
          }
        }
      }

      if (bestPage !== currentPageRef.current) {
        currentPageRef.current = bestPage;
        setCurrentPage(bestPage);
        setJumpPageInput(String(bestPage));
      }
    });
  }, [totalPages, pagePositions]);

  const scrollToPage = useCallback((pageNum: number) => {
    const container = containerRef.current;
    const targetEl = pageContainerRefs.current[pageNum];
    if (container && targetEl) {
      const targetTop = Math.max(0, targetEl.offsetTop - 8);
      container.scrollTo({
        top: targetTop,
        behavior: 'smooth',
      });
      currentPageRef.current = pageNum;
      setCurrentPage(pageNum);
      setJumpPageInput(String(pageNum));
    }
  }, []);

  // Multi-Touch Pinch & Double-Tap
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const now = Date.now();
        const timeDiff = now - lastTapRef.current.time;
        const distDiff = Math.hypot(
          touch.clientX - lastTapRef.current.x,
          touch.clientY - lastTapRef.current.y
        );

        if (timeDiff < 300 && distDiff < 25) {
          e.preventDefault();
          lastTapRef.current = { time: 0, x: 0, y: 0 };

          const firstDim = basePageDimensions[1] || { width: 612, height: 792 };
          const fitScale = calculateFitWidthScale(firstDim.width);

          if (Math.abs(scaleRef.current - fitScale) < 0.1) {
            setZoomWithAnchor(2.0, { clientX: touch.clientX, clientY: touch.clientY });
          } else {
            setZoomWithAnchor(fitScale, undefined, 'width');
          }
          return;
        }

        lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };
      } else if (e.touches.length === 2) {
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
          currentPinchScale: curScale,
          focalDocX: (container.scrollLeft + midX) / curScale,
          focalDocY: (container.scrollTop + midY) / curScale,
          viewportFocalX: midX,
          viewportFocalY: midY,
          pinchRafId: null,
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
            Math.max(touchStateRef.current.initialScale * ratio, 0.4),
            4.0
          );
          touchStateRef.current.currentPinchScale = targetScale;

          if (!touchStateRef.current.pinchRafId) {
            touchStateRef.current.pinchRafId = requestAnimationFrame(() => {
              touchStateRef.current.pinchRafId = null;
              if (!touchStateRef.current.isPinching) return;

              const { focalDocX, focalDocY, viewportFocalX, viewportFocalY, currentPinchScale } =
                touchStateRef.current;

              anchorRef.current = {
                docX: focalDocX,
                docY: focalDocY,
                viewportX: viewportFocalX,
                viewportY: viewportFocalY,
              };

              setScale(currentPinchScale);
              setFitMode('custom');
            });
          }
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStateRef.current.isPinching && e.touches.length < 2) {
        touchStateRef.current.isPinching = false;
        touchStateRef.current.initialDistance = 0;
        if (touchStateRef.current.pinchRafId) {
          cancelAnimationFrame(touchStateRef.current.pinchRafId);
          touchStateRef.current.pinchRafId = null;
        }
        scheduleHighResRender(scaleRef.current);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 0.006);
        const newScale = Math.min(Math.max(scaleRef.current * factor, 0.4), 4.0);
        setZoomWithAnchor(newScale, { clientX: e.clientX, clientY: e.clientY });
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [setZoomWithAnchor, scheduleHighResRender, calculateFitWidthScale, basePageDimensions]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      if (Math.abs(currentWidth - lastWidthRef.current) > 15) {
        lastWidthRef.current = currentWidth;
        if (!pdfDoc || fitMode !== 'width') return;
        const firstDim = basePageDimensions[1] || { width: 612, height: 792 };
        const newScale = calculateFitWidthScale(firstDim.width);
        setScale(newScale);
        setRenderScale(newScale);
        scaleRef.current = newScale;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDoc, fitMode, basePageDimensions, calculateFitWidthScale]);

  // Actions
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

  const toggleFullScreen = () => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen?.().catch(() => {});
      setIsFullScreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullScreen(false);
    }
  };

  const handleDownload = () => {
    const targetUrl = downloadUrl || url;
    if (!targetUrl) return;
    const link = document.createElement('a');
    link.href = targetUrl;
    link.download = downloadFilename || 'question-paper.pdf';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
    }, 1000);
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative flex flex-col bg-[#F3F4F6] text-slate-800 rounded-xl overflow-hidden border border-slate-200 shadow-sm ${className}`}
      style={{ minHeight }}
    >
      {/* Top Header Bar */}
      <div className="h-12 bg-white border-b border-slate-200 px-3 flex items-center justify-between z-20 shrink-0 select-none">
        <div className="min-w-0 pr-2">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate font-serif">
            {title}
          </h3>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.4}
              className="p-1 rounded hover:bg-white text-slate-700 disabled:opacity-30 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom100}
              className="px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-white rounded cursor-pointer"
              title="Reset 100%"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={scale >= 4.0}
              className="p-1 rounded hover:bg-white text-slate-700 disabled:opacity-30 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-slate-300 mx-0.5" />
            <button
              onClick={handleFitWidth}
              className={`p-1 rounded text-slate-700 cursor-pointer ${
                fitMode === 'width' ? 'bg-white text-blue-600 shadow-2xs font-semibold' : 'hover:bg-white'
              }`}
              title="Fit to Width"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRotate}
              className="p-1 rounded hover:bg-white text-slate-700 cursor-pointer"
              title="Rotate (90°)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {showDownloadButton && (
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer shadow-xs"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}

          <button
            onClick={toggleFullScreen}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`relative flex-1 bg-[#F3F4F6] ${
          fitMode === 'width' || scale <= 1.05 ? 'overflow-x-hidden' : 'overflow-x-auto'
        } overflow-y-auto p-0 m-0 select-none block`}
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: fitMode === 'width' || scale <= 1.05 ? 'pan-y pinch-zoom' : 'pan-x pan-y pinch-zoom',
          transform: 'translateZ(0)',
        }}
      >
        {/* Floating Page indicator */}
        {!loading && !error && totalPages > 0 && (
          <div
            className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 transition-opacity duration-300 ${
              showPagePill ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="bg-slate-900/85 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg border border-white/15 flex items-center gap-1.5">
              <button
                onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="p-0.5 rounded hover:bg-white/20 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => scrollToPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="p-0.5 rounded hover:bg-white/20 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-500 gap-3 py-16">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            <p className="text-xs font-medium text-slate-600">Loading document...</p>
          </div>
        )}

        {error && !loading && (
          <div className="max-w-md w-full mx-auto my-8 text-center p-6 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 font-serif">Notice</h4>
              <p className="text-xs text-slate-500 mt-0.5">{error}</p>
            </div>
            {showDownloadButton && (
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Document</span>
              </button>
            )}
          </div>
        )}

        {/* Continuous Page Stack */}
        {!loading && !error && pdfDoc && (
          <div
            ref={contentWrapperRef}
            className="min-w-full inline-flex flex-col items-center gap-2 sm:gap-4 py-2 sm:py-4 px-0 sm:px-2"
          >
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => {
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
                    contain: 'layout style paint',
                    transform: 'translateZ(0)',
                  }}
                >
                  <div
                    className="relative bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] sm:shadow-[0_4px_14px_rgba(0,0,0,0.09)] overflow-hidden"
                    style={{
                      width: `${Math.floor(displayWidth)}px`,
                      height: `${Math.floor(displayHeight)}px`,
                    }}
                  >
                    <canvas
                      ref={(el) => {
                        canvasRefs.current[pageNum] = el;
                      }}
                      className="block w-full h-full bg-white object-contain pointer-events-none"
                      style={{
                        imageRendering: '-webkit-optimize-contrast',
                      }}
                    />
                    <div
                      ref={(el) => {
                        textLayerRefs.current[pageNum] = el;
                      }}
                      className="textLayer"
                      style={{
                        width: `${Math.floor(displayWidth)}px`,
                        height: `${Math.floor(displayHeight)}px`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
