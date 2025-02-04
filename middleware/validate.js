/**
 * Input validation middleware
 */

// Password requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

// Username requirements
const USERNAME_REGEX = /^[a-zA-Z0-9_\-]{3,20}$/;

const validateSignUp = (req, res, next) => {
    const { username, password, confirmPassword } = req.body;
    const errors = [];

    // Validate username
    if (!username || !USERNAME_REGEX.test(username)) {
        errors.push('Username must be 3-20 characters and can only contain letters, numbers, underscores, and hyphens');
    }

    // Validate password
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
        errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
    }
    if (!PASSWORD_REGEX.test(password)) {
        errors.push('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
        errors.push('Passwords do not match');
    }

    if (errors.length > 0) {
        return res.render('auth/sign-up', {
            title: 'Sign Up',
            error: errors.join('. '),
            username: username // Preserve the username input
        });
    }

    next();
};

const validateSignIn = (req, res, next) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.render('auth/sign-in', {
            title: 'Sign In',
            error: 'Username and password are required'
        });
    }

    next();
};

module.exports = {
    validateSignUp,
    validateSignIn
};
