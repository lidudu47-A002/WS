// ========== storage-keys.js ==========
// 全项目存储键名的唯一来源。任何模块禁止再手写 'ws_users' / 'ws_token' 等字符串。
// 加载顺序：必须在 auth.js / admin.js / game-state.js / config.js 之前。
// 修复要点（对照优化清单第 1、2 条）：
//   旧版 game-state.js 读 'ws_current_user' / 'ws_accounts'，而 auth.js 写 'ws_token' / 'ws_users'，
//   两个键名都不存在，导致 canUserSave() 永远返回 true（管理员"禁止存档"权限失效）。

(function (global) {
    'use strict';

    var KEYS = Object.freeze({
        USERS: 'ws_users',                    // localStorage：用户表
        TOKEN: 'ws_token',                    // sessionStorage：登录令牌
        PENDING_SAVE: 'ws_pending_save',      // localStorage：待导入存档
        SAVE: 'black_room_prison_save'        // localStorage：游戏主存档
    });

    // 已废弃的旧键名，仅用于启动期迁移
    var LEGACY = Object.freeze({
        ACCOUNTS: 'ws_accounts',
        CURRENT_USER: 'ws_current_user'
    });

    function utf8ToB64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    function b64ToUtf8(str) {
        return decodeURIComponent(escape(atob(str)));
    }

    // 读取当前登录会话（统一入口，替代各处手写 ws_token 解码）
    function readSession() {
        var raw = null;
        try { raw = sessionStorage.getItem(KEYS.TOKEN); } catch (e) { return null; }
        if (!raw) return null;
        try {
            var data = JSON.parse(b64ToUtf8(raw));
            if (!data || typeof data !== 'object') return null;
            if (data.exp && data.exp < Date.now()) return null;
            return data;
        } catch (e) {
            return null;
        }
    }

    // 是否允许存档：未登录视为单机/游客，不限制；已登录以 token 内 canSave 为准
    function canSave() {
        var session = readSession();
        if (!session) return true;
        return session.canSave !== false;
    }

    function writeSession(data) {
        try {
            sessionStorage.setItem(KEYS.TOKEN, utf8ToB64(JSON.stringify(data)));
            return true;
        } catch (e) {
            return false;
        }
    }

    function readUsers() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.USERS) || '{}') || {};
        } catch (e) {
            return {};
        }
    }

    function writeUsers(users) {
        try {
            localStorage.setItem(KEYS.USERS, JSON.stringify(users));
            return true;
        } catch (e) {
            return false;
        }
    }

    // 启动期自检：发现旧键名时自动迁移到当前键名（不删除旧数据，便于回滚）
    function migrateLegacy() {
        var report = [];
        try {
            var legacyUsers = localStorage.getItem(LEGACY.ACCOUNTS);
            if (legacyUsers && !localStorage.getItem(KEYS.USERS)) {
                localStorage.setItem(KEYS.USERS, legacyUsers);
                report.push('Migrated user table:' + LEGACY.ACCOUNTS + ' → ' + KEYS.USERS);
            }
            var legacySession = sessionStorage.getItem(LEGACY.CURRENT_USER);
            if (legacySession && !sessionStorage.getItem(KEYS.TOKEN)) {
                var users = readUsers();
                var user = users[legacySession];
                if (user) {
                    writeSession({
                        username: legacySession,
                        role: user.role || 'user',
                        canSave: user.canSave !== false,
                        exp: Date.now() + 24 * 3600000
                    });
                    report.push('Migrated login state:' + LEGACY.CURRENT_USER + ' → ' + KEYS.TOKEN);
                }
            }
        } catch (e) {
            report.push('Storage self-check failed:' + (e && e.message ? e.message : e));
        }
        if (report.length && typeof console !== 'undefined' && console.warn) {
            console.warn('[storage-keys] ' + report.join(' / '));
        }
        return report;
    }

    global.WS_KEYS = KEYS;
    global.WS_STORAGE = {
        KEYS: KEYS,
        LEGACY: LEGACY,
        readSession: readSession,
        canSave: canSave,
        writeSession: writeSession,
        readUsers: readUsers,
        writeUsers: writeUsers,
        migrateLegacy: migrateLegacy,
        utf8ToB64: utf8ToB64,
        b64ToUtf8: b64ToUtf8
    };

    migrateLegacy();
})(window);
