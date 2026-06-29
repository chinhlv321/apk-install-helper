const express = require('express');
const router = express.Router();
const ngrok = require('@ngrok/ngrok');
const { PORT, NGROK_AUTHTOKEN } = require('../config');

let currentListener = null;
let currentUrl = null;
let activeAuthToken = NGROK_AUTHTOKEN;
let tunnelError = null;

// Get tunnel status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    active: !!currentListener,
    url: currentUrl,
    error: tunnelError,
    hasToken: !!activeAuthToken
  });
});

// Set ngrok authtoken
router.post('/token', (req, res) => {
  const { authtoken } = req.body;
  if (!authtoken) {
    return res.status(400).json({ success: false, error: 'Authtoken is required' });
  }

  activeAuthToken = authtoken;
  res.json({ success: true, message: 'Authtoken saved dynamically' });
});

// Start tunnel
router.post('/start', async (req, res) => {
  if (currentListener) {
    return res.json({ success: true, url: currentUrl, message: 'Tunnel already running' });
  }

  const { authtoken } = req.body;
  const tokenToUse = authtoken || activeAuthToken;

  if (!tokenToUse) {
    return res.status(400).json({
      success: false,
      error: 'Ngrok Authtoken is required. Configure it in settings or provide it in the request.'
    });
  }

  // Update token
  activeAuthToken = tokenToUse;

  try {
    tunnelError = null;
    console.log(`Starting ngrok tunnel for port ${PORT}...`);
    
    // Connect to ngrok
    currentListener = await ngrok.forward({
      addr: PORT,
      authtoken: activeAuthToken
    });

    currentUrl = currentListener.url();
    console.log(`Ngrok tunnel started: ${currentUrl}`);
    
    res.json({ success: true, url: currentUrl });
  } catch (err) {
    console.error('Failed to start ngrok tunnel:', err);
    tunnelError = err.message;
    currentListener = null;
    currentUrl = null;
    res.status(500).json({ success: false, error: err.message });
  }
});

// Stop tunnel
router.post('/stop', async (req, res) => {
  if (!currentListener) {
    return res.json({ success: true, message: 'Tunnel was not running' });
  }

  try {
    console.log('Stopping ngrok tunnel...');
    await currentListener.close();
    currentListener = null;
    currentUrl = null;
    res.json({ success: true, message: 'Tunnel stopped successfully' });
  } catch (err) {
    console.error('Error stopping ngrok tunnel:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
