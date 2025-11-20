# YavlGold - Deployment Guide

## 🚀 Deployment Options

YavlGold is a static site that can be deployed to multiple platforms. Choose the one that fits your needs:

### Option 1: GitHub Pages (Free, Simple)

**Pros:**
- ✅ Free hosting
- ✅ Automatic HTTPS
- ✅ Custom domain support
- ✅ Direct from repository

**Setup:**
1. Go to repository Settings → Pages
2. Source: Deploy from branch `main`
3. Folder: `/ (root)`
4. Custom domain: `yavlgold.com`
5. Enforce HTTPS: ✅ Enabled

**DNS Configuration:**
```
Type: CNAME
Name: www
Value: yavlpro.github.io

Type: A
Name: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153
```

**Build:** Not needed (static HTML)

---

### Option 2: Vercel (Recommended)

**Pros:**
- ✅ Fast global CDN
- ✅ Automatic SSL
- ✅ Preview deployments for PRs
- ✅ Analytics included
- ✅ Edge functions support

**Setup:**
1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login and deploy:
```bash
vercel login
vercel --prod
```

3. Or connect via GitHub:
- Go to https://vercel.com/new
- Import `YavlPro/gold` repository
- Project settings:
  - Framework Preset: Other
  - Build Command: (leave empty)
  - Output Directory: `.`
  - Install Command: (leave empty)

4. Add custom domain in Vercel dashboard:
- Domain: `yavlgold.com`
- DNS: Follow Vercel instructions

**Environment Variables (Vercel Dashboard):**
```
VITE_SUPABASE_URL=https://gerzlzprkarikblqxpjt.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_HCAPTCHA_SITE_KEY=22069708-c388-4a48-b054-fc12c4ee0ab6
VITE_APP_URL=https://yavlgold.com
```

---

### Option 3: Netlify

**Pros:**
- ✅ Easy deployment
- ✅ Form handling
- ✅ Split testing
- ✅ Serverless functions

**Setup:**
1. Install Netlify CLI:
```bash
npm i -g netlify-cli
```

2. Login and deploy:
```bash
netlify login
netlify init
netlify deploy --prod
```

3. Or drag-and-drop in Netlify UI:
- Go to https://app.netlify.com/drop
- Drag your project folder
- Configure custom domain

**Environment Variables (Netlify Dashboard):**
Same as Vercel (see above)

---

### Option 4: Cloudflare Pages

**Pros:**
- ✅ Ultra-fast CDN
- ✅ Unlimited bandwidth
- ✅ Built-in analytics
- ✅ Workers support

**Setup:**
1. Go to https://dash.cloudflare.com/pages
2. Create a project
3. Connect to GitHub: `YavlPro/gold`
4. Build settings:
   - Framework preset: None
   - Build command: (leave empty)
   - Build output: `/`
5. Add custom domain

---

## 🔧 Pre-Deployment Checklist

- [ ] Update `CNAME` file with your domain
- [ ] Verify all environment variables
- [ ] Test authentication flow locally
- [ ] Check all links are working
- [ ] Verify hCaptcha is configured
- [ ] Test on mobile devices
- [ ] Run Lighthouse audit
- [ ] Check console for errors
- [ ] Verify SSL certificate
- [ ] Test all forms

---

## 🌍 DNS Configuration

**For Custom Domain (yavlgold.com):**

### GitHub Pages
```
Type: A
Name: @
Value: 185.199.108.153
```

### Vercel
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

### Netlify
```
Type: CNAME
Name: @
Value: yavlgold.netlify.app
```

### Cloudflare Pages
```
Type: CNAME
Name: @
Value: yavlgold.pages.dev
```

**Wait 24-48 hours for DNS propagation**

---

## 📊 Post-Deployment Monitoring

### Analytics Setup

**Google Analytics:**
1. Create property at https://analytics.google.com
2. Get tracking ID (G-XXXXXXXXXX)
3. Add to all HTML files:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**Plausible Analytics (Privacy-friendly alternative):**
```html
<script defer data-domain="yavlgold.com" src="https://plausible.io/js/script.js"></script>
```

### Performance Monitoring

**Tools to use:**
- Google PageSpeed Insights: https://pagespeed.web.dev/
- GTmetrix: https://gtmetrix.com/
- WebPageTest: https://www.webpagetest.org/

**Target Metrics:**
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.8s
- Cumulative Layout Shift (CLS): < 0.1

---

## 🔒 Security Headers

Already configured in `vercel.json` and `netlify.toml`:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Additional CSP (Content Security Policy):**
Consider adding in production for extra security.

---

## 🐛 Troubleshooting

### Issue: 404 on custom domain
- Check DNS propagation: https://dnschecker.org/
- Verify CNAME file content matches domain
- Wait up to 48 hours

### Issue: SSL certificate error
- GitHub Pages: Enable "Enforce HTTPS" in settings
- Vercel/Netlify: Auto-provisioned, wait 5-10 minutes

### Issue: Forms not working
- Check hCaptcha site key
- Verify Supabase URL and keys
- Check browser console for errors

### Issue: Authentication fails
- Verify Supabase project is active
- Check redirect URLs in Supabase dashboard
- Ensure CORS is configured

---

## 📱 Testing

### Before going live:

1. **Desktop browsers:**
   - Chrome, Firefox, Safari, Edge

2. **Mobile devices:**
   - iPhone (Safari)
   - Android (Chrome)

3. **Features to test:**
   - [ ] Login/Register flow
   - [ ] hCaptcha displays correctly
   - [ ] All navigation links work
   - [ ] Forms submit properly
   - [ ] Images load correctly
   - [ ] Responsive design works
   - [ ] No console errors

---

## 🔄 Continuous Deployment

### GitHub Actions (Auto-deploy on push)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: .
```

---

## 📞 Support

For issues or questions:
- 📧 Email: yeriksonvarela@gmail.com
- 📱 WhatsApp: +58-424-739-4025
- 💬 Telegram: @YavlPro

---

**Last Updated:** October 14, 2025
