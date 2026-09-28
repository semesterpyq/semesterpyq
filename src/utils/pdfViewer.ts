import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  try {
    // Statically served worker from public folder for maximum speed & offline reliability
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '6.3.289'}/build/pdf.worker.min.mjs`;
  }
}

export { pdfjsLib };

export interface DownloadablePaper {
  id: string;
  paper_code?: string;
  paper_year?: number;
  exam_year?: number;
  title?: string;
  file_url?: string;
  file_name?: string;
  course_name?: string;
  course_code?: string;
  subject_name?: string;
  subject_code?: string;
  total_marks?: number;
  duration?: string;
}

import { parsePdfUrl } from './pdfUrlHelper';
import { isPdfByteArray, generateClientQuestionPaperPdf } from './clientPdfGenerator';

export const downloadPaperPdf = async (paper: DownloadablePaper): Promise<boolean> => {
  const safeName = (
    paper.file_name ||
    `${paper.paper_code || 'paper'}-${paper.paper_year || paper.exam_year || 2024}.pdf`
  ).replace(/[^a-zA-Z0-9._-]/g, '_');

  const parsed = parsePdfUrl(paper.file_url);

  // If paper is Google Drive
  if (parsed.isGoogleDrive && parsed.downloadUrl) {
    try {
      const link = document.createElement('a');
      link.href = parsed.downloadUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = safeName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
      }, 1000);
      return true;
    } catch (e) {
      console.warn('Google Drive direct download dispatch:', e);
    }
  }

  // If paper has base64 data URL
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
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = safeName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        }, 2000);
        return true;
      }
    } catch (e) {
      console.warn('Direct data URL download failed, continuing fallback:', e);
    }
  }

  const downloadUrl = paper.file_url || `/api/papers/${paper.id}/download`;

  if (downloadUrl && !downloadUrl.startsWith('data:')) {
    try {
      const res = await fetch(downloadUrl);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        if (isPdfByteArray(arrayBuf)) {
          const blob = new Blob([arrayBuf], { type: 'application/pdf' });
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = safeName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            if (document.body.contains(link)) {
              document.body.removeChild(link);
            }
            window.URL.revokeObjectURL(blobUrl);
          }, 2000);
          return true;
        }
      }
    } catch (err) {
      console.warn('Network download failed, using client fallback:', err);
    }
  }

  // Client-side fallback PDF generator
  try {
    const pdfBytes = await generateClientQuestionPaperPdf({
      collegeName: paper.course_name || 'Semester (PYQs) Examination Portal',
      courseName: paper.course_name,
      courseCode: paper.course_code,
      subjectName: paper.subject_name || paper.title,
      subjectCode: paper.subject_code || paper.paper_code,
      paperTitle: paper.title,
      examYear: paper.paper_year || paper.exam_year || 2024,
      paperCode: paper.paper_code || 'QP',
      totalMarks: paper.total_marks || 75,
      duration: paper.duration || '3 Hours',
    });

    const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = safeName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 2000);
    return true;
  } catch (genErr) {
    console.error('Download PDF synthesis failed:', genErr);
    return false;
  }
};

export const getPaperFileName = (paper: DownloadablePaper): string => {
  let rawName = paper.file_name;
  if (!rawName || rawName === 'paper.pdf') {
    const rawCourseOrSub = (paper.course_name || paper.subject_name || paper.paper_code || 'paper')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-');
    const yr = paper.paper_year || paper.exam_year || 2024;
    rawName = `${rawCourseOrSub}-${yr}.pdf`;
  }
  if (!rawName.toLowerCase().endsWith('.pdf')) {
    rawName = `${rawName}.pdf`;
  }
  return rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
};

const PDF_CACHE_NAME = 'lbs-pdf-cache-v1';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/pdf-sw.js').catch(() => {});
  });
}

export const cachePaperPdfInBrowserCache = async (paper: DownloadablePaper): Promise<void> => {
  if (typeof window === 'undefined' || !('caches' in window) || !paper || !paper.id) return;
  try {
    const fileName = getPaperFileName(paper);
    const pathKey = `/api/papers/${encodeURIComponent(paper.id)}/view/${encodeURIComponent(fileName)}`;
    let pdfBytes: Uint8Array | null = null;

    if (paper.file_url && paper.file_url.startsWith('data:')) {
      const commaIdx = paper.file_url.indexOf(',');
      const base64Data = (commaIdx !== -1 ? paper.file_url.slice(commaIdx + 1) : paper.file_url)
        .trim()
        .replace(/[\s\r\n]/g, '');
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      if (isPdfByteArray(bytes)) {
        pdfBytes = bytes;
      }
    }

    if (!pdfBytes) return;

    const cache = await caches.open(PDF_CACHE_NAME);
    const response = new Response(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(pdfBytes.byteLength),
        'Content-Disposition': `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
    await cache.put(pathKey, response);
  } catch {
    // ignore cache errors
  }
};

export const syncPaperToServerCache = (paper: DownloadablePaper): void => {
  if (typeof window === 'undefined' || !paper || !paper.id) return;
  cachePaperPdfInBrowserCache(paper);
  try {
    fetch('/api/papers/sync-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paper }),
    }).catch(() => {});
  } catch {
    // ignore
  }
};

export const openPaperPdfInBrowser = async (paper: DownloadablePaper): Promise<void> => {
  const fileName = getPaperFileName(paper);
  const parsed = parsePdfUrl(paper.file_url);

  // Ensure server memory cache and browser Service Worker Cache API have this paper record immediately
  syncPaperToServerCache(paper);
  await cachePaperPdfInBrowserCache(paper);

  // If paper is Google Drive
  if (parsed.isGoogleDrive && parsed.previewUrl) {
    const driveWin = window.open(parsed.previewUrl, '_blank');
    if (!driveWin) {
      throw new Error('Popup blocked');
    }
    return;
  }

  // Pass fallback metadata in query string and open real database filename endpoint in default browser PDF viewer
  const queryParams = new URLSearchParams();
  if (paper.title) queryParams.set('title', paper.title);
  if (paper.course_name) queryParams.set('courseName', paper.course_name);
  if (paper.course_code) queryParams.set('courseCode', paper.course_code);
  if (paper.subject_name) queryParams.set('subjectName', paper.subject_name);
  if (paper.paper_code) queryParams.set('paperCode', paper.paper_code);
  if (paper.paper_year || paper.exam_year) {
    queryParams.set('paperYear', String(paper.paper_year || paper.exam_year));
  }
  const qs = queryParams.toString();
  const viewerUrl = `/api/papers/${encodeURIComponent(paper.id)}/view/${encodeURIComponent(fileName)}${qs ? `?${qs}` : ''}`;

  const win = window.open(viewerUrl, '_blank');
  if (!win) {
    throw new Error('Popup blocked');
  }
};

