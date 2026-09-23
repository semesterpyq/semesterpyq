import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
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

interface PageDimension {
  width: number;
  height: number;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  url,
  title = 'Examination Question Paper',
  paperDetails,
  downloadUrl,
  downloadFilename,
  className = '',
  minHeight = '620px',
  showDownloadButton = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pageContainerRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const canvasRefs = useRef<{ [key: number]: HTMLCanvasElement | null }>({});
  const activeRenderTasks = useRef<{ [key: number]: any }>({});

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
  const [basePageDimensions, setBasePageDimensions] = useState<{ [key: number]: PageDimension }>({});

  const scaleRef = useRef<number>(1.0);
  scaleRef.current = scale;

  const anchorRef = useRef<{
    focalRatioX: number;
    focalRatioY: number;
    viewportFocalX: number;
    viewportFocalY: number;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (generatedBlobUrl) {
        URL.revokeObjectURL(generatedBlobUrl);
      }
      Object.values(activeRenderTasks.current).forEach((task) => {
        try {
          task?.cancel();
        } catch {
          // ignore
        }
      });
    };
  }, [generatedBlobUrl]);

  const effectiveDownloadUrl = generatedBlobUrl || downloadUrl || url || '#';
  const effectiveDownloadFilename =
    downloadFilename || (title ? `${title.replace(/\s+/g, '_')}.pdf` : 'QuestionPaper.pdf');

  const getFitWidthScale = useCallback((viewportWidth: number) => {
    if (!containerRef.current || !viewportWidth) return 1.0;
    const containerWidth = containerRef.current.clientWidth;
    const padding = containerWidth < 480 ? 16 : containerWidth < 768 ? 32 : 48;
    const availableWidth = Math.max(containerWidth - padding, 240);
    const targetScale = availableWidth / viewportWidth;
    return Number(targetScale.toFixed(2));
  }, []);

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

  useLayoutEffect(() => {
    if (anchorRef.current && containerRef.current) {
      const { focalRatioX, focalRatioY, viewportFocalX, viewportFocalY } = anchorRef.current;
      const container = containerRef.current;
      container.scrollLeft = Math.max(0, focalRatioX * scale - viewportFocalX);
      container.scrollTop = Math.max(0, focalRatioY * scale - viewportFocalY);
      anchorRef.current = null;
    }
  }, [scale]);

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
        console.warn('Failed parsing data URL:', e);
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

      const dims: { [key: number]: PageDimension } = {};
      for (let i = 1; i <= loadedPdf.numPages; i++) {
        const p = await loadedPdf.getPage(i);
        const vp = p.getViewport({ scale: 1.0, rotation: 0 });
        dims[i] = { width: vp.width, height: vp.height };
      }
      setBasePageDimensions(dims);

      const firstPageVp = dims[1] || { width: 612, height: 792 };
      const initialScale = getFitWidthScale(firstPageVp.width);
      setScale(initialScale);
      scaleRef.current = initialScale;
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
          console.error(`[PdfViewer] Page ${pageNum} render error:`, err);
        }
      } finally {
        activeRenderTasks.current[pageNum] = null;
      }
    },
    []
  );

  useEffect(() => {
    if (pdfDoc && totalPages > 0) {
      for (let p = 1; p <= totalPages; p++) {
        renderSinglePage(p, pdfDoc, scale, rotation);
      }
    }
  }, [pdfDoc, totalPages, scale, rotation, renderSinglePage]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || totalPages <= 1) return;

    const containerTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const viewCenter = containerTop + containerHeight * 0.35;

    let bestPage = 1;
    let minDistance = Infinity;

    for (let p = 1; p <= totalPages; p++) {
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
  }, [totalPages, currentPage]);

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

  // Wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.008;
        const newScale = Math.min(Math.max(scaleRef.current + delta, 0.35), 3.5);
        setZoomWithAnchor(newScale, { clientX: e.clientX, clientY: e.clientY });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [setZoomWithAnchor]);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      if (!pdfDoc || fitMode !== 'width') return;
      const firstDim = basePageDimensions[1] || { width: 612, height: 792 };
      const newScale = getFitWidthScale(firstDim.width);
      setScale(newScale);
      scaleRef.current = newScale;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDoc, fitMode, basePageDimensions, getFitWidthScale]);

  const prevPage = () => {
    if (currentPage > 1) scrollToPage(currentPage - 1);
  };

  const nextPage = () => {
    if (currentPage < totalPages) scrollToPage(currentPage + 1);
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

  const zoomIn = () => setZoomWithAnchor(scale + 0.15);
  const zoomOut = () => setZoomWithAnchor(scale - 0.15);

  const handleFitWidth = () => {
    if (!pdfDoc) return;
    const firstDim = basePageDimensions[1] || { width: 612, height: 792 };
    const fitScale = getFitWidthScale(firstDim.width);
    setZoomWithAnchor(fitScale, undefined, 'width');
  };

  const handleResetZoom100 = () => setZoomWithAnchor(1.0);
  const rotateClockwise = () => setRotation((r) => (r + 90) % 360);

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

  const handlePrint = () => {
    if (effectiveDownloadUrl && effectiveDownloadUrl !== '#') {
      const printWindow = window.open(effectiveDownloadUrl, '_blank');
      if (printWindow) printWindow.focus();
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={`flex flex-col bg-[#202124] text-slate-100 rounded-xl overflow-hidden shadow-2xl border border-[#3c4043] transition-all select-none ${className} ${
        isFullScreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : ''
      }`}
      style={{ minHeight: isFullScreen ? '100dvh' : minHeight }}
    >
      {/* ============================================================
          GOOGLE DRIVE / CHROME STYLE TOP TOOLBAR
      ============================================================ */}
      <header className="flex items-center justify-between px-2.5 sm:px-4 py-2 bg-[#323639] border-b border-[#444746] text-white z-20 shrink-0 gap-2 shadow-md">
        {/* Left: Document Info */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-sm bg-[#ea4335] flex items-center justify-center shrink-0 shadow-xs">
            <span className="text-white font-black text-[9px] sm:text-[10px] tracking-wider">PDF</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-medium truncate text-slate-100 leading-snug max-w-[130px] xs:max-w-[200px] sm:max-w-[260px] md:max-w-md">
              {title}
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400">
              <span className="truncate max-w-[120px] sm:max-w-none">
                {paperDetails?.subjectName || 'Question Paper'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Controls (Pagination, Zoom, Fit) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Pagination */}
          <div className="flex items-center bg-[#282a2d] px-1 py-0.5 rounded-md border border-[#444746]">
            <button
              onClick={prevPage}
              disabled={currentPage <= 1 || loading}
              className="p-1 rounded hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <form onSubmit={handlePageJumpSubmit} className="flex items-center px-1">
              <input
                type="text"
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                onBlur={handlePageJumpSubmit}
                disabled={totalPages <= 1 || loading}
                className="w-5 sm:w-7 py-0 text-center text-xs font-medium bg-transparent text-white border-none focus:ring-1 focus:ring-[#8ab4f8] focus:bg-[#18191a] rounded focus:outline-hidden"
              />
              <span className="text-[11px] sm:text-xs text-slate-400 font-normal select-none">
                / {totalPages || 1}
              </span>
            </form>

            <button
              onClick={nextPage}
              disabled={currentPage >= totalPages || loading}
              className="p-1 rounded hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          <div className="h-4 w-px bg-[#444746] hidden xs:block" />

          {/* Zoom Controls */}
          <div className="flex items-center bg-[#282a2d] px-1 py-0.5 rounded-md border border-[#444746]">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.35 || loading}
              className="p-1 rounded hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              onClick={handleResetZoom100}
              className="px-1.5 py-0.5 rounded hover:bg-white/10 text-[11px] sm:text-xs font-mono font-medium text-slate-200 hover:text-white transition-colors cursor-pointer"
              title="Reset to 100%"
            >
              {Math.round(scale * 100)}%
            </button>

            <button
              onClick={zoomIn}
              disabled={scale >= 3.5 || loading}
              className="p-1 rounded hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          <div className="h-4 w-px bg-[#444746] hidden sm:block" />

          {/* Fit Width */}
          <button
            onClick={handleFitWidth}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
              fitMode === 'width'
                ? 'bg-[#1a73e8] border-[#1a73e8] text-white shadow-xs'
                : 'bg-[#282a2d] border-[#444746] hover:bg-white/10 text-slate-300 hover:text-white'
            }`}
            title="Fit to width"
          >
            <Maximize className="w-3.5 h-3.5" />
            <span>Fit Width</span>
          </button>

          {/* Rotate */}
          <button
            onClick={rotateClockwise}
            className="p-1.5 rounded-md bg-[#282a2d] border border-[#444746] hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer hidden md:inline-flex"
            title="Rotate 90°"
          >
            <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Right: Actions (Fullscreen, Download, Open) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={handlePrint}
            disabled={loading}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer hidden lg:inline-flex"
            title="Print"
          >
            <Printer className="w-4 h-4" />
          </button>

          <a
            href={effectiveDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Open original file"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={toggleFullScreen}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer hidden sm:inline-flex"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullScreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {showDownloadButton && (
            <a
              href={effectiveDownloadUrl}
              download={effectiveDownloadFilename}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:scale-95 text-white text-xs font-medium shadow-sm transition-all cursor-pointer"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Download</span>
            </a>
          )}
        </div>
      </header>

      {/* ============================================================
          MAIN VIEWER CANVAS AREA (Centered, Smooth Scroll)
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
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              <button
                onClick={loadDocument}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#323639] hover:bg-[#3f4347] text-slate-200 text-xs font-semibold rounded-full transition-colors cursor-pointer"
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
                <span>Download</span>
              </a>
            </div>
          </div>
        )}

        {/* Continuous Centered Pages Stack */}
        {!loading && !error && pdfDoc && (
          <div className="flex flex-col items-center gap-4 sm:gap-6 md:gap-8 pb-12 my-auto max-w-full">
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => {
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
                  <div className="bg-white rounded-xs sm:rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.6)] ring-1 ring-black/40 overflow-hidden max-w-full">
                    <canvas
                      ref={(el) => {
                        canvasRefs.current[pageNum] = el;
                      }}
                      className="block max-w-full h-auto bg-white"
                    />
                  </div>

                  {totalPages > 1 && (
                    <span className="mt-2 text-[10px] sm:text-[11px] font-medium text-slate-400 select-none">
                      Page {pageNum} of {totalPages}
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
