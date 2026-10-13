import { createApp } from './app';
import { AccountClient } from './clients/account-client';
import { InstrumentsClient } from './clients/instruments-client';
import { PricingStreamClient } from './clients/pricing-stream-client';

export function startMainServer(port: number, sideServerUrl: string) {
  const app = createApp({
    accountClient: new AccountClient(sideServerUrl),
    instrumentsClient: new InstrumentsClient(sideServerUrl),
    pricingStreamClient: new PricingStreamClient(sideServerUrl),
  });
  return app.listen(port, () => console.log(`main server listening on http://localhost:${port}`));
}
