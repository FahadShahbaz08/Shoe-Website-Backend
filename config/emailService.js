import nodemailer from "nodemailer";

const emailProvider = (process.env.EMAIL_PROVIDER || "gmail").toLowerCase();
const defaultEmailUser = process.env.EMAIL_USER;
const defaultEmailPass = process.env.EMAIL_PASS;

const brevoUser = process.env.BREVO_SMTP_USER;
const brevoPass = process.env.BREVO_SMTP_PASS;
const brevoFromEmail = process.env.BREVO_FROM_EMAIL;
const brevoFromName = process.env.BREVO_FROM_NAME || "ForEver";

const isBrevo = emailProvider === "brevo";
const emailUser = isBrevo ? brevoUser : defaultEmailUser;
const emailPass = isBrevo ? brevoPass : defaultEmailPass;
const fromName = isBrevo ? brevoFromName : "ForEver";
const fromEmail = isBrevo ? (brevoFromEmail || defaultEmailUser) : defaultEmailUser;
const hasEmailConfig = Boolean(emailUser && emailPass && fromEmail);

const transporter = hasEmailConfig
  ? isBrevo
    ? nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.BREVO_SMTP_PORT || 587),
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    })
    : nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    })
  : null;

const logEmailConfigWarning = () => {
  if (!hasEmailConfig) {
    if (isBrevo) {
      console.error(
        "Brevo email is not configured. Set BREVO_SMTP_USER, BREVO_SMTP_PASS, and BREVO_FROM_EMAIL in backend environment."
      );
      return;
    }

    console.error(
      "Email is not configured. Set EMAIL_USER and EMAIL_PASS (Gmail App Password) in backend environment."
    );
  }
};

// Order Confirmation Email
export const sendOrderEmail = async (toEmail, items, amount) => {
  if (!hasEmailConfig || !transporter) {
    logEmailConfigWarning();
    return;
  }

  const itemList = items.map((item, i) =>
    `${i + 1}. ${item.name} (Qty: ${item.quantity}) - Rs${item.price}`
  ).join('\n');

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: toEmail,
    subject: "🛒 Order Confirmation - Thank You for Shopping!",
    html: `
  <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; background:#f9f9f9; padding:20px;">
    
    <div style="background:#000; color:#fff; padding:15px; text-align:center; border-radius:8px 8px 0 0;">
      <h2 style="margin:0;">Emballished Craft</h2>
    </div>

    <div style="background:#fff; padding:20px; border-radius:0 0 8px 8px;">
      <h3 style="color:#333;">Thank you for your order!</h3>
      <p style="color:#555;">Your order has been placed successfully. Here are the details:</p>

      <div style="margin:15px 0; padding:10px; background:#f1f1f1; border-radius:6px;">
        ${items.map((item, i) => `
          <p style="margin:5px 0;">
            <strong>${i + 1}. ${item.name}</strong><br/>
            Qty: ${item.quantity} | Rs ${item.price}
          </p>
        `).join("")}
      </div>

      <h3 style="color:#000;">Total: Rs ${amount}</h3>

      <div style="text-align:center; margin:20px 0;">
        <a href="https://emballishedcraft.com" 
           style="background:#000; color:#fff; padding:12px 20px; text-decoration:none; border-radius:5px;">
           Visit Store
        </a>
      </div>

      <p style="color:#777;">We’ll deliver your order soon. Thank you for shopping with us! 😊</p>
    </div>

    <div style="text-align:center; font-size:12px; color:#999; margin-top:20px;">
      <p>Developed by Fahad (<a href="https://fahadshahbaz.fun">fahadshahbaz.fun</a>)</p>
      <p>© 2026 Emballished Craft. All rights reserved.</p>
    </div>

  </div>
  `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Order email sent to", toEmail);
  } catch (err) {
    console.error("❌ Error sending order email:", err); // log full error
  }
};

// Admin notification for new order
export const sendAdminOrderEmail = async (adminEmail, order) => {
  if (!hasEmailConfig || !transporter) {
    logEmailConfigWarning();
    return;
  }

  if (!adminEmail) {
    console.error("ADMIN_EMAIL is missing. Admin order email was not sent.");
    return;
  }

  const items = order?.items || [];
  const itemList = items
    .map((item, i) => `${i + 1}. ${item.name} | Qty: ${item.quantity} | Size: ${item.size || "N/A"}`)
    .join("\n");

  const customerName = `${order?.address?.firstName || ""} ${order?.address?.lastName || ""}`.trim() || "N/A";
  const customerEmail = order?.address?.email || "N/A";
  const customerPhone = order?.address?.phone || "N/A";
  const fullAddress = [
    order?.address?.street,
    order?.address?.city,
    order?.address?.state,
    order?.address?.pinCode,
    order?.address?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: adminEmail,
    subject: `New Order Received - ${customerName}`,
    text: `A new order has been placed.

Order ID: ${order?._id || "N/A"}
Order Date: ${new Date(order?.date || Date.now()).toLocaleString()}
Payment Method: ${order?.paymentMethod || "COD"}
Total Amount: Rs${order?.amount ?? "N/A"}

Customer Name: ${customerName}
Customer Email: ${customerEmail}
Customer Phone: ${customerPhone}
Shipping Address: ${fullAddress || "N/A"}

Items:
${itemList || "No items found"}
`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Admin order email sent to", adminEmail);
  } catch (err) {
    console.error("❌ Error sending admin order email:", err);
  }
};

// Invoice Email with PDF Attachment
export const sendInvoiceEmail = async (toEmail, pdfBuffer) => {
  if (!hasEmailConfig || !transporter) {
    logEmailConfigWarning();
    return;
  }

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: toEmail,
    subject: "📦 Your Order Invoice - Delivered",
    text: `Hi there,

We're happy to let you know that your order has been successfully delivered! 🎉

Please find your invoice attached with this email for your records.

If you have any questions or need further assistance, feel free to reach out.

Thank you for shopping with ForEver. We appreciate your trust in us! 😊

Best regards,  
Team ForEver`,
    attachments: [
      {
        filename: 'invoice.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Invoice email sent to", toEmail);
  } catch (err) {
    console.error("❌ Error sending invoice email:", err); // log full error
  }
};
