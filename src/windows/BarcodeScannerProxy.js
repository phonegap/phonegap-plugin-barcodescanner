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
            reader,
            prevRotDegree;
        
        var rotateVideoOnOrientationChange = true;
        var reverseVideoRotation = false;
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

        function videoPreviewRotationLookup(displayOrientation, counterclockwise) {
            var degreesToRotate;

            switch (displayOrientation) {
                case Windows.Graphics.Display.DisplayOrientations.landscape:
                    degreesToRotate = 0;
                    break;
                case Windows.Graphics.Display.DisplayOrientations.portrait:
                    if (counterclockwise) {
                        degreesToRotate = 270;
                    } else {
                        degreesToRotate = 90;
                    }
                    break;
                case Windows.Graphics.Display.DisplayOrientations.landscapeFlipped:
                    degreesToRotate = 180;
                    break;
                case Windows.Graphics.Display.DisplayOrientations.portraitFlipped:
                    if (counterclockwise) {
                        degreesToRotate = 90;
                    } else {
                        degreesToRotate = 270;
                    }
                    break;
                default:
                    degreesToRotate = 0;
                    break;
            }

            return degreesToRotate;
        }

        function updatePreviewForRotation() {
            if (!capture) {
                return;
            }
            var rotDegree;
            var videoEncodingProperties = capture.videoDeviceController.getMediaStreamProperties(Windows.Media.Capture.MediaStreamType.VideoPreview);

            var previewMirroring = capture.getPreviewMirroring();
            var counterclockwiseRotation = (previewMirroring && !reverseVideoRotation) ||
                (!previewMirroring && reverseVideoRotation);

            //Set the video subtype
            var rotGUID = "{0xC380465D, 0x2271, 0x428C, {0x9B, 0x83, 0xEC, 0xEA, 0x3B, 0x4A, 0x85, 0xC1}}";


            if (rotateVideoOnOrientationChange) {
                // Lookup up the rotation degrees.  
                rotDegree = videoPreviewRotationLookup(Windows.Graphics.Display.DisplayInformation.getForCurrentView().currentOrientation, counterclockwiseRotation);
                if (typeof prevRotDegree === "undefined" || prevRotDegree !== rotDegree) {
                    // rotate the preview video
                    if (videoEncodingProperties.properties.hasKey(rotGUID)) {
                        videoEncodingProperties.properties.remove(rotGUID);
                    }
                    videoEncodingProperties.properties.insert(rotGUID, rotDegree);
                    capture.setEncodingPropertiesAsync(Windows.Media.Capture.MediaStreamType.VideoPreview, videoEncodingProperties, null);
                    prevRotDegree = rotDegree;
                }
                // since "orientationchange" event might not work, poll for changes...
                window.setTimeout(updatePreviewForRotation, 500);
            } else {
                if (typeof prevRotDegree === "undefined") {
                    capture.setPreviewRotation(Windows.Media.Capture.VideoRotation.none);
                    prevRotDegree = 0;
                }
            }
        }


        /**
         * Starts stream transmission to preview frame and then run barcode search
         */
        function startPreview() {
            var captureSettings = new Windows.Media.Capture.MediaCaptureInitializationSettings();
            captureSettings.streamingCaptureMode = Windows.Media.Capture.StreamingCaptureMode.video;
            captureSettings.photoCaptureSource = Windows.Media.Capture.PhotoCaptureSource.videoPreview;
            
            // Enumerate cameras and add find first back camera
            var cameraId = null;
            var deviceInfo = Windows.Devices.Enumeration.DeviceInformation;
            if (deviceInfo) {
                deviceInfo.findAllAsync(Windows.Devices.Enumeration.DeviceClass.videoCapture).done(function (cameras) {
                    if (cameras && cameras.length > 0) {
                        cameras.forEach(function (camera) {
                            if (camera && !cameraId) {
                                // Make use of the camera's location if it is available to the description
                                var camLocation = camera.enclosureLocation;
                                if (camLocation && camLocation.panel === Windows.Devices.Enumeration.Panel.back) {
                                    cameraId = camera.id;
                                }
                            }
                        });
                    }
                    if (cameraId) {
                        captureSettings.videoDeviceId = cameraId;
                    }

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
                            capturePreview.src = URL.createObjectURL(capture);
                            // handle orientation change
                            rotateVideoOnOrientationChange = true;
                            capturePreview.onloadeddata = function () {
                                updatePreviewForRotation();
                            };
                            // add event handler - will not work anyway
                            window.addEventListener("orientationchange", updatePreviewForRotation, false);

                            capturePreview.play();

                            // Insert preview frame and controls into page
                            document.body.appendChild(capturePreview);
                            document.body.appendChild(capturePreviewAlignmentMark);
                            document.body.appendChild(captureCancelButton);

                            startBarcodeSearch(maxResProps.width, maxResProps.height);
                        });
                    });
                });
            }
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
            // un-handle orientation change
            rotateVideoOnOrientationChange = false;
            // remove event handler
            window.removeEventListener("orientationchange", updatePreviewForRotation);

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
