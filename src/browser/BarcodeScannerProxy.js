function startScan(deviceId, videoOutputElementId, success, error) {
    const library = require("@tjieco/library");
    const codeReader = library.BrowserBarcodeReader();
    console.log(codeReader);
    const devices = codeReader.getVideoInputDevices();

    codeReader.decodeFromInputVideoDevice(devices[deviceId], videoOutputElementId).then((res) => {
        console.log(res);
        let result = {
            text: res.getText(),
            format: res.getBarcodeFormat(),
            cancelled: false
        };
        success(result);
    }).catch((err) => {
        console.error(err);
        error("Barcode could not be decoded");
    });
    console.log('Started continous decode from camera with id' + deviceId)
/*    document.getElementById('resetButton').addEventListener('click', () => {
        document.getElementById('result').textContent = '';
    codeReader.reset();
    })
    .catch((err) => {
          error(err);
    })*/
}

function scan(success, error) {
    var code = window.prompt("Enter barcode value (empty value will fire the error handler):");
    if(code) {
        var result = {
            text:code,
            format:"Fake",
            cancelled:false
        };
        success(result);
    } else {
        error("No barcode");
    }
}

function encode(type, data, success, errorCallback) {
    success();
}

module.exports = {
    startScan: startScan,
    scan: scan,
    encode: encode
};

require("cordova/exec/proxy").add("BarcodeScanner",module.exports);
