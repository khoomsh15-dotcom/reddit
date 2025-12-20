require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const RSSParser = require('rss-parser');
const express = require('express');
const Groq = require('groq-sdk'); // Make sure to npm install groq-sdk

const app = express();
app.get('/', (req, res) => res.send('<h1>Scout Bot is Live (Free Engine)</h1>'));
app.listen(process.env.PORT || 3000);

const leadBot = new Telegraf(process.env.LEAD_BOT_TOKEN); 
const logBot = new Telegraf(process.env.LOG_BOT_TOKEN);   
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY }); 
const parser = new RSSParser();

const MY_ID = process.env.MY_CHAT_ID;
const processedLeads = new Set(); 

// Massive 2025 High-Intent Keyword List
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

async function analyzeWithAI(title, content) {
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are an AI Fulfillment Expert. Analyze leads for 100% AI fulfillment. Output ONLY JSON: { \"score\": number, \"process\": \"steps\", \"pitch\": \"text\" }" },
                { role: "user", content: `Lead: ${title} - ${content}` }
            ],
            model: "llama3-70b-8192", // High quality free model
            response_format: { type: "json_object" }
        });
        return JSON.parse(chatCompletion.choices[0].message.content);
    } catch (err) { 
        logToBot(`AI Error: ${err.message}`);
        return null; 
    }
}

async function scout() {
    logToBot("🔍 Scouting latest leads...");
    const subs = "forhire+jobbit+slavelabour+SaaS+SideProject+freelance_forhire";
    const url = `https://www.reddit.com/r/${subs}/search.rss?q=${encodeURIComponent(KEYWORDS)}&sort=new&restrict_sr=on`;

    try {
        const feed = await parser.parseURL(url);
        for (const item of feed.items) {
            if (processedLeads.has(item.id)) continue;
            processedLeads.add(item.id);

            const aiData = await analyzeWithAI(item.title, item.contentSnippet || "");
            if (aiData && aiData.score > 80) {
                const message = `📍 **Platform:** Reddit\n🔥 **Lead:** ${item.title}\n-------------------\n🤖 **Draft:** "${aiData.pitch}"\n-------------------\n⚡ **AI Process (${aiData.score}%):** ${aiData.process}`;
                leadBot.telegram.sendMessage(MY_ID, message, Markup.inlineKeyboard([[Markup.button.url('🔗 Open Lead', item.link)]]));
            }
        }
    } catch (err) { logToBot(`Scrape Error: ${err.message}`); }
}

scout(); // Immediate run
setInterval(scout, 180000); // 3-minute interval

leadBot.launch();
logBot.launch();
logToBot("🚀 Engine Running (3-Min Cycle).");
