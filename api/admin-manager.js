const jwt = require('jsonwebtoken');
const { Redis } = require('@upstash/redis');

const redis = new Redis({
    url: "https://exotic-louse-124123.upstash.io",
    token: "gQAAAAAAAeTbAAIgcDE0NjNmMmUwMTY2MWY0NmY2ODFkOThiMDYyN2Y2M2QyOA",
});

const JWT_SECRET = "sepaxyt_super_secret_jwt_key_2026";

function verifyAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    try {
        return jwt.verify(authHeader.replace('Bearer ', ''), JWT_SECRET);
    } catch (e) { return null; }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const admin = verifyAuth(req);
    // Sirf default owner hi naye admin bana sakta hai
    if (!admin || admin.admin !== 'default') {
        return res.status(401).json({ success: false, reason: 'Only Super Admin can create new admins' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { action, tenantName, password } = body;

        if (action === 'create') {
            if (!tenantName || !password) return res.status(200).json({ success: false, reason: 'Tenant name and password required' });
            
            const exists = await redis.exists(`user:${tenantName}`);
            if (exists) return res.status(200).json({ success: false, reason: 'Admin already exists' });

            // Save new admin as a user with 'admin' role
            await redis.set(`user:${tenantName}`, JSON.stringify({ 
                username: tenantName, 
                password, 
                role: 'admin', 
                createdAt: new Date().toISOString() 
            }));
            await redis.sadd('users:all', tenantName);

            return res.status(200).json({ success: true, message: `Admin ${tenantName} created. URL: /${tenantName}` });
        }

        return res.status(200).json({ success: false, reason: 'Invalid action' });
    } catch (e) {
        return res.status(200).json({ success: false, reason: e.message });
    }
};