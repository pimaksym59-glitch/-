import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '../msw/server';

// jsdom gaps required by Radix (Select/Menu pointer handling) and the charts'
// responsive measurement (FS3). Guarded so a future jsdom that implements
// them wins.
if (typeof window !== 'undefined') {
  window.ResizeObserver ??= class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
  Element.prototype.scrollIntoView ??= () => {};
  // jsdom has no matchMedia (needed by AccessibilityProvider's reduced-motion
  // context and useMediaQuery).
  window.matchMedia ??= ((query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia;
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};

  // jsdom Blob/File miss the streaming reader surface undici needs to
  // serialize a multipart body (FS7 add-source upload) — fetch would hang
  // forever mid-request. Guarded so a future jsdom that implements them wins.
  const BlobProto = Blob.prototype as Blob & {
    arrayBuffer?: () => Promise<ArrayBuffer>;
    text?: () => Promise<string>;
    stream?: () => ReadableStream<Uint8Array>;
  };
  BlobProto.arrayBuffer ??= function arrayBuffer(this: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error as DOMException);
      reader.readAsArrayBuffer(this);
    });
  };
  BlobProto.text ??= async function text(this: Blob): Promise<string> {
    return new TextDecoder().decode(await this.arrayBuffer());
  };
  BlobProto.stream ??= function stream(this: Blob): ReadableStream<Uint8Array> {
    const bytes = this.arrayBuffer();
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(new Uint8Array(await bytes));
        controller.close();
      },
    });
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
