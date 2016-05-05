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
    using System.Runtime.Serialization;
    using Microsoft.Phone.Tasks;
    using WPCordovaClassLib.Cordova.JSON;
    using ZXing;

    /// <summary>
    /// Class that extends cordova with Barcode scanner functionality.
    /// </summary>
    public class BarcodeScanner : BaseCommand
    {
        /// <summary>
        /// Scans the barcode.
        /// </summary>
        /// <param name="options">Parameter is ignored.</param>
        public void scan(string options)
        {
            var task = new BarcodeScannerTask();
            task.Completed += this.TaskCompleted;
            task.Show();
        }

        /// <summary>
        /// Handler for barcode scanner task.
        /// </summary>
        /// <param name="sender">The sender.</param>
        /// <param name="e">The scan result.</param>
        private void TaskCompleted(object sender, BarcodeScannerTask.ScanResult e)
        {
            PluginResult result;

            switch (e.TaskResult)
            {
                case TaskResult.OK:
                    result = new PluginResult(PluginResult.Status.OK);
                    result.Message = JsonHelper.Serialize(new BarcodeResult(e.Barcode));
                    break;
                case TaskResult.Cancel:
                    // If scan is cancelled we return PluginResult.Status.OK with Message contains cancelled: true
                    // See plugin docs https://github.com/MSOpenTech/BarcodeScanner#using-the-plugin
                    result = new PluginResult(PluginResult.Status.OK);
                    result.Message = JsonHelper.Serialize(new BarcodeResult());
                    break;
                default:
                    result = new PluginResult(PluginResult.Status.ERROR);
                    break;
            }

            this.DispatchCommandResult(result);
        }
    }

    /// <summary>
    /// Represents the barcode scan result, that should be serialized and passed to JS layer.
    /// </summary>
    [DataContract]
    public sealed class BarcodeResult
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="BarcodeResult"/> class.
        /// </summary>
        /// <param name="canceled">if set to <c>true</c> [canceled].</param>
        public BarcodeResult(bool canceled = true)
        {
            this.Cancelled = canceled;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="BarcodeResult"/> class.
        /// </summary>
        /// <param name="barcode">The barcode result.</param>
        public BarcodeResult(Result barcode)
        {
            this.Cancelled = false;
            this.Format = barcode.BarcodeFormat.ToString();
            this.Text = barcode.Text;
        }

        /// <summary>
        /// Gets a value indicating whether barcode scan is cancelled.
        /// </summary>
        /// <value>
        ///   <c>true</c> if cancelled; otherwise, <c>false</c>.
        /// </value>
        [DataMember(Name = "cancelled")]
        public bool Cancelled { get; private set; }

        /// <summary>
        /// Gets the format of barcode.
        /// </summary>
        /// <value>
        /// The barcode format.
        /// </value>
        [DataMember(Name = "format")]
        public string Format { get; private set; }

        /// <summary>
        /// Gets the barcode text.
        /// </summary>
        /// <value>
        /// The barcode text.
        /// </value>
        [DataMember(Name = "text")]
        public string Text { get; private set; }
    }
}
