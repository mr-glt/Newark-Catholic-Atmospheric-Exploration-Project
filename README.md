# NCAEP
Newark Catholic Atmospheric Exploration Project


## Guide for Habduino

###Hardware

Insert the Habduino shield into your Arduino board. Please note:

Never connect the USB and the external battery pack at the same time.

Screw the GPS antenna firmly onto the GPS SMA connector.

Although the GPS is connected via hardware serial the design means you can program the Arduino as normal without having to remove the shield.

You don’t need an antenna on the radio to test but it may help. You can just insert a single core piece of wire 164mm long into the SMA socket for testing.
Plug the Arduino into your PC via the USB.

###Getting Started
Software
The following guide assumes you already have the Arduino software installed. If not please visit  http://arduino.cc/en/Main/Software and download the latest Arduino software.

###Downloading the Latest Firmware
Visit https://github.com/HABduino/HABduino and click the “Download ZIP” button.
Extract the ZIP file to somewhere
Navigate to the extracted files and rename the folder called Software to habduino.
You should now be able to open the Arduino software and then File -> Open and navigate to the habdunino.ino file. If it advise it needs to be in its own folder this is fine but you will then need to close Arduino down and manually move the additional files ax25modem.h and sine_table.h into the the same folder as the habduino.ino file.
With Habduino.ino open scroll down to the line :

char callsign[9] = "HABDUINO";

Amend this to your choice of call sign of 8 characters or less.

Pick a channel for the radio to work on (This will be replaced soon with direct frequency selection) by amending the following line :
'#define LMT2_CHANNEL 15'
Where :

 0  = 433.896  16 = 433.871
 1  = 433.946  17 = 433.921
 2  = 433.996  18 = 433.971
 3  = 434.046  19 = 434.021
 4  = 434.096  20 = 434.071
 5  = 434.146  21 = 434.121
 6  = 434.196  22 = 434.171
 7  = 434.246  23 = 434.221
 8  = 434.296  24 = 434.271
 9  = 434.346  25 = 434.321
 10 = 434.396  26 = 434.371
 11 = 434.446  27 = 434.421
 12 = 434.496  28 = 434.471
 13 = 434.546  29 = 434.521
 14 = 434.596  30 = 434.571
 15 = 434.646  31 = 434.621
For example 15 will put the transmission frequency around 434.646Mhz
It  is recommended you leave the baud rate ASCII and stop bits alone.  

Upload the code to the Arduino. 
Operation

Once uploaded at power on the board LED’s should flash rapidly, this is the initialisation period. After a short period the WARN LED should blink once a second until GPS lock as been achieved at which point the blinking red WARN LED should be replaced by a GREEN OK LED blinking.

Occasionally the WARN LED may blink but quickly switch back to GREEN, this is ok.

Once the module detects its above 1000 meters in altitude the LED’s will turn off entirely.

Below 1000 meters the GPS module is in the more accurate pedestrian mode, above this the code will switch the module to flight mode to ensure it works at high altitude.

It is recommended you remove the reset safe jumper to ensure no accidental resets.
To test tune your radio around the frequency,

DL-FLdigi here..
