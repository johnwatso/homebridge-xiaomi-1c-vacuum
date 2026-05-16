# Homebridge 1C Matter (Local LAN)

Matter-native Homebridge 2.0 plugin for Xiaomi Mi Robot Vacuum-Mop 1C using Local LAN control.

## Features
- **Native HomeKit Vacuum Support:** Appears as a native vacuum in the Home app (iOS 18+ / Homebridge 2.0+).
- **Local Control:** Bypasses Xiaomi Cloud for instant response and better privacy.
- **Real-time Status:** Battery level and cleaning status updates.

## Installation
1. Install Homebridge 2.0 or later.
2. Search for `homebridge-1c-matter` and install.
3. Obtain your vacuum's **IP Address** and **32-character Token**.

## Configuration
Add the following to your Homebridge `config.json`:

```json
{
  "platform": "OneCMatter",
  "name": "OneCMatter",
  "ip": "10.11.3.248",
  "token": "YOUR_32_CHARACTER_TOKEN",
  "pollInterval": 30
}
```

### How to get your Token
You can use the **[Xiaomi-Cloud-Tokens-Extractor](https://github.com/PiotrMachowski/Xiaomi-Cloud-Tokens-Extractor)** to easily get the IP and Token for all your Xiaomi devices.

## Pairing
Once Homebridge starts, check the logs for the **Matter QR Code**. Scan this code with your Home app to add the vacuum.

## License
MIT
