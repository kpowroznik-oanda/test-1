import type { RouterMiddleware } from '@koa/router';
import type { AppDependencies } from '../app';

/**
 * GET /accounts/:accountId/upl/stream
 *
 * Streams the account's UPL as Server-Sent Events. See README.md for the contract.
 * `openSseStream()` from `src/lib/sse.ts` may come in handy.
 */
export function uplStreamHandler(deps: AppDependencies): RouterMiddleware {
  return async (ctx) => {
    // TODO: implement
    ctx.status = 501;
    ctx.body = { error: 'Not implemented' };
  };
}
