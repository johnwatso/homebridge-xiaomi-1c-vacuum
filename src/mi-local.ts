import miio from 'miio-api';

export class XiaomiLocalClient {
  private device: any = null;

  constructor(
    private readonly log: any,
    private readonly config: any,
  ) {}

  async init() {
    try {
      this.device = await miio.device({
        address: this.config.ip,
        token: this.config.token,
      });
      this.log.info('Xiaomi Local LAN connection initialized');
    } catch (e: any) {
      this.log.error('Failed to connect to Xiaomi device locally:', e.message);
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
        
        const results = await this.device.call('get_properties', miotProps, { timeout: 8000 });
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
        this.device = null; // Reset connection for retry
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
      
      this.log.info(`Local Action siid ${siid} aiid ${aiid} successful`);
      return result;
    } catch (e: any) {
      this.log.error('Failed to execute local action:', e.message);
      this.device = null;
      throw e;
    }
  }
}
