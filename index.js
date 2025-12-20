require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const RSSParser = require('rss-parser');
const express = require('express');
const Groq = require('groq-sdk');

// 1. Express Server (Render Uptime ke liye)
const app = express();
app.get('/', (req, res) => res.send('<h1>Lead Scout System Online</h1>'));
app.get('/ping', (req, res) => res.send('Bot is Alive!'));
app.listen(process.env.PORT || 3000, () => console.log('Server started'));

// 2. Initialize Bots and AI
const leadBot = new Telegraf(process.env.LEAD_BOT_TOKEN); // Goldmine Bot
const logBot = new Telegraf(process.env.LOG_BOT_TOKEN);   // Debug/Log Bot
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY }); 
const parser = new RSSParser();

const MY_ID = process.env.MY_CHAT_ID;
const processedLeads = new Set(); 

// 3. Massive Keyword List (Updated)
const KEYWORDS = [
    "hiring", "researching", "finding", "freelance", "jobs", "task", "projects", "hire", 
    "opportunity", "work", "paying", "companies", "freelancing", "applying", "process", 
    "wfh", "hirable", "apply", "employers", "freshers", "app", "development", "python", 
    "flutter", "node.js", "automation", "advertising", "marketing", "seo", "accounting", 
    "ledger", "invoice", "crypto", "scraping", "ai agent", "chatbot", "saas", "mvp"
].join(" OR ");

const logToBot = (msg) => {
    console.log(`[DEBUG]: ${msg}`);
    logBot.telegram.sendMessage(MY_ID, `⚙️ [DEBUG]: ${msg}`).catch(() => {});
};

// 4. AI Analysis Logic (Llama 3.3 Updated)
async function analyzeWithAI(title, content) {
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are an AI Fulfillment Expert. Analyze leads for 100% AI fulfillment. Output ONLY JSON: { \"score\": number, \"process\": \"steps\", \"pitch\": \"text\" }" },
                { role: "user", content: `Lead: ${title} - ${content}` }
            ],
            model: "llama-3.3-70b-versatile", // Latest supported Groq model
            response_format: { type: "json_object" }
        });
        return JSON.parse(chatCompletion.choices[0].message.content);
    } catch (err) { 
        logToBot(`AI Error: ${err.message}`);
        return null; 
    }
}

// 5. Scraper Logic
async function scout() {
    logToBot("🔍 Scouting latest leads...");
    // Sabse high-quality hiring subreddits
    const subs = "forhire+jobbit+slavelabour+SaaS+SideProject+freelance_forhire+remotejs";
    const url = `https://www.reddit.com/r/${subs}/search.rss?q=${encodeURIComponent(KEYWORDS)}&sort=new&restrict_sr=on`;

    try {
        const feed = await parser.parseURL(url);
        logToBot(`Found ${feed.items.length} potential posts.`);

        for (const item of feed.items) {
            if (processedLeads.has(item.id)) continue;
            processedLeads.add(item.id);

            const aiData = await analyzeWithAI(item.title, item.contentSnippet || "");
            
            // Notification if AI score is high
            if (aiData && aiData.score > 80) {
                const message = `
📍 **Platform:** Reddit
🔥 **Lead:** ${item.title}
-------------------
🤖 **Draft:** "${aiData.pitch}"
-------------------
⚡ **AI Process (${aiData.score}%):** ${aiData.process}`;

                leadBot.telegram.sendMessage(MY_ID, message, Markup.inlineKeyboard([
                    [Markup.button.url('🔗 Open Lead', item.link)]
                ]));
            }
        }
    } catch (err) { 
        logToBot(`Scrape Error: ${err.message}`); 
    }
}

// SCRAPER START
scout(); // Pehli baar turant chalega
setInterval(scout, 180000); // Har 3 minute mein check karega

leadBot.launch();
logBot.launch();
logToBot("🚀 Engine Running (Llama 3.3 - 3 Min Cycle).");
