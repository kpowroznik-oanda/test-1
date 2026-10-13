import { EventEmitter } from 'node:events';
import type { Price } from '../domain/types';

interface PriceFeedEvents {
  price: [Price];
}

/** In-memory source of truth for the latest price of every instrument. */
export class PriceFeed extends EventEmitter<PriceFeedEvents> {
  private readonly latest = new Map<string, Price>();

  constructor(initialPrices: Price[]) {
    super();
    this.setMaxListeners(0); // one listener per open /prices/stream connection
    for (const price of initialPrices) this.latest.set(price.instrument, price);
  }

  current(instrument: string): Price | undefined {
    return this.latest.get(instrument);
  }

  publish(price: Price): void {
    this.latest.set(price.instrument, price);
    this.emit('price', price);
  }
}
