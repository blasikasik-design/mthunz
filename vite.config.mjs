import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(workspaceRoot, 'storefront');

export default defineConfig({
  root: siteRoot,
  base: '/',
  publicDir: false,
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://nthuzi.onrender.com',
        changeOrigin: true,
        secure: true
      }
    }
  },
  build: {
    outDir: path.resolve(workspaceRoot, 'frontend/.site-build'),
    emptyOutDir: true,
    assetsDir: 'site-assets',
    rollupOptions: {
      input: {
        index: path.resolve(siteRoot, 'index.html'),
        shop: path.resolve(siteRoot, 'shop.html'),
        about: path.resolve(siteRoot, 'about.html'),
        contact: path.resolve(siteRoot, 'contact.html'),
        login: path.resolve(siteRoot, 'login.html'),
        signup: path.resolve(siteRoot, 'signup.html'),
        productDetail: path.resolve(siteRoot, 'product-detail.html'),
        payment: path.resolve(siteRoot, 'payment.html'),
        account: path.resolve(siteRoot, 'account.html'),
        adminLogin: path.resolve(siteRoot, 'admin-login.html'),
        admin: path.resolve(siteRoot, 'admin.html')
      }
    }
  }
});
