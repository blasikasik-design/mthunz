const fs = require('node:fs')
const path = require('node:path')

const workspaceRoot = path.resolve(__dirname, '..')
const frontendRoot = path.join(workspaceRoot, 'frontend')
const buildRoot = path.join(frontendRoot, '.site-build')
const pageNames = ['index.html', 'shop.html', 'about.html', 'contact.html', 'login.html', 'signup.html', 'product-detail.html', 'payment.html', 'account.html', 'admin-login.html', 'admin.html']

for (const pageName of pageNames) {
  fs.copyFileSync(path.join(buildRoot, pageName), path.join(frontendRoot, pageName))
}

const builtAssets = path.join(buildRoot, 'site-assets')
const publishedAssets = path.join(frontendRoot, 'site-assets')
fs.rmSync(publishedAssets, { recursive: true, force: true })
fs.cpSync(builtAssets, publishedAssets, { recursive: true })
fs.rmSync(buildRoot, { recursive: true, force: true })
