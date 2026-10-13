import Koa from 'koa';
import Router from '@koa/router';
import type { AccountClient } from './clients/account-client';
import type { InstrumentsClient } from './clients/instruments-client';
import type { PricingStreamClient } from './clients/pricing-stream-client';
import { uplStreamHandler } from './upl/upl-stream';

export interface AppDependencies {
  accountClient: AccountClient;
  instrumentsClient: InstrumentsClient;
  pricingStreamClient: PricingStreamClient;
}

export function createApp(deps: AppDependencies): Koa {
  const app = new Koa();
  const router = new Router();

  router.get('/health', (ctx) => {
    ctx.body = { status: 'ok' };
  });
  router.get('/accounts/:accountId/upl/stream', uplStreamHandler(deps));

  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      console.error(error);
      ctx.status = 500;
      ctx.body = { error: 'Internal server error' };
    }
  });
  app.use(router.routes()).use(router.allowedMethods());

  return app;
}
