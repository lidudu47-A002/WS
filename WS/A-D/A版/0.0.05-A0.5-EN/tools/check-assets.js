// 优化清单第 25 条配套：静态校验代码里引用的图片/音频是否存在（node tools/check-assets.js）
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RE = /['"`]([^'"`\s]{2,200}?\.(?:png|jpe?g|webp|gif|mp3|ogg|wav|css))['"`]/gi;
const SKIP_DIRS = new Set(['node_modules', '.git', 'tools']);

let checked = 0;
const missing = [];
const seen = new Set();

function candidateRoots(fromFile) {
    const dir = path.dirname(fromFile);
    // boss-battle 的资源路径由 basePath + 文件名拼出，基址是场景目录（black room / prison）
    const bb = path.join(ROOT, '公用文件', 'boss-battle');
    return [
        dir,
        ROOT,
        path.join(ROOT, '公用文件'),
        path.join(ROOT, '公用文件', 'js'),
        bb,
        path.join(bb, 'assets'),
        path.join(bb, 'black room'),
        path.join(bb, 'black room', 'assets'),
        path.join(bb, 'prison'),
        path.join(bb, 'prison', 'assets'),
        path.join(bb, 'prison'),
        path.join(bb, '公用文件')
    ];
}

function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
        if (SKIP_DIRS.has(name)) continue;
        const full = path.join(dir, name);
        const st = fs.statSync(full);
        if (st.isDirectory()) {
            walk(full);
        } else if (/\.(js|html)$/.test(name)) {
            const text = fs.readFileSync(full, 'utf8');
            let m;
            RE.lastIndex = 0;
            while ((m = RE.exec(text))) {
                const ref = m[1];
                if (/^https?:|^data:/.test(ref)) continue;
                const key = full + '|' + ref;
                if (seen.has(key)) continue;
                seen.add(key);
                checked++;
                const ok = candidateRoots(full).some((base) => fs.existsSync(path.resolve(base, ref)));
                if (!ok) missing.push(path.relative(ROOT, full) + ' -> ' + ref);
            }
        }
    }
}
walk(ROOT);
console.log(`Resource reference check: total ${checked} items, missing ${missing.length} items`);
missing.slice(0, 50).forEach((x) => console.warn('MISSING ' + x));
