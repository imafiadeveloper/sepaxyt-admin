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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, reason: 'Method not allowed' });

    try {
        let body = req.body;
        if (typeof body === 'string') body = JSON.parse(body);
        
        const { action, username, password, confirmPassword, refCode } = body;

        // ==========================================
        // 1. REGISTER (New Account)
        // ==========================================
        if (action === 'register') {
            if (!username || !password) return res.status(200).json({ success: false, reason: 'Username and password required' });
            if (password !== confirmPassword) return res.status(200).json({ success: false, reason: 'Passwords do not match' });
            if (username === 'Chaudhary') return res.status(200).json({ success: false, reason: 'Username reserved' });

            const exists = await redis.exists(`user:${username}`);
            if (exists) return res.status(200).json({ success: false, reason: 'Username already exists' });

            // Save User
            const userData = { 
                username, 
                password, 
                role: 'reseller', 
                balance: 0,
                createdAt: new Date().toISOString() 
            };
            await redis.set(`user:${username}`, JSON.stringify(userData));
            await redis.sadd('users:all', username);

            // Handle Referral Code
            if (refCode) {
                const refData = await redis.get(`referral:${refCode}`);
                if (refData) {
                    const ref = typeof refData === 'string' ? JSON.parse(refData) : refData;
                    // Give balance to the referrer (or adjust logic as needed)
                    const refOwner = await redis.get(`user:${ref.createdBy}`);
                    if (refOwner) {
                        const owner = typeof refOwner === 'string' ? JSON.parse(refOwner) : refOwner;
                        owner.balance = (owner.balance || 0) + 50; // 50 Rs bonus
                        await redis.set(`user:${ref.createdBy}`, JSON.stringify(owner));
                    }
                }
            }

            // Auto Login after register
            const token = jwt.sign({ admin: username, role: 'reseller' }, JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({ success: true, token, tenant: username });
        }

        // ==========================================
        // 2. LOGIN (Owner + Sub-Admin + User)
        // ==========================================
        if (action === 'login') {
            // OWNER BYPASS
            if (username === 'Chaudhary' && password === 'Chaudhary') {
                const token = jwt.sign({ admin: 'default', role: 'super_admin' }, JWT_SECRET, { expiresIn: '7d' });
                return res.status(200).json({ success: true, token, tenant: 'default' });
            }

            // Normal User Login
            const userData = await redis.get(`user:${username}`);
            if (!userData) return res.status(200).json({ success: false, reason: 'User not found' });

            const user = typeof userData === 'string' ? JSON.parse(userData) : userData;
            if (user.password !== password) return res.status(200).json({ success: false, reason: 'Wrong password' });

            const token = jwt.sign({ admin: username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({ success: true, token, tenant: username });
        }

        return res.status(200).json({ success: false, reason: 'Invalid action' });

    } catch (e) {
        return res.status(200).json({ success: false, reason: e.message });
    }
};