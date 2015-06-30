//Imports
#include "Adafruit_ADXL345_U.h"
#include "Adafruit_Sensor.h"
#include <SFE_BMP180.h> //Barometer
#include "RTClib.h" //RTC
#include <SparkFunTSL2561.h>
#include "Wire.h"


//Definitions
int ledPin = 5;
#define DS1307_ADDRESS 0x86;//Need to get updated I2C Address
byte zero = 0x00; //Needed as a workaround for issue #537 RTC Support
Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);
RTC_DS1307 rtc;
SFE_BMP180 pressure;
#define ALTITUDE 254 //ALTITUDE of Newark

void setup(){
  /*Serial Setup*/
	Serial1.begin(9600);
	Serial1.begin(9600);

	/*Led Setup*/
  pinMode(ledPin, OUTPUT);

	/*Barometer Setup*/
	if (pressure.begin())
    Serial1.println("BMP180 init success");
  else
	{
    Serial1.println("BMP180 init fail\n\n");
  }

	/*RTC Setup*/
	#ifdef AVR
		Wire.begin();
	#else
		Wire1.begin(); // Shield I2C pins connect to alt I2C bus on Arduino Due
	#endif
		rtc.begin();
	if (! rtc.isrunning()) {
		Serial1.println("RTC is NOT running!");
	}
	/*Accel Setup*/
	if(!accel.begin())
	{
		Serial1.println("ADXL345 Not Detected");
	}
	accel.setRange(ADXL345_RANGE_16_G);
}

void loop(){
	/*Time*/
	DateTime now = rtc.now();

	Serial1.println("----------------------------Time Stamp----------------------------");
	Serial1.print(now.year(), DEC);
	Serial1.print('/');
	Serial1.print(now.month(), DEC);
	Serial1.print('/');
	Serial1.print(now.day(), DEC);
	Serial1.print(' ');
	Serial1.print(now.hour(), DEC);
	Serial1.print(':');
	Serial1.print(now.minute(), DEC);
	Serial1.print(':');
	Serial1.print(now.second(), DEC);
	Serial1.println();

	/*Leds*/
  digitalWrite(ledPin, HIGH);

  /*Barometer*/
  char status;
  double T,P,p0,a;
	Serial1.println("-----------------------------Barometer----------------------------");
  Serial1.println();
  Serial1.print("provided altitude: ");
  Serial1.print(ALTITUDE,0);
  Serial1.print(" meters, ");
  Serial1.print(ALTITUDE*3.28084,0);
  Serial1.println(" feet");
  status = pressure.startTemperature();
  if (status != 0)
  {
    delay(status);
    status = pressure.getTemperature(T);
    if (status != 0)
    {
      Serial1.print("temperature: ");
      Serial1.print(T,2);
      Serial1.print(" deg C, ");
      Serial1.print((9.0/5.0)*T+32.0,2);
      Serial1.println(" deg F");

      status = pressure.startPressure(3);
      if (status != 0)
      {
        delay(status);
        status = pressure.getPressure(P,T);
        if (status != 0)
        {
          Serial1.print("absolute pressure: ");
          Serial1.print(P,2);
          Serial1.print(" mb, ");
          Serial1.print(P*0.0295333727,2);
          Serial1.println(" inHg");

          p0 = pressure.sealevel(P,ALTITUDE);
          Serial1.print("relative (sea-level) pressure: ");
          Serial1.print(p0,2);
          Serial1.print(" mb, ");
          Serial1.print(p0*0.0295333727,2);
          Serial1.println(" inHg");

          a = pressure.altitude(P,p0);
          Serial1.print("computed altitude: ");
          Serial1.print(a,0);
          Serial1.print(" meters, ");
          Serial1.print(a*3.28084,0);
          Serial1.println(" feet");
        }
        else Serial1.println("error retrieving pressure measurement\n");
      }
      else Serial1.println("error starting pressure measurement\n");
    }
    else Serial1.println("error retrieving temperature measurement\n");
  }
  else Serial1.println("error starting temperature measurement\n");

	/*Accel*/
	sensors_event_t event;
  accel.getEvent(&event);
	Serial1.println("------------------------------Accel------------------------------");
	Serial1.print("X: "); Serial1.print(event.acceleration.x); Serial1.print("  ");
	Serial1.print("Y: "); Serial1.print(event.acceleration.y); Serial1.print("  ");
	Serial1.print("Z: "); Serial1.print(event.acceleration.z); Serial1.print("  ");Serial1.println("m/s^2 ");
	Serial1.println("-----------------------------------------------------------------");
	/*Magneto*/

	/*Humidity*/

	/*Luminosity*/

	/*UV Sensor*/


	Serial1.println(" ");
	Serial1.println(" ");
  Serial1.println(" ");
	Serial1.println(" ");
	Serial1.println(" ");
	delay(500);
}
