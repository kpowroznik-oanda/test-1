# Task 1: UPL stream

**Time: 20 minutes. AI assistants (Claude Code) are allowed.**

You're on a team that serves real-time trading data to web and mobile clients.
Clients want to see the **unrealized profit/loss (UPL)** of their open positions,
**in their account currency**, updated live.

Your job: make the failing tests pass. Tests were written first (TDD) and are
the spec, together with this README. Please talk us through what you're doing
as you go. We care more about your reasoning than about typing speed.

```bash
npm test            # run all tests once
npm run test:watch  # watch mode
npm run typecheck   # tsc
npm run dev         # side-server on :4001 with random prices + main app on :4000
```

## What's in the box

```
src/
  domain/types.ts                  Shared types: Account, Position, Instrument, Price, UplEvent
  lib/sse.ts                       openSseStream(ctx): SSE helper for Koa (send / onClose / close)
  lib/sse-parser.ts                Low-level SSE reader (used by the clients)
  side-server/                     Mock upstream APIs (accounts, instruments, prices). Don't change.
  main/
    app.ts                         Koa app + routes
    clients/                       Ready-to-use clients for the side-server:
      account-client.ts              getAccount(id)       -> Account | undefined
      instruments-client.ts          list()               -> Instrument[]
      pricing-stream-client.ts       subscribe(names, {onPrice, onError}) -> { close() }
    upl/
      upl-calculator.ts            TODO: pure calculation logic
      upl-stream.ts                TODO: GET /accounts/:accountId/upl/stream
test/
  upl-calculator.test.ts           Unit tests for the calculator
  upl-stream.test.ts               Integration tests: real HTTP, side-server with controllable prices
```

You only need to change files in `src/main/upl/`. Add more files if you like.
`decimal.js` is already installed.

## Domain rules

**Instruments** are currency pairs `BASE_QUOTE`, e.g. `EUR_USD`: price = how many
USD for 1 EUR. Every price has a **bid** (what the market pays you when you sell)
and an **ask** (what you pay when you buy). `bid < ask`.

**Positions** have signed `units` (positive = long, negative = short, `0` = closed)
and an `averagePrice` (the open price). An account may hold **several positions in
the same instrument**. Value each one separately.

### 1. UPL in the quote currency

```
upl_quote = units × (closePrice − averagePrice)
```

`closePrice` is the price you would get by closing the position **now**:

- long (units > 0) → you'd sell → **bid**
- short (units < 0) → you'd buy → **ask**

Positions with `units = 0` are closed. **Omit them** from the output.

### 2. Conversion to the account currency

Convert `upl_quote` from the instrument's **quote currency** to the **account
currency** using the **mid price** `(bid + ask) / 2` of the conversion pair:

1. quote currency == account currency → no conversion
2. `QUOTE_HOME` pair exists → multiply by its mid
3. `HOME_QUOTE` pair exists → divide by its mid
4. otherwise, **cross through USD**: convert quote → USD, then USD → home
   (each leg via rule 2 or 3)

Every account in the data set can be converted with these rules.

### 3. Precision and rounding

- Prices arrive as decimal **strings**. Money must be exact. Watch out for
  binary floating point.
- Round each position's UPL to **2 decimal places, half away from zero**
  (`0.005 → 0.01`, `−0.005 → −0.01`).
- `totalUpl` = sum of the **rounded** position UPLs.
- All amounts in the output are strings with exactly 2 decimals, e.g. `"-3.10"`.

## Stream contract

`GET /accounts/:accountId/upl/stream`

- Unknown account → `404`.
- Otherwise `200`, `Content-Type: text/event-stream`, and a stream of events:

```
event: upl
data: {"accountId":"acc-pln-002","currency":"PLN","totalUpl":"68.33","positions":[{"instrument":"EUR_USD","units":2500,"upl":"22.54"},{"instrument":"EUR_GBP","units":2000,"upl":"45.79"}],"time":"2026-01-05T09:00:00.000Z"}
```

- **Snapshot:** send the first event as soon as prices for everything the
  account needs are known.
- **Updates:** send a new event whenever the price of an instrument the
  account depends on changes (position instruments **and** conversion pairs).
  Don't send events for unrelated instruments.
- `positions` keeps the order of the account's positions (closed ones omitted).
- `time` = the most recent `time` among the prices used. For an account with no
  open positions, send a single `totalUpl: "0.00"` event with the current time.
- When the client disconnects, release everything held for it, including the
  upstream price subscription.

## Side-server data

| Account       | Currency | Positions                                                          |
| ------------- | -------- | ------------------------------------------------------------------ |
| `acc-usd-001` | USD      | EUR_USD +10000 @ 1.08000, USD_JPY −5000 @ 150.000                  |
| `acc-pln-002` | PLN      | EUR_USD +2500 @ 1.10000, EUR_GBP +2000 @ 0.85000, USD_JPY 0 (closed) |
| `acc-eur-003` | EUR      | none                                                               |

Instruments: `EUR_USD`, `GBP_USD`, `AUD_USD`, `USD_JPY`, `USD_CHF`, `USD_PLN`, `EUR_GBP`.
See `src/side-server/fixtures.ts` for the initial prices.
