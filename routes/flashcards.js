const express = require('express');
const db = require('../db');
const path = require('path');
const router = express.Router();

// Middleware to protect routes
function isLoggedIn(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

// Dashboard - show flashcards
router.get('/dashboard', isLoggedIn, (req, res) => {
    const userId = req.session.user.id;
    const sql = 'SELECT * FROM flashcards WHERE user_id = ?';

    db.query(sql, [userId], (err, results) => {
        if (err) throw err;

        // Render the 'dashboard' view and pass the flashcards and username
        res.render('dashboard', {
            username: req.session.user.username,
            flashcards: results
        });
    });
});

// Add flashcard
router.post('/add', isLoggedIn, (req, res) => {
    const { question, answer } = req.body;
    const userId = req.session.user.id;
    const sql = 'INSERT INTO flashcards (user_id, question, answer) VALUES (?, ?, ?)';
    db.query(sql, [userId, question, answer], (err) => {
        if (err) throw err;
        res.redirect('/flashcards/dashboard');
    });
});

// Delete flashcard
router.post('/delete/:id', isLoggedIn, (req, res) => {
    const flashcardId = req.params.id;
    const userId = req.session.user.id;
    
    // Verify the flashcard belongs to the user before deleting
    const sql = 'DELETE FROM flashcards WHERE id = ? AND user_id = ?';
    
    db.query(sql, [flashcardId, userId], (err) => {
        if (err) throw err;
        res.redirect('/flashcards/dashboard');
    });
});

// Import flashcards from CSV
router.post('/import', isLoggedIn, (req, res) => {
    const userId = req.session.user.id;
    const csvText = req.body.csvText;
    
    // Parse CSV text (format: "question,answer" on each line)
    const lines = csvText.split('\n');
    const values = [];
    
    lines.forEach(line => {
        if (line.trim()) {
            const [question, answer] = line.split(',').map(item => item.trim());
            if (question && answer) {
                values.push([userId, question, answer]);
            }
        }
    });
    
    if (values.length === 0) {
        return res.redirect('/flashcards/dashboard');
    }
    
    const sql = 'INSERT INTO flashcards (user_id, question, answer) VALUES ?';
    db.query(sql, [values], (err) => {
        if (err) throw err;
        res.redirect('/flashcards/dashboard');
    });
});

module.exports = router;
