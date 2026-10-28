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
    const emailUser = process.env.EMAIL_USER || "analyzer-ai@outlook.com";

    if (![name, email, subject, message].every(value => typeof value === "string" && value.trim()) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return new Response(JSON.stringify({ status: "error", message: "Please provide a valid name, email, subject, and message." }), { status: 400, headers });
    }

    if (!process.env.EMAIL_PASSWORD) {
        console.error("❌ ERROR: EMAIL_PASSWORD must contain the Outlook mailbox app password");
        return new Response(JSON.stringify({ status: "error", message: "Contact form email is not configured." }), { status: 500, headers });
    }

    const transporter = nodemailer.createTransport({
        host: "smtp-mail.outlook.com",
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
            user: emailUser,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    const mailOptions = {
        from: `"Analyzer Support" <${emailUser}>`,
        to: "analyzer-ai@outlook.com",
        replyTo: email.trim(),
        subject: `New Contact: ${subject.trim()}`,
        text: `
Name: ${name.trim()}
Email: ${email.trim()}
Subject: ${subject.trim()}

Message:
${message.trim()}
        `,
        html: `
<div dir="rtl" style="font-family: Arial, sans-serif;">
    <h3>رسالة جديدة من نموذج التواصل</h3>
    <p><strong>اسم المرسل:</strong> ${escapeHtml(name.trim())}</p>
    <p><strong>البريد:</strong> ${escapeHtml(email.trim())}</p>
    <p><strong>الموضوع:</strong> ${escapeHtml(subject.trim())}</p>
    <br>
    <p><strong>الرسالة:</strong></p>
    <p>${escapeHtml(message.trim()).replace(/\n/g, '<br>')}</p>
</div>
        `,
    };

    await transporter.sendMail(mailOptions);
    
    return new Response(JSON.stringify({ status: "success", message: "تم الإرسال بنجاح!" }), { status: 200, headers });

  } catch (error) {
    console.error("🔥 Email Error:", error);
    const message = error instanceof Error ? error.message : "Failed to send email";
    return new Response(JSON.stringify({ status: "error", message }), { status: 500, headers });
  }
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}
