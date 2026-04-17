(function() {
    const XHR = XMLHttpRequest.prototype;
    const send = XHR.send;
    const open = XHR.open;

    XHR.open = function(method, url) {
        this._url = url;
        return open.apply(this, arguments);
    };

    XHR.send = function() {
        this.addEventListener('load', function() {
            if (this._url && this._url.includes('/game/json')) {
                try {
                    const data = JSON.parse(this.responseText);
                    window.dispatchEvent(new CustomEvent('FOE_INJECT_DATA', { detail: data }));
                } catch (e) {}
            }
        });
        return send.apply(this, arguments);
    };
})();