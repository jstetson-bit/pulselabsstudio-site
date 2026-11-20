#!/usr/bin/env python3
"""PLS Relay — the last step of PLS Stream's connection ladder (James, 2026-11-18: "we're going to get a server anyway").

When a device and a PC can't reach each other directly (both behind shared phone-company / home-internet addresses), both send
their packets here and the relay passes them across. Every packet is already sealed with the PC's own pairing code before it
leaves either end, so this program can't read anything; it only matches the two ends of a room and forwards bytes.

Wire (UDP, port 41400):
  join   "PLSJ" + room(16) + role(1: b'P' PC / b'D' device)   -> answer "PLSj" + room + (b'1' if the other end is here else b'0')
  data   anything else from an address that joined: sent on to the other end of its room
  status HTTP GET / on TCP port 41401: one line of plain text (rooms, packets, version)
  board  HTTP on TCP port 41402 (v0.2.0, James 2026-11-19 "get on my computers right now"): our own meet-up board, the same few calls as
         ntfy.sh so PLS Stream talks to it the same way:  POST /<topic> (a note)  ·  GET /<topic>/json?since=<unix s>[&poll=1]
         Notes are already sealed by the two ends; this only holds each for 15 minutes in memory and hands it to whoever listens.
Room = first 16 bytes of HMAC-SHA256(pairing code, "pls-relay-room"); only the two ends that know the code meet in it.
Light by rule (HR-LIGHT): one process, no disk writes, rooms forgotten after 90 s of silence.
"""
import asyncio, time, sys, socket, json, re, secrets, collections

VERSION = "0.2.0"
PORT = 41400
STATUS_PORT = 41401
BOARD_PORT = 41402
NOTE_TTL = 900.0       # seconds a note is kept
NOTE_MAX = 8192        # bytes per note
TOPIC_KEEP = 64        # notes kept per topic
TOPIC_MAX = 20000      # topics held at once
ASK_RATE = 20.0        # notes per second allowed per address (abuse cap; a whole house of PCs uses well under 1)
IDLE = 90.0             # seconds before a silent room is forgotten
MAX_ROOMS = 256
MAX_PKT = 1500
RATE = 12_500_000       # bytes per second per room (100 Mbps) — a cap against abuse, far above a stream

class Room:
    __slots__ = ("pc", "dev", "seen", "budget", "tick", "bytes")
    def __init__(self):
        self.pc = None; self.dev = None; self.seen = time.monotonic(); self.budget = RATE; self.tick = self.seen; self.bytes = 0

rooms = {}       # room id -> Room
where = {}       # address -> (room id, role)
stats = {"pkts": 0, "bytes": 0, "dropped": 0, "started": time.time()}

class Relay(asyncio.DatagramProtocol):
    def connection_made(self, t): self.t = t
    def datagram_received(self, d, a):
        n = len(d)
        if n > MAX_PKT: stats["dropped"] += 1; return
        now = time.monotonic()
        if n == 21 and d[:4] == b"PLSJ" and d[20:21] in (b"P", b"D"):
            rid, role = d[4:20], d[20:21]
            r = rooms.get(rid)
            if r is None:
                if len(rooms) >= MAX_ROOMS: return
                r = rooms[rid] = Room()
            old = r.pc if role == b"P" else r.dev
            if old and old != a: where.pop(old, None)
            if role == b"P": r.pc = a
            else: r.dev = a
            where[a] = (rid, role); r.seen = now
            other = r.dev if role == b"P" else r.pc
            self.t.sendto(b"PLSj" + rid + (b"1" if other else b"0"), a)
            return
        w = where.get(a)
        if not w: return
        r = rooms.get(w[0])
        if not r: where.pop(a, None); return
        other = r.dev if w[1] == b"P" else r.pc
        if not other: return
        r.budget = min(RATE, r.budget + (now - r.tick) * RATE); r.tick = now
        if r.budget < n: stats["dropped"] += 1; return
        r.budget -= n; r.seen = now; r.bytes += n
        stats["pkts"] += 1; stats["bytes"] += n
        self.t.sendto(d, other)

async def sweep():
    while True:
        await asyncio.sleep(15)
        now = time.monotonic()
        for rid in [k for k, r in rooms.items() if now - r.seen > IDLE]:
            r = rooms.pop(rid)
            for a in (r.pc, r.dev):
                if a: where.pop(a, None)

async def status(reader, writer):
    try: await asyncio.wait_for(reader.read(1024), 3)
    except Exception: pass
    paired = sum(1 for r in rooms.values() if r.pc and r.dev)
    up = int(time.time() - stats["started"])
    body = (f"PLS Relay {VERSION} running {up}s; rooms {len(rooms)} ({paired} with both ends); "
            f"passed {stats['pkts']} packets / {stats['bytes'] // 1048576} MB; dropped {stats['dropped']}\n").encode()
    writer.write(b"HTTP/1.0 200 OK\r\nContent-Type: text/plain\r\nContent-Length: " + str(len(body)).encode() + b"\r\nConnection: close\r\n\r\n" + body)
    try: await writer.drain()
    finally: writer.close()

# ---------------- the board ----------------
topics = {}                                   # topic -> deque of (unix time, id, message)
waiters = collections.defaultdict(set)        # topic -> set of asyncio.Queue (live listeners)
ask_budget = {}                               # address -> (budget, last time)
bstats = {"notes": 0, "listens": 0, "refused": 0}
TOPIC_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

def note_line(t, i, m, topic):
    return (json.dumps({"id": i, "time": int(t), "event": "message", "topic": topic, "message": m}) + "\n").encode()

async def board(reader, writer):
    peer = (writer.get_extra_info("peername") or ("?",))[0]
    try:
        head = await asyncio.wait_for(reader.readuntil(b"\r\n\r\n"), 10)
        lines = head.decode("latin-1").split("\r\n")
        method, target = lines[0].split(" ")[:2]
        hdr = {l.split(":", 1)[0].strip().lower(): l.split(":", 1)[1].strip() for l in lines[1:] if ":" in l}
        path, _, query = target.partition("?")
        q = dict(p.split("=", 1) for p in query.split("&") if "=" in p)
        parts = [p for p in path.split("/") if p]
        if method == "POST" and len(parts) == 1 and TOPIC_RE.match(parts[0]):
            n = int(hdr.get("content-length", "0"))
            if n > NOTE_MAX: return await reply(writer, 413, b"too big\n")
            body = await asyncio.wait_for(reader.readexactly(n), 10) if n else b""
            now = time.time(); b, last = ask_budget.get(peer, (ASK_RATE * 10, now))
            b = min(ASK_RATE * 10, b + (now - last) * ASK_RATE)
            if b < 1: bstats["refused"] += 1; return await reply(writer, 429, b"slow down\n")
            ask_budget[peer] = (b - 1, now)
            topic = parts[0]
            if topic not in topics:
                if len(topics) >= TOPIC_MAX: return await reply(writer, 503, b"full\n")
                topics[topic] = collections.deque(maxlen=TOPIC_KEEP)
            i = secrets.token_hex(6); m = body.decode("utf-8", "replace")
            topics[topic].append((now, i, m)); bstats["notes"] += 1
            line = note_line(now, i, m, topic)
            for qq in list(waiters.get(topic, ())): qq.put_nowait(line)
            return await reply(writer, 200, line)
        if method == "GET" and len(parts) == 2 and parts[1] == "json" and TOPIC_RE.match(parts[0]):
            topic = parts[0]
            try: since = float(q.get("since", "0"))
            except ValueError: since = 0
            if since <= 0: since = time.time()
            old = b"".join(note_line(t, i, m, topic) for (t, i, m) in topics.get(topic, ()) if t >= since)
            if q.get("poll") == "1": return await reply(writer, 200, old, "application/x-ndjson")
            writer.write(b"HTTP/1.1 200 OK\r\nContent-Type: application/x-ndjson\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n")
            writer.write((json.dumps({"id": secrets.token_hex(6), "time": int(time.time()), "event": "open", "topic": topic}) + "\n").encode() + old)
            await writer.drain()
            qq = asyncio.Queue(); waiters[topic].add(qq); bstats["listens"] += 1
            try:
                while True:
                    try: line = await asyncio.wait_for(qq.get(), 45)
                    except asyncio.TimeoutError: line = (json.dumps({"id": secrets.token_hex(6), "time": int(time.time()), "event": "keepalive", "topic": topic}) + "\n").encode()
                    writer.write(line); await writer.drain()
            finally:
                waiters[topic].discard(qq)
                if not waiters[topic]: waiters.pop(topic, None)
        if method == "GET" and not parts:
            return await reply(writer, 200, f"PLS Board {VERSION}: {len(topics)} topics, {sum(len(v) for v in waiters.values())} listening, {bstats['notes']} notes, {bstats['refused']} refused\n".encode(), "text/plain")
        await reply(writer, 404, b"no\n")
    except Exception:
        pass
    finally:
        try: writer.close()
        except Exception: pass

async def reply(writer, code, body, ctype="application/json"):
    words = {200: "OK", 404: "Not Found", 413: "Too Large", 429: "Too Many Requests", 503: "Busy"}.get(code, "OK")
    writer.write(f"HTTP/1.1 {code} {words}\r\nContent-Type: {ctype}\r\nContent-Length: {len(body)}\r\nConnection: close\r\n\r\n".encode() + body)
    try: await writer.drain()
    except Exception: pass

async def board_sweep():
    while True:
        await asyncio.sleep(60)
        cut = time.time() - NOTE_TTL
        for t in list(topics):
            d = topics[t]
            while d and d[0][0] < cut: d.popleft()
            if not d and t not in waiters: topics.pop(t, None)
        old = time.time() - 600
        for a in [a for a, (b, l) in ask_budget.items() if l < old]: ask_budget.pop(a, None)

async def main():
    loop = asyncio.get_running_loop()
    try:   # both IPv6 and IPv4 on one socket when the server has IPv6; plain IPv4 otherwise
        us = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM); us.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0); us.bind(("::", PORT)); host = "::"
    except OSError:
        us = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); us.bind(("0.0.0.0", PORT)); host = "0.0.0.0"
    us.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 4 << 20); us.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 4 << 20)
    await loop.create_datagram_endpoint(Relay, sock=us)
    srv = await asyncio.start_server(status, None, STATUS_PORT)   # None = every address, IPv4 and IPv6 (a "::" server listens on IPv6 only)
    bsrv = await asyncio.start_server(board, None, BOARD_PORT)
    asyncio.create_task(board_sweep())
    print(f"PLS Relay {VERSION} on UDP {PORT}, status on TCP {STATUS_PORT}, board on TCP {BOARD_PORT}", flush=True)
    asyncio.create_task(sweep())
    async with srv, bsrv: await asyncio.gather(srv.serve_forever(), bsrv.serve_forever())

if __name__ == "__main__":
    try: asyncio.run(main())
    except KeyboardInterrupt: sys.exit(0)
