import User from "../models/User.js";
import crypto from "crypto";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";

export const requestPasswordReset = async (req, res) => {
  const { username } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetLink = `http://10.0.2.2:5050/api/auth/reset-password?token=${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset",
      html: `<p>Click this link to reset your password: <a href="${resetLink}">Reset Password</a></p>`,
    });

    res.json({ message: "Password reset email sent" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });
    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: "Password successfully updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const verifyResetToken = async (req, res) => {
  const { token } = req.query;

  console.log("verifyResetToken called with token:", token);

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      console.log("Token is invalid or expired");
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invalid Token</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 10px; max-width: 400px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #d32f2f; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Invalid or Expired Token</h1>
            <p>This password reset link has expired or is invalid.</p>
            <p>Please request a new password reset.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Token is valid — показваме форма за нова парола
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reset Password</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5; }
          .container { background: white; padding: 30px; border-radius: 10px; max-width: 400px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          input, button { padding: 10px; margin: 5px 0; width: 100%; }
          button { background: #4CAF50; color: white; border: none; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Reset Password</h1>
          <form method="POST" action="/api/auth/reset-password">
            <input type="hidden" name="token" value="${token}" />
            <input type="password" name="newPassword" placeholder="New Password" required />
            <button type="submit">Reset Password</button>
          </form>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Server Error</title>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1>❌ Server Error</h1>
        <p>Something went wrong. Please try again later.</p>
      </body>
      </html>
    `);
  }
};
