import miio from 'miio-api';

async function testAction() {
  try {
    console.log('Connecting to vacuum...');
    const device = await miio.device({
      address: '10.11.3.248',
      token: 'YOUR_32_CHARACTER_TOKEN',
    });
    
    const did = 415069056;
    console.log('Sending Start Sweep action...');
    const result = await device.call('action', {
      siid: 3,
      aiid: 1,
      did: String(did),
      in: []
    }, { timeout: 10000 });
    
    console.log('Action result:', JSON.stringify(result, null, 2));
    device.destroy();
    process.exit(0);
  } catch (e) {
    console.error('Action failed:', e.message);
    process.exit(1);
  }
}

testAction();
