import assert from 'node:assert/strict';
import test from 'node:test';

import { XiaomiLocalClient } from '../dist/mi-local.js';

const logger = () => ({ debug() {}, error() {}, info() {}, warn() {} });

test('returns requested property values from a successful MIoT response', async () => {
  const device = {
    call: async () => [{ siid: 3, piid: 2, code: 0, value: 1 }],
    destroy() {},
  };
  const client = new XiaomiLocalClient(
    logger(),
    { ip: '192.0.2.1', token: 'a'.repeat(32), deviceId: '1' },
    async () => device,
  );

  const properties = await client.getProperties([{ siid: 3, piid: 2 }]);

  assert.deepEqual(properties, [{ siid: 3, piid: 2, value: 1 }]);
});

test('rejects MIoT property errors without repeated calls or reconnects', async () => {
  let calls = 0;
  let destroys = 0;
  const device = {
    call: async () => {
      calls++;
      return [{ siid: 3, piid: 2, code: -1 }];
    },
    destroy() { destroys++; },
  };
  const client = new XiaomiLocalClient(
    logger(),
    { ip: '192.0.2.1', token: 'a'.repeat(32), deviceId: '1' },
    async () => device,
  );

  await assert.rejects(client.getProperties([{ siid: 3, piid: 2 }]), /MIoT code -1/);
  assert.equal(calls, 1);
  assert.equal(destroys, 0);
});

test('discovery shares the request deadline and a late connection cannot send a command', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const discovery = Promise.withResolvers();
  let connections = 0;
  let lateCalls = 0;
  let destroyed = 0;
  const fresh = { call: async () => 'ok', destroy() {} };
  const client = new XiaomiLocalClient(logger(), { requestTimeout: 100 },
    async () => ++connections === 1 ? discovery.promise : fresh);
  const pending = assert.rejects(client.doAction(2, 1), /timed out after 100ms/);
  t.mock.timers.tick(100);
  await pending;
  assert.equal(await client.getDeviceInfo(), 'ok');
  discovery.resolve({ call() { lateCalls++; }, destroy() { destroyed++; } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(lateCalls, 0);
  assert.equal(destroyed, 1);
  assert.equal(await client.getDeviceInfo(), 'ok');
  assert.equal(connections, 2);
});

test('a failed poll leaves the handle alive until a concurrent command completes', async () => {
  const poll = Promise.withResolvers();
  const command = Promise.withResolvers();
  let destroyed = 0;
  let connections = 0;
  const calls = [];
  const shared = {
    call(method, _args, options) {
      calls.push([method, options.retries]);
      return method === 'get_properties' ? poll.promise : command.promise;
    },
    destroy() { destroyed++; },
  };
  const fresh = { call: async () => 'new', destroy() {} };
  const client = new XiaomiLocalClient(logger(), { connectAttempts: 2 },
    async () => ++connections === 1 ? shared : fresh);
  const read = client.getProperties([{ siid: 3, piid: 2 }]);
  const action = client.doAction(2, 1);
  poll.reject(new Error('transport failure'));
  await assert.rejects(read, /transport failure/);
  assert.equal(destroyed, 0);
  assert.equal(await client.getDeviceInfo(), 'new');
  command.resolve({ code: 0 });
  await action;
  assert.equal(destroyed, 1);
  assert.deepEqual(calls, [['get_properties', 2], ['action', 2]]);
  assert.equal(await client.getDeviceInfo(), 'new');
  assert.equal(connections, 2);
});

test('a timed-out poll does not destroy a connection while a command uses it', async () => {
  let release;
  let destroyed = 0;
  const device = {
    call: method => method === 'get_properties' ? new Promise(() => {}) : new Promise(resolve => { release = resolve; }),
    destroy: () => { destroyed++; },
  };
  const client = new XiaomiLocalClient(logger(), { ip: '192.0.2.1', token: 'a'.repeat(32), deviceId: '1', requestTimeout: 25 }, async () => device);
  const poll = client.getProperties([{ siid: 3, piid: 2 }]);
  await new Promise(resolve => setTimeout(resolve, 10));
  const command = client.doAction(2, 1);
  await assert.rejects(poll, /timed out/);
  assert.equal(destroyed, 0);
  release({ code: 0 });
  await command;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(destroyed, 1);
});

test('a command is not sent after connection discovery times out', async () => {
  let finishDiscovery;
  let calls = 0;
  let destroyed = 0;
  const client = new XiaomiLocalClient(logger(), { ip: '192.0.2.1', token: 'a'.repeat(32), deviceId: '1', requestTimeout: 10 }, () => new Promise(resolve => { finishDiscovery = resolve; }));
  await assert.rejects(client.doAction(2, 1), /timed out/);
  finishDiscovery({ call() { calls++; }, destroy() { destroyed++; } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 0);
  assert.equal(destroyed, 1);
});
