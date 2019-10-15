function scan(success, error, options) {
    var text_prompt = "Enter barcode value (empty value will fire the error handler):";
    if(options["browser_prompt"] !== null || options["browser_prompt"] !== "") {
         text_prompt = options["browser_prompt"];
    }
    var code = window.prompt(text_prompt);
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

require("cordova/exec/proxy").add("BarcodeScanner",module.exports);
