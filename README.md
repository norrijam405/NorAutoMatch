# NorAutoMatch — Elite Full-Stack Template Architecture

Production-grade template designed to handle high concurrency, resist network
partitions, prevent duplicate data processing, and maximize frontend performance.

## System Topology

```
 [Astro Frontend Island]  ---> Pure Static HTML (0B Client JS)
          │
          └───► (Scrolls into View) ───► [React Interactive Cart]
                                                   │
                                                   ▼
                                     [Express API Engine]
                                                   │  (single Postgres transaction)
                              1. INSERT INTO products
                              2. INSERT INTO outbox_tasks
                                                   │  (atomic commit)
                                                   ▼
                                     [PostgreSQL Database]
                                                   │
                                                   ▼
                                     [Outbox Daemon Relay]
                              1. Polls DB (FOR UPDATE SKIP LOCKED)
                              2. Relays event to Redis queue
                              3. Marks status 'completed' in Postgres
                                                   │
                                                   ▼
                                       [Redis Cluster Cache]
                                                   │
                                                   ▼
                                       [BullMQ Worker Pool]
                              1. Pops job payload from Redis
                              2. Idempotency lock via atomic SET NX EX
                              3. Aborts duplicates / executes core sync
```

## Repository Layout

| Path | Role |
| --- | --- |
| `infrastructure/schema.sql` | Postgres tables, ENUM state machine, GIN + partial indexes, audit triggers |
| `backend/src/queue.ts` | BullMQ queue + resilient Redis connection (exponential backoff, auto-pruning) |
| `backend/src/server.ts` | Express API — atomic product + outbox write in one transaction |
| `backend/src/relay.ts` | Outbox daemon — `FOR UPDATE SKIP LOCKED` sweep → Redis hand-off |
| `backend/src/worker.ts` | BullMQ worker pool with `SET NX EX` idempotency lock layer |
| `frontend/` | Astro static-first site; React cart island hydrated with `client:visible` |
| `docker-compose.yml` | Single-click deployment of all six services |

## Single-Click Deployment

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- API engine: http://localhost:4000
- Postgres is auto-migrated on first boot via `infrastructure/schema.sql`.
- The worker pool runs 2 replicas — duplicates are safely aborted by the lock layer.

## Local Development (no Docker)

```bash
# 1. Provision infrastructure (needs local Postgres + Redis)
createdb norautomatch && psql norautomatch < infrastructure/schema.sql

# 2. Backend (three processes)
cd backend && npm install
npm run dev:api      # Express engine :4000
npm run dev:relay    # Outbox sweep daemon
npm run dev:worker   # BullMQ worker pool

# 3. Frontend
cd frontend && npm install && npm run dev   # Astro :3000, /api proxied to :4000
```

Copy `.env.example` to `.env` and adjust connection strings as needed.

## Delivery Guarantees

- **Atomicity** — product row and outbox task commit together or not at all.
- **Partition resistance** — if Redis is down, events wait in Postgres; the relay
  retries with attempt tracking and parks exhausted tasks as `failed`.
- **Exactly-once effects** — outbox UUID doubles as the BullMQ `jobId`
  (broker-level dedupe) and workers acquire an atomic `SET NX EX` lock before
  executing side effects (consumer-level dedupe).
- **Horizontal scale** — `FOR UPDATE SKIP LOCKED` lets multiple relay daemons
  sweep concurrently without double-sends; workers scale freely.

## Smoke Test

```bash
curl -X POST http://localhost:4000/api/products \
  -H 'Content-Type: application/json' \
  -d '{"title":"Nordic Trail Jacket","price":189.00,"tags":["outdoor"]}'
```

Watch the relay log the hand-off and the worker execute (or safely skip a
duplicate of) the background sync.
