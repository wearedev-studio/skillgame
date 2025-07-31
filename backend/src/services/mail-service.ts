import nodemailer from 'nodemailer';

class MailService {
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });
    }

    async sendActivationMail(to: string, link: string) {
        await this.transporter.sendMail({
            from: process.env.SMTP_USER,
            to,
            subject: 'Активация аккаунта на ' + process.env.CLIENT_URL,
            text: '',
            html: `
                <div>
                    <h1>Для активации перейдите по ссылке</h1>
                    <a href="${link}">${link}</a>
                </div>
            `,
        });
    }

    // В будущем здесь будет метод для отправки кода сброса пароля
    async sendPasswordResetCode(to: string, code: string) {
        await this.transporter.sendMail({
            from: process.env.SMTP_USER,
            to,
            subject: 'Сброс пароля на ' + process.env.CLIENT_URL,
            text: '',
            html: `
                <div>
                    <h1>Ваш код для сброса пароля</h1>
                    <h2>${code}</h2>
                </div>
            `,
        });
    }
}

export default new MailService();