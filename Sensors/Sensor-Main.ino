//Imports
#include <SD.h>
#include "Wire.h"

//Definations
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

}

void loop(){
	//This is testing writing to a file on the sdcard
	testFile = SD.open("test.txt", FILE_WRITE);

	if (testFile) {
    	Serial.print("Writing to test.txt...");
    	testFile.println("testing 1, 2, 3.");
		// close the file:
   		testFile.close();
    	Serial.println("Done.");
  	} else {
    	// if the file didn't open, print an error:
    	Serial.println("error opening test.txt");
  	}

  	//This is for testing the RTC
  	Wire.beginTransmission(DS1307_ADDRESS);
 	Wire.write(zero); //Workaround	
   	Wire.endTransmission();

	Wire.requestFrom(DS1307_ADDRESS, 7);

	int second = bcdToDec(Wire.read());
  	int minute = bcdToDec(Wire.read());
 	int hour = bcdToDec(Wire.read() & 0b111111); //24 hour time
 	int weekDay = bcdToDec(Wire.read()); //0-6 -> sunday - Saturday
 	int monthDay = bcdToDec(Wire.read());
  	int month = bcdToDec(Wire.read());
  	int year = bcdToDec(Wire.read());

  	//print the date EG   3/1/11 23:59:59
  	Serial.print(month);
  	Serial.print("/");
  	Serial.print(monthDay);
  	Serial.print("/");
  	Serial.print(year);
  	Serial.print(" ");
  	Serial.print(hour);
  	Serial.print(":");
  	Serial.print(minute);
  	Serial.print(":");
  	Serial.print(second);
}