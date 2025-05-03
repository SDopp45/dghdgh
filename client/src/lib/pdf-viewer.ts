// Simple utility functions for PDF viewing
export function getPdfViewerUrl(fileUrl: string): string {
  // If the URL is already a full URL, return it
  if (fileUrl.startsWith('http')) {
    return fileUrl;
  }

  // Otherwise, ensure it's properly prefixed
  if (!fileUrl.startsWith('/')) {
    fileUrl = '/' + fileUrl;
  }

  return fileUrl;
}

export function getPdfDownloadUrl(fileUrl: string): string {
  return fileUrl.replace('/preview', '/download');
}

// Types pour le progress
export interface PDFProgress {
  loaded: number;
  total: number;
}