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
int ledPin = 5; //Pin for LEDs

 //Accel
 #define DS1307_ADDRESS 0x86;//Need to get updated I2C Address
 byte zero = 0x00; //Needed as a workaround for issue #537 RTC Support
 Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);

 //RTC
 RTC_DS1307 rtc;

 //Pressure
 SFE_BMP180 pressure;
 #define ALTITUDE 254 //ALTITUDE of Newark

 //SDcard
 File dataFile;

 //UV
 int UVOUT = A0; //Output from the sensor
 int REF_3V3 = A2; //3.3V power on the Arduino board

 //Luminosity
 Adafruit_TSL2561_Unified tsl = Adafruit_TSL2561_Unified(TSL2561_ADDR_FLOAT, 12345);
 //Magneto
 #define address 0x1E //0011110b, I2C 7bit address of HMC5883
//Humidity
int HIH4030_Pin = A3;

/*End Deffinations*/


void setup()
{
  /*Serial Setup*/
	Serial.begin(9600);
  Wire.begin();

  /*Led Setup*/
  pinMode(ledPin, OUTPUT);

	/*Barometer Setup*/
	if (pressure.begin())
  {
  }

	/*RTC Setup*/
	#ifdef AVR
		Wire.begin();
	#else
		Wire1.begin(); // Shield I2C pins connect to alt I2C bus on Arduino Due
	#endif
		rtc.begin();
	if (! rtc.isrunning()) {

	}

  /*Accel Setup*/
	if(!accel.begin()){
	}
	accel.setRange(ADXL345_RANGE_16_G);

  /*SDcard Setup*/
	if (!SD.begin(4)) {
	}
	dataFile = SD.open("datatest.csv", FILE_WRITE);
  dataFile.println(",");
  dataFile.print("Timestamp");
  dataFile.print(",");
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


	dataFile.close();

  /*UV */
	pinMode(UVOUT, INPUT);
	pinMode(REF_3V3, INPUT);

  /*Luminosity*/
  tsl.begin();
  configureSensor();
  /*Magneto*/
  Wire.beginTransmission(address); //open communication with HMC5883
  Wire.write(0x02); //select mode register
  Wire.write(0x00); //continuous measurement mode
  Wire.endTransmission();
}

void loop(){
	/*Time*/
	DateTime now = rtc.now();

	dataFile = SD.open("datatest.csv", FILE_WRITE);
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



	/*Leds*/
  digitalWrite(ledPin, HIGH);

  /*Barometer*/
  char status;
  double T,P,p0,a;
  Serial.println();
  status = pressure.startTemperature();
  if (status != 0)
  {
    delay(status);
    status = pressure.getTemperature(T);
    if (status != 0)
    {
      Serial.print("temp: ");
      Serial.print((9.0/5.0)*T+32.0,2);
      Serial.println(" deg F");
      dataFile.print((9.0/5.0)*T+32.0,2);
      dataFile.print(",");

      status = pressure.startPressure(3);
      if (status != 0)
      {
        delay(status);
        status = pressure.getPressure(P,T);
        if (status != 0)
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
  sensors_event_t events;
  accel.getEvent(&events);
	dataFile.print(events.acceleration.x);
  dataFile.print(",");
  dataFile.print(events.acceleration.y);
  dataFile.print(",");
  dataFile.print(events.acceleration.z);
  dataFile.print(",");
  Serial.print(events.acceleration.x);
	Serial.print(events.acceleration.y);
	Serial.print(events.acceleration.z);

	/*Humidity*/
  float temperature = 25; //replace with a thermometer reading if you have it
  float relativeHumidity  = getHumidity(T);
  dataFile.print(relativeHumidity);
  dataFile.print(",");
  Serial.println(relativeHumidity);
	/*Luminosity*/
  sensors_event_t event;
  tsl.getEvent(&event);
  if (event.light)
  {
    Serial.print(event.light); Serial.println(" lux");
    dataFile.print(event.light);
    dataFile.print(",");
  }
  else
  {
    Serial.println("Sensor overload");
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
  int x,y,z; //triple axis data

  //Tell the HMC5883L where to begin reading data
  Wire.beginTransmission(address);
  Wire.write(0x03); //select register 3, X MSB register
  Wire.endTransmission();

  Wire.requestFrom(address, 6);
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


  Serial.println();
	dataFile.close();
  delay(500);

}

float getHumidity(float degreesCelsius){
  float supplyVolt = 5.0;

  int HIH4030_Value = analogRead(HIH4030_Pin);
  float voltage = HIH4030_Value/1023. * supplyVolt; // convert to voltage value

  float sensorRH = 161.0 * voltage / supplyVolt - 25.8;
  float trueRH = sensorRH / (1.0546 - 0.0026 * degreesCelsius); //temperature adjustment

  return trueRH;
}

void configureSensor(void)
{
  // tsl.setGain(TSL2561_GAIN_1X);      /* No gain ... use in bright light to avoid sensor saturation */
  // tsl.setGain(TSL2561_GAIN_16X);     /* 16x gain ... use in low light to boost sensitivity */
  tsl.enableAutoRange(true);            /* Auto-gain ... switches automatically between 1x and 16x */

  tsl.setIntegrationTime(TSL2561_INTEGRATIONTIME_13MS);      /* fast but low resolution */
  // tsl.setIntegrationTime(TSL2561_INTEGRATIONTIME_101MS);  /* medium resolution and speed   */
  // tsl.setIntegrationTime(TSL2561_INTEGRATIONTIME_402MS);  /* 16-bit data but slowest conversions */
}

//Values
int averageAnalogRead(int pinToRead){
  byte numberOfReadings = 8;
  unsigned int runningValue = 0;

  for(int x = 0 ; x < numberOfReadings ; x++)
    runningValue += analogRead(pinToRead);
  runningValue /= numberOfReadings;

  return(runningValue);
}


float mapfloat(float x, float in_min, float in_max, float out_min, float out_max){
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
