import { getMiIOT } from 'mi-service-lite';

export class XiaomiCloudClient {
  private miIot: any;

  constructor(
    private readonly log: any,
    private readonly config: any,
  ) {}

  async init() {
    try {
      this.miIot = await getMiIOT({
        userId: this.config.username,
        password: this.config.password,
      });
      if (!this.miIot) {
        throw new Error('Failed to get MiIOT instance');
      }
      this.log.info('Xiaomi Cloud authenticated successfully');
    } catch (e: any) {
      this.log.error('Failed to authenticate with Xiaomi Cloud:', e.message);
      throw e;
    }
  }

  async getProperties(props: { siid: number; piid: number }[]) {
    try {
      const results = await Promise.all(
        props.map(p => this.miIot.getProperty(p.siid, p.piid))
      );
      // Map back to our expected format
      return props.map((p, i) => ({ ...p, value: results[i] }));
    } catch (e: any) {
      this.log.error('Failed to get properties:', e.message);
      return [];
    }
  }

  async doAction(siid: number, aiid: number, params: any = null) {
    try {
      const result = await this.miIot.doAction(siid, aiid, params);
      this.log.debug(`Action siid ${siid} aiid ${aiid} result:`, result);
      return result;
    } catch (e: any) {
      this.log.error('Failed to execute action:', e.message);
      throw e;
    }
  }
}
