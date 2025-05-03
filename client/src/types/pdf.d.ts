declare module 'pdfjs-dist' {
  export const version: string;
  export const GlobalWorkerOptions: {
    workerSrc: string;
  };

  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  export interface PDFPageProxy {
    getViewport({ scale }: { scale: number }): PDFViewport;
    render(renderParameters: PDFRenderParams): PDFRenderTask;
  }

  export interface PDFViewport {
    width: number;
    height: number;
  }

  export interface PDFRenderParams {
    canvasContext: CanvasRenderingContext2D;
    viewport: PDFViewport;
  }

  export interface PDFRenderTask {
    promise: Promise<void>;
  }

  export interface PDFDocumentLoadingOptions {
    url?: string;
    data?: Uint8Array;
    withCredentials?: boolean;
    cMapUrl?: string;
    cMapPacked?: boolean;
  }

  export function getDocument(source: string | PDFDocumentLoadingOptions): PDFDocumentLoadingTask;

  export interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>;
    onProgress?: (progressData: { loaded: number; total: number }) => void;
  }
}