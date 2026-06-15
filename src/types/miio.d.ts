declare module 'miio' {
  export interface DeviceOptions {
    address: string;
    token?: string;
  }

  export interface MiioDevice {
    id?: string;
    miioModel?: string;
    call(method: string, params?: any, options?: any): Promise<any>;
    destroy(): void;
  }

  export function device(options: DeviceOptions): Promise<MiioDevice>;

  const miio: {
    device: typeof device;
  };

  export default miio;
}
