
#include <SD.h>
#include "Wire.h"
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

}