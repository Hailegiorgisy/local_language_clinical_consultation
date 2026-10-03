/**
 * TenaConsult - Local Language Clinical Consultation Telegram Bot
 * Supported Languages:
 *   1. አማርኛ (Amharic - am)
 *   2. Afaan Oromoo (om)
 *   3. Dha Anywaa / Agnwa (an)
 *   4. Thok Naath / Nuer (nu)
 *
 * Compliant with Ethiopian Primary Health Care Clinical Guidelines (EPHCG).
 */
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('ERROR: TELEGRAM_BOT_TOKEN is not set in environment variables!');
  process.exit(1);
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_BASE_URL = process.env.API_BASE_URL;

const bot = new Telegraf(BOT_TOKEN);

// User language session map (Persists selected language per user chat)
const userLanguage = new Map();

// Language metadata & configurations
const LANGUAGES = {
  am: {
    name: 'አማርኛ (Amharic)',
    flag: '🇪🇹',
    confirm: '✅ ቋንቋዎ ወደ አማርኛ ተቀይሯል። ስለጤናዎ ሁኔታ የሚሰማዎትን ሕመም ወይም ምልክት በዝርዝር ይንገሩኝ።',
    emergency: '🚨 አስቸኳይ ማስጠንቀቂያ፡ ይህ አፋጣኝ የሕክምና ክትትል የሚሻ ሁኔታ ነው። እባክዎ በአቅራቢያዎ ወደሚገኝ ጤና ጣቢያ ወይም ሆስፒታል ድንገተኛ ክፍል በአስቸኳይ ይሂዱ ወይም ወደ 907 (ነፃ መስመር) ይደውሉ።',
    facilities: '🏥 በአቅራቢያ የሚገኙ ዋና ዋና ሪፈራል ሆስፒታሎች:\n• ጋምቤላ ሪፈራል ሆስፒታል: +251 47 551 0023\n• አቦቦ ሆስፒታል (አኙዋክ ዞን): +251 47 553 0110\n• ላሬ ፕራይመሪ ሆስፒታል (ኑዌር ዞን): +251 47 554 0092\n• ነቀምቴ ስፔሻላይዝድ ሆስፒታል: +251 57 661 1290\n\n📞 የኢትዮጵያ ኅብረተሰብ ጤና ኢንስቲትዩት: 907 (ነፃ መስመር)'
  },
  om: {
    name: 'Afaan Oromoo',
    flag: '🌳',
    confirm: '✅ Afaan keessan gara Afaan Oromootti jijjiirameera. Waa\'ee haala dhukkubbii ykn mallattoolee isinitti mul\'atu naaf barreessaa.',
    emergency: '🚨 Akeekkachiisa Hatattamaa: Haalli kun yaala ariifachiisaa barbaada! Dafaatii gara buufata fayyaa ykn hospitaala dhihoo jiru kan dhimma hatattamaatti ariitiin deemaa ykn 907 bilbilaa.',
    facilities: '🏥 Buufataalee fi Hospitaalota Referaalaa:\n• Hospitaala Gambeellaa: +251 47 551 0023\n• Hospitaala Aboboo: +251 47 553 0110\n• Hospitaala Laaree: +251 47 554 0092\n• Hospitaala Nekemte: +251 57 661 1290\n\n📞 Bilbila Hatattamaa EPHI: 907 (Bilisa)'
  },
  an: {
    name: 'Dha Anywaa (Agnwa)',
    flag: '🌊',
    confirm: '✅ Dha Anywaa (Agnwa) oyere. Cok lok pa yot kom ma tye ka ret e yotdu kendo nyut ma i mito ki kony.',
    emergency: '🚨 Yɔt kom ma rac matek! Mani tye ka mito kony me pii woi i ot thieth. Citi coki i Gambella Referral Hospital kendo Abobo Hospital kiɛ cwol 907.',
    facilities: '🏥 Ot Thieth ma coki (Gambella & Anywaa Zone):\n• Gambella General Referral Hospital: +251 47 551 0023\n• Abobo Primary Hospital: +251 47 553 0110\n• Itang Health Centre (Baro)\n• Gog Health Centre\n\n📞 Cwol EPHI Hotline: 907'
  },
  nu: {
    name: 'Thok Naath (Nuer)',
    flag: '🌾',
    confirm: '✅ Thok Naath (Nuer) oyere. Kɔc cieem ni lɔŋ yot puaar. Thɔɔr ciey mi tɔɔ ke yotdu ma cie lɔŋ naaf lar.',
    emergency: '🚨 Kɔɔn mi rac ɛlŋ! Riek ɛmɛ rac. Ba lɔ i ot wal kɛ pɛth. Lɔ i Gambella General Hospital kiɛ Lare Hospital kɛ kɔɔn thɔɔk.',
    facilities: '🏥 Ot Wal ma cian (Gambella & Nuer Zone):\n• Gambella General Hospital: +251 47 551 0023\n• Lare Primary Hospital: +251 47 554 0092\n• Jikawo Health Centre\n• Wanthoa Health Centre\n\n📞 Cwol EPHI Hotline: 907'
  }
};

// Inline Language Selection Keyboard
const getLanguageKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🇪🇹 አማርኛ (Amharic)', 'lang_am'), Markup.button.callback('🌳 Afaan Oromoo', 'lang_om')],
    [Markup.button.callback('🌊 Dha Anywaa (Agnwa)', 'lang_an'), Markup.button.callback('🌾 Thok Naath (Nuer)', 'lang_nu')]
  ]);
};

// Quick Triage Reply Keyboards per language
const getQuickReplyKeyboard = (lang = 'am') => {
  const options = {
    am: [
      ['🦟 የወባ ትኩሳት', '💧 ተቅማጥና ማስታወክ'],
      ['🫁 የትንፋሽ ማጠር', '🐍 የእባብ ንክሻ'],
      ['🤰 የእርግዝና ሕመም', '🏥 የሆስፒታሎች አድራሻ'],
      ['🌐 ቋንቋ ቀይር', '🚨 አስቸኳይ እርዳታ (907)']
    ],
    om: [
      ['🦟 Ho\'a Busaa', '💧 Baasaa fi Dhangala\'aa'],
      ['🫁 Hafuura Kutaa', '🐍 Hidda Bofaa'],
      ['🤰 Ulfa / Mataa Bowwoo', '🏥 Buufataalee Fayyaa'],
      ['🌐 Jijjiiri Afaan', '🚨 Yaala Hatattamaa (907)']
    ],
    an: [
      ['🦟 Liet kom (Malaria)', '💧 Cado cwec (Diarrhea)'],
      ['🫁 Pwoor kom', '🐍 Ka thol ocoko'],
      ['🤰 Jwok me nywal', '🏥 Ot thieth coki'],
      ['🌐 Yer afan', '🚨 Yɔt rac matek (907)']
    ],
    nu: [
      ['🦟 Lieth puaar (Busaa)', '💧 Ciɛŋ puaar (AWD)'],
      ['🫁 Kɔɔl bum', '🐍 Riek thol (Snakebite)'],
      ['🤰 Lieth cieng', '🏥 Ot wal cian'],
      ['🌐 Yer thok', '🚨 Kɔɔn mi rac (907)']
    ]
  };
  return Markup.keyboard(options[lang] || options.am).resize();
};

// Clinical Rules Fallback Engine
function getFallbackTriage(text, lang) {
  const lower = text.toLowerCase();
  const isEmergency = 
    lower.includes('ትንፋሽ') || lower.includes('ደም') || lower.includes('እባብ') ||
    lower.includes('hafuura') || lower.includes('dhiiga') || lower.includes('bofa') ||
    lower.includes('pwoor') || lower.includes('remo') || lower.includes('thol') ||
    lower.includes('kɔɔl') || lower.includes('riɛm') || lower.includes('snake');

  const isMalaria = 
    lower.includes('ትኩሳት') || lower.includes('ወባ') || lower.includes('ብርድ') ||
    lower.includes('ho\'a') || lower.includes('busaa') ||
    lower.includes('liet') || lower.includes('del liet') ||
    lower.includes('lieth') || lower.includes('puaar');

  const isDiarrhea = 
    lower.includes('ተቅማጥ') || lower.includes('ማስታወክ') ||
    lower.includes('baasaa') || lower.includes('ol deebisuu') ||
    lower.includes('cado') || lower.includes('cwec') ||
    lower.includes('ciɛŋ');

  if (isEmergency) {
    const responses = {
      am: '🚨 *አስቸኳይ ማስጠንቀቂያ (EMERGENCY)*\n\nይህ አፋጣኝ የሕክምና ክትትል የሚሻ ሁኔታ ነው። እባክዎ በአቅራቢያዎ ወደሚገኝ ሆስፒታል ድንገተኛ ክፍል በአስቸኳይ ይሂዱ።\n\n📋 *ተግባራት:*\n• በሽተኛውን ሳይዘገዩ ወደ ሆስፒታል ይውሰዱ\n• ነፃ መስመር 907 ይደውሉ',
      om: '🚨 *Akeekkachiisa Hatattamaa (EMERGENCY)*\n\nHaalli kun yaala ariifachiisaa barbaada! Dafaatii gara hospitaala dhihoo jiru kan dhimma hatattamaatti deemaa.\n\n📋 *Tarkaanfii:*\n• Ariitiin gara hospitaalaa deemaa\n• Bilbila 907 fayyadamaa',
      an: '🚨 *Yɔt kom ma rac matek (EMERGENCY)*\n\nJuok ni rac matek! Citi coki i Gambella Referral Hospital kendo Abobo Hospital.\n\n📋 *Kony me pii woi:*\n• Citi i ot thieth ma coki matek\n• Cwol 907 me kony',
      nu: '🚨 *Kɔɔn mi rac ɛlŋ (EMERGENCY)*\n\nRiek ɛmɛ rac. Ba lɔ i ot wal kɛ pɛth i Gambella General Hospital kiɛ Lare Hospital.\n\n📋 *Kɔc cieem:*\n• Lɔ i ot wal kɛ pɛth\n• Cwol 907'
    };
    return responses[lang] || responses.am;
  }

  if (isMalaria) {
    const responses = {
      am: '🌡️ *የወባ ጥርጣሬ (HIGH RISK)*\n\nበጋምቤላና በቆላማ ወንዞች አካባቢ ትኩሳትና ብርድ የወባ ምልክት ሊሆን ይችላል።\n\n📋 *ተግባራት:*\n• በ24 ሰዓት ውስጥ የጤና ኬላ ወይም ጤና ጣቢያ ሄደው የደም ምርመራ (RDT) ያድርጉ\n• ንጹሕ ውኃ እና ፈሳሽ በብዛት ይጠጡ\n• ያለ ሐኪም ትዕዛዝ መድኃኒት አይውሰዱ',
      om: '🌡️ *Shakka Busaa (HIGH RISK)*\n\nNaannoo laggeeniifi ho\'aatti ho\'i qaamaafi hollannaan mallattoo busaa ta\'uu mala.\n\n📋 *Tarkaanfii:*\n• Sa\'aatii 24 keessatti buufata fayyaatti qorannoo dhiigaa (RDT) godhaa\n• Bishaan qulqulluu hedduu dhugaa',
      an: '🌡️ *Liet kom (Malaria - HIGH RISK)*\n\nE Gambella kendo bur Baro, liet kom kendo del ma tet nyut Busaa.\n\n📋 *Kony:*\n• Pim remo e ot thieth i ceng 24\n• Madhi pii ma ler mang\'eny',
      nu: '🌡️ *Lieth puaar (Busaa / Malaria - HIGH RISK)*\n\nKɛ Gambella, lieth puaar kɛ kuɛny ɛ nyut Busaa.\n\n📋 *Kɔc cieem:*\n• Pim riɛm i ot wal i run 24\n• Maath pii mi ŋuɛn'
    };
    return responses[lang] || responses.am;
  }

  if (isDiarrhea) {
    const responses = {
      am: '💧 *የተቅማጥ እና የውኃ ማጣት ክትትል (MODERATE)*\n\nየሰውነት ፈሳሽ እንዳያልቅ የኦ.አር.ኤስ (ORS) የጨው ውኃ መፍትሔ ያዘጋጁ።\n\n📋 *ተግባራት:*\n• የORS ውኃ በየጊዜው ይውሰዱ\n• ንጹሕ የተቀቀለ ውኃ ብቻ ይጠጡ\n• ከ2 ቀን በላይ ከቆየ ጤና ጣቢያ ይሂዱ',
      om: '💧 *Baasaa fi Dhabamuu Dhangala\'aa (MODERATE)*\n\nDhangala\'aa qaamaa eeguuf dafaatii soorata bishaanii (ORS) dhugaa.\n\n📋 *Tarkaanfii:*\n• ORS bishaaniin madaaltee dhugi\n• Bishaan danfe qabbanaa\'e dhugaa',
      an: '💧 *Cado cwec kendo pii ma rem (MODERATE)*\n\nPii ma tye ka cwec mito pii me ORS me madho.\n\n📋 *Kony:*\n• Madhi ORS ki pii ma ler\n• Ka pe chang citi i ot thieth',
      nu: '💧 *Ciɛŋ puaar kɛ pii mi ciet (MODERATE)*\n\nKɔɔn ciɛŋ puaar kɔc bi maath wal me ORS.\n\n📋 *Kɔc cieem:*\n• Maath ORS kɛ pii\n• Ka cie chang lɔ i ot wal'
    };
    return responses[lang] || responses.am;
  }

  const defaultMsg = {
    am: 'ስለገለጹት የጤና ሁኔታ እናመሰግናለን። ምልክቶችዎን በንቃት ይከታተሉ። በቂ እረፍት ያድርጉና ፈሳሽ ይውሰዱ። ምልክቶቹ ከበረቱ በአቅራቢያዎ የሚገኝ ጤና ጣቢያ ያማክሩ።',
    om: 'Odeeffannoo keessaniif galatoomaa. Mallattoolee isinitti mul\'atan sirriitti hordofaa. Boqonnaa fudhaa, dhangala\'aa dhugaa. Yoo hammaate buufata fayyaa dhaqaa.',
    an: 'Paj mi ni lok ma i nywuto. Yweyo matek kendo madh pii. Ka yɔt kom pe chang, citi i ot thieth ma coki.',
    nu: 'Yin lɔc kɛ lokdu. Kɔc cieem ni lɔŋ mi tɔɔ ke riek. Ciɛŋ pɛth kɛ bi maath pii. Ka cie chang lɔ i ot wal.'
  };

  return defaultMsg[lang] || defaultMsg.am;
}

// Call Gemini API if key is configured
async function getGeminiTriage(text, lang) {
  if (!GEMINI_API_KEY) return null;
  try {
    const langNames = {
      am: 'Amharic (አማርኛ)',
      om: 'Afaan Oromoo',
      an: 'Anywaa / Agnwa (Dha Anywaa)',
      nu: 'Nuer / Thok Naath'
    };
    const targetLangName = langNames[lang] || 'Amharic';

    const systemInstruction = 
      `You are TenaConsult, an Ethiopian clinical triage advisor for Primary Health Care Clinical Guidelines (EPHCG). ` +
      `Target Language: ${targetLangName}. ` +
      `Give clear, reassuring, and culturally sound clinical advice written strictly in ${targetLangName}. ` +
      `Include: 1) Risk level (Emergency / High / Moderate / Low) ` +
      `2) Immediate steps or first-aid ` +
      `3) Nearest facility level (Health Post, Health Centre, or Gambella/Regional Hospital). ` +
      `Keep message concise for Telegram.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
      contents: [{ role: 'user', parts: [{ text }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] }
    };

    const res = await axios.post(url, payload, { timeout: 8000 });
    const candidates = res.data?.candidates;
    if (candidates && candidates.length > 0) {
      return candidates[0].content?.parts?.[0]?.text;
    }
  } catch (err) {
    console.warn('Gemini API call failed, using clinical fallback engine:', err.message);
  }
  return null;
}

// --- BOT HANDLERS ---

// /start command
bot.start(async (ctx) => {
  const welcomeText = 
    '🏥 *Welcome to TenaConsult Health Bot | የጤና ኮንሰልት*\n\n' +
    '🇪🇹 *አማርኛ:* እባክዎ የሚፈልጉትን ቋንቋ ይምረጡ።\n' +
    '🌳 *Afaan Oromoo:* Maaloo afaan filadhaa.\n' +
    '🌊 *Dha Anywaa:* Yer afan ma i mito me gweyo.\n' +
    '🌾 *Thok Naath:* Maaloo yer thok ma i nhiaar.\n\n' +
    'ℹ️ _Advisory only under Ethiopian Primary Health Care Clinical Guidelines._';

  await ctx.replyWithMarkdown(welcomeText, getLanguageKeyboard());
});

// /language command
bot.command('language', async (ctx) => {
  await ctx.reply('🌐 Please choose your language / ቋንቋ ይምረጡ:', getLanguageKeyboard());
});

// /emergency command
bot.command('emergency', async (ctx) => {
  const userId = ctx.from.id;
  const lang = userLanguage.get(userId) || 'am';
  await ctx.reply(LANGUAGES[lang].emergency);
});

// /facilities command
bot.command('facilities', async (ctx) => {
  const userId = ctx.from.id;
  const lang = userLanguage.get(userId) || 'am';
  await ctx.reply(LANGUAGES[lang].facilities);
});

// /help command
bot.command('help', async (ctx) => {
  const helpText = 
    'ℹ️ *TenaConsult Bot Commands:*\n' +
    '/start - Restart bot and select language\n' +
    '/language - Switch language (Amharic, Afaan Oromo, Anywaa, Nuer)\n' +
    '/emergency - Urgent medical danger signs & 907 hotline\n' +
    '/facilities - Referral hospital phone numbers\n' +
    '/help - Show this guide\n\n' +
    'Simply type your symptoms (e.g. "I have severe fever and chills") to receive clinical triage.';
  await ctx.replyWithMarkdown(helpText);
});

// Handle Language Inline Buttons
['am', 'om', 'an', 'nu'].forEach((lang) => {
  bot.action(`lang_${lang}`, async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    userLanguage.set(userId, lang);

    const langInfo = LANGUAGES[lang];
    await ctx.reply(langInfo.confirm, getQuickReplyKeyboard(lang));
  });
});

// Handle Text & Quick Keyboard Messages
bot.on('text', async (ctx) => {
  const userText = ctx.message.text.trim();
  const userId = ctx.from.id;

  // Language switch shortcuts
  if (userText === '🌐 ቋንቋ ቀይር' || userText === '🌐 Jijjiiri Afaan' || userText === '🌐 Yer afan' || userText === '🌐 Yer thok') {
    return ctx.reply('🌐 Please choose your language / ቋንቋ ይምረጡ:', getLanguageKeyboard());
  }

  // Emergency shortcuts
  if (userText.includes('907') || userText.includes('አስቸኳይ') || userText.includes('Hatattamaa')) {
    const lang = userLanguage.get(userId) || 'am';
    return ctx.reply(LANGUAGES[lang].emergency);
  }

  // Facilities shortcuts
  if (userText.includes('ሆስፒታል') || userText.includes('Buufataalee') || userText.includes('Ot thieth') || userText.includes('Ot wal')) {
    const lang = userLanguage.get(userId) || 'am';
    return ctx.reply(LANGUAGES[lang].facilities);
  }

  // Retrieve user's selected language (persistent in memory)
  const currentLang = userLanguage.get(userId) || 'am';

  await ctx.sendChatAction('typing');

  try {
    // 1. Try Gemini AI triage
    let advice = await getGeminiTriage(userText, currentLang);

    // 2. If Gemini is not configured or failed, use local clinical rule engine
    if (!advice) {
      advice = getFallbackTriage(userText, currentLang);
    }

    await ctx.reply(advice, getQuickReplyKeyboard(currentLang));
  } catch (error) {
    console.error('Error handling message:', error);
    await ctx.reply('ይቅርታ፣ እባክዎ እንደገና ይሞክሩ ወይም ለአስቸኳይ ጊዜ ወደ 907 ይደውሉ።');
  }
});

// Handle Voice Messages
bot.on('voice', async (ctx) => {
  const userId = ctx.from.id;
  const currentLang = userLanguage.get(userId) || 'am';
  
  const voiceAcks = {
    am: '🎙️ የድምፅ መልእክትዎን ተቀብያለሁ። ለተሻለ ትንተና እባክዎ ዋናውን ምልክት በጽሑፍም ያጋሩኝ ወይም ከታች ካሉት አማራጮች አንዱን ይጫኑ።',
    om: '🎙️ Sagalee keessan simadheera. Qorannoo guutuuf mallattoolee keessan barreeffamaan naaf ergaa.',
    an: '🎙️ Dwol ma i coki orwako. Kony me gweyo barreeffamaan naaf ergaa.',
    nu: '🎙️ Ca dwoldu ŋic. Kɔc cieem tye ka nɛny. Lar kɛ gɔr.'
  };

  await ctx.reply(voiceAcks[currentLang] || voiceAcks.am, getQuickReplyKeyboard(currentLang));
});

// Launch bot
bot.launch().then(() => {
  console.log('✅ TenaConsult Telegram Bot is running successfully in 4 languages!');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
