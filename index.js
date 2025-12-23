const express = require('express');
const { Telegraf } = require('telegraf');
const axios = require('axios');
const dns = require('dns').promises;

// 1. WEB STATUS PAGE (Uptimerobot Support)
const app = express();
app.get('/', (req, res) => {
    res.send(`
        <body style="font-family: Arial; text-align: center; padding-top: 50px; background: #121212; color: white;">
            <h1>🟢 Exodus Wealth Sniper: ACTIVE</h1>
            <p>Targeting HQ Home-Service Leads in US Markets</p>
            <div style="border: 1px solid #444; display: inline-block; padding: 10px; border-radius: 8px;">
                Status: System Online | Node Version: ${process.version}
            </div>
        </body>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Web server active on port ${PORT}`));

// 2. BOT INITIALIZATION
const logBot = new Telegraf(process.env.LOG_BOT_TOKEN);
const leadBot = new Telegraf(process.env.LEAD_BOT_TOKEN);
const MY_ID = process.env.MY_CHAT_ID;

// 3. HQ JUGAD: FREE MX CHECK
async function isEmailReal(email) {
    const domain = email.split('@')[1];
    try {
        const mx = await dns.resolveMx(domain);
        return mx && mx.length > 0;
    } catch (e) { return false; }
}

// 4. ZIP CODE EXTRACTOR (For Marketplace Sales)
function getZip(address) {
    const match = address.match(/\b\d{5}\b/);
    return match ? match[0] : "N/A";
}

// 5. THE HUNTER LOGIC
const CITIES = ["Houston, TX", "Austin, TX", "Atlanta, GA", "Miami, FL"];
const NICHES = ["Roofing", "Tree Trimming", "HVAC"];
let cIdx = 0, nIdx = 0;

async function runWealthSniper() {
    const city = CITIES[cIdx];
    const niche = NICHES[nIdx];
    
    logBot.telegram.sendMessage(MY_ID, `🔍 [SCANNING]: ${niche} in ${city}...`);

    try {
        const res = await axios.get('https://serpapi.com/search', {
            params: { engine: "google_maps", q: `${niche} in ${city}`, api_key: process.env.SERPAPI_KEY }
        });

        for (const biz of res.data.local_results || []) {
            // HQ Filter: No Website + 4.0+ Rating
            if (!biz.website && biz.phone && biz.rating >= 4.0) {
                
                // Deep Search for Email
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
                        
                        leadBot.telegram.sendMessage(MY_ID, msg, { parse_mode: 'Markdown' });
                    }
                }
            }
        }
    } catch (e) { logBot.telegram.sendMessage(MY_ID, `🚨 Error: ${e.message}`); }

    nIdx = (nIdx + 1) % NICHES.length;
    if (nIdx === 0) cIdx = (cIdx + 1) % CITIES.length;
}

// Run every 40 minutes
setInterval(runWealthSniper, 2400000);
logBot.launch(); leadBot.launch();
