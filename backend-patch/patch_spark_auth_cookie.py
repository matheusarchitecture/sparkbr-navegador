#!/usr/bin/env python3
"""Patch the existing SparkMarket auth source to support a same-origin HttpOnly cookie.

Usage on the VPS:
  python3 patch_spark_auth_cookie.py /opt/sparkmarket/server.py

The script makes a one-time backup and refuses unknown source layouts.
"""
from pathlib import Path
import argparse
import py_compile
import re
import shutil
import sys
import tempfile

COOKIE_CODE = '''        try:
            _cookie_path = self._path()
            _auth_paths = ("/api/auth/login", "/api/auth/register", "/api/auth/google", "/api/auth/nova-senha")
            if isinstance(obj, dict) and obj.get("ok") and isinstance(obj.get("token"), str) and _cookie_path in _auth_paths:
                _secure = "; Secure" if (str(self.headers.get("X-Forwarded-Proto", "")).split(",")[0].strip().lower() == "https" or str(self.headers.get("Origin", "")).lower().startswith("https://")) else ""
                self.send_header("Set-Cookie", "sparkbr_session=" + obj["token"] + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000" + _secure)
            elif _cookie_path in ("/api/auth/sair", "/api/auth/logout"):
                _secure = "; Secure" if (str(self.headers.get("X-Forwarded-Proto", "")).split(",")[0].strip().lower() == "https" or str(self.headers.get("Origin", "")).lower().startswith("https://")) else ""
                self.send_header("Set-Cookie", "sparkbr_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" + _secure)
        except Exception:
            pass
'''

ME_TOKEN_FUNCTION = '''def _me_token(req):
    try:
        h = req.headers.get("Authorization", "") or ""
        t = h[7:].strip()[:80] if h.startswith("Bearer ") else ""
        if not t:
            for part in str(req.headers.get("Cookie", "") or "").split(";"):
                name, sep, value = part.strip().partition("=")
                if sep and name.strip() == "sparkbr_session":
                    t = value.strip()[:80]
                    break
        if not t:
            return None
        import time as _TE2
        c = _cdb()
        try:
            r = c.execute("SELECT user_id, expira FROM sessoes WHERE token=?", (t,)).fetchone()
            if r and float(r[1]) > _TE2.time():
                u = c.execute("SELECT id, nome, email, plano FROM usuarios WHERE id=?", (int(r[0]),)).fetchone()
                if u:
                    return {"id": u[0], "nome": u[1], "email": u[2], "plano": u[3]}
        finally:
            c.close()
    except Exception:
        pass
    return None

'''

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("server_py", help="path to the existing SparkMarket server.py")
    parser.add_argument("--check", action="store_true", help="check compatibility without writing")
    args = parser.parse_args()
    target = Path(args.server_py).expanduser().resolve()
    if not target.is_file():
        print("ERROR: server.py not found: " + str(target), file=sys.stderr)
        return 2
    source = target.read_text(encoding="utf-8")
    send_re = re.compile(r"(?ms)^    def _send\(self, obj, status=200\):\n.*?(?=^    def _path\()", re.MULTILINE)
    token_re = re.compile(r"(?ms)^def _me_token\(req\):\n.*?(?=^def _email_ok\()", re.MULTILINE)
    send_match, token_match = send_re.search(source), token_re.search(source)
    if not send_match:
        print("ERROR: expected H._send method shape not found; no changes made.", file=sys.stderr)
        return 3
    if not token_match:
        print("ERROR: expected _me_token function shape not found; no changes made.", file=sys.stderr)
        return 4
    send_block, token_block = send_match.group(0), token_match.group(0)
    if "sparkbr_session" in send_block and "sparkbr_session" in token_block:
        print("Already patched: " + str(target))
        return 0
    if "        self.end_headers()" not in send_block:
        print("ERROR: response-header insertion point not found; no changes made.", file=sys.stderr)
        return 5
    if "Authorization" not in token_block:
        print("ERROR: _me_token authentication shape not recognized; no changes made.", file=sys.stderr)
        return 6
    patched_send = send_block if "sparkbr_session" in send_block else send_block.replace("        self.end_headers()", COOKIE_CODE + "        self.end_headers()", 1)
    patched_token = token_block if "sparkbr_session" in token_block else ME_TOKEN_FUNCTION
    patched = source[:send_match.start()] + patched_send + source[send_match.end():]
    token_match2 = token_re.search(patched)
    if not token_match2:
        print("ERROR: could not locate _me_token after first edit; no changes made.", file=sys.stderr)
        return 7
    patched = patched[:token_match2.start()] + patched_token + patched[token_match2.end():]
    if args.check:
        print("PATCH COMPATIBLE: " + str(target))
        return 0
    backup = target.with_suffix(target.suffix + ".pre-sparkbr-cookie.bak")
    if not backup.exists():
        shutil.copy2(target, backup)
    target.write_text(patched, encoding="utf-8")
    try:
        with tempfile.TemporaryDirectory() as td:
            py_compile.compile(str(target), cfile=str(Path(td) / "server.pyc"), doraise=True)
    except Exception as exc:
        shutil.copy2(backup, target)
        print("ERROR: patched Python did not compile; original restored. " + str(exc), file=sys.stderr)
        return 8
    print("PATCH APPLIED: " + str(target))
    print("BACKUP: " + str(backup))
    print("Login/register set an HttpOnly cookie; authenticated SparkMarket routes also accept it; logout clears it.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
