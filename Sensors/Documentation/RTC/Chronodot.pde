//Imports
#include "Adafruit_ADXL345_U.h"
#include "Adafruit_Sensor.h"
#include <SFE_BMP180.h> //Barometer
#include "RTClib.h" //RTC
#include <SparkFunTSL2561.h>
#include <SD.h>
#include "Wire.h"

//Definitions
int ledPin = 5;
#define DS1307_ADDRESS 0x86;//Need to get updated I2C Address
byte zero = 0x00; //Needed as a workaround for issue #537 RTC Support
File testFile;


void setup(){
    Serial.begin(9600);
    Serial.print("Initializing SD card on pin 10...");
    pinMode(10, OUTPUT);
    if (!SD.begin(10)) {
        Serial.println("SD Initialization Failed!");
        return;
    }
    Serial.println("SD Initialization Done.");

    pinMode(ledPin, OUTPUT);

        if (pressure.begin())
            Serial.println("BMP180 init success");
        else
        {
            // Oops, something went wrong, this is usually a connection problem,
            // see the comments at the top of this sketch for the proper connections.

            Serial.println("BMP180 init fail\n\n");
            while(1); // Pause forever.
        }

}

void loop(){
    /*This is for flashing the leds */
    digitalWrite(ledPin, HIGH);


}
