import { fileTypeFromBuffer } from 'file-type';
import path from 'node:path';

type DetectionSource = 'header' | 'sniff' | 'extension' | 'fallback';

export interface RemoteAssetTypeResult {
  assetType: 'image' | 'video' | null;
  mime?: string;
  ext?: string;
  from: DetectionSource;
}

// ============================================================================
// MIME Type Classification Helpers
// ============================================================================

/**
 * Check if a MIME type indicates an image
 */
function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

/**
 * Check if a MIME type indicates a video
 */
function isVideoMime(mime: string): boolean {
  return mime.startsWith('video/');
}

/**
 * Check if a Content-Type is too generic to be useful
 */
function isGenericMime(contentType: string): boolean {
  return /octet-stream|binary/i.test(contentType);
}

/**
 * Convert MIME type to asset type classification
 */
function mimeToAssetType(mime: string): 'image' | 'video' | null {
  if (isImageMime(mime)) return 'image';
  if (isVideoMime(mime)) return 'video';
  return null;
}

// ============================================================================
// Network Request Helpers
// ============================================================================

/**
 * Create an AbortController with timeout for fetch requests
 */
function createTimeoutController(timeoutMs: number): { controller: AbortController; timeoutId: NodeJS.Timeout } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

/**
 * Read up to maxBytes from a response body stream
 */
async function readPartialStream(reader: ReadableStreamDefaultReader<Uint8Array>, maxBytes: number): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (total < maxBytes) {
      const { value, done } = await reader.read();
      if (done || !value) break;
      
      chunks.push(value);
      total += value.byteLength;
      
      if (total >= maxBytes) {
        await reader.cancel();
        break;
      }
    }
  } catch (error) {
    // Reader may already be cancelled, ignore
  }

  return Buffer.concat(chunks.map(u8 => Buffer.from(u8)));
}

// ============================================================================
// Tier 1: HTTP HEAD Request Detection
// ============================================================================

/**
 * Detect asset type from HTTP HEAD request Content-Type header.
 * Fast method that doesn't download any file content.
 */
async function detectFromHttpHeaders(url: string, timeout: number): Promise<RemoteAssetTypeResult | null> {
  try {
    const { controller, timeoutId } = createTimeoutController(timeout);
    
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type')?.split(';')[0].trim();
    
    if (!contentType || isGenericMime(contentType)) {
      if (contentType) {
        console.debug(`Content-Type '${contentType}' is too generic, skipping header detection`);
      }
      return null;
    }

    const assetType = mimeToAssetType(contentType);
    if (assetType) {
      console.debug(`✓ Detected ${assetType} via Content-Type header: ${contentType}`);
      return { assetType, mime: contentType, from: 'header' };
    }

    return null;
  } catch (error) {
    console.debug(`HEAD request failed: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

// ============================================================================
// Tier 2: Content Sniffing Detection
// ============================================================================

/**
 * Detect asset type by downloading and analyzing file signature (magic bytes).
 * More accurate but requires partial file download (up to 16KB).
 */
async function detectFromContentSniffing(url: string, timeout: number): Promise<RemoteAssetTypeResult | null> {
  const MAX_BYTES = 16 * 1024; // 16 KB

  try {
    const { controller, timeoutId } = createTimeoutController(timeout);
    
    const response = await fetch(url, { 
      headers: { Range: `bytes=0-${MAX_BYTES - 1}` },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return null;
    }

    const buffer = await readPartialStream(reader, MAX_BYTES);
    
    if (buffer.length === 0) {
      return null;
    }

    const fileType = await fileTypeFromBuffer(buffer);
    if (!fileType) {
      console.debug(`Content sniffing returned no file type`);
      return null;
    }

    const assetType = mimeToAssetType(fileType.mime);
    if (assetType) {
      console.debug(`✓ Detected ${assetType} via content sniffing: ${fileType.mime} (${fileType.ext})`);
      return { assetType, mime: fileType.mime, ext: fileType.ext, from: 'sniff' };
    }

    return null;
  } catch (error) {
    console.debug(`Content sniffing failed: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

// ============================================================================
// Tier 3: URL Pattern Detection
// ============================================================================

// Known file extensions by type
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico', '.tiff', '.tif', '.heic', '.heif', '.avif'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.mkv', '.webm', '.m4v', '.mpg', '.mpeg', '.3gp'];

/**
 * Check if URL contains a known file extension
 */
function detectFromFileExtension(urlLower: string): RemoteAssetTypeResult | null {
  // Check image extensions
  for (const ext of IMAGE_EXTENSIONS) {
    if (urlLower.includes(ext)) {
      console.debug(`✓ Detected image from extension: ${ext}`);
      return { assetType: 'image', ext: ext.slice(1), from: 'extension' };
    }
  }
  
  // Check video extensions
  for (const ext of VIDEO_EXTENSIONS) {
    if (urlLower.includes(ext)) {
      console.debug(`✓ Detected video from extension: ${ext}`);
      return { assetType: 'video', ext: ext.slice(1), from: 'extension' };
    }
  }

  return null;
}

/**
 * Check if URL path contains common CDN patterns
 */
function detectFromPathPattern(urlLower: string): RemoteAssetTypeResult | null {
  if (urlLower.includes('/images/') || urlLower.includes('/image/')) {
    console.debug(`✓ Detected image from path pattern: /images/ or /image/`);
    return { assetType: 'image', from: 'extension' };
  }
  
  if (urlLower.includes('/videos/') || urlLower.includes('/video/')) {
    console.debug(`✓ Detected video from path pattern: /videos/ or /video/`);
    return { assetType: 'video', from: 'extension' };
  }

  return null;
}

/**
 * Extract and check file extension from URL pathname
 */
function detectFromUrlPathname(url: string): RemoteAssetTypeResult | null {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).slice(1).toLowerCase();
    
    if (!ext) {
      return null;
    }

    if (IMAGE_EXTENSIONS.includes(`.${ext}`)) {
      console.debug(`✓ Detected image from URL path extension: .${ext}`);
      return { assetType: 'image', ext, from: 'extension' };
    }
    
    if (VIDEO_EXTENSIONS.includes(`.${ext}`)) {
      console.debug(`✓ Detected video from URL path extension: .${ext}`);
      return { assetType: 'video', ext, from: 'extension' };
    }

    return null;
  } catch {
    // Invalid URL
    return null;
  }
}

/**
 * Fast URL-based detection using extension and path patterns.
 * This is the fallback method when remote detection fails or is skipped.
 * No network calls, instant response.
 */
function detectFromUrl(url: string): RemoteAssetTypeResult {
  const urlLower = url.toLowerCase();
  
  // Try file extension detection
  const extResult = detectFromFileExtension(urlLower);
  if (extResult) return extResult;
  
  // Try path pattern detection
  const pathResult = detectFromPathPattern(urlLower);
  if (pathResult) return pathResult;
  
  // Try URL pathname extraction
  const pathnameResult = detectFromUrlPathname(url);
  if (pathnameResult) return pathnameResult;
  
  // Nothing worked
  console.debug(`✗ Unable to detect asset type from URL`);
  return { assetType: null, from: 'fallback' };
}

// ============================================================================
// Main Detection Function
// ============================================================================

/**
 * Detect asset type from a remote URL using a multi-tier approach:
 * 
 * **Tier 1 (Remote - Fast):** HTTP HEAD request to check Content-Type header
 * - Fastest method, no file download
 * - Works when server provides accurate Content-Type
 * 
 * **Tier 2 (Remote - Accurate):** Partial content sniffing via Range request
 * - Downloads only first 16KB to check file signature (magic bytes)
 * - Most accurate, works even if server headers are wrong
 * 
 * **Tier 3 (Local - Fallback):** URL pattern matching
 * - Checks file extension and path patterns
 * - No network overhead, instant response
 * - Used when remote methods fail or are unavailable
 * 
 * @param url - The remote URL to check
 * @param options - Configuration options
 * @param options.skipRemote - If true, skip remote checks and only use URL pattern matching (default: false)
 * @param options.timeout - Request timeout in milliseconds (default: 5000)
 * @returns Asset type detection result with source indicator
 */
export async function detectRemoteAssetType(
  url: string,
  options: { skipRemote?: boolean; timeout?: number } = {}
): Promise<RemoteAssetTypeResult> {
  const { skipRemote = false, timeout = 5000 } = options;

  // If skipRemote is true, only use URL-based detection
  if (skipRemote) {
    console.debug(`Skipping remote detection, using URL-based fallback for: ${url}`);
    return detectFromUrl(url);
  }

  // TIER 1: Try HTTP HEAD request (fast)
  const headerResult = await detectFromHttpHeaders(url, timeout);
  if (headerResult) {
    return headerResult;
  }

  // TIER 2: Try content sniffing (accurate)
  const sniffResult = await detectFromContentSniffing(url, timeout);
  if (sniffResult) {
    return sniffResult;
  }

  // TIER 3: Fallback to URL-based detection (always succeeds)
  console.debug(`Remote detection failed, using URL-based pattern matching as fallback`);
  return detectFromUrl(url);
}
