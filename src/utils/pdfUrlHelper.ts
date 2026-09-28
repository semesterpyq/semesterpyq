/**
 * Utilities for handling PDF URLs, Google Drive links, and direct file uploads
 */

export interface ParsedPdfUrl {
  isGoogleDrive: boolean;
  isDataUrl: boolean;
  isBlobUrl: boolean;
  isHttpUrl: boolean;
  previewUrl: string;
  downloadUrl: string;
  rawUrl: string;
}

export function parsePdfUrl(url?: string | null, fallbackTitle = 'paper'): ParsedPdfUrl {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return {
      isGoogleDrive: false,
      isDataUrl: false,
      isBlobUrl: false,
      isHttpUrl: false,
      previewUrl: '',
      downloadUrl: '',
      rawUrl: '',
    };
  }

  const cleanUrl = url.trim();

  // 1. Base64 Data URL
  if (cleanUrl.startsWith('data:')) {
    return {
      isGoogleDrive: false,
      isDataUrl: true,
      isBlobUrl: false,
      isHttpUrl: false,
      previewUrl: cleanUrl,
      downloadUrl: cleanUrl,
      rawUrl: cleanUrl,
    };
  }

  // 2. Blob URL
  if (cleanUrl.startsWith('blob:')) {
    return {
      isGoogleDrive: false,
      isDataUrl: false,
      isBlobUrl: true,
      isHttpUrl: false,
      previewUrl: cleanUrl,
      downloadUrl: cleanUrl,
      rawUrl: cleanUrl,
    };
  }

  // 3. Google Drive links
  // Formats:
  // https://drive.google.com/file/d/1AbC.../view?usp=sharing
  // https://drive.google.com/open?id=1AbC...
  // https://drive.google.com/uc?id=1AbC...
  // https://docs.google.com/document/d/1AbC...
  const driveFileMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const driveIdMatch = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const docsIdMatch = cleanUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);

  const driveFileId = driveFileMatch?.[1] || driveIdMatch?.[1] || docsIdMatch?.[1];

  if (driveFileId || cleanUrl.includes('drive.google.com') || cleanUrl.includes('docs.google.com')) {
    const fileId = driveFileId || '';
    const previewUrl = fileId
      ? `https://drive.google.com/file/d/${fileId}/preview`
      : cleanUrl;
    const downloadUrl = fileId
      ? `https://drive.google.com/uc?export=download&id=${fileId}`
      : cleanUrl;

    return {
      isGoogleDrive: true,
      isDataUrl: false,
      isBlobUrl: false,
      isHttpUrl: true,
      previewUrl,
      downloadUrl,
      rawUrl: cleanUrl,
    };
  }

  // 4. Regular HTTP / Relative URLs
  return {
    isGoogleDrive: false,
    isDataUrl: false,
    isBlobUrl: false,
    isHttpUrl: cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.startsWith('/'),
    previewUrl: cleanUrl,
    downloadUrl: cleanUrl,
    rawUrl: cleanUrl,
  };
}

export function readPdfFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(file);
  });
}
