const jwt = require('jsonwebtoken');
const { Redis } = require('@upstash/redis');

const redis = new Redis({
    url: "https://exotic-louse-124123.upstash.io",
    token: "gQAAAAAAAeTbAAIgcDE0NjNmMmUwMTY2MWY0NmY2ODFkOThiMDYyN2Y2M2QyOA",
});

const JWT_SECRET = "sepaxyt_super_secret_jwt_key_2026";

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, reason: 'Unauthorized' });
    let admin;
    try {
        admin = jwt.verify(authHeader.replace('Bearer ', ''), JWT_SECRET);
    } catch (e) { return res.status(401).json({ success: false, reason: 'Unauthorized' }); }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const action = body.action;

        if (action === 'generate') {
            const code = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const refData = {
                code,
                role: body.role || 'reseller',
                days: body.days || 30,
                balance: body.balance || 0,
                createdBy: admin.admin,
                createdAt: new Date().toISOString()
            };
            await redis.set(`referral:${code}`, JSON.stringify(refData));
            await redis.sadd('referrals:all', code);
            return res.status(200).json({ success: true, code });
        }

        if (action === 'list') {
            const all = await redis.smembers('referrals:all') || [];
            const list = [];
            for (const c of all) {
                const d = await redis.get(`referral:${c}`);
                if (d) list.push(typeof d === 'string' ? JSON.parse(d) : d);
            }
            return res.status(200).json({ success: true, referrals: list });
        }

        return res.status(200).json({ success: false, reason: 'Invalid action' });
    } catch (e) {
        return res.status(200).json({ success: false, reason: e.message });
    }
};