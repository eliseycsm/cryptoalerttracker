const nodemailer = require('nodemailer')
require('dotenv').config()

const sender = process.env.FAKEEMAIL
const password = process.env.FAKEPASSWORD

async function sendEmail(templateParams){

    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // use SSL
        auth: {
            user: sender,
            pass: password  
        }
    })

    const {username, email,
        coinId, coinName,
        boughtPrice, targetPrice,
        targetProfit, latestPrice} = templateParams
    
    let info = await transporter.sendMail({

        from: `Crypto Tracker <no-reply@cryptotracker.com>`,
        to: `${email}`,
        subject: `Notification from Crypto Tracker for ${coinId}`,
        html: `Hi ${username},<br><br>Target profit of ${targetProfit}% for ${coinName} has been reached!<br>
        <br>Purchase price of coin: USD${boughtPrice}<br>latestPrice: USD${latestPrice}<br>(target price: USD${targetPrice})
        <br><br>
        Please login to our website to stop your notification, thank you.
        `
    })
}

module.exports = {sendEmail}