# RP WORLD — production architecture

RP WORLD is designed as a stateless web application with a protected backend/API layer and managed infrastructure.

## Request path

```
Browser
  ↓
CloudFront / Cloudflare CDN
  ↓
AWS ALB or Nginx ingress
  ↓
API gateway / edge authorization + rate limiting
  ↓
Stateless API services
  ├── PostgreSQL primary (Supabase)
  │    └── read replicas for read-heavy workloads
  ├── Redis
  │    └── cache / short-lived counters / distributed locks
  ├── Object storage (S3)
  │    └── avatars, covers, post media and other large files
  └── Message broker
       └── Kafka or RabbitMQ for asynchronous work

Search-heavy requests
  → Elasticsearch/OpenSearch

Telemetry
  → OpenTelemetry
  → Prometheus/Grafana and/or Datadog
```

## The nine infrastructure controls

| Requirement | RP WORLD design | Security rule |
|---|---|---|
| High traffic | CDN → load balancer → stateless API instances | No session state stored in an individual server |
| Slow database cache | Redis | Cache only non-sensitive, short-lived data; invalidate on writes |
| API abuse | API gateway + distributed rate limiting | Enforce limits server-side; never rely on browser throttling |
| Large files | S3-compatible object storage | Private buckets + signed upload/download URLs |
| Background tasks | Kafka/RabbitMQ | Idempotent consumers and retry/dead-letter handling |
| Global latency | CloudFront/Cloudflare | Cache public immutable assets; do not cache private user responses |
| Read-heavy DB | PostgreSQL read replicas | Writes always go to the primary |
| Service failures | Circuit breakers + timeouts | Fail closed for protected operations; bounded retries only |
| Search | Elasticsearch/OpenSearch | Search index is derived data, never the source of truth |
| Observability | OpenTelemetry + Grafana/Datadog | No passwords, tokens, private messages, or auth headers in logs |

## Important implementation boundary

The current React/Vite client must **not** connect directly to Redis, Kafka/RabbitMQ, Elasticsearch, or an S3 secret credential.

Those systems belong behind trusted server-side services.

Supabase's publishable browser key is intentionally used by the client with PostgreSQL RLS. Service-role keys, database passwords, Redis credentials, broker credentials, S3 secret keys, and observability ingestion secrets must remain server-side.

## Availability and failure policy

Every server-side dependency should have:

- explicit connection and request timeouts;
- bounded retries with exponential backoff and jitter;
- a circuit breaker for repeated upstream failures;
- idempotency for retryable writes/jobs;
- dead-letter handling for permanently failing jobs;
- structured logs with correlation/request IDs;
- metrics for latency, errors, saturation, queue depth, cache hit rate and database health.

Do not add infinite retries. A retry storm can turn a partial outage into a full outage.

## Data ownership

PostgreSQL/Supabase is the source of truth for user and application records.

Redis is a cache, not permanent storage.

S3 is the source of truth for binary objects.

Elasticsearch/OpenSearch is a rebuildable search projection.

Kafka/RabbitMQ is transport for asynchronous work, not the canonical database.

## Security baseline

- RLS remains enabled on user-owned Supabase tables.
- API authorization is performed server-side.
- Object storage uses private buckets by default.
- Uploads use signed URLs and server-side size/type validation.
- Rate limits are enforced before expensive operations.
- Search input is treated as untrusted input.
- Secrets are injected through deployment secret managers.
- Production services use TLS.
- Admin operations require separate authorization checks and audit logs.
- Observability systems receive redacted structured events.

## Rollout order

1. Secure Supabase schema and RLS.
2. Profile/media storage using private object storage.
3. Server-side API gateway/rate limiting.
4. Redis caching and distributed rate-limit counters.
5. Background job worker + queue.
6. CDN and immutable asset caching.
7. Read replicas when measured read load requires them.
8. Search projection.
9. Circuit breakers around every remote dependency.
10. Full OpenTelemetry/Grafana/Datadog observability.

Infrastructure should be introduced when the corresponding workload exists. Do not deploy Kafka, Elasticsearch, Redis, or read replicas merely for appearance; each adds operational failure modes and cost.
