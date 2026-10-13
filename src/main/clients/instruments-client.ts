import type { Instrument } from '../../domain/types';

export class InstrumentsClient {
  private cache?: Promise<Instrument[]>;

  constructor(private readonly baseUrl: string) {}

  /** All tradeable instruments. The list is static, so it is fetched once and cached. */
  list(): Promise<Instrument[]> {
    this.cache ??= this.fetchInstruments().catch((error: unknown) => {
      this.cache = undefined;
      throw error;
    });
    return this.cache;
  }

  private async fetchInstruments(): Promise<Instrument[]> {
    const response = await fetch(`${this.baseUrl}/instruments`);
    if (!response.ok) throw new Error(`GET /instruments failed with ${response.status}`);
    const body = (await response.json()) as { instruments: Instrument[] };
    return body.instruments;
  }
}
