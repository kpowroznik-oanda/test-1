/**
 * Prices and average prices are decimal strings (e.g. "1.10250"), exactly as
 * the upstream API sends them. Units are signed integers: positive = long,
 * negative = short, 0 = closed position.
 */

export interface Instrument {
  /** e.g. "EUR_USD" */
  name: string;
  /** e.g. "EUR" */
  base: string;
  /** e.g. "USD" */
  quote: string;
  displayPrecision: number;
}

export interface Position {
  instrument: string;
  units: number;
  averagePrice: string;
}

export interface Account {
  id: string;
  /** Account (home) currency, e.g. "PLN" */
  currency: string;
  positions: Position[];
}

export interface Price {
  instrument: string;
  bid: string;
  ask: string;
  /** ISO-8601 timestamp */
  time: string;
}

export interface PositionUpl {
  instrument: string;
  units: number;
  /** Unrealized P/L in the account currency, 2 decimal places, e.g. "-12.40" */
  upl: string;
}

export interface UplResult {
  /** Sum of the (already rounded) position UPLs, 2 decimal places */
  totalUpl: string;
  positions: PositionUpl[];
}

/** Payload of a single `upl` SSE event. */
export interface UplEvent extends UplResult {
  accountId: string;
  currency: string;
  /** The most recent `time` among the prices used in the calculation */
  time: string;
}
