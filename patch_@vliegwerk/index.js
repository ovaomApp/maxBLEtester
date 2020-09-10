/*
   Node.js interface for the Arduino Nano 33 BLE and Nano 33 BLE Sense microcontroller board.

   Copyright (C) 2019 Arduino SA [original work, https://github.com/arduino/ArduinoAI/blob/master/BLESense-test-dashboard/index.html]
   Copyright (C) 2020 Niels Janssen // VLIEGWERK (https://www.vliegwerk.com)
   Copyright (C) 2020 Simon Juif (https://www.ovaom.com)

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <https://www.gnu.org/licenses/>.
   
*/
'use strict'
const EventEmitter = require('events')
const { Bluetooth, BluetoothDevice } = require('webbluetooth')

const SERVICE_UUID = 'd91cb6ee-d174-11ea-87d0-0242ac130003'

const CORACCELEROMETER = 'CorAccelerometer'
const CORGYROSCOPE = 'CorGyroscope'
const CORMAGNETOMETER = 'CorMagnetometer'
const CORUI = 'CorUI'
const CORLED = 'CorLed'

const BOLACCELEROMETER = 'BolAccelerometer'
const BOLGYROSCOPE = 'BolGyroscope'
const BOLMAGNETOMETER = 'BolMagnetometer'
const BOLUI = 'BolUI'
const BOLLED = 'BolLed'

const CONNECTED = 'connected'
const DISCONNECTED = 'disconnected'
const ERROR = 'error'
const SUFFIX_MEAN = '_mean'
const SUFFIX_STDDEV = '_stddev'

const OPTION_DEFAULTS = {
	//enable: [ACCELEROMETER, GYROSCOPE, MAGNETOMETER],
	pollingInterval: 500,//500
	mean: false,
	stddev: false,
	windowSize: 64
}

class Nano33BLE extends EventEmitter {
	constructor(options = {}) {
		super()

		const {
			windowSize = OPTION_DEFAULTS.windowSize,
			pollingInterval = OPTION_DEFAULTS.pollingInterval,
			enable = OPTION_DEFAULTS.enable,
			mean = OPTION_DEFAULTS.mean,
			stddev = OPTION_DEFAULTS.stddev
		} = options

		this.windowSize = windowSize
		this.pollingInterval = pollingInterval
		this.enable = enable
		this.mean = mean
		this.stddev = stddev

		this.bluetooth = new Bluetooth()

		this.characteristics = {
			[CORACCELEROMETER]: {
				uuid: 'd91cb6ee-1002-11ea-87d0-0242ac130003',
				properties: ['BLENotify'],
				structure: ['Int16', 'Int16', 'Int16'],
				data: { cax: [], cay: [], caz: [] }
			},
			[CORGYROSCOPE]: {
				uuid: 'd91cb6ee-1003-11ea-87d0-0242ac130003',
				properties: ['BLENotify'],
				structure: ['Int16', 'Int16', 'Int16'],
				data: { cgx: [], cgy: [], cgz: [] }
			},
			[CORMAGNETOMETER]: {
				uuid: 'd91cb6ee-1004-11ea-87d0-0242ac130003',
				properties: ['BLENotify'],
				structure: ['Int16', 'Int16', 'Int16'],
				data: { cmx: [], cmy: [], cmz: [] }
			},
			[CORUI]: {
				uuid: 'd91cb6ee-1001-11ea-87d0-0242ac130003',
				properties: ['BLENotify'],
				structure: ['Uint16', 'Uint16', 'Uint16', 'Uint16'],
				data: { ca0: [], ca1: [], ca2: [], cb: [] }
			},
			[CORLED]: {
				uuid: 'd91cb6ee-3001-11ea-87d0-0242ac130003',
				properties: ['BLEWrite'],
				structure: ['Uint16', 'Uint16', 'Uint16'],
				data: { cr: [], cg: [], cb: [] }
			},

			[BOLACCELEROMETER]: {
				uuid: 'd91cb6ee-2002-11ea-87d0-0242ac130003',
				properties: ['BLENotify'],
				structure: ['Int16', 'Int16', 'Int16'],
				data: { bax: [], bay: [], baz: [] }
			},
			[BOLGYROSCOPE]: {
				uuid: 'd91cb6ee-2003-11ea-87d0-0242ac130003',
				properties: ['BLENotify'],
				structure: ['Int16', 'Int16', 'Int16'],
				data: { bgx: [], bgy: [], bgz: [] }
			},
			[BOLMAGNETOMETER]: {
				uuid: 'd91cb6ee-2004-11ea-87d0-0242ac130003',
				properties: ['BLENotify'],
				structure: ['Int16', 'Int16', 'Int16'],
				data: { bmx: [], bmy: [], bmz: [] }
			},
			[BOLUI]: {
				uuid: 'd91cb6ee-2001-11ea-87d0-0242ac130003',
				properties: ['BLENotify', 'BLEWrite'],
				structure: ['Uint16', 'Uint16', 'Uint16', 'Uint16', 'Uint16'],
				data: { ba0: [], ba1: [], ba2: [], ba3: [], bb: [] }
			},
			[BOLLED]: {
				uuid: 'd91cb6ee-4001-11ea-87d0-0242ac130003',
				properties: ['BLERead', 'BLEWrite'],
				structure: ['Uint16', 'Uint16', 'Uint16'],
				data: { br: [], bg: [], bb: [] }
			}
		}

		this.sensors = Object.keys(this.characteristics)
	}

	connect = async () => {
		if (!(await this.bluetooth.getAvailability())) {
			throw new Error('No Bluetooth interface available')
		}

		let device
		try {
			device = await this.bluetooth.requestDevice({
				filters: [
					{
						services: [SERVICE_UUID]
					}
				]
			})
		} catch (err) {
			// Requsted device not found
			return false
		}

		device.on(BluetoothDevice.EVENT_DISCONNECTED, event =>
			this.onDisconnected(event)
		)

		this.server = await device.gatt.connect()
		const service = await this.server.getPrimaryService(SERVICE_UUID)

		// Set up the characteristics
		for (const sensor of this.sensors) {
			if (!this.enable.includes(sensor)) continue

			try {
				this.characteristics[
					sensor
				].characteristic = await service.getCharacteristic(
					this.characteristics[sensor].uuid
				)

				// Set up notification
				if (
					this.characteristics[sensor].properties.includes(
						'BLENotify'
					)
				) {
					this.characteristics[sensor].characteristic.on(
						'characteristicvaluechanged',
						event => {
							this.handleIncoming(sensor, event.target.value)
						}
					)
					await this.characteristics[
						sensor
					].characteristic.startNotifications()
				}

				// Set up polling for read
				if (
					this.characteristics[sensor].properties.includes('BLERead')
				) {
					this.characteristics[sensor].polling = setInterval(() => {
						this.characteristics[sensor].characteristic
							.readValue()
							.then(data => {
								this.handleIncoming(sensor, data)
							})
					}, this.pollingInterval)
				}

				// Set up write
				if (
					this.characteristics[sensor].properties.include('BLEWrite')
				) {
					this.characteristics[sensor].write(message)
				}
				
			} catch (err) {
				this.emit(
					ERROR,
					`Characteristic ${sensor} is enabled, but not available in the BLE service`
				)
			}
		}

		this.emit(CONNECTED, device.id)
		return true
	}

	disconnect = () => {
		this.server.disconnect()
	}

	isConnected = () => {
		return !this.server ? false : this.server.connected
	}

	handleIncoming = (sensor, dataReceived) => {
		const characteristic = this.characteristics[sensor]
		const data = characteristic.data
		const columns = Object.keys(data) // column headings for this sensor

		const typeMap = {
			Uint8: { fn: DataView.prototype.getUint8, bytes: 1 },
			Uint16: { fn: DataView.prototype.getUint16, bytes: 2 },
			Int8: { fn: DataView.prototype.getInt8, bytes: 1 },
			Int16: { fn: DataView.prototype.getInt16, bytes: 2 },
			Float32: { fn: DataView.prototype.getFloat32, bytes: 4 }
		}

		var packetPointer = 0
		var i = 0

		let values = {}
		let means = {}
		let stddevs = {}

		// Read each sensor value in the BLE packet and push into the data array
		characteristic.structure.forEach(dataType => {
			// Lookup function to extract data for given sensor property type
			var dataViewFn = typeMap[dataType].fn.bind(dataReceived)
			// Read sensor ouput value - true => Little Endian
			var unpackedValue = dataViewFn(packetPointer, true)
			// Push sensor reading onto data array
			data[columns[i]].push(unpackedValue)
			// Keep array at buffer size
			if (data[columns[i]].length > this.windowSize) {
				data[columns[i]].shift()
			}
			// move pointer forward in data packet to next value
			packetPointer += typeMap[dataType].bytes
			// Push sensor reading onto values object used for notifying listeners
			values[columns[i]] = unpackedValue
			if (this.mean) means[columns[i]] = mean(data[columns[i]])
			if (this.stddev) stddevs[columns[i]] = stddev(data[columns[i]])
			// Increment column counter
			i++
		})

		// Notify listeners about new data
		this.emit(sensor, values)
		if (this.mean) this.emit(`${sensor}${SUFFIX_MEAN}`, means)
		if (this.stddev) this.emit(`${sensor}${SUFFIX_STDDEV}`, stddevs)
	}

	onDisconnected = event => {
		const device = event.target

		// Clear read polling
		for (const sensor of this.sensors) {
			if (!this.enable.includes(sensor)) continue

			if (typeof this.characteristics[sensor].polling !== 'undefined') {
				clearInterval(this.characteristics[sensor].polling)
			}
		}

		this.emit(DISCONNECTED, device.id)
	}

	static get CORACCELEROMETER() {
		return CORACCELEROMETER
	}

	static get CORGYROSCOPE() {
		return CORGYROSCOPE
	}

	static get CORMAGNETOMETER() {
		return CORMAGNETOMETER
	}

	static get CORUI() {
		return CORUI
	}

	static get BOLACCELEROMETER() {
		return BOLACCELEROMETER
	}

	static get BOLGYROSCOPE() {
		return BOLGYROSCOPE
	}

	static get BOLMAGNETOMETER() {
		return BOLMAGNETOMETER
	}

	static get BOLUI() {
		return BOLUI
	}

	static get CONNECTED() {
		return CONNECTED
	}

	static get DISCONNECTED() {
		return DISCONNECTED
	}

	static get ERROR() {
		return ERROR
	}
}

// Arithmetic mean
const mean = arr => {
	return (
		arr.reduce(function(a, b) {
			return Number(a) + Number(b)
		}) / arr.length
	)
}

// Standard deviation
const stddev = arr => {
	let m = mean(arr)
	return Math.sqrt(
		arr.reduce(function(sq, n) {
			return sq + Math.pow(n - m, 2)
		}, 0) /
			(arr.length - 1)
	)
}

module.exports = Nano33BLE
