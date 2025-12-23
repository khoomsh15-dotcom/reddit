const express = require('express');
const { Telegraf } = require('telegraf');
const axios = require('axios');
const dns = require('dns').promises;

// 1. WEB SERVER (Render ko zinda rakhne ke liye)
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('<body style="background:#000;color:#0f0;font-family:monospace;padding:50px;"><h1>🚀 TURBO MODE: ACTIVE</h1><p>Hunting Leads Non-Stop...</p></body>');
});

app.listen(PORT, () => console.log(`🚀 Web Interface live on Port ${PORT}`));

// 2. CONFIG & BOTS
const logBot = new Telegraf(process.env.LOG_BOT_TOKEN);
const leadBot = new Telegraf(process.env.LEAD_BOT_TOKEN);
const MY_ID = process.env.MY_CHAT_ID;

// HELPER: Send Logs to Telegram
async function sendLog(msg) {
    console.log(msg);
    try {
        // Sirf important logs bhejein taaki spam na ho, par abhi full dikhayenge
        await logBot.telegram.sendMessage(MY_ID, `📝 ${msg}`);
    } catch (e) { console.error(e); }
}

// 3. HQ CHECKS
async function isEmailReal(email) {
    const domain = email.split('@')[1];
    try {
        const mx = await dns.resolveMx(domain);
        return mx && mx.length > 0;
    } catch (e) { return false; }
}

function getZip(address) {
    const match = address.match(/\b\d{5}\b/);
    return match ? match[0] : "N/A";
}

// 4. THE TURBO HUNTER ENGINE
const CITIES = ["Houston, TX", "Austin, TX", "Dallas, TX", "Miami, FL", "Phoenix, AZ", "Atlanta, GA"];
const NICHES = ["Roofing", "Tree Trimming", "HVAC", "Pest Control", "Plumbing"];
let cIdx = 0, nIdx = 0;

async function runWealthSniper() {
    const city = CITIES[cIdx];
    const niche = NICHES[nIdx];
    
    await sendLog(`🏎️ [TURBO START]: Hunting ${niche} in ${city}...`);

    try {
        const res = await axios.get('https://serpapi.com/search', {
            params: { engine: "google_maps", q: `${niche} in ${city}`, api_key: process.env.SERPAPI_KEY }
        });

        const results = res.data.local_results || [];
        // await sendLog(`✅ Found ${results.length} raw businesses. Filtering...`); 
        // (Commented out to reduce spam, uncomment if needed)

        for (const biz of results) {
            // FILTER: Sirf unko pakdo jinki WEBSITE NAHI HAI
            if (biz.website) {
                console.log(`⏩ Skipping ${biz.title} (Has Website)`);
                continue; 
            }
            
            // FILTER: Rating achi honi chahiye
            if (!biz.rating || biz.rating < 4.0) {
                console.log(`⏩ Skipping ${biz.title} (Low Rating: ${biz.rating})`);
                continue;
            }

            // Agar yahan pohancha, matlab potential lead hai
            await sendLog(`🧐 Checking Lead: ${biz.title}...`);

            // Email Search
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
                                `✅ *Verified by Exodus System*`;
                    
                    await leadBot.telegram.sendMessage(MY_ID, msg, { parse_mode: 'Markdown' });
                    await sendLog(`💰 [SOLD POTENTIAL]: Lead Sent to Channel!`);
                } else {
                    console.log(`❌ Invalid Email for ${biz.title}`);
                }
            } else {
                console.log(`📭 No Email for ${biz.title}`);
            }
            
            // 1 Second break to prevent CPU overload (Safety)
            await new Promise(r => setTimeout(r, 1000));
        }

    } catch (e) { 
        await sendLog(`🚨 [ERROR]: ${e.message}`); 
    }

    // CYCLE UPDATE
    nIdx = (nIdx + 1) % NICHES.length;
    if (nIdx === 0) cIdx = (cIdx + 1) % CITIES.length;

    // RECURSIVE CALL (No Waiting, Bas 5 sec saans lega)
    console.log("🚀 Starting next batch immediately...");
    setTimeout(runWealthSniper, 5000); 
}

// 5. LAUNCH
logBot.launch();
leadBot.launch();
sendLog("🚀 EXODUS TURBO ENGINE: INITIALIZED");

// Start Immediately
runWealthSniper();
