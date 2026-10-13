import { describe, expect, it } from 'vitest';
import type { Account, Position, Price } from '../src/domain/types';
import { UplCalculator } from '../src/main/upl/upl-calculator';
import { INSTRUMENTS } from '../src/side-server/fixtures';

const TIME = '2026-01-05T09:00:00.000Z';

const account = (currency: string, positions: Position[]): Account => ({ id: 'acc-test', currency, positions });

const pricesOf = (...quotes: Array<[instrument: string, bid: string, ask: string]>): Map<string, Price> =>
  new Map(quotes.map(([instrument, bid, ask]) => [instrument, { instrument, bid, ask, time: TIME }]));

describe('UplCalculator', () => {
  const calculator = new UplCalculator(INSTRUMENTS);

  describe('calculate()', () => {
    it('values a long position at the bid price', () => {
      const result = calculator.calculate(
        account('USD', [{ instrument: 'EUR_USD', units: 10000, averagePrice: '1.10000' }]),
        pricesOf(['EUR_USD', '1.10250', '1.10270']),
      );

      expect(result).toEqual({
        totalUpl: '25.00',
        positions: [{ instrument: 'EUR_USD', units: 10000, upl: '25.00' }],
      });
    });

    it('values a short position at the ask price', () => {
      const result = calculator.calculate(
        account('USD', [{ instrument: 'EUR_USD', units: -10000, averagePrice: '1.10500' }]),
        pricesOf(['EUR_USD', '1.10250', '1.10270']),
      );

      expect(result.positions).toEqual([{ instrument: 'EUR_USD', units: -10000, upl: '23.00' }]);
    });

    it('values each position separately when several are held in the same instrument', () => {
      // 500 × (1.10001 − 1.10000) = 0.005 → 0.01
      // −500 × (1.10003 − 1.10004) = 0.005 → 0.01
      const result = calculator.calculate(
        account('USD', [
          { instrument: 'EUR_USD', units: 500, averagePrice: '1.10000' },
          { instrument: 'EUR_USD', units: -500, averagePrice: '1.10004' },
        ]),
        pricesOf(['EUR_USD', '1.10001', '1.10003']),
      );

      expect(result).toEqual({
        totalUpl: '0.02', // sum of the rounded position values, not round(0.005 + 0.005)
        positions: [
          { instrument: 'EUR_USD', units: 500, upl: '0.01' },
          { instrument: 'EUR_USD', units: -500, upl: '0.01' },
        ],
      });
    });

    it('rounds half away from zero, also for losses', () => {
      // −500 × (1.10001 − 1.10000) = −0.005 → −0.01
      const result = calculator.calculate(
        account('USD', [{ instrument: 'EUR_USD', units: -500, averagePrice: '1.10000' }]),
        pricesOf(['EUR_USD', '1.09998', '1.10001']),
      );

      expect(result).toEqual({
        totalUpl: '-0.01',
        positions: [{ instrument: 'EUR_USD', units: -500, upl: '-0.01' }],
      });
    });

    it('omits closed positions (units = 0)', () => {
      const result = calculator.calculate(
        account('USD', [
          { instrument: 'USD_JPY', units: 0, averagePrice: '149.000' },
          { instrument: 'EUR_USD', units: 10000, averagePrice: '1.10000' },
        ]),
        pricesOf(['EUR_USD', '1.10250', '1.10270']),
      );

      expect(result).toEqual({
        totalUpl: '25.00',
        positions: [{ instrument: 'EUR_USD', units: 10000, upl: '25.00' }],
      });
    });

    it('converts to the account currency using the mid price of the quote/home pair', () => {
      // 2500 × (1.10250 − 1.10000) = 6.25 USD; USD_PLN mid = 3.6056 → 22.535 PLN → 22.54
      const result = calculator.calculate(
        account('PLN', [{ instrument: 'EUR_USD', units: 2500, averagePrice: '1.10000' }]),
        pricesOf(['EUR_USD', '1.10250', '1.10270'], ['USD_PLN', '3.6051', '3.6061']),
      );

      expect(result.positions).toEqual([{ instrument: 'EUR_USD', units: 2500, upl: '22.54' }]);
    });

    it('converts using the inverse pair when only home/quote exists', () => {
      // −5000 × (149.500 − 150.000) = 2500 JPY; USD_JPY mid = 149.49 → 16.7235… USD → 16.72
      const result = calculator.calculate(
        account('USD', [{ instrument: 'USD_JPY', units: -5000, averagePrice: '150.000' }]),
        pricesOf(['USD_JPY', '149.480', '149.500']),
      );

      expect(result.positions).toEqual([{ instrument: 'USD_JPY', units: -5000, upl: '16.72' }]);
    });

    it('converts through USD when there is no direct pair between quote and home currency', () => {
      // 2000 × (0.85500 − 0.85000) = 10 GBP; × GBP_USD mid 1.27 × USD_PLN mid 3.6056 = 45.79112 PLN
      const result = calculator.calculate(
        account('PLN', [{ instrument: 'EUR_GBP', units: 2000, averagePrice: '0.85000' }]),
        pricesOf(['EUR_GBP', '0.85500', '0.85520'], ['GBP_USD', '1.26990', '1.27010'], ['USD_PLN', '3.6051', '3.6061']),
      );

      expect(result.positions).toEqual([{ instrument: 'EUR_GBP', units: 2000, upl: '45.79' }]);
    });
  });

  describe('requiredInstruments()', () => {
    it('returns position instruments plus the pairs needed for currency conversion', () => {
      const required = calculator.requiredInstruments(
        account('PLN', [
          { instrument: 'EUR_USD', units: 2500, averagePrice: '1.10000' },
          { instrument: 'EUR_GBP', units: 2000, averagePrice: '0.85000' },
          { instrument: 'EUR_USD', units: -100, averagePrice: '1.10100' },
          { instrument: 'USD_JPY', units: 0, averagePrice: '149.000' },
        ]),
      );

      expect([...required].sort()).toEqual(['EUR_GBP', 'EUR_USD', 'GBP_USD', 'USD_PLN']);
    });
  });
});
