# Homebridge 1C Matter

A minimal, **Matter-native** Homebridge 2.0 plugin for the **Xiaomi Mi Robot Vacuum-Mop 1C** (Dreame/Xiaomi MiOT based).

Unlike legacy plugins that expose vacuums as a "Fan" or "Switch," this plugin leverages the native **Robot Vacuum Cleaner** device type introduced in Matter 1.2 and supported by **Homebridge 2.0**.

## Features

- **Matter-Native:** Appears in Apple Home (iOS 18+) with a dedicated Vacuum icon and native controls.
- **Minimalist:** Focuses exclusively on the primary use case: automation and basic control.
- **Cloud-Based:** Uses Xiaomi Cloud APIs (MIOT protocol) for easy setup without needing to extract local tokens manually.
- **Core Controls:**
  - Start Cleaning
  - Pause Cleaning
  - Return to Dock
  - Battery Percentage & Charging State
  - Real-time State Synchronization (Polling)

## Requirements

- **Homebridge 2.0** or later.
- **Matter Enabled** in Homebridge settings.
- **Apple Home Hub** (HomePod or Apple TV) running **iOS/tvOS 18.0+** for native vacuum support.
- **Xiaomi/Mi Home Account** credentials and the **Device ID (DID)** of your vacuum.

## Installation

1. **Build from source** (for now):
   ```bash
   cd "/Users/john/Documents/GitHub/1C Matter"
   npm install
   npm run build
   ```

2. **Link to Homebridge:**
   In your Homebridge UI, you can install this as a local plugin or wait for the npm release.

## Configuration

Add the following to your Homebridge `config.json` under the `platforms` array:

```json
{
  "platform": "OneCMatter",
  "username": "your-email@example.com",
  "password": "your-password",
  "country": "cn",
  "deviceId": "123456789",
  "pollInterval": 30
}
```

### Configuration Parameters

| Parameter | Description | Default |
| :--- | :--- | :--- |
| `username` | Your Xiaomi Account email or ID. | Required |
| `password` | Your Xiaomi Account password. | Required |
| `country` | Region where your vacuum is registered (cn, de, us, etc.). | `cn` |
| `deviceId` | The Device ID (DID) of your 1C vacuum. | Required |
| `pollInterval`| How often (in seconds) to check for state updates. | `30` |

## Why this plugin?

The primary use case for this plugin is **Apple Home Automations**. 

By exposing the 1C as a native Matter vacuum, you can finally create clean automations like:
> *"When the last person leaves home → Start the Vacuum"*

And because it uses Matter semantics, the status "Cleaning," "Paused," or "Returning to Dock" is displayed natively in the Apple Home app status bar.

## Future Roadmap (Planned)

- [ ] **LAN Support:** Migration to local `miio` protocol for faster response times and offline control.
- [ ] **Error Reporting:** Mapping MIOT fault codes to Matter operational errors.
- [ ] **Suction Power:** Exposing suction levels via an optional cluster.

## Limitations

- Does **not** support maps, room-specific cleaning, or consumables (brushes/filters). Use the Mi Home app for these advanced features.
- Requires a stable internet connection for the Cloud API.

## License

MIT
