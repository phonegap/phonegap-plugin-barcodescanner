/*
* Copyright 2013-2015 BlackBerry Limited.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
var barcodescanner,
	resultObjs = {},
	readCallback,
	_utils = require("../../lib/utils");

module.exports = {

	// methods to start and stop scanning
	scan: function (success, fail, args, env) {
		var result = new PluginResult(args, env);
		resultObjs[result.callbackId] = result;
		readCallback = result.callbackId;
		var views = qnx.webplatform.getWebViews();
		var handle = null;
		var group = null;
		var z = -1;
		for (var i = 0; i < views.length; i++) {
			if (views[i].visible && views[i].zOrder > z){
				z = views[i].zOrder;
				group = views[i].windowGroup;
				handle = views[i].jsScreenWindowHandle;
			}
		}
		if (handle !== null) {
			var values = { group: group, handle: handle };
			barcodescanner.getInstance().startRead(result.callbackId, values);
			result.noResult(true);
		} else {
			result.error("Failed to find window handle", false);
		}
	},

	encode: function (success, fail, args, env) {
		
	}
};


JNEXT.BarcodeScanner = function () {
	var self = this,
		hasInstance = false;

	self.getId = function () {
		return self.m_id;
	};

	self.init = function () {
		if (!JNEXT.require("libBarcodeScanner")) {
			return false;
		}

		self.m_id = JNEXT.createObject("libBarcodeScanner.BarcodeScannerJS");

		if (self.m_id === "") {
			return false;
		}

		JNEXT.registerEvents(self);
	};

	// ************************
	// Enter your methods here
	// ************************

	// Fired by the Event framework (used by asynchronous callbacks)

	self.onEvent = function (strData) {
		var arData = strData.split(" "),
			callbackId = arData[0],
			receivedEvent = arData[1],
			data = arData[2],
			result = resultObjs[callbackId],
			events = ["community.barcodescanner.codefound.native",
					  "community.barcodescanner.errorfound.native",
					  "community.barcodescanner.started.native",
					  "community.barcodescanner.ended.native"];
			
		// Restructures results when codefound has spaces		  
		if(arData.length > 3){
			var i;
			for(i=3; i<arData.length; i++) {
				data += " " + arData[i];
			}
		}
		
		if (receivedEvent == "community.barcodescanner.codefound.native") {
			if (result) {
				var parsed = JSON.parse(data);
				result.callbackOk(parsed, false);
			}
			this.stopRead(callbackId);

		}
		if (receivedEvent == "community.barcodescanner.started.native") {
			console.log("Scanning started successfully");
		}
		if (receivedEvent == "community.barcodescanner.errorfound.native") {
			if (result) {
				result.callbackError(data, false);
			}
		}

		if(receivedEvent == "community.barcodescanner.ended.native" || receivedEvent == "community.barcodescanner.errorfound.native") {
			delete resultObjs[readCallback];
			readCallback = null;
		}

	};

	// Thread methods
	self.startRead = function (callbackId, handle) {
		return JNEXT.invoke(self.m_id, "startRead " + callbackId + " " + JSON.stringify(handle));
	};
	self.stopRead = function (callbackId) {
		return JNEXT.invoke(self.m_id, "stopRead " + callbackId);
	};

	// ************************
	// End of methods to edit
	// ************************
	self.m_id = "";

	self.getInstance = function () {
		if (!hasInstance) {
			hasInstance = true;
			self.init();
		}
		return self;
	};

};

barcodescanner = new JNEXT.BarcodeScanner();