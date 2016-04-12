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

import android.app.Activity;
import android.content.Intent;
import android.util.Log;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;

/**
 * This calls out to the ZXing barcode reader and returns the result.
 *
 * @sa https://github.com/apache/cordova-android/blob/master/framework/src/org/apache/cordova/CordovaPlugin.java
 */
public class BarcodeScanner extends CordovaPlugin {

    private static final String SCAN = "scan";
    private static final String ENCODE = "encode";
    private static final String CANCELLED = "cancelled";
    private static final String FORMAT = "format";
    private static final String TEXT = "text";
    private static final String DATA = "data";
    private static final String TYPE = "type";
    private static final String ENCODE_DATA = "ENCODE_DATA";
    private static final String ENCODE_TYPE = "ENCODE_TYPE";
    private static final String TEXT_TYPE = "TEXT_TYPE";
    private static final String EMAIL_TYPE = "EMAIL_TYPE";
    private static final String PHONE_TYPE = "PHONE_TYPE";
    private static final String SMS_TYPE = "SMS_TYPE";

    private static final String LOG_TAG = "BarcodeScanner";

    private CallbackContext callbackContext;

    /**
     * Constructor.
     */
    public BarcodeScanner() {
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
            scan(args);
        } else {
            return false;
        }
        return true;
    }

    /**
     * Starts an intent to scan and decode a barcode.
     */
    public void scan(JSONArray args) {

        IntentIntegrator integrator = new IntentIntegrator(this);

        // add config as intent extras
        if(args.length() > 0) {

            JSONObject obj;
            JSONArray names;
            String key;
            Object value;

            for(int i=0; i<args.length(); i++) {

                try {
                    obj = args.getJSONObject(i);
                } catch(JSONException e) {
                    Log.i("CordovaLog", e.getLocalizedMessage());
                    continue;
                }

                names = obj.names();
                for(int j=0; j<names.length(); j++) {
                    try {
                        key = names.getString(j);
                        value = obj.get(key);

                        if(value instanceof Integer) {
                            integrator.addExtra(key, (Integer)value);
                        } else if(value instanceof String) {
                            integrator.addExtra(key, (String)value);
                        }

                    } catch(JSONException e) {
                        Log.i("CordovaLog", e.getLocalizedMessage());
                        continue;
                    }
                }
            }

        }

        integrator.initiateScan();
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
        IntentResult result = IntentIntegrator.parseActivityResult(requestCode, resultCode, intent);
        if(result == null)
            return;

        JSONObject obj = new JSONObject();

        if (resultCode == Activity.RESULT_CANCELED) {
            try {
                obj.put(TEXT, "");
                obj.put(FORMAT, "");
                obj.put(CANCELLED, true);
                this.callbackContext.success(obj);
            } catch (JSONException e) {
                Log.d(LOG_TAG, "This should never happen");
            }
        } else if(resultCode == Activity.RESULT_OK) {
            try {
                obj.put(TEXT, result.getContents());
                obj.put(FORMAT, result.getFormatName());
                obj.put(CANCELLED, false);
                this.callbackContext.success(obj);
            } catch (JSONException e) {
                Log.d(LOG_TAG, "This should never happen");
            }
        } else {
            this.callbackContext.error("Unexpected error");
        }
    }

    /**
     * Initiates a barcode encode.
     *
     * @param type Endoiding type.
     * @param data The data to encode in the bar code.
     */
    public void encode(String type, String data) {
        IntentIntegrator integrator = new IntentIntegrator(this);
        integrator.shareText(data, type);
    }


}
