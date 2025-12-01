#!/data/data/com.termux/files/usr/bin/bash

# ARMgeddon Mobile Miner - APK Build Script
# Run this after logging in to EAS

echo "🚀 ARMgeddon Mobile Miner - APK Builder"
echo "========================================"
echo ""

# Check if logged in
echo "📋 Checking EAS login status..."
if ! npx eas-cli whoami 2>&1 | grep -q "knol3j"; then
    echo "❌ Not logged in to EAS"
    echo ""
    echo "Please run: npx eas-cli login"
    echo "Or set EXPO_TOKEN environment variable"
    exit 1
fi

echo "✅ Logged in to EAS"
echo ""

# Start the build
echo "🔨 Starting Android APK build..."
echo "This will use Expo's cloud build service"
echo ""

npx eas-cli build --platform android --profile preview

echo ""
echo "✅ Build submitted!"
echo ""
echo "📱 Your APK will be available at:"
echo "   https://expo.dev/accounts/knol3j/projects/armgeddon-miner/builds"
echo ""
echo "💡 To check build status:"
echo "   npx eas-cli build:list"
