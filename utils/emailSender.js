const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

exports.sendVerificationEmail = async (email, token) => {
    const verificationLink = `${process.env.BASE_URL}/verify-email?token=${token}`;
    
    const mailOptions = {
        from: `Flashcard App <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify Your Email',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h1 style="color: #2563eb;">Welcome to Raunak's Flashcard App!</h1>
                <p>Click below to verify your email:</p>
                <a href="${verificationLink}" 
                   style="display: inline-block; padding: 10px 20px; 
                          background: #2563eb; color: white; 
                          text-decoration: none; border-radius: 5px;">
                    Verify Email
                </a>
                <p style="color: #6b7280; font-size: 0.9rem;">
                    Link expires in 24 hours. Ignore if you didn't request this.
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${email}`);
    } catch (error) {
        console.error('Email send error:', error);
        throw error;
    }
};