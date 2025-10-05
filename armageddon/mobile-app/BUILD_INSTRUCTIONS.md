# 📱 ARMgeddon Mobile App Build Instructions

## 🚀 Quick Start (5 minutes)

### Step 1: Login to EAS
```bash
cd "C:\Users\gnul\Desktop\hashnhedge-consolidated\armageddon\mobile-app"
eas login
```
**Enter your credentials:**
- Username: `knol3j`
- Password: [your Expo password]

### Step 2: Initialize Project (First Time Only)
```bash
eas build:configure
```
- Choose "Yes" to all prompts
- This creates the build configuration

### Step 3: Build Android APK
```bash
eas build --platform android --profile preview
```
**Expected output:**
- Build queued successfully
- Build URL provided
- Download link when complete (~5-10 minutes)

### Step 4: Build iOS IPA
```bash
eas build --platform ios --profile development
```
**Expected output:**
- Build queued successfully
- Build URL provided
- Download link when complete (~10-15 minutes)

## 🎯 Alternative Methods

### Method A: Use Quick Scripts
```bash
# Run the automated builder
quick-build.bat

# Or use npm scripts
npm run build:apk          # Android APK
npm run build:ipa          # iOS IPA
npm run build:both         # Both platforms
```

### Method B: Build Both Platforms
```bash
eas build --platform all --profile preview
```

## 📋 Monitor Your Builds

### Check Build Status
```bash
eas build:list
```

### View Specific Build
```bash
eas build:view [BUILD_ID]
```

### Download Completed Builds
1. Copy download URL from build output
2. Download APK/IPA files
3. Place in `builds/` directory

## 🔧 Troubleshooting

### Login Issues
```bash
# Clear EAS cache
npx expo logout
eas login
```

### Build Fails
```bash
# Clear build cache
eas build --platform android --profile preview --clear-cache
```

### View Build Logs
```bash
eas build:view [BUILD_ID] --logs
```

## 📦 File Locations

**Built files will be downloaded to:**
- Android APK: `armageddon-miner-v1.0.0.apk`
- iOS IPA: `armageddon-miner-v1.0.0.ipa`

**Build profiles (eas.json):**
- `preview`: APK builds for testing
- `development`: Development builds
- `production`: Store-ready builds

## 🌐 Online Dashboard

View all builds at: https://expo.dev/accounts/knol3j/projects/armgeddon-miner/builds

## ⚡ Quick Commands Reference

```bash
# Essential commands
eas login                                    # Login to EAS
eas build:configure                          # Setup project
eas build --platform android --profile preview    # Build APK
eas build --platform ios --profile development    # Build IPA
eas build:list                               # View builds
eas whoami                                   # Check login status

# Package.json scripts
npm run build:apk                            # Android APK
npm run build:ipa                            # iOS IPA
npm run build:both                           # Both platforms
npm run builds:list                          # List builds
```

## 🎉 Success!

Once builds complete:
1. Download the APK/IPA files
2. Test on devices
3. Distribute or upload to app stores
4. Update download links on your website

Your ARMgeddon mobile mining app is ready for distribution! 🚀