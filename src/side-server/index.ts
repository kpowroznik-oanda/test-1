import { createSideServer } from './app';
import { createMarketData } from './fixtures';
import { PriceFeed } from './price-feed';
import { startRandomWalk } from './random-walk';

export function startSideServer(port: number) {
  const data = createMarketData();
  const feed = new PriceFeed(data.prices);
  const { app } = createSideServer({ data, feed });
  startRandomWalk(feed, data.instruments);
  return app.listen(port, () => console.log(`side-server listening on http://localhost:${port}`));
}
