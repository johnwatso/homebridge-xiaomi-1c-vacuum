import miio from 'miio';

export class XiaomiLocalClient {
  private device: any = null;
  private readonly connectAttempts: number;

  constructor(
    private readonly log: any,
    private readonly config: any,
  ) {
    this.connectAttempts = Number(this.config.connectAttempts || 5);
  }

  private async resetDevice() {
    if (!this.device) return;

    try {
      await Promise.resolve(this.device.destroy?.());
    } catch (e: any) {
      this.log.debug('Failed to destroy stale Xiaomi connection:', e.message);
    } finally {
      this.device = null;
    }
  }

  private assertMiotSuccess(result: any, label: string) {
    const responses = Array.isArray(result) ? result : [result];
    const failed = responses.find((res: any) => res && res.code !== undefined && res.code !== 0);

    if (failed) {
      throw new Error(`${label} failed with MIoT code ${failed.code}`);
    }
  }

  async init() {
    try {
      await this.resetDevice();
      this.log.info(`Connecting to Xiaomi device at ${this.config.ip}:54321`);
      this.device = await miio.device({
        address: this.config.ip,
        token: this.config.token,
      });
      this.log.info('Xiaomi Local LAN connection initialized');
    } catch (e: any) {
      await this.resetDevice();
      this.log.error(`Failed to connect to Xiaomi device locally at ${this.config.ip}:54321: ${e.message}`);
      this.log.error('Check that the vacuum is awake, on the same network/VLAN, reachable on UDP port 54321, and that the local token is correct.');
      throw e;
    }
  }

  async getProperties(props: { siid: number; piid: number }[]) {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        if (!this.device) await this.init();

        const miotProps = props.map(p => ({
          did: String(this.config.deviceId),
          siid: p.siid,
          piid: p.piid,
        }));
        
        const results = await this.device.call('get_properties', miotProps, { retries: this.connectAttempts });
        this.log.debug('Received local property result:', JSON.stringify(results));
        
        if (!Array.isArray(results)) {
          throw new Error('Unexpected response format from get_properties');
        }

        return results.map((res: any, i: number) => ({
          siid: props[i].siid,
          piid: props[i].piid,
          value: res.value !== undefined ? res.value : res,
        }));
      } catch (e: any) {
        attempt++;
        this.log.warn(`Failed to get local properties (attempt ${attempt}/${maxRetries}):`, e.message);
        await this.resetDevice();
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }
    return [];
  }

  async doAction(siid: number, aiid: number, params: any[] = []) {
    try {
      if (!this.device) await this.init();

      const result = await this.device.call('action', {
        siid,
        aiid,
        did: String(this.config.deviceId),
        in: params,
      });
      this.assertMiotSuccess(result, `Action siid ${siid} aiid ${aiid}`);
      
      this.log.info(`Local Action siid ${siid} aiid ${aiid} successful`);
      return result;
    } catch (e: any) {
      this.log.error('Failed to execute local action:', e.message);
      await this.resetDevice();
      throw e;
    }
  }

  async setProperty(siid: number, piid: number, value: any) {
    try {
      if (!this.device) await this.init();

      const result = await this.device.call('set_properties', [{
        did: String(this.config.deviceId),
        siid,
        piid,
        value,
      }], { retries: this.connectAttempts });
      this.assertMiotSuccess(result, `Property siid ${siid} piid ${piid}`);

      this.log.info(`Local Property siid ${siid} piid ${piid} set to ${value}`);
      return result;
    } catch (e: any) {
      this.log.error('Failed to set local property:', e.message);
      await this.resetDevice();
      throw e;
    }
  }
}
