const crypto = require('crypto');
const { Redis } = require('@upstash/redis');

const redis = new Redis({
    url: "https://exotic-louse-124123.upstash.io",
    token: "gQAAAAAAAeTbAAIgcDE0NjNmMmUwMTY2MWY0NmY2ODFkOThiMDYyN2Y2M2QyOA",
});

const LICENSE_SECRET = "Vm8Lk7Uj2JmsjCPVPVjrLa7zgfx3uz9E";

function parseBody(req) {
    let body = req.body;
    if (body === undefined || body === null || body === '') return {};
    if (Buffer.isBuffer(body)) body = body.toString('utf8');
    if (typeof body === 'object') return body;
    if (typeof body === 'string') {
        const trimmed = body.trim();
        if (!trimmed) return {};
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try { return JSON.parse(trimmed); } catch (e) {}
        }
        if (trimmed.includes('=')) {
            try {
                const obj = {};
                for (const pair of trimmed.split('&')) {
                    const idx = pair.indexOf('=');
                    if (idx > 0) {
                        const k = decodeURIComponent(pair.slice(0, idx).replace(/\+/g, ' '));
                        const v = decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, ' '));
                        obj[k] = v;
                    }
                }
                if (Object.keys(obj).length) return obj;
            } catch (e) {}
        }
    }
    return {};
}

function pickField(obj, ...names) {
    for (const n of names) {
        if (obj[n] !== undefined && obj[n] !== null && obj[n] !== '') {
            return String(obj[n]);
        }
    }
    return null;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ status: false, reason: 'Method not allowed' });
    }

    try {
        const query = req.query || {};
        const body  = parseBody(req);
        const data  = { ...query, ...body };

        const game     = pickField(data, 'game', 'Game', 'app', 'product') || 'unknown';
        const user_key = pickField(data, 'user_key', 'key', 'license', 'license_key', 'licenseKey', 'auth_key', 'token', 'serial_key', 'LicenseKey');
        const serial   = pickField(data, 'serial', 'hwid', 'device', 'device_id', 'deviceId', 'uuid', 'android_id', 'imei') || 'unknown-device';

        console.log(`[LOGIN] game=${game} key=${user_key} serial=${serial}`);
        console.log(`[BODY RAW]`, JSON.stringify(data).slice(0, 400));

        if (!user_key) {
            return res.status(200).json({ status: false, reason: 'Missing required fields' });
        }

        const keyData = await redis.get(`key:${user_key}`);
        if (!keyData) {
            return res.status(200).json({ status: false, reason: 'Invalid key' });
        }

        const key = typeof keyData === 'string' ? JSON.parse(keyData) : keyData;

        if (new Date(key.expiry) < new Date()) {
            return res.status(200).json({ status: false, reason: 'Key expired' });
        }

        if (key.disabled === true) {
            return res.status(200).json({ status: false, reason: 'Key disabled' });
        }

        const deviceKey = `devices:${user_key}`;
        const devices = await redis.hgetall(deviceKey) || {};
        const existingDevices = Object.keys(devices);
        const deviceAlreadyAdded = existingDevices.includes(serial);

        if (!deviceAlreadyAdded) {
            if (existingDevices.length >= key.deviceLimit) {
                return res.status(200).json({
                    status: false,
                    reason: `Device limit reached (${key.deviceLimit}). Contact admin.`
                });
            }
            await redis.hset(deviceKey, {
                [serial]: JSON.stringify({
                    firstLogin: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                    ip: req.headers['x-forwarded-for'] || 'unknown',
                })
            });
        } else {
            const info = typeof devices[serial] === 'string' ? JSON.parse(devices[serial]) : devices[serial];
            info.lastLogin = new Date().toISOString();
            await redis.hset(deviceKey, { [serial]: JSON.stringify(info) });
        }

        const statsKey = `stats:${user_key}`;
        await redis.hincrby(statsKey, 'totalLogins', 1);
        await redis.hset(statsKey, { lastLogin: new Date().toISOString() });

        const auth = `${game}-${user_key}-${serial}-${LICENSE_SECRET}`;
        const token = crypto.createHash('md5').update(auth).digest('hex');
        const rng = Math.floor(Date.now() / 1000);

        console.log(`[SUCCESS] key=${user_key}`);

        return res.status(200).json({
            status: true,
            data: { token, rng, EXP: key.expiry }
        });

    } catch (e) {
        console.error('[ERROR]', e.message, e.stack);
        return res.status(200).json({ status: false, reason: 'Server error: ' + e.message });
    }
};