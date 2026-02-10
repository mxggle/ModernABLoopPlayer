# iOS Safari Recording - Troubleshooting Guide

## ⚠️ HTTPS Requirement on iOS

**iOS Safari requires HTTPS (or localhost) to access the microphone!**

### Quick Check
1. Open your iOS device
2. Look at the URL in Safari
3. Does it start with `https://` or is it `localhost`?

### If you see HTTP (not HTTPS):
❌ **Won't work** - iOS Safari blocks microphone access over HTTP for security

### Solutions:

#### Option 1: Use HTTPS (Recommended for deployment)
If deploying the app:
- Deploy to Vercel, Netlify, or similar (automatic HTTPS)
- Use a reverse proxy with SSL certificate
- Use Cloudflare for free HTTPS

#### Option 2: Test on Localhost (Development)
If testing locally, you need to access via your computer's local network:

**Step-by-step:**

1. **On your development machine**, find your local IP:
   ```bash
   # On Mac/Linux:
   ifconfig | grep "inet "
   
   # On Windows:
   ipconfig
   ```
   Look for something like `192.168.x.x` or `10.0.x.x`

2. **Start the dev server** (already running):
   ```bash
   npm run dev
   ```
   Note the Network URL, e.g., `http://192.168.0.174:3003/`

3. **On your iPhone/iPad**:
   - Open Safari
   - Go to: `http://YOUR_COMPUTER_IP:3003`
   - Example: `http://192.168.0.174:3003`

4. **Important**: iOS Safari considers `localhost` and local network IPs as "secure contexts" for development

#### Option 3: Use ngrok (Quick HTTPS tunnel)
```bash
# Install ngrok
brew install ngrok  # or download from ngrok.com

# Get your dev server port (currently 3003)
ngrok http 3003
```

Ngrok will give you an HTTPS URL like: `https://abc123.ngrok.io`

Access that URL on your iOS device!

---

## 🔍 Debugging Steps

### 1. Check Console Logs
On your iOS device:
1. Settings → Safari → Advanced → Web Inspector (enable it)
2. Connect iPhone to Mac via USB
3. On Mac: Safari → Develop → [Your iPhone] → [Your Page]
4. Look for error messages

### 2. Expected Error Messages

If you see:
- ✅ "Requesting microphone access..." → Good! System is working
- ❌ "iOS requires HTTPS for microphone access" → You need HTTPS (see above)
- ❌ "Microphone permission denied" → You denied permission, go to Settings
- ❌ "NotSupportedError" → Not on HTTPS, use one of the solutions above

### 3. Permission Check
Settings → Safari → Microphone → Make sure it's allowed for your site

---

## 📱 Step-by-Step Test on iOS

### Prerequisites:
- [ ] Using HTTPS OR localhost/local network
- [ ] Microphone permissions allowed in iOS Settings
- [ ] Web Inspector enabled (for debugging)

### Test Steps:
1. Open Safari on iOS
2. Navigate to your app URL (HTTPS or local network IP)
3. Click the microphone button to enable shadowing mode
4. You should see a permission prompt - click "Allow"
5. Play some audio
6. You should see:
   - Microphone button turns orange
   - Waveform shows your voice in real-time
   - Recording indicator appears
7. Pause the audio
8. Recording should stop and save

### If it doesn't work:
1. Check browser console (Web Inspector)
2. Look for error messages
3. Verify URL starts with `https://` or is on local network
4. Check microphone permissions in Settings

---

## 🚀 Production Deployment

For production, you MUST use HTTPS. Here are easy options:

### Vercel (Recommended):
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (automatic HTTPS!)
vercel
```

### Netlify:
```bash
# Install Netlify CLI  
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

### GitHub Pages with Custom Domain:
- Enable HTTPS in repository settings
- Custom domains get free SSL from GitHub

---

## 💡 Current Dev Server

Your development server is running at:
- **Local**: `http://localhost:3003/`
- **Network**: `http://192.168.0.174:3003/` (accessible from iOS on same WiFi)

**For iOS testing, use the Network URL!**

On your iPhone, go to: `http://192.168.0.174:3003/`

iOS Safari treats local network IPs as secure for getUserMedia in development mode!

---

## ⚙️ Technical Details

### Why HTTPS is Required
- Security: Prevents malicious sites from accessing microphone
- iOS is stricter than Android about this
- Desktop browsers allow HTTP on localhost only
- iOS treats local network IPs as secure

### Exceptions (Secure Contexts)
- `https://` URLs (always secure)
- `localhost` and `127.0.0.1`
- Local network IPs (192.168.x.x, 10.0.x.x) when testing
- File URLs (`file://`) - but can't run web servers

---

## 🆘 Still Not Working?

If you've tried everything and it still doesn't work, please provide:

1. **Exact error message** you see (check Web Inspector console)
2. **URL you're accessing** (HTTP or HTTPS?)
3. **iOS version** (Settings → General → About)
4. **Safari version**

Common issues:
- ❌ Accessing via HTTP (not HTTPS) on deployed site
- ❌ Not on same WiFi network when using local IP
- ❌ Typo in IP address
- ❌ Firewall blocking local network access
- ❌ Microphone permissions denied in iOS Settings

---

## ✅ Quick Checklist

Before you ask for help, verify:

- [ ] URL is HTTPS or local network IP (not HTTP!)
- [ ] Microphone permission granted in iOS Settings
- [ ] On same WiFi network (if using local IP)
- [ ] Web Inspector shows no permission errors
- [ ] iOS Safari, not another browser
- [ ] Not using Private Browsing mode

---

**TL;DR**: iOS needs HTTPS or localhost. Use `http://192.168.0.174:3003/` on your iPhone (same WiFi) or deploy with HTTPS!
