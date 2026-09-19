# RP WORLD Production Architecture

RP WORLD uses a stateless application tier behind a CDN and load balancer, with a trusted server-side API layer.

## High-traffic path
Browser → CloudFront/Cloudflare → AWS ALB/Nginx → API gateway/rate limiting → stateless API services.

## Infrastructure controls
1. **Redis:** short-lived cache and distributed counters; never the source of truth.
2. **API rate limiting:** enforced server-side at the gateway; browser throttling is not security.
3. **Object storage:** private S3-compatible storage with signed upload/download URLs and server-side size/type validation.
4. **Background jobs:** Kafka or RabbitMQ with idempotent consumers, bounded retries, and dead-letter handling.
5. **CDN:** cache immutable public assets; never publicly cache private user responses.
6. **Read replicas:** PostgreSQL replicas for measured read-heavy workloads; writes go to the primary.
7. **Circuit breakers:** explicit timeouts, bounded retries with jitter, and circuit breakers around remote dependencies.
8. **Search:** Elasticsearch/OpenSearch is a rebuildable derived index; PostgreSQL remains authoritative.
9. **Observability:** OpenTelemetry plus Grafana/Datadog for latency, errors, saturation, queue depth, cache hit rate, and database health.

## Security boundary

The React/Vite browser must never connect directly to Redis, Kafka/RabbitMQ, Elasticsearch, or private S3 credentials. Those systems belong behind trusted server-side services.

Only the Supabase publishable browser key belongs in the frontend. Service-role keys, database passwords, Redis credentials, broker credentials, S3 secret keys, and telemetry secrets stay server-side.

## Failure rules

Every remote dependency gets an explicit timeout and bounded retries. Background consumers must be idempotent. Permanently failing jobs use a dead-letter path. Logs must never contain passwords, auth headers, session tokens, private messages, or secret values.

## Rollout order

Supabase schema/RLS → private media storage → server-side API gateway/rate limiting → Redis → queue/worker → CDN → read replicas when metrics justify them → search projection → circuit breakers → full OpenTelemetry/Grafana/Datadog.

Do not deploy distributed systems merely for appearance. Each adds cost and failure modes; introduce it when measured workload requires it.
