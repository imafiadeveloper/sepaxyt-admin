const { Redis } = require('@upstash/redis');

const redis = new Redis({
    url: "https://exotic-louse-124123.upstash.io",
    token: "gQAAAAAAAeTbAAIgcDE0NjNmMmUwMTY2MWY0NmY2ODFkOThiMDYyN2Y2M2QyOA",
});

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    // 🌐 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // 📄 GET Request (Browser se check karne ke liye)
    if (req.method === 'GET') {
        return res.status(200).json({
            status: true,
            message: "SepaxYt Universal Server Active",
            author: "SepaxYt",
            time: new Date().toISOString()
        });
    }

    // 🚀 POST Request (Game se aane wali request)
    try {
        // Body read karo (chahe encrypted ho ya normal)
        let rawBody = '';
        for await (const chunk of req) {
            rawBody += chunk;
        }

        console.log(`[HIT] New request from game. Size: ${rawBody.length}`);

        // 🔥 SMART TRACKING (Optional)
        // Agar body me key jaisa kuch dikhe toh track karlo
        if (rawBody.length > 10 && rawBody.length < 500) {
            try {
                await redis.lpush('game_logs', `[${new Date().toISOString()}] Data: ${rawBody.slice(0, 50)}`);
                await redis.ltrim('game_logs', 0, 99); // Sirf last 100 logs rakho
            } catch (e) {}
        }

        // ⚡ UNLIMITED SUCCESS BYPASS
        // Game chahe kuch bhi bheje, usko hamesha Success milega
        return res.status(200).json({
            status: true,
            message: "Login Success",
            reason: "SUCCESS",
            data: {
                modname: "SepaxYt",
                mod_status: "Active",
                floting: "SepaxYt Active",
                token: "acc385a05b255752a8c347f21d204818",
                expiredDate: "2099-12-31 23:59:59",
                EXP: "2099-12-31 23:59:59",
                exdate: "2099-12-31 23:59:59",
                rng: 1729864200,
                device: 10000,
                max_devices: 10000,
                // Extra fields jo kuch games maangte hain
                credit: "SepaxYt",
                real: "PUBG-SEPAXYT-VIP",
                ESP: "on", Item: "on", AIM: "on",
                SilentAim: "on", BulletTrack: "on",
                Floating: "on", Memory: "on", Setting: "on"
            }
        });

    } catch (e) {
        console.error('[ERROR]', e.message);
        // Agar server crash ho jaye toh bhi game ko success hi mile
        return res.status(200).json({
            status: true,
            message: "Login Success (Fallback)",
            data: {
                modname: "SepaxYt",
                mod_status: "Active",
                token: "acc385a05b255752a8c347f21d204818",
                expiredDate: "2099-12-31 23:59:59",
                EXP: "2099-12-31 23:59:59",
                rng: 1729864200
            }
        });
    }
};
