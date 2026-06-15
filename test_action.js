import miio from 'miio';

async function testAction() {
  const [, , address, token, did, command] = process.argv;

  if (!address || !token || !did) {
    console.error('Usage: npm run check:local -- <ip> <token> <deviceId> [--find]');
    process.exit(2);
  }

  try {
    console.log(`Connecting to vacuum at ${address}:54321...`);
    const device = await miio.device({
      address,
      token,
    });

    if (command === '--find') {
      console.log('Sending locate command...');
      const locateResult = await device.call('action', {
        siid: 17,
        aiid: 1,
        did: String(did),
        in: [],
      }, { retries: 5 });

      console.log('Locate result:', JSON.stringify(locateResult, null, 2));
      device.destroy();
      process.exit(0);
    }
    
    console.log('Reading status, battery, charging state, suction mode, and consumables...');
    const result = await device.call('get_properties', [{
      siid: 3,
      did: String(did),
      piid: 1,
    }, {
      siid: 3,
      did: String(did),
      piid: 2,
    }, {
      siid: 2,
      did: String(did),
      piid: 1,
    }, {
      siid: 2,
      did: String(did),
      piid: 2,
    }, {
      siid: 18,
      did: String(did),
      piid: 6,
    }, {
      siid: 26,
      did: String(did),
      piid: 1,
    }, {
      siid: 26,
      did: String(did),
      piid: 2,
    }, {
      siid: 27,
      did: String(did),
      piid: 1,
    }, {
      siid: 27,
      did: String(did),
      piid: 2,
    }, {
      siid: 28,
      did: String(did),
      piid: 1,
    }, {
      siid: 28,
      did: String(did),
      piid: 2,
    }], { retries: 5 });
    
    console.log('Property result:', JSON.stringify(result, null, 2));
    device.destroy();
    process.exit(0);
  } catch (e) {
    console.error('Local check failed:', e.message);
    process.exit(1);
  }
}

testAction();
