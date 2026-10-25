# Share

Send documents, pictures and videos between nearby iOS and Android devices on the same Wi-Fi network. Transfers go directly device-to-device. Nothing is uploaded to a server.

## Features
- Automatic discovery of nearby devices (Bonjour/mDNS)
- Chunked (256 KB) transfers with live progress
- Documents via the system file picker
- Photos and videos from the gallery, only after you tap "Send from gallery". Permission is requested at that moment.
- Speech: spoken status updates (text-to-speech) and voice commands (speech-to-text)

## Setup
1. Install the packages with your package manager of choice.
2. Generate the native projects: `npx expo prebuild`
3. Run on a device: `npx expo run:ios` or `npx expo run:android`

Native modules (react-native-tcp-socket, react-native-zeroconf, react-native-fs, @react-native-voice/voice) need a development build, so they do not run in Expo Go.

## Voice commands
- "send a file" or "document": opens the document picker
- "gallery", "photo" or "video": opens gallery access
- "receive": keeps the app ready to receive
- "stop": stops listening

## Known limitations (MVP)
- Both devices must be on the same Wi-Fi network. Some routers block discovery.
- Transfers are not encrypted yet. Add TLS before sending sensitive data.
- One file at a time; no resume after disconnect.
- Large videos are read in chunks but still need to be validated on real devices.
- Speech recognition uses the device's built-in engine.
