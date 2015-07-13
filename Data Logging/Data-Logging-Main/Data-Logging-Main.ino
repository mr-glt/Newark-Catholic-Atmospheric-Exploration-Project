/* DISCLAIMER: This code is untested for use on an actual high altitude flight.*/

//Imports
#include "Adafruit_ADXL345_U.h" //Accelrometer
#include "Adafruit_Sensor.h" //Adafruit Products
#include <SFE_BMP180.h> //Barometer
#include "RTClib.h" //RTC
#include "Wire.h" //Wire for I2C
#include <SPI.h> //SPI for SD
#include <SD.h> //SDcard
#include <Adafruit_TSL2561_U.h> //Luminosity Sensor

/*Deffinations*/
 //Accel
 #define DS1307_ADDRESS 0x86; //10000110, I2C address of ADXL345
 Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);

 //RTC
 RTC_DS1307 rtc;

 //Pressure
 SFE_BMP180 pressure;
 #define ALTITUDE 254 //ALTITUDE of Newark

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
	Serial1.begin(9600); //Start Serial

  /*I2C Setup*/
  Wire.begin(); //Start I2C

	/*Barometer Setup*/
	pressure.begin(); //Start Baro


	/*RTC Setup*/
	rtc.begin(); //Start RTC

  /*Accel Setup*/
	accel.begin(); //Start Accelrometer
	accel.setRange(ADXL345_RANGE_16_G); //Set Accelrometer Range

  /*SDcard Setup*/
	SD.begin(4); //Start SD

  //Print Header
  dataFile = SD.open("datatest.csv", FILE_WRITE); //Open dataFile

  dataFile.println(","); //println is used to start a new row
  dataFile.print("Timestamp");
  dataFile.print(","); //Commas are used to declare a new cell in .CSV
  dataFile.print("External Temp F");
  dataFile.print(",");
  dataFile.print("Absolute Pressure(mB)");
  dataFile.print(",");
  dataFile.print("Relative (sea-level) Pressure(mb)");
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
  configureLumin(); //Run Config Fucntion
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

	dataFile = SD.open("datatest.csv", FILE_WRITE); //Open dataFile
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

  /*Barometer*/

  char status;
  double T,P,p0,a;
  status = pressure.startTemperature();

  if (status != 0)
  {
    delay(status);
    status = pressure.getTemperature(T);
    if (status != 0) //If status does not = zero there was an error starting temp measurement
    {
      //Print to Serial
      Serial.print("temp: ");
      Serial.print((9.0/5.0)*T+32.0,2);
      Serial.println(" deg F");
      //Write to SD
      dataFile.print((9.0/5.0)*T+32.0,2);
      dataFile.print(",");

      status = pressure.startPressure(3);
      if (status != 0)
      {
        delay(status);
        status = pressure.getPressure(P,T);
        if (status != 0) //If status does not = zero there was an error retrieving pressure measurement
        {
          Serial.print("aP: ");
          Serial.print(P,2);
          Serial.println(" mb");
          dataFile.print(P,2);
          dataFile.print(",");

          p0 = pressure.sealevel(P,ALTITUDE);
          Serial.print("rP: ");
          Serial.print(p0,2);
          Serial.println(" mb");
          dataFile.print(p0,2);
          dataFile.print(",");

          a = pressure.altitude(P,p0);
          Serial.print("computed altitude: ");
          Serial.print(a,0);
          Serial.println(" meters");
          dataFile.print(a,0);
          dataFile.print(",");
        }
      }
    }
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

  float relativeHumidity  = getHumidity(T);

  dataFile.print(relativeHumidity);
  dataFile.print(",");
  Serial.println(relativeHumidity);

  /*Luminosity*/

  sensors_event_t luminEvent; //New Lumin Even
  tsl.getEvent(&luminEvent); //Get Reading

  if (luminEvent.light)
  {
    Serial.print(luminEvent.light); Serial.println(" lux");
    dataFile.print(luminEvent.light);
    dataFile.print(",");
  }
  else
  {
    Serial.println("Sensor overload"); //Sensor is Over Saturalted
  }

	/*UV Sensor*/

  int uvLevel = averageAnalogRead(UVOUT);
  int refLevel = averageAnalogRead(REF_3V3);

  //Use the 3.3V power pin as a reference to get a very accurate output value from sensor
  float outputVoltage = 3.3 / refLevel * uvLevel;

  float uvIntensity = mapfloat(outputVoltage, 0.99, 2.9, 0.0, 15.0);

  Serial.print(" UV Intensity (mW/cm^2): ");
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

  Serial.print(x);
  Serial.print(y);
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


void configureLumin(void)
{
  // tsl.setGain(TSL2561_GAIN_1X);      /* No gain ... use in bright light to avoid sensor saturation */
  // tsl.setGain(TSL2561_GAIN_16X);     /* 16x gain ... use in low light to boost sensitivity */
  tsl.enableAutoRange(true);            /* Auto-gain ... switches automatically between 1x and 16x */

  tsl.setIntegrationTime(TSL2561_INTEGRATIONTIME_13MS);      /* fast but low resolution */
  // tsl.setIntegrationTime(TSL2561_INTEGRATIONTIME_101MS);  /* medium resolution and speed   */
  // tsl.setIntegrationTime(TSL2561_INTEGRATIONTIME_402MS);  /* 16-bit data but slowest conversions */
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
