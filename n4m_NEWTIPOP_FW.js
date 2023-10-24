const maxApi = require('max-api');
const Nano33BLE = require('@vliegwerk/arduino-nano-33-ble')
const nano33ble = new Nano33BLE({
    enable: [
    'NewTipopSwitch',
    'NewTipopPressure',
    'NewTipopJoystick'
    ],
	mean: true,
	stddev: true
});

maxApi.post('Connecting...');

nano33ble.connect().then(connected => {
	if (!connected) {
		maxApi.post('Unable to connect to Nano 33 BLE service');
		process.exit(1);
	}
});

nano33ble.on('connected', id => {
    // console.log(`Connected to ${id}`);
    maxApi.post(`Connected to ${id}`)

    nano33ble.on('NewTipopSwitch', data => {
        maxApi.outlet(data);
    });
    nano33ble.on('NewTipopPressure', data => {
        maxApi.outlet(data);
    });
    nano33ble.on('NewTipopJoystick', data =>{
        maxApi.outlet(data);
    });
});



nano33ble.on('error', err => {
    // console.error(err.message);
    maxApi.post(err.message);
});

nano33ble.on('disconnected', id => {
    // console.log(`Disconnected from ${id}`);
    maxApi.post(`Disconnected from ${id}`);
});