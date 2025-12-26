const { Worker } = require('bullmq');
const { google } = require('googleapis');
const { decrypt } = require('../lib/crypto');
const { connection } = require('./queue');

// Ortam değişkeni okunamazsa bile çalışabilmek için
// buraya doğrudan CLIENT_ID ve CLIENT_SECRET yazabileceğin fallback tanımlıyoruz.
// İstersen bunları kendi değerlerinle değiştir.
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || "1048686874524-eb3126g1fc55h5rria4pidev06jlbjfl.apps.googleusercontent.com";
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || "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";

// Debug: gerçekten dolu mu görelim
console.log("GMAIL_CLIENT_ID:", GMAIL_CLIENT_ID.slice(0, 10) || "<empty>");
console.log("GMAIL_CLIENT_SECRET set:", GMAIL_CLIENT_SECRET !== "PASTE_GOOGLE_CLIENT_SECRET_HERE");

// Only Gmail polling – no automatic Steam login.
// targetEmail: Steam hesabında kullanılan Gmail adresi (alias dahil)
async function fetchCodeFromGmail(auth, targetEmail, retries = 5) {
  const gmail = google.gmail({ version: 'v1', auth });

  for (let i = 0; i < retries; i++) {
    try {
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: `from:noreply@steampowered.com is:unread`,
        maxResults: 5,
      });

      if (res.data.messages && res.data.messages.length > 0) {
        // Gelen son birkaç Steam maili içinde hedef e‑posta adresine (alias) gönderilmiş olanı bul
        for (const m of res.data.messages) {
          const msg = await gmail.users.messages.get({ userId: 'me', id: m.id });

          const payload = msg.data.payload || {};
          const headers = payload.headers || [];

          const toHeader =
            headers.find((h) => h.name?.toLowerCase() === 'to')?.value || '';
          const deliveredToHeader =
            headers.find((h) => h.name?.toLowerCase() === 'delivered-to')?.value || '';
          const subjectHeader =
            headers.find((h) => h.name?.toLowerCase() === 'subject')?.value || '';

          const normalizedTarget = (targetEmail || '').trim().toLowerCase();
          const combinedHeaders = `${toHeader} ${deliveredToHeader}`.toLowerCase();

          // Hedef alias, mailin To/Delivered-To alanlarından birinde geçmiyorsa bu maili atla
          if (!normalizedTarget || !combinedHeaders.includes(normalizedTarget)) {
            continue;
          }

          // Body içinden kodu bulmaya çalışalım (snippet yerine tam body daha güvenli).
          const parts = payload.parts || [];
          let bodyText = msg.data.snippet || "";

          for (const part of parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              const buff = Buffer.from(part.body.data, 'base64');
              bodyText = buff.toString('utf8');
              break;
            }
          }

          // Örnek metinlerde genelde 5 haneli kod geçer.
          const match = bodyText.match(/([A-Z0-9]{5})/);
          
          if (match) {
            // Mail'i okundu olarak işaretle
            try {
              await gmail.users.messages.modify({
                userId: 'me',
                id: m.id,
                requestBody: { removeLabelIds: ['UNREAD'] }
              });
            } catch (e) {
              // Ignore mark as read errors
            }
            return match[1];
          }
        }
      }
    } catch (e) {
      // Hatanın detayını da logla ki yapılandırma sorunlarını kolay teşhis edebilelim
      if (e.response && e.response.data) {
        console.error("Gmail Poll Error (detailed):", JSON.stringify(e.response.data));
      } else {
        console.error("Gmail Poll Error:", e.message);
      }
    }

    // 5 saniye bekle, tekrar dene (Redis limitlerini korumak için artırıldı)
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error("Code not found in email after retries");
}

const worker = new Worker(
  'steam-codes',
  async (job) => {
    const { encryptedGmailToken, gmailEmail } = job.data;

    // Buradaki token artık bir REFRESH TOKEN olmalı.
    // OAuth Playground Step 2'den aldığın REFRESH TOKEN değerini admin panelindeki
    // "Gmail Refresh Token" alanına yapıştırmalısın.
    let token;
    try {
      token = decrypt(encryptedGmailToken);
    } catch (decryptErr) {
      console.error("Token decrypt failed:", decryptErr.message);
      throw new Error("Token decrypt failed: " + decryptErr.message);
    }

    const oAuth2Client = new google.auth.OAuth2(
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET
    );
    // Refresh token veriyoruz; googleapis ihtiyaç halinde access token'ı yeniliyor.
    oAuth2Client.setCredentials({ refresh_token: token });

    // Müşteri zaten Steam'i kendi açıyor, biz sadece mailden kod okuyacağız.
    job.updateProgress({
      status: 'WAITING_MAIL',
      gameId: job.data.gameId,
      userId: job.data.userId,
    });

    const targetEmail = gmailEmail || process.env.FALLBACK_GMAIL_EMAIL;
    const code = await fetchCodeFromGmail(oAuth2Client, targetEmail);
    console.log("Code found:", code);

    return {
      userId: job.data.userId,
      gameId: job.data.gameId,
      code,
    };
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.log(`Job ${job.id} failed: ${err.message}`);
});

console.log("Worker started...");

