// ============================================================================
//  api/connect.js — MEGA PROXY (Tumhara panel, Original ka data)
// ============================================================================

const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // GET request (Browser check)
    if (req.method === 'GET') {
        return res.status(200).json({ web_info: { _client: "SepaxYt Proxy", status: "Active" } });
    }

    try {
        // Jo bhi data game bhejega (Encrypted ya plain), hum waisa hi original panel pe bhejenge
        let body = req.body;
        if (!body) {
            // Agar body stream me hai toh read karo
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            body = Buffer.concat(chunks);
        }

        console.log("[PROXY] Forwarding to Original Panel...");

        // Original Panel ki details
        // (Yahan tum jo bhi original panel replace kar rahe ho, uska URL daal sakte ho)
        const ORIGINAL_URL = "https://api.defendserver.shop/defend/connect"; 
        
        const originalResponse = await fetch(ORIGINAL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded', // Original panel format
                'User-Agent': req.headers['user-agent'] || 'AbsoluteX/2.0',
                'Accept': 'application/json'
            },
            body: body
        });

        // Original panel ka exact response nikal lo
        const data = await originalResponse.text();
        
        console.log("[PROXY] Response received from Original Panel!");

        // Wapas game ko bhej do
        // Game ko farq nahi padega ki data kahan se aaya
        res.status(200).send(data);

    } catch (e) {
        console.error('[PROXY ERROR]', e.message);
        // Agar original panel down hai, toh fallback fake JSON
        res.status(200).json({
            status: true,
            data: {
                modname: "SepaxYt",
                mod_status: "Active",
                token: "acc385a05b255752a8c347f21d204818",
                expiredDate: "2099-12-31 23:59:59",
                rng: 1729864200
            }
        });
    }
};
