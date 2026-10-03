const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api/v1';

const bot = new Telegraf(BOT_TOKEN);

// Language Selection Keyboards
const langKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('አማርኛ (Amharic)', 'lang_am')],
  [Markup.button.callback('Afaan Oromoo', 'lang_om')],
  [Markup.button.callback('Anyuak (Agnwa)', 'lang_an')],
  [Markup.button.callback('Nuer (Nueer)', 'lang_nu')]
]);

bot.start((ctx) => {
  return ctx.reply(
    'ሰላም! ጤና ይስጥልኝ። ደህና መጡ። እባክዎ የሚወዱትን ቋንቋ ይምረጡ።\n' +
    'Akkam! Baga nagaan dhuftan. Maaloo afaan filadhaa.\n' +
    'Paj mi! Pa yot kom. Yer afan ma miy.\n' +
    'Ciet! Mi cɛt nɛy. Thɔɔr ciey.',
    langKeyboard
  );
});

// Handle Language Selections
['am', 'om', 'an', 'nu'].forEach((lang) => {
  bot.action(`lang_${lang}`, async (ctx) => {
    await ctx.answerCbQuery();
    // Here you would typically make an API call to save the user's language choice in PostgreSQL
    const confirmation = {
      am: 'ቋንቋዎ አማርኛ ተደርጎ ተስተካክሏል። ስለጤናዎ ሁኔታ የሚሰማዎትን ይንገሩኝ።',
      om: 'Afaan keessan Afaan Oromoo ta’eera. Waa’ee haala fayyaa keessanii naaf ibsaa.',
      an: 'Wii mi dwok yot kom. Cok lok pa yot kom ma i nywuto.',
      nu: 'Thɔɔr ni cɛt. Kɔc cieem ni lɔŋ.'
    };
    return ctx.reply(confirmation[lang]);
  });
});

// Handle incoming text messages
bot.on('text', async (ctx) => {
  try {
    const userText = ctx.message.text;
    const telegramId = ctx.from.id;
    
    // Defaulting to Amharic for demo, retrieve dynamically from DB in production
    const response = await axios.post(`${API_BASE_URL}/triage`, {
      telegram_id: telegramId,
      text: userText,
      language_code: 'am' 
    });

    await ctx.reply(response.data.response_text);
  } catch (error) {
    console.error('Error communicating with backend:', error);
    await ctx.reply('ይቅርታ፣ የአገልግሎት ማቋረጥ አጋጥሟል። እባክዎ እንደገና ይሞክሩ።');
  }
});

bot.launch().then(() => {
  console.log('Telegram Health Bot is running...');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));