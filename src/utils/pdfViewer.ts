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

export const openPaperPdfInBrowser = async (paper: DownloadablePaper): Promise<void> => {
  const parsed = parsePdfUrl(paper.file_url);

  // If paper is Google Drive
  if (parsed.isGoogleDrive && parsed.previewUrl) {
    window.open(parsed.previewUrl, '_blank');
    return;
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
        window.open(blobUrl, '_blank');
        return;
      }
    } catch (e) {
      console.warn('Base64 parse error in openPaperPdfInBrowser:', e);
    }
  }

  // If paper has direct file URL
  const candidateUrl = paper.file_url || `/api/papers/${paper.id}/file`;
  if (candidateUrl && !candidateUrl.startsWith('data:')) {
    try {
      const res = await fetch(candidateUrl);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuf);
        if (isPdfByteArray(uint8)) {
          const blob = new Blob([arrayBuf], { type: 'application/pdf' });
          const blobUrl = window.URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
          return;
        }
      }
    } catch {
      window.open(candidateUrl, '_blank');
      return;
    }
  }

  // Client-side generated PDF fallback
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
    window.open(blobUrl, '_blank');
  } catch (err) {
    console.error('Failed to open PDF in browser:', err);
  }
};

