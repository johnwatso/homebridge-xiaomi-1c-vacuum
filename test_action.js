import miio from 'miio';

async function testAction() {
  const [, , address, token, did] = process.argv;

  if (!address || !token || !did) {
    console.error('Usage: npm run check:local -- <ip> <token> <deviceId>');
    process.exit(2);
  }

  try {
    console.log(`Connecting to vacuum at ${address}:54321...`);
    const device = await miio.device({
      address,
      token,
    });
    
    console.log('Reading status, battery, and charging state...');
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
