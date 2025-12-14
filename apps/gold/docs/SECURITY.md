# YavlGold - Security Hardening Guide

## 🔒 Security Measures

### ✅ Already Implemented

1. **Authentication**
   - ✅ Supabase Auth with email/password
   - ✅ hCaptcha on login and registration
   - ✅ Session management with localStorage
   - ✅ Token-based authentication

2. **Authorization**
   - ✅ AuthGuard protecting routes
   - ✅ Role-based access control (admin, moderator, user)
   - ✅ Protected links with visual indicators

3. **Headers**
   - ✅ X-Frame-Options: DENY
   - ✅ X-Content-Type-Options: nosniff
   - ✅ X-XSS-Protection: 1; mode=block
   - ✅ Referrer-Policy configured

---

## 🛡️ Additional Security Measures

### 1. Content Security Policy (CSP)

**Add to all HTML pages:**

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://js.hcaptcha.com https://cdnjs.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com;
  font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://gerzlzprkarikblqxpjt.supabase.co https://hcaptcha.com;
  frame-src https://hcaptcha.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
">
```

**Or in `vercel.json`:**
Already added in deployment configs ✅

---

### 2. Rate Limiting

**Supabase Configuration:**

1. Go to Supabase Dashboard → Authentication → Settings
2. Enable rate limiting:
   - Max requests per hour: 100
   - Max concurrent requests: 10

**Client-side Implementation:**

```javascript
// In authClient.js
const rateLimiter = {
  attempts: 0,
  lastAttempt: 0,
  maxAttempts: 5,
  cooldown: 300000, // 5 minutes
  
  canAttempt() {
    const now = Date.now();
    if (now - this.lastAttempt > this.cooldown) {
      this.attempts = 0;
    }
    return this.attempts < this.maxAttempts;
  },
  
  recordAttempt() {
    this.attempts++;
    this.lastAttempt = Date.now();
  },
  
  isLocked() {
    return this.attempts >= this.maxAttempts;
  }
};

// Use in login method
async login(email, password) {
  if (!rateLimiter.canAttempt()) {
    return { success: false, error: 'Demasiados intentos. Intenta de nuevo en 5 minutos.' };
  }
  
  rateLimiter.recordAttempt();
  // ... rest of login logic
}
```

---

### 3. Input Validation & Sanitization

**Email Validation:**
```javascript
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
```

**Password Strength:**
```javascript
function checkPasswordStrength(password) {
  const strength = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };
  
  const score = Object.values(strength).filter(Boolean).length;
  
  if (score < 3) return 'weak';
  if (score < 4) return 'medium';
  return 'strong';
}
```

**XSS Prevention:**
```javascript
function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

// Use when displaying user input
element.textContent = sanitizeHTML(userInput); // Safe
// NOT: element.innerHTML = userInput; // Dangerous!
```

---

### 4. HTTPS Enforcement

**In vercel.json:**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

**Redirect HTTP to HTTPS:**
Automatic on Vercel, GitHub Pages ✅

---

### 5. Secure Cookie Settings

**If using cookies (for session management):**

```javascript
// Set secure cookie
document.cookie = "session=value; Secure; HttpOnly; SameSite=Strict; Path=/";
```

**Currently using localStorage:**
- ✅ Session stored in `localStorage.getItem('gg:session')`
- Consider moving to httpOnly cookies for better security

---

### 6. SQL Injection Prevention

**Supabase ORM:**
- ✅ Parameterized queries by default
- ✅ No raw SQL in client code
- ✅ RLS (Row Level Security) enabled

**Best Practices:**
```javascript
// Good (Supabase handles sanitization)
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', userEmail);

// Bad (never do this in raw SQL)
// SELECT * FROM users WHERE email = '${userEmail}'; // Injectable!
```

---

### 7. CSRF Protection

**For form submissions:**

```javascript
// Generate CSRF token
function generateCSRFToken() {
  return btoa(Math.random().toString(36) + Date.now());
}

// Store in session
sessionStorage.setItem('csrf_token', generateCSRFToken());

// Validate on form submit
function validateCSRF(token) {
  const storedToken = sessionStorage.getItem('csrf_token');
  return token === storedToken;
}
```

**Add to forms:**
```html
<input type="hidden" name="csrf_token" id="csrf_token">
<script>
  document.getElementById('csrf_token').value = sessionStorage.getItem('csrf_token');
</script>
```

---

### 8. Secrets Management

**Current:**
- ⚠️ Supabase keys in code (client-side is OK for ANON key)
- ⚠️ hCaptcha site key in HTML (OK, site key is public)

**Recommendations:**

**Use Environment Variables:**
```javascript
// Instead of hardcoding
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

**Rotate Keys Regularly:**
1. Supabase: Dashboard → Settings → API → Regenerate keys
2. hCaptcha: Dashboard → Regenerate keys

**Never commit:**
- Service role keys
- Private keys
- API secrets
- Database passwords

---

### 9. Dependency Security

**Check for vulnerabilities:**
```bash
npm audit
npm audit fix
```

**Update regularly:**
```bash
npm update
```

**Use trusted CDNs:**
- ✅ CDNjs
- ✅ jsDelivr
- ✅ Google Fonts

**Verify integrity:**
```html
<script 
  src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" 
  integrity="sha384-..."
  crossorigin="anonymous">
</script>
```

---

### 10. Error Handling

**Don't expose sensitive info:**

```javascript
// Bad
catch (error) {
  alert(error.message); // Might expose DB structure
}

// Good
catch (error) {
  console.error('[Auth] Error:', error); // Log for debugging
  alert('Ocurrió un error. Por favor intenta de nuevo.'); // Generic message
}
```

---

### 11. Session Security

**Current Implementation:**
```javascript
localStorage.setItem('gg:session', JSON.stringify(session));
```

**Enhancements:**

**1. Session Timeout:**
```javascript
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

function isSessionValid(session) {
  const now = Date.now();
  const age = now - session.createdAt;
  return age < SESSION_TIMEOUT;
}

// Check on page load
if (!isSessionValid(session)) {
  AuthClient.logout();
}
```

**2. Auto-logout on inactivity:**
```javascript
let inactivityTimer;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    AuthClient.logout();
    alert('Sesión cerrada por inactividad');
  }, INACTIVITY_TIMEOUT);
}

// Reset on user activity
document.addEventListener('click', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);
```

---

### 12. Logging & Monitoring

**Supabase Logs:**
- Dashboard → Logs → Auth logs
- Monitor failed login attempts
- Track suspicious activity

**Client-side Logging:**
```javascript
// Log security events
function logSecurityEvent(event, details) {
  console.warn('[Security]', event, details);
  
  // Send to analytics (optional)
  if (window.gtag) {
    gtag('event', event, { category: 'security', ...details });
  }
}

// Use
logSecurityEvent('failed_login', { email: sanitizedEmail });
logSecurityEvent('rate_limit_exceeded', { attempts: 5 });
```

---

## 🚨 Security Checklist

### Authentication
- [x] Supabase Auth configured
- [x] hCaptcha on forms
- [x] Password strength validation
- [x] Email verification
- [ ] Two-factor authentication (2FA)
- [ ] OAuth providers (Google, GitHub)

### Authorization
- [x] Role-based access control
- [x] Protected routes
- [ ] API endpoint protection
- [ ] Resource-level permissions

### Data Protection
- [x] HTTPS enabled
- [x] Secure headers
- [ ] CSP implemented
- [ ] Data encryption at rest (Supabase)
- [x] Data encryption in transit (SSL)

### Input/Output
- [ ] Input validation
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] SQL injection prevention (Supabase handles)

### Session Management
- [x] Session storage
- [x] Session timeout
- [ ] Auto-logout on inactivity
- [ ] Concurrent session handling

### Monitoring
- [x] Error logging
- [ ] Security event logging
- [ ] Failed login monitoring
- [ ] Rate limit enforcement

---

## 🔐 Security Best Practices

1. **Never trust user input**
2. **Use prepared statements** (Supabase does this)
3. **Encrypt sensitive data**
4. **Use HTTPS everywhere**
5. **Keep dependencies updated**
6. **Implement rate limiting**
7. **Log security events**
8. **Regular security audits**
9. **Principle of least privilege**
10. **Defense in depth**

---

## 📞 Security Contact

For security issues:
- 📧 Email: yeriksonvarela@gmail.com
- 🔒 Security policy: See `SECURITY.md` (create this)

---

**Last Updated:** October 14, 2025
