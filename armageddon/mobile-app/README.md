# ARMgeddon Mobile Miner

Mobile mining app for ARMgeddon cryptocurrency using the PhoneProof algorithm.

## Prerequisites

- Node.js 16+ and npm
- Expo CLI: `npm install -g expo-cli`
- For Android: Android Studio or physical Android device with Expo Go app
- For iOS: Xcode (Mac only) or physical iOS device with Expo Go app

## Installation

```bash
npm install
```

## Running the App

### Development Mode (with Expo Go)

1. Install Expo Go on your mobile device:
   - [Android - Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS - App Store](https://apps.apple.com/app/expo-go/id982107779)

2. Start the development server:
```bash
npm start
```

3. Scan the QR code with:
   - Android: Expo Go app
   - iOS: Camera app (will open in Expo Go)

### Run on Android Emulator

```bash
npm run android
```

### Run on iOS Simulator (Mac only)

```bash
npm run ios
```

## Configuration

Edit the pool URL in `App.js`:

```javascript
const POOL_URL = 'ws://your-pool-url:3002';
```

For local testing, ensure your device is on the same network as the pool server and use your computer's local IP:

```javascript
const POOL_URL = 'ws://192.168.1.XXX:3002';
```

## Building for Production

### Android APK

```bash
expo build:android
```

### iOS IPA

```bash
expo build:ios
```

## Features

- Real-time mining with PhoneProof algorithm
- WebSocket connection to mining pool
- Live hashrate monitoring
- Battery level tracking
- Auto-stop mining at low battery (20%)
- Share submission tracking
- Device information display

## Troubleshooting

### WebSocket Connection Issues

1. Make sure the pool server is running
2. Check firewall settings
3. Use your computer's local IP address instead of localhost
4. Ensure device and computer are on the same network

### Performance Issues

- Lower the rounds in PhoneProof constructor (currently 1000)
- Increase the timeout in mining loop
- Enable battery saver mode

### Build Issues

```bash
# Clear cache
expo start -c

# Reinstall dependencies
rm -rf node_modules
npm install
```

## License

MIT