var usePrompt = true;
var pwaScanner;

if (
    'mediaDevices' in navigator &&
    'getUserMedia' in navigator.mediaDevices
) {
    usePrompt = false;
}

function scan(success, error) {
    if (usePrompt) {
        _scanFake(success, error);

    } else {
        _scan(success, error);
    }
}

function _scan(success, error) {
    if (!pwaScanner) {
        pwaScanner = new PwaScanner();
    }

    pwaScanner.start()
        .then(function (result) {
            success({
                text: result,
                format: 'PwaScanner',
                cancelled: false
            });

        }).catch(function(e) {
            error('No barcode');
        });
}

function _scanFake(success, error) {
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
    scan: scan,
    encode: encode
};

require("cordova/exec/proxy").add("BarcodeScanner", module.exports);