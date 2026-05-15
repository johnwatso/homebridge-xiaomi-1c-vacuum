import { CharacteristicValue } from 'homebridge';
import { OneCMatterPlatform } from './platform.js';
import { XiaomiCloudClient } from './mi-cloud.js';

export class OneCVacuumAccessory {
  constructor(
    private readonly platform: OneCMatterPlatform,
    private readonly accessory: any, // MatterAccessory
    private readonly client: XiaomiCloudClient,
  ) {
    const matter = this.platform.api.matter!;

    // Register handlers
    this.accessory.handlers = {
      rvcOperationalState: {
        pause: async () => {
          this.platform.log.info('Matter: Pause command');
          await this.client.doAction(3, 2); // Stop Sweep
        },
        resume: async () => {
          this.platform.log.info('Matter: Resume command');
          await this.client.doAction(3, 1); // Start Sweep
        },
        goHome: async () => {
          this.platform.log.info('Matter: Go Home command');
          await this.client.doAction(3, 5); // Go Charging
        },
      },
      rvcRunMode: {
        changeToMode: async (args: any) => {
          this.platform.log.info('Matter: Change to mode', args.newMode);
          if (args.newMode === 1) {
            await this.client.doAction(3, 1); // Start Sweep
          } else {
            await this.client.doAction(3, 2); // Stop Sweep
          }
        },
      },
    };

    // Polling
    const interval = (this.platform.config.pollInterval || 30) * 1000;
    setInterval(() => this.updateStatus(), interval);
    this.updateStatus(); // Initial update
  }

  async updateStatus() {
    try {
      const props = await this.client.getProperties([
        { siid: 3, piid: 1 }, // Status
        { siid: 2, piid: 1 }, // Battery Level
        { siid: 2, piid: 2 }, // Charging State
      ]);

      if (!props || props.length === 0) return;

      const status = props.find((p: any) => p.siid === 3 && p.piid === 1)?.value;
      const battery = props.find((p: any) => p.siid === 2 && p.piid === 1)?.value;
      const charging = props.find((p: any) => p.siid === 2 && p.piid === 2)?.value;

      const matter = this.platform.api.matter!;

      // Map Status to Matter RVC Operational State
      // Xiaomi Status 1: Idle, 2: Busy (Cleaning), 3: Paused, 4: Error, 5: Go Charging
      // Matter OperationalState: 0: Stopped, 1: Running, 2: Paused, 3: Error, 4: SeekingCharger
      let opState = 0;
      if (status === 2) opState = 1;
      else if (status === 3) opState = 2;
      else if (status === 4) opState = 3;
      else if (status === 5) opState = 4;

      await matter.updateAccessoryState(this.accessory.UUID, matter.clusterNames.RvcOperationalState, {
        operationalState: opState,
      });

      // Map to RvcRunMode
      await matter.updateAccessoryState(this.accessory.UUID, matter.clusterNames.RvcRunMode, {
        currentMode: status === 2 ? 1 : 0,
      });

      // Battery (PowerSource cluster)
      if (battery !== undefined) {
        // Matter batPercentRemaining is 0-200 (0.5% steps)
        await matter.updateAccessoryState(this.accessory.UUID, matter.clusterNames.PowerSource, {
          batPercentRemaining: battery * 2,
          batChargeState: charging === 1 ? 1 : 0, // 1 = Charging, 0 = Not Charging
        });
      }

    } catch (e: any) {
      this.platform.log.error('Error updating status:', e.message);
    }
  }
}
