const test = require('node:test');
const assert = require('node:assert/strict');

const { createDefaultSettings, readSiteSettings, normalizeProductPayload, isValidInternationalPhone, app } = require('./app');
const db = require('./services/db');

test('default payment settings include the configured account details', () => {
  const settings = createDefaultSettings();

  assert.equal(settings.paymentAccountName, 'John Botha');
  assert.equal(settings.paymentAccountNumber, '0880058488');
  assert.equal(settings.paymentReferenceLabel, 'Reference number');
  assert.ok(settings.paymentInstructions.includes('Send the money to that number'));
  assert.ok(settings.paymentInstructions.includes('John Botha'));

  const persisted = readSiteSettings();
  assert.equal(persisted.paymentAccountName, 'John Botha');
  assert.equal(persisted.paymentAccountNumber, '0880058488');
});

test('stock status flags low inventory and high inventory correctly', () => {
  assert.deepEqual(db.getStockStatus(0), { label: 'Out of Stock', cls: 'danger', amount: 0 });
  assert.deepEqual(db.getStockStatus(4), { label: 'Low Stock', cls: 'warning', amount: 4 });
  assert.deepEqual(db.getStockStatus(6), { label: 'High Stock', cls: 'success', amount: 6 });
  assert.deepEqual(db.getStockStatus(12), { label: 'High Stock', cls: 'success', amount: 12 });
});

test('missing stock values stay at zero unless explicitly provided', async () => {
  const normalized = await normalizeProductPayload({ name: 'Sample artwork', price: 3000 });
  assert.equal(normalized.stock, 0);
  assert.equal(normalized.in_stock, false);

  const explicit = await normalizeProductPayload({ name: 'Sample artwork', price: 3000, stock: 12 });
  assert.equal(explicit.stock, 12);
  assert.equal(explicit.in_stock, true);
});

test('international phone numbers must be valid E.164 values', () => {
  assert.equal(isValidInternationalPhone('+265991234567'), true);
  assert.equal(isValidInternationalPhone('+447911123456'), true);
  assert.equal(isValidInternationalPhone('0991234567'), false);
  assert.equal(isValidInternationalPhone('+0123456789'), false);
});

test('admin API rejects requests without a bearer token', async () => {
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise(resolve => server.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const protectedRoutes = [
      { path: '/api/admin/customers', method: 'GET' },
      { path: '/api/admin/credentials', method: 'PUT' },
      { path: '/api/user/1', method: 'GET' },
      { path: '/api/user/1', method: 'PATCH' },
      { path: '/api/user/1/avatar', method: 'PUT' },
      { path: '/api/user/1/orders', method: 'GET' }
    ];
    for (const route of protectedRoutes) {
      const response = await fetch(baseUrl + route.path, { method: route.method });
      assert.equal(response.status, 401, `${route.path} should require authentication`);
    }
  } finally {
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
});
