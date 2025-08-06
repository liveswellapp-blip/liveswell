# LiveSwell Mobile App Deployment Guide

## Overview
Your LiveSwell app is now configured as a hybrid mobile app using Capacitor. This allows you to deploy to both iOS App Store and Google Play Store while maintaining your existing React codebase.

## Prerequisites

### For iOS App Store:
- Mac computer (required for iOS development)
- Xcode 14+ installed
- Apple Developer Program membership ($99/year)
- Apple ID configured in Xcode

### For Google Play Store:
- Google Play Console Developer account ($25 one-time fee)
- Android Studio installed
- Java Development Kit (JDK) 11+

## Project Structure
```
├── android/          # Android native project
├── ios/              # iOS native project  
├── dist/             # Built web assets
└── capacitor.config.ts # Capacitor configuration
```

## Build Process

### 1. Build Web Assets
```bash
npm run build
```

### 2. Sync with Native Projects
```bash
npx cap sync
```

### 3. Open in Native IDEs

#### For Android:
```bash
npx cap open android
```
- Opens Android Studio
- Build APK/AAB for Play Store
- Test on emulator or device

#### For iOS:
```bash
npx cap open ios
```
- Opens Xcode
- Build IPA for App Store
- Test on simulator or device

## App Store Deployment

### Android (Google Play Store):
1. Open Android Studio
2. Build > Generate Signed Bundle/APK
3. Create keystore and signing configuration
4. Upload AAB file to Google Play Console
5. Complete store listing and screenshots
6. Submit for review

### iOS (Apple App Store):
1. Open Xcode
2. Product > Archive
3. Upload to App Store Connect
4. Complete app information and screenshots
5. Submit for App Review

## App Configuration

### App Identity:
- **Name**: LiveSwell
- **Bundle ID**: com.liveswell.app
- **Version**: 1.0.0

### Permissions Required:
- **Location**: For local surf conditions
- **Internet**: For weather data fetching
- **Camera**: (Optional) For spot photos

## Next Steps

1. **Create App Icons**: Generate proper app icons (1024x1024 for iOS, various sizes for Android)
2. **Screenshots**: Prepare app screenshots for store listings
3. **Store Listings**: Write compelling app descriptions
4. **Testing**: Test thoroughly on real devices
5. **App Store Optimization**: Keywords, categories, pricing

## Development Workflow

### Making Changes:
1. Edit React code in `client/src/`
2. Run `npm run build`
3. Run `npx cap sync`
4. Test in native IDEs

### Adding Native Features:
- Location services
- Push notifications
- Camera access
- Device storage

## Capacitor Plugins Available:
- @capacitor/geolocation
- @capacitor/push-notifications
- @capacitor/camera
- @capacitor/storage
- @capacitor/splash-screen

## Production Considerations:
- Enable production API endpoints
- Configure proper error tracking
- Set up analytics
- Implement proper authentication flows
- Add offline capabilities

Your LiveSwell surf app is now ready for mobile deployment to both major app stores!