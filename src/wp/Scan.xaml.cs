using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Navigation;
using Microsoft.Phone.Controls;
using Microsoft.Phone.Shell;
using Microsoft.Devices;
using System.Windows.Threading;
using System.Windows.Media.Imaging;
using ZXing;

namespace BarcodeScanner
{
    public partial class Scan : PhoneApplicationPage
    {
        private PhotoCamera phoneCamera;
        private IBarcodeReader barcodeReader;
        private DispatcherTimer scanTimer;
        private WriteableBitmap previewBuffer;

        private string scannedCode = string.Empty;

        private bool scanSucceeded;

        public Scan()
        {
            InitializeComponent();
        }

        public Cordova.Extension.Commands.BarcodeScanner BarcodeScannerPlugin
        {
            get;
            set;
        }

        protected override void OnNavigatedTo(System.Windows.Navigation.NavigationEventArgs e)
        {
            // Initialize the camera object
            phoneCamera = new PhotoCamera();
            phoneCamera.Initialized += OnCameraInitialized;

            CameraButtons.ShutterKeyHalfPressed += OnCameraButtonShutterKeyHalfPressed;

            //Display the camera feed in the UI
            viewfinderBrush.SetSource(phoneCamera);


            // This timer will be used to scan the camera buffer every 250ms and scan for any barcodes
            scanTimer = new DispatcherTimer();
            scanTimer.Interval = TimeSpan.FromMilliseconds(250);
            scanTimer.Tick += (o, arg) => ScanForBarcode();

            base.OnNavigatedTo(e);
        }

        private void OnCameraButtonShutterKeyHalfPressed(object sender, EventArgs e)
        {
            phoneCamera.Focus();
        }

        protected override void OnNavigatingFrom(System.Windows.Navigation.NavigatingCancelEventArgs e)
        {
            scanTimer.Stop();

            if (phoneCamera != null)
            {
                phoneCamera.Dispose();
                phoneCamera.Initialized -= OnCameraInitialized;
                CameraButtons.ShutterKeyHalfPressed -= OnCameraButtonShutterKeyHalfPressed;
            }

            if (!scanSucceeded)
            {
                BarcodeScannerPlugin.OnScanFailed("Cancelled by user");
            }
        }

        void OnCameraInitialized(object sender, Microsoft.Devices.CameraOperationCompletedEventArgs e)
        {
            if (e.Succeeded)
            {
                this.Dispatcher.BeginInvoke(delegate()
                {
                    phoneCamera.FlashMode = FlashMode.Off;
                    previewBuffer = new WriteableBitmap((int)phoneCamera.PreviewResolution.Width, (int)phoneCamera.PreviewResolution.Height);

                    barcodeReader = new BarcodeReader();

                    // By default, BarcodeReader will scan every supported barcode type
                    // If we want to limit the type of barcodes our app can read, 
                    // we can do it by adding each format to this list object

                    //var supportedBarcodeFormats = new List<BarcodeFormat>();
                    //supportedBarcodeFormats.Add(BarcodeFormat.QR_CODE);
                    //supportedBarcodeFormats.Add(BarcodeFormat.DATA_MATRIX);
                    //_bcReader.PossibleFormats = supportedBarcodeFormats;

                    barcodeReader.Options.TryHarder = true;

                    barcodeReader.ResultFound += OnBarcodeResultFound;
                    scanTimer.Start();
                });
            }
            else
            {
                Dispatcher.BeginInvoke(() =>
                {
                    BarcodeScannerPlugin.OnScanFailed("Unable to initialize the camera");
                });
            }
        }

        private void OnBarcodeResultFound(Result obj)
        {
            if (BarcodeIsValid(obj.Text))
            {
                var barcodeScannerResult = new BarcodeScannerResult();
                barcodeScannerResult.format = obj.BarcodeFormat.ToString();
                barcodeScannerResult.text = obj.Text;
                scanSucceeded = true;

                BarcodeScannerPlugin.OnScanSucceeded(barcodeScannerResult);
                NavigationService.GoBack();
            }
        }

        private bool BarcodeIsValid(string barcode)
        {
            if (barcode.Equals(scannedCode))
            {
                return false;
            }

            return true;
        }

        private void ScanForBarcode()
        {
            //grab a camera snapshot
            phoneCamera.GetPreviewBufferArgb32(previewBuffer.Pixels);
            previewBuffer.Invalidate();

            //scan the captured snapshot for barcodes
            //if a barcode is found, the ResultFound event will fire
            barcodeReader.Decode(previewBuffer);
        }
    }
}