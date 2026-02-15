import nodemailer from "nodemailer";

export default async (req, context) => {
  // Handle CORS
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  try {
    const body = await req.json();
    const { name, email, subject, message } = body;

    if (!process.env.EMAIL_PASSWORD) {
        console.error("❌ ERROR: EMAIL_PASSWORD is missing");
        return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers });
    }

    const transporter = nodemailer.createTransport({
        host: "smtp.hostinger.com",
        port: 465,
        secure: true,
        auth: {
            user: "support@analyzer-a.org",
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    const mailOptions = {
        from: '"Analyzer Support" <support@analyzer-a.org>',
        to: "support@analyzer-a.org",
        replyTo: email,
        subject: `New Contact: ${subject || 'No Subject'}`,
        text: `
Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
        `,
        html: `
<div dir="rtl" style="font-family: Arial, sans-serif;">
    <h3>رسالة جديدة من نموذج التواصل</h3>
    <p><strong>اسم المرسل:</strong> ${name}</p>
    <p><strong>البريد:</strong> ${email}</p>
    <p><strong>الموضوع:</strong> ${subject}</p>
    <br>
    <p><strong>الرسالة:</strong></p>
    <p>${message.replace(/\n/g, '<br>')}</p>
</div>
        `,
    };

    await transporter.sendMail(mailOptions);
    
    return new Response(JSON.stringify({ status: "success", message: "تم الإرسال بنجاح!" }), { status: 200, headers });

  } catch (error) {
    console.error("🔥 Email Error:", error);
    return new Response(JSON.stringify({ status: "error", message: error.message || "Failed to send email" }), { status: 500, headers });
  }
};
