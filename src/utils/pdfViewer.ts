import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { generateClientQuestionPaperPdf } from './clientPdfGenerator';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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

export const downloadPaperPdf = async (paper: DownloadablePaper): Promise<boolean> => {
  const safeName = (
    paper.file_name ||
    `${paper.paper_code || 'paper'}-${paper.paper_year || paper.exam_year || 2024}.pdf`
  ).replace(/[^a-zA-Z0-9._-]/g, '_');

  // If paper has base64 data URL
  if (paper.file_url && paper.file_url.startsWith('data:')) {
    try {
      const link = document.createElement('a');
      link.href = paper.file_url;
      link.download = safeName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
      }, 1000);
      return true;
    } catch (e) {
      console.warn('Direct data URL download failed, continuing fallback:', e);
    }
  }

  const downloadUrl = paper.file_url || `/api/papers/${paper.id}/download`;

  try {
    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error(`Download response status ${res.status}`);
    const blob = await res.blob();
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
  } catch (err) {
    console.warn('Network download failed, synthesizing client PDF for download:', err);
    try {
      const pdfBytes = await generateClientQuestionPaperPdf({
        collegeName: 'SEMESTER (PYQs)',
        courseName: paper.course_name || paper.course_code || 'Degree Course',
        courseCode: paper.course_code || 'DEG',
        subjectName: paper.subject_name || paper.title,
        subjectCode: paper.subject_code || paper.paper_code,
        paperTitle: paper.title,
        examYear: paper.paper_year || paper.exam_year || 2024,
        paperCode: paper.paper_code,
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
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(blobUrl);
      }, 2000);
      return true;
    } catch (synthErr) {
      console.error('Failed synthesizing fallback PDF:', synthErr);
      return false;
    }
  }
};
