const express = require('express');
const { Telegraf } = require('telegraf');
const axios = require('axios');
const dns = require('dns').promises;

// 1. WEB SERVER & PORT (For UptimeRobot)
const app = express();
const PORT = process.env.PORT || 10000; 

app.get('/', (req, res) => {
    res.send('<body style="background:#000;color:#0f0;font-family:monospace;padding:50px;"><h1>🟢 EXODUS ENGINE: ONLINE</h1><p>Bot is actively hunting HQ leads...</p></body>');
});

app.listen(PORT, () => console.log(`🚀 Web Interface live on Port ${PORT}`));

// 2. BOT INITIALIZATION
const logBot = new Telegraf(process.env.LOG_BOT_TOKEN);
const leadBot = new Telegraf(process.env.LEAD_BOT_TOKEN);
const MY_ID = process.env.MY_CHAT_ID;

// CUSTOM LOG FUNCTION: Ab saare logs tere Telegram par aayenge
async function sendLog(msg) {
    console.log(msg); // Render logs for backup
    try {
        await logBot.telegram.sendMessage(MY_ID, `📝 [LOG]: ${msg}`);
    } catch (e) { console.error("Telegram Log Error", e); }
}

// 3. HQ VERIFICATION: FREE MX CHECK
async function isEmailReal(email) {
    const domain = email.split('@')[1];
    try {
        const mx = await dns.resolveMx(domain);
        return mx && mx.length > 0;
    } catch (e) { return false; }
}

// 4. ZIP EXTRACTOR
function getZip(address) {
    const match = address.match(/\b\d{5}\b/);
    return match ? match[0] : "N/A";
}

// 5. THE HUNTER ENGINE
const CITIES = ["Houston, TX", "Austin, TX", "Atlanta, GA", "Miami, FL", "Phoenix, AZ"];
const NICHES = ["Roofing", "Tree Trimming", "HVAC", "Pest Control"];
let cIdx = 0, nIdx = 0;

async function runWealthSniper() {
    const city = CITIES[cIdx];
    const niche = NICHES[nIdx];
    
    await sendLog(`🔍 Searching ${niche} in ${city}...`);

    try {
        const res = await axios.get('https://serpapi.com/search', {
            params: { engine: "google_maps", q: `${niche} in ${city}`, api_key: process.env.SERPAPI_KEY }
        });

        const results = res.data.local_results || [];
        await sendLog(`✅ Found ${results.length} businesses. Filtering for HQ...`);

        for (const biz of results) {
            // HQ Filter: No Website + 4.0+ Rating
            if (!biz.website && biz.phone && biz.rating >= 4.0) {
                
                await sendLog(`🎯 Target Found: ${biz.title}. Looking for email...`);

                const sRes = await axios.get('https://serpapi.com/search', {
                    params: { q: `"${biz.title}" ${city} contact email`, api_key: process.env.SERPAPI_KEY }
                });
                const email = JSON.stringify(sRes.data).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)?.[0];

                if (email) {
                    const isValid = await isEmailReal(email);
                    if (isValid) {
                        const zip = getZip(biz.address || "");
                        const msg = `💎 **GOD-TIER HQ LEAD**\n\n` +
                                    `🏢 **Name:** ${biz.title}\n` +
                                    `📧 **Email:** ${email}\n` +
                                    `📞 **Phone:** ${biz.phone}\n` +
                                    `📍 **City:** ${city} (Zip: ${zip})\n` +
                                    `⭐ **Rating:** ${biz.rating}\n\n` +
                                    `✅ *Verified by Exodus MX-Check*`;
                        
                        await leadBot.telegram.sendMessage(MY_ID, msg, { parse_mode: 'Markdown' });
                        await sendLog(`💰 [PROFIT ALERT]: HQ Lead sent to Lead Bot!`);
                    }
                } else {
                    await sendLog(`⏩ Skipped ${biz.title} (No email found).`);
                }
            }
        }
    } catch (e) { 
        await sendLog(`🚨 [SYSTEM ERROR]: ${e.message}`); 
    }

    // Cycle through cities/niches
    nIdx = (nIdx + 1) % NICHES.length;
    if (nIdx === 0) cIdx = (cIdx + 1) % CITIES.length;
}

// 6. IMMEDIATE START & INTERVAL
logBot.launch(); leadBot.launch();
sendLog("🚀 Exodus Engine Deployed and Initialized on Render.");

// First hunt starts immediately after deployment
runWealthSniper(); 

// Interval for continuous hunting (40 minutes)
setInterval(runWealthSniper, 2400000);
