const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendWindowNotification = async (email, subjectName, startTime, endTime) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Attendance Window Open: ${subjectName}`,
    text: `The attendance window for ${subjectName} is now open.\nStart Time: ${startTime}\nEnd Time: ${endTime}\nPlease mark your attendance within this window.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Window notification error:", error);
    return false;
  }
};

module.exports = { sendWindowNotification };
