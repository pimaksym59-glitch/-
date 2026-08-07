import { describe, expect, it } from 'vitest';
import {
  STREAM_DONE,
  accumulateText,
  openStream,
  parseFrame,
  type StreamEvent,
} from '@/shared/lib/stream';

describe('parseFrame', () => {
  it('parses data + event + id fields', () => {
    expect(parseFrame('event: token\ndata: hi\nid: 1')).toEqual({
      event: 'token',
      data: 'hi',
      id: '1',
    });
  });

  it('joins multi-line data and ignores comments', () => {
    expect(parseFrame(': keep-alive\ndata: a\ndata: b')).toEqual({
      event: 'message',
      data: 'a\nb',
    });
  });

  it('returns null for empty frames', () => {
    expect(parseFrame(': ping')).toBeNull();
  });
});

describe('accumulateText', () => {
  it('accumulates until the DONE sentinel', () => {
    const events: StreamEvent[] = [
      { event: 'message', data: 'Hello' },
      { event: 'message', data: ' world' },
      { event: 'message', data: STREAM_DONE },
    ];
    expect(accumulateText(events)).toEqual({ text: 'Hello world', done: true });
  });
});

describe('openStream', () => {
  it('reads an SSE stream token-by-token via MSW', async () => {
    const received: string[] = [];
    for await (const event of openStream('http://localhost/api/stream-test')) {
      received.push(event.data);
    }
    expect(received).toEqual(['Hello', ' world', STREAM_DONE]);
  });

  it('is abortable', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      (async () => {
        for await (const _event of openStream('http://localhost/api/stream-test', {
          signal: controller.signal,
        })) {
          // no-op
        }
      })(),
    ).rejects.toThrow();
  });
});
