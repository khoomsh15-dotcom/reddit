require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const RSSParser = require('rss-parser');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('<h1>Multi-User Scout Bot Online!</h1>'));
app.get('/ping', (req, res) => res.send('Bot is Alive!'));
app.listen(process.env.PORT || 3000);

const leadBot = new Telegraf(process.env.LEAD_BOT_TOKEN); 
const logBot = new Telegraf(process.env.LOG_BOT_TOKEN);   
const parser = new RSSParser();

// IMPORTANT: Multi-user setup
const LOG_ADMIN = process.env.MY_CHAT_ID; // Errors sirf yahan jayenge
const LEAD_USERS = process.env.LEAD_USER_IDS.split(','); // Leads in sabko jayengi

const processedLeads = new Set(); 
const KEYWORDS = ["hiring", "freelance", "flutter", "node.js", "python", "automation", "advertising", "marketing", "accounting", "ai agent", "saas", "task", "projects"].join(" OR ");

// Log function: Sirf Admin ko message bhejta hai
const logToBot = (msg) => {
    console.log(`[DEBUG]: ${msg}`);
    logBot.telegram.sendMessage(LOG_ADMIN, `⚙️ [LOG]: ${msg}`).catch(() => {});
};

async function analyzeWithAI(title, content) {
    try {
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "mistralai/mistral-7b-instruct:free", 
            messages: [
                { role: "system", content: "Analyze this lead. Score 1-100. Explain in 2 lines of HINGLISH how to finish this. Write a short pitch. Output ONLY JSON: {\"score\": number, \"explanation\": \"text\", \"pitch\": \"text\"}" },
                { role: "user", content: `Lead: ${title} - ${content}` }
            ]
        }, {
            headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}` }
        });
        const data = response.data.choices[0].message.content;
        return JSON.parse(data.replace(/```json|```/g, ''));
    } catch (err) { return null; }
}

async function scout() {
    logToBot("🔍 Scouting latest leads...");
    const subs = "forhire+jobbit+slavelabour+SaaS+SideProject+freelance_forhire";
    const url = `https://www.reddit.com/r/${subs}/search.rss?q=${encodeURIComponent(KEYWORDS)}&sort=new&restrict_sr=on`;

    try {
        const feed = await parser.parseURL(url);
        logToBot(`Found ${feed.items.length} potential posts.`);

        for (const item of feed.items) {
            if (processedLeads.has(item.id)) continue;
            processedLeads.add(item.id);

            const ai = await analyzeWithAI(item.title, item.contentSnippet || "");
            
            // Score threshold set to 50 as requested
            if (ai && ai.score >= 50) {
                const msg = `📍 **New Lead Found**\n🔥 **Title:** ${item.title}\n-------------------\n💡 **Advice:** ${ai.explanation}\n-------------------\n🤖 **Pitch:** "${ai.pitch}"\n-------------------\n⚡ **AI Score:** ${ai.score}%`;

                // Loop: Sabhi lead users ko bhejta hai
                LEAD_USERS.forEach(userId => {
                    leadBot.telegram.sendMessage(userId.trim(), msg, Markup.inlineKeyboard([[Markup.button.url('🔗 Open Post', item.link)]]))
                    .catch(e => logToBot(`Error sending to ${userId}: ${e.message}`));
                });
            }
        }
    } catch (err) { logToBot(`Error: ${err.message}`); }
}

scout();
setInterval(scout, 180000); 

leadBot.launch();
logBot.launch();
logToBot("🚀 Multi-User Engine Online.");
