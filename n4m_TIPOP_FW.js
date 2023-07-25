const maxApi = require('max-api');
const Nano33BLE = require('@vliegwerk/arduino-nano-33-ble')
const nano33ble = new Nano33BLE({
    enable: [
    'TipopSwitch',
    'TipopPressure',
    'TipopJoystick'
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

    nano33ble.on('TipopSwitch', data => {
        maxApi.outlet(data);
    });
    nano33ble.on('TipopPressure', data => {
        maxApi.outlet(data);
    });
    nano33ble.on('TipopJoystick', data =>{
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