import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { UplEvent } from '../src/domain/types';
import { SEED_TIME } from '../src/side-server/fixtures';
import { type TestEnvironment, startTestEnvironment, waitFor } from './support/environment';
import { type SseTestClient, connectSse } from './support/sse-client';

describe('GET /accounts/:accountId/upl/stream', () => {
  let env: TestEnvironment;
  const clients: SseTestClient[] = [];

  const connect = async (accountId: string) => {
    const client = await connectSse(`${env.mainUrl}/accounts/${accountId}/upl/stream`);
    clients.push(client);
    return client;
  };

  beforeEach(async () => {
    env = await startTestEnvironment();
  });

  afterEach(async () => {
    for (const client of clients.splice(0)) client.close();
    await env.close();
  });

  it('responds 404 for an unknown account', async () => {
    const client = await connect('acc-does-not-exist');

    expect(client.status).toBe(404);
  });

  it('sends a `upl` snapshot as soon as the client connects', async () => {
    const client = await connect('acc-usd-001');

    expect(client.status).toBe(200);
    expect(client.contentType).toMatch(/^text\/event-stream/);
    expect(await client.nextEvent<UplEvent>()).toEqual({
      event: 'upl',
      data: {
        accountId: 'acc-usd-001',
        currency: 'USD',
        totalUpl: '241.72',
        positions: [
          { instrument: 'EUR_USD', units: 10000, upl: '225.00' },
          { instrument: 'USD_JPY', units: -5000, upl: '16.72' },
        ],
        time: SEED_TIME,
      },
    });
  });

  it('sends an updated event when the price of a position instrument changes', async () => {
    const client = await connect('acc-usd-001');
    await client.nextEvent();

    const price = env.market.pushPrice('EUR_USD', { bid: '1.10500', ask: '1.10520' });

    const { data } = await client.nextEvent<UplEvent>();
    expect(data.positions[0]).toEqual({ instrument: 'EUR_USD', units: 10000, upl: '250.00' });
    expect(data.totalUpl).toBe('266.72');
    expect(data.time).toBe(price.time);
  });

  it('sends an updated event when a conversion rate changes', async () => {
    const client = await connect('acc-pln-002');
    const snapshot = await client.nextEvent<UplEvent>();
    expect(snapshot.data).toMatchObject({
      currency: 'PLN',
      totalUpl: '68.33',
      positions: [
        { instrument: 'EUR_USD', units: 2500, upl: '22.54' },
        { instrument: 'EUR_GBP', units: 2000, upl: '45.79' },
      ],
    });

    env.market.pushPrice('USD_PLN', { bid: '3.7000', ask: '3.7010' });

    const { data } = await client.nextEvent<UplEvent>();
    expect(data.positions).toEqual([
      { instrument: 'EUR_USD', units: 2500, upl: '23.13' },
      { instrument: 'EUR_GBP', units: 2000, upl: '47.00' },
    ]);
    expect(data.totalUpl).toBe('70.13');
  });

  it('does not send an event when an unrelated instrument changes', async () => {
    const client = await connect('acc-usd-001');
    await client.nextEvent();

    env.market.pushPrice('AUD_USD', { bid: '0.66000', ask: '0.66020' });

    await client.expectNoEvent();
  });

  it('sends a zero snapshot for an account without open positions', async () => {
    const client = await connect('acc-eur-003');

    const { data } = await client.nextEvent<UplEvent>();
    expect(data).toMatchObject({ accountId: 'acc-eur-003', currency: 'EUR', totalUpl: '0.00', positions: [] });
  });

  it('closes the upstream price subscription when the client disconnects', async () => {
    const client = await connect('acc-pln-002');
    await client.nextEvent();
    expect(env.market.activeStreams()).toBeGreaterThan(0);

    client.close();

    await waitFor(() => env.market.activeStreams() === 0, { message: 'upstream price streams to be closed' });
  });
});
