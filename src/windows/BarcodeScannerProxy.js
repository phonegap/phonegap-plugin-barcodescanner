/*
 * Copyright (c) Microsoft Open Technologies, Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

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
            capture,
            reader;
        
        /**
         * Creates a preview frame and necessary objects
         */
        function createPreview() {

            // Create fullscreen preview
            capturePreview = document.createElement("video");
            capturePreview.style.cssText = "position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: black";

            capturePreviewAlignmentMark = document.createElement('div');
            capturePreviewAlignmentMark.style.cssText = "position: absolute; left: 0; top: 50%; width: 100%; height: 3px; background: red";

            // Create cancel button
            captureCancelButton = document.createElement("button");
            captureCancelButton.innerText = "Cancel";
            captureCancelButton.style.cssText = "position: absolute; right: 0; bottom: 0; display: block; margin: 20px";
            captureCancelButton.addEventListener('click', cancelPreview, false);

            capture = new Windows.Media.Capture.MediaCapture();
        }

        /**
         * Starts stream transmission to preview frame and then run barcode search
         */
        function startPreview() {
            var captureSettings = new Windows.Media.Capture.MediaCaptureInitializationSettings();
            captureSettings.streamingCaptureMode = Windows.Media.Capture.StreamingCaptureMode.video;
            captureSettings.photoCaptureSource = Windows.Media.Capture.PhotoCaptureSource.videoPreview;

            capture.initializeAsync(captureSettings).done(function () {

                //trying to set focus mode
                var controller = capture.videoDeviceController;

                if (controller.focusControl && controller.focusControl.supported) {
                    if (controller.focusControl.configure) {
                        var focusConfig = new Windows.Media.Devices.FocusSettings();
                        focusConfig.autoFocusRange = Windows.Media.Devices.AutoFocusRange.macro;

                        var supportContinuousFocus = controller.focusControl.supportedFocusModes.indexOf(Windows.Media.Devices.FocusMode.continuous).returnValue;
                        var supportAutoFocus = controller.focusControl.supportedFocusModes.indexOf(Windows.Media.Devices.FocusMode.auto).returnValue;

                        if (supportContinuousFocus) {
                            focusConfig.mode = Windows.Media.Devices.FocusMode.continuous;
                        } else if (supportAutoFocus) {                        
                            focusConfig.mode = Windows.Media.Devices.FocusMode.auto;
                        }

                        controller.focusControl.configure(focusConfig);
                        controller.focusControl.focusAsync();
                    }
                }

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
                    document.body.appendChild(capturePreview);
                    document.body.appendChild(capturePreviewAlignmentMark);
                    document.body.appendChild(captureCancelButton);

                    startBarcodeSearch(maxResProps.width, maxResProps.height);
                });
            });
        }

        /**
         * Starts barcode search process, implemented in WinRTBarcodeReader.winmd library
         * Calls success callback, when barcode found.
         */
        function startBarcodeSearch(width, height) {

            reader = new WinRTBarcodeReader.Reader();
            reader.init(capture, width, height);
            reader.readCode().done(function (result) {
                destroyPreview();
                success({ text: result && result.text, format: result && result.barcodeFormat, cancelled: !result });
            }, function (err) {
                destroyPreview();
                fail(err);
            });
        }

        /**
         * Removes preview frame and corresponding objects from window
         */
        function destroyPreview() {

            capturePreview.pause();
            capturePreview.src = null;

            [capturePreview, capturePreviewAlignmentMark, captureCancelButton].forEach(function (elem) {
                elem && document.body.removeChild(elem);
            });
            
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
