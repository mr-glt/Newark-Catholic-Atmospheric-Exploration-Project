#include <Adafruit_MPL115A2.h>// Support for Baro Sensor Adafruit 992- MPL115A2
Adafruit_MPL115A2 mpl115a2;//Support for Baro Sensor Adafruit 992- MPL115A2
#include "Wire.h"
#define DS1307_ADDRESS 0x68//RTC Support
//Eric Note- another address showed up in scan at 0X50 EEPROM?
byte zero = 0x00; //workaround for issue #527 RTC Support

const float referenceVolts = 5.0;        // the default reference on a 5 volt board
const int batteryPin = 0;          // +V from battery is connected to analog pin 0
const float sea_press = 1013.25;//added for altitude calc
float alt=0;//added for altitude calc

#include <SD.h>
File myFile; //SD
const int chipSelect=4; // set chipselect pin to 4 for SD
//int dat1=A0;//set data pin
int dat2=1;//define pin0 connect with LM35
float temp=0;
//int data1=0;
int data2=0;
int i=0;
boolean present=0;// SD Card available & usable
void setup()
{

  Wire.begin();
  Serial.begin(9600);
  mpl115a2.begin();// Baro Sensor Adafruit 992- MPL115A2
  //pinMode(dat1,INPUT);
  pinMode(dat2,INPUT);
  checkSD();
  // Write column headers for Excel CSV
  myFile = SD.open("datalog.csv", FILE_WRITE);
  if(myFile)
  {
    //Prints headers to file
    myFile.print("Time"); // Prints Date and Time header
    myFile.print(",");
    myFile.print("line#");// prints line number Header for troubleshooting etc
    myFile.print(",");
    myFile.print("BusVoltage");
    myFile.print(",");
    myFile.print("IntTemp");
    myFile.print(",");
    myFile.print("Pressure");
    myFile.print(",");
    myFile.print("ExtTemp");
    myFile.print(",");
    myFile.println("Alt(m)");
    myFile.close();

  }
}
void loop()
{
  int val = analogRead(batteryPin);  // read the value from the A0 battery monitoring pin with voltage divider
  float volts = (val / 511.0) * referenceVolts ; // divide val by (1023/2)because the resistors divide the voltage in half

  float pressureKPA = 0, temperatureC = 0; //Adafruit 992- MPL115A2
  if(present==1)
  {
    pressureKPA = mpl115a2.getPressure();//get pressure Adafruit 992- MPL115A2
    temperatureC = mpl115a2.getTemperature(); //Adafruit 992- MPL115A2
    printDate(); //Runs the print date subroutine below
    i++;
    //data1=analogRead(dat1);
  analogRead(1);// added to take initial read to stabilize the ADC
  delay(10);// Delay to stabilize the ADC
  temp = analogRead(1) * 5000L / 1024L  / 10;// Temperature calculation formula
    //data2=analogRead(dat2); //used for Ext Temp sensor TBD
    //temp= data2 * 4.9 / 10 ; // Temperature calculation formula
    Serial.print(" BusV:");
    Serial.print(volts);
    Serial.print(" ITemp:");
    Serial.print(temp);
     Serial.print(" Press:");
    Serial.print(pressureKPA, 4);
    Serial.print(" ExTemp:");
    Serial.print(temperatureC, 1);
    alt= ((pow((sea_press / (pressureKPA *10)), 1/5.257) - 1.0) * (15 + 273.15)) / 0.0065;//rough altitude equation in meters can use real temp instead of 15
    Serial.print(" Alt:");
    Serial.println(alt);
    writeSD();
  }
  delay(1000);
  }

byte decToBcd(byte val){     //Eric-      needed for RTC variable stuff
// Convert normal decimal numbers to binary coded decimal
  return ( (val/10*16) + (val%10) );
}

byte bcdToDec(byte val)  {    //Eric-      needed for RTC variable stuff
// Convert binary coded decimal to normal decimal numbers
  return ( (val/16*10) + (val%16) );
}

void checkSD()
{
  Serial.print("check SD card");
  if (!SD.begin(chipSelect)) {
    Serial.println("Card failed");
    // don't do anything more:
    return;
  }
  Serial.println("SD card OK");
  present=1;
  delay(2000);
}

void writeSD()
{
  myFile = SD.open("datalog.csv", FILE_WRITE);
  if(myFile)
  {
    int val = analogRead(batteryPin);  // read the value from the A0 battery monitoring pin with voltage divider
  float volts = (val / 511.0) * referenceVolts ; // divide val by (1023/2)because the resistors divide the voltage in half
    // Reset the register pointer
  Wire.beginTransmission(DS1307_ADDRESS);
  Wire.write(zero);
  Wire.endTransmission();

  Wire.requestFrom(DS1307_ADDRESS, 7);

  int second = bcdToDec(Wire.read());
  int minute = bcdToDec(Wire.read());
  int hour = bcdToDec(Wire.read() & 0b111111); //24 hour time
  int weekDay = bcdToDec(Wire.read()); //0-6 -> sunday - Saturday
  int monthDay = bcdToDec(Wire.read());
  int month = bcdToDec(Wire.read());
  int year = bcdToDec(Wire.read());
float pressureKPA = mpl115a2.getPressure();//get pressure Adafruit 992- MPL115A2- these are redundant calls to I2c but I dont want to fix
float temperatureC = mpl115a2.getTemperature();//get temp Adafruit 992- MPL115A2- these are redundant calls to I2c but I dont want to fix

  //Print RTC values to SD
  myFile.print(month);
  myFile.print("/");
  myFile.print(monthDay);
  myFile.print("/");
  myFile.print(year);
  myFile.print(" ");
  myFile.print(hour);
  myFile.print(":");
  myFile.print(minute);
  myFile.print(":");
  myFile.print(second);
  //myFile.print(":");
  myFile.print(",");
  //End Print RTC values
    myFile.print(i);
    myFile.print(",");
    myFile.print(volts);
    myFile.print(",");
    myFile.print(temp);
    myFile.print(",");
    myFile.print(pressureKPA, 4);
    myFile.print(",");
    myFile.print(temperatureC, 1);
    myFile.print(",");
    myFile.println(alt);
    myFile.close();

  }
}

  void printDate()// Only used to print to serial and not needed for logging purposes
  {
  Wire.beginTransmission(DS1307_ADDRESS);
  Wire.write(zero);
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
