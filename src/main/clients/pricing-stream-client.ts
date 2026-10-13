import type { Price } from '../../domain/types';
import { readSseStream } from '../../lib/sse-parser';

export interface PriceSubscription {
  /** Closes the upstream connection. Safe to call more than once. */
  close(): void;
}

export interface SubscribeOptions {
  onPrice: (price: Price) => void;
  /** Called if the upstream connection fails or ends unexpectedly. Not called after `close()`. */
  onError?: (error: Error) => void;
}

export class PricingStreamClient {
  constructor(private readonly baseUrl: string) {}

  /**
   * Opens a dedicated upstream price stream for the given instruments.
   * The current price of every instrument is delivered first, then every update.
   *
   * `instruments` must be a non-empty list of known instrument names.
   */
  subscribe(instruments: string[], { onPrice, onError }: SubscribeOptions): PriceSubscription {
    if (instruments.length === 0) throw new Error('subscribe() requires at least one instrument');

    const controller = new AbortController();
    const url = `${this.baseUrl}/prices/stream?instruments=${instruments.map(encodeURIComponent).join(',')}`;

    const run = async () => {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'text/event-stream' } });
      if (!response.ok || !response.body) throw new Error(`GET /prices/stream failed with ${response.status}`);
      await readSseStream(response.body, (message) => {
        if (message.event === 'price') onPrice(JSON.parse(message.data) as Price);
      });
      throw new Error('Upstream price stream ended');
    };

    run().catch((error: unknown) => {
      if (controller.signal.aborted) return;
      onError?.(error instanceof Error ? error : new Error(String(error)));
    });

    return { close: () => controller.abort() };
  }
}
