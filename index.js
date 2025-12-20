require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const RSSParser = require('rss-parser');

const leadBot = new Telegraf(process.env.LEAD_BOT_TOKEN); 
const logBot = new Telegraf(process.env.LOG_BOT_TOKEN);   
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const parser = new RSSParser();

const MY_ID = process.env.MY_CHAT_ID;
const processedLeads = new Set(); 

// Massive 2025 High-Intent Keyword List
const KEYWORDS = [
    "hiring", "freelance", "task", "projects", "opportunity", "wfh", "remote", "intern", 
    "flutter", "node.js", "python", "automation", "advertising", "marketing", "seo",
    "accounting", "ledger", "invoice", "crypto", "scraping", "ai agent", "chatbot",
    "saas", "mvp", "fintech", "dashboard", "google apps script", "zapier", "make.com"
].join(" OR ");

const logToBot = (msg) => {
    logBot.telegram.sendMessage(MY_ID, `⚙️ [DEBUG]: ${msg}`).catch(e => {});
};

async function analyzeWithAI(title, content) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `
        Analyze this lead for 100% AI fulfillment.
        Lead: ${title} - ${content}
        
        Rules:
        1. If it's a scam, unpaid, or equity-only, score is 0.
        2. Score (1-100) based on how fast AI tools (Cursor, v0.dev, Claude, Midjourney) can finish it.
        3. Write a short, technical pitch focusing on speed and AI automation. Do not mention age or past experience.
        
        Output JSON: { "score": number, "process": "steps", "pitch": "text" }`;
        
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json|```/g, '');
        return JSON.parse(text);
    } catch (err) {
        logToBot(`AI Error: ${err.message}`);
        return null;
    }
}

async function scout() {
    logToBot("🔍 Scouting latest leads...");
    
    // Target the highest quality "hiring" subreddits
    const subs = "forhire+jobbit+slavelabour+freelance_forhire+remotejs+SaaS+SideProject+appdev";
    const url = `https://www.reddit.com/r/${subs}/search.rss?q=${encodeURIComponent(KEYWORDS)}&sort=new&restrict_sr=on`;

    try {
        const feed = await parser.parseURL(url);
        for (const item of feed.items) {
            if (processedLeads.has(item.id)) continue;
            processedLeads.add(item.id);

            const aiData = await analyzeWithAI(item.title, item.contentSnippet || "");
            
            // Only notify if it's high quality (> 80%)
            if (aiData && aiData.score > 80) {
                const message = `
📍 **Platform:** Reddit
🔥 **Lead:** ${item.title}
💰 **Budget:** Check post
📝 **Details:** ${item.contentSnippet?.substring(0, 150)}...
-------------------
🤖 **Draft Message:** "${aiData.pitch}"
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

// 4 Minutes is the optimal "Safety vs. Speed" balance
setInterval(scout, 240000); 

logToBot("🚀 Engine Running. Monitoring SaaS, Tech, and Freelance hubs.");
leadBot.launch();
logBot.launch();

