# Homebridge 1C Matter (Local LAN)

Matter-native Homebridge 2.0 plugin for Xiaomi Mi Robot Vacuum-Mop 1C using Local LAN control.

## Features
- **Native HomeKit Vacuum Support:** Appears as a native vacuum in the Home app (iOS 18+ / Homebridge 2.0+).
- **Local Control:** Bypasses Xiaomi Cloud for instant response and better privacy.
- **Cleaning Controls:** Start cleaning, pause, resume, and return to dock.
- **Suction Modes:** Quiet, Default, Medium, and Strong cleaning modes.
- **Status Updates:** Reports idle, cleaning, paused, error, and returning-to-dock states.
- **Fault Labels:** Logs common vacuum fault codes with readable descriptions.
- **Find Vacuum:** Apple Home identify requests and the local check command can trigger the vacuum's locate prompt.
- **Consumable Status:** Logs main brush, side brush, and filter life when status changes.
- **Power Status:** Reports battery percentage and charging/docked state.
- **Apple Home Automations:** Works with Siri, scenes, and Apple Home automations through Matter.
- **Local Connectivity Check:** Includes a command-line check to verify local IP, token, and device ID access before pairing.

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
  "deviceId": "YOUR_DEVICE_ID",
  "pollInterval": 30,
  "connectAttempts": 5
}
```

### How to get your Token
You can use the **[Xiaomi-Cloud-Tokens-Extractor](https://github.com/PiotrMachowski/Xiaomi-Cloud-Tokens-Extractor)** to easily get the IP, Token, and Device ID for all your Xiaomi devices.

## Network Notes
This plugin talks directly to the vacuum over the local Xiaomi miIO protocol on UDP port `54321`.

If Homebridge is on a different VLAN or subnet from the vacuum, basic ping may work while miIO still times out. In that case, add a tightly scoped network rule for Homebridge to reach the vacuum on UDP `54321`. Some Xiaomi vacuums only respond reliably when the traffic appears to come from their own subnet; on UniFi, this can be handled with a small masquerade/source NAT rule from the Homebridge host to the vacuum on UDP `54321`.

You can test local connectivity outside Homebridge with:

```bash
npm run check:local -- <vacuum-ip> <token> <device-id>
```

To trigger the vacuum's locate prompt:

```bash
npm run check:local -- <vacuum-ip> <token> <device-id> --find
```

## Pairing
Once Homebridge starts, check the logs for the **Matter QR Code**. Scan this code with your Home app to add the vacuum.

## License
MIT
