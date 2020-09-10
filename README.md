IMU test code for OVAOM game pad's. No better installation guide will be provided. please read the Max/MSP and n4m documentation if you have problems.

for use with MAX MSP (OS X only!):
node.js and MAX/MSP must be installed on your computer
you can download Max here : https://cycling74.com/downloads (evaluation version, you can't save changes in the patch)
install @vliegwerk/arduino-nano-33-ble : https://www.npmjs.com/package/@vliegwerk/arduino-nano-33-ble
take the index.js file in provided "patch_@vliegwerk" and replace the index.js in the @vliegwerk node module
open BLEtester.maxpat
enjoy..

IMU settings : 

Accelerometer : 
119Hz, 4g scale, RAW output, 
formula RAW to g's : x = RAW * 4.0 / 32768.0

Gyroscope :
119Hz, 119 Hz, 2000 dps, 16 Hz Bandwith, RAW output,
formula RAW to degrees/second : x = RAW * 2000.0 / 32768.0

Magnetometer :
Temperature compensation enable, medium performance, 20 Hz, 4 Gauss scale, Continuous conversion mode
formula RAW to Gauss : x = RAW * 4.0 * 100.0 / 32768.0

you can find the LSM9DS1 Datasheet here : https://www.st.com/resource/en/datasheet/lsm9ds1.pdf