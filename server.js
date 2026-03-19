const express    = require('express');
const fs         = require('fs');
const path       = require('path');
const bodyParser = require('body-parser');
const cors       = require('cors');
const nodemailer = require('nodemailer');

// ═══════════════════════════════════════════════════
//  EMAIL CONFIG  ← fill in your Gmail App Password
// ═══════════════════════════════════════════════════
const EMAIL_CONFIG = {
    senderGmail   : 'pankajvidhate100@gmail.com',
    // Generate an App Password at:
    // https://myaccount.google.com/apppasswords
    // (2-Step Verification must be ON first)
    appPassword   : 'tkhh jnex hitc itly',
    shopName      : 'Desire.co',
    shopWebsite   : 'http://localhost:3000',
    adminEmail    : 'pankajvidhate100@gmail.com',
};

// ── Nodemailer transporter ──
const transporter = nodemailer.createTransport({
    service : 'gmail',
    auth    : {
        user : EMAIL_CONFIG.senderGmail,
        pass : EMAIL_CONFIG.appPassword,
    },
});

// ── Verify connection on startup ──
transporter.verify((err) => {
    if (err) {
        console.warn('⚠  Email transporter not ready:', err.message);
        console.warn('   Check your Gmail App Password in EMAIL_CONFIG.');
    } else {
        console.log('✉  Email transporter ready — confirmations will be sent from', EMAIL_CONFIG.senderGmail);
    }
});

// ═══════════════════════════════════════════════════
//  EMAIL TEMPLATE
// ═══════════════════════════════════════════════════
function buildEmailHTML(order) {
    const itemRows = (order.items || []).map(item => `
        <tr>
            <td style="padding:12px 16px;border-bottom:1px solid #3d1a08;font-family:'Georgia',serif;font-size:15px;color:#f9f2e7;">
                ${item.name}
            </td>
            <td style="padding:12px 16px;border-bottom:1px solid #3d1a08;font-family:'Courier New',monospace;font-size:13px;color:#c8892a;text-align:center;">
                ×${item.qty}
            </td>
            <td style="padding:12px 16px;border-bottom:1px solid #3d1a08;font-family:'Courier New',monospace;font-size:13px;color:#e8b84b;text-align:right;">
                ₹${item.price * item.qty}
            </td>
        </tr>
    `).join('');

    const payMethod = order.payment?.method === 'razorpay'
        ? '💳 Razorpay'
        : order.payment?.method?.includes('upi')
            ? '📱 Direct UPI'
            : 'Online Payment';

    const payRef = order.payment?.id || order.payment?.transaction_ref || '—';

    const date = new Date(order.date).toLocaleString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Order Confirmation — Desire.co</title>
</head>
<body style="margin:0;padding:0;background:#0f0502;font-family:'Georgia',serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0502;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:#2d1208;padding:36px 40px;text-align:center;border-bottom:2px solid #c8892a;">
            <div style="font-family:'Georgia',serif;font-size:32px;color:#e8b84b;letter-spacing:4px;">
              <em>Desire</em>.co
            </div>
            <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:rgba(249,242,231,0.4);margin-top:6px;">
              Artisan Chocolates
            </div>
          </td>
        </tr>

        <!-- HERO BAND -->
        <tr>
          <td style="background:linear-gradient(135deg,#3d1a08,#2d1208);padding:32px 40px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🍫</div>
            <div style="font-family:'Georgia',serif;font-size:26px;font-weight:bold;color:#f9f2e7;margin-bottom:8px;">
              Order Confirmed!
            </div>
            <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c8892a;">
              Thank you for your purchase
            </div>
          </td>
        </tr>

        <!-- GREETING -->
        <tr>
          <td style="background:#1a0a04;padding:28px 40px;">
            <p style="font-size:16px;color:rgba(249,242,231,0.8);line-height:1.7;margin:0;">
              Dear <strong style="color:#f9f2e7;">${order.customer?.name || 'Valued Customer'}</strong>,
            </p>
            <p style="font-size:15px;color:rgba(249,242,231,0.6);line-height:1.8;margin:14px 0 0;">
              Your order has been received and we're already preparing your handcrafted chocolates with love. 
              You'll receive a separate message when your order is dispatched.
            </p>
          </td>
        </tr>

        <!-- ORDER META -->
        <tr>
          <td style="background:#1a0a04;padding:0 40px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(200,137,42,0.25);">
              <tr>
                <td style="padding:14px 18px;background:#2d1208;border-bottom:1px solid rgba(200,137,42,0.15);">
                  <span style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(249,242,231,0.4);">Order ID</span><br>
                  <span style="font-family:'Courier New',monospace;font-size:14px;color:#e8b84b;">#${String(order.id).padStart(4,'0')}</span>
                </td>
                <td style="padding:14px 18px;background:#2d1208;border-bottom:1px solid rgba(200,137,42,0.15);border-left:1px solid rgba(200,137,42,0.15);">
                  <span style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(249,242,231,0.4);">Date</span><br>
                  <span style="font-family:'Courier New',monospace;font-size:12px;color:#f9f2e7;">${date}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 18px;background:#1f0d06;">
                  <span style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(249,242,231,0.4);">Payment</span><br>
                  <span style="font-family:'Courier New',monospace;font-size:13px;color:#7ec896;">${payMethod}</span>
                </td>
                <td style="padding:14px 18px;background:#1f0d06;border-left:1px solid rgba(200,137,42,0.15);">
                  <span style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(249,242,231,0.4);">Reference</span><br>
                  <span style="font-family:'Courier New',monospace;font-size:11px;color:rgba(249,242,231,0.5);word-break:break-all;">${payRef}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ORDER ITEMS -->
        <tr>
          <td style="background:#1a0a04;padding:0 40px 24px;">
            <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#c8892a;margin-bottom:12px;">
              Your Items
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(200,137,42,0.2);">
              <thead>
                <tr style="background:#2d1208;">
                  <th style="padding:10px 16px;text-align:left;font-family:'Courier New',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(249,242,231,0.4);font-weight:normal;">Item</th>
                  <th style="padding:10px 16px;text-align:center;font-family:'Courier New',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(249,242,231,0.4);font-weight:normal;">Qty</th>
                  <th style="padding:10px 16px;text-align:right;font-family:'Courier New',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(249,242,231,0.4);font-weight:normal;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
              </tbody>
              <tfoot>
                <tr style="background:#2d1208;">
                  <td colspan="2" style="padding:14px 16px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(249,242,231,0.5);">Total Amount</td>
                  <td style="padding:14px 16px;text-align:right;font-family:'Georgia',serif;font-size:22px;color:#e8b84b;font-weight:bold;">₹${order.total}</td>
                </tr>
              </tfoot>
            </table>
          </td>
        </tr>

        <!-- SHIPPING ADDRESS -->
        <tr>
          <td style="background:#1a0a04;padding:0 40px 28px;">
            <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#c8892a;margin-bottom:12px;">
              Shipping To
            </div>
            <div style="background:#2d1208;border:1px solid rgba(200,137,42,0.2);padding:18px;font-size:14px;color:rgba(249,242,231,0.7);line-height:1.8;">
              <strong style="color:#f9f2e7;display:block;margin-bottom:4px;">${order.customer?.name || ''}</strong>
              ${order.customer?.address || ''}<br>
              ${order.customer?.city || ''}, ${order.customer?.state || ''} — ${order.customer?.zip || ''}<br>
              <span style="font-family:'Courier New',monospace;font-size:12px;color:#c8892a;">📞 ${order.customer?.phone || ''}</span>
            </div>
          </td>
        </tr>

        <!-- FOOTER MESSAGE -->
        <tr>
          <td style="background:#2d1208;padding:28px 40px;text-align:center;border-top:1px solid rgba(200,137,42,0.2);">
            <p style="font-family:'Georgia',serif;font-size:15px;font-style:italic;color:rgba(249,242,231,0.6);margin:0 0 16px;">
              "Made with love, never compromised."
            </p>
            <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(249,242,231,0.25);">
              Questions? Reply to this email or WhatsApp us.<br>
              © 2026 Desire.co · Nagpur, India
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>
    `.trim();
}

// ── Send confirmation email ──
async function sendConfirmationEmail(order) {
    if (!order.customer?.email) {
        console.log('⚠  No customer email — skipping confirmation.');
        return;
    }
    try {
        const info = await transporter.sendMail({
            from    : `"${EMAIL_CONFIG.shopName}" <${EMAIL_CONFIG.senderGmail}>`,
            to      : order.customer.email,
            subject : `🍫 Order Confirmed #${String(order.id).padStart(4,'0')} — ${EMAIL_CONFIG.shopName}`,
            html    : buildEmailHTML(order),
            // Plain text fallback
            text    : `
Hi ${order.customer.name},

Your order #${String(order.id).padStart(4,'0')} has been confirmed!

Items:
${(order.items || []).map(i => `  • ${i.name} x${i.qty} — ₹${i.price * i.qty}`).join('\n')}

Total: ₹${order.total}

Shipping to: ${order.customer.address}, ${order.customer.city}, ${order.customer.state} ${order.customer.zip}

Thank you for choosing Desire.co!
            `.trim(),
        });
        console.log(`✉  Confirmation sent to ${order.customer.email} (ID: ${info.messageId})`);
    } catch (err) {
        console.error('✗  Failed to send confirmation email:', err.message);
    }
}

async function sendAdminNotification(order) {
    if (!EMAIL_CONFIG.adminEmail) {
        console.log('⚠  Admin email not configured; skipping admin notification.');
        return;
    }
    try {
        const totalItems = (order.items || []).reduce((s,i)=>s+(i.qty||0),0);
        const msg = `Order #${String(order.id).padStart(4,'0')} received from ${order.customer?.name || 'unknown'}\n\n` +
                    `Total: ₹${order.total || 0}\n` +
                    `Items: ${totalItems}\n` +
                    `Payment: ${order.payment?.method || 'unknown'}\n` +
                    `Email: ${order.customer?.email || '—'}\n` +
                    `Phone: ${order.customer?.phone || '—'}\n` +
                    `Address: ${order.customer?.address || '—'}, ${order.customer?.city || ''} ${order.customer?.state || ''} ${order.customer?.zip || ''}`;

        const info = await transporter.sendMail({
            from   : `"${EMAIL_CONFIG.shopName} Admin" <${EMAIL_CONFIG.senderGmail}>`,
            to     : EMAIL_CONFIG.adminEmail,
            subject: `🔔 New Order Received #${String(order.id).padStart(4,'0')} — ${EMAIL_CONFIG.shopName}`,
            text   : msg,
        });
        console.log(`✉  Admin notification sent (ID: ${info.messageId})`);
    } catch (err) {
        console.error('✗  Failed to send admin notification:', err.message);
    }
}

// ═══════════════════════════════════════════════════
//  SERVER SETUP
// ═══════════════════════════════════════════════════
const DATA_DIR    = path.join(__dirname, 'data');
const INV_FILE    = path.join(DATA_DIR, 'inventory.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

let canWriteFiles = true;
const memoryStore = {};

try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
    // Ensure the process can write to the data folder
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
} catch (err) {
    canWriteFiles = false;
    console.warn('⚠  Read-only file system detected. Using in-memory order persistence for this run.');
}

function readJson(file, def) {
    if (canWriteFiles) {
        try { return JSON.parse(fs.readFileSync(file)); } catch { return def; }
    }
    if (memoryStore[file] !== undefined) return memoryStore[file];
    try { return JSON.parse(fs.readFileSync(file)); } catch { return def; }
}
function writeJson(file, data) {
    if (!canWriteFiles) {
        memoryStore[file] = data;
        return;
    }
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (err) {
        console.warn('⚠  Could not write to file, switching to in-memory persistence:', err.message);
        canWriteFiles = false;
        memoryStore[file] = data;
    }
}

const defaultInventory = {
    cashew : { name: 'Cashew Crunch', price: 99,  stock: 10 },
    oreo   : { name: 'Oreo Crunch',   price: 119, stock: 10 },
    dark   : { name: 'Dark Delight',  price: 129, stock: 10 },
};

let activeInventory = readJson(INV_FILE, defaultInventory);
let activeOrders = readJson(ORDERS_FILE, []);

if (canWriteFiles && !fs.existsSync(INV_FILE))    writeJson(INV_FILE, defaultInventory);
if (canWriteFiles && !fs.existsSync(ORDERS_FILE)) writeJson(ORDERS_FILE, []);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// ── Inventory routes ──
app.get('/api/inventory', (req, res) => {
    res.json(readJson(INV_FILE, defaultInventory));
});

app.post('/api/inventory', (req, res) => {
    const inv     = readJson(INV_FILE, defaultInventory);
    const updates = req.body;
    Object.keys(updates).forEach(sku => {
        if (inv[sku]) inv[sku].stock = updates[sku].stock;
    });
    writeJson(INV_FILE, inv);
    res.json(inv);
});

// ── Orders routes ──
app.get('/api/orders', (req, res) => {
    res.json(readJson(ORDERS_FILE, []));
});

app.post('/api/orders', async (req, res) => {
    const orders = readJson(ORDERS_FILE, []);
    const order  = req.body;
    order.id   = orders.length + 1;
    order.date = new Date().toISOString();
    orders.push(order);
    writeJson(ORDERS_FILE, orders);

    // ✉ Send confirmation email (non-blocking — won't delay the response)
    sendConfirmationEmail(order);
    sendAdminNotification(order);

    res.json(order);
});

app.post('/api/orders/reset', (req, res) => {
    writeJson(ORDERS_FILE, []);
    res.json({ success: true, message: 'Orders cleared' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
