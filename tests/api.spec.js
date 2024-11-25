const { test, expect } = require('@playwright/test');

// Base URL for your API
const BASE_URL = 'http://localhost:6001/api/v1';

// Static user data
const staticUserData = {
    username: 'user_static1234',
    email: 'carlobaluyotdignos1997.com',
    password: 'Test@1234',
    userType: 'Customer',
    securityQuestions: [
        { question: 'What is your pet\'s name?', answerHash: 'Fluffy' },
        { question: 'What is your mother\'s maiden name?', answerHash: 'Smith' }
    ]
};

test.describe('API Endpoints', () => {

    let authToken;
    let userId;

    // test('Register a new user', async ({ request }) => {
    //     const response = await request.post(`${BASE_URL}/register`, {
    //         data: staticUserData
    //     });

    //     expect(response.status()).toBe(201);
    //     const responseBody = await response.json();
    //     expect(responseBody.message).toBe('User registered successfully');
    //     userId = responseBody.user._id;
    // });

    // test('Login with valid credentials', async ({ request }) => {
    //     const loginData = {
    //         email: staticUserData.email,
    //         password: staticUserData.password
    //     };

    //     const response = await request.post(`${BASE_URL}/login`, {
    //         data: loginData
    //     });

    //     expect(response.status()).toBe(200);
    //     const responseBody = await response.json();
    //     authToken = responseBody.token;
    //     expect(responseBody.message).toBe('Login successful');
    // });

    // test('Update user status', async ({ request }) => {
    //     const response = await request.put(`${BASE_URL}/status`, {
    //         headers: {
    //             Authorization: `Bearer ${authToken}`
    //         },
    //         data: {
    //             userId,
    //             status: 'Online'
    //         }
    //     });

    //     expect(response.status()).toBe(200);
    //     const responseBody = await response.json();
    //     expect(responseBody.message).toBe('Status updated successfully');
    //     expect(responseBody.user.status).toBe('Online');
    // });

    test('Request password reset', async ({ request }) => {
        const response = await request.post(`${BASE_URL}/request-password-reset`, {
            data: { email: staticUserData.email }
        });

        expect(response.status()).toBe(200);
        const responseBody = await response.json();
        expect(responseBody.message).toBe('OTP sent successfully');
    });

    // test('Logout the user', async ({ request }) => {
    //     const response = await request.post(`${BASE_URL}/logout`, {
    //         headers: {
    //             Authorization: `Bearer ${authToken}`
    //         }
    //     });

    //     expect(response.status()).toBe(200);
    //     const responseBody = await response.json();
    //     expect(responseBody.message).toBe('Logout successful');
    // });

    // test('Recover account using security questions', async ({ request }) => {
    //     const securityAnswers = ['Fluffy', 'Smith'];
    //     const response = await request.post(`${BASE_URL}/recover-account-security-questions`, {
    //         data: {
    //             username: staticUserData.username,
    //             securityAnswers
    //         }
    //     });

    //     expect(response.status()).toBe(200);
    //     const responseBody = await response.json();
    //     expect(responseBody.message).toBe('Account recovery successful');
    // });
});
