require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const RSSParser = require('rss-parser');
const express = require('express');

// Express Server for Render Uptime
const app = express();
// ADDED: Root route to avoid "Cannot GET /"
app.get('/', (req, res) => res.send('<h1>Lead Scout is Online!</h1><p>Check your Telegram Log Bot for status.</p>'));
app.get('/ping', (req, res) => res.send('Bot is Alive!'));
app.listen(process.env.PORT || 3000, () => console.log(`Web server running on port ${process.env.PORT || 3000}`));

const leadBot = new Telegraf(process.env.LEAD_BOT_TOKEN); 
const logBot = new Telegraf(process.env.LOG_BOT_TOKEN);   
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const parser = new RSSParser();

const MY_ID = process.env.MY_CHAT_ID;
const processedLeads = new Set(); 

const KEYWORDS = ["hiring", "freelance", "flutter", "node.js", "python", "automation", "advertising", "marketing", "accounting", "crypto", "scraping", "ai", "saas"].join(" OR ");

// IMPROVED: Added console.log so you can see errors in Render Dashboard
const logToBot = (msg) => {
    console.log(`[DEBUG]: ${msg}`);
    logBot.telegram.sendMessage(MY_ID, `⚙️ [DEBUG]: ${msg}`).catch((err) => console.error("Telegram Log Error:", err.description));
};

async function analyzeWithAI(title, content) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `Analyze this lead for 100% AI fulfillment. Lead: ${title} - ${content}. Output JSON: { "score": number, "process": "steps", "pitch": "text" }`;
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json|```/g, '');
        return JSON.parse(text);
    } catch (err) { 
        console.error("AI Analysis Error:", err);
        return null; 
    }
}

async function scout() {
    logToBot("🔍 Checking for new Leads...");
    const subs = "forhire+jobbit+slavelabour+SaaS+SideProject";
    const url = `https://www.reddit.com/r/${subs}/search.rss?q=${encodeURIComponent(KEYWORDS)}&sort=new&restrict_sr=on`;

    try {
        const feed = await parser.parseURL(url);
        logToBot(`Found ${feed.items.length} posts on Reddit.`);
        for (const item of feed.items) {
            if (processedLeads.has(item.id)) continue;
            processedLeads.add(item.id);

            const aiData = await analyzeWithAI(item.title, item.contentSnippet || "");
            if (aiData && aiData.score > 80) {
                const message = `📍 **Platform:** Reddit\n🔥 **Lead:** ${item.title}\n🤖 **Draft:** "${aiData.pitch}"\n⚡ **AI Process:** ${aiData.process}`;
                leadBot.telegram.sendMessage(MY_ID, message, Markup.inlineKeyboard([[Markup.button.url('🔗 Open', item.link)]]));
            }
        }
    } catch (err) { 
        logToBot(`Scrape Error: ${err.message}`); 
    }
}

// Start Scraper immediately on launch
scout(); 
// Then run every 4 minutes
setInterval(scout, 240000); 

leadBot.launch();
logBot.launch();
logToBot("🚀 Engine Started. Scraper is running.");
