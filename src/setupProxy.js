const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    app.use(
        '/craft',
        createProxyMiddleware({
            target: 'https://craft4.ddev.site',
            changeOrigin: true,
            secure: false,
            pathRewrite: {
                '^/craft': '',
            },
            logLevel: 'debug',
            onError(err, req, res) {
                console.error('Proxy error:', err);
            },
        })
    );
};
