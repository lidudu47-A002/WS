// 优化清单第 22 条配套：无构建项目的轻量语法检查（node tools/check-syntax.js）
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'x', 'X']);
let pass = 0, fail = 0;

function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
        if (SKIP.has(name)) continue;
        const full = path.join(dir, name);
        const st = fs.statSync(full);
        if (st.isDirectory()) walk(full);
        else if (name.endsWith('.js')) {
            const code = fs.readFileSync(full, 'utf8');
            try {
                new vm.Script(code, { filename: full });
                pass++;
            } catch (e) {
                fail++;
                console.error('FAIL ' + path.relative(ROOT, full) + ' :: ' + e.message);
            }
        }
    }
}
walk(ROOT);
console.log(`语法检查完成：通过 ${pass}，失败 ${fail}`);
process.exit(fail ? 1 : 0);
