# 🏗️ ARMgeddon Mobile App - Android Studio Build Guide

**Recommended For**: Windows/Mac users  
**Time Required**: 30-60 minutes (first time)  
**Difficulty**: ⭐⭐⚫⚫⚫ Easy-Medium

---

## 📋 Prerequisites

### What You Need
- Windows 10/11 or macOS
- 8GB RAM minimum (16GB recommended)
- 10GB free disk space
- Internet connection (for SDK downloads)

### What's Already Done ✅
- ✅ App code is complete and tested
- ✅ All assets created (icons, splash screens)
- ✅ Native Android project generated
- ✅ Gradle configuration ready
- ✅ Dependencies installed

**You're 95% done - just need to build the APK!**

---

## 🚀 Step-by-Step Instructions

### Step 1: Install Android Studio

**Download Android Studio**:
1. Go to: https://developer.android.com/studio
2. Download for your OS (Windows/Mac)
3. File size: ~1GB
4. Install time: 5-10 minutes

**Installation**:
- Windows: Run the `.exe` installer
- Mac: Drag to Applications folder
- Accept default settings
- ✅ Include Android SDK (checked by default)
- ✅ Include Android Virtual Device

---

### Step 2: Clone/Pull Latest Code

**Option A: If you haven't cloned the repo on Windows**:
```bash
cd C:\Users\YourName\Desktop
git clone https://github.com/knol3j/HNH.git
cd HNH
```

**Option B: If you already have the repo**:
```bash
cd C:\path\to\HNH
git pull origin master
```

**Verify you have the latest code**:
```bash
git log -1 --oneline
# Should show: 9c1fc8c feat: Prepare ARMgeddon mobile app for APK build
```

---

### Step 3: Open Project in Android Studio

1. **Launch Android Studio**
   - First launch will show "Import Android Studio Settings" → Choose "Do not import settings"
   - SDK setup wizard will appear → Click "Next" through all steps
   - Accept licenses when prompted

2. **Open the Android Project**:
   - Click "Open" (or File → Open)
   - Navigate to: `C:\...\HNH\armageddon\mobile-app\android`
   - Select the `android` folder
   - Click "OK"

3. **Wait for Gradle Sync** (automatic):
   - Android Studio will start syncing
   - Bottom status bar shows "Gradle Sync"
   - First time: 5-10 minutes
   - It will download missing SDK components automatically

---

### Step 4: Install Missing Components (Automatic)

Android Studio will prompt you to install:
- ✅ Android SDK Platform 34
- ✅ Android SDK Build-Tools
- ✅ Android SDK Platform-Tools
- ✅ Android SDK Tools
- ✅ NDK (if needed)

**Just click "Install" or "OK"** for each prompt.

This happens automatically - no manual configuration needed! ✨

---

### Step 5: Build the APK

Once Gradle sync completes:

**Method 1: Menu (Recommended)**:
1. Click: **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Wait 2-5 minutes
3. Look for notification: "APK(s) generated successfully"
4. Click "locate" in the notification

**Method 2: Gradle Panel**:
1. Open Gradle panel (right side of Android Studio)
2. Expand: **app** → **Tasks** → **build**
3. Double-click: **assembleRelease**

**Method 3: Terminal in Android Studio**:
```bash
./gradlew assembleRelease
```

---

### Step 6: Find Your APK

**APK Location**:
```
HNH\armageddon\mobile-app\android\app\build\outputs\apk\release\app-release.apk
```

**File Size**: ~25-40 MB  
**Version**: 1.0.0  
**Package**: com.hashnhedge.armgeddon

---

### Step 7: Test the APK

**Option A: Android Emulator**:
1. In Android Studio: Tools → Device Manager
2. Create Virtual Device (if none exists)
3. Start emulator
4. Drag APK onto emulator window
5. App installs and opens

**Option B: Physical Device**:
1. Enable Developer Mode on your Android phone
2. Enable USB Debugging
3. Connect phone via USB
4. Drag APK to phone or use `adb install app-release.apk`

**Option C: Transfer to Phone**:
1. Copy APK to phone via USB/email/cloud
2. On phone: Settings → Security → Unknown Sources (enable)
3. Open APK file on phone
4. Tap "Install"

---

## 🎯 Expected Build Output

### Success Messages

**In Android Studio**:
```
BUILD SUCCESSFUL in 2m 15s
45 actionable tasks: 45 executed
```

**Notification**:
```
✅ APK(s) generated successfully.
   Locate or analyze the APK
```

### APK Details

**File**: `app-release.apk`  
**Size**: 25-40 MB  
**Minimum Android**: 6.0 (API 23)  
**Target Android**: 14 (API 34)  
**Architecture**: armeabi-v7a, arm64-v8a, x86, x86_64 (universal)

---

## 🐛 Troubleshooting

### Issue 1: "Gradle sync failed"

**Solution**:
1. File → Invalidate Caches → Invalidate and Restart
2. Tools → SDK Manager → Install missing components
3. Build → Clean Project
4. Build → Rebuild Project

### Issue 2: "SDK not found"

**Solution**:
1. File → Project Structure → SDK Location
2. Point to Android SDK location (usually `C:\Users\YourName\AppData\Local\Android\Sdk`)
3. Or let Android Studio download it automatically

### Issue 3: "Build failed with errors"

**Solution**:
1. Check "Build" tab at bottom for error details
2. Most common: Missing SDK components
3. Click links in error messages to auto-fix
4. Or: Tools → SDK Manager → Install suggested components

### Issue 4: "Execution failed for task ':app:lintVitalRelease'"

**Solution**:
Add to `android/app/build.gradle`:
```gradle
android {
    lintOptions {
        checkReleaseBuilds false
        abortOnError false
    }
}
```

Then rebuild.

---

## 🎨 Optional: Sign the APK (For Play Store)

The APK generated is already signed with a debug keystore.  
For Google Play Store release, you'll need a proper keystore:

```bash
# Generate keystore
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Sign APK
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore my-release-key.keystore app-release.apk my-key-alias

# Verify
jarsigner -verify -verbose -certs app-release.apk
```

---

## 📤 Distribute Your APK

### Option 1: Direct Download
1. Upload to your website: `hashnhedge.com/downloads/`
2. Update download link on website
3. Users can download and install directly

### Option 2: Google Play Store
1. Create Google Play Developer account ($25 one-time)
2. Use signed APK (see above)
3. Upload to Play Console
4. Fill out store listing
5. Submit for review

### Option 3: Alternative App Stores
- Amazon Appstore
- Samsung Galaxy Store
- APKPure
- F-Droid (for open source)

---

## ✅ Success Checklist

Before considering the build complete:

- [ ] Android Studio installed and configured
- [ ] Latest code pulled from GitHub (commit 9c1fc8c)
- [ ] Project opened in Android Studio
- [ ] Gradle sync completed successfully
- [ ] All SDK components installed
- [ ] Build successful (no errors)
- [ ] APK file generated
- [ ] APK tested on emulator or device
- [ ] App launches and loads correctly
- [ ] Mining functionality works
- [ ] Wallet connection works
- [ ] Notifications work

---

## 🚀 Build Commands Reference

**Clean build**:
```bash
./gradlew clean assembleRelease
```

**Build debug APK** (faster, for testing):
```bash
./gradlew assembleDebug
```

**Build release APK**:
```bash
./gradlew assembleRelease
```

**List all available tasks**:
```bash
./gradlew tasks
```

**Check build configuration**:
```bash
./gradlew :app:dependencies
```

---

## 📊 Build Performance

**First Build**:
- Time: 5-10 minutes
- Downloads: ~500MB (SDK components)
- Disk space used: ~3GB

**Subsequent Builds**:
- Time: 1-3 minutes
- Downloads: None (cached)
- Disk space: No additional

**Incremental Builds** (after code changes):
- Time: 30-60 seconds
- Only changed files recompiled

---

## 🎓 What Android Studio Does

1. **Syncs Gradle**: Downloads dependencies
2. **Compiles Code**: JavaScript + Native code
3. **Processes Resources**: Images, XML layouts
4. **Builds Native Libraries**: React Native C++ code
5. **Packages APK**: Combines everything
6. **Signs APK**: Makes it installable
7. **Optimizes**: Shrinks code, removes unused resources

All automatic - you just click "Build"! 🎉

---

## 💡 Pro Tips

**Speed up builds**:
1. Enable Gradle daemon (automatic in Android Studio)
2. Increase Gradle memory:
   ```properties
   # android/gradle.properties
   org.gradle.jvmargs=-Xmx4096m
   ```
3. Enable parallel builds:
   ```properties
   org.gradle.parallel=true
   ```

**Smaller APK**:
1. Enable ProGuard/R8 (already enabled for release)
2. Use app bundles instead of APK (for Play Store)
3. Generate separate APKs per architecture

**Faster testing**:
1. Use `assembleDebug` instead of `assembleRelease`
2. Debug APKs build faster (no optimization)
3. Use Android Emulator for quick testing

---

## 📞 Need Help?

**If build fails**:
1. Check `APK_BUILD_STATUS.md` in this folder
2. Google the exact error message
3. Stack Overflow: Tag `android-studio` + `react-native`
4. Expo Forums: https://forums.expo.dev/

**Common resources**:
- Android Studio Docs: https://developer.android.com/studio/run
- React Native Build: https://reactnative.dev/docs/signed-apk-android
- Expo Bare Workflow: https://docs.expo.dev/bare/installing-expo-modules/

---

## 🎉 Once Built Successfully

**You'll have**:
- ✅ `app-release.apk` (~25-40 MB)
- ✅ Installable on any Android 6.0+ device
- ✅ Ready for distribution
- ✅ Can upload to website or Play Store

**Upload to your website**:
```bash
# Copy APK to downloads folder
cp app-release.apk ../../downloads/armageddon-miner-v1.0.0.apk

# Update download link on hashnhedge.com
# Point users to: https://hashnhedge.com/downloads/armageddon-miner-v1.0.0.apk
```

---

**Good luck! The hardest part is already done - you just need to click "Build"!** 🚀

---

*Guide Created: 2025-10-28*  
*App Version: 1.0.0*  
*Ready to build!*
