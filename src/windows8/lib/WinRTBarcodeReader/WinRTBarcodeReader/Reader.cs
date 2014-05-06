/*
 * Copyright (c) Microsoft Open Technologies, Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

namespace WinRTBarcodeReader
{
    using System;
    using System.Threading;
    using System.Threading.Tasks;

    using Windows.Foundation;
    using Windows.Media.Capture;
    using Windows.Media.MediaProperties;
    using Windows.Storage.Streams;

    using ZXing;

    /// <summary>
    /// Defines the Reader type, that perform barcode search asynchronously.
    /// </summary>
    public sealed class Reader
    {
        #region Private fields

        /// <summary>
        /// MediaCapture instance, used for barcode search.
        /// </summary>
        private readonly MediaCapture capture;

        /// <summary>
        /// Encoding properties for mediaCapture object.
        /// </summary>
        private readonly ImageEncodingProperties encodingProps;

        /// <summary>
        /// Image stream for MediaCapture content.
        /// </summary>
        private InMemoryRandomAccessStream imageStream;

        /// <summary>
        /// Data reader, used to create bitmap array.
        /// </summary>
        private DataReader datareader;

        /// <summary>
        /// Flag that indicates successful barcode search.
        /// </summary>
        private bool barcodeFound;

        /// <summary>
        /// The cancel search flag.
        /// </summary>
        private CancellationTokenSource cancelSearch;

        #endregion

        #region Constructor

        /// <summary>
        /// Initializes a new instance of the <see cref="Reader" /> class.
        /// </summary>
        /// <param name="capture">MediaCapture instance.</param>
        /// <param name="width">Capture frame width.</param>
        /// <param name="height">Capture frame height.</param>
        public Reader(MediaCapture capture, uint width, uint height)
        {
            this.capture = capture;
            this.encodingProps = new ImageEncodingProperties { Subtype = "BMP", Width = width, Height = height};
            this.barcodeFound = false;
            this.cancelSearch = new CancellationTokenSource();
        }

        #endregion

        #region Public methods

        /// <summary>
        /// Perform async MediaCapture analysis and searches for barcode.
        /// </summary>
        /// <returns>IAsyncOperation object</returns>
        public IAsyncOperation<Result> ReadCode()
        {
            return this.Read().AsAsyncOperation();
        }

        /// <summary>
        /// Send signal to stop barcode search.
        /// </summary>
        public void Stop()
        {
            this.cancelSearch.Cancel();
        }

        #endregion

        #region Private methods

        /// <summary>
        /// Perform async MediaCapture analysis and searches for barcode.
        /// </summary>
        /// <returns>Task object</returns>
        private async Task<Result> Read()
        {
            Result result = null;
            while (!this.barcodeFound)
            {
                try
                {
                    result = await this.GetCameraImage(this.cancelSearch.Token);
                }
                catch (OperationCanceledException)
                {
                    result = null;
                }
            }

            return result;
        }

        /// <summary>
        /// Perform image capture from mediaCapture object
        /// </summary>
        /// <param name="cancelToken">
        /// The cancel Token.
        /// </param>
        /// <returns>
        /// Decoded barcode string.
        /// </returns>
        private async Task<Result> GetCameraImage(CancellationToken cancelToken)
        {
            Result result = null;
            await Task.Run(
                async () =>
                    {
                        this.imageStream = new InMemoryRandomAccessStream();
                        await this.capture.CapturePhotoToStreamAsync(this.encodingProps, this.imageStream);
                        await this.imageStream.FlushAsync();

                        this.datareader = new DataReader(this.imageStream);
                        await this.datareader.LoadAsync((uint)this.imageStream.Size);
                        var bitmap = new byte[this.encodingProps.Width * this.encodingProps.Height * 4];
                        uint index = 0;
                        while (this.datareader.UnconsumedBufferLength > 0)
                        {
                            bitmap[index] = datareader.ReadByte();
                            index++;
                        }

                        result = await this.DecodeBitmap(bitmap);

                        if (result != null)
                        {
                            this.barcodeFound = true;
                        }
                    },
                cancelToken).ConfigureAwait(false);
            return result;
        }

        /// <summary>
        /// Searches the bitmap for barcode.
        /// </summary>
        /// <param name="bitmap">Array of bytes, represents bitmap</param>
        /// <param name="format">Bitmap format, default is BGRA32</param>
        /// <returns>String, encoded with barcode or empty string if barcode not found</returns>
        private async Task<Result> DecodeBitmap(byte[] bitmap, BitmapFormat format = BitmapFormat.BGRA32)
        {
            Result result = null;
            try
            {
                await Task.Run(
                    () =>
                        {
                            var c = new BarcodeReader();
                            result = c.Decode(
                                bitmap,
                                (int)this.encodingProps.Width,
                                (int)this.encodingProps.Height,
                                format);
                        }).ConfigureAwait(false);
            }
            catch (Exception)
            {
            }

            return result;
        }

        #endregion
    }
}
