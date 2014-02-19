using System;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Threading;
using Microsoft.Devices;
using Microsoft.Phone.Controls;
using ZXing;
using CordovaBarcodeScanner = Cordova.Extension.Commands.BarcodeScanner;

namespace BarcodeScanner
{
	public partial class Scan : PhoneApplicationPage
	{
		private const int SizeWriteableBitmapPixel = 4;
		private const int CaptureMillisecondsInterval = 2000;

		private PhotoCamera phoneCamera;
		private IBarcodeReader barcodeReader;
		private DispatcherTimer scanTimer;
		private WriteableBitmap previewBuffer;
		private bool scanSucceeded;

		public Scan()
		{
			this.InitializeComponent();
		}

		public CordovaBarcodeScanner BarcodeScannerPlugin { get; set; }

		protected override void OnNavigatedTo(NavigationEventArgs e)
		{
			// Initialize the camera object
			this.phoneCamera = new PhotoCamera();
			this.phoneCamera.Initialized += this.OnCameraInitialized;

			//Display the camera feed in the UI
			this.viewfinderBrush.SetSource(this.phoneCamera);

			// This timer will be used to scan the camera buffer every 2000ms and scan for any barcodes
			this.scanTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(CaptureMillisecondsInterval) };
			this.scanTimer.Tick += this.OnTimerTick;

			base.OnNavigatedTo(e);
		}

		protected override void OnNavigatingFrom(NavigatingCancelEventArgs e)
		{
			if (this.scanTimer != null)
			{
				this.scanTimer.Stop();
				this.scanTimer.Tick -= this.OnTimerTick;
				this.scanTimer = null;
			}

			if (this.phoneCamera != null)
			{
				this.phoneCamera.CancelFocus();
				this.phoneCamera.Initialized -= this.OnCameraInitialized;
				this.phoneCamera.Dispose();
			}

			if (this.barcodeReader != null)
			{
				this.barcodeReader.ResultFound -= this.OnBarcodeResultFound;
				this.barcodeReader = null;
			}

			if (!this.scanSucceeded && e.NavigationMode == NavigationMode.Back)
			{
				this.BarcodeScannerPlugin.OnScanFailed("Cancelled by user");
			}
		}

		private void OnTimerTick(object sender, EventArgs e)
		{
			this.ScanForBarcode();
		}

		private void OnCameraInitialized(object sender, CameraOperationCompletedEventArgs e)
		{
			if (e.Succeeded)
			{
				this.Dispatcher.BeginInvoke(() =>
				{
					this.phoneCamera.FlashMode = FlashMode.Auto;
					this.phoneCamera.Focus();

					this.previewBuffer = new WriteableBitmap((int)this.phoneCamera.PreviewResolution.Width, (int)this.phoneCamera.PreviewResolution.Height);
					this.barcodeReader = new BarcodeReader();

					// By default, BarcodeReader will scan every supported barcode type
					// If we want to limit the type of barcodes our app can read, 
					// we can do it by adding each format to this list object

					//var supportedBarcodeFormats = new List<BarcodeFormat>();
					//supportedBarcodeFormats.Add(BarcodeFormat.QR_CODE);
					//supportedBarcodeFormats.Add(BarcodeFormat.DATA_MATRIX);
					//_bcReader.PossibleFormats = supportedBarcodeFormats;

					this.barcodeReader.Options.TryHarder = true;

					this.barcodeReader.ResultFound += this.OnBarcodeResultFound;
					this.scanTimer.Start();
				});
			}
			else
			{
				this.Dispatcher.BeginInvoke(() =>
				{
					this.BarcodeScannerPlugin.OnScanFailed("Unable to initialize the camera");
				});
			}
		}

		private void OnBarcodeResultFound(Result obj)
		{
			if (!string.IsNullOrEmpty(obj.Text))
			{
				var barcodeScannerResult = new BarcodeScannerResult
				{
					Format = obj.BarcodeFormat.ToString(),
					Text = obj.Text
				};

				this.scanSucceeded = true;

				this.BarcodeScannerPlugin.OnScanSucceeded(barcodeScannerResult);
				this.NavigationService.GoBack();
			}
		}

		private void ScanForBarcode()
		{
			//try to capture barcode
			this.phoneCamera.Focus();

			//grab a camera snapshot
			this.phoneCamera.GetPreviewBufferArgb32(this.previewBuffer.Pixels);
			this.previewBuffer.Invalidate();

			//look only image from focus area
			var croppedBuff = this.GetCameraFocusArea((int)this.leftBlurArea.ActualWidth, (int)this.upBlurArea.ActualHeight, (int)this.focusArea.ActualHeight, (int)this.focusArea.ActualWidth);
			croppedBuff.Invalidate();

			//scan the captured snapshot for barcodes
			//if a barcode is found, the ResultFound event will fire
			this.barcodeReader.Decode(croppedBuff);
		}

		private WriteableBitmap GetCameraFocusArea(int left, int top, int width, int height)
		{
			// Copy the pixels line by line using fast BlockCopy
			var cropped = new WriteableBitmap(width, height);
			for (var row = 0; row < height; row++)
			{
				var sourceOffset = ((top + row) * this.previewBuffer.PixelWidth + left) * SizeWriteableBitmapPixel;
				var croppedOffset = row * width * SizeWriteableBitmapPixel;
				Buffer.BlockCopy(this.previewBuffer.Pixels, sourceOffset, cropped.Pixels, croppedOffset, width * SizeWriteableBitmapPixel);
			}
			return cropped;
		}
	}
}