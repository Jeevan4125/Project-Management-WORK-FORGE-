const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Store active peer connections (in production, use Redis)
const peerConnections = {};

// @route   POST api/video/offer
// @desc    Handle WebRTC offer
// @access  Private
router.post('/offer', auth, (req, res) => {
  const { callId, offer, from, to } = req.body;
  
  // Store or forward the offer
  if (!peerConnections[callId]) {
    peerConnections[callId] = {};
  }
  
  if (!peerConnections[callId][from]) {
    peerConnections[callId][from] = {};
  }
  
  peerConnections[callId][from][to] = { offer };
  
  res.json({ success: true, message: 'Offer received' });
});

// @route   POST api/video/answer
// @desc    Handle WebRTC answer
// @access  Private
router.post('/answer', auth, (req, res) => {
  const { callId, answer, from, to } = req.body;
  
  if (peerConnections[callId] && peerConnections[callId][to] && peerConnections[callId][to][from]) {
    peerConnections[callId][to][from].answer = answer;
  }
  
  res.json({ success: true, message: 'Answer received' });
});

// @route   POST api/video/ice-candidate
// @desc    Handle ICE candidates
// @access  Private
router.post('/ice-candidate', auth, (req, res) => {
  const { callId, candidate, from, to } = req.body;
  
  if (!peerConnections[callId]) {
    peerConnections[callId] = {};
  }
  
  if (!peerConnections[callId][to]) {
    peerConnections[callId][to] = {};
  }
  
  if (!peerConnections[callId][to][from]) {
    peerConnections[callId][to][from] = {};
  }
  
  if (!peerConnections[callId][to][from].candidates) {
    peerConnections[callId][to][from].candidates = [];
  }
  
  peerConnections[callId][to][from].candidates.push(candidate);
  
  res.json({ success: true, message: 'ICE candidate received' });
});

// @route   GET api/video/signaling/:callId/:from/:to
// @desc    Get signaling data
// @access  Private
router.get('/signaling/:callId/:from/:to', auth, (req, res) => {
  const { callId, from, to } = req.params;
  
  const data = peerConnections[callId]?.[from]?.[to] || {};
  
  res.json({
    success: true,
    data
  });
});

// @route   DELETE api/video/connection/:callId/:userId
// @desc    Clean up connection
// @access  Private
router.delete('/connection/:callId/:userId', auth, (req, res) => {
  const { callId, userId } = req.params;
  
  if (peerConnections[callId]) {
    delete peerConnections[callId][userId];
    if (Object.keys(peerConnections[callId]).length === 0) {
      delete peerConnections[callId];
    }
  }
  
  res.json({ success: true, message: 'Connection cleaned up' });
});

module.exports = router;