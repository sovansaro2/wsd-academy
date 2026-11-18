import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  getOfflineBookArrayBuffer,
  getCachedCoverBlobUrl,
  saveCoverToLocalCache,
} from './offlineLibrary';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

const COMMON_PDF_OPTIONS = {
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/pdfjs/standard_fonts/',
  wasmUrl: '/pdfjs/wasm/',
  useSystemFonts: true,
};

function createLoadingTask(source, { forCoverOnly = false } = {}) {
  if (typeof source === 'string') {
    return pdfjsLib.getDocument({
      ...COMMON_PDF_OPTIONS,
      url: source,
      rangeChunkSize: 65536,
      disableAutoFetch: Boolean(forCoverOnly),
      disableStream: Boolean(forCoverOnly),
    });
  }

  const data = source instanceof Uint8Array ? source : new Uint8Array(source);
  return pdfjsLib.getDocument({
    ...COMMON_PDF_OPTIONS,
    data,
  });
}

export async function openPdfDocument(book, { forCoverOnly = false, onProgress } = {}) {
  if (!book) {
    throw new Error('Missing book metadata.');
  }

  const offlineBuffer = book.r2_key ? await getOfflineBookArrayBuffer(book.r2_key) : null;
  if (offlineBuffer && offlineBuffer.byteLength > 0) {
    const task = createLoadingTask(offlineBuffer, { forCoverOnly });
    const pdfDoc = await task.promise;
    return { pdfDoc, loadingTask: task, isLocalCache: true };
  }

  const proxyUrl = book.r2_key
    ? `/api/library/pdf-proxy?key=${encodeURIComponent(book.r2_key)}`
    : '';
  const candidateUrls = [];
  if (book.pdf_url && !book.pdf_url.startsWith('/api/')) {
    candidateUrls.push(book.pdf_url);
  }
  if (proxyUrl && !candidateUrls.includes(proxyUrl)) {
    candidateUrls.push(proxyUrl);
  } else if (book.pdf_url && !candidateUrls.includes(book.pdf_url)) {
    candidateUrls.push(book.pdf_url);
  }

  let lastError = null;
  for (const url of candidateUrls) {
    const task = createLoadingTask(url, { forCoverOnly });
    if (onProgress) {
      task.onProgress = (progressData) => {
        if (progressData?.total > 0) {
          const pct = Math.min(99, Math.round((progressData.loaded / progressData.total) * 100));
          onProgress(pct);
        }
      };
    }
    try {
      const pdfDoc = await task.promise;
      return { pdfDoc, loadingTask: task, isLocalCache: false };
    } catch (err) {
      lastError = err;
      try {
        if (typeof task?.destroy === 'function') {
          await task.destroy();
        }
      } catch {
        // Ignore cleanup error
      }
    }
  }

  throw lastError || new Error('Unable to load PDF document.');
}

export async function renderPdfPage1ToBlob(pdfDoc, targetWidth = 380) {
  const page = await pdfDoc.getPage(1);
  try {
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.max(0.25, Math.min(2.5, targetWidth / Math.max(1, baseViewport.width)));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));

    const ctx = canvas.getContext('2d', { alpha: false });
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    await page.render({ canvas, viewport }).promise;

    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.82);
    });
    canvas.width = 0;
    canvas.height = 0;
    return blob;
  } finally {
    try {
      page.cleanup();
    } catch {
      // Ignore cleanup error
    }
  }
}

export async function uploadBookCoverBlob(r2Key, blob) {
  if (!r2Key || !blob) return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;

  try {
    const formData = new FormData();
    formData.append('key', r2Key);
    formData.append('cover', blob, 'cover.jpg');

    const res = await fetch('/api/library/cover', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.cover_url || null;
  } catch {
    return null;
  }
}

export async function extractAndStoreBookCover(book, existingPdfDoc = null) {
  if (!book?.r2_key) return null;

  if (!existingPdfDoc) {
    const cachedUrl = await getCachedCoverBlobUrl(book.r2_key);
    if (cachedUrl) {
      return { localUrl: cachedUrl, coverUrl: book.cover_url || null };
    }
  }

  let pdfDoc = existingPdfDoc;
  let ownsDoc = false;
  let loadingTask = null;

  try {
    if (!pdfDoc) {
      const opened = await openPdfDocument(book, { forCoverOnly: true });
      pdfDoc = opened.pdfDoc;
      loadingTask = opened.loadingTask;
      ownsDoc = true;
    }

    const blob = await renderPdfPage1ToBlob(pdfDoc, 380);
    if (!blob) return null;

    await saveCoverToLocalCache(book.r2_key, blob);
    const localUrl = URL.createObjectURL(blob);

    let uploadedCoverUrl = book.cover_url || null;
    if (!uploadedCoverUrl) {
      uploadedCoverUrl = await uploadBookCoverBlob(book.r2_key, blob);
    }

    return { localUrl, coverUrl: uploadedCoverUrl };
  } finally {
    if (ownsDoc) {
      try {
        if (typeof pdfDoc?.destroy === 'function') {
          await pdfDoc.destroy();
        } else if (typeof pdfDoc?.cleanup === 'function') {
          await pdfDoc.cleanup();
        }
        if (typeof loadingTask?.destroy === 'function') {
          await loadingTask.destroy();
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

export async function extractCoverBlobFromFile(file, targetWidth = 380) {
  if (!file) return null;
  const buffer = await file.arrayBuffer();
  const task = createLoadingTask(buffer, { forCoverOnly: true });
  let pdfDoc = null;
  try {
    pdfDoc = await task.promise;
    return await renderPdfPage1ToBlob(pdfDoc, targetWidth);
  } finally {
    try {
      if (typeof pdfDoc?.destroy === 'function') {
        await pdfDoc.destroy();
      } else if (typeof pdfDoc?.cleanup === 'function') {
        await pdfDoc.cleanup();
      }
      if (typeof task?.destroy === 'function') {
        await task.destroy();
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}
