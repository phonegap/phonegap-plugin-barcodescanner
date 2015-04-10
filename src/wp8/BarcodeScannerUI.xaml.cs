/*
* Copyright (c) Microsoft Open Technologies, Inc. All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

using System.ComponentModel;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;

namespace WPCordovaClassLib.Cordova.Commands
{
    using System;
    using System.Windows;
    using System.Windows.Media.Imaging;
    using System.Windows.Navigation;

    using Microsoft.Devices;
    using Microsoft.Phone.Controls;
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

        private CancellationTokenSource cancellationTokenSource;

        /// <summary>
        /// Initializes a new instance of the <see cref="BarcodeScannerUI"/> class.
        /// This implementation not use camera autofocus.
        /// </summary>
        public BarcodeScannerUI()
        {
            InitializeComponent();
        }

        /// <summary>
        /// Occurs when barcode scan is [completed].
        /// </summary>
        public event EventHandler<BarcodeScannerTask.ScanResult> Completed;

        private bool isInit = false;

        private bool shouldDispose = false;

        /// <summary>
        /// Called when a page is no longer the active page in a frame.
        /// </summary>
        /// <param name="e">An object that contains the event data.</param>
        protected override void OnNavigatedFrom(NavigationEventArgs e)
        {
            // If result is null, user is cancelled scan operation

            this.result = this.result ?? new BarcodeScannerTask.ScanResult(TaskResult.Cancel);
            BackKeyPress -= BarcodeScannerUI_BackKeyPress;
            Completed(this, this.result);
            CleanUp();
            base.OnNavigatedFrom(e);
        }

        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            BackKeyPress += BarcodeScannerUI_BackKeyPress;
            cancellationTokenSource = new CancellationTokenSource();

            // Instantiate objects and start camera preview
            this.camera = new PhotoCamera();
            this.reader = new BarcodeReader { Options = { TryHarder = true } };

            CameraBrush.SetSource(this.camera);

            // Bind events
            this.camera.Initialized += CameraInitialized;
            this.reader.ResultFound += ReaderResultFound;

            base.OnNavigatedTo(e);
        }

        private void BarcodeScannerUI_BackKeyPress(object sender, CancelEventArgs e)
        {
            this.result = new BarcodeScannerTask.ScanResult(TaskResult.Cancel);
            NavigationService.GoBack();
        }

        /// <summary>
        /// Called when device camera initialized.
        /// </summary>
        /// <param name="sender">The sender.</param>
        /// <param name="e">The <see cref="CameraOperationCompletedEventArgs"/> instance containing the event data.</param>
        private void CameraInitialized(object sender, CameraOperationCompletedEventArgs e)
        {
            this.isInit = true;

            if (this.shouldDispose)
            {
                CleanUp();
                return;
            }

            if (e.Succeeded)
            {


                if (this.camera.IsFlashModeSupported(FlashMode.Off))
                {
                    this.camera.FlashMode = FlashMode.Off;
                }

                // Start scan process in separate thread
                Task.Factory.StartNew(async
                    (_) =>
                {
                    while (this.result == null)
                    {

                        var waitTask = Task.Delay(1500);

                        if (this.camera.IsFocusSupported)
                        {
                            this.camera.Focus();
                        }

                        await waitTask;

                        int width = (int)this.camera.PreviewResolution.Width;
                        int height = (int)this.camera.PreviewResolution.Height;
                        int size = width * height;
                        var cameraBuffer = new int[size];
                        this.camera.GetPreviewBufferArgb32(cameraBuffer);

                        var converted = new byte[size * sizeof(int)];
                        Buffer.BlockCopy(cameraBuffer, 0, converted, 0, converted.Length);

                        try
                        {
                            this.reader.Decode(converted, width, height, RGBLuminanceSource.BitmapFormat.BGRA32);
                        }
                        catch (Exception)
                        {


                        }


                    }
                }, TaskCreationOptions.LongRunning | TaskCreationOptions.DenyChildAttach, CancellationToken.None);
            }
            else
            {
                this.result = new BarcodeScannerTask.ScanResult(TaskResult.None);
                NavigationService.GoBack();
            }
        }

        /// <summary>
        /// Called when reader find barcode.
        /// </summary>
        /// <param name="obj">Scan result object.</param>
        private void ReaderResultFound(Result obj)
        {
            VibrateController.Default.Start(TimeSpan.FromMilliseconds(100));
            this.result = new BarcodeScannerTask.ScanResult(TaskResult.OK) { Barcode = obj };
            Deployment.Current.Dispatcher.BeginInvoke(() => NavigationService.GoBack());
        }

        /// <summary>
        /// Cleans up resources and removes unnecessary callbacks.
        /// </summary>
        public void CleanUp()
        {
            if (this.camera != null)
            {
                if (this.isInit)
                {
                    this.camera.Initialized -= CameraInitialized;
                    this.camera.Dispose();
                }
                else
                {
                    this.shouldDispose = true;
                }

                this.camera = null;
            }

            if (this.reader != null)
            {
                this.reader.ResultFound -= ReaderResultFound;
                this.reader = null;
            }
        }

        private void BarcodeScannerUI_OnBackKeyPress(object sender, CancelEventArgs e)
        {
            NavigationService.GoBack();
        }
    }
}