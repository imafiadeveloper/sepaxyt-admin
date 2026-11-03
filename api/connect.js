const crypto = require('crypto');
const { Redis } = require('@upstash/redis');

// ⚠️ CRITICAL: Vercel ka default body parser disable karo
// Taaki hum raw form-urlencoded body padh sakein
module.exports.config = {
    api: { bodyParser: false },
};

const redis = new Redis({
    url: "https://exotic-louse-124123.upstash.io",
    token: "gQAAAAAAAeTbAAIgcDE0NjNmMmUwMTY2MWY0NmY2ODFkOThiMDYyN2Y2M2QyOA",
});

const LICENSE_SECRET = "Vm8Lk7Uj2JmsjCPVPVjrLa7zgfx3uz9E";

// ============================================================
//  RAW BODY READER (Vercel serverless)
// ============================================================
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

// ============================================================
//  PARSER — JSON ya form-urlencoded dono handle karo
// ============================================================
function parseAny(raw) {
    if (!raw) return {};
    const t = raw.trim();
    if (!t) return {};

    // JSON
    if (t.startsWith('{') || t.startsWith('[')) {
        try { return JSON.parse(t); } catch (e) {}
    }

    // URL-encoded: game=PUBG&user_key=xxx&serial=yyy
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

// ============================================================
//  MAIN HANDLER
// ============================================================
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // -------- GET request: info response (jaise PHP controller) --------
    if (req.method === 'GET' && !req.query.user_key) {
        return res.status(200).json({
            web_info: {
                _client: 'SepaxYt',
                license: 'Qp5KSGTquetnUkjX6UVBAURH8hTkZuLM',
                version: '1.0.0',
            },
            web__dev: {
                author: 'SepaxYt',
                Telegram: '',
            },
        });
    }

    try {
        const raw = await readRawBody(req);
        const body = parseAny(raw);
        const data = { ...(req.query || {}), ...body };

        const game     = pick(data, 'game', 'Game', 'app', 'product');
        const user_key = pick(data, 'user_key', 'key', 'license', 'license_key', 'licenseKey', 'auth_key', 'token');
        const serial   = pick(data, 'serial', 'hwid', 'device', 'device_id', 'deviceId', 'uuid', 'android_id');

        console.log(`[LOGIN] game=${game} key=${user_key} serial=${serial}`);
        console.log(`[BODY] ${raw.slice(0, 300)}`);

        // -------- Validation (PHP jaisa) --------
        if (!game || !user_key || !serial) {
            return res.status(200).json({
                status: false,
                reason: 'Bad Parameter',
            });
        }

        // -------- Key lookup --------
        const keyData = await redis.get(`key:${user_key}`);
        if (!keyData) {
            return res.status(200).json({
                status: false,
                reason: 'USER OR GAME NOT REGISTERED',
            });
        }

        const key = typeof keyData === 'string' ? JSON.parse(keyData) : keyData;

        // -------- Status check --------
        if (key.disabled === true) {
            return res.status(200).json({
                status: false,
                reason: 'USER BLOCKED',
            });
        }

        // -------- Expiry check --------
        if (key.expiry !== '2099-12-31' && new Date(key.expiry) < new Date()) {
            return res.status(200).json({
                status: false,
                reason: 'EXPIRED KEY',
            });
        }

        // -------- Device tracking --------
        const deviceKey = `devices:${user_key}`;
        const devices = await redis.hgetall(deviceKey) || {};
        const existingDevices = Object.keys(devices);
        const deviceAlreadyAdded = existingDevices.includes(serial);

        if (!deviceAlreadyAdded) {
            if (existingDevices.length >= key.deviceLimit) {
                return res.status(200).json({
                    status: false,
                    reason: 'MAX DEVICE REACHED',
                });
            }
            await redis.hset(deviceKey, {
                [serial]: JSON.stringify({
                    firstLogin: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                    ip: req.headers['x-forwarded-for'] || 'unknown',
                }),
            });
        } else {
            const info = typeof devices[serial] === 'string'
                ? JSON.parse(devices[serial])
                : devices[serial];
            info.lastLogin = new Date().toISOString();
            await redis.hset(deviceKey, { [serial]: JSON.stringify(info) });
        }

        // -------- Stats --------
        const statsKey = `stats:${user_key}`;
        await redis.hincrby(statsKey, 'totalLogins', 1);
        await redis.hset(statsKey, { lastLogin: new Date().toISOString() });

        // -------- Token generation (PHP ke formula ke hisaab se) --------
        // PHP: $real = "$game-$uKey-$sDev-$this->staticWords";
        //      token = md5($real)
        const realStr = `${game}-${user_key}-${serial}-${LICENSE_SECRET}`;
        const token = crypto.createHash('md5').update(realStr).digest('hex');
        const rng = Math.floor(Date.now() / 1000);

        console.log(`[SUCCESS] key=${user_key} token=${token}`);

        // -------- Response (PHP format exactly) --------
        return res.status(200).json({
            status: true,
            data: {
                modname: 'SepaxYt',
                mod_status: 'Active',
                floting: 'SepaxYt Panel Active',
                token: token,
                expiredDate: key.expiry,
                rng: rng,
            },
        });

    } catch (e) {
        console.error('[ERROR]', e.message, e.stack);
        return res.status(200).json({
            status: false,
            reason: 'Server Error: ' + e.message,
        });
    }
};
