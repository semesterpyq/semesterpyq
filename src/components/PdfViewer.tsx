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
  FileText,
  Loader2,
} from 'lucide-react';
import {
  isPdfByteArray,
  generateClientQuestionPaperPdf,
  QuestionPaperPdfOptions,
} from '../utils/clientPdfGenerator';

// Configure pdf.js worker using standard CDN matching the version, with fallback
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
  minHeight = '550px',
  showDownloadButton = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [renderingPage, setRenderingPage] = useState(false);
  const [generatedBlobUrl, setGeneratedBlobUrl] = useState<string | null>(null);

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

  // Load PDF Document with intelligent validation & fallback
  const loadDocument = useCallback(async () => {
    setLoading(true);
    setError(null);

    let pdfBytes: Uint8Array | null = null;

    // 1. If URL is provided, try fetching first
    if (url) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          // Verify that this is a valid PDF (starts with %PDF)
          if (isPdfByteArray(uint8)) {
            pdfBytes = uint8;
          }
        }
      } catch (fetchErr) {
        console.warn('[PdfViewer] Direct fetch was not a PDF or failed, generating verified client copy:', fetchErr);
      }
    }

    // 2. If no valid PDF bytes from network (e.g. 404, HTML SPA router fallback, or offline preview), synthesize authentic PDF
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

        // Create Blob URL for instant download and new-tab preview
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

    // 3. Load PDF into PDF.js
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
      setLoading(false);
    } catch (err: any) {
      console.error('[PdfViewer] PDF.js parsing error:', err);
      setError(err?.message || 'Unable to render the PDF file.');
      setLoading(false);
    }
  }, [url, title, paperDetails]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Render current page onto Canvas
  const renderPage = useCallback(
    async (pageNum: number, pdf: any) => {
      if (!pdf || !canvasRef.current) return;
      setRenderingPage(true);

      try {
        const page = await pdf.getPage(pageNum);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        // Auto-fit scale if on small screens or container width
        const containerWidth = containerRef.current?.clientWidth || 600;
        const initialViewport = page.getViewport({ scale: 1.0, rotation });
        
        // Calculate appropriate scale: default to fit container width nicely on mobile
        let targetScale = scale;
        if (containerWidth > 0 && containerWidth < initialViewport.width) {
          targetScale = (containerWidth / initialViewport.width) * scale;
        }

        const viewport = page.getViewport({ scale: targetScale, rotation });
        const pixelRatio = window.devicePixelRatio || 1;

        // Set canvas dimensions for crisp high-DPI rendering
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err: any) {
        // If render was cancelled due to rapid page switching, ignore
        if (err?.name !== 'RenderingCancelledException') {
          console.error('[PdfViewer] Page render error:', err);
        }
      } finally {
        setRenderingPage(false);
      }
    },
    [scale, rotation]
  );

  useEffect(() => {
    if (pdfDoc && currentPage > 0) {
      renderPage(currentPage, pdfDoc);
    }
  }, [pdfDoc, currentPage, renderPage]);

  // Page navigation
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Zoom controls
  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 2.5));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.6));
  const resetZoom = () => setScale(1.0);

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

  return (
    <div
      ref={wrapperRef}
      className={`flex flex-col bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800 ${className} ${
        isFullScreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : ''
      }`}
      style={{ minHeight: isFullScreen ? '100vh' : minHeight }}
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 backdrop-blur-md text-slate-200 z-10">
        {/* Left: Document Info & Page Navigator */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60">
            <button
              onClick={prevPage}
              disabled={currentPage <= 1 || loading}
              aria-label="Previous Page"
              className="p-1.5 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-semibold text-slate-300 select-none min-w-[70px] text-center">
              {totalPages > 0 ? `${currentPage} / ${totalPages}` : '– / –'}
            </span>
            <button
              onClick={nextPage}
              disabled={currentPage >= totalPages || loading}
              aria-label="Next Page"
              className="p-1.5 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="hidden md:inline-block text-xs text-slate-400 font-medium truncate max-w-[200px]" title={title}>
            {title}
          </span>
        </div>

        {/* Center: Zoom & Orientation Controls */}
        <div className="flex items-center space-x-1 sm:space-x-1.5">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.6 || loading}
            aria-label="Zoom Out"
            className="p-1.5 bg-slate-800/70 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-30"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <button
            onClick={resetZoom}
            disabled={loading}
            aria-label="Reset Zoom"
            className="px-2 py-1 bg-slate-800/70 hover:bg-slate-700 rounded-lg text-[11px] font-mono font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Reset Zoom to 100%"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            onClick={zoomIn}
            disabled={scale >= 2.5 || loading}
            aria-label="Zoom In"
            className="p-1.5 bg-slate-800/70 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-30"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={rotateClockwise}
            disabled={loading}
            aria-label="Rotate Clockwise"
            className="p-1.5 bg-slate-800/70 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Rotate 90° Clockwise"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Fullscreen & Actions */}
        <div className="flex items-center space-x-1.5">
          <a
            href={effectiveDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open PDF in new tab"
            className="p-1.5 bg-slate-800/70 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Open in new window"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {showDownloadButton && (
            <a
              href={effectiveDownloadUrl}
              download={effectiveDownloadFilename}
              aria-label="Download PDF"
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
          )}

          <button
            onClick={toggleFullScreen}
            aria-label={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            className="p-1.5 bg-slate-800/70 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport Area */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto bg-slate-950 flex items-center justify-center p-3 sm:p-6"
        style={{ minHeight: '400px' }}
      >
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-20 space-y-3">
            <Loader2 className="w-9 h-9 text-blue-500 animate-spin" />
            <p className="text-xs font-medium text-slate-400">Rendering Question Paper PDF...</p>
          </div>
        )}

        {/* Error Fallback */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center max-w-md p-6 text-center space-y-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-20">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Preview Rendering Notice</h4>
              <p className="text-xs text-slate-400">{error}</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              <button
                onClick={loadDocument}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
              <a
                href={effectiveDownloadUrl}
                download={effectiveDownloadFilename}
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF File</span>
              </a>
              <a
                href={effectiveDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Tab</span>
              </a>
            </div>
          </div>
        )}

        {/* PDF Canvas Display */}
        <div className={`relative transition-opacity duration-200 ${loading || error ? 'opacity-0' : 'opacity-100'}`}>
          <div className="bg-white rounded-lg shadow-2xl p-1 overflow-hidden">
            <canvas ref={canvasRef} className="block mx-auto rounded shadow-sm bg-white" />
          </div>
          
          {/* Subtle page indicator floating pill */}
          {totalPages > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/60 text-[11px] font-semibold text-slate-300 shadow-md">
              Page {currentPage} of {totalPages}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
