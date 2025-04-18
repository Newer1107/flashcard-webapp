const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../db');
const { sendVerificationEmail } = require('../utils/emailSender');
const router = express.Router();

// Email format validation function
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Signup Page
router.get('/signup', (req, res) => {
    res.render('signup', { error: null, success: null });
  });
  
  // Signup Handler
  router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
  
    if (!username || !email || !password) {
      return res.render('signup', { 
        error: '❌ All fields are required', 
        success: null 
      });
    }
  
    if (!isValidEmail(email)) {
      return res.render('signup', { 
        error: '❌ Invalid email format', 
        success: null 
      });
    }
  
    if (password.length < 8) {
      return res.render('signup', { 
        error: '❌ Password must be at least 8 characters', 
        success: null 
      });
    }
  
    try {
      const checkEmailSql = 'SELECT id FROM users WHERE LOWER(email) = LOWER(?)';
      db.query(checkEmailSql, [email], async (err, results) => {
        if (err) {
          console.error('Database error:', err);
          return res.render('signup', { 
            error: '❌ Server error. Please try again.', 
            success: null 
          });
        }
  
        if (results.length > 0) {
          return res.render('signup', { 
            error: '❌ Email already registered.', 
            success: null 
          });
        }
  
        const hash = await bcrypt.hash(password, 10);
        const token = crypto.randomBytes(32).toString('hex');
        
        const insertSql = `
          INSERT INTO users 
          (username, email, password_hash, verification_token, token_expires) 
          VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))
        `;
        
        db.query(insertSql, [username, email, hash, token], async (err) => {
          if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
              return res.render('signup', { 
                error: '❌ Email already registered.', 
                success: null 
              });
            }
            console.error('Registration error:', err);
            return res.render('signup', { 
              error: '❌ Registration failed. Please try again.', 
              success: null 
            });
          }
  
          try {
            await sendVerificationEmail(email, token);
            return res.render('signup', { 
              error: null, 
              success: `✅ Account created for ${email}. Please check your email to verify.` 
            });
          } catch (emailErr) {
            console.error('Email send failed:', emailErr);
            return res.render('signup', { 
              error: '✅ Account created! But verification email failed. Contact support.', 
              success: null 
            });
          }
        });
      });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.render('signup', { 
        error: '❌ Server error. Please try again later.', 
        success: null 
      });
    }
  });
// Email Verification
router.get('/verify-email', (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.render('verification-error', { 
      message: 'Missing verification token' 
    });
  }

  db.query(`
    UPDATE users 
    SET is_verified = TRUE, 
        verification_token = NULL,
        token_expires = NULL
    WHERE verification_token = ? 
    AND token_expires > NOW()
  `, [token], (err, result) => {
    if (err) {
      console.error('Verification error:', err);
      return res.render('verification-error', { 
        message: 'Database error during verification' 
      });
    }

    if (result.affectedRows === 0) {
      return res.render('verification-error', { 
        message: 'Invalid or expired verification link' 
      });
    }

    res.render('verification-success');
  });
});

// Login Page
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Login Handler
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('login', { 
      error: '❌ Email and password are required' 
    });
  }

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error('Login error:', err);
      return res.render('login', { 
        error: '❌ Server error. Please try again.' 
      });
    }

    if (results.length === 0) {
      return res.render('login', { 
        error: '❌ Invalid email or password' 
      });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      return res.render('login', { 
        error: '❌ Invalid email or password' 
      });
    }
    
    if (!user.is_verified) {
      return res.render('login', { 
        error: '❌ Please verify your email first. Check your inbox.' 
      });
    }

    req.session.user = { 
      id: user.id, 
      username: user.username,
      is_admin: user.is_admin 
    };
    res.redirect('/flashcards/dashboard');
  });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;