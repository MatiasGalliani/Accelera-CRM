import express from 'express';
import { sendPasswordResetEmail } from '../services/emailService.js';
import { generateResetCode, verifyResetCode, updatePassword } from '../services/passwordResetService.js';
import { validateEmail, validatePassword } from '../middleware/validation.js';

const router = express.Router();

// Request password reset
router.post('/request-reset', validateEmail, async (req, res) => {
    try {
        const { email } = req.body;
        
        // Generate and store reset code
        const resetCode = await generateResetCode(email);
        
        // Send password reset email
        await sendPasswordResetEmail(email, resetCode);

        res.json({ message: 'Reset code sent successfully' });
    } catch (error) {
        console.error('Error in request-reset:', error);
        res.status(500).json({ error: 'Error sending reset code' });
    }
});

// Verify reset code
router.post('/verify-reset-code', async (req, res) => {
    try {
        const { email, code } = req.body;
        
        const isValid = await verifyResetCode(email, code);
        
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid or expired code' });
        }

        res.json({ message: 'Code verified successfully' });
    } catch (error) {
        console.error('Error in verify-reset-code:', error);
        res.status(500).json({ error: 'Error verifying code' });
    }
});

// Reset password
router.post('/reset-password', validatePassword, async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        
        await updatePassword(email, newPassword);
        
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error in reset-password:', error);
        res.status(500).json({ error: 'Error updating password' });
    }
});

export default router; 