const { Telegraf } = require('telegraf');
const axios = require('axios');
const dns = require('dns').promises;

// 1. CONFIGURATION (Render Envs mein dalo)
const CONFIG = {
    SERPAPI_KEY: process.env.SERPAPI_KEY,
    LOG_BOT_TOKEN: process.env.LOG_BOT_TOKEN,  // Status updates
    LEAD_BOT_TOKEN: process.env.LEAD_BOT_TOKEN, // Verified leads only
    MY_CHAT_ID: process.env.MY_CHAT_ID
};

const logBot = new Telegraf(CONFIG.LOG_BOT_TOKEN);
const leadBot = new Telegraf(CONFIG.LEAD_BOT_TOKEN);
const MY_ID = CONFIG.MY_CHAT_ID;

// 2. FREE EMAIL JUGAD (DNS MX CHECK)
async function isEmailDeliverable(email) {
    const domain = email.split('@')[1];
    try {
        const mx = await dns.resolveMx(domain);
        return mx && mx.length > 0; // Agar Mail Server hai toh true
    } catch (e) { return false; }
}

// 3. ZIP CODE EXTRACTOR
function extractZip(address) {
    const match = address.match(/\b\d{5}\b/);
    return match ? match[0] : "N/A";
}

// 4. MAIN HUNTER ENGINE
const CITIES = ["Houston, TX", "Austin, TX", "Atlanta, GA", "Dallas, TX", "Miami, FL"];
const NICHES = ["Roofing", "Tree Trimming", "HVAC", "Junk Removal"];
let cIdx = 0, nIdx = 0;

async function runWealthSniper() {
    const city = CITIES[cIdx];
    const niche = NICHES[nIdx];

    logBot.telegram.sendMessage(MY_ID, `🔍 [STATUS]: Scanning ${niche} in ${city}...`);

    try {
        // Step 1: Find Businesses with NO WEBSITE
        const res = await axios.get('https://serpapi.com/search', {
            params: { engine: "google_maps", q: `${niche} in ${city}`, api_key: CONFIG.SERPAPI_KEY }
        });

        for (const biz of res.data.local_results || []) {
            if (!biz.website && biz.phone && biz.rating >= 4.0) {
                
                // Step 2: Extract Zip Code for Marketplace HQ
                const zip = extractZip(biz.address || "");

                // Step 3: Find Email using SerpApi Search
                const sRes = await axios.get('https://serpapi.com/search', {
                    params: { q: `"${biz.title}" ${city} contact email`, api_key: CONFIG.SERPAPI_KEY }
                });
                const email = JSON.stringify(sRes.data).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)?.[0];

                if (email) {
                    // Step 4: Free Jugad Verification
                    const isValid = await isEmailDeliverable(email);
                    
                    if (isValid) {
                        // SEND TO LEAD BOT (The HQ Output)
                        const message = `💎 **GOD-TIER HQ LEAD**\n\n` +
                                        `🏢 **Name:** ${biz.title}\n` +
                                        `📧 **Email:** ${email}\n` +
                                        `📞 **Phone:** ${biz.phone}\n` +
                                        `📍 **City:** ${city}\n` +
                                        `📌 **Zip:** ${zip}\n` +
                                        `⭐ **Rating:** ${biz.rating}\n\n` +
                                        `✅ *Verified by Exodus MX-Check*`;
                        
                        leadBot.telegram.sendMessage(MY_ID, message, { parse_mode: 'Markdown' });
                    }
                }
            }
        }
    } catch (e) { 
        logBot.telegram.sendMessage(MY_ID, `🚨 [ERROR]: ${e.message}`); 
    }

    // Cycle through cities/niches
    nIdx = (nIdx + 1) % NICHES.length;
    if (nIdx === 0) cIdx = (cIdx + 1) % CITIES.length;
}

// Run every 45 minutes to save credits
setInterval(runWealthSniper, 2700000); 
logBot.launch(); leadBot.launch();
