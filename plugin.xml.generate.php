<?php
	class PluginHelper {
		public $basePath = 'src/android/LibraryProject/';
		
		private function perror($msg)
		{
			file_put_contents('php://stderr', $msg, FILE_APPEND);
		}

		/**
		 * Get contents of an XML file.
		 *
		 * @param string $xmlFilePath The XML file path relative to $this->basePath.
		 * @param string $parent Parent element from which to get children.
		 * @param array $options
		 *	<li>ident - ident chanracters.
		 *	<li>ignorePattern - pattern that will be matched to XML.
		 * @return string
		 */
		public function getXml($xmlFilePath, $parent, $options=array())
		{
			if (!isset($options['indent']))
			{
				$options['indent'] = "";
			}
			
			$contents = "";
			$filePath = $this->basePath . $xmlFilePath;
			if (!file_exists($filePath))
			{
				$this->perror("File $filePath does not exist");
				return $contents;
			}
			
			$xml = file_get_contents($this->basePath . $xmlFilePath);
			$document = new SimpleXMLElement($xml);
			$els = $document->xpath($parent);
			if (!empty($els))
			{
				$rootNode = $els[0];
				foreach ($rootNode->children() as $child)
				{
					$childContent = $child->asXML();
					if (isset($options['ignorePattern']) && preg_match($options['ignorePattern'], $childContent))
					{
						$this->perror("\nignored $childContent");
						continue;
					}
					$contents .= "\n" . $options['indent'] . $childContent;
				}
				$contents = ltrim ($contents) . "\n";
				return $contents;
			}
			else
			{
				$this->perror("Path $parent not found in $xmlFilePath");
				return $contents;
			}
		}

		/**
		 * Generate source-file tags to copy all resources from given dir.
		 * 
		 * @param type $dir Dir path relative to $this->basePath.
		 * @param array $options
		 *	<li>ident - ident chanracters.
		 */
		public function sourceFiles($dir, $options=array())
		{
			//ob_end_clean();
			
			if (!isset($options['indent']))
			{
				$options['indent'] = "";
			}
			$path = $this->basePath . $dir;
			
			$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path));
			while($it->valid())
			{
				if (!$it->isDot())
				{
					$filename = strtr($it->key(), '\\', '/');
					if (isset($options['ignorePattern']) && preg_match($options['ignorePattern'], $filename))
					{
						$this->perror("\nignored $filename");
						$it->next();
						continue;
					}
					
					$targetDir = preg_replace('#.+LibraryProject/(.+?)/[^/]+$#', '$1',  $filename);
					echo "\n{$options['indent']}<source-file src=\"$filename\" target-dir=\"$targetDir\"/>";
				}
				$it->next();
			}
			
			echo "\n";
			//exit;
		}
	}

	// init
	$pluginHelper = new PluginHelper();

	ob_start();
	echo '<?xml version="1.0" encoding="UTF-8"?>';
?>
<plugin xmlns="http://www.phonegap.com/ns/plugins/1.0"
    xmlns:android="http://schemas.android.com/apk/res/android"
    id="com.phonegap.plugins.barcodescanner"
    version="0.5.3">

    <name>BarcodeScanner</name>
    
    <description>Scans Barcodes.</description>

    <engines>
        <engine name="cordova" version=">=2.0.0" />
    </engines>    

    <asset src="www/barcodescanner.js" target="barcodescanner.js" />

    <!-- ios -->
    <platform name="ios">
		<plugins-plist key="BarcodeScanner" string="CDVBarcodeScanner" />
		
        <!-- Cordova >= 2.3 -->
        <config-file target="config.xml" parent="plugins">
            <plugin name="BarcodeScanner" value="CDVBarcodeScanner"/>
        </config-file>

		<resource-file src="src/ios/scannerOverlay.xib" />

        <header-file src="src/ios/zxing-all-in-one.h" />

        <source-file src="src/ios/CDVBarcodeScanner.mm"  />
        <source-file src="src/ios/zxing-all-in-one.cpp" />

        <framework src="libiconv.dylib" />
        <framework src="AVFoundation.framework" />
        <framework src="AssetsLibrary.framework" />
        <framework src="CoreVideo.framework" />
    </platform>

    <!-- android -->
    <platform name="android">

        <source-file src="src/android/com/phonegap/plugins/barcodescanner/BarcodeScanner.java" target-dir="src/com/phonegap/plugins/barcodescanner" />
        <!--
        <source-file src="R.java" target-dir="src/com/google/zxing/client/android" />
        -->
		
        <config-file target="res/xml/plugins.xml" parent="/plugins">
            <plugin name="BarcodeScanner" value="com.phonegap.plugins.barcodescanner.BarcodeScanner"/>
        </config-file>

        <config-file target="res/xml/config.xml" parent="plugins">
            <plugin name="BarcodeScanner" value="com.phonegap.plugins.barcodescanner.BarcodeScanner"/>
        </config-file>

        <config-file target="AndroidManifest.xml" parent="/manifest/application">
			<activity
				android:name="com.google.zxing.client.android.CaptureActivity"
				android:screenOrientation="landscape"
				android:clearTaskOnLaunch="true"
				android:configChanges="orientation|keyboardHidden"
				android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
				android:windowSoftInputMode="stateAlwaysHidden"
				android:exported="false">
				<intent-filter>
					<action android:name="com.phonegap.plugins.barcodescanner.SCAN"/>
					<category android:name="android.intent.category.DEFAULT"/>
				</intent-filter>
			</activity>
			<activity android:name="com.google.zxing.client.android.encode.EncodeActivity" android:label="@string/share_name">
				<intent-filter>
					<action android:name="com.phonegap.plugins.barcodescanner.ENCODE"/>
					<category android:name="android.intent.category.DEFAULT"/>
				</intent-filter>
			</activity>
			<activity android:name="com.google.zxing.client.android.HelpActivity" android:label="@string/share_name">
				<intent-filter>
					<action android:name="android.intent.action.VIEW"/>
					<category android:name="android.intent.category.DEFAULT"/>
				</intent-filter>
			</activity>
        </config-file>

        <config-file target="AndroidManifest.xml" parent="/manifest">
			<uses-permission android:name="android.permission.CAMERA" />
			<uses-permission android:name="android.permission.FLASHLIGHT" />
			<!-- Not required to allow users to work around this -->
            <uses-feature android:name="android.hardware.camera" android:required="false" />
        </config-file>

        <source-file src="src/android/com.google.zxing.client.android.captureactivity.jar" target-dir="libs"/>

		<!--
			LibraryProject/res/*.*
			search: (src/android/LibraryProject/(.+?)/[^/]+)$
			replace: <source-file src="$1" target-dir="$2"/>
		-->
		<?
			$pluginHelper->sourceFiles("res", array('indent'=>"\t\t", 'ignorePattern' => '#values/strings.xml#'));
		?>

		<!-- plugman cannot merge - prepare manual merge -->
        <config-file target="res/values/strings.xml" parent="/resources">
			<?=$pluginHelper->getXml('res/values/strings.xml', "/resources", array('ignorePattern' => '/name="(app_name|menu_settings)"/', 'indent' => "\t\t\t"))?>
        </config-file>
    </platform>
</plugin>
<?php 
	$pluginText = ob_get_clean();
	file_put_contents("plugin.xml", $pluginText);
?>