import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig } from 'homebridge';
import { OneCVacuumAccessory } from './accessory.js';
import { XiaomiLocalClient } from './mi-local.js';

export class OneCMatterPlatform implements DynamicPlatformPlugin {
  public readonly accessories: PlatformAccessory[] = [];
  public client?: XiaomiLocalClient;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.api.on('didFinishLaunching', async () => {
      this.log.debug('Executed didFinishLaunching callback');
      await this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  async discoverDevices() {
    if (!this.config.ip || !this.config.token || !this.config.deviceId) {
      this.log.error('Missing Local LAN configuration (IP, Token, or Device ID). Please check your config.json');
      return;
    }

    this.client = new XiaomiLocalClient(this.log, this.config);

    const uuid = this.api.hap.uuid.generate(this.config.deviceId);
    
    // Check if we should use Matter
    if (this.api.isMatterEnabled()) {
      this.log.info('Matter is enabled. Registering as Matter accessory.');
      const matter = this.api.matter!;
      
      const accessory: any = {
        UUID: uuid,
        displayName: 'Xiaomi 1C Vacuum',
        deviceType: matter.deviceTypes.RoboticVacuumCleaner,
        manufacturer: 'Xiaomi',
        model: '1C Vacuum (MC1808)',
        serialNumber: this.config.deviceId, 
        context: { device: { ip: this.config.ip, did: this.config.deviceId } },
        clusters: {
          rvcOperationalState: {
            operationalState: 0, // Stopped
            operationalStateList: [
              { operationalStateId: 0 }, // Stopped
              { operationalStateId: 1 }, // Running
              { operationalStateId: 2 }, // Paused
              { operationalStateId: 3 }, // Error
              { operationalStateId: 4 }, // SeekingCharger
            ],
          },
          rvcRunMode: {
            currentMode: 0,
            supportedModes: [
              { label: 'Idle', mode: 0, modeTags: [{ value: 16384 }] }, // RvcRunMode.ModeTag.Idle
              { label: 'Cleaning', mode: 1, modeTags: [{ value: 16385 }] }, // RvcRunMode.ModeTag.Cleaning
            ],
          },
          powerSource: {
            batPercentRemaining: 200,
            batChargeState: 0,
          },
        },
      };

      new OneCVacuumAccessory(this, accessory, this.client);
      await matter.registerPlatformAccessories('homebridge-1c-matter', 'OneCMatter', [accessory]);
    } else {
      this.log.warn('Matter is NOT enabled. This plugin is optimized for Matter but will fallback to legacy mode if implemented.');
      // Legacy fallback could be implemented here if desired, but user wants Matter.
    }
  }
}
