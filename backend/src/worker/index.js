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

  console.log("DEBUG - Searching for Steam Guard email to:", targetEmail);

  for (let i = 0; i < retries; i++) {
    console.log(`DEBUG - Attempt ${i + 1}/${retries}`);
    try {
      const res = await gmail.users.messages.list({
        userId: 'me',
        // Steam'den gelen son birkaç maili ara
        q: `from:noreply@steampowered.com is:unread`,
        maxResults: 5,
      });

      console.log("DEBUG - Found messages:", res.data.messages?.length || 0);

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

          console.log("DEBUG - Email subject:", subjectHeader);
          console.log("DEBUG - Email to:", toHeader);
          console.log("DEBUG - Email delivered-to:", deliveredToHeader);

          const normalizedTarget = (targetEmail || '').trim().toLowerCase();
          const combinedHeaders = `${toHeader} ${deliveredToHeader}`.toLowerCase();

          console.log("DEBUG - Looking for:", normalizedTarget);
          console.log("DEBUG - Match found:", combinedHeaders.includes(normalizedTarget));

          // Hedef alias, mailin To/Delivered-To alanlarından birinde geçmiyorsa bu maili atla
          if (!normalizedTarget || !combinedHeaders.includes(normalizedTarget)) {
            console.log("DEBUG - Skipping email, target not matched");
            continue;
          }

          // Body içinden kodu bulmaya çalışalım (snippet yerine tam body daha güvenli).
          const parts = payload.parts || [];
          let bodyText = msg.data.snippet || "";

          console.log("DEBUG - Snippet:", bodyText.substring(0, 100));

          for (const part of parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              const buff = Buffer.from(part.body.data, 'base64');
              bodyText = buff.toString('utf8');
              break;
            }
          }

          console.log("DEBUG - Body (first 200 chars):", bodyText.substring(0, 200));

          // Örnek metinlerde genelde 5 haneli kod geçer.
          const match = bodyText.match(/([A-Z0-9]{5})/);
          console.log("DEBUG - Code match:", match ? match[1] : "NO MATCH");
          
          if (match) {
            // Mail'i okundu olarak işaretle
            try {
              await gmail.users.messages.modify({
                userId: 'me',
                id: m.id,
                requestBody: { removeLabelIds: ['UNREAD'] }
              });
              console.log("DEBUG - Marked email as read");
            } catch (e) {
              console.log("DEBUG - Could not mark as read:", e.message);
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
    console.log("DEBUG - Encrypted token (first 50 chars):", encryptedGmailToken?.substring(0, 50));
    
    let token;
    try {
      token = decrypt(encryptedGmailToken);
      console.log("DEBUG - Decrypted token (first 20 chars):", token?.substring(0, 20));
      console.log("DEBUG - Token starts with '1//':", token?.startsWith('1//'));
    } catch (decryptErr) {
      console.error("DEBUG - Decrypt failed:", decryptErr.message);
      throw new Error("Token decrypt failed: " + decryptErr.message);
    }

    const oAuth2Client = new google.auth.OAuth2(
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET
    );
    // Refresh token veriyoruz; googleapis ihtiyaç halinde access token'ı yeniliyor.
    oAuth2Client.setCredentials({ refresh_token: token });
    
    console.log("DEBUG - Gmail email target:", gmailEmail);

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

