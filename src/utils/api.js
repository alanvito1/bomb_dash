// src/utils/api.js

import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

const backendUrl = 'http://localhost:3000'; // The address of your local backend server

const replacer = (key, value) => (typeof value === 'bigint' ? value.toString() : value);

/**
 * Handles the complete Sign-In with Ethereum (SIWE) flow.
 * @returns {Promise<boolean>} True if login was successful, false otherwise.
 */
export async function web3Login() {
    if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install it to continue.');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);

    // This single call will handle both prompting the user to connect (if not already connected)
    // and getting the signer object for the connected account. It's more robust.
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    // 1. Get nonce from the backend
    const nonceRes = await fetch(`${backendUrl}/api/auth/nonce`);
    const { nonce } = await nonceRes.json();
    if (!nonce) {
        throw new Error('Failed to retrieve nonce from server.');
    }

    // 2. Create and sign the SIWE message
    const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to Bomb Dash Web3',
        uri: window.location.origin,
        version: '1',
        chainId: 97, // BSC Testnet Chain ID
        nonce: nonce,
    });

    const signature = await signer.signMessage(message.prepareMessage());

    // 3. Verify signature with the backend
    const verifyRes = await fetch(`${backendUrl}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }, replacer),
    });

    if (!verifyRes.ok) {
        throw new Error('Signature verification failed.');
    }

    const { token } = await verifyRes.json();

    // 4. Store JWT token
    localStorage.setItem('jwt_token', token);

    console.log('Login successful!');
    return true;
}

/**
 * Fetches the current user's data from the backend using the stored JWT.
 * @returns {Promise<object|null>} The user's data or null if not authenticated.
 */
export async function getCurrentUser() {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        return null; // Not logged in
    }

    const res = await fetch(`${backendUrl}/api/auth/me`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!res.ok) {
        localStorage.removeItem('jwt_token'); // Token might be invalid
        return null;
    }

    return await res.json();
}

/**
 * Fetches the top player ranking data from the backend.
 * @returns {Promise<Array>} An array of player ranking objects.
 */
export async function getRanking() {
    const res = await fetch(`${backendUrl}/api/ranking`);
    if (!res.ok) {
        console.error("Failed to fetch ranking data.");
        return []; // Return an empty array on error
    }
    const data = await res.json();
    return data.ranking || []; // Return the ranking array or an empty one
}