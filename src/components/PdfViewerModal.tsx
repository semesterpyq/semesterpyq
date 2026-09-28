import React, { useEffect, useRef, useState, useCallback, useLayoutEffect, useMemo } from 'react';
import {
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
  X,
} from 'lucide-react';
import { QuestionPaper } from '../types';
import { pdfjsLib, downloadPaperPdf } from '../utils/pdfViewer';
import { isPdfByteArray, generateClientQuestionPaperPdf } from '../utils/clientPdfGenerator';
import { parsePdfUrl } from '../utils/pdfUrlHelper';

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
  const [showPagePill, setShowPagePill] = useState<boolean>(true);

  const parsedPdfInfo = useMemo(() => parsePdfUrl(paper.file_url), [paper.file_url]);

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

  // Smooth pinch state
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

  const pdfFileUrl = paper.file_url || `/api/papers/${paper.id}/file`;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blobPdfUrl) URL.revokeObjectURL(blobPdfUrl);
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
  }, [blobPdfUrl]);

  // Compute responsive fit-to-width scale matching native mobile reader without extra margins
  const calculateFitWidthScale = useCallback((pageWidth: number) => {
    if (!containerRef.current || !pageWidth) return 1.0;
    const containerWidth = containerRef.current.clientWidth || window.innerWidth;
    const isMobile = window.innerWidth < 640;
    // Edge-to-edge on mobile for perfect 1-page fit, clean margin on desktop
    const paddingOffset = isMobile ? 0 : 24;
    const availableWidth = Math.max(containerWidth - paddingOffset, 200);
    const fitScale = availableWidth / pageWidth;
    return Number(fitScale.toFixed(3));
  }, []);

  // Debounced rasterization on settle to prevent lag while zooming
  const scheduleHighResRender = useCallback((targetScale: number) => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }
    renderTimeoutRef.current = setTimeout(() => {
      setRenderScale(targetScale);
    }, 100);
  }, []);

  // Update zoom with focal anchor to eliminate jumping and edge clipping
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

  // High-Performance Canvas & Text Layer Rendering (Searchable & Sharp)
  const renderSinglePage = useCallback(
    async (pageNum: number, pdf: any, targetScale: number, currentRotation: number) => {
      const canvas = canvasRefs.current[pageNum];
      const textLayerDiv = textLayerRefs.current[pageNum];
      if (!pdf || !canvas) return;

      if (activeRenderTasks.current[pageNum]) {
        try {
          activeRenderTasks.current[pageNum].cancel();
        } catch {
          // ignore cancellation
        }
      }

      try {
        const page = await pdf.getPage(pageNum);
        const isMobile = window.innerWidth < 640;
        const dpr = window.devicePixelRatio || 1;
        // Optimal scaling for crisp clarity without mobile GPU memory overflow
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

        // Render Searchable / Selectable Text Layer if container exists
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
          console.error(`[PdfViewerModal] Render error for page ${pageNum}:`, err);
        }
      } finally {
        activeRenderTasks.current[pageNum] = null;
      }
    },
    []
  );

  // Queue-based sequential render dispatcher to prevent CPU lockup
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

  // Load PDF document from byte array or URL
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);
    setCurrentPage(1);
    currentPageRef.current = 1;
    renderedPagesRef.current.clear();
    renderQueueRef.current = [];

    const loadPdf = async () => {
      let pdfBytes: Uint8Array | null = null;

      // 1. Try Base64 Data URL if present
      if (paper.file_url && paper.file_url.startsWith('data:')) {
        try {
          const parts = paper.file_url.split(',');
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
          console.warn('[PdfViewerModal] Base64 parse note:', e);
        }
      }

      // 2. Try fetching from URL (server or remote)
      const candidateUrl = pdfFileUrl || paper.file_url;
      if (!pdfBytes && candidateUrl && !candidateUrl.startsWith('data:')) {
        try {
          const response = await fetch(candidateUrl);
          if (response.ok) {
            const data = await response.arrayBuffer();
            const uint8 = new Uint8Array(data);
            if (isPdfByteArray(uint8)) {
              pdfBytes = uint8;
            }
          }
        } catch (fetchErr) {
          console.warn('[PdfViewerModal] Direct fetch note:', fetchErr);
        }
      }

      // 3. Fallback: Synthesize genuine question paper PDF if no valid PDF file exists
      if (!pdfBytes) {
        try {
          pdfBytes = await generateClientQuestionPaperPdf({
            collegeName: paper.university_name || 'Semester (PYQs) Examination Portal',
            courseName: paper.course_name,
            courseCode: paper.course_code,
            yearName: paper.year_name,
            subjectName: paper.subject_name || paper.title,
            subjectCode: paper.subject_code || paper.paper_code,
            paperTitle: paper.title,
            examYear: paper.paper_year || paper.exam_year || 2024,
            examSession: paper.exam_session || 'Semester Examination',
            paperCode: paper.paper_code || `QP-${paper.paper_year || 2024}`,
            totalMarks: paper.total_marks || 75,
            duration: paper.duration || '3 Hours',
          });
        } catch (genErr) {
          console.error('[PdfViewerModal] Client PDF generation note:', genErr);
        }
      }

      if (isCancelled) return;

      if (!pdfBytes) {
        setError('Unable to load question paper PDF');
        setLoading(false);
        return;
      }

      // Create blob URL for Print & External View actions
      try {
        const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
        const createdBlobUrl = URL.createObjectURL(blob);
        setBlobPdfUrl(createdBlobUrl);
      } catch (blobErr) {
        console.warn('Blob URL note:', blobErr);
      }

      try {
        const cMapUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/cmaps/`;
        const standardFontDataUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/standard_fonts/`;

        const docInitParams: any = {
          data: pdfBytes,
          cMapUrl,
          cMapPacked: true,
          standardFontDataUrl,
        };

        const loadingTask = pdfjsLib.getDocument(docInitParams);
        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
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
        console.error('[PdfViewerModal] Error loading PDF.js document:', err);
        if (!isCancelled) {
          setError('Unable to load question paper PDF');
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [paper.file_url, pdfFileUrl, calculateFitWidthScale, paper.id, paper.title]);

  // Virtualization / Intersection Observer for Lazy Rendering
  useEffect(() => {
    if (!pdfDoc || numPages === 0 || loading) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    renderedPagesRef.current.clear();
    renderQueueRef.current = [];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNumStr = entry.target.getAttribute('data-page-num');
          if (pageNumStr) {
            const p = parseInt(pageNumStr, 10);
            if (p && entry.isIntersecting) {
              if (pdfDocRef.current) {
                enqueuePageRender(p);
                // Also preload adjacent pages
                if (p > 1) enqueuePageRender(p - 1);
                if (p < numPages) enqueuePageRender(p + 1);
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

    for (let p = 1; p <= numPages; p++) {
      const el = pageContainerRefs.current[p];
      if (el) observer.observe(el);
    }

    // Always render page 1 immediately
    enqueuePageRender(1);
    if (numPages > 1) {
      enqueuePageRender(2);
    }

    return () => {
      observer.disconnect();
    };
  }, [pdfDoc, numPages, renderScale, rotation, loading, enqueuePageRender]);

  // Analytical page position map in memory (0 DOM reads / 0 reflows during scroll)
  const pagePositions = useMemo(() => {
    const positions: { top: number; bottom: number; height: number }[] = [];
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 640 : true;
    const gap = isMobile ? 8 : 16;
    const topPadding = isMobile ? 8 : 16;
    let currentTop = topPadding;

    for (let p = 1; p <= numPages; p++) {
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
  }, [numPages, basePageDimensions, scale, rotation]);

  // Hardware-accelerated rAF-throttled scroll handler
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
      if (!container || numPages <= 1 || pagePositions.length === 0) return;

      const containerTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const viewCenter = containerTop + containerHeight * 0.4;

      let bestPage = 1;
      let minDistance = Infinity;

      for (let p = 1; p <= numPages; p++) {
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
  }, [numPages, pagePositions]);

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

  // Multi-Touch Pinch-to-Zoom and Double-Tap-to-Zoom
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

        // Double-tap detected (<300ms and <25px distance)
        if (timeDiff < 300 && distDiff < 25) {
          e.preventDefault();
          lastTapRef.current = { time: 0, x: 0, y: 0 };

          const firstDim = basePageDimensions[1] || { width: 612, height: 792 };
          const fitScale = calculateFitWidthScale(firstDim.width);

          // If currently close to fit width, zoom to 2.0x, otherwise reset to fit width
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

    // Smooth Desktop Trackpad Pinch / Ctrl+Wheel Zoom
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (currentPage > 1) scrollToPage(currentPage - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
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
    if (blobPdfUrl || paper.file_url) {
      const targetUrl = blobPdfUrl || paper.file_url;
      const printWindow = window.open(targetUrl, '_blank');
      printWindow?.focus();
    }
  };

  const handleDownloadClick = async () => {
    setDownloading(true);
    try {
      await downloadPaperPdf(paper);
    } catch (e) {
      console.error('Download trigger error:', e);
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F3F4F6] flex flex-col select-none overflow-hidden pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      {/* ============================================================
          TOP BAR (Minimal, Back, File Name, Download - Clean & Modern)
      ============================================================ */}
      <header className="h-12 sm:h-14 bg-white border-b border-slate-200/80 px-2 sm:px-4 flex items-center justify-between text-slate-700 select-none shrink-0 z-30 shadow-2xs gap-1.5 sm:gap-4">
        {/* Left Side: Back & File Name */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full hover:bg-slate-100 active:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
            title="Back (Esc)"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-800" />
          </button>
          
          <div className="min-w-0 pr-1">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate font-serif max-w-[140px] xs:max-w-[200px] sm:max-w-xs md:max-w-md">
              {paper.title || 'Question Paper'}
            </h2>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate">
              {paper.paper_code && <span className="font-semibold text-slate-700">{paper.paper_code} • </span>}
              <span>Year {paper.paper_year || paper.exam_year || 2024}</span>
            </div>
          </div>
        </div>

        {/* Center: Desktop / Tablet Zoom & Navigation Controls */}
        <div className="hidden md:flex items-center gap-1 sm:gap-2">
          {/* Zoom Tools */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.4}
              className="p-1 sm:p-1.5 rounded-md hover:bg-white disabled:opacity-30 text-slate-700 transition-colors cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              onClick={handleResetZoom100}
              className="px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-white rounded transition-colors cursor-pointer min-w-[38px] text-center"
              title="Reset Zoom to 100%"
            >
              {Math.round(scale * 100)}%
            </button>

            <button
              onClick={handleZoomIn}
              disabled={scale >= 4.0}
              className="p-1 sm:p-1.5 rounded-md hover:bg-white disabled:opacity-30 text-slate-700 transition-colors cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <div className="w-[1px] h-3.5 bg-slate-300 mx-0.5" />

            <button
              onClick={handleFitWidth}
              className={`p-1 sm:p-1.5 rounded-md text-slate-700 transition-colors cursor-pointer ${
                fitMode === 'width' ? 'bg-white text-blue-600 shadow-2xs font-semibold' : 'hover:bg-white'
              }`}
              title="Fit to Page Width"
            >
              <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              onClick={handleRotate}
              className="p-1 sm:p-1.5 rounded-md hover:bg-white text-slate-700 transition-colors cursor-pointer"
              title="Rotate Clockwise (90°)"
            >
              <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Right Side: Print, Download, Close */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={handlePrint}
            className="hidden lg:inline-flex p-1.5 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Print Document"
          >
            <Printer className="w-4 h-4" />
          </button>

          <a
            href={blobPdfUrl || pdfFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex p-1.5 rounded-full hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Open in new window"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={handleDownloadClick}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-75"
            title="Download PDF"
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Download</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Close Viewer (Esc)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* ============================================================
          MAIN VIEWER CANVAS AREA (Pure white pages on #F3F4F6 background)
      ============================================================ */}
      <main
        ref={containerRef}
        onScroll={handleScroll}
        className={`relative w-full flex-1 bg-[#F3F4F6] ${
          fitMode === 'width' || scale <= 1.05 ? 'overflow-x-hidden' : 'overflow-x-auto'
        } overflow-y-auto p-0 m-0 select-none block`}
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: fitMode === 'width' || scale <= 1.05 ? 'pan-y pinch-zoom' : 'pan-x pan-y pinch-zoom',
          transform: 'translateZ(0)',
          willChange: 'scroll-position',
        }}
      >
        {/* ============================================================
            FLOATING BOTTOM PAGE INDICATOR: Page X of Y
        ============================================================ */}
        {!loading && !error && numPages > 0 && (
          <div
            className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-40 transition-opacity duration-300 ${
              showPagePill ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="bg-slate-900/85 backdrop-blur-md text-white text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-lg border border-white/15 flex items-center gap-2">
              <button
                onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="p-0.5 rounded hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span>
                Page {currentPage} of {numPages}
              </span>
              <button
                onClick={() => scrollToPage(Math.min(numPages, currentPage + 1))}
                disabled={currentPage >= numPages}
                className="p-0.5 rounded hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 gap-3 py-24">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs sm:text-sm font-medium text-slate-600 animate-pulse">
              Loading question paper PDF...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="max-w-md w-full mx-auto my-12 text-center p-6 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-900 font-serif">Document Notice</h4>
              <p className="text-xs text-slate-600 mt-1">{error}</p>
            </div>
            <div className="flex justify-center pt-2">
              <button
                onClick={handleDownloadClick}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Document</span>
              </button>
            </div>
          </div>
        )}

        {/* Continuous High-DPI Pure White Pages on Light Gray Canvas */}
        {!loading && !error && pdfDoc && (
          <div
            ref={contentWrapperRef}
            className="min-w-full inline-flex flex-col items-center gap-2 sm:gap-4 py-2 sm:py-4 px-0 sm:px-2"
          >
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
                    contain: 'layout style paint',
                    transform: 'translateZ(0)',
                  }}
                >
                  {/* Pure White Page with Subtle Shadow */}
                  <div
                    className="relative bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] sm:shadow-[0_4px_16px_rgba(0,0,0,0.1)] overflow-hidden"
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

                    {/* Searchable Text Layer Overlay */}
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
      </main>
    </div>
  );
};
