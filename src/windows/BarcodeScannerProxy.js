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
            closeButton,
            capture,
            reader;

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

            capture = new Windows.Media.Capture.MediaCapture();
        }

        function focus(controller) {

            var result = WinJS.Promise.wrap();

            if (!capturePreview || capturePreview.paused) {
                // If the preview is not yet palying, there is no sense in running focus
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
            var captureSettings = new Windows.Media.Capture.MediaCaptureInitializationSettings();
            captureSettings.streamingCaptureMode = Windows.Media.Capture.StreamingCaptureMode.video;
            captureSettings.photoCaptureSource = Windows.Media.Capture.PhotoCaptureSource.videoPreview;

            capture.initializeAsync(captureSettings).done(function () {

                var controller = capture.videoDeviceController;
                var deviceProps = controller.getAvailableMediaStreamProperties(Windows.Media.Capture.MediaStreamType.videoRecord);

                deviceProps = Array.prototype.slice.call(deviceProps);
                deviceProps = deviceProps.filter(function (prop) {
                    // filter out streams with "unknown" subtype - causes errors on some devices
                    return prop.subtype !== "Unknown";
                }).sort(function (propA, propB) {
                    // sort properties by resolution
                    return propB.width - propA.width;
                });

                var maxResProps = deviceProps[0];

                controller.setMediaStreamPropertiesAsync(Windows.Media.Capture.MediaStreamType.videoRecord, maxResProps).done(function () {
                    // handle portrait orientation
                    if (Windows.Graphics.Display.DisplayProperties.nativeOrientation == Windows.Graphics.Display.DisplayOrientations.portrait) {
                        capture.setPreviewRotation(Windows.Media.Capture.VideoRotation.clockwise90Degrees);
                        capturePreview.msZoom = true;
                    }

                    capturePreview.src = URL.createObjectURL(capture);
                    capturePreview.play();

                    // Insert preview frame and controls into page
                    document.body.appendChild(capturePreviewFrame);

                    setupFocus(controller.focusControl)
                    .then(function () {
                        return startBarcodeSearch(maxResProps.width, maxResProps.height);
                    })
                    .done(function (result) {
                        destroyPreview();
                        success({ text: result && result.text, format: result && result.barcodeFormat, cancelled: !result });
                    }, function (error) {
                        destroyPreview();
                        fail(error);
                    });
                });
            });
        }

        /**
         * Starts barcode search process, implemented in WinRTBarcodeReader.winmd library
         * Calls success callback, when barcode found.
         */
        function startBarcodeSearch(width, height) {

            if (!capture.getPreviewFrameAsync || !ZXing.BarcodeReader) {
                // If there is no corresponding API (Win8/8.1/Phone8.1) use old approach with WinMD library
                reader = new WinRTBarcodeReader.Reader();
                reader.init(capture, width, height);
                return reader.readCode();
            }

            reader = {
                _promise: null,
                _cancelled: false,
                _zxingReader: new ZXing.BarcodeReader(),

                readCode: function () {

                    var self = this;
                    return scanBarcodeAsync(capture, this._zxingReader, width, height)
                    .then(function (result) {
                        if (self._cancelled)
                            return null;

                        return result || (self._promise = self.readCode());
                    });
                },

                stop: function () {
                    this._cancelled = true;
                }
            };

            // Add a small timeout before capturing first frame otherwise
            // we would get an 'Invalid state' error from 'getPreviewFrameAsync'
            return WinJS.Promise.timeout(200)
            .then(function () {
                return reader.readCode();
            });
        }

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

                var result = zxingReader.decode(data, frameWidth, frameHeight, ZXing.BitmapFormat.bgra32);
                return WinJS.Promise.wrap(result);
            });
        }

        /**
         * Removes preview frame and corresponding objects from window
         */
        function destroyPreview() {

            capturePreview.pause();
            capturePreview.src = null;

            if (capturePreviewFrame) {
                document.body.removeChild(capturePreviewFrame);
            }

            reader && reader.stop();
            reader = null;

            capture && capture.stopRecordAsync();
            capture = null;

            document.removeEventListener('backbutton', cancelPreview);
        }

        /**
         * Stops preview and then call success callback with cancelled=true
         * See https://github.com/phonegap-build/BarcodeScanner#using-the-plugin
         */
        function cancelPreview() {
            reader && reader.stop();
        }

        try {
            createPreview();
            startPreview();
        } catch (ex) {
            fail(ex);
        }
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
