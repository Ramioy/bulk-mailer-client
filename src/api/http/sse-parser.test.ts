import { describe, expect, it } from 'vitest';

import { SseParser } from './sse-parser';

describe('SseParser', () => {
  it('parses events split across chunks and skips comments', () => {
    const parser = new SseParser();
    expect(parser.push('id: 1\nevent: STARTED\nda')).toEqual([]);
    expect(parser.push('ta: {"a":1}\n\n: keep-alive\n\nid: 2\n')).toEqual([{ id: '1', event: 'STARTED', data: '{"a":1}' }]);
    expect(parser.push('event: FINISHED\ndata: {}\n\n')).toEqual([{ id: '2', event: 'FINISHED', data: '{}' }]);
  });

  it('handles CRLF, multi-line data and events without id', () => {
    const parser = new SseParser();
    expect(parser.push('event: TOKEN_EXPIRED\r\ndata: a\r\ndata: b\r\n\r\n')).toEqual([{ event: 'TOKEN_EXPIRED', data: 'a\nb' }]);
  });
});
