const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000; // Use environment variable for port

// Security middleware should come first
app.disable('x-powered-by'); // Remove Express header for security

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // More robust path joining

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json()); // Add JSON parsing if your API might need it
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration with enhanced security
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true, // Changed from false
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}));
// Make user data available to all views
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    res.locals.isAdmin = req.session.user?.is_admin || false; // Add admin status
    next();
});

// Routes
const authRoutes = require('./routes/auth');
const flashcardRoutes = require('./routes/flashcards');
const quizRoutes = require('./routes/quiz');
const adminRoutes = require('./routes/admin');

app.use('/', authRoutes);
app.use('/flashcards', flashcardRoutes);
app.use('/quiz', quizRoutes);
app.use('/admin', adminRoutes);

// Default route
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/flashcards/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Error handling middleware (should be last)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { error: err });
});

// 404 handler
app.use((req, res) => {

        res.status(404).send('404 Not Found');
    
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});