import type { Account } from '../../domain/types';

export class AccountClient {
  constructor(private readonly baseUrl: string) {}

  /** Resolves to `undefined` when the account does not exist. */
  async getAccount(accountId: string): Promise<Account | undefined> {
    const response = await fetch(`${this.baseUrl}/accounts/${encodeURIComponent(accountId)}`);
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`GET /accounts/${accountId} failed with ${response.status}`);
    return (await response.json()) as Account;
  }
}
