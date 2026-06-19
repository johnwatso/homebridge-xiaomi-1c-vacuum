# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-06-19

### Fixed
- Included `CHANGELOG.md` in the release package and aligned git tags to show release notes correctly in the Homebridge UI.

## [1.1.0] - 2026-06-19

### Added
- **Dynamic Firmware Version Reporting:** Retrieve the vacuum's actual firmware version (e.g. `3.5.8_1059`) at startup via local connection instead of using a static fallback.
- **Config Validation:** Added strict format validation checks for `ip`, `token` (32 hex characters), and `deviceId` (numeric) during platform initialization to produce clear, friendly startup logs.
- **Room Cleaning (Experimental):** Added room-by-room vacuuming support using the Matter `ServiceArea` cluster. Exposes saved room IDs to controllers for targeted cleaning.

### Changed
- **Battery Status Mapping:** Refined the battery charging state mapping for the Matter `PowerSource.batChargeState` enum to support charging, discharging, and full-charge states correctly.

### Fixed
- **Command Retries:** Added retries (using `connectAttempts`) to UDP commands in `doAction(...)` for improved local network reliability.
- **Parsing Robustness:** Made property mapping bounds-safe to prevent runtime crashes if the device returns partial or missing values.
- **Legacy Cache Leak:** Automatically unregister cached legacy HAP platform accessories on startup when Matter mode is active, avoiding duplicate or unresponsive objects in Homebridge.

---

## [1.0.2] - 2026-05-26

### Changed
- Normalized package structure with a whitelisted `files` list in `package.json` to keep package sizes lightweight.
- Extensively updated documentation, including network configuration guides for cross-subnet VLAN setups and details of supported models.

### Fixed
- Polished diagnostic messages, connection timing, and overall Command response times.

---

## [1.0.1] - 2026-05-26

### Added
- **Local LAN Control:** Bypasses Xiaomi Cloud by talking directly to the vacuum locally via the UDP `miIO` transport.
- **Matter Fan/Cleaner Control:** Exposes Quiet, Default, Medium, and Strong suction modes.
- **Locate Command:** Registers standard HomeKit identify callbacks to trigger the vacuum's audible locate command.
- **Consumable Warning Log:** Warns the user when the brush or filter life dips below configured thresholds (default: 20%).
- **CLI Diagnostic Helper:** Added a `check:local` utility to verify network settings and reset consumables (filter, main brush, side brush) from the command line.
