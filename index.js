require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const RSSParser = require('rss-parser');
const express = require('express');

// 1. Server for Render (Uptime ke liye)
const app = express();
app.get('/', (req, res) => res.send('<h1>Direct Lead Scout Online (No AI)</h1>'));
app.get('/ping', (req, res) => res.send('Bot is Alive!'));
app.listen(process.env.PORT || 3000);

const leadBot = new Telegraf(process.env.LEAD_BOT_TOKEN); 
const logBot = new Telegraf(process.env.LOG_BOT_TOKEN);   
const parser = new RSSParser();

const LOG_ADMIN = process.env.MY_CHAT_ID; 
const rawIds = process.env.LEAD_USER_IDS || "";
const LEAD_USERS = rawIds.split(',').map(id => id.trim()).filter(id => id.length > 5);

// 2. Memory: Same lead dobara na aaye isliye Set
const processedLeads = new Set(); 

// 3. Mega Keyword List (Pure 150+)
const KEYWORD_LIST = ["hiring", "freelance", "automation script", "business automation", "python automation", "custom automation tool", "internal tool development", "workflow automation", "process automation", "api integration", "api implementation", "webhook setup", "third party api integration", "backend integration", "backend optimization", "backend bug fixing", "performance optimization", "code refactoring", "legacy code cleanup", "database optimization", "database migration", "data migration", "mysql optimization", "postgresql optimization", "firebase integration", "authentication setup", "payment gateway integration", "stripe integration", "razorpay integration", "paypal integration", "saas customization", "saas backend", "saas mvp development", "mvp development", "feature implementation", "feature enhancement", "existing project improvements", "urgent bug fixing", "production bug fix", "hotfix required", "system debugging", "error fixing", "scalability improvement", "cloud deployment", "aws setup", "server optimization", "linux server setup", "cron job automation", "script to automate tasks", "internal dashboard development", "admin panel development", "reporting dashboard", "analytics dashboard", "custom reporting tool", "android app bug fixing", "android app enhancement", "android app maintenance", "android feature addition", "existing android app update", "ios app bug fixing", "ios feature implementation", "flutter app fixes", "react native app fixes", "app performance optimization", "app backend support", "app api integration", "mobile app maintenance", "firebase crash fix", "app publishing support", "play store issue fix", "app store submission help", "bookkeeping cleanup", "messy books cleanup", "accounting cleanup", "accounts reconciliation", "bank reconciliation", "financial reconciliation", "quickbooks setup", "quickbooks cleanup", "xero migration", "tally data migration", "accounting system setup", "invoice system setup", "billing system setup", "gst filing support", "tax compliance support", "financial reporting automation", "excel accounting model", "cashflow tracking", "profit loss reporting", "balance sheet preparation", "audit support", "payroll setup", "payroll automation", "process optimization", "operations setup", "business operations support", "startup operations", "founder support", "internal process setup", "workflow documentation", "standard operating procedures", "sop creation", "crm implementation", "crm setup", "crm customization", "hubspot setup", "zoho crm customization", "salesforce setup", "crm cleanup", "crm data migration", "notion workspace setup", "clickup setup", "project coordination support", "operations consultant", "internal systems setup", "lead generation setup", "b2b lead generation", "lead sourcing", "sales funnel setup", "funnel optimization", "cold outreach automation", "email automation setup", "appointment setting", "crm pipeline optimization", "sales ops", "sales automation", "outreach system setup", "linkedin outreach automation", "prospect list building", "market research support", "competitor analysis", "revenue operations", "growth operations", "data scraping", "web scraping", "data extraction", "scraping script", "automation scraper", "excel automation", "google sheets automation", "reporting automation", "dashboard automation", "ai workflow automation", "chatbot backend integration", "ai api integration", "openai api integration", "internal ai tools", "custom ai tool", "business ai automation", "migration support", "implementation support", "integration support", "system setup", "platform setup", "maintenance support", "technical support", "ongoing support", "long term support", "retainer support"];

const logToBot = (msg) => {
    console.log(`[LOG]: ${msg}`);
    logBot.telegram.sendMessage(LOG_ADMIN, `⚙️ [LOG]: ${msg}`).catch(() => {});
};

// 4. Batch Scouting (No AI filtering)
async function scout() {
    logToBot("🛰️ Scouting batches (Direct Mode)...");
    const subs = "forhire+jobbit+slavelabour+SaaS+SideProject+freelance_forhire+AppDev+Accounting";
    const batchSize = 30;

    for (let i = 0; i < KEYWORD_LIST.length; i += batchSize) {
        const batch = KEYWORD_LIST.slice(i, i + batchSize).join(" OR ");
        const url = `https://www.reddit.com/r/${subs}/search.rss?q=${encodeURIComponent(batch)}&sort=new&restrict_sr=on`;

        try {
            const feed = await parser.parseURL(url);
            logToBot(`Batch ${Math.floor(i/batchSize) + 1}: Found ${feed.items.length} potential posts.`);

            for (const item of feed.items) {
                // Duplicate check
                if (processedLeads.has(item.id)) continue;
                processedLeads.add(item.id);

                // DIRECT BROADCAST: Koi AI filter nahi
                const msg = `📍 **Direct Lead Found**\n🔥 **Title:** ${item.title}\n-------------------\n📝 **Snippet:** ${item.contentSnippet ? item.contentSnippet.substring(0, 200) + "..." : "No description."}\n-------------------\n⚡ **Status:** Direct Match (No AI Score)`;

                for (const userId of LEAD_USERS) {
                    try {
                        await leadBot.telegram.sendMessage(userId, msg, Markup.inlineKeyboard([[Markup.button.url('🔗 Open Post', item.link)]]));
                    } catch (e) {
                        logToBot(`🚨 Send Error: ${e.message}`);
                    }
                }
            }
        } catch (err) { logToBot(`🚨 Batch Error: ${err.message}`); }
    }
    logToBot("💤 Cycle complete. Waiting 3 mins.");
}

// Memory reset har 24h mein
setInterval(() => processedLeads.clear(), 86400000);

// EXECUTION
logToBot("🚀 Engine Online (Direct Broadcast Mode).");
scout();
setInterval(scout, 180000); // 3-minute cycle

leadBot.launch();
logBot.launch();
