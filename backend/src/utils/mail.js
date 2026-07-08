import Mailgen from "mailgen";
import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Task Manager",
      link: "http://taskmanager.com",
    },
  });

  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);
  const emailHTML = mailGenerator.generate(options.mailgenContent);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_SMTP_USER,
      pass: process.env.GMAIL_SMTP_PASS,
    },
  });

  const email = {
    from: process.env.GMAIL_SMTP_USER,
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHTML,
  };

  try {
    await transporter.sendMail(email);
  } catch (error) {
    console.error(
      "Email service failed. Make sure you have provided Gmail credentials in the .env file"
    );
    console.error("Error: ", error);
  }
};

const emailVerificationMailgenContent = (username, verificationUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to our app!",
      action: {
        instruction: "To verify email, click the following button",
        button: {
          color: "#22BC66",
          text: "Verify your email",
          link: verificationUrl,
        },
      },
      outro: "Need help, or have questions? Just reply to this email.",
    },
  };
};

const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro: "We got a request to reset your account password",
      action: {
        instruction: "To reset password, click the following button",
        button: {
          color: "#22BC66",
          text: "Reset password",
          link: passwordResetUrl,
        },
      },
      outro: "Need help, or have questions? Just reply to this email.",
    },
  };
};

export {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
};
