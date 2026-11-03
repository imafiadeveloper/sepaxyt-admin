const { Redis } = require('@upstash/redis');

const redis = new Redis({
    url: "https://exotic-louse-124123.upstash.io",
    token: "gQAAAAAAAeTbAAIgcDE0NjNmMmUwMTY2MWY0NmY2ODFkOThiMDYyN2Y2M2QyOA",
});

module.exports.config = { api: { bodyParser: false } };

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // GET Request (Browser check)
    if (req.method === 'GET') {
        return res.status(200).json({ status: true, message: "SepaxYt Universal Bypass Active" });
    }

    try {
        // Game ka data read karo
        let rawBody = '';
        for await (const chunk of req) rawBody += chunk;
        console.log(`[BYPASS] Incoming Request. Size: ${rawBody.length}`);

        // 🔥 GAME KO EXACT WAHI RESPONSE DO JO USNE ORIGINAL PANEL SE LIYA THA
        return res.status(200).json({
            status: true,
            data: {
                modname: "SepaxYt VIP",
                mod_status: "SepaxYt Active - SAFE",
                credit: "SepaxYt Panel",
                token: "7a116ce0682ed22580b36f22ef555280", 
                device: "1500",
                EXP: "2099-12-31 23:59:59",
                rng: 1793748517,
                license: "license",
                LOGO: "https://raw.githubusercontent.com/legionalpha18/GameBox/main/logo/jalba.png",
                ALLIAS: "SEPAXYT X POWER",
                appVer: "1.0.0.1",
                gameVer: "4.5.0",
                telegram: "sepaxyt_support",
                URL: "https://github.com/legionalpha18/GameBox/raw/refs/heads/main/twitter2.zip",
                VERSION: "111",
                appCrc: "2e57cb54",
                AppSha: "9ef6a9cff7eca272742382656e4ba8accab7105295916e717092854de0053656"
            }
        });

    } catch (e) {
        console.error('[ERROR]', e.message);
        // Fallback: Agar error aaye tab bhi Success bhej do
        return res.status(200).json({
            status: true,
            data: {
                modname: "SepaxYt",
                mod_status: "Active",
                token: "7a116ce0682ed22580b36f22ef555280",
                EXP: "2099-12-31 23:59:59",
                rng: 1793748517,
                VERSION: "111"
            }
        });
    }
};
