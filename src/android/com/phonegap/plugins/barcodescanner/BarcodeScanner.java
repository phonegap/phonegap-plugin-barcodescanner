/**
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) Matt Kane 2010
 * Copyright (c) 2011, IBM Corporation
 * Copyright (c) 2013, Maciej Nux Jaros
 */
package com.phonegap.plugins.barcodescanner;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.content.pm.PackageManager;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;
import org.apache.cordova.PermissionHelper;

import com.google.zxing.MultiFormatReader;
import com.google.zxing.RGBLuminanceSource;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.Result;
import com.google.zxing.NotFoundException;
import com.google.zxing.common.HybridBinarizer;

import java.io.InputStream;
import java.io.ByteArrayInputStream;
import java.lang.String;

import com.google.zxing.client.android.CaptureActivity;
import com.google.zxing.client.android.encode.EncodeActivity;
import com.google.zxing.client.android.Intents;

/**
 * This calls out to the ZXing barcode reader and returns the result.
 *
 * @sa https://github.com/apache/cordova-android/blob/master/framework/src/org/apache/cordova/CordovaPlugin.java
 */
public class BarcodeScanner extends CordovaPlugin {
    public static final int REQUEST_CODE = 0x0ba7c;


    private static final char[] B64_ENCODE_ARRAY = new char[64];    // translation array for encoding
    private static final int[] B64_DECODE_ARRAY = new int[256];     // translation array for decoding
    private static final int B64_IGNORE = -1;                       // flag for values to ignore when decoding
    private static final int B64_PAD = -2;                          // flag value for padding value when decoding

    private static final String SCAN = "scan";
    private static final String ENCODE = "encode";
    private static final String DECODE = "decode";
    private static final String CANCELLED = "cancelled";
    private static final String FORMAT = "format";
    private static final String TEXT = "text";
    private static final String DATA = "data";
    private static final String TYPE = "type";
    private static final String PREFER_FRONTCAMERA = "preferFrontCamera";
    private static final String ORIENTATION = "orientation";
    private static final String SHOW_FLIP_CAMERA_BUTTON = "showFlipCameraButton";
    private static final String RESULTDISPLAY_DURATION = "resultDisplayDuration";
    private static final String SHOW_TORCH_BUTTON = "showTorchButton";
    private static final String TORCH_ON = "torchOn";
    private static final String SAVE_HISTORY = "saveHistory";
    private static final String DISABLE_BEEP = "disableSuccessBeep";
    private static final String FORMATS = "formats";
    private static final String PROMPT = "prompt";
    private static final String TEXT_TYPE = "TEXT_TYPE";
    private static final String EMAIL_TYPE = "EMAIL_TYPE";
    private static final String PHONE_TYPE = "PHONE_TYPE";
    private static final String SMS_TYPE = "SMS_TYPE";

    private static final String LOG_TAG = "BarcodeScanner";

    private String [] permissions = { Manifest.permission.CAMERA };

    private JSONArray requestArgs;
    private CallbackContext callbackContext;

    /**
     * Constructor.
     */
    public BarcodeScanner() {
        for(int xa=0; xa<=25; xa++) { B64_ENCODE_ARRAY[xa] = (char)('A'+xa); }          //  0..25 -> 'A'..'Z'
        for(int xa=0; xa<=25; xa++) { B64_ENCODE_ARRAY[xa+26] = (char)('a'+xa); }       // 26..51 -> 'a'..'z'
        for(int xa=0; xa<= 9; xa++) { B64_ENCODE_ARRAY[xa+52] = (char)('0'+xa); }       // 52..61 -> '0'..'9'
        B64_ENCODE_ARRAY[62]='+';
        B64_ENCODE_ARRAY[63]='/';

        for(int xa=0; xa<256; xa++) { B64_DECODE_ARRAY[xa] = B64_IGNORE; }              // set all chars to IGNORE, first
        for(int xa=0; xa< 64; xa++) { B64_DECODE_ARRAY[B64_ENCODE_ARRAY[xa]] = xa; }    // set the Base 64 chars to their integer byte values
        B64_DECODE_ARRAY['=']=B64_PAD;
    }

    /**
     * Executes the request.
     *
     * This method is called from the WebView thread. To do a non-trivial amount of work, use:
     *     cordova.getThreadPool().execute(runnable);
     *
     * To run on the UI thread, use:
     *     cordova.getActivity().runOnUiThread(runnable);
     *
     * @param action          The action to execute.
     * @param args            The exec() arguments.
     * @param callbackContext The callback context used when calling back into JavaScript.
     * @return                Whether the action was valid.
     *
     * @sa https://github.com/apache/cordova-android/blob/master/framework/src/org/apache/cordova/CordovaPlugin.java
     */
    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
        this.callbackContext = callbackContext;
        this.requestArgs = args;

        if (action.equals(ENCODE)) {
            JSONObject obj = args.optJSONObject(0);
            if (obj != null) {
                String type = obj.optString(TYPE);
                String data = obj.optString(DATA);

                // If the type is null then force the type to text
                if (type == null) {
                    type = TEXT_TYPE;
                }

                if (data == null) {
                    callbackContext.error("User did not specify data to encode");
                    return true;
                }

                encode(type, data);
            } else {
                callbackContext.error("User did not specify data to encode");
                return true;
            }
        } else if (action.equals(SCAN)) {

            //android permission auto add
            if(!hasPermisssion()) {
              requestPermissions(0);
            } else {
              scan(args);
            }
        } else if (action.equals(DECODE)) {
            decode(args);
        } else {
            return false;
        }
        return true;
    }

    /**
     * Starts an intent to scan and decode a barcode.
     */
    public void scan(final JSONArray args) {

        final CordovaPlugin that = this;

        cordova.getThreadPool().execute(new Runnable() {
            public void run() {

                Intent intentScan = new Intent(that.cordova.getActivity().getBaseContext(), CaptureActivity.class);
                intentScan.setAction(Intents.Scan.ACTION);
                intentScan.addCategory(Intent.CATEGORY_DEFAULT);

                // add config as intent extras
                if (args.length() > 0) {

                    JSONObject obj;
                    JSONArray names;
                    String key;
                    Object value;

                    for (int i = 0; i < args.length(); i++) {

                        try {
                            obj = args.getJSONObject(i);
                        } catch (JSONException e) {
                            Log.i("CordovaLog", e.getLocalizedMessage());
                            continue;
                        }

                        names = obj.names();
                        for (int j = 0; j < names.length(); j++) {
                            try {
                                key = names.getString(j);
                                value = obj.get(key);

                                if (value instanceof Integer) {
                                    intentScan.putExtra(key, (Integer) value);
                                } else if (value instanceof String) {
                                    intentScan.putExtra(key, (String) value);
                                }

                            } catch (JSONException e) {
                                Log.i("CordovaLog", e.getLocalizedMessage());
                            }
                        }

                        intentScan.putExtra(Intents.Scan.CAMERA_ID, obj.optBoolean(PREFER_FRONTCAMERA, false) ? 1 : 0);
                        intentScan.putExtra(Intents.Scan.SHOW_FLIP_CAMERA_BUTTON, obj.optBoolean(SHOW_FLIP_CAMERA_BUTTON, false));
                        intentScan.putExtra(Intents.Scan.SHOW_TORCH_BUTTON, obj.optBoolean(SHOW_TORCH_BUTTON, false));
                        intentScan.putExtra(Intents.Scan.TORCH_ON, obj.optBoolean(TORCH_ON, false));
                        intentScan.putExtra(Intents.Scan.SAVE_HISTORY, obj.optBoolean(SAVE_HISTORY, false));
                        boolean beep = obj.optBoolean(DISABLE_BEEP, false);
                        intentScan.putExtra(Intents.Scan.BEEP_ON_SCAN, !beep);
                        if (obj.has(RESULTDISPLAY_DURATION)) {
                            intentScan.putExtra(Intents.Scan.RESULT_DISPLAY_DURATION_MS, "" + obj.optLong(RESULTDISPLAY_DURATION));
                        }
                        if (obj.has(FORMATS)) {
                            intentScan.putExtra(Intents.Scan.FORMATS, obj.optString(FORMATS));
                        }
                        if (obj.has(PROMPT)) {
                            intentScan.putExtra(Intents.Scan.PROMPT_MESSAGE, obj.optString(PROMPT));
                        }
                        if (obj.has(ORIENTATION)) {
                            intentScan.putExtra(Intents.Scan.ORIENTATION_LOCK, obj.optString(ORIENTATION));
                        }
                    }

                }

                // avoid calling other phonegap apps
                intentScan.setPackage(that.cordova.getActivity().getApplicationContext().getPackageName());

                that.cordova.startActivityForResult(that, intentScan, REQUEST_CODE);
            }
        });
    }

    /**
     * Called when the barcode scanner intent completes.
     *
     * @param requestCode The request code originally supplied to startActivityForResult(),
     *                       allowing you to identify who this result came from.
     * @param resultCode  The integer result code returned by the child activity through its setResult().
     * @param intent      An Intent, which can return result data to the caller (various data can be attached to Intent "extras").
     */
    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent intent) {
        if (requestCode == REQUEST_CODE && this.callbackContext != null) {
            if (resultCode == Activity.RESULT_OK) {
                JSONObject obj = new JSONObject();
                try {
                    obj.put(TEXT, intent.getStringExtra("SCAN_RESULT"));
                    obj.put(FORMAT, intent.getStringExtra("SCAN_RESULT_FORMAT"));
                    obj.put(CANCELLED, false);
                } catch (JSONException e) {
                    Log.d(LOG_TAG, "This should never happen");
                }
                //this.success(new PluginResult(PluginResult.Status.OK, obj), this.callback);
                this.callbackContext.success(obj);
            } else if (resultCode == Activity.RESULT_CANCELED) {
                JSONObject obj = new JSONObject();
                try {
                    obj.put(TEXT, "");
                    obj.put(FORMAT, "");
                    obj.put(CANCELLED, true);
                } catch (JSONException e) {
                    Log.d(LOG_TAG, "This should never happen");
                }
                //this.success(new PluginResult(PluginResult.Status.OK, obj), this.callback);
                this.callbackContext.success(obj);
            } else {
                //this.error(new PluginResult(PluginResult.Status.ERROR), this.callback);
                this.callbackContext.error("Unexpected error");
            }
        }
    }

    /**
     * Initiates a barcode decode.
     */
    public void decode(final JSONArray args) {
        final BarcodeScanner that = this;

        cordova.getThreadPool().execute(new Runnable() {
            public void run() {
                if (args.length() > 0) 
                {
                    JSONObject obj = args.optJSONObject(0);
                    String b64 = obj.optString("base64");
                    
                    if (b64 == "")
                    {
                        that.callbackContext.error("No data to decode!");
                        return;
                    }
                
                    try
                    {
                        byte[] bytes = DecodeBase64(b64);
                        InputStream inputStream = new ByteArrayInputStream(bytes);

                        Bitmap bitmap = BitmapFactory.decodeStream(inputStream);

                        if (bitmap == null)
                        {
                            that.callbackContext.error("Could not create a Bitmap to decode!");
                        }
                        else {
                            int width = bitmap.getWidth(), height = bitmap.getHeight();
                            int[] pixels = new int[width * height];

                            bitmap.getPixels(pixels, 0, width, 0, 0, width, height);
                            bitmap.recycle();
                            bitmap = null;

                            RGBLuminanceSource source = new RGBLuminanceSource(width, height, pixels);
                            BinaryBitmap bBitmap = new BinaryBitmap(new HybridBinarizer(source));
                            MultiFormatReader reader = new MultiFormatReader();

                            try
                            {
                                Result result = reader.decode(bBitmap);

                                JSONObject resultObject = new JSONObject();
                                try {
                                    resultObject.put("text", result.getText());
                                    resultObject.put("format", result.getBarcodeFormat());
                                    resultObject.put("cancelled", false);
                                } catch (JSONException e) {
                                    Log.d(LOG_TAG, "This should never happen");
                                }

                                that.callbackContext.success(resultObject);
                            }
                            catch (NotFoundException e)
                            {
                                that.callbackContext.error(""); // Not a real error
                            }
                            catch (Exception ex)
                            {
                                that.callbackContext.error("Decode exception: " + ex);
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        that.callbackContext.error("Unknown decode exception: " + ex);
                    }
                }
                else
                    that.callbackContext.error("No args given!");
            }
        });
    }

    /**
     * Initiates a barcode encode.
     *
     * @param type Endoiding type.
     * @param data The data to encode in the bar code.
     */
    public void encode(String type, String data) {
        Intent intentEncode = new Intent(this.cordova.getActivity().getBaseContext(), EncodeActivity.class);
        intentEncode.setAction(Intents.Encode.ACTION);
        intentEncode.putExtra(Intents.Encode.TYPE, type);
        intentEncode.putExtra(Intents.Encode.DATA, data);
        // avoid calling other phonegap apps
        intentEncode.setPackage(this.cordova.getActivity().getApplicationContext().getPackageName());

        this.cordova.getActivity().startActivity(intentEncode);
    }

    /**
     * check application's permissions
     */
   public boolean hasPermisssion() {
       for(String p : permissions)
       {
           if(!PermissionHelper.hasPermission(this, p))
           {
               return false;
           }
       }
       return true;
   }

    /**
     * We override this so that we can access the permissions variable, which no longer exists in
     * the parent class, since we can't initialize it reliably in the constructor!
     *
     * @param requestCode The code to get request action
     */
   public void requestPermissions(int requestCode)
   {
       PermissionHelper.requestPermissions(this, requestCode, permissions);
   }

   /**
   * processes the result of permission request
   *
   * @param requestCode The code to get request action
   * @param permissions The collection of permissions
   * @param grantResults The result of grant
   */
  public void onRequestPermissionResult(int requestCode, String[] permissions,
                                         int[] grantResults) throws JSONException
   {
       PluginResult result;
       for (int r : grantResults) {
           if (r == PackageManager.PERMISSION_DENIED) {
               Log.d(LOG_TAG, "Permission Denied!");
               result = new PluginResult(PluginResult.Status.ILLEGAL_ACCESS_EXCEPTION);
               this.callbackContext.sendPluginResult(result);
               return;
           }
       }

       switch(requestCode)
       {
           case 0:
               scan(this.requestArgs);
               break;
       }
   }

    /**
     * This plugin launches an external Activity when the camera is opened, so we
     * need to implement the save/restore API in case the Activity gets killed
     * by the OS while it's in the background.
     */
    public void onRestoreStateForActivityResult(Bundle state, CallbackContext callbackContext) {
        this.callbackContext = callbackContext;
    }


    private byte[] DecodeBase64(String b64) {
        int str = 0, len = b64.length();
        
        byte[] ba;  // target byte array
        int dc;     // decode cycle (within sequence of 4 input chars).
        int rv;     // reconstituted value
        int ol;     // output length
        int pc;     // padding count

        ba = new byte[(len/4)*3]; // create array to largest possible size.
        dc = 0;
        rv = 0;
        ol = 0;
        pc = 0;

        for(int xa=0; xa<len; xa++) {
            int ch=b64.charAt(xa+str);
            int value=(ch<=255 ? B64_DECODE_ARRAY[ch] : B64_IGNORE);
            if(value!=B64_IGNORE) {
                if(value==B64_PAD) {
                    value=0;
                    pc++;
                    }
                switch(dc) {
                    case 0: {
                        rv=value;
                        dc=1;
                        } break;

                    case 1: {
                        rv<<=6;
                        rv|=value;
                        dc=2;
                        } break;

                    case 2: {
                        rv<<=6;
                        rv|=value;
                        dc=3;
                        } break;

                    case 3: {
                        rv<<=6;
                        rv|=value;

                        // Completed a cycle of 4 chars, so recombine the four 6-bit values in big-endian order
                        ba[ol+2]=(byte)rv;  rv>>>=8;
                        ba[ol+1]=(byte)rv;  rv>>>=8;
                        ba[ol]=(byte)rv;    ol+=3;
                        dc=0;
                        } break;
                    }
                }
            }

        if(dc!=0) 
            throw new ArrayIndexOutOfBoundsException("Base64 data given as input was not an even multiple of 4 characters (should be padded with '=' characters).");

        ol-=pc;

        if(ba.length!=ol) {
            byte[] b2=new byte[ol];
            System.arraycopy(ba, 0, b2, 0, ol);
            ba=b2;
            }

        return ba;
    }
}
