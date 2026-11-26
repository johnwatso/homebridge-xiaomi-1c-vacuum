import miio, { type MiioDevice } from 'miio';

type DeviceFactory = (options: { address: string; token: string }) => Promise<MiioDevice>;

interface Connection {
  device: Promise<MiioDevice>;
  users: number;
}

export class XiaomiLocalClient {
  private connection?: Connection;
  private readonly connectAttempts: number;
  private readonly requestTimeoutMs: number;

  constructor(
    private readonly log: any,
    private readonly config: any,
    private readonly deviceFactory: DeviceFactory = miio.device,
  ) {
    this.connectAttempts = Number(this.config.connectAttempts || 5);
    const requestTimeout = Number(this.config.requestTimeout);
    this.requestTimeoutMs = Number.isFinite(requestTimeout) && requestTimeout > 0 ? requestTimeout : 15000;
  }

  private assertMiotSuccess(result: any, label: string) {
    const responses = Array.isArray(result) ? result : [result];
    const failed = responses.find((res: any) => res && res.code !== undefined && res.code !== 0);

    if (failed) {
      throw new Error(`${label} failed with MIoT code ${failed.code}`);
    }
  }

  private async callDevice(method: string, params: any, label: string) {
    const connection = this.connection ??= {
      device: this.deviceFactory({ address: this.config.ip, token: this.config.token }),
      users: 0,
    };
    connection.users++;
    let expired = false;
    let timeout: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        connection.device.then(device => {
          // Discovery can finish after the deadline. Never dispatch a late command.
          if (expired) throw new Error(`${label} expired during discovery`);
          return device.call(method, params, { retries: this.connectAttempts });
        }),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            expired = true;
            reject(new Error(`${label} timed out after ${this.requestTimeoutMs}ms`));
          }, this.requestTimeoutMs);
        }),
      ]);
    } catch (error) {
      if (this.connection === connection) this.connection = undefined;
      throw error;
    } finally {
      clearTimeout(timeout);
      connection.users--;
      if (connection.users === 0 && this.connection !== connection) {
        // Retire only this handle, after every overlapping caller has finished.
        void connection.device.then(device => device.destroy(), () => {}).catch(error => {
          this.log.debug('Failed to destroy stale Xiaomi connection:', error.message);
        });
      }
    }
  }

  async getProperties(props: { siid: number; piid: number }[]) {
    const miotProps = props.map(prop => ({ did: String(this.config.deviceId), ...prop }));
    const results = await this.callDevice('get_properties', miotProps, 'get_properties');
    this.log.debug('Received local property result:', JSON.stringify(results));
    if (!Array.isArray(results)) throw new Error('Unexpected response format from get_properties');
    this.assertMiotSuccess(results, 'get_properties');

    return results.map((res: any, i: number) => ({
      siid: res?.siid ?? props[i]?.siid,
      piid: res?.piid ?? props[i]?.piid,
      value: res?.value !== undefined ? res.value : res,
    })).filter(item => item.siid !== undefined && item.piid !== undefined);
  }

  async doAction(siid: number, aiid: number, params: any[] = []) {
    try {
      const result = await this.callDevice('action', {
        siid,
        aiid,
        did: String(this.config.deviceId),
        in: params,
      }, `Action siid ${siid} aiid ${aiid}`);
      this.assertMiotSuccess(result, `Action siid ${siid} aiid ${aiid}`);
      
      this.log.info(`Local Action siid ${siid} aiid ${aiid} successful`);
      return result;
    } catch (e: any) {
      this.log.error('Failed to execute local action:', e.message);
      throw e;
    }
  }

  async setProperty(siid: number, piid: number, value: any) {
    try {
      const result = await this.callDevice('set_properties', [{
        did: String(this.config.deviceId),
        siid,
        piid,
        value,
      }], `Property siid ${siid} piid ${piid}`);
      this.assertMiotSuccess(result, `Property siid ${siid} piid ${piid}`);

      this.log.info(`Local Property siid ${siid} piid ${piid} set to ${value}`);
      return result;
    } catch (e: any) {
      this.log.error('Failed to set local property:', e.message);
      throw e;
    }
  }

  async getDeviceInfo() {
    try {
      const result = await this.callDevice('miIO.info', [], 'miIO.info');
      return result;
    } catch (e: any) {
      this.log.error('Failed to fetch local device info:', e.message);
      throw e;
    }
  }
}
