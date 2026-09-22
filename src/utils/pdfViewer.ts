import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export { pdfjsLib };

export interface DownloadablePaper {
  id: string;
  paper_code?: string;
  paper_year?: number;
  exam_year?: number;
  title?: string;
}

export const downloadPaperPdf = async (paper: DownloadablePaper): Promise<boolean> => {
  const safeName = `${paper.paper_code || 'paper'}-${paper.paper_year || paper.exam_year || 2024}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
  const downloadUrl = `/api/papers/${paper.id}/download`;

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
    console.warn('Direct blob download fallback to native anchor click:', err);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = safeName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 2000);
    return true;
  }
};
