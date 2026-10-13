import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type Koa from 'koa';
import type { Price } from '../../src/domain/types';
import { createApp } from '../../src/main/app';
import { AccountClient } from '../../src/main/clients/account-client';
import { InstrumentsClient } from '../../src/main/clients/instruments-client';
import { PricingStreamClient } from '../../src/main/clients/pricing-stream-client';
import { createSideServer } from '../../src/side-server/app';
import { SEED_TIME, createMarketData } from '../../src/side-server/fixtures';
import { PriceFeed } from '../../src/side-server/price-feed';

export interface TestEnvironment {
  /** Base URL of the main app under test */
  mainUrl: string;
  market: {
    /** Publishes a new price on the side-server. `time` advances by 1s per call. */
    pushPrice(instrument: string, quote: { bid: string; ask: string }): Price;
    /** Number of currently open upstream /prices/stream connections */
    activeStreams(): number;
  };
  close(): Promise<void>;
}

/** Side-server (deterministic: prices move only via `pushPrice`) + main app, both on ephemeral ports. */
export async function startTestEnvironment(): Promise<TestEnvironment> {
  const data = createMarketData();
  const feed = new PriceFeed(data.prices);
  const sideServer = createSideServer({ data, feed });
  const side = await listen(sideServer.app);

  const main = await listen(
    createApp({
      accountClient: new AccountClient(side.url),
      instrumentsClient: new InstrumentsClient(side.url),
      pricingStreamClient: new PricingStreamClient(side.url),
    }),
  );

  let clock = Date.parse(SEED_TIME);

  return {
    mainUrl: main.url,
    market: {
      pushPrice(instrument, { bid, ask }) {
        clock += 1000;
        const price = { instrument, bid, ask, time: new Date(clock).toISOString() };
        feed.publish(price);
        return price;
      },
      activeStreams: () => sideServer.activeStreams(),
    },
    async close() {
      await Promise.all([stop(main.server), stop(side.server)]);
    },
  };
}

async function listen(app: Koa): Promise<{ server: Server; url: string }> {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const { port } = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${port}` };
}

function stop(server: Server): Promise<void> {
  server.closeAllConnections();
  return new Promise((resolve) => server.close(() => resolve()));
}

export async function waitFor(condition: () => boolean, { timeoutMs = 1000, message = 'condition' } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error(`Timed out after ${timeoutMs}ms waiting for ${message}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
