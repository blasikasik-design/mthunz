# PayChangu Setup

Configure these environment variables on the Node server:

```env
PAYCHANGU_SECRET_KEY=your_paychangu_secret_key
PAYCHANGU_WEBHOOK_SECRET=your_paychangu_webhook_secret
APP_URL=https://your-public-store-domain.example
```

Use a PayChangu test secret key while testing and a live secret key for production. Keep the secret key on the server; do not add it to frontend files or commit it to the repository. `APP_URL` must be the public HTTPS origin that serves both the store page and its `/api` routes. Do not include a path or trailing slash.

The server creates the payment-reference and payment-status columns during startup. Checkout creates a pending order using database product prices, redirects the customer to PayChangu, and verifies the returned transaction reference, amount, currency, and status on the server before marking the order paid. Unpaid checkout reservations are released after 24 hours.

In the PayChangu dashboard under **Settings → API & Webhooks**, configure the webhook URL as `https://your-public-store-domain.example/api/payments/paychangu/webhook` and copy its web secret into `PAYCHANGU_WEBHOOK_SECRET`. The webhook validates PayChangu's HMAC signature and then independently verifies the transaction with the API.