import type { Context } from 'koa';
import { PassThrough } from 'node:stream';

export interface SseStream {
  /** Writes `event: <event>\ndata: <JSON>\n\n`. No-op once the stream is closed. */
  send(event: string, data: unknown): void;
  /** Registers a callback fired once, when the client disconnects or `close()` is called. */
  onClose(listener: () => void): void;
  close(): void;
  readonly closed: boolean;
}

/**
 * Turns the Koa response into a Server-Sent Events stream.
 * Headers are flushed immediately, so the client sees the response before the first event.
 */
export function openSseStream(ctx: Context): SseStream {
  const body = new PassThrough();
  const closeListeners: Array<() => void> = [];
  let closed = false;

  ctx.req.socket.setTimeout(0);
  ctx.req.socket.setNoDelay(true);
  ctx.req.socket.setKeepAlive(true);

  ctx.status = 200;
  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  ctx.body = body;
  ctx.flushHeaders();

  const close = () => {
    if (closed) return;
    closed = true;
    body.end();
    for (const listener of closeListeners.splice(0)) listener();
  };

  ctx.res.on('close', close);
  if (ctx.res.destroyed) close(); // client left before the stream was opened

  return {
    send(event, data) {
      if (closed) return;
      body.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    onClose(listener) {
      if (closed) listener();
      else closeListeners.push(listener);
    },
    close,
    get closed() {
      return closed;
    },
  };
}
