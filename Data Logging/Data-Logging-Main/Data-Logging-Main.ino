/* DISCLAIMER: This code is untested for use on an actual high altitude flight.*/

//Imports
#include <Adafruit_ADXL345_U.h> //Accelrometer
#include <Adafruit_Sensor.h> //Adafruit Products
#include <RTClib.h> //RTC
#include <Wire.h> //Wire for I2C
#include <SPI.h> //SPI for SD
#include <SD.h> //SDcard
#include <Adafruit_TSL2561_U.h> //Luminosity Sensor
#include <Adafruit_BMP085_U.h> //Barometer

/*Deffinations*/
 //Accel
 #define DS1307_ADDRESS 0x86; //10000110, I2C address of ADXL345
 Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);

 //RTC
 RTC_DS1307 rtc;

 //Pressure
 Adafruit_BMP085_Unified bmp = Adafruit_BMP085_Unified(10085);
 float temperature;

 //SDcard
 File dataFile;

 //UV
 int UVOUT = A0; //Output from the ML8511
 int REF_3V3 = A2; //3.3V power on the Arduino board to use as reference

 //Luminosity
 Adafruit_TSL2561_Unified tsl = Adafruit_TSL2561_Unified(TSL2561_ADDR_FLOAT, 12345);

 //Magneto
 #define magnetoAddress 0x1E //0011110b, I2C address of HMC5883

//Humidity
int HIH4030_Pin = A3; //Output from HIH-4030

/*End Deffinations*/


void setup()
{
  /*Serial Setup*/
	Serial.begin(9600); //Start Serial

  /*I2C Setup*/
  Wire.begin(); //Start I2C

	/*Barometer Setup*/
  bmp.begin(); //Start Baro

	/*RTC Setup*/
	rtc.begin(); //Start RTC

  /*Accel Setup*/
	accel.begin(); //Start Accelrometer
	accel.setRange(ADXL345_RANGE_16_G); //Set Accelrometer Range

  /*SDcard Setup*/
	SD.begin(4); //Start SD

  //Print Header
  dataFile = SD.open("datamain.csv", FILE_WRITE); //Open dataFile

  dataFile.println(","); //println is used to start a new row
  dataFile.print("Timestamp");
  dataFile.print(","); //Commas are used to declare a new cell in .CSV (Comma Separated Values)
  dataFile.print("Absolute Pressure(mB)");
  dataFile.print(",");
  dataFile.print("External Temp C");
  dataFile.print(",");
  dataFile.print("Computed altitude(m)");
  dataFile.print(",");
  dataFile.print("Ax");
  dataFile.print(",");
  dataFile.print("Ay");
  dataFile.print(",");
  dataFile.print("Az");
  dataFile.print(",");
  dataFile.print("Relative Humidity");
  dataFile.print(",");
  dataFile.print("Luminosity");
  dataFile.print(",");
  dataFile.print("UV (mW/cm^2)");
  dataFile.print(",");
  dataFile.print("Mx");
  dataFile.print(",");
  dataFile.print("My");
  dataFile.print(",");
  dataFile.print("Mz");
  dataFile.println(",");


	dataFile.close(); //Close dataFile

  /*UV */
	pinMode(UVOUT, INPUT); //Set the pin used to read the UV Sensor to Input
	pinMode(REF_3V3, INPUT); //Set reference 3.3V pin to Input

  /*Luminosity*/
  tsl.begin(); //Start Luminosity Sensor
  tsl.enableAutoRange(true); /* Auto-gain ... switches automatically between 1x and 16x */
  tsl.setIntegrationTime(TSL2561_INTEGRATIONTIME_13MS);      /* fast but low resolution */
  /*Magneto*/
  Wire.beginTransmission(magnetoAddress); //Open Communication with HMC5883
  Wire.write(0x02); //Select Mode Register
  Wire.write(0x00); //Set Continuous Measurement Mode
  Wire.endTransmission();
}

void loop(){
	Serial.println();

  /*Time*/
	DateTime now = rtc.now(); //Define now

	dataFile = SD.open("datamain.csv", FILE_WRITE); //Open dataFile
  //Print Time
  dataFile.print(now.month(), DEC);
  dataFile.print("/");
  dataFile.print(now.day(), DEC);
  dataFile.print("/");
  dataFile.print(now.year(), DEC);
  dataFile.print(" ");
  dataFile.print(now.hour(), DEC);
  dataFile.print(":");
  dataFile.print(now.minute(), DEC);
  dataFile.print(":");
  dataFile.print(now.second(), DEC);
  dataFile.print(",");

  Serial.print(now.month(), DEC);
  Serial.print("/");
  Serial.print(now.day(), DEC);
  Serial.print("/");
  Serial.print(now.year(), DEC);
  Serial.print(" ");
  Serial.print(now.hour(), DEC);
  Serial.print(":");
  Serial.print(now.minute(), DEC);
  Serial.print(":");
  Serial.println(now.second(), DEC);
  /*Barometer*/
  sensors_event_t baroEvent; //Create a New Event for the Baro
  bmp.getEvent(&baroEvent); //Get Event

  if (baroEvent.pressure)
  {
    Serial.print("Pressure:    ");
    Serial.print(baroEvent.pressure); //Print Pressure to Serial
    Serial.println(" hPa");
    dataFile.print(baroEvent.pressure); //Print Pressure to SD
    dataFile.print(",");

    bmp.getTemperature(&temperature); //Get Temp
    Serial.print("Temperature: ");
    Serial.print(temperature); //Print to Serial
    Serial.println(" C");
    dataFile.print(temperature); //Print to SD
    dataFile.print(",");

    // 'SENSORS_PRESSURE_SEALEVELHPA' can be changed to whatever sea level pressure is in your local area
    float seaLevelPressure = SENSORS_PRESSURE_SEALEVELHPA;
    Serial.print("Altitude:    ");
    Serial.print(bmp.pressureToAltitude(seaLevelPressure, baroEvent.pressure)); //Print to Serial
    Serial.println(" m");
    dataFile.print(bmp.pressureToAltitude(seaLevelPressure, baroEvent.pressure)); //Print to SD
    dataFile.print(",");
  }
  else
  {
    Serial.println("Baro Error");
  }

	/*Accel*/
  sensors_event_t accelEvent; //New Sensor Even

  accel.getEvent(&accelEvent); //Get Event

  //Write Reading to SD
  dataFile.print(accelEvent.acceleration.x);
  dataFile.print(",");
  dataFile.print(accelEvent.acceleration.y);
  dataFile.print(",");
  dataFile.print(accelEvent.acceleration.z);
  dataFile.print(",");
  //Write Reading to Serial
  Serial.println(accelEvent.acceleration.x);
	Serial.println(accelEvent.acceleration.y);
	Serial.println(accelEvent.acceleration.z);

	/*Humidity*/

  float relativeHumidity  = getHumidity(temperature);

  dataFile.print(relativeHumidity);
  dataFile.print(",");
  Serial.print("rH: ");
  Serial.println(relativeHumidity);

  /*Luminosity*/

  sensors_event_t luminEvent; //New Lumin Event
  tsl.getEvent(&luminEvent); //Get Reading

  if (luminEvent.light)
  {
    Serial.print(luminEvent.light); Serial.println(" lux");
    dataFile.print(luminEvent.light);
    dataFile.print(",");
  }
  else
  {
    Serial.println("Sensor (Un)Overload"); //Sensor is Over Saturated
  }

	/*UV Sensor*/

  int uvLevel = averageAnalogRead(UVOUT);
  int refLevel = averageAnalogRead(REF_3V3);

  //Use the 3.3V power pin as a reference to get a very accurate output value from sensor
  float outputVoltage = 3.3 / refLevel * uvLevel;

  float uvIntensity = mapfloat(outputVoltage, 0.99, 2.9, 0.0, 15.0);

  Serial.print("UV Intensity (mW/cm^2): ");
  Serial.println(uvIntensity);
  dataFile.print(uvIntensity);
  dataFile.print(",");

  /*Magneto*/
  int x,y,z; //Triple Axis Data

  Wire.beginTransmission(magnetoAddress);
  Wire.write(0x03); //select register 3, X MSB register
  Wire.endTransmission();

  Wire.requestFrom(magnetoAddress, 6);
  if(6<=Wire.available()){
    x = Wire.read()<<8; //X msb
    x |= Wire.read(); //X lsb
    z = Wire.read()<<8; //Z msb
    z |= Wire.read(); //Z lsb
    y = Wire.read()<<8; //Y msb
    y |= Wire.read(); //Y lsb
  }

  Serial.println(x);
  Serial.println(y);
  Serial.println(z);
  dataFile.print(x);
  dataFile.print(",");
  dataFile.print(y);
  dataFile.print(",");
  dataFile.print(z);
  dataFile.println(",");

  /*Odds and Ends*/
  Serial.println(); //Print a line to show separate readings
	dataFile.close(); //Close dataFile

  delay(500); //Wait 0.5 Seconds before taking next readings.
}

/*Values*/

//Used to find average of UV reading is voltage being supplied.
int averageAnalogRead(int pinToRead){
  byte numberOfReadings = 8;
  unsigned int runningValue = 0;

  for(int x = 0 ; x < numberOfReadings ; x++)
    runningValue += analogRead(pinToRead);
  runningValue /= numberOfReadings;

  return(runningValue);
}

//Used to map UV sensor readings
float mapfloat(float x, float in_min, float in_max, float out_min, float out_max){
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

//Used to find average of readings of humidity sensor
float getHumidity(float degreesCelsius){
  float supplyVolt = 5.0; //Need to change to reading

  int HIH4030_Value = analogRead(HIH4030_Pin);
  float voltage = HIH4030_Value/1023. * supplyVolt; // convert to voltage value

  float sensorRH = 161.0 * voltage / supplyVolt - 25.8;
  float trueRH = sensorRH / (1.0546 - 0.0026 * degreesCelsius); //temperature adjustment

  return trueRH;
}
