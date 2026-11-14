#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""serve.py — 创意工作台 · 本地只读 HTTP 服务

用途
----
给同目录的 index.html 提供"真实目录扫描"能力：页面上两个工具入口的相对路径
全部来自服务端 os.walk 的实时结果，不再依赖写死路径，也不读 localStorage。

接口
----
GET  /                 静态文件服务（根目录 = 本文件所在目录，自动补 index.html）
GET  /__scan           递归扫描 .html/.htm，返回 JSON 清单（限制层数与条目数）
GET  /__ping           心跳，返回 {"ok": true, "service": "launchpad", ...}
GET|POST /__shutdown   请求服务退出；1 秒宽限期内若有新请求则取消（刷新页面不会误杀）

守护
----
1) 页面心跳超过 IDLE_TIMEOUT 秒无任何请求 -> 自动退出；
2) 浏览器从未连上（启动后 STARTUP_GRACE 秒内零请求）-> 自动退出，避免留下僵尸进程。

约束
----
仅监听 127.0.0.1；只提供读操作；不写任何文件（无日志文件、无 pid 文件、无缓存）。

用法
----
    python serve.py            # 启动并自动用默认浏览器打开页面
    python serve.py --no-open  # 仅启动，不打开浏览器（自测用）
"""

from __future__ import annotations

import json
import os
import socket
import sys
import threading
import time
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

# ---------------------------------------------------------------- 配置

PORT_START = 8765          # 起始端口
PORT_END = 8785            # 最大端口（含）
IDLE_TIMEOUT = 8.0         # 页面心跳超时（秒），超过即自动退出
SHUTDOWN_GRACE = 1.0       # /__shutdown 宽限期（秒），期内有新请求则取消
STARTUP_GRACE = 180.0      # 浏览器始终未连接时的兜底退出时间（秒）

MAX_DEPTH = 6              # 递归层数上限（0 = 只看当前目录）
MAX_FILES = 800            # 单次扫描条目上限

HTML_EXTS = (".html", ".htm")
SKIP_DIRS = {
    "__pycache__", "node_modules", "$recycle.bin",
    "system volume information", ".git", ".svn", ".idea", ".vscode",
}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

try:  # Windows 控制台默认 GBK，切到 UTF-8 避免中文输出报错
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # noqa: BLE001 - 老版本解释器无 reconfigure
    pass


# ---------------------------------------------------------------- 运行状态

class State:
    """记录最近活动时间与待执行关闭，供看门狗线程判断。"""

    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.started_at = time.time()
        self.last_activity = self.started_at
        self.page_seen = False
        self.shutdown_deadline = None  # type: float | None

    def touch(self) -> None:
        """任何请求都算活跃，同时取消待执行的关闭（页面刷新即属此类）。"""
        with self.lock:
            self.last_activity = time.time()
            self.page_seen = True
            if self.shutdown_deadline is not None:
                self.shutdown_deadline = None
                print("[serve] 收到新请求，已取消待执行的关闭。", flush=True)

    def request_shutdown(self) -> None:
        with self.lock:
            now = time.time()
            self.last_activity = now
            self.page_seen = True
            self.shutdown_deadline = now + SHUTDOWN_GRACE
        print(
            "[serve] 收到 /__shutdown，%.1f 秒后退出（期间若有新请求则取消，刷新不受影响）。"
            % SHUTDOWN_GRACE,
            flush=True,
        )


STATE = State()


# ---------------------------------------------------------------- 目录扫描

def scan_html_files(root: str, max_depth: int = MAX_DEPTH, max_files: int = MAX_FILES):
    """递归收集 root 下的 .html/.htm，返回 (文件列表, 是否被截断)。

    只读：os.walk + os.stat，不写盘。列表项字段：rel / name / size / mtime / depth。
    """
    root = os.path.abspath(root)
    files = []
    truncated = False

    for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
        rel_dir = os.path.relpath(dirpath, root)
        depth = 0 if rel_dir == "." else rel_dir.count(os.sep) + 1

        dirnames[:] = sorted(
            d for d in dirnames
            if not d.startswith(".") and d.lower() not in SKIP_DIRS
        )
        if depth >= max_depth:
            dirnames[:] = []  # 到达层数上限，不再深入

        for name in sorted(filenames):
            if not name.lower().endswith(HTML_EXTS):
                continue
            full = os.path.join(dirpath, name)
            rel = name if rel_dir == "." else os.path.join(rel_dir, name)
            rel = rel.replace(os.sep, "/").replace("\\", "/")
            try:
                st = os.stat(full)
                size, mtime = st.st_size, int(st.st_mtime)
            except OSError:
                size, mtime = 0, 0
            files.append({
                "rel": rel,
                "name": name,
                "size": size,
                "mtime": mtime,
                "depth": depth,
            })
            if len(files) >= max_files:
                truncated = True
                break
        if truncated:
            break

    files.sort(key=lambda f: (f["depth"], f["rel"].lower()))
    return files, truncated


# ---------------------------------------------------------------- HTTP 处理

class LaunchPadHandler(SimpleHTTPRequestHandler):
    """静态文件服务 + 三个控制接口；默认目录固定为本脚本所在目录。"""

    server_version = "LaunchPad/1.0"

    def __init__(self, *args, **kwargs):  # noqa: D401
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    # -- 静默默认的逐请求日志，只保留我们自己的关键输出 --
    def log_message(self, fmt, *args):  # noqa: A003
        return

    def log_error(self, fmt, *args):
        return

    # -- 工具 --
    def _path_only(self) -> str:
        raw = urlsplit(self.path)
        path = unquote(raw.path or "/")
        return path.rstrip("/") or "/"

    def _send_json(self, payload, code: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.end_headers()
        if self.command != "HEAD":
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass

    def _dispatch(self) -> bool:
        """命中控制接口返回 True；否则记录活跃并交给静态文件逻辑。"""
        path = self._path_only()

        if path == "/__ping":
            STATE.touch()
            now = time.time()
            self._send_json({
                "ok": True,
                "service": "launchpad",
                "port": self.server.server_address[1],
                "root": BASE_DIR,
                "rootName": os.path.basename(BASE_DIR),
                "uptime": round(now - STATE.started_at, 2),
                "idle": round(now - STATE.last_activity, 2),
            })
            return True

        if path == "/__scan":
            STATE.touch()
            files, truncated = scan_html_files(BASE_DIR)
            self._send_json({
                "ok": True,
                "service": "launchpad",
                "root": BASE_DIR,
                "rootName": os.path.basename(BASE_DIR),
                "count": len(files),
                "truncated": truncated,
                "limits": {"maxDepth": MAX_DEPTH, "maxFiles": MAX_FILES},
                "files": files,
            })
            return True

        if path == "/__shutdown":
            STATE.request_shutdown()
            self._send_json({"ok": True, "bye": True})
            return True

        STATE.touch()
        return False

    # -- 方法 --
    def do_GET(self):  # noqa: N802
        if self._dispatch():
            return
        super().do_GET()

    def do_HEAD(self):  # noqa: N802
        if self._dispatch():
            return
        super().do_HEAD()

    def do_POST(self):  # noqa: N802
        # 仅 /__shutdown 接受 POST（navigator.sendBeacon 走这条路）
        if self._path_only() == "/__shutdown":
            # sendBeacon 会带 body，读掉以避免连接被重置
            try:
                length = int(self.headers.get("Content-Length") or 0)
                if length > 0:
                    self.rfile.read(min(length, 65536))
            except Exception:  # noqa: BLE001
                pass
            self._dispatch()
            return
        self.send_error(405, "Method Not Allowed")


class LaunchPadServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


# ---------------------------------------------------------------- 端口选择

def port_in_use(port: int) -> bool:
    """用不带 SO_REUSEADDR 的裸 socket 试探，能绑上说明端口空闲。"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(("127.0.0.1", port))
        return False
    except OSError:
        return True
    finally:
        sock.close()


def create_server():
    """从 PORT_START 起逐个尝试，命中即返回；(None, None) 表示全部被占用。"""
    for port in range(PORT_START, PORT_END + 1):
        if port_in_use(port):
            print("[serve] 端口 %d 已被占用，尝试下一个…" % port, flush=True)
            continue
        try:
            return LaunchPadServer(("127.0.0.1", port), LaunchPadHandler), port
        except OSError as exc:
            print("[serve] 端口 %d 绑定失败（%s），尝试下一个…" % (port, exc), flush=True)
    return None, None


# ---------------------------------------------------------------- 后台线程

def open_browser_later(url: str) -> None:
    time.sleep(0.35)
    try:
        webbrowser.open(url)
    except Exception as exc:  # noqa: BLE001
        print("[serve] 自动打开浏览器失败：%s（可手动访问上面的地址）" % exc, flush=True)


def watchdog(server: ThreadingHTTPServer, state: State, stop_event: threading.Event) -> None:
    """页面心跳超时 / 收到关闭通知 / 浏览器从未连上 -> 关停服务。"""
    reason = None
    while not stop_event.is_set():
        time.sleep(0.25)
        now = time.time()
        with state.lock:
            deadline = state.shutdown_deadline
            page_seen = state.page_seen
            last = state.last_activity

        if deadline is not None and now >= deadline:
            reason = "页面已关闭（收到 /__shutdown）"
            break
        if page_seen and (now - last) > IDLE_TIMEOUT:
            reason = "页面心跳中断超过 %.0f 秒" % IDLE_TIMEOUT
            break
        if (not page_seen) and (now - state.started_at) > STARTUP_GRACE:
            reason = "浏览器在 %.0f 秒内未连接" % STARTUP_GRACE
            break

    if reason:
        print("[serve] %s，服务自动退出。" % reason, flush=True)
    server.shutdown()


# ---------------------------------------------------------------- 入口

def main() -> int:
    server, port = create_server()
    if server is None:
        print("[serve] %d-%d 端口全部被占用，请先释放端口后重试。" % (PORT_START, PORT_END), flush=True)
        return 2

    url = "http://127.0.0.1:%d/index.html" % port
    print("=" * 56, flush=True)
    print(" 创意工作台 · 本地服务已启动", flush=True)
    print(" 地址　：%s" % url, flush=True)
    print(" 根目录：%s" % BASE_DIR, flush=True)
    print(" 规则　：页面心跳 %.0f 秒无请求即自动退出；关闭页面立刻结束。" % IDLE_TIMEOUT, flush=True)
    print(" 退出　：关闭本窗口或按 Ctrl+C 也可立即停止。", flush=True)
    print("=" * 56, flush=True)

    stop_event = threading.Event()
    if "--no-open" not in sys.argv:
        threading.Thread(target=open_browser_later, args=(url,), daemon=True).start()
    threading.Thread(target=watchdog, args=(server, STATE, stop_event), daemon=True).start()

    try:
        server.serve_forever(poll_interval=0.2)
    except KeyboardInterrupt:
        print("\n[serve] 收到 Ctrl+C，已停止。", flush=True)
    finally:
        stop_event.set()
        try:
            server.server_close()
        except Exception:  # noqa: BLE001
            pass

    print("[serve] 已退出。", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
