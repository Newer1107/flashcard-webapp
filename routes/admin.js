const express = require('express');
const db = require('../db');
const router = express.Router();
const isAdmin = require('../middleware/admin');

// Admin dashboard
router.get('/dashboard', isAdmin, (req, res) => {
    const sql = 'SELECT id, username, email, created_at, is_admin FROM users';
    db.query(sql, (err, results) => {
        if (err) throw err;
        res.render('admin/dashboard', { users: results });
    });
});

// Toggle admin status
router.post('/toggle-admin/:id', isAdmin, (req, res) => {
    const userId = req.params.id;
    const sql = 'UPDATE users SET is_admin = NOT is_admin WHERE id = ?';
    db.query(sql, [userId], (err) => {
        if (err) throw err;
        res.redirect('/admin/dashboard');
    });
});

// Delete user
router.post('/delete-user/:id', isAdmin, (req, res) => {
    const userId = req.params.id;
    
    // First delete user's flashcards
    db.query('DELETE FROM flashcards WHERE user_id = ?', [userId], (err) => {
        if (err) throw err;
        
        // Then delete the user
        db.query('DELETE FROM users WHERE id = ?', [userId], (err) => {
            if (err) throw err;
            res.redirect('/admin/dashboard');
        });
    });
});

// Add this new route to view user's flashcards
router.get('/user/:id/flashcards', isAdmin, (req, res) => {
    const userId = req.params.id;
    
    // Get user info
    db.query('SELECT id, username FROM users WHERE id = ?', [userId], (err, userResults) => {
        if (err || userResults.length === 0) {
            return res.status(404).render('error', { message: 'User not found' });
        }

        // Get user's flashcards
        db.query('SELECT * FROM flashcards WHERE user_id = ?', [userId], (err, flashcardResults) => {
            if (err) throw err;
            
            res.render('admin/user-flashcards', {
                user: userResults[0],
                flashcards: flashcardResults
            });
        });
    });
});

module.exports = router;