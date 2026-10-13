import Decimal from 'decimal.js';
import type { Instrument } from '../domain/types';
import type { PriceFeed } from './price-feed';

/** Moves a random instrument by a few pips every `intervalMs`. Used only by `npm run dev`. */
export function startRandomWalk(feed: PriceFeed, instruments: Instrument[], intervalMs = 500): () => void {
  const timer = setInterval(() => {
    const instrument = instruments[Math.floor(Math.random() * instruments.length)]!;
    const current = feed.current(instrument.name);
    if (!current) return;

    const pip = new Decimal(10).pow(-(instrument.displayPrecision - 1));
    const move = pip.mul(Math.floor(Math.random() * 7) - 3);
    const spread = new Decimal(current.ask).minus(current.bid);
    const bid = new Decimal(current.bid).plus(move);

    feed.publish({
      instrument: instrument.name,
      bid: bid.toFixed(instrument.displayPrecision),
      ask: bid.plus(spread).toFixed(instrument.displayPrecision),
      time: new Date().toISOString(),
    });
  }, intervalMs);

  return () => clearInterval(timer);
}
