const express = require('express');
const db = require('../db');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

// Function to shuffle the array
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]; // Swap elements
    }
}

// Route to start the quiz
router.get('/start', isLoggedIn, (req, res) => {
    const userId = req.session.user.id;

    db.query('SELECT * FROM flashcards WHERE user_id = ?', [userId], (err, cards) => {
        if (err) throw err;

        if (!cards || cards.length === 0) {
            return res.send('<h3>No flashcards to quiz. Add some first!</h3><a href="/flashcards/dashboard">Go Back</a>');
        }

        // Shuffle the flashcards to randomize the order
        shuffleArray(cards);

        // Store the shuffled cards in session to keep track of which questions have been asked
        req.session.flashcards = cards;

        // Serve the first flashcard
        const flashcard = cards[0];
        req.session.currentQuestionIndex = 0; // Start from the first question

        res.render('quiz', { flashcard });
    });
});

// Route to check the answer
// Route to check the answer
router.post('/answer', isLoggedIn, async (req, res) => {
    const { id, userAnswer } = req.body;

    // Get the list of flashcards from session
    const flashcards = req.session.flashcards;
    const currentQuestionIndex = req.session.currentQuestionIndex;

    // Check if flashcards exist and if the current index is valid
    if (!flashcards || currentQuestionIndex >= flashcards.length) {
        return res.redirect('/flashcards/dashboard'); // Redirect to dashboard if no more questions
    }

    const flashcard = flashcards[currentQuestionIndex];
    const correctAnswer = flashcard.answer;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            I'm building a quiz app.

            Question: ${flashcard.question}
            Correct Answer: ${correctAnswer}
            User's Answer: ${userAnswer}

            Please explain if the user's answer is correct or incorrect. If correct, praise the user. If incorrect, explain why.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Increment the question index
        req.session.currentQuestionIndex++;

        // Check if all questions are answered
        if (req.session.currentQuestionIndex >= flashcards.length) {
            res.send({ message: text, finished: true });
        } else {
            const nextFlashcard = flashcards[req.session.currentQuestionIndex];
            res.send({ message: text, flashcard: nextFlashcard, finished: false });
        }

    } catch (apiError) {
        console.error(apiError);
        res.send({ message: 'There was a problem checking the answer. Try again later.' });
    }
});

module.exports = router;
