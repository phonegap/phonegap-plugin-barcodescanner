using System;
using System.Windows;
using System.Windows.Navigation;
using BarcodeScanner;
using Microsoft.Phone.Controls;
using WPCordovaClassLib.Cordova;
using WPCordovaClassLib.Cordova.Commands;
using WPCordovaClassLib.Cordova.JSON;

namespace Cordova.Extension.Commands
{
	public class BarcodeScanner : BaseCommand
	{
		private PhoneApplicationFrame currentRootVisual;
		private PhoneApplicationFrame CurrentRootVisual
		{
			get
			{
				if (this.currentRootVisual == null)
				{
					this.currentRootVisual = (PhoneApplicationFrame)Application.Current.RootVisual;
					this.currentRootVisual.Navigated += this.OnFrameNavigated;
				}
				return this.currentRootVisual;
			}
		}

		public void scan(string options)
		{
			Deployment.Current.Dispatcher.BeginInvoke(() =>
			{
				this.CurrentRootVisual.Navigate(new Uri("/Plugins/com.phonegap.plugins.barcodescanner/Scan.xaml", UriKind.Relative));
			});
		}

		public void OnScanFailed(string error)
		{
			this.DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, error));
		}

		public void OnScanSucceeded(BarcodeScannerResult scanResult)
		{
			var resultString = JsonHelper.Serialize(scanResult);
			this.DispatchCommandResult(new PluginResult(PluginResult.Status.OK, resultString));
		}

		private void OnFrameNavigated(object sender, NavigationEventArgs e)
		{
			var scanPage = e.Content as Scan;
			if (scanPage != null)
			{
				scanPage.BarcodeScannerPlugin = this;
			}
		}
	}
}