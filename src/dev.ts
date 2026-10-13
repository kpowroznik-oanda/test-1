import { startMainServer } from './main';
import { startSideServer } from './side-server';

const SIDE_SERVER_PORT = 4001;
const MAIN_PORT = 4000;

startSideServer(SIDE_SERVER_PORT);
startMainServer(MAIN_PORT, `http://localhost:${SIDE_SERVER_PORT}`);

console.log(`
Try:
  curl -N http://localhost:${MAIN_PORT}/accounts/acc-usd-001/upl/stream
  curl -N http://localhost:${MAIN_PORT}/accounts/acc-pln-002/upl/stream
  curl -N "http://localhost:${SIDE_SERVER_PORT}/prices/stream?instruments=EUR_USD,USD_PLN"
`);
