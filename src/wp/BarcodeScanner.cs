using BarcodeScanner;
using Microsoft.Phone.Controls;
using System;
using System.Windows;
using System.Windows.Navigation;
using WPCordovaClassLib.Cordova;
using WPCordovaClassLib.Cordova.Commands;
using WPCordovaClassLib.Cordova.JSON;

namespace Cordova.Extension.Commands
{
    public class BarcodeScanner : BaseCommand
    {
        private PhoneApplicationFrame currentRootVisual;

        public void scan(string options)
        {
            Deployment.Current.Dispatcher.BeginInvoke(() =>
            {
                currentRootVisual = Application.Current.RootVisual as PhoneApplicationFrame;
                currentRootVisual.Navigated += OnFrameNavigated;
                currentRootVisual.Navigate(new Uri("/Plugins/com.phonegap.plugins.barcodescanner/Scan.xaml", UriKind.Relative));
            });            
        }

        private void OnFrameNavigated(object sender, NavigationEventArgs e)
        {
            var scanPage = e.Content as Scan;
            if (scanPage != null)
            {
                scanPage.BarcodeScannerPlugin = this;
            }
        }

        public void OnScanFailed(string error)
        {
            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, error));
        }

        public void OnScanSucceeded(BarcodeScannerResult scanResult)
        {
            var resultString = JsonHelper.Serialize(scanResult);
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, resultString));
        }
    }
}
