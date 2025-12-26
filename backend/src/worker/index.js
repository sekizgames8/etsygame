const { Worker } = require('bullmq');
const { google } = require('googleapis');
const { decrypt } = require('../lib/crypto');
const { connection } = require('./queue');

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
  console.error("FATAL: GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET not set!");
  process.exit(1);
}

// ⚠️ GÜVENLIK: Steam Guard Authenticator ekleme girişimini tespit et
// Bu kelimeler mailde geçerse KOD GÖSTERİLMEZ - hesap çalma girişimi olabilir!
const DANGEROUS_KEYWORDS = [
  // İngilizce
  'authenticator', 'mobile authenticator', 'two-factor', '2fa', 'two factor',
  'steam guard mobile', 'adding steam guard', 'steam guard has been added',
  'recovery code', 'backup code', 'remove authenticator',
  // Türkçe
  'doğrulayıcı', 'mobil doğrulayıcı', 'iki faktör', 'iki aşamalı',
  'kurtarma kodu', 'yedek kod',
  // Rusça (latinize)
  'autentifikator', 'mobilnyy', 'dvukhfaktor',
  // Arapça (latinize)
  'musadiq', 'mutaaddid',
  // Almanca
  'authentifikator', 'zwei-faktor', 'zweistufig',
  // Fransızca  
  'authentificateur', 'deux facteurs',
  // İspanyolca
  'autenticador', 'dos factores',
  // Portekizce
  'autenticador', 'dois fatores',
  // Çince (Pinyin)
  'yanzhengqi', 'liangbuyanzheng',
  // Japonca (Romaji)
  'ninshouki', 'nisegakuninsho'
];

// ✅ GÜVENLI: Sadece giriş kodu mailleri - bunlar normal login işlemi
const SAFE_LOGIN_PATTERNS = [
  // İngilizce
  'access from new', 'new device', 'new computer', 'new browser',
  'sign in', 'login', 'log in', 'access code', 'verification code',
  // Türkçe
  'yeni cihaz', 'yeni bilgisayar', 'giriş kodu', 'doğrulama kodu', 'erişim kodu',
  // Rusça
  'novoe ustrojstvo', 'vhod', 'kod dostupa',
  // Almanca
  'neues gerät', 'anmeldung', 'zugriffscode',
  // Fransızca
  'nouvel appareil', 'connexion', 'code d\'accès',
  // İspanyolca
  'nuevo dispositivo', 'iniciar sesión', 'código de acceso',
  // Portekizce
  'novo dispositivo', 'entrar', 'código de acesso'
];

// Mail türünü kontrol et
function checkEmailSafety(subject, bodyText) {
  const combinedText = `${subject} ${bodyText}`.toLowerCase();
  
  // 1. Tehlikeli anahtar kelime kontrolü (AUTHENTICATOR EKLEMESİ)
  for (const keyword of DANGEROUS_KEYWORDS) {
    if (combinedText.includes(keyword.toLowerCase())) {
      return {
        safe: false,
        reason: 'AUTHENTICATOR_ATTEMPT',
        keyword: keyword
      };
    }
  }
  
  // 2. Güvenli login pattern kontrolü
  let isLoginEmail = false;
  for (const pattern of SAFE_LOGIN_PATTERNS) {
    if (combinedText.includes(pattern.toLowerCase())) {
      isLoginEmail = true;
      break;
    }
  }
  
  // 3. Steam Guard kodu formatı kontrolü (5 karakter alfanumerik)
  const hasValidCode = /[A-Z0-9]{5}/.test(bodyText);
  
  if (!isLoginEmail && hasValidCode) {
    // Kod var ama login maili değil - şüpheli
    return {
      safe: false,
      reason: 'UNKNOWN_EMAIL_TYPE',
      keyword: null
    };
  }
  
  return { safe: true, reason: null, keyword: null };
}

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

          // Hedef email kontrolü
          if (!normalizedTarget || !combinedHeaders.includes(normalizedTarget)) {
            continue;
          }

          // Body içeriğini al
          const parts = payload.parts || [];
          let bodyText = msg.data.snippet || "";

          for (const part of parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              const buff = Buffer.from(part.body.data, 'base64');
              bodyText = buff.toString('utf8');
              break;
            }
          }

          // ⚠️ GÜVENLİK KONTROLÜ
          const safetyCheck = checkEmailSafety(subjectHeader, bodyText);
          
          if (!safetyCheck.safe) {
            console.warn(`🚨 SECURITY ALERT: ${safetyCheck.reason} detected!`);
            if (safetyCheck.keyword) {
              console.warn(`   Keyword found: "${safetyCheck.keyword}"`);
            }
            console.warn(`   Subject: ${subjectHeader}`);
            
            // Mail'i okundu işaretle ama kod VERME
            try {
              await gmail.users.messages.modify({
                userId: 'me',
                id: m.id,
                requestBody: { removeLabelIds: ['UNREAD'] }
              });
            } catch (e) {}
            
            throw new Error(`SECURITY_BLOCK:${safetyCheck.reason}`);
          }

          // 5 haneli kodu bul (dil bağımsız - her zaman A-Z0-9 formatında)
          const match = bodyText.match(/\b([A-Z0-9]{5})\b/);
          
          if (match) {
            // Mail'i okundu olarak işaretle
            try {
              await gmail.users.messages.modify({
                userId: 'me',
                id: m.id,
                requestBody: { removeLabelIds: ['UNREAD'] }
              });
            } catch (e) {}
            
            return match[1];
          }
        }
      }
    } catch (e) {
      // Güvenlik bloğu hatası ise yukarı fırlat
      if (e.message?.startsWith('SECURITY_BLOCK:')) {
        throw e;
      }
      
      if (e.response && e.response.data) {
        console.error("Gmail Poll Error (detailed):", JSON.stringify(e.response.data));
      } else {
        console.error("Gmail Poll Error:", e.message);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error("Code not found in email after retries");
}

const worker = new Worker(
  'steam-codes',
  async (job) => {
    const { encryptedGmailToken, gmailEmail } = job.data;

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
    oAuth2Client.setCredentials({ refresh_token: token });

    job.updateProgress({
      status: 'WAITING_MAIL',
      gameId: job.data.gameId,
      userId: job.data.userId,
    });

    const targetEmail = gmailEmail || process.env.FALLBACK_GMAIL_EMAIL;
    const code = await fetchCodeFromGmail(oAuth2Client, targetEmail);

    return {
      userId: job.data.userId,
      gameId: job.data.gameId,
      code,
    };
  },
  { connection }
);

worker.on('failed', (job, err) => {
  // Sadece güvenlik uyarıları logla
  if (err.message?.includes('SECURITY_BLOCK')) {
    console.warn(`🚨 Security block: Job ${job.id} - ${err.message}`);
  }
});
