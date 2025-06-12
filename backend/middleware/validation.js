const validateEmail = (req, res, next) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    
    next();
};

const validatePassword = (req, res, next) => {
    const { newPassword } = req.body;
    
    if (!newPassword) {
        return res.status(400).json({ error: 'Password is required' });
    }
    
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    next();
};

export {
    validateEmail,
    validatePassword
}; 