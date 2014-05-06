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

        var capturePreview = null,
            captureCancelButton = null,
            capture = null,
            captureSettings = null,
            reader = null,

            /* Width of bitmap, generated from capture stream and used for barcode search */
            bitmapWidth = 800,
            /* Width of bitmap, generated from capture stream and used for barcode search */
            bitmapHeight = 600;
        
        /**
         * Creates a preview frame and necessary objects
         */
        function createPreview() {

            // Create fullscreen preview
            capturePreview = document.createElement("video");
            capturePreview.style.cssText = "position: absolute; left: 0; top: 0; width: 100%; height: 100%";

            // Create cancel button
            captureCancelButton = document.createElement("button");
            captureCancelButton.innerText = "Cancel";
            captureCancelButton.style.cssText = "position: absolute; right: 0; bottom: 0; display: block; margin: 20px";
            captureCancelButton.addEventListener('click', cancelPreview, false);

            capture = new Windows.Media.Capture.MediaCapture();

            captureSettings = new Windows.Media.Capture.MediaCaptureInitializationSettings();
            captureSettings.streamingCaptureMode = Windows.Media.Capture.StreamingCaptureMode.video;
        }

        /**
         * Starts stream transmission to preview frame and then run barcode search
         */
        function startPreview() {
            capture.initializeAsync(captureSettings).done(function () {
                capturePreview.src = URL.createObjectURL(capture);
                capturePreview.play();
                
                // Insert preview frame and controls into page
                document.body.appendChild(capturePreview);
                document.body.appendChild(captureCancelButton);

                startBarcodeSearch();
            });
        }

        /**
         * Starts barcode search process, implemented in WinRTBarcodeReader.winmd library
         * Calls success callback, when barcode found.
         */
        function startBarcodeSearch() {
            reader = new WinRTBarcodeReader.Reader(capture, bitmapWidth, bitmapHeight);
            var readOp = reader.readCode();
            readOp.done(function (result) {
                destroyPreview();
                success({ text: result.text, format: result.barcodeFormat, cancelled: false });
            });
        }

        /**
         * Removes preview frame and corresponding objects from window
         */
        function destroyPreview() {
            capturePreview.pause();
            capturePreview.src = null;
            [capturePreview, captureCancelButton].forEach(function (elem) {
                if (elem /* && elem in document.body.childNodes */) {
                    document.body.removeChild(elem);
                }
            });
            if (reader) {
                reader.stop();
                reader = null;
            }
            if (capture) {
                capture.stopRecordAsync();
                capture = null;
            }
        }

        /**
         * Stops preview and then call success callback with cancelled=true
         * See https://github.com/phonegap-build/BarcodeScanner#using-the-plugin
         */
        function cancelPreview() {
            destroyPreview();
            success({ text: null, format: null, cancelled: true });
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
require("cordova/windows8/commandProxy").add("BarcodeScanner", module.exports);
