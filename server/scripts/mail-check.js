require('dotenv').config();

const { mailService, MailDeliveryError } = require('../src/services/mail.service');

async function run() {
    const recipient = process.env.MAIL_CHECK_RECIPIENT;
    if (!recipient) {
        console.error('MAIL_CHECK_RECIPIENT is required.');
        process.exitCode = 1;
        return;
    }
    try {
        await mailService.sendCheckEmail(recipient);
        console.log('Mail check: OK');
    } catch (error) {
        const code = error instanceof MailDeliveryError ? error.code : 'UNKNOWN';
        console.error(`Mail check: ${code}`);
        process.exitCode = 1;
    }
}

run();
