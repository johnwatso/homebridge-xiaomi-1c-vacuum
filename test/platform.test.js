import assert from 'node:assert/strict';
import test from 'node:test';
import { OneCMatterPlatform } from '../dist/platform.js';
import { XiaomiLocalClient } from '../dist/mi-local.js';

test('dock tile registration, command, reset and removal', async t => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  t.mock.method(XiaomiLocalClient.prototype, 'getDeviceInfo', async () => ({}));
  const action = t.mock.method(XiaomiLocalClient.prototype, 'doAction', async () => {});
  t.mock.method(XiaomiLocalClient.prototype, 'getProperties', async () => []);
  const registered = [];
  const removed = [];
  const updates = [];
  const matter = {
    registerPlatformAccessories: async (_plugin, _platform, items) => registered.push(...items),
    unregisterPlatformAccessories: async (_plugin, _platform, items) => removed.push(...items),
    updateAccessoryState: async (...args) => updates.push(args),
    deviceTypes: { RoboticVacuumCleaner: 'vacuum', OnOffOutlet: 'outlet' },
    clusterNames: { RvcOperationalState: 'rvcOperationalState', RvcRunMode: 'rvcRunMode' },
  };
  const api = { matter, on() {}, hap: { uuid: { generate: id => id } }, isMatterEnabled: () => true };
  const config = { ip: '192.0.2.1', token: '0'.repeat(32), deviceId: '123', enableReturnToDockSwitch: true };
  const log = { debug() {}, error() {}, info() {}, warn() {} };
  const platform = new OneCMatterPlatform(log, config, api);
  await platform.discoverDevices();
  const [vacuum, dock] = registered;
  assert.equal(dock.deviceType, 'outlet');
  assert.notEqual(vacuum.UUID, dock.UUID);
  assert.equal(dock.clusters.onOff.onOff, false);
  await dock.handlers.onOff.off();
  assert.equal(action.mock.callCount(), 0);
  updates.length = 0;
  await dock.handlers.onOff.on();
  assert.deepEqual(action.mock.calls.map(call => call.arguments), [[2, 1]]);
  t.mock.timers.tick(500);
  assert.deepEqual(updates.at(-1), [dock.UUID, 'onOff', { onOff: false }]);
  action.mock.mockImplementation(async () => { throw new Error('vacuum offline'); });
  await assert.rejects(dock.handlers.onOff.on(), /vacuum offline/);

  const disabled = new OneCMatterPlatform(log, { ...config, enableReturnToDockSwitch: false }, api);
  disabled.configureMatterAccessory(vacuum);
  disabled.configureMatterAccessory(dock);
  registered.length = 0;
  await disabled.discoverDevices();
  assert.deepEqual(registered.map(item => item.UUID), [vacuum.UUID]);
  assert.deepEqual(removed, [dock]);
});
