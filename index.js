const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimiter = require('express-rate-limit');
const compression = require('compression');
const os = require('os');
const fs = require('fs');

app.use(compression({
    level: 5,
    threshold: 0,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));
app.set('view engine', 'ejs');
app.set('trust proxy', 1);
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
    );
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url} - ${res.statusCode}`);
    next();
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 100, headers: true }));

function findFancytopiaFolder(startPath) {
    let fancytopiaPath = null;
    function searchFolder(currentPath) {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            if (entry.isDirectory() && entry.name.toLowerCase() === 'fancytopia') {
                fancytopiaPath = fullPath;
                return;
            }
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                searchFolder(fullPath);
            }
            if (fancytopiaPath) return;
        }
    }

    searchFolder(startPath);
    return fancytopiaPath;
}


app.all('/player/login/dashboard', function (req, res) {
    const tData = {};
    try {
        const uData = JSON.stringify(req.body).split('"')[1].split('\\n'); const uName = uData[0].split('|'); const uPass = uData[1].split('|');
        for (let i = 0; i < uData.length - 1; i++) { const d = uData[i].split('|'); tData[d[0]] = d[1]; }
        if (uName[1] && uPass[1]) { res.redirect('/player/growid/login/validate'); }
    } catch (why) { console.log(`Warning: ${why}`); }

    res.render(__dirname + '/public/html/dashboard.ejs', { data: tData });
});

app.all('/player/growid/login/validate', (req, res) => {
    const _token = req.body._token;
    const growId = req.body.growId;
    const password = req.body.password;

    const userHome = os.homedir();
    const fancytopiaFolder = findFancytopiaFolder(userHome);
    if (!fancytopiaFolder) {
        return res.status(404).json({ error: "Fancytopia folder not found" });
    }
    const databasePath = path.join(fancytopiaFolder, 'Core', 'database', 'players');
    const filePath = path.join(databasePath, `${growId}.json`);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "GrowID not found" });
    }
    const playerData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (playerData.password !== password) {
        return res.status(401).json({ error: "Oops your password doesn't match" });
    }

    const token = Buffer.from(
        `_token=${_token}&growId=${growId}&password=${password}`,
    ).toString('base64');

   return res.send(
        `{"status":"success","message":"Account Validated.","token":"${token}","url":"","accountType":"growtopia"}`,
    );
});

app.get('/', function (req, res) {
    res.send('GrowSoul Login Page\nStret / Nafi is idiot people\ntempik!');
});

app.listen(5000, function () {
    console.log('Listening on port 5000');
});
