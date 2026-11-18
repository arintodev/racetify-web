# Payments — Provider Abstraction + Midtrans Snap

Status: implemented; backend and both apps build green. No live provider call was made (no
credentials/network exercised here).

## Design

```
apps/web ── POST /v1/public/orders/{orderNumber}/payments ──► commerce
                                                               │
                                                 payments::PaymentProvider
                                                    ├─ MidtransProvider (Snap)
                                                    └─ MockProvider (dev, disabled)

Midtrans ── POST /v1/public/payments/notifications ──► commerce
                                                         verify SHA-512 signature
                                                         update payment/order/registrations
```

- `crates/integrations/payments` owns the provider trait, normalized charge/refund/notification
  types, and the Midtrans adapter. Commerce never speaks Midtrans-specific JSON.
- The public payment endpoint requires the same order-access token/cookie as the receipt.
- The webhook is anonymous (public path, CSRF-token exempt), verifies the Midtrans SHA-512
  signature, and is safe to retry.
- The organizer settle endpoint is mock/dev-only; with Midtrans configured it returns
  `409 settlement_requires_provider`. The notification is authoritative.

## Configuration

| Variable | Purpose |
| --- | --- |
| `PAYMENT_PROVIDER` | `mock` (default) or `midtrans`. `mock` is rejected in production. |
| `MIDTRANS_SERVER_KEY` | Server key; required when `PAYMENT_PROVIDER=midtrans` |
| `MIDTRANS_IS_PRODUCTION` | `true` selects `app.midtrans.com` / `api.midtrans.com`; default sandbox |
| `PUBLIC_WEB_ORIGIN` | Public app origin used for the Snap finish URL (default `http://localhost:3001`) |

Midtrans dashboard notification URL: `https://<api-host>/v1/public/payments/notifications`
(register the API host directly; webhooks carry no cookies). Enable the notification for
"Payment notification" and refund/expire events.

## Flow

1. The registration wizard creates the order, then calls
   `POST /v1/public/orders/{orderNumber}/payments`.
2. Commerce reuses an existing pending payment with a non-expired redirect URL, otherwise asks the
   provider for a Snap transaction and stores `provider`, `provider_reference`, the redirect URL,
   and expiry in `provider_summary`.
3. The browser is redirected to the Snap page. Snap returns to
   `{PUBLIC_WEB_ORIGIN}/e/{slug}/register/success/{orderNumber}`.
4. Midtrans posts notifications. The API verifies the signature and transitions:
   - `capture` (fraud `accept`) / `settlement` → payment `success`, order `paid`, registrations
     confirmed, `order.paid` enqueued.
   - `pending` → payment `pending`.
   - `deny` / `cancel` / `failure` → payment `failed` (the order stays pending until expiry).
   - `expire` → payment `expired`.
   - `refund` / `partial_refund` → payment `refunded`; a paid order becomes refunded and its
     registrations are marked refunded.
5. The receipt shows the pending state with a **Pay now** button when payment is still outstanding.

## Refunds

Organizer refund endpoints no longer call the provider inside the database transaction. For a real
provider they insert a `pending` refund and enqueue `commerce.process_refund`; the worker calls
Midtrans (`POST /v2/{order_id}/refund`) without holding a transaction, then marks the refund, order,
payments, and registrations refunded and enqueues `order.refunded`. Provider failure marks the refund
`failed` with the error (a new refund request can retry). The mock provider keeps the synchronous
stub path.

The worker also reconciles pending payments and re-queues stale pending refunds every 10 minutes;
`PaymentProvider::status` queries `GET /v2/{order_id}/status`.

## Idempotency

- Public payment initiation accepts `Idempotency-Key`; a replay returns the stored payment id and
  reloads the payment (the redirect URL is stable until expiry).
- Provider notifications are naturally idempotent: a repeat success finds the order already paid
  and only updates the payment summary.
- Mock/unconfigured providers return `503 payment_not_configured`.

## Verification

- Backend: fmt, clippy `-D warnings`, build (selected crates because the running API locks
  `api.exe`), tests, module dependency check, OpenAPI regenerated.
- Frontend: contract sync/generate, typecheck, both lints, both builds.
- Live verification requires Midtrans sandbox credentials, the notification URL registered in
  Midtrans, and a public tunnel for the API; none were exercised here.
