(function (window) {
    const backendBaseUrl = 'http://localhost:8000';
    const apiBaseUrl = backendBaseUrl + '/api';

    window.LFC_APP_CONFIG = Object.freeze({
        backendBaseUrl: backendBaseUrl,
        apiBaseUrl: apiBaseUrl,
        buildApiUrl: function (path) {
            const normalizedPath = String(path || '').replace(/^\/+/, '');

            return normalizedPath ? apiBaseUrl + '/' + normalizedPath : apiBaseUrl;
        }
    });
})(window);
