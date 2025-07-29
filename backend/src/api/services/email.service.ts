import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

interface MailOptions {
    to: string;
    subject: string;
    text: string;
    html: string;
}

export const sendEmail = async (options: MailOptions) => {
    try {
        const info = await transporter.sendMail({
            from: `"Gaming Platform" <no-reply@gamingplatform.com>`,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
        });
        console.log('Message sent: %s', info.messageId);
    } catch (error) {
        console.error("Error sending email: ", error);
        // В реальном приложении здесь должна быть более надежная обработка ошибок
        throw new Error('Email could not be sent');
    }
};

export const sendPasswordResetEmail = async (email: string, code: string) => {
    const subject = 'Сброс пароля на Gaming Platform';
    const text = `Вы запросили сброс пароля. Ваш секретный код: ${code}. Код действителен в течение 10 минут.`;
    const html = `<p>Вы запросили сброс пароля. Ваш секретный код: <strong>${code}</strong></p><p>Код действителен в течение 10 минут.</p>`;

    await sendEmail({ to: email, subject, text, html });
};