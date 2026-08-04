# LiveSwell App Store Deployment Checklist

## ✅ Setup Complete
- [x] Capacitor installed and configured
- [x] Android and iOS projects generated
- [x] Web assets successfully synced
- [x] App configuration set (com.liveswell.app)

## 📱 Ready for App Store Deployment

### Next Steps for Google Play Store:
1. **Install Android Studio** on your development machine
2. **Open project**: `npx cap open android`
3. **Generate signed APK/AAB**:
   - Build > Generate Signed Bundle/APK
   - Create keystore for app signing
   - Build release version
4. **Upload to Google Play Console**:
   - Create developer account ($25)
   - Upload AAB file
   - Complete store listing, screenshots, descriptions
   - Submit for review

### Next Steps for Apple App Store:
1. **Requirements**: Mac computer with Xcode 14+
2. **Open project**: `npx cap open ios`
3. **Configure signing**: Apple Developer Account ($99/year)
4. **Build for release**:
   - Product > Archive
   - Upload to App Store Connect
5. **Complete App Store listing** and submit for review

## 🍎 Sign in with Apple (Required for App Store)

Apple requires any app offering third-party social login (e.g. Google) to also offer Sign in with Apple. The code is already configured to show the button automatically once enabled in Clerk. You only need to complete the one-time setup below.

### Step 1 — Apple Developer Portal
1. Log in at [developer.apple.com](https://developer.apple.com)
2. Go to **Certificates, IDs & Profiles → Identifiers**
3. Register a new **Services ID** (type: Services):
   - Description: `LiveSwell`
   - Identifier: `com.liveswell.app.signin` (or similar)
   - Enable **Sign In with Apple**
   - Configure the domain and return URL:
     - Domain: your Clerk frontend API domain (e.g. `clerk.yourdomain.com`)
     - Return URL: `https://<your-clerk-frontend-api>/v1/oauth_callback`
4. Go to **Keys** and create a new key:
   - Enable **Sign In with Apple**
   - Associate it with your primary App ID (`com.liveswell.app`)
   - Download the `.p8` private key file (only downloadable once — save it)
   - Note the **Key ID**
5. Note your **Team ID** from the top-right corner of the portal

### Step 2 — Clerk Dashboard
1. Go to [dashboard.clerk.com](https://dashboard.clerk.com) → your LiveSwell app
2. Navigate to **Configure → SSO Connections → Apple**
3. Toggle Apple **on**
4. Enter the credentials from Step 1:
   - **Team ID** — 10-character string (e.g. `AB12CD34EF`)
   - **Key ID** — 10-character string from the key you created
   - **Service ID** — the identifier from your Services ID (e.g. `com.liveswell.app.signin`)
   - **Private Key** — paste the full contents of the downloaded `.p8` file
5. Save — the "Continue with Apple" button will appear on `/sign-in` and `/sign-up` automatically

> **Note**: Credentials are stored in Clerk only. Do not add them to Replit secrets or commit them to the repo.

## 🎨 Assets Needed
- **App Icon**: 1024x1024 PNG (for both stores)
- **Screenshots**: Various device sizes for store listings
- **App Description**: Compelling store descriptions
- **Privacy Policy**: Required for app stores

## 🔧 Production Configuration
Your app is configured with:
- **App Name**: LiveSwell
- **Bundle ID**: com.liveswell.app  
- **Web Directory**: dist/public
- **Target Platforms**: Android & iOS

## 🚀 Development Workflow
1. Make code changes in `client/src/`
2. Build: `npm run build`
3. Sync: `npx cap sync`
4. Test in native IDEs

## 📊 Current Status
- ✅ Capacitor setup complete
- ✅ Native projects generated
- ✅ Web assets properly synced
- ✅ Ready for native IDE development
- 🔄 Next: Open in Android Studio/Xcode for app store builds

Your LiveSwell surf conditions app is now ready for mobile app store deployment!