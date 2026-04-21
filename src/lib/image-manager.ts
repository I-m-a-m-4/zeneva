
/**
 * ImageManager handles the local persistence of images on the device (Mobile/Desktop).
 * It downloads external images and saves them to the local filesystem,
 * allowing for offline access and reduced bandwidth.
 */
export class ImageManager {
  private static MEDIA_DIR = 'media_cache';

  /**
   * Initializes the media directory if it doesn't exist.
   */
  private static async ensureDir() {
    try {
      const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
      if (!isTauri) return;

      const { exists, mkdir, BaseDirectory } = await import('@tauri-apps/plugin-fs');

      const mediaDirExists = await exists(this.MEDIA_DIR, { baseDir: BaseDirectory.AppData });
      if (!mediaDirExists) {
        await mkdir(this.MEDIA_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
      }
    } catch (err) {
      console.error('Failed to ensure media directory:', err);
    }
  }

  /**
   * Sanitize a URL to use as a filename
   */
  private static getFilename(url: string): string {
    try {
      // Generate a simple hash-like string from URL
      const hash = btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
      const extension = url.split('.').pop()?.split('?')[0] || 'png';
      return `${hash}.${extension}`;
    } catch (e) {
      return `img_${Date.now()}.png`;
    }
  }

  /**
   * Gets a local URI for an external image URL.
   * If the image isn't cached, it downloads it first.
   */
  static async getLocalUri(url: string): Promise<string> {
    const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
    if (!isTauri || !url || !url.startsWith('http')) return url;

    try {
      const { exists, writeFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      const { fetch } = await import('@tauri-apps/plugin-http');
      const { join, appDataDir } = await import('@tauri-apps/api/path');
      const { convertFileSrc } = await import('@tauri-apps/api/core');

      await this.ensureDir();
      const filename = this.getFilename(url);
      const filePath = await join(this.MEDIA_DIR, filename);
      
      const fileExists = await exists(filePath, { baseDir: BaseDirectory.AppData });
      
      if (fileExists) {
        const appData = await appDataDir();
        const fullPath = await join(appData, filePath);
        return convertFileSrc(fullPath);
      }

      // Download the image
      console.log(`Caching image: ${url}`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const unit8Array = new Uint8Array(arrayBuffer);
      
      await writeFile(filePath, unit8Array, { baseDir: BaseDirectory.AppData });
      
      const appData = await appDataDir();
      const fullPath = await join(appData, filePath);
      return convertFileSrc(fullPath);

    } catch (err) {
      console.warn('Image caching failed, falling back to network URL:', url, err);
      return url;
    }
  }
}
