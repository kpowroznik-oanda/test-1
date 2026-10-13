import type { Account, Instrument, Price, UplResult } from '../../domain/types';

/**
 * Pure UPL (unrealized profit/loss) logic. No I/O.
 * The calculation rules are described in README.md.
 */
export class UplCalculator {
  constructor(private readonly instruments: Instrument[]) {}

  /**
   * Names of all instruments whose prices are needed to value the account:
   * the instruments of its open positions plus any instruments required to
   * convert their P/L into the account currency.
   */
  requiredInstruments(account: Account): string[] {
    // TODO: implement
    throw new Error('Not implemented');
  }

  /**
   * Values every open position of the account in the account currency.
   * `prices` is keyed by instrument name and contains (at least) every
   * instrument returned by `requiredInstruments(account)`.
   */
  calculate(account: Account, prices: ReadonlyMap<string, Price>): UplResult {
    // TODO: implement
    throw new Error('Not implemented');
  }
}
