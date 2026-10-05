require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const db = require('./services/db');
const auth = require('./services/auth');
const settingsPath = path.join(__dirname, 'data', 'site-settings.json');

function getTokenSecret() {
  return process.env.ADMIN_TOKEN_SECRET || 'mthunzi-local-dev-secret';
}

const app = express();

if (!process.env.CLOUDINARY_URL && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

function createDefaultSettings() {
  return {
    storeName: 'Mthunzi Creations',
    storeEmail: 'mthunzicreations@gmail.com',
    storePhone: '+265 881799537',
    storeAddress: 'Lunzu Trading Centre, Off M1 Road, Blantyre.',
    storeDescription: 'Mthunzi Creations is a creative enterprise that offers different artistic services to meet your needs. We do screen printing, painting and drawing, illustrations, sign-writing, art lessons and consultancy. We are known for our best quality work.',
    aboutTitle: 'Mthunzi Born to Create',
    aboutText: 'Mthunzi Creations is a creative enterprise that offers different artistic services to meet your needs. We do screen printing, painting and drawing, illustrations, sign-writing, art lessons and consultancy. We are known for our best quality work.',
    contactHeading: 'We’re here to help you order, enquire, and create with confidence.',
    contactIntro: 'Whether you are looking for a custom piece, a quick order update, or help with payment proof, our team responds quickly and professionally.',
    contactPhone: '+265 881799537',
    contactEmail: 'mthunzicreations@gmail.com',
    contactAddress: 'Lunzu Trading Centre, Off M1 Road, Blantyre.',
    paymentAccountName: 'John Botha',
    paymentAccountNumber: '0880058488',
    paymentReferenceLabel: 'Reference number',
    paymentInstructions: 'Send the money to that number and the account name is John Botha. Please include the reference number in your payment note so we can match it quickly.',
    currency: 'MK — Malawian Kwacha',
    shippingThreshold: 'MK 50,000',
    storeOpen: true,
    lowStockAlerts: true,
    orderNotifications: true,
    categories: [
      { id: 'paintings', name: 'Paintings' },
      { id: 'drawings', name: 'Drawings' },
      { id: 't-shirts', name: 'T-Shirts' },
      { id: 'sculptures', name: 'Sculptures' },
      { id: 'prints', name: 'Prints' }
    ]
  };
}

function normalizeCategory(raw) {
  if (typeof raw === 'string') {
    const name = raw.trim();
    if (!name) return null;
    return { id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), name };
  }
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name || '').trim();
  if (!name) return null;
  const id = String(raw.id || '').trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return { id, name };
}

function normalizeCategories(rawCategories) {
  const defaults = createDefaultSettings().categories;
  const source = Array.isArray(rawCategories) ? rawCategories : defaults;
  const categories = source.map(normalizeCategory).filter(Boolean);
  return categories.length ? categories : defaults;
}

function readSiteSettings() {
  try {
    const raw = fs.readFileSync(settingsPath, 'utf8');
    const parsed = JSON.parse(raw);
    const defaults = createDefaultSettings();
    return {
      ...defaults,
      ...parsed,
      categories: normalizeCategories(parsed && Array.isArray(parsed.categories) ? parsed.categories : defaults.categories)
    };
  } catch (error) {
    return createDefaultSettings();
  }
}

function writeSiteSettings(nextSettings) {
  const defaults = createDefaultSettings();
  const normalized = {
    ...defaults,
    ...nextSettings,
    categories: normalizeCategories(nextSettings && nextSettings.categories)
  };
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(normalized, null, 2));
  return normalized;
}

async function ensureSchema() {
  const schemaPath = path.join(__dirname, '..', 'database', 'init.sql');
  await db.query(fs.readFileSync(schemaPath, 'utf8'));
  await db.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS badge VARCHAR(40) DEFAULT '';
    ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0;
    CREATE TABLE IF NOT EXISTS removed_accounts (
      email_hash CHAR(64) PRIMARY KEY,
      removed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
    ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  `);
}

async function ensureAdminCredentials() {
  const existing = await db.query('SELECT id FROM admin_credentials WHERE id = 1');
  if (existing.rowCount) return;

  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || !password) return;

  const passwordHash = await bcrypt.hash(password, 12);
  await db.query(
    'INSERT INTO admin_credentials (id, email, password_hash) VALUES (1, $1, $2) ON CONFLICT (id) DO NOTHING',
    [email, passwordHash]
  );
}

function createAdminToken(authVersion) {
  const secret = getTokenSecret();
  const expiresAt = Date.now() + 12 * 60 * 60 * 1000;
  const tokenData = `${expiresAt}.${authVersion}`;
  const signature = crypto.createHmac('sha256', secret).update(tokenData).digest('hex');
  return `${tokenData}.${signature}`;
}

function getAdminTokenVersion(token) {
  const secret = getTokenSecret();
  if (!token || typeof token !== 'string') return null;
  const [expiresAt, authVersion, signature] = token.split('.');
  if (!/^\d+$/.test(expiresAt || '') || !/^\d+$/.test(authVersion || '') || !/^[a-f0-9]{64}$/.test(signature || '') || Number(expiresAt) <= Date.now()) {
    return null;
  }
  const tokenData = `${expiresAt}.${authVersion}`;
  const expected = crypto.createHmac('sha256', secret).update(tokenData).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected)
    ? Number(authVersion)
    : null;
}

function createCustomerToken(userId) {
  const secret = getTokenSecret();
  const expiresAt = Date.now() + 12 * 60 * 60 * 1000;
  const tokenData = `customer.${expiresAt}.${userId}`;
  const signature = crypto.createHmac('sha256', secret).update(tokenData).digest('hex');
  return `${expiresAt}.${userId}.${signature}`;
}

function getCustomerTokenUserId(token) {
  const secret = getTokenSecret();
  if (!token || typeof token !== 'string') return null;
  const [expiresAt, userId, signature] = token.split('.');
  if (!/^\d+$/.test(expiresAt || '') || !/^\d+$/.test(userId || '') || !/^[a-f0-9]{64}$/.test(signature || '') || Number(expiresAt) <= Date.now()) {
    return null;
  }
  const tokenData = `customer.${expiresAt}.${userId}`;
  const expected = crypto.createHmac('sha256', secret).update(tokenData).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected)
    ? Number(userId)
    : null;
}

function requireCustomer(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer (.+)$/i);
  const userId = match ? getCustomerTokenUserId(match[1]) : null;
  const requestedUserId = Number.parseInt(req.params.id, 10);
  if (!userId || userId !== requestedUserId) {
    return res.status(401).json({ error: 'Customer authentication required.' });
  }
  req.customerId = userId;
  next();
}

async function requireAdmin(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer (.+)$/i);
  const tokenVersion = match ? getAdminTokenVersion(match[1]) : null;
  if (tokenVersion === null) {
    return res.status(401).json({ error: 'Admin authentication required.' });
  }
  try {
    const result = await db.query('SELECT auth_version FROM admin_credentials WHERE id = 1');
    if (!result.rowCount || Number(result.rows[0].auth_version) !== tokenVersion) {
      return res.status(401).json({ error: 'Admin session has expired. Please sign in again.' });
    }
    next();
  } catch (err) {
    console.error('Unable to verify admin session:', err.message || err);
    res.status(503).json({ error: 'Unable to verify admin session.' });
  }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
}

function isStrongPassword(value) {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(String(value || ''));
}

function isValidInternationalPhone(value) {
  return /^\+[1-9]\d{6,14}$/.test(String(value || '').trim());
}

async function uploadImageDataUrl(dataUrl, folder, maxBytes, allowedFormats) {
  const match = String(dataUrl || '').match(/^data:image\/([a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) {
    const error = new Error('Invalid image data payload.');
    error.code = 'INVALID_IMAGE_DATA';
    throw error;
  }
  if (allowedFormats && !allowedFormats.includes(match[1].toLowerCase())) {
    const error = new Error('Please choose a valid JPG, PNG, or WebP image.');
    error.code = 'INVALID_IMAGE_DATA';
    throw error;
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > maxBytes) {
    const error = new Error(`Image is too large. Maximum size is ${Math.round(maxBytes / (1024 * 1024))} MB.`);
    error.code = 'IMAGE_TOO_LARGE';
    throw error;
  }
  const configuration = cloudinary.config();
  if (!configuration.cloud_name || !configuration.api_key || !configuration.api_secret) {
    const error = new Error('Cloudinary is not configured on the server.');
    error.code = 'CLOUDINARY_NOT_CONFIGURED';
    throw error;
  }
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream({ folder, resource_type: 'image' }, (error, result) => {
      if (error) return reject(error);
      if (!result || !result.secure_url) return reject(new Error('Cloudinary did not return a secure image URL.'));
      resolve(result.secure_url);
    });
    upload.end(buffer);
  });
}

async function normalizeProductPayload(payload) {
  const next = { ...payload };
  const rawStock = next.stock;
  const normalizedStock = rawStock === undefined || rawStock === null || rawStock === ''
    ? 0
    : Number(rawStock);
  const stockValue = Number.isFinite(normalizedStock) ? Math.max(0, normalizedStock) : 0;
  next.stock = stockValue;
  next.in_stock = next.stock > 0;

  if (typeof next.image_url === 'string' && next.image_url.startsWith('data:image/')) {
    const maxBytes = Number(process.env.MAX_PRODUCT_IMAGE_BYTES || 80 * 1024 * 1024);
    next.image_url = await uploadImageDataUrl(next.image_url, 'mthunzi/products', maxBytes);
  }
  return next;
}

function handleProductImageError(err, res) {
  if (err.code === 'CLOUDINARY_NOT_CONFIGURED') {
    return res.status(503).json({ error: err.message });
  }
  if (err.code === 'IMAGE_TOO_LARGE') {
    return res.status(413).json({ error: err.message });
  }
  if (err.code === 'INVALID_IMAGE_DATA') {
    return res.status(400).json({ error: err.message });
  }
  return null;
}

let agedOrderUpdateStarted = false;

async function startServer(port) {
  await ensureSchema();
  await ensureAdminCredentials();

  if (!agedOrderUpdateStarted) {
    agedOrderUpdateStarted = true;
    const updateAgedOrders = () => db.markOrdersDeliveredAfter30Days().catch(err => {
      console.error('Unable to update orders older than 30 days:', err.message || err);
    });
    updateAgedOrders();
    const deliveryInterval = setInterval(updateAgedOrders, 60 * 60 * 1000);
    deliveryInterval.unref();
  }

  const listen = nextPort => {
    const server = app.listen(nextPort, '0.0.0.0', () => {
      console.log(`Server started on http://localhost:${nextPort}`);
    });

    server.on('error', err => {
      if (err.code === 'EADDRINUSE') {
        const fallbackPort = nextPort + 1;
        console.warn(`Port ${nextPort} is busy. Trying http://localhost:${fallbackPort} instead.`);
        listen(fallbackPort);
      } else {
        console.error(err);
        process.exit(1);
      }
    });
  };

  listen(port);
}

if (require.main === module) {
  startServer(Number(process.env.PORT || 3000)).catch(err => {
    console.error('Schema initialization failed. Check DATABASE_URL and database permissions.');
    console.error(err.message || err);
    process.exit(1);
  });
}

module.exports = {
  createDefaultSettings,
  readSiteSettings,
  normalizeProductPayload,
  isValidInternationalPhone,
  createCustomerToken,
  getCustomerTokenUserId,
  app
};

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request payload is too large.' });
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload.' });
  }
  next(err);
});
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  return express.static(path.join(__dirname, '..', 'frontend'))(req, res, next);
});
app.use('/api/admin', (req, res, next) => {
  if (req.path === '/login') return next();
  return requireAdmin(req, res, next);
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await db.getProducts();
    res.json({ data: products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to load products.' });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    await db.checkConnection();
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    console.error('Database health check failed:', err.message);
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const normalizedPhone = String(phone || '').trim();
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and include a letter and number.' });
    }
    if (normalizedPhone && !isValidInternationalPhone(normalizedPhone)) {
      return res.status(400).json({ error: 'Please enter a valid phone number with its country code.' });
    }
    const user = await auth.createUser({ name, email, phone: normalizedPhone || null, password });
    res.status(201).json({ data: { ...user, token: createCustomerToken(user.id) } });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    res.status(500).json({ error: 'Unable to create user.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }
    const account = await auth.findUserByEmail(email);
    if (!account && await auth.wasAccountRemoved(email)) {
      return res.status(401).json({ error: 'Your account was removed by the store owner. Please contact the owner for more information.' });
    }
    const user = await auth.verifyUserPassword(account, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid login credentials.' });
    }
    res.json({ data: { ...user, token: createCustomerToken(user.id) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const result = await db.query('SELECT id, email, password_hash, auth_version FROM admin_credentials WHERE id = 1');
    const admin = result.rows[0];
    if (!admin) {
      return res.status(503).json({ error: 'Admin login is not configured.' });
    }
    const passwordMatches = await bcrypt.compare(String(password), admin.password_hash);
    if (String(email).trim().toLowerCase() === admin.email && passwordMatches) {
      return res.json({ 
        data: { 
          id: admin.id,
          name: 'Admin',
          email: admin.email,
          token: createAdminToken(admin.auth_version)
        } 
      });
    }
    
    res.status(401).json({ error: 'Invalid admin credentials.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

app.put('/api/admin/credentials', async (req, res) => {
  try {
    const email = String(req.body && req.body.email || '').trim().toLowerCase();
    const currentPassword = String(req.body && req.body.currentPassword || '');
    const newPassword = String(req.body && req.body.newPassword || '');
    if (!email || !currentPassword) {
      return res.status(400).json({ error: 'Email and current password are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (newPassword && !isStrongPassword(newPassword)) {
      return res.status(400).json({ error: 'New password must be at least 8 characters and include a letter and number.' });
    }

    const current = await db.query('SELECT password_hash FROM admin_credentials WHERE id = 1');
    const admin = current.rows[0];
    if (!admin || !await bcrypt.compare(currentPassword, admin.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const passwordHash = newPassword ? await bcrypt.hash(newPassword, 12) : admin.password_hash;
    const updated = await db.query(
      'UPDATE admin_credentials SET email = $1, password_hash = $2, auth_version = auth_version + 1, updated_at = now() WHERE id = 1 RETURNING email',
      [email, passwordHash]
    );
    res.json({ data: { email: updated.rows[0].email } });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'That email is already in use.' });
    }
    res.status(500).json({ error: 'Unable to update admin credentials.' });
  }
});

app.get('/api/user/:id/orders', requireCustomer, async (req, res) => {
  try {
    const orders = await db.getOrdersForUser(req.customerId);
    res.json({ data: orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to fetch your orders.' });
  }
});

app.put('/api/user/:id/avatar', requireCustomer, async (req, res) => {
  try {
    const avatarUrl = await uploadImageDataUrl(req.body && req.body.image, 'mthunzi/avatars', 5 * 1024 * 1024, ['jpeg', 'jpg', 'png', 'webp']);
    const user = await auth.updateUser({ id: req.customerId, avatarUrl });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ data: user });
  } catch (err) {
    console.error('Customer avatar upload failed:', err.message || err);
    const imageErrorResponse = handleProductImageError(err, res);
    if (imageErrorResponse) return imageErrorResponse;
    res.status(502).json({ error: 'Unable to upload your photo. Please try again.' });
  }
});

app.get('/api/user/:id', requireCustomer, async (req, res) => {
  try {
    const user = await auth.findUserById(parseInt(req.params.id, 10));
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to fetch user.' });
  }
});

app.patch('/api/user/:id', requireCustomer, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, email, phone, password, removeAvatar } = req.body;
    const user = await auth.updateUser({ id, name, email, phone, password, avatarUrl: removeAvatar === true ? null : undefined });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ data: user });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    res.status(500).json({ error: 'Unable to update user.' });
  }
});

// Admin endpoints
app.get('/api/admin/customers', async (req, res) => {
  try {
    const customers = await db.getCustomers();
    res.json({ data: customers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to fetch customers.' });
  }
});

app.delete('/api/admin/customers/:id', async (req, res) => {
  try {
    const customerId = parseInt(req.params.id, 10);
    if (!Number.isInteger(customerId) || customerId < 1) {
      return res.status(400).json({ error: 'Invalid customer ID.' });
    }
    const deleted = await db.deleteCustomer(customerId);
    if (!deleted) return res.status(404).json({ error: 'Customer not found.' });
    res.json({ data: { id: customerId, message: 'Customer account removed.' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to remove customer account.' });
  }
});

app.get('/api/admin/orders', async (req, res) => {
  try {
    await db.markOrdersDeliveredAfter30Days();
    const orders = await db.getOrders();
    res.json({ data: orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to fetch orders.' });
  }
});

app.patch('/api/admin/orders/:id', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Order status is required.' });
    }
    const updated = await db.updateOrderStatus(orderId, status);
    if (!updated) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to update order status.' });
  }
});

app.get('/api/admin/messages', async (req, res) => {
  try {
    const messages = await db.getMessages();
    res.json({ data: messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to fetch messages.' });
  }
});

app.delete('/api/admin/messages/:id', async (req, res) => {
  try {
    const messageId = parseInt(req.params.id, 10);
    if (!Number.isInteger(messageId) || messageId < 1) {
      return res.status(400).json({ error: 'Invalid message ID.' });
    }
    const deleted = await db.deleteMessage(messageId);
    if (!deleted) return res.status(404).json({ error: 'Message not found.' });
    res.json({ data: { id: messageId, message: 'Message deleted.' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to delete message.' });
  }
});

app.post('/api/order', async (req, res) => {
  try {
    const { userId, items, totalAmount, paymentType, screenshotUrl } = req.body;
    if (!userId || !items || !totalAmount) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    const orderId = await db.createOrder({ userId, items, totalAmount, paymentType, screenshot: screenshotUrl });
    res.status(201).json({ data: { id: orderId, message: 'Order created successfully.' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to create order.' });
  }
});

app.post('/api/admin/products', async (req, res) => {
  try {
    const payload = await normalizeProductPayload(req.body);
    const product = await db.createProduct(payload);
    res.status(201).json({ data: product });
  } catch (err) {
    console.error(err);
    const imageErrorResponse = handleProductImageError(err, res);
    if (imageErrorResponse) return imageErrorResponse;
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A product with that name already exists.' });
    }
    res.status(500).json({ error: 'Unable to create product.' });
  }
});

app.delete('/api/admin/products/:id', async (req, res) => {
  try {
    const deleted = await db.deleteProduct(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ data: { deleted: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to delete product.' });
  }
});

app.patch('/api/admin/products/:id', async (req, res) => {
  try {
    const payload = await normalizeProductPayload(req.body);
    const product = await db.updateProduct(req.params.id, payload);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ data: product });
  } catch (err) {
    console.error(err);
    const imageErrorResponse = handleProductImageError(err, res);
    if (imageErrorResponse) return imageErrorResponse;
    res.status(500).json({ error: 'Unable to update product.' });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, body } = req.body;
    if (!name || !email || !subject || !body) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    const message = await db.createMessage({ name, email, subject, body });
    res.status(201).json({ data: message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to send message.' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/site-settings', (req, res) => {
  try {
    res.json({ data: readSiteSettings() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to load site settings.' });
  }
});

app.get('/api/categories', (req, res) => {
  try {
    const settings = readSiteSettings();
    res.json({ data: settings.categories || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to load categories.' });
  }
});

app.post('/api/admin/categories', (req, res) => {
  try {
    const name = String(req.body && req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Category name is required.' });
    const current = readSiteSettings();
    const categories = normalizeCategories(current.categories);
    const exists = categories.some(category => category.name.toLowerCase() === name.toLowerCase());
    if (exists) return res.status(409).json({ error: 'Category already exists.' });
    const nextCategory = normalizeCategory(name);
    if (!nextCategory) return res.status(400).json({ error: 'Category name is invalid.' });
    const next = writeSiteSettings({ ...current, categories: [...categories, nextCategory] });
    res.status(201).json({ data: next.categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to create category.' });
  }
});

app.patch('/api/admin/categories/:id', (req, res) => {
  try {
    const id = req.params.id;
    const name = String(req.body && req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Category name is required.' });
    const current = readSiteSettings();
    const categories = normalizeCategories(current.categories);
    const existingIndex = categories.findIndex(category => category.id === id);
    if (existingIndex === -1) return res.status(404).json({ error: 'Category not found.' });
    const nextCategory = normalizeCategory(name);
    if (!nextCategory) return res.status(400).json({ error: 'Category name is invalid.' });
    const duplicate = categories.some(category => category.id !== id && category.name.toLowerCase() === name.toLowerCase());
    if (duplicate) return res.status(409).json({ error: 'Category already exists.' });
    categories[existingIndex] = { ...categories[existingIndex], ...nextCategory };
    const next = writeSiteSettings({ ...current, categories });
    res.json({ data: next.categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to update category.' });
  }
});

app.delete('/api/admin/categories/:id', (req, res) => {
  try {
    const id = req.params.id;
    const current = readSiteSettings();
    const categories = normalizeCategories(current.categories);
    const nextCategories = categories.filter(category => category.id !== id);
    if (nextCategories.length === categories.length) return res.status(404).json({ error: 'Category not found.' });
    const next = writeSiteSettings({ ...current, categories: nextCategories });
    res.json({ data: next.categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to delete category.' });
  }
});

app.put('/api/admin/site-settings', (req, res) => {
  try {
    const current = readSiteSettings();
    const next = writeSiteSettings({ ...current, ...req.body });
    res.json({ data: next });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to save site settings.' });
  }
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Route not found.' });
  }
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});
