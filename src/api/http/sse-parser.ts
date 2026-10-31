/** One server-sent event (https://html.spec.whatwg.org/multipage/server-sent-events.html). */
export interface SseMessage {
  readonly id?: string;
  readonly event: string;
  readonly data: string;
}

/**
 * Incremental parser of a text/event-stream: feed it chunks as they arrive, it returns the complete events.
 * Comments (`: keep-alive`) are skipped.
 */
export class SseParser {
  private buffer = '';
  private id: string | undefined;
  private event = '';
  private data: string[] = [];

  push(chunk: string): SseMessage[] {
    this.buffer += chunk;
    const out: SseMessage[] = [];
    let newline: number;
    while ((newline = this.buffer.search(/\r\n|\r|\n/)) >= 0) {
      const line = this.buffer.slice(0, newline);
      const length = this.buffer.startsWith('\r\n', newline) ? 2 : 1;
      this.buffer = this.buffer.slice(newline + length);
      const message = this.line(line);
      if (message) out.push(message);
    }
    return out;
  }

  private line(line: string): SseMessage | undefined {
    if (line === '') {
      if (this.data.length === 0 && this.event === '') return undefined;
      const message: SseMessage = { event: this.event || 'message', data: this.data.join('\n'), ...(this.id === undefined ? {} : { id: this.id }) };
      this.event = '';
      this.data = [];
      return message;
    }
    if (line.startsWith(':')) return undefined;
    const colon = line.indexOf(':');
    const field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'id') this.id = value;
    else if (field === 'event') this.event = value;
    else if (field === 'data') this.data.push(value);
    return undefined;
  }
}
