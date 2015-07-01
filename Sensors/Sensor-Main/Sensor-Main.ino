//Imports
#include "Adafruit_ADXL345_U.h"
#include "Adafruit_Sensor.h"
#include <SFE_BMP180.h> //Barometer
#include "RTClib.h" //RTC
#include <SparkFunTSL2561.h>
#include "Wire.h"
#include <SPI.h>
#include <SD.h>


//Definitions
int ledPin = 5;
#define DS1307_ADDRESS 0x86;//Need to get updated I2C Address
byte zero = 0x00; //Needed as a workaround for issue #537 RTC Support
Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);
RTC_DS1307 rtc;
SFE_BMP180 pressure;
#define ALTITUDE 254 //ALTITUDE of Newark
File dataFile;

void setup(){
  /*Serial Setup*/
	Serial.begin(9600);
	Serial.begin(9600);

	/*Led Setup*/
  pinMode(ledPin, OUTPUT);

	/*Barometer Setup*/
	if (pressure.begin())
    Serial.println("BMP180 init success");
  else
	{
    Serial.println("BMP180 init fail\n\n");
  }

	/*RTC Setup*/
	#ifdef AVR
		Wire.begin();
	#else
		Wire1.begin(); // Shield I2C pins connect to alt I2C bus on Arduino Due
	#endif
		rtc.begin();
	if (! rtc.isrunning()) {
		Serial.println("RTC is NOT running!");
	}
	/*Accel Setup*/
	if(!accel.begin())
	{
		Serial.println("ADXL345 Not Detected");
	}
	accel.setRange(ADXL345_RANGE_16_G);

	if (!SD.begin(4)) {
	Serial.println("initialization failed!");
	return;
	}
	dataFile = SD.open("datatest.csv", FILE_WRITE);
	dataFile.print("Year");
	dataFile.print(",");
	dataFile.print("Month");
	dataFile.print(",");
	dataFile.print("Day");
	dataFile.print(",");
	dataFile.print("Hour");
	dataFile.print(",");
	dataFile.print("Minute");
	dataFile.print(",");
	dataFile.println("Second");
	dataFile.close();
}

void loop(){
	/*Time*/
	DateTime now = rtc.now();

	dataFile = SD.open("datatest.csv", FILE_WRITE);
	dataFile.print(now.year(), DEC);
	dataFile.print(",");
	dataFile.print(now.month(), DEC);
	dataFile.print(",");
	dataFile.print(now.day(), DEC);
	dataFile.print(",");
	dataFile.print(now.hour(), DEC);
	dataFile.print(",");
	dataFile.print(now.minute(), DEC);
	dataFile.print(",");
	dataFile.println(now.second(), DEC);
	dataFile.close();

	Serial.println("----------------------------Time Stamp----------------------------");
	Serial.print(now.year(), DEC);
	Serial.print('/');
	Serial.print(now.month(), DEC);
	Serial.print('/');
	Serial.print(now.day(), DEC);
	Serial.print(' ');
	Serial.print(now.hour(), DEC);
	Serial.print(':');
	Serial.print(now.minute(), DEC);
	Serial.print(':');
	Serial.print(now.second(), DEC);
	Serial.println();

	/*Leds*/
  digitalWrite(ledPin, HIGH);

  /*Barometer*/
  char status;
  double T,P,p0,a;
	Serial.println("-----------------------------Barometer----------------------------");
  Serial.println();
  Serial.print("provided altitude: ");
  Serial.print(ALTITUDE,0);
  Serial.print(" meters, ");
  Serial.print(ALTITUDE*3.28084,0);
  Serial.println(" feet");
  status = pressure.startTemperature();
  if (status != 0)
  {
    delay(status);
    status = pressure.getTemperature(T);
    if (status != 0)
    {
      Serial.print("temperature: ");
      Serial.print(T,2);
      Serial.print(" deg C, ");
      Serial.print((9.0/5.0)*T+32.0,2);
      Serial.println(" deg F");

      status = pressure.startPressure(3);
      if (status != 0)
      {
        delay(status);
        status = pressure.getPressure(P,T);
        if (status != 0)
        {
          Serial.print("absolute pressure: ");
          Serial.print(P,2);
          Serial.print(" mb, ");
          Serial.print(P*0.0295333727,2);
          Serial.println(" inHg");

          p0 = pressure.sealevel(P,ALTITUDE);
          Serial.print("relative (sea-level) pressure: ");
          Serial.print(p0,2);
          Serial.print(" mb, ");
          Serial.print(p0*0.0295333727,2);
          Serial.println(" inHg");

          a = pressure.altitude(P,p0);
          Serial.print("computed altitude: ");
          Serial.print(a,0);
          Serial.print(" meters, ");
          Serial.print(a*3.28084,0);
          Serial.println(" feet");
        }
        else Serial.println("error retrieving pressure measurement\n");
      }
      else Serial.println("error starting pressure measurement\n");
    }
    else Serial.println("error retrieving temperature measurement\n");
  }
  else Serial.println("error starting temperature measurement\n");

	/*Accel*/
	sensors_event_t event;
  accel.getEvent(&event);
	Serial.println("------------------------------Accel------------------------------");
	Serial.print("X: "); Serial.print(event.acceleration.x); Serial.print("  ");
	Serial.print("Y: "); Serial.print(event.acceleration.y); Serial.print("  ");
	Serial.print("Z: "); Serial.print(event.acceleration.z); Serial.print("  ");Serial.println("m/s^2 ");
	Serial.println("-----------------------------------------------------------------");
	/*Magneto*/

	/*Humidity*/

	/*Luminosity*/

	/*UV Sensor*/


	Serial.println(" ");
	Serial.println(" ");
  Serial.println(" ");
	Serial.println(" ");
	Serial.println(" ");
	delay(500);
}
