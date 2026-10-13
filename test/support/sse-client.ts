import { readSseStream } from '../../src/lib/sse-parser';

export interface ReceivedEvent<T = unknown> {
  event: string;
  data: T;
}

export interface SseTestClient {
  status: number;
  contentType: string | null;
  /** Resolves with the next event, or rejects after `timeoutMs`. */
  nextEvent<T = unknown>(timeoutMs?: number): Promise<ReceivedEvent<T>>;
  /** Rejects if any event arrives within `ms`. */
  expectNoEvent(ms?: number): Promise<void>;
  close(): void;
}

export async function connectSse(url: string): Promise<SseTestClient> {
  const controller = new AbortController();
  const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'text/event-stream' } });

  const queue: ReceivedEvent[] = [];
  const waiters: Array<(event: ReceivedEvent) => void> = [];

  if (response.ok && response.body) {
    readSseStream(response.body, ({ event, data }) => {
      const received = { event, data: JSON.parse(data) as unknown };
      const waiter = waiters.shift();
      if (waiter) waiter(received);
      else queue.push(received);
    }).catch(() => {
      // aborted by close() or server shutdown
    });
  } else {
    await response.body?.cancel();
  }

  return {
    status: response.status,
    contentType: response.headers.get('content-type'),

    nextEvent<T>(timeoutMs = 1000) {
      const queued = queue.shift();
      if (queued) return Promise.resolve(queued as ReceivedEvent<T>);
      return new Promise<ReceivedEvent<T>>((resolve, reject) => {
        const waiter = (event: ReceivedEvent) => {
          clearTimeout(timer);
          resolve(event as ReceivedEvent<T>);
        };
        const timer = setTimeout(() => {
          waiters.splice(waiters.indexOf(waiter), 1);
          reject(new Error(`No SSE event received within ${timeoutMs}ms`));
        }, timeoutMs);
        waiters.push(waiter);
      });
    },

    async expectNoEvent(ms = 200) {
      await new Promise((resolve) => setTimeout(resolve, ms));
      if (queue.length > 0) throw new Error(`Expected no SSE event, got: ${JSON.stringify(queue[0])}`);
    },

    close: () => controller.abort(),
  };
}
