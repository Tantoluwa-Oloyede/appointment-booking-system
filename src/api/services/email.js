
import transporter from "../../config/email/index.js";

const sendMail = async (email, subject, Content) => {
  const emailInfo = {
    from: {
      name: 'Booking System',
      email: process.env.NODEMAILER_USER
    },
    to: email.trim().toLowerCase(),
    subject,
    text: Content,
  };

  try {
    await transporter.sendMail(emailInfo);
    console.log(`Email successfully sent to ${email}`);
  } catch (error) {
    console.error('Error occurred while sending email:', error.message);
    throw error;
  }
};

export default sendMail;