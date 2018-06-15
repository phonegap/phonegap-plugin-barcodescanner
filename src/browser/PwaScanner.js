var PwaScanner = function () {
    var video;
    var scannerDiv;
    var canvas;
    var _resolve;
    var _reject;
    var canvasSize = {
        w: 1024,
        h: 1024
    }

    var _createUI = function () {
        scannerDiv = document.createElement('div');
        scannerDiv.classList.add('pwa-scanner');

        var aimDiv = document.createElement('div');
        aimDiv.classList.add('scanner-aim');
        scannerDiv.appendChild(aimDiv);

        var closeBtn = document.createElement('button');
        closeBtn.innerText = 'X';
        closeBtn.classList.add('scanner-close');
        closeBtn.onclick = function () {
            _resolve({
                text: null,
                format: null,
                cancelled: true
            })
        };
        scannerDiv.appendChild(closeBtn);

        video = document.createElement('video');
        video.classList.add('camera-feed');
        video.autoplay = true;
        aimDiv.appendChild(video);

        canvas = document.createElement('canvas');
        canvas.style.width = canvasSize.w + "px";
        canvas.style.height = canvasSize.h + "px";
        canvas.width = canvasSize.w;
        canvas.height = canvasSize.h;
        scannerDiv.appendChild(canvas);

        document.body.appendChild(scannerDiv);
    };

    var _close = function () {
        if (video.srcObject) {
            video.srcObject.getTracks()[0].stop();
        }
        document.body.removeChild(scannerDiv);
    };

    var _injectStyles = function () {
        if (window.pwaScannerStyles) {
            return;
        }
        window.pwaScannerStyles = true;
        var node = document.createElement('style');
        node.innerHTML = '' +
            '.pwa-scanner {' +
                'position: absolute;' +
                'width: 100%;' +
                'height: 100%;' +
                'background-color: black;' +
            '} ' +
            '.pwa-scanner button {' +
                'z-index: 10;' +
            '} ' +
            '.pwa-scanner canvas {' +
                'display: none;' +
            '} ' +
            '.pwa-scanner .scanner-aim {' +
                'position: absolute;' +
                'top: 25vh;' +
                'right: 12vw;' +
                'width: 76vw;' +
                'height: 76vw;' +
                'border: 1px dashed white;' +
                'text-align: center;' +
            '}' +
            '.pwa-scanner .scanner-aim video {' +
                'width: auto;' +
                'height: 100%;' +
            '}' +
            '.pwa-scanner .scanner-close {' +
                'position: absolute;' +
                'top: 2vw;' +
                'right: 2vw;' +
                'width: 10vw;' +
                'height: 10vw;' +
                'border-radius: 5vw' +
            '}';
        document.body.appendChild(node);
    };

    var _capture = function () {
        var ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        qrcode.width = canvas.width ;
        qrcode.height = canvas.height;
        qrcode.imagedata = ctx.getImageData(0, 0, qrcode.width, qrcode.height);

        let result = false;
        try {
            result = qrcode.process(ctx);
            _resolve(result);

        } catch (e) {
            console.log(e);
            setTimeout(_capture, 500);
        }
    };

    var _startStream = function () {
        navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                facingMode: 'environment',
                width: { ideal: 4080 },
                height: { ideal: 4080 }
            }
        }).then(function (stream) {
            video.srcObject = stream;
            setTimeout(_capture, 500);

        }).catch(function (err) {
            _reject(err.name + ": " + err.message);
        });
    };

    this.start = function () {
        _injectStyles();
        return new Promise(function (resolve, reject) {
            _resolve = function(result) {
                _close();
                resolve(result);
            };
            _reject = function (error) {
                _close();
                reject(error);

            };

            _createUI();
            _startStream();
        });
    };
};

module.exports = PwaScanner;