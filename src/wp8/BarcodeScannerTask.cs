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
    using System.Windows.Navigation;

    using Microsoft.Phone.Controls;
    using Microsoft.Phone.Tasks;
    using ZXing;

    /// <summary>
    /// Class that represents barcode scanner task that mimics standart WP8 tasks.
    /// </summary>
    public class BarcodeScannerTask
    {
        /// <summary>
        /// Occurs when task is [completed].
        /// </summary>
        public event EventHandler<ScanResult> Completed;

        /// <summary>
        /// Shows barcode scanner interface.
        /// </summary>
        public void Show()
        {
            Deployment.Current.Dispatcher.BeginInvoke(() =>
            {
                var root = Application.Current.RootVisual as PhoneApplicationFrame;

                if (root == null)
                {
                    return;
                }

                root.Navigated += this.OnNavigated;
                root.Navigate(new Uri("/Plugins/com.phonegap.plugins.barcodescanner/BarcodeScannerUI.xaml", UriKind.Relative));
            });
        }

        /// <summary>
        /// Called when [navigated].
        /// </summary>
        /// <param name="sender">The sender.</param>
        /// <param name="e">The <see cref="NavigationEventArgs"/> instance containing the event data.</param>
        private void OnNavigated(object sender, NavigationEventArgs e)
        {
            if (!(e.Content is BarcodeScannerUI))
            {
                return;
            }

            var phoneApplicationFrame = Application.Current.RootVisual as PhoneApplicationFrame;
            if (phoneApplicationFrame != null)
            {
                phoneApplicationFrame.Navigated -= this.OnNavigated;
            }

            var barcodeScanner = (BarcodeScannerUI)e.Content;

            if (barcodeScanner != null)
            {
                barcodeScanner.Completed += this.Completed;
            }
            else if (this.Completed != null)
            {
                this.Completed(this, new ScanResult(TaskResult.Cancel));
            }
        }

        /// <summary>
        /// Represents barcode scan result.
        /// </summary>
        public class ScanResult : TaskEventArgs
        {
            /// <summary>
            /// Initializes a new instance of the <see cref="ScanResult"/> class.
            /// </summary>
            /// <param name="taskResult">One of the enumeration values that specifies the status of the task.</param>
            public ScanResult(TaskResult taskResult)
                : base(taskResult)
            {
            }

            /// <summary>
            /// Gets the barcode scan result.
            /// </summary>
            /// <value>
            /// The barcode scan result.
            /// </value>
            public Result Barcode { get; internal set; }
        }
    }
}
