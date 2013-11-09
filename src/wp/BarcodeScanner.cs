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
        PhoneApplicationFrame currentRootVisual;
        public void scan(string options)
        {
            Deployment.Current.Dispatcher.BeginInvoke(() =>
            {
                currentRootVisual = Application.Current.RootVisual as PhoneApplicationFrame;
                currentRootVisual.Navigated += frame_Navigated;
                currentRootVisual.Navigate(new Uri("/Plugins/com.phonegap.plugins.barcodescanner/Scan.xaml", UriKind.Relative));
            });            
        }

        void frame_Navigated(object sender, NavigationEventArgs e)
        {
            var scanPage = e.Content as Scan;
            if (scanPage != null)
            {
                scanPage.BarcodePlugin = this;
            }
        }

        internal void ResultReceived(BarcodeScannerResult scanResult)
        {
            var resultString = JsonHelper.Serialize(scanResult);
            
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, resultString));
        }

        internal void ScanFailed(string error)
        {
            DispatchCommandResult(new PluginResult(PluginResult.Status.ERROR, error));
        }
    }
}
