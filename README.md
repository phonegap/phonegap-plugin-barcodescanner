# PhoneGap Plugin BarcodeScanner
================================

[![Build Status](https://travis-ci.org/phonegap/phonegap-plugin-barcodescanner.svg)](https://travis-ci.org/phonegap/phonegap-plugin-barcodescanner)

Cross-platform BarcodeScanner for Cordova / PhoneGap.

Follows the [Cordova Plugin spec](https://cordova.apache.org/docs/en/latest/plugin_ref/spec.html), so that it works with [Plugman](https://github.com/apache/cordova-plugman).

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
- Windows (Windows/Windows Phone 8.1 and Windows 10)
- Windows Phone 8
- BlackBerry 10
- Browser

Note: the Android source for this project includes an Android Library Project.
plugman currently doesn't support Library Project refs, so its been
prebuilt as a jar library. Any updates to the Library Project should be
committed with an updated jar.

Note: Windows 10 applications can not be build for `AnyCPU` architecture, which is default for Windows platform. If you want to build/run Windows 10 app, you should specify target architecture explicitly, for example (Cordova CLI):

```
cordova run windows -- --archs=x86
```

Note: Since iOS 10 it's mandatory to add a `NSCameraUsageDescription` in the info.plist.

`NSCameraUsageDescription` describes the reason that the app accesses the user’s camera.
When the system prompts the user to allow access, this string is displayed as part of the dialog box.

To add this entry you can pass the following variable on plugin install.

```
cordova plugin add phonegap-plugin-barcodescanner --variable CAMERA_USAGE_DESCRIPTION="To scan barcodes"
```

### PhoneGap Build
If you're using [PhoneGap Build](https://build.phonegap.com/) please make sure you specify `gradle` as your Android build tool in `config.xml`: `<preference name="android-build-tool" value="gradle" />`.

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
* RSS_EXPANDED

Not by default, but supported if you pass in the "formats" option:
* PDF417
* AZTEC

### iOS

* QR_CODE
* DATA_MATRIX
* UPC_E
* UPC_A
* EAN_8
* EAN_13
* CODE_128
* CODE_39
* ITF

### Windows

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
```js
   cordova.plugins.barcodeScanner.scan(
      function (result) {
          alert("We got a barcode\n" +
                "Result: " + result.text + "\n" +
                "Format: " + result.format + "\n" +
                "Cancelled: " + result.cancelled);
      },
      function (error) {
          alert("Scanning failed: " + error);
      },
      {
          preferFrontCamera : true, // iOS and Android
          showFlipCameraButton : true, // iOS and Android
          showTorchButton : true, // iOS and Android
          torchOn: true, // Android, launch with the torch switched on (if available)
          prompt : "Place a barcode inside the scan area", // Android
          resultDisplayDuration: 500, // Android, display scanned text for X ms. 0 suppresses it entirely, default 1500
          formats : "QR_CODE,PDF_417", // default: all but PDF_417 and RSS_EXPANDED
          orientation : "landscape", // Android only (portrait|landscape), default unset so it rotates with the device
          disableAnimations : true, // iOS
          disableSuccessBeep: false // iOS
      }
   );
```

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

## Windows quirks ##

* Windows implementation currently doesn't support encode functionality.

* On Windows 10 desktop ensure that you have Windows Media Player and Media Feature pack installed.

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
