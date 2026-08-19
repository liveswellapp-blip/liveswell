# SurfCast Deployment Guide

## Deployment Fixes Applied

This guide outlines the fixes applied to resolve the deployment failures and ensure successful production deployment.

## Issues Addressed

1. **Missing Environment Variables**: OPENWEATHER_API_KEY and SESSION_SECRET validation
2. **Static File Serving**: Fixed path issues for production builds
3. **Error Handling**: Added comprehensive startup error logging
4. **Production Configuration**: Proper NODE_ENV handling

## Environment Variables Required

### Required for Production
- `OPENWEATHER_API_KEY`: OpenWeatherMap API key for real weather data
- `SESSION_SECRET`: Secret key for session management (minimum 32 characters recommended)
- `NODE_ENV`: Should be set to "production" for deployment
- Replit Stripe connection: live-mode account used by the published deployment
- `DATABASE_URL`: Required for application data and Stripe synchronization
- `REPLIT_DOMAINS`: Supplied by Replit; used to register the managed webhook

### Optional
- `PORT`: Server port (defaults to 5000)
- `APP_URL`: Explicit HTTPS public origin. When omitted, the first
  `REPLIT_DOMAINS` value is used for production checkout and billing returns.
- `BILLING_EMERGENCY_CHECKOUT_PROVIDER`: Emergency-only override. Set exactly
  `whop` when Stripe initialization prevents startup, persist Whop/0% in the
  admin dashboard, then remove the override. Never set it to enable Stripe.

## Deployment Process

### 1. Set Environment Variables
Before deploying, ensure these secrets are configured in your Replit deployment:

```bash
OPENWEATHER_API_KEY=your_openweather_api_key_here
SESSION_SECRET=your_secure_session_secret_here
NODE_ENV=production
```

### 2. Build Process
The build process consists of:

```bash
# Standard build
npm run build

# Post-build file arrangement (automatic in deployment)
node scripts/post-build.js
```

### 3. Production Start
The production server starts with:

```bash
NODE_ENV=production npm run start
```

## Files Modified for Deployment

### `server/index.ts`
- Added environment variable validation
- Added session middleware configuration
- Enhanced error handling and logging
- Production/development mode detection

### `scripts/post-build.js`
- Copies built static files to correct location for production
- Ensures server can find static assets in production

### `scripts/deploy-build.sh`
- Complete deployment build script
- Runs build + post-build in sequence

## Production Features

### Security
- Secure session cookies in production
- Environment variable validation
- Proper error handling without sensitive data exposure

### Performance
- Static file serving optimized for production
- Gzipped assets from Vite build
- Code splitting for optimal loading

### Monitoring
- Startup status logging
- API key configuration status
- Environment mode indication

## Fallback Behavior

### Missing API Key
- Application runs with realistic demo data
- Warns about missing API key but doesn't crash
- Users can still test all functionality

### Missing Session Secret
- Development: Uses default secret with warning
- Production: Fails fast with clear error message

## Verification

After deployment, verify:

1. **Server Starts**: Check logs for successful startup message
2. **API Status**: Look for API key configuration status
3. **Static Files**: Ensure frontend loads correctly
4. **Weather Data**: Verify real vs demo data based on API key configuration
5. **Stripe launch:** Follow `STRIPE_LAUNCH_RUNBOOK.md` and run the read-only
   live-mode verifier before enabling any production cohort:
   `npm run stripe:verify -- --expect-mode=live --origin=https://liveswell.io`
6. **Stripe startup:** Confirm migrations, managed webhook registration, and
   backfill all succeed. When Stripe checkout is enabled, startup fails closed
   rather than serving a broken checkout.
7. **Rollback drill:** At 0%, rehearse the environment-level Whop override in
   `STRIPE_LAUNCH_RUNBOOK.md` before increasing the cohort.

## Troubleshooting

### Deployment Fails to Initialize
- Check environment variables are set correctly
- Verify NODE_ENV is set to "production"
- Ensure build completed successfully

### Static Files Not Loading
- Post-build script should have run automatically
- Check that `server/public` directory exists with built files
- Verify Vite build created `dist/public` directory

### Weather Data Issues
- Check OPENWEATHER_API_KEY is valid and active
- Demo data will be used if API key is invalid
- No functionality is lost with missing API key

## Success Indicators

A successful deployment will show:

```
✅ OpenWeather API key configured - real weather data available
Starting server in production mode
Environment: production
API Key configured: Yes
serving on port 5000
```

Or with demo data:

```
⚠️  No valid OpenWeather API key configured - using demo data
Starting server in production mode  
Environment: production
API Key configured: No (using demo data)
serving on port 5000
```

Both scenarios result in a fully functional application.