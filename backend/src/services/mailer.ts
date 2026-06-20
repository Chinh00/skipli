import nodemailer from 'nodemailer';

const smtpPort = Number(process.env.SMTP_PORT || 1025);

export const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: smtpPort,
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      }
    : undefined,
});

export const sendVerificationCode = async (email: string, code: string) => {
  await mailer.sendMail({
    from: process.env.SMTP_FROM || 'Mini Trello <no-reply@skipli.local>',
    to: email,
    subject: 'Your Mini Trello verification code',
    text: `Your Mini Trello verification code is ${code}.`,
    html: `<p>Your Mini Trello verification code is <strong>${code}</strong>.</p>`,
  });
};
