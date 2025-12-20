require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const RSSParser = require('rss-parser');
const axios = require('axios');
const express = require('express');

const app = express();
app.get('/', (req, res) => res.send('<h1>Ultimate Hinglish Scout Bot Online!</h1>'));
app.get('/ping', (req, res) => res.send('Bot is Alive!'));
app.listen(process.env.PORT || 3000);

const leadBot = new Telegraf(process.env.LEAD_BOT_TOKEN); 
const logBot = new Telegraf(process.env.LOG_BOT_TOKEN);   
const parser = new RSSParser();

// Multi-user Setup
const LOG_ADMIN = process.env.MY_CHAT_ID; 
const LEAD_USERS = process.env.LEAD_USER_IDS.split(','); 

const processedLeads = new Set(); 

// MEGA KEYWORD LIST (Added everything you sent)
const KEYWORDS = [
    "hiring", "freelance", "automation script", "business automation", "python automation", "custom automation tool", "internal tool development", "workflow automation", "process automation", "api integration", "api implementation", "webhook setup", "third party api integration", "backend integration", "backend optimization", "backend bug fixing", "performance optimization", "code refactoring", "legacy code cleanup", "database optimization", "database migration", "data migration", "mysql optimization", "postgresql optimization", "firebase integration", "authentication setup", "payment gateway integration", "stripe integration", "razorpay integration", "paypal integration", "saas customization", "saas backend", "saas mvp development", "mvp development", "feature implementation", "feature enhancement", "existing project improvements", "urgent bug fixing", "production bug fix", "hotfix required", "system debugging", "error fixing", "scalability improvement", "cloud deployment", "aws setup", "server optimization", "linux server setup", "cron job automation", "script to automate tasks", "internal dashboard development", "admin panel development", "reporting dashboard", "analytics dashboard", "custom reporting tool",
    "android app bug fixing", "android app enhancement", "android app maintenance", "android feature addition", "existing android app update", "ios app bug fixing", "ios feature implementation", "flutter app fixes", "react native app fixes", "app performance optimization", "app backend support", "app api integration", "mobile app maintenance", "firebase crash fix", "app publishing support", "play store issue fix", "app store submission help",
    "bookkeeping cleanup", "messy books cleanup", "accounting cleanup", "accounts reconciliation", "bank reconciliation", "financial reconciliation", "quickbooks setup", "quickbooks cleanup", "xero migration", "tally data migration", "accounting system setup", "invoice system setup", "billing system setup", "gst filing support", "tax compliance support", "financial reporting automation", "excel accounting model", "cashflow tracking", "profit loss reporting", "balance sheet preparation", "audit support", "payroll setup", "payroll automation",
    "process optimization", "operations setup", "business operations support", "startup operations", "founder support", "internal process setup", "workflow documentation", "standard operating procedures", "sop creation", "crm implementation", "crm setup", "crm customization", "hubspot setup", "zoho crm customization", "salesforce setup", "crm cleanup", "crm data migration", "notion workspace setup", "clickup setup", "project coordination support", "operations consultant", "internal systems setup",
    "lead generation setup", "b2b lead generation", "lead sourcing", "sales funnel setup", "funnel optimization", "cold outreach automation", "email automation setup", "appointment setting", "crm pipeline optimization", "sales ops", "sales automation", "outreach system setup", "linkedin outreach automation", "prospect list building", "market research support", "competitor analysis", "revenue operations", "growth operations",
    "data scraping", "web scraping", "data extraction", "scraping script", "automation scraper", "excel automation", "google sheets automation", "reporting automation", "dashboard automation", "ai workflow automation", "chatbot backend integration", "ai api integration", "openai api integration", "internal ai tools", "custom ai tool", "business ai automation",
    "migration support", "implementation support", "integration support", "system setup", "platform setup", "maintenance support", "technical support", "ongoing support", "long term support", "retainer support"
].join(" OR ");

const logToBot = (msg) => {
    console.log(`[DEBUG]: ${msg}`);
    logBot.telegram.sendMessage(LOG_ADMIN, `⚙️ [LOG]: ${msg}`).catch(() => {});
};

async function analyzeWithAI(title, content) {
    try {
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "mistralai/mistral-7b-instruct:free", 
            messages: [
                { 
                    role: "system", 
                    content: `You are a Lead Analyst. 
                    - Give a score (1-100) based on AI feasibility.
                    - If the job is about CRM, Accounting, Automation, or Backend, be generous (Score 55+).
                    - Write a 2-line "Bhai-to-Bhai Advice" in HINGLISH explaining how to use AI to finish the job.
                    - Write a short professional pitch.
                    Output ONLY raw JSON: {"score": number, "explanation": "text", "pitch": "text"}` 
                },
                { role: "user", content: `Lead: ${title} - ${content}` }
            ]
        }, {
            headers: { 
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        let rawContent = response.data.choices[0].message.content;
        const cleanJson = rawContent.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (err) { return null; }
}

async function scout() {
    logToBot("🔍 Scouting mega-list...");
    const subs = "forhire+jobbit+slavelabour+SaaS+SideProject+freelance_forhire+AppDev+Accounting";
    const url = `https://www.reddit.com/r/${subs}/search.rss?q=${encodeURIComponent(KEYWORDS)}&sort=new&restrict_sr=on`;

    try {
        const feed = await parser.parseURL(url);
        logToBot(`Found ${feed.items.length} potential matches.`);

        for (const item of feed.items) {
            if (processedLeads.has(item.id)) continue;
            processedLeads.add(item.id);

            const ai = await analyzeWithAI(item.title, item.contentSnippet || "");
            
            // Score threshold set to 50
            if (ai && ai.score >= 50) {
                const msg = `
📍 **New Lead Detected**
🔥 **Title:** ${item.title}
-------------------
💡 **Bhai-to-Bhai Advice:** ${ai.explanation}
-------------------
🤖 **Draft Pitch:** "${ai.pitch}"
-------------------
⚡ **AI Score:** ${ai.score}%`;

                LEAD_USERS.forEach(userId => {
                    leadBot.telegram.sendMessage(userId.trim(), msg, Markup.inlineKeyboard([[Markup.button.url('🔗 Open Post', item.link)]]))
                    .catch(e => logToBot(`Send Error to ${userId}: ${e.message}`));
                });
            }
        }
    } catch (err) { logToBot(`Scraper Error: ${err.message}`); }
}

scout();
setInterval(scout, 180000); 

leadBot.launch();
logBot.launch();
logToBot("🚀 Ultimate Engine Online (150+ Keywords).");
