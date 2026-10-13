import Koa from 'koa';
import Router from '@koa/router';
import type { Price } from '../domain/types';
import { openSseStream } from '../lib/sse';
import type { MarketData } from './fixtures';
import type { PriceFeed } from './price-feed';

export interface SideServer {
  app: Koa;
  /** Number of currently open /prices/stream connections. */
  activeStreams(): number;
}

/**
 * Mock of the upstream accounts / instruments / pricing APIs.
 *
 *   GET /instruments                          -> { instruments: Instrument[] }
 *   GET /accounts/:accountId                  -> Account | 404
 *   GET /prices?instruments=A,B               -> { prices: Price[] }
 *   GET /prices/stream?instruments=A,B (SSE)  -> `price` events: current prices first, then every update
 */
export function createSideServer({ data, feed }: { data: MarketData; feed: PriceFeed }): SideServer {
  const app = new Koa();
  const router = new Router();
  let activeStreams = 0;

  const parseInstruments = (raw: unknown): string[] | undefined => {
    if (typeof raw !== 'string' || raw.trim() === '') return undefined;
    const names = raw.split(',').map((name) => name.trim());
    const known = new Set(data.instruments.map((instrument) => instrument.name));
    return names.every((name) => known.has(name)) ? names : undefined;
  };

  router.get('/instruments', (ctx) => {
    ctx.body = { instruments: data.instruments };
  });

  router.get('/accounts/:accountId', (ctx) => {
    const account = data.accounts.find((candidate) => candidate.id === ctx.params.accountId);
    if (!account) {
      ctx.status = 404;
      ctx.body = { error: `Account ${ctx.params.accountId} not found` };
      return;
    }
    ctx.body = account;
  });

  router.get('/prices', (ctx) => {
    const instruments = parseInstruments(ctx.query.instruments);
    if (!instruments) {
      ctx.status = 400;
      ctx.body = { error: 'Query parameter `instruments` must list known instruments, e.g. EUR_USD,USD_JPY' };
      return;
    }
    ctx.body = { prices: instruments.map((name) => feed.current(name)).filter(Boolean) };
  });

  router.get('/prices/stream', (ctx) => {
    const instruments = parseInstruments(ctx.query.instruments);
    if (!instruments) {
      ctx.status = 400;
      ctx.body = { error: 'Query parameter `instruments` must list known instruments, e.g. EUR_USD,USD_JPY' };
      return;
    }

    const wanted = new Set(instruments);
    const stream = openSseStream(ctx);
    const onPrice = (price: Price) => {
      if (wanted.has(price.instrument)) stream.send('price', price);
    };

    activeStreams++;
    feed.on('price', onPrice);
    stream.onClose(() => {
      activeStreams--;
      feed.off('price', onPrice);
    });

    for (const name of instruments) {
      const price = feed.current(name);
      if (price) stream.send('price', price);
    }
  });

  app.use(router.routes()).use(router.allowedMethods());

  return { app, activeStreams: () => activeStreams };
}
