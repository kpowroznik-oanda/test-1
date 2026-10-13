import type { Account, Instrument, Price } from '../domain/types';

export const SEED_TIME = '2026-01-05T09:00:00.000Z';

export const INSTRUMENTS: Instrument[] = [
  { name: 'EUR_USD', base: 'EUR', quote: 'USD', displayPrecision: 5 },
  { name: 'GBP_USD', base: 'GBP', quote: 'USD', displayPrecision: 5 },
  { name: 'AUD_USD', base: 'AUD', quote: 'USD', displayPrecision: 5 },
  { name: 'USD_JPY', base: 'USD', quote: 'JPY', displayPrecision: 3 },
  { name: 'USD_CHF', base: 'USD', quote: 'CHF', displayPrecision: 5 },
  { name: 'USD_PLN', base: 'USD', quote: 'PLN', displayPrecision: 4 },
  { name: 'EUR_GBP', base: 'EUR', quote: 'GBP', displayPrecision: 5 },
];

export const ACCOUNTS: Account[] = [
  {
    id: 'acc-usd-001',
    currency: 'USD',
    positions: [
      { instrument: 'EUR_USD', units: 10000, averagePrice: '1.08000' },
      { instrument: 'USD_JPY', units: -5000, averagePrice: '150.000' },
    ],
  },
  {
    id: 'acc-pln-002',
    currency: 'PLN',
    positions: [
      { instrument: 'EUR_USD', units: 2500, averagePrice: '1.10000' },
      { instrument: 'EUR_GBP', units: 2000, averagePrice: '0.85000' },
      { instrument: 'USD_JPY', units: 0, averagePrice: '149.000' },
    ],
  },
  {
    id: 'acc-eur-003',
    currency: 'EUR',
    positions: [],
  },
];

export const INITIAL_PRICES: Price[] = [
  { instrument: 'EUR_USD', bid: '1.10250', ask: '1.10270', time: SEED_TIME },
  { instrument: 'GBP_USD', bid: '1.26990', ask: '1.27010', time: SEED_TIME },
  { instrument: 'AUD_USD', bid: '0.65010', ask: '0.65030', time: SEED_TIME },
  { instrument: 'USD_JPY', bid: '149.480', ask: '149.500', time: SEED_TIME },
  { instrument: 'USD_CHF', bid: '0.88000', ask: '0.88020', time: SEED_TIME },
  { instrument: 'USD_PLN', bid: '3.6051', ask: '3.6061', time: SEED_TIME },
  { instrument: 'EUR_GBP', bid: '0.85500', ask: '0.85520', time: SEED_TIME },
];

export interface MarketData {
  instruments: Instrument[];
  accounts: Account[];
  prices: Price[];
}

/** Fresh deep copy, so tests can't leak state into each other. */
export function createMarketData(): MarketData {
  return structuredClone({ instruments: INSTRUMENTS, accounts: ACCOUNTS, prices: INITIAL_PRICES });
}
