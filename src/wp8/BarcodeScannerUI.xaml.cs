﻿/*
 * Copyright (c) Microsoft Open Technologies, Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

namespace WPCordovaClassLib.Cordova.Commands
{
    using System;
    using System.Windows;
    using System.Windows.Controls;
    using System.Windows.Input;
    using System.Windows.Media.Imaging;
    using System.Windows.Navigation;
    using System.Windows.Threading;

    using Microsoft.Devices;
    using Microsoft.Phone.Tasks;

    using ZXing;

    /// <summary>
    /// Class that represents UI for barcode scanner.
    /// </summary>
    public partial class BarcodeScannerUI
    {
        /// <summary>
        /// The result of scan operation.
        /// </summary>
        private BarcodeScannerTask.ScanResult result;

        /// <summary>
        /// The barcode reader object
        /// </summary>
        private BarcodeReader reader;

        /// <summary>
        /// Device camera object
        /// </summary>
        private PhotoCamera camera;

        private DispatcherTimer timer;

        /// <summary>
        /// Initializes a new instance of the <see cref="BarcodeScannerUI"/> class.
        /// This implementation not use camera autofocus.
        /// </summary>
        public BarcodeScannerUI()
        {
            this.InitializeComponent();

            // Instantiate objects and start camera preview
            this.camera = new PhotoCamera();
            this.reader = new BarcodeReader {Options = {TryHarder = true}};
            this.CameraBrush.SetSource(this.camera);

            // Bind events
            this.camera.Initialized += this.CameraInitialized;
            this.reader.ResultFound += this.ReaderResultFound;

            this.timer = new DispatcherTimer {Interval = TimeSpan.FromMilliseconds(100)};
            this.timer.Tick += (sender, args) => ScanForBarcode();

            this.BackKeyPress += CancelScan;

            CameraButtons.ShutterKeyHalfPressed += StartCameraFocus;
            camera.AutoFocusCompleted += StartCameraFocus;

        }

        private void StartCameraFocus(object sender, EventArgs eventArgs)
        {
            camera.Focus();
        }

        /// <summary>
        /// Occurs when barcode scan is [completed].
        /// </summary>
        public event EventHandler<BarcodeScannerTask.ScanResult> Completed;

        /// <summary>
        /// Called when a page is no longer the active page in a frame.
        /// </summary>
        /// <param name="e">An object that contains the event data.</param>
        protected override void OnNavigatedFrom(NavigationEventArgs e)
        {
            // If result is null, user is cancelled scan operation
            this.result = this.result ?? new BarcodeScannerTask.ScanResult(TaskResult.Cancel);
            this.Completed(this, this.result);
            this.CleanUp();
            base.OnNavigatedFrom(e);
        }

        /// <summary>
        /// Called when device camera initialized.
        /// </summary>
        /// <param name="sender">The sender.</param>
        /// <param name="e">The <see cref="CameraOperationCompletedEventArgs"/> instance containing the event data.</param>
        private void CameraInitialized(object sender, CameraOperationCompletedEventArgs e)
        {
            if (e.Succeeded)
            {
                if (camera.IsFocusSupported)
                {
                    camera.Focus();
                }

                // Start scan process in separate thread
                this.Dispatcher.BeginInvoke(() => timer.Start());
            }
            else
            {
                this.result = new BarcodeScannerTask.ScanResult(TaskResult.None);
                NavigationService.GoBack();
            }
        }

        private void ScanForBarcode()
        {
            var cameraBuffer = new WriteableBitmap(
                                (int)camera.PreviewResolution.Width,
                                (int)camera.PreviewResolution.Height);

            camera.GetPreviewBufferArgb32(cameraBuffer.Pixels);
            cameraBuffer.Invalidate();

            reader.Decode(cameraBuffer);
        }

        /// <summary>
        /// Called when reader find barcode.
        /// </summary>
        /// <param name="obj">Scan result object.</param>
        private void ReaderResultFound(Result obj)
        {
            VibrateController.Default.Start(TimeSpan.FromMilliseconds(100));
            this.result = new BarcodeScannerTask.ScanResult(TaskResult.OK) { Barcode = obj };
            NavigationService.GoBack();
        }

        /// <summary>
        /// Cleans up resources and removes unnecessary callbacks.
        /// </summary>
        private void CleanUp()
        {
            CameraButtons.ShutterKeyHalfPressed -= StartCameraFocus;
            if (this.camera != null)
            {
                this.camera.AutoFocusCompleted -= StartCameraFocus;
                this.camera.Initialized -= this.CameraInitialized;
                this.camera.Dispose();
                this.camera = null;
            }

            if (this.reader != null)
            {
                this.reader.ResultFound -= this.ReaderResultFound;
                this.reader = null;
            }

            if (this.timer != null)
            {
                this.timer.Stop();
                this.timer = null;
            }
        }

        private void ApplicationBarIconButton_Click(object sender, EventArgs e)
        {
            NavigationService.GoBack();
        }

        private void CancelScan(object sender, EventArgs eventArgs)
        {
            NavigationService.GoBack();
        }
    }
}