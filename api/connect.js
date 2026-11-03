// ============================================================================
//  api/connect.js — Universal Panel Bypass (For Encrypted Clients)
//  Isme koi validation nahi hai, yeh hamesha Login Success return karega.
// ============================================================================

module.exports = async (req, res) => {
    // CORS Headers (taaki kisi bhi origin se request accept ho)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Browser preflight request handle karo
    if (req.method === 'OPTIONS') return res.status(200).end();

    // GET request aaye toh info return karo (browser me check karne ke liye)
    if (req.method === 'GET') {
        return res.status(200).json({
            web_info: {
                _client: "SepaxYt",
                license: "Bypassed_By_SepaxYt",
                version: "1.0.0"
            }
        });
    }

    // POST request aaye toh direct Login Success de do (chahe body kuch bhi ho)
    console.log("[BYPASS] Encrypted request received. Sending Fake Success...");

    return res.status(200).json({
        status: true,
        message: "Login Success",
        reason: "SUCCESS",
        data: {
            modname: "SepaxYt",
            mod_status: "Active",
            floting: "SepaxYt Panel Active",
            token: "acc385a05b255752a8c347f21d204818",
            expiredDate: "2099-12-31 23:59:59",
            EXP: "2099-12-31 23:59:59",
            rng: 1729864200,
            device: 10000,
            max_devices: 10000
        }
    });
};
