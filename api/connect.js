const crypto = require('crypto');
const { Redis } = require('@upstash/redis');

// ⚠️ IMPORTANT: Vercel ka default body parser disable karo
// Taaki hum raw form-urlencoded body padh sakein
module.exports.config = {
    api: { bodyParser: false },
};

const redis = new Redis({
    url: "https://exotic-louse-124123.upstash.io",
    token: "gQAAAAAAAeTbAAIgcDE0NjNmMmUwMTY2MWY0NmY2ODFkOThiMDYyN2Y2M2QyOA",
});

const LICENSE_SECRET = "Vm8Lk7Uj2JmsjCPVPVjrLa7zgfx3uz9E";

// Raw stream body read karo
function readRawBody(req) {
    return new Promise((resolve) => {
        if (req.body !== undefined && req.body !== null && req.body !== '') {
            if (Buffer.isBuffer(req.body)) return resolve(req.body.toString('utf8'));
            if (typeof req.body === 'string') return resolve(req.body);
            if (typeof req.body === 'object') return resolve(JSON.stringify(req.body));
        }
        let chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', () => resolve(''));
    });
}

// JSON ya form-urlencoded — dono parse karo
function parseAny(raw) {
    if (!raw) return {};
    const t = raw.trim();
    if (!t) return {};
    if (t.startsWith('{') || t.startsWith('[')) {
        try { return JSON.parse(t); } catch (e) {}
    }
    if (t.includes('=')) {
        try {
            const obj = {};
            for (const pair of t.split('&')) {
                const i = pair.indexOf('=');
                if (i > 0) {
                    const k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' '));
                    const v = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
                    obj[k] = v;
                }
            }
            return obj;
        } catch (e) {}
    }
    return {};
}

function pick(obj, ...names) {
    for (const n of names) {
        if (obj[n] !== undefined && obj[n] !== null && obj[n] !== '') return String(obj[n]);
    }
    return null;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const raw = await readRawBody(req);
        const body = parseAny(raw);
        const data = { ...(req.query || {}), ...body };

        const game     = pick(data, 'game', 'Game', 'app', 'product') || 'PUBG';
        const user_key = pick(data, 'user_key', 'key', 'license', 'license_key', 'licenseKey', 'auth_key', 'token', 'serial_key', 'LicenseKey');
        const serial   = pick(data, 'serial', 'hwid', 'device', 'device_id', 'deviceId', 'uuid', 'android_id', 'imei') || 'unknown-device';

        console.log(`[LOGIN] game=${game} key=${user_key} serial=${serial}`);
        console.log(`[RAW BODY]`, raw.slice(0, 300));

        if (!user_key) {
            return res.status(200).json({ status: false, reason: 'Missing required fields' });
        }

        const keyData = await redis.get(`key:${user_key}`);
        if (!keyData) return res.status(200).json({ status: false, reason: 'Invalid key' });

        const key = typeof keyData === 'string' ? JSON.parse(keyData) : keyData;

        if (new Date(key.expiry) < new Date())
            return res.status(200).json({ status: false, reason: 'Key expired' });

        if (key.disabled === true)
            return res.status(200).json({ status: false, reason: 'Key disabled' });

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

        // Client formula: MD5("PUBG-KEY-SERIAL-SECRET")
        const authStr = `${game}-${user_key}-${serial}-${LICENSE_SECRET}`;
        const token = crypto.createHash('md5').update(authStr).digest('hex');
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
