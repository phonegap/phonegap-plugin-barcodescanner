# PhoneGap Plugin BarcodeScanner
================================

[![Build Status](https://travis-ci.org/phonegap/phonegap-plugin-barcodescanner.svg)](https://travis-ci.org/phonegap/phonegap-plugin-barcodescanner)

Cross-platform BarcodeScanner for Cordova / PhoneGap.

Follows the [Cordova Plugin spec](http://cordova.apache.org/docs/en/5.0.0/plugin_ref_spec.md), so that it works with [Plugman](https://github.com/apache/cordova-plugman).

## Installation

    
This requires phonegap 5.0+ ( current stable v3.0.0 )

    phonegap plugin add phonegap-plugin-barcodescanner

Older versions of phonegap can still install via the __deprecated__ id ( stale v2.0.1 )

    phonegap plugin add com.phonegap.plugins.barcodescanner

It is also possible to install via repo url directly ( unstable )

    phonegap plugin add https://github.com/phonegap/phonegap-plugin-barcodescanner.git

### Supported Platforms

- Android
- iOS
- Windows 8
- Windows Phone 8
- BlackBerry 10
- Browser

Note: the Android source for this project includes an Android Library Project.
plugman currently doesn't support Library Project refs, so it's been
prebuilt as a jar library. Any updates to the Library Project should be
committed with an updated jar.

## Using the plugin ##
The plugin creates the object `cordova/plugin/BarcodeScanner` with the method `scan(success, fail)`. 

The following barcode types are currently supported:
### Android

* QR_CODE
* DATA_MATRIX
* UPC_E
* UPC_A
* EAN_8
* EAN_13
* CODE_128
* CODE_39
* CODE_93
* CODABAR
* ITF
* RSS14
* PDF417
* RSS_EXPANDED

### iOS

* QR_CODE (even inverted!)
* DATA_MATRIX
* UPC_E
* UPC_A
* EAN_8
* EAN_13
* CODE_128
* CODE_39
* ITF

### Windows8

* UPC_A
* UPC_E
* EAN_8
* EAN_13
* CODE_39
* CODE_93
* CODE_128
* ITF
* CODABAR
* MSI
* RSS14
* QR_CODE
* DATA_MATRIX
* AZTEC
* PDF417

### Windows Phone 8

* UPC_A
* UPC_E
* EAN_8
* EAN_13
* CODE_39
* CODE_93
* CODE_128
* ITF
* CODABAR
* MSI
* RSS14
* QR_CODE
* DATA_MATRIX
* AZTEC
* PDF417

### BlackBerry 10
* UPC_A
* UPC_E
* EAN_8
* EAN_13
* CODE_39
* CODE_128
* ITF
* DATA_MATRIX
* AZTEC

`success` and `fail` are callback functions. Success is passed an object with data, type and cancelled properties. Data is the text representation of the barcode data, type is the type of barcode detected and cancelled is whether or not the user cancelled the scan.

A full example could be:
```
   cordova.plugins.barcodeScanner.scan(
      function (result) {
          alert("We got a barcode\n" +
                "Result: " + result.text + "\n" +
                "Format: " + result.format + "\n" +
                "Cancelled: " + result.cancelled);
      }, 
      function (error) {
          alert("Scanning failed: " + error);
      }
   );
```

### Preferences (iOS)

-  __BarcodeToolbarBlack__ (boolean, defaults to false). If set to true changes the standard coloring of the toolbar from white with blue buttons to black with white buttons.

-  __BarcodeToolbarTranslucent__ (boolean, defaults to false). If set to true changes the toolbar from opaque to translucent (setting alpha to 0.7).

-  __BarcodeOrientationMaskPhone__ (integer, defaults to 0). If set to something other than 0, the orientation mask of the calling App (on iPhone) will be overridden, e.g., if the App only supports portrait, the scanner could nonetheless also support landscape (for better recognition of long one-dimensional codes); for this 26 (`UIInterfaceOrientationMaskAllButUpsideDown`) would be a good value; the other way round portrait only would be 2; for all possible values see [Apple's documentation](developer.apple.com/library/prerelease/ios/documentation/UIKit/Reference/UIApplication_Class/index.html#//apple_ref/c/tdef/UIInterfaceOrientationMask). This is only supported for iOS Versions 6.0 and later.

-  __BarcodeOrientationMaskPad__ (integer, defaults to 0). (Same as above just for iPad instead of iPhone; here the example value would be 30 (`UIInterfaceOrientationMaskAll`)).

## Encoding a Barcode ##

The plugin creates the object `cordova.plugins.barcodeScanner` with the method `encode(type, data, success, fail)`. 

Supported encoding types:

* TEXT_TYPE
* EMAIL_TYPE
* PHONE_TYPE
* SMS_TYPE

```
A full example could be:

   cordova.plugins.barcodeScanner.encode(cordova.plugins.barcodeScanner.Encode.TEXT_TYPE, "http://www.nytimes.com", function(success) {
            alert("encode success: " + success);
          }, function(fail) {
            alert("encoding failed: " + fail);
          }
        );
```

## Windows8 quirks ##
Windows 8 implementation currently doesn't support encode functionality.

## Windows Phone 8 quirks ##
Windows Phone 8 implementation currently doesn't support encode functionality.

## BlackBerry 10 quirks
BlackBerry 10 implementation currently doesn't support encode functionality.
Cancelling a scan on BlackBerry 10 is done by touching the screen.

## Thanks on Github ##

So many -- check out the original [iOS](https://github.com/phonegap/phonegap-plugins/tree/DEPRECATED/iOS/BarcodeScanner),  [Android](https://github.com/phonegap/phonegap-plugins/tree/DEPRECATED/Android/BarcodeScanner) and 
[BlackBerry 10](https://github.com/blackberry/WebWorks-Community-APIs/tree/master/BB10-Cordova/BarcodeScanner) repos.

## Licence ##

The MIT License

Copyright (c) 2010 Matt Kane

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
