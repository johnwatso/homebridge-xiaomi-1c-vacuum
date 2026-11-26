import assert from 'node:assert/strict';
import test from 'node:test';

import { OneCVacuumAccessory } from '../dist/accessory.js';

const logger = () => ({ debug() {}, error() {}, info() {}, warn() {} });

function createFixture(t, config = {}, propertyValues = {}) {
  const intervals = [];
  t.mock.method(global, 'setInterval', (_callback, delay) => {
    intervals.push(delay);
    return { timer: 'interval' };
  });
  t.mock.method(global, 'setTimeout', () => ({ timer: 'timeout' }));

  const updates = [];
  const actions = [];
  const clientCalls = [];
  const matter = {
    clusterNames: {
      RvcOperationalState: 'rvcOperationalState',
      RvcRunMode: 'rvcRunMode',
      RvcCleanMode: 'rvcCleanMode',
      PowerSource: 'powerSource',
    },
    updateAccessoryState: async (uuid, cluster, payload) => {
      updates.push({ uuid, cluster, payload });
    },
  };
  const client = {
    doAction: async (...args) => {
      actions.push(args);
      clientCalls.push({ method: 'doAction', args });
    },
    getProperties: async () => [
      { siid: 3, piid: 1, value: propertyValues.fault ?? 0 },
      { siid: 3, piid: 2, value: propertyValues.status ?? 1 },
      { siid: 2, piid: 1, value: propertyValues.battery ?? 80 },
      { siid: 2, piid: 2, value: propertyValues.charging ?? 2 },
      { siid: 18, piid: 6, value: propertyValues.cleaningMode ?? 3 },
    ],
    setProperty: async (...args) => {
      clientCalls.push({ method: 'setProperty', args });
    },
  };
  const accessory = { UUID: 'test-vacuum', handlers: {} };
  const platform = { api: { matter }, config, log: logger() };

  const controller = new OneCVacuumAccessory(platform, accessory, client);
  return { accessory, actions, client, clientCalls, controller, intervals, updates, matter };
}

test('maps a cleaning status response to Matter clusters', async t => {
  const { controller, updates } = createFixture(t);

  await controller.updateStatus();

  assert.deepEqual(updates, [
    { uuid: 'test-vacuum', cluster: 'rvcOperationalState', payload: { operationalState: 1 } },
    { uuid: 'test-vacuum', cluster: 'rvcRunMode', payload: { currentMode: 1 } },
    { uuid: 'test-vacuum', cluster: 'rvcCleanMode', payload: { currentMode: 3 } },
    { uuid: 'test-vacuum', cluster: 'powerSource', payload: { batPercentRemaining: 160, batChargeState: 3 } },
  ]);
});

test('go-home handler sends the expected action and optimistic Matter state', async t => {
  const { accessory, actions, updates } = createFixture(t);

  await accessory.handlers.rvcOperationalState.goHome();

  assert.deepEqual(actions, [[2, 1]]);
  assert.deepEqual(updates, [
    { uuid: 'test-vacuum', cluster: 'rvcOperationalState', payload: { operationalState: 64 } },
    { uuid: 'test-vacuum', cluster: 'rvcRunMode', payload: { currentMode: 0 } },
  ]);
});

test('reapplies the selected suction mode before starting a clean', async t => {
  const { accessory, clientCalls } = createFixture(t);

  await accessory.handlers.rvcCleanMode.changeToMode({ newMode: 3 });
  clientCalls.length = 0;
  await accessory.handlers.rvcRunMode.changeToMode({ newMode: 1 });

  assert.deepEqual(clientCalls, [
    { method: 'setProperty', args: [18, 6, 3] },
    { method: 'doAction', args: [3, 1] },
  ]);
});

test('does not let an idle status poll overwrite a pending suction selection', async t => {
  const { accessory, clientCalls, controller } = createFixture(t, {}, { cleaningMode: 0 });

  await accessory.handlers.rvcCleanMode.changeToMode({ newMode: 3 });
  await controller.updateStatus();
  clientCalls.length = 0;
  await accessory.handlers.rvcRunMode.changeToMode({ newMode: 1 });

  assert.deepEqual(clientCalls, [
    { method: 'setProperty', args: [18, 6, 3] },
    { method: 'doAction', args: [3, 1] },
  ]);
});

test('uses standard suction when cleaning starts before the first status poll', async t => {
  const { accessory, clientCalls } = createFixture(t);

  await accessory.handlers.rvcRunMode.changeToMode({ newMode: 1 });

  assert.deepEqual(clientCalls, [
    { method: 'setProperty', args: [18, 6, 1] },
    { method: 'doAction', args: [3, 1] },
  ]);
});

test('coalesces duplicate Matter Identify commands', async t => {
  const { accessory, actions } = createFixture(t);

  await accessory.handlers.identify.identify();
  await accessory.handlers.identify.identify();

  assert.deepEqual(actions, [[17, 1]]);
});

test('allows another Matter Identify command after the deduplication window', async t => {
  let now = 10000;
  t.mock.method(Date, 'now', () => now);
  const { accessory, actions } = createFixture(t);

  await accessory.handlers.identify.identify();
  now += 2000;
  await accessory.handlers.identify.identify();

  assert.deepEqual(actions, [[17, 1], [17, 1]]);
});

test('allows an immediate Matter Identify retry after a failed locate action', async t => {
  const { accessory, actions, client } = createFixture(t);
  let shouldFail = true;
  client.doAction = async (...args) => {
    actions.push(args);
    if (shouldFail) {
      shouldFail = false;
      throw new Error('locate failed');
    }
  };

  await assert.rejects(accessory.handlers.identify.identify(), /locate failed/);
  await accessory.handlers.identify.identify();

  assert.deepEqual(actions, [[17, 1], [17, 1]]);
});

test('checks Mi Home state every five seconds without changing the full poll interval', t => {
  const { intervals } = createFixture(t, { pollInterval: 60 });

  assert.deepEqual(intervals, [60000, 5000]);
});

test('reports charging and fully charged dock states to Matter', async t => {
  const charging = createFixture(t, {}, { status: 6, charging: 1, battery: 75 });
  await charging.controller.updateStatus();
  assert.deepEqual(charging.updates[0], {
    uuid: 'test-vacuum',
    cluster: 'rvcOperationalState',
    payload: { operationalState: 65 },
  });

  const docked = createFixture(t, {}, { status: 13, charging: 4, battery: 100 });
  await docked.controller.updateStatus();
  assert.deepEqual(docked.updates[0], {
    uuid: 'test-vacuum',
    cluster: 'rvcOperationalState',
    payload: { operationalState: 66 },
  });
});

test('does not report a Mi Home-started clean as charging when the charge property is stale', async t => {
  const { controller, updates } = createFixture(t, {}, {
    status: 1,
    charging: 4,
    battery: 100,
  });

  await controller.updateStatus();

  assert.deepEqual(updates[0], {
    uuid: 'test-vacuum',
    cluster: 'rvcOperationalState',
    payload: { operationalState: 1 },
  });
  assert.deepEqual(updates[3], {
    uuid: 'test-vacuum',
    cluster: 'powerSource',
    payload: { batPercentRemaining: 200, batChargeState: 3 },
  });
});

test('does not report an idle vacuum moved with Mi Home remote control as docked', async t => {
  const { controller, updates } = createFixture(t, {}, {
    status: 2,
    charging: 4,
    battery: 100,
  });

  await controller.updateStatus();

  assert.deepEqual(updates[0], {
    uuid: 'test-vacuum',
    cluster: 'rvcOperationalState',
    payload: { operationalState: 0 },
  });
  assert.deepEqual(updates[3], {
    uuid: 'test-vacuum',
    cluster: 'powerSource',
    payload: { batPercentRemaining: 200, batChargeState: 3 },
  });
});

test('an active clean stays in Cleaning run mode across pause and polling', async t => {
  const { accessory, controller, updates } = createFixture(t, {}, { status: 3 });
  await accessory.handlers.rvcOperationalState.pause();
  assert.deepEqual(updates.slice(0, 2).map(update => update.payload), [
    { operationalState: 2 }, { currentMode: 1 },
  ]);
  await controller.updateStatus(true);
  assert.deepEqual(updates.slice(2, 4).map(update => update.payload), [
    { operationalState: 2 }, { currentMode: 1 },
  ]);
});

test('Start uses the current Matter room selection and clearing restores whole-home cleaning', async t => {
  const { accessory, actions, clientCalls, matter } = createFixture(t, {
    roomCleanRepeats: 2, roomCleanSuction: 3,
  });
  accessory.clusters = { serviceArea: {} };
  let selectedAreas = [4];
  matter.getAccessoryState = async (uuid, cluster) => {
    assert.equal(uuid, accessory.UUID);
    assert.equal(cluster, 'serviceArea');
    return { selectedAreas };
  };
  selectedAreas = [7, 9];
  assert.deepEqual(actions, []);
  await accessory.handlers.rvcRunMode.changeToMode({ newMode: 1 });
  assert.deepEqual(actions, [[18, 1, [
    { piid: 1, value: 18 },
    { piid: 21, value: JSON.stringify({ selects: [[7, 2, 3, 3, 1], [9, 2, 3, 3, 1]] }) },
  ]]]);
  selectedAreas = [];
  clientCalls.length = 0;
  await accessory.handlers.rvcRunMode.changeToMode({ newMode: 1 });
  assert.deepEqual(clientCalls.map(call => call.args), [[18, 6, 1], [3, 1]]);
  matter.getAccessoryState = async () => undefined;
  await assert.rejects(accessory.handlers.rvcRunMode.changeToMode({ newMode: 1 }), /selected rooms/);
  assert.equal(actions.length, 2);
});
