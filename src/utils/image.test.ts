import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertFileToPngBase64 } from './image';

class MockFileReader {
  public result: string | ArrayBuffer | null = null;
  public onload: (() => void) | null = null;
  public onerror: (() => void) | null = null;

  readAsDataURL(): void {
    setTimeout(() => {
      this.result = 'data:image/png;base64,abc123';
      this.onload?.();
    });
  }
}

class MockImage {
  public onload: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  set src(_: string) {
    setTimeout(() => this.onload?.());
  }
}

describe('convertFileToPngBase64', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('FileReader', MockFileReader as any);
    vi.stubGlobal('Image', MockImage as any);
  });

  it('returns base64 string on successful read and render', async () => {
    const originalCreateElement = document.createElement.bind(document);
    const canvasSpy = vi.spyOn(document, 'createElement');
    canvasSpy.mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: vi.fn() }),
          toDataURL: () => 'data:image/png;base64,abc123'
        } as any;
      }
      return originalCreateElement(tagName);
    });

    const data = await convertFileToPngBase64(new File([], 'test.png'));
    expect(data).toBe('abc123');
  });

  it('rejects when canvas returns an invalid image data URL', async () => {
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: vi.fn() }),
          toDataURL: () => 'data:image/png;base64'
        } as any;
      }
      return originalCreateElement(tagName);
    });

    await expect(convertFileToPngBase64(new File([], 'test.png'))).rejects.toThrow('Invalid image data');
  });

  it('rejects when canvas context is missing', async () => {
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return { getContext: (): null => null } as any;
      }
      return originalCreateElement(tagName);
    });

    await expect(convertFileToPngBase64(new File([], 'test.png'))).rejects.toThrow('Unable to create canvas context');
  });

  it('rejects when image fails to load', async () => {
    class ErrorImage extends MockImage {
      set src(_: string) {
        setTimeout(() => this.onerror?.());
      }
    }
    vi.stubGlobal('Image', ErrorImage as any);

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: vi.fn() }),
          toDataURL: () => 'data:image/png;base64,abc123'
        } as any;
      }
      return originalCreateElement(tagName);
    });

    await expect(convertFileToPngBase64(new File([], 'test.png'))).rejects.toThrow('Unable to load image');
  });

  it('rejects when file reader errors', async () => {
    class ErrorFileReader extends MockFileReader {
      readAsDataURL(): void {
        setTimeout(() => this.onerror?.());
      }
    }
    vi.stubGlobal('FileReader', ErrorFileReader as any);

    await expect(convertFileToPngBase64(new File([], 'test.png'))).rejects.toThrow('Failed to read file');
  });
});
