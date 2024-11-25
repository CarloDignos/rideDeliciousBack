// playwright.config.js
module.exports = {
    use: {
        baseURL: 'http://localhost:6001', // Base URL for your server
        timeout: 30000, // 30 seconds timeout for each test
        ignoreHTTPSErrors: true
    }
};
