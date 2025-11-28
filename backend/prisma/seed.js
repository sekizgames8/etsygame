require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { encrypt } = require('../src/lib/crypto');

const prisma = new PrismaClient();

async function main() {
  // 1) Admin kullanıcı
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log('Admin user:', admin.email);

  // 2) Ortak Gmail refresh token (tüm Steam hesapları için aynı olacak)
  const defaultGmailRefreshToken =
  process.env.DEFAULT_GMAIL_REFRESH_TOKEN ||
  "1//04nsc1ESt-s9bCgYIARAAGAQSNwF-L9IrNlzoCmQAzITSV5S_BNfs5T076zIUPRmspMSh5TlRhViY3-CZbZxXOzJJtcILxS5UJfU";  if (!defaultGmailRefreshToken) {
    throw new Error(
      'DEFAULT_GMAIL_REFRESH_TOKEN env değişkeni yok. Lütfen .env dosyasında Google refresh tokenını DEFAULT_GMAIL_REFRESH_TOKEN olarak ekleyin.'
    );
  }
  const encryptedGmailToken = encrypt(defaultGmailRefreshToken);

  // 3) Oyun + Steam hesap verileri
  const gamesData = [
    {
      title: 'DAYS GONE',
      gmailEmail: 'sek.izgames8@gmail.com',
      steamUsername: '8gdaysgone',
      steamPassword: 'jA24+AFtPssrL)i_',
    },
    {
      title: 'STALKER 2',
      gmailEmail: 'se.kizgames8@gmail.com',
      steamUsername: 'stalker28g',
      steamPassword: 'h$bH5#nAB%i09!PR',
    },
    {
      title: 'RESIDENT EVIL',
      gmailEmail: 's.ekizgames8@gmail.com',
      steamUsername: '8gresidentevil',
      steamPassword: "),'kUvI'%DLZG3N5".replace(",'", ",]k"), // güvenli string
    },
    {
      title: 'GOD OF WAR',
      gmailEmail: 'seki.zgames8@gmail.com',
      steamUsername: 'godofwar8g',
      steamPassword: 'D!yw=TK2CjOjEzEf',
    },
    {
      title: 'ELDEN RING',
      gmailEmail: 'sekiz.games8@gmail.com',
      steamUsername: 'eldenring8g',
      steamPassword: '1_-fNu$DUM%;L;,t',
    },
    {
      title: 'SILENT HILL F',
      gmailEmail: 'sekizg.ames8@gmail.com',
      steamUsername: 'silenthillf8g',
      steamPassword: 'Mogzu6-bifhed-cahcow',
    },
    {
      title: 'SILENT HILL',
      gmailEmail: 'sekizga.mes8@gmail.com',
      steamUsername: 'silenthill8g',
      steamPassword: 'ufj8myUtfk',
    },
    {
      title: 'HOGWARTS LEGACY',
      gmailEmail: 'sekizgam.es8@gmail.com',
      steamUsername: 'hogwartslegacy8g',
      steamPassword: 'N_-b8!037R(IDwld (İDwLd)',
    },
    {
      title: 'RESIDENT EVIL VILLAGE',
      gmailEmail: 'sekizgame.s8@gmail.com',
      steamUsername: 'residentevilvillage8g',
      steamPassword: 'y5D9I5P0Moe4Y8R',
    },
    {
      title: 'DEATH STRANDING',
      gmailEmail: 's.ek.izgames8@gmail.com',
      steamUsername: 'deathstranding8g',
      steamPassword: 'kukco7vyqgiFfizpar',
    },
    {
      title: "DRAGON'S DOGMA 2",
      gmailEmail: 's.eki.zgames8@gmail.com',
      steamUsername: 'dragonsdogma28g',
      steamPassword: 'hypxe9-vykdYj-bigvyk',
    },
    {
      title: 'GHOST OF THUSHIMA',
      gmailEmail: 's.ekiz.games8@gmail.com',
      steamUsername: 'ghostofthushima8g',
      steamPassword: '8DFLXcrn6FIXf51',
    },
    {
      title: 'STARFIELD',
      gmailEmail: 'se.k.izgames8@gmail.com',
      steamUsername: 'starfield8g',
      steamPassword: 'kokCu55sytkoua',
    },
    {
      title: 'MAFIA OLD COUNTRY',
      gmailEmail: 'se.ki.zgames8@gmail.com',
      steamUsername: 'mafiaoldcountry8g',
      steamPassword: 'rHFvcWfIHEbK6wX',
    },
    {
      title: 'METAL GEAR SOLID SNAKE EATER',
      gmailEmail: 'se.kiz.games8@gmail.com',
      steamUsername: 'metalgearsolidsnakeeater8g',
      steamPassword: 'olAkca992sdktsj',
    },
    {
      title: 'CYBERPUNK 2077',
      gmailEmail: 'sek.i.zgames8@gmail.com',
      steamUsername: 'cyberpunk20778g',
      steamPassword: 'G3KVaMnsfucYKw',
    },
    {
      title: 'FAR CRY 6',
      gmailEmail: 'sek.iz.games8@gmail.com',
      steamUsername: 'farcry68g',
      steamPassword: 'p2nkS%}X1R{2ZKtp',
    },
    {
      title: 'GOD OF WAR RAGNAROK',
      gmailEmail: 'seki.z.games8@gmail.com',
      steamUsername: 'godofwarragnarok8g',
      steamPassword: 'zoeq5UA14Z8uFPT',
    },
    {
      title: 'THE LAST OF US PART 2',
      gmailEmail: 'sekiz.g.ames8@gmail.com',
      steamUsername: 'lastofuspart28g',
      steamPassword: 'ouA9vBh,orHJh~Gq',
    },
    {
      title: 'FORZA HORIZON 5',
      gmailEmail: 'sekiz.ga.mes8@gmail.com',
      steamUsername: 'forzahorizon58g',
      steamPassword: 'I~0Pk=}8J,X5X@%6',
    },
    {
      title: 'DISPATCH',
      gmailEmail: 'sekizgam.e.s8@gmail.com',
      steamUsername: 'dispatch8g',
      steamPassword: 'cubxa6Huhcoqfuhdof',
    },
    {
      title: "BALDUR'S GATE 3",
      gmailEmail: 's.ekizgame.s8@gmail.com',
      steamUsername: 'baldursgate38g',
      steamPassword: 'cubxa6Huhcoqfuhdof',
    },
    {
      title: 'THE LAST OF US PART 1',
      gmailEmail: 'se.kizgame.s8@gmail.com',
      steamUsername: 'lastofuspart18g',
      steamPassword: 'favqEngydby7nindyq',
    },
  ];

  for (const item of gamesData) {
    // Aynı başlığa sahip oyun varsa tekrar oluşturma
    let game = await prisma.game.findFirst({
      where: { title: item.title },
    });

    if (!game) {
      game = await prisma.game.create({
        data: {
          title: item.title,
          coverImage: `https://placehold.co/300x450?text=${encodeURIComponent(
            item.title
          )}`,
        },
      });
      console.log('Game created:', game.title);
    }

    // Aynı Steam kullanıcı adı varsa tekrar ekleme
    const existingAccount = await prisma.steamAccount.findFirst({
      where: { username: item.steamUsername },
    });

    if (!existingAccount) {
      await prisma.steamAccount.create({
        data: {
          username: item.steamUsername,
          password: encrypt(item.steamPassword),
          gmailEmail: item.gmailEmail,
          gmailRefreshToken: encryptedGmailToken,
          gameId: game.id,
        },
      });
      console.log('Steam account created:', item.steamUsername);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
