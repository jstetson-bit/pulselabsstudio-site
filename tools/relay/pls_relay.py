#!/usr/bin/env python3
"""PLS Relay — the last step of PLS Stream's connection ladder (James, 2026-11-18: "we're going to get a server anyway").

When a device and a PC can't reach each other directly (both behind shared phone-company / home-internet addresses), both send
their packets here and the relay passes them across. Every packet is already sealed with the PC's own pairing code before it
leaves either end, so this program can't read anything; it only matches the two ends of a room and forwards bytes.

Wire (UDP, port 41400):
  join   "PLSJ" + room(16) + role(1: b'P' PC / b'D' device)   -> answer "PLSj" + room + (b'1' if the other end is here else b'0')
  data   anything else from an address that joined: sent on to the other end of its room
  status HTTP GET / on TCP port 41401: one line of plain text (rooms, packets, version)
Room = first 16 bytes of HMAC-SHA256(pairing code, "pls-relay-room"); only the two ends that know the code meet in it.
Light by rule (HR-LIGHT): one process, no disk writes, rooms forgotten after 90 s of silence.
"""
import asyncio, time, sys, socket

VERSION = "0.1.1"
PORT = 41400
STATUS_PORT = 41401
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

async def main():
    loop = asyncio.get_running_loop()
    try:   # both IPv6 and IPv4 on one socket when the server has IPv6; plain IPv4 otherwise
        us = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM); us.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0); us.bind(("::", PORT)); host = "::"
    except OSError:
        us = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); us.bind(("0.0.0.0", PORT)); host = "0.0.0.0"
    us.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 4 << 20); us.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 4 << 20)
    await loop.create_datagram_endpoint(Relay, sock=us)
    srv = await asyncio.start_server(status, None, STATUS_PORT)   # None = every address, IPv4 and IPv6 (a "::" server listens on IPv6 only)
    print(f"PLS Relay {VERSION} on UDP {PORT}, status on TCP {STATUS_PORT}", flush=True)
    asyncio.create_task(sweep())
    async with srv: await srv.serve_forever()

if __name__ == "__main__":
    try: asyncio.run(main())
    except KeyboardInterrupt: sys.exit(0)
