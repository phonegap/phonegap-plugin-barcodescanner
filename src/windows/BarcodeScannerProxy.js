/*
 * Copyright (c) Microsoft Open Technologies, Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

var urlutil = require('cordova/urlutil');

/**
 * List of supported barcode formats from ZXing library. Used to return format
 *   name instead of number code as per plugin spec.
 *
 * @enum {String}
 */
var BARCODE_FORMAT = {
    1: 'AZTEC',
    2: 'CODABAR',
    4: 'CODE_39',
    8: 'CODE_93',
    16: 'CODE_128',
    32: 'DATA_MATRIX',
    64: 'EAN_8',
    128: 'EAN_13',
    256: 'ITF',
    512: 'MAXICODE',
    1024: 'PDF_417',
    2048: 'QR_CODE',
    4096: 'RSS_14',
    8192: 'RSS_EXPANDED',
    16384: 'UPC_A',
    32768: 'UPC_E',
    61918: 'All_1D',
    65536: 'UPC_EAN_EXTENSION',
    131072: 'MSI',
    262144: 'PLESSEY'
};

/**
 * Detects the first appropriate camera located at the back panel of device. If
 *   there is no back cameras, returns the first available.
 *
 * @returns {Promise<String>} Camera id
 */
function findCamera() {
    var Devices = Windows.Devices.Enumeration;

    // Enumerate cameras and add them to the list
    return Devices.DeviceInformation.findAllAsync(Devices.DeviceClass.videoCapture)
    .then(function (cameras) {

        if (!cameras || cameras.length === 0) {
            throw new Error("No cameras found");
        }

        var backCameras = cameras.filter(function (camera) {
            return camera.enclosureLocation && camera.enclosureLocation.panel === Devices.Panel.back;
        });

        // If there is back cameras, return the id of the first,
        // otherwise take the first available device's id
        return (backCameras[0] || cameras[0]).id;
    });
}

/**
 * @param {Windows.Graphics.Display.DisplayOrientations} displayOrientation
 * @return {Number}
 */
function videoPreviewRotationLookup(displayOrientation, isMirrored) {
    var degreesToRotate;

    switch (displayOrientation) {
        case Windows.Graphics.Display.DisplayOrientations.landscape:
            degreesToRotate =  Windows.Media.Capture.VideoRotation.none;
            break;
        case Windows.Graphics.Display.DisplayOrientations.portrait:
            if (isMirrored) {
                degreesToRotate = Windows.Media.Capture.VideoRotation.clockwise270Degrees;
            } else {
                degreesToRotate = Windows.Media.Capture.VideoRotation.clockwise90Degrees;
            }
            break;
        case Windows.Graphics.Display.DisplayOrientations.landscapeFlipped:
            degreesToRotate = Windows.Media.Capture.VideoRotation.clockwise180Degrees;
            break;
        case Windows.Graphics.Display.DisplayOrientations.portraitFlipped:
            if (isMirrored) {
                degreesToRotate = Windows.Media.Capture.VideoRotation.clockwise90Degrees;
            } else {
                degreesToRotate = Windows.Media.Capture.VideoRotation.clockwise270Degrees;
            }
            break;
        default:
            degreesToRotate = Windows.Media.Capture.VideoRotation.none;
            break;
    }

    return degreesToRotate;
}

/**
 * The pure JS implementation of barcode reader from WinRTBarcodeReader.winmd.
 *   Works only on Windows 10 devices and more efficient than original one.
 *
 * @class {BarcodeReader}
 */
function BarcodeReader () {
    this._promise = null;
    this._cancelled = false;
}

/**
 * Returns an instance of Barcode reader, depending on capabilities of Media
 *   Capture API
 *
 * @static
 * @constructs {BarcodeReader}
 *
 * @param   {MediaCapture}   mediaCaptureInstance  Instance of
 *   Windows.Media.Capture.MediaCapture class
 *
 * @return  {BarcodeReader}  BarcodeReader instance that could be used for
 *   scanning
 */
BarcodeReader.get = function (mediaCaptureInstance) {
    if (mediaCaptureInstance.getPreviewFrameAsync && ZXing.BarcodeReader) {
        return new BarcodeReader();
    }

    // If there is no corresponding API (Win8/8.1/Phone8.1) use old approach with WinMD library
    return new WinRTBarcodeReader.Reader();

};

/**
 * Initializes instance of reader.
 *
 * @param   {MediaCapture}  capture  Instance of
 *   Windows.Media.Capture.MediaCapture class, used for acquiring images/ video
 *   stream for barcode scanner.
 * @param   {Number}  width    Video/image frame width
 * @param   {Number}  height   Video/image frame height
 */
BarcodeReader.prototype.init = function (capture, width, height) {
    this._capture = capture;
    this._width = width;
    this._height = height;
    this._zxingReader = new ZXing.BarcodeReader();
};

/**
 * Starts barcode search routines asyncronously.
 *
 * @return  {Promise<ScanResult>}  barcode scan result or null if search
 *   cancelled.
 */
BarcodeReader.prototype.readCode = function () {

    /**
     * Grabs a frame from preview stream uning Win10-only API and tries to
     *   get a barcode using zxing reader provided. If there is no barcode
     *   found, returns null.
     */
    function scanBarcodeAsync(mediaCapture, zxingReader, frameWidth, frameHeight) {
        // Shortcuts for namespaces
        var Imaging = Windows.Graphics.Imaging;
        var Streams = Windows.Storage.Streams;

        var frame = new Windows.Media.VideoFrame(Imaging.BitmapPixelFormat.bgra8, frameWidth, frameHeight);
        return mediaCapture.getPreviewFrameAsync(frame)
        .then(function (capturedFrame) {

            // Copy captured frame to buffer for further deserialization
            var bitmap = capturedFrame.softwareBitmap;
            var rawBuffer = new Streams.Buffer(bitmap.pixelWidth * bitmap.pixelHeight * 4);
            capturedFrame.softwareBitmap.copyToBuffer(rawBuffer);
            capturedFrame.close();

            // Get raw pixel data from buffer
            var data = new Uint8Array(rawBuffer.length);
            var dataReader = Streams.DataReader.fromBuffer(rawBuffer);
            dataReader.readBytes(data);
            dataReader.close();

            return zxingReader.decode(data, frameWidth, frameHeight, ZXing.BitmapFormat.bgra32);
        });
    }

    var self = this;
    return scanBarcodeAsync(this._capture, this._zxingReader, this._width, this._height)
    .then(function (result) {
        if (self._cancelled)
            return null;

        return result || (self._promise = self.readCode());
    });
};

/**
 * Stops barcode search
 */
BarcodeReader.prototype.stop = function () {
    this._cancelled = true;
};

module.exports = {

    /**
     * Scans image via device camera and retieves barcode from it.
     * @param  {function} success Success callback
     * @param  {function} fail    Error callback
     * @param  {array} args       Arguments array
     */
    scan: function (success, fail, args) {
        var capturePreview,
            capturePreviewAlignmentMark,
            captureCancelButton,
            navigationButtonsDiv,
            previewMirroring,
            closeButton,
            capture,
            reader;

        function updatePreviewForRotation(evt) {
            if (!capture) {
                return;
            }

            var displayInformation = (evt && evt.target) || Windows.Graphics.Display.DisplayInformation.getForCurrentView();
            var currentOrientation = displayInformation.currentOrientation;

            previewMirroring = capture.getPreviewMirroring();

            // Lookup up the rotation degrees.
            var rotDegree = videoPreviewRotationLookup(currentOrientation, previewMirroring);
            capture.setPreviewRotation(rotDegree);
        }

        /**
         * Creates a preview frame and necessary objects
         */
        function createPreview() {

            // Create fullscreen preview
            var capturePreviewFrameStyle = document.createElement('link');
            capturePreviewFrameStyle.rel = "stylesheet";
            capturePreviewFrameStyle.type = "text/css";
            capturePreviewFrameStyle.href = urlutil.makeAbsolute("/www/css/plugin-barcodeScanner.css");

            document.head.appendChild(capturePreviewFrameStyle);

            capturePreviewFrame = document.createElement('div');
            capturePreviewFrame.className = "barcode-scanner-wrap";

            capturePreview = document.createElement("video");
            capturePreview.className = "barcode-scanner-preview";
            capturePreview.addEventListener('click', function () {
                focus();
            });

            capturePreviewAlignmentMark = document.createElement('div');
            capturePreviewAlignmentMark.className = "barcode-scanner-mark";

            navigationButtonsDiv = document.createElement("div");
            navigationButtonsDiv.className = "barcode-scanner-app-bar";
            navigationButtonsDiv.onclick = function (e) {
                e.cancelBubble = true;
            };

            closeButton = document.createElement("div");
            closeButton.innerText = "close";
            closeButton.className = "app-bar-action action-close";
            navigationButtonsDiv.appendChild(closeButton);

            closeButton.addEventListener("click", cancelPreview, false);
            document.addEventListener('backbutton', cancelPreview, false);

            [capturePreview, capturePreviewAlignmentMark, navigationButtonsDiv].forEach(function (element) {
                capturePreviewFrame.appendChild(element);
            });
        }

        function focus(controller) {

            var result = WinJS.Promise.wrap();

            if (!capturePreview || capturePreview.paused) {
                // If the preview is not yet playing, there is no sense in running focus
                return result;
            }

            if (!controller) {
                try {
                    controller = capture && capture.videoDeviceController;
                } catch (err) {
                    console.log('Failed to access focus control for current camera: ' + err);
                    return result;
                }
            }

            if (!controller.focusControl || !controller.focusControl.supported) {
                console.log('Focus control for current camera is not supported');
                return result;
            }

            return controller.focusControl.focusAsync();
        }

        function setupFocus(focusControl) {

            function supportsFocusMode(mode) {
                return focusControl.supportedFocusModes.indexOf(mode).returnValue;
            }

            if (!focusControl || !focusControl.supported || !focusControl.configure) {
                return WinJS.Promise.wrap();
            }

            var FocusMode = Windows.Media.Devices.FocusMode;
            var focusConfig = new Windows.Media.Devices.FocusSettings();
            focusConfig.autoFocusRange = Windows.Media.Devices.AutoFocusRange.normal;

            if (supportsFocusMode(FocusMode.continuous)) {
                console.log("Device supports continuous focus mode");
                focusConfig.mode = FocusMode.continuous;
            } else if (supportsFocusMode(FocusMode.auto)) {
                console.log("Device doesn\'t support continuous focus mode, switching to autofocus mode");
                focusConfig.mode = FocusMode.auto;
            }

            focusControl.configure(focusConfig);
            // Need to wrap this in setTimeout since continuous focus should start only after preview has started. See
            // 'Remarks' at https://msdn.microsoft.com/en-us/library/windows/apps/windows.media.devices.focuscontrol.configure.aspx
            return WinJS.Promise.timeout(200)
            .then(function () {
                return focusControl.focusAsync();
            });
        }

        /**
         * Starts stream transmission to preview frame and then run barcode search
         */
        function startPreview() {
            return findCamera()
            .then(function (id) {
                var captureSettings = new Windows.Media.Capture.MediaCaptureInitializationSettings();
                captureSettings.streamingCaptureMode = Windows.Media.Capture.StreamingCaptureMode.video;
                captureSettings.photoCaptureSource = Windows.Media.Capture.PhotoCaptureSource.videoPreview;
                captureSettings.videoDeviceId = id;

                capture = new Windows.Media.Capture.MediaCapture();
                return capture.initializeAsync(captureSettings);
            })
            .then(function () {

                var controller = capture.videoDeviceController;
                var deviceProps = controller.getAvailableMediaStreamProperties(Windows.Media.Capture.MediaStreamType.videoRecord);

                deviceProps = Array.prototype.slice.call(deviceProps);
                deviceProps = deviceProps.filter(function (prop) {
                    // filter out streams with "unknown" subtype - causes errors on some devices
                    return prop.subtype !== "Unknown" && prop.width > 100;
                }).sort(function (propA, propB) {
                    // sort properties by resolution
                    return propA.width - propB.width;
                });
                var minResProps = deviceProps[0];
                return controller.setMediaStreamPropertiesAsync(Windows.Media.Capture.MediaStreamType.videoRecord, minResProps)
                .then(function () {
                    return {
                        capture: capture,
                        width: minResProps.width,
                        height: minResProps.height
                    };
                });
            })
            .then(function (captureSettings) {

                capturePreview.msZoom = true;
                capturePreview.src = URL.createObjectURL(capture);
                capturePreview.play();

                // Insert preview frame and controls into page
                document.body.appendChild(capturePreviewFrame);

                return setupFocus(captureSettings.capture.videoDeviceController.focusControl)
                .then(function () {
                    Windows.Graphics.Display.DisplayInformation.getForCurrentView().addEventListener("orientationchanged", updatePreviewForRotation, false);
                    return updatePreviewForRotation();
                })
                .then(function () {
                    return captureSettings;
                });
            });
        }

        /**
         * Removes preview frame and corresponding objects from window
         */
        function destroyPreview() {

            Windows.Graphics.Display.DisplayInformation.getForCurrentView().removeEventListener("orientationchanged", updatePreviewForRotation, false);
            document.removeEventListener('backbutton', cancelPreview);

            capturePreview.pause();
            capturePreview.src = null;

            if (capturePreviewFrame) {
                document.body.removeChild(capturePreviewFrame);
            }

            reader && reader.stop();
            reader = null;

            capture && capture.stopRecordAsync();
            capture = null;
        }

        /**
         * Stops preview and then call success callback with cancelled=true
         * See https://github.com/phonegap-build/BarcodeScanner#using-the-plugin
         */
        function cancelPreview() {
            reader && reader.stop();
        }

        WinJS.Promise.wrap(createPreview())
        .then(function () {
            return startPreview();
        })
        .then(function (captureSettings) {
            reader = BarcodeReader.get(captureSettings.capture);
            reader.init(captureSettings.capture, captureSettings.width, captureSettings.height);

            // Add a small timeout before capturing first frame otherwise
            // we would get an 'Invalid state' error from 'getPreviewFrameAsync'
            return WinJS.Promise.timeout(200)
            .then(function () {
                return reader.readCode();
            });
        })
        .done(function (result) {
            destroyPreview();
            success({
                text: result && result.text,
                format: result && BARCODE_FORMAT[result.barcodeFormat],
                cancelled: !result
            });
        }, function (error) {
            destroyPreview();
            fail(error);
        });
    },

    /**
     * Encodes specified data into barcode
     * @param  {function} success Success callback
     * @param  {function} fail    Error callback
     * @param  {array} args       Arguments array
     */
    encode: function (success, fail, args) {
        fail("Not implemented yet");
    }
};

require("cordova/exec/proxy").add("BarcodeScanner", module.exports);
