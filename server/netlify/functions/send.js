// Netlify Function: stateless SMTP relay for Send-to-Kindle.
// Deploy YOUR OWN instance and set the SMTP_* env vars to YOUR mailbox, so the
// email comes from an address you can add to Amazon's approved-sender list.
// The article/EPUB is never stored — it is relayed and forgotten.

const nodemailer = require("nodemailer");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  // Diagnostic (booléens uniquement, jamais les valeurs) : GET ?check=env
  if (event.httpMethod === "GET" && event.queryStringParameters && event.queryStringParameters.check === "env") {
    const present = (k) => Boolean(process.env[k] && String(process.env[k]).length);
    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({
        SMTP_HOST: present("SMTP_HOST"),
        SMTP_PORT: present("SMTP_PORT"),
        SMTP_SECURE: present("SMTP_SECURE"),
        SMTP_USER: present("SMTP_USER"),
        SMTP_PASS: present("SMTP_PASS"),
        SMTP_FROM: present("SMTP_FROM"),
        HOST_VALUE_LEN: (process.env.SMTP_HOST || "").length,
      }),
    };
  }
  if (event.httpMethod !== "POST")
    return { statusCode: 405, headers: CORS, body: "Method not allowed" };

  try {
    const { to, filename, epubBase64, token } = JSON.parse(event.body || "{}");

    // Optional shared secret to keep the relay from being an open mailer.
    if (process.env.RELAY_TOKEN && token !== process.env.RELAY_TOKEN)
      return { statusCode: 401, headers: CORS, body: "Invalid token" };

    if (!to || !/@kindle\.(com|cn)$/i.test(to))
      return { statusCode: 400, headers: CORS, body: "Recipient must be a @kindle.com address" };
    if (!epubBase64) return { statusCode: 400, headers: CORS, body: "Missing epubBase64" };

    const buf = Buffer.from(epubBase64, "base64");
    if (buf.length > 24 * 1024 * 1024)
      return { statusCode: 413, headers: CORS, body: "EPUB too large (>24MB)" };

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE ?? "true") === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: "Document", // Amazon uses "convert" in the subject only for legacy; body/subject are ignored for EPUB
      text: "Sent via Article → Kindle.",
      attachments: [{ filename: filename || "article.epub", content: buf }],
    });

    return { statusCode: 200, headers: CORS, body: "sent" };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: "Relay error: " + (e.message || String(e)) };
  }
};
