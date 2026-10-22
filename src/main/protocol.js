function applyContentSecurityPolicy(session) {
    session.webRequest.onHeadersReceived((details, callback) => {
        const devUrl = process.env.DAYMARK_DEV_URL
        const contentSecurityPolicy = devUrl
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173 ws://localhost:5173; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:5173"
            : "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'"
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [contentSecurityPolicy]
            }
        })
    })
}

module.exports = {
    applyContentSecurityPolicy
}
