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

var _self = {},
    _ID = "BarcodeScanner",
    exec = cordova.require("cordova/exec");

var reading, timeout = null;
var codefoundCallback, errorfoundCallback;
var sleepPrevented = false;
var gotCode = false;

var startRead = function startRead (succ, fail) {
	if (reading) return "Stop Scanning before scanning again";

	blackberry.app.lockOrientation("portrait-primary");

	var success = function (data, response) {
		var arData = data.split(" "),
			receivedEvent = arData[0]

		if(arData.length > 2){
			var i;
			for(i=2; i<arData.length; i++)
				arData[1] += " " + arData[i];
		}

		if(receivedEvent == "community.barcodescanner.started.native") {
			reading = true;
		}
		else if(receivedEvent == "community.barcodescanner.codefound.native") {
			var codeFoundData = JSON.parse(arData[1]);
			console.log(codeFoundData);
			succ(codeFoundData);
		}
		else if(receivedEvent == "community.barcodescanner.errorfound.native") {
			var errorData = JSON.parse(arData[1]);
			fail(errorData);
		}
	},
	failure = function (data, response) {
		fail(data);
	};

	// Turn on prevent sleep, if it's in the app
	if (typeof community !== "undefined" && typeof community.preventsleep !== "undefined") {
		if (!community.preventsleep.isSleepPrevented) {
			community.preventsleep.setPreventSleep(true);
			sleepPrevented = true;
		}
	}
	exec(success, failure, _ID, "startRead", null, false);
};

var stopRead = function stopRead (succ, fail) {
	reading = false;
	blackberry.app.unlockOrientation();

	var success = function (data, response) {
		var arData = data.split(" "),
			receivedEvent = arData[0]

		if(receivedEvent == "community.barcodescanner.ended.native") {
			var successData = JSON.parse(arData[1]);
			succ(successData);
		}
	},
	failure = function (data, response) {
		fail(data)
	};
	// Return sleep setting to original if changed.
	if (typeof community !== "undefined" && typeof community.preventsleep !== "undefined") {
		if (sleepPrevented === true) {
			community.preventsleep.setPreventSleep(false);
			sleepPrevented = false;
		}
	}
	exec(success, failure, _ID, "stopRead", null, false)
};

	_self.scan = function (succ, fail) {
		gotCode = false;

		var success = function(data) {
			if (gotCode == false) {
				gotCode = true;
				succ(data);
				stopRead(
					function(result) {
                        			// console.log("stopRead success!");
                    			},
                    			function(err) {
                        			console.log("stopRead Error : " + err.error + " description : "+ err.description);
                    			}
                		);
			}
		};

		var failure = function (data) {
			fail(data);
			stopRead(
                		function(result) { 
                    			// console.log("stopRead success!");
               	 		},
                		function(err) {
                    			console.log("stopReadError : " + err.error + " description : " + err.description);
                		}
            		);
		};

		startRead(success, failure);
	};

module.exports = _self;
