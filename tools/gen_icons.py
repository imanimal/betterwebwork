"""Draw BetterWebWork's icons (stdlib only): a worksheet on an ink square, two lines of problem text and an answer
box in the Paper theme's ink blue. Writes icons/icon-{16,32,48,96,128}.png. Run: python tools/gen_icons.py"""
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons")
SS = 4  # supersamples per axis


def hexc(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


INK = hexc("#24221e")
PAPER = hexc("#fbf9f3")
QUIET = hexc("#9a958a")
BLUE = hexc("#2a4fa8")
FIELD = hexc("#ffffff")


def rr(x0, y0, x1, y1, r):
    """Inside test for a rounded rectangle in unit space."""
    def inside(x, y):
        if x < x0 or x > x1 or y < y0 or y > y1:
            return False
        cx = min(max(x, x0 + r), x1 - r)
        cy = min(max(y, y0 + r), y1 - r)
        return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
    return inside


def layers(n):
    small = n <= 20
    out = [(rr(0.02, 0.02, 0.98, 0.98, 0.2), INK)]
    if small:
        out += [
            (rr(0.17, 0.12, 0.83, 0.88, 0.07), PAPER),
            (rr(0.28, 0.26, 0.72, 0.38, 0.03), INK),
            (rr(0.28, 0.56, 0.72, 0.76, 0.04), BLUE),
        ]
        return out
    out += [
        (rr(0.19, 0.12, 0.81, 0.88, 0.06), PAPER),
        (rr(0.29, 0.24, 0.71, 0.30, 0.03), INK),
        (rr(0.29, 0.36, 0.58, 0.42, 0.03), QUIET),
        (rr(0.29, 0.54, 0.71, 0.76, 0.04), BLUE),
        (rr(0.325, 0.585, 0.675, 0.715, 0.02), FIELD),
        (rr(0.36, 0.625, 0.375, 0.675, 0.005), INK),  # the caret in the answer box
    ]
    return out


def render(n):
    ls = layers(n)
    rows = []
    for py in range(n):
        row = bytearray()
        for px in range(n):
            acc = [0.0, 0.0, 0.0]
            cover = 0
            for sy in range(SS):
                for sx in range(SS):
                    x = (px + (sx + 0.5) / SS) / n
                    y = (py + (sy + 0.5) / SS) / n
                    col = None
                    for test, c in ls:
                        if test(x, y):
                            col = c
                    if col is not None:
                        cover += 1
                        for i in range(3):
                            acc[i] += col[i]
            a = cover / (SS * SS)
            if cover:
                row += bytes(int(round(acc[i] / cover)) for i in range(3)) + bytes([int(round(a * 255))])
            else:
                row += b"\0\0\0\0"
        rows.append(bytes(row))
    return rows


def png(rows):
    n = len(rows)
    raw = b"".join(b"\0" + r for r in rows)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", n, n, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


def main():
    os.makedirs(OUT, exist_ok=True)
    for n in (16, 32, 48, 96, 128):
        with open(os.path.join(OUT, f"icon-{n}.png"), "wb") as f:
            f.write(png(render(n)))
        print(f"icons/icon-{n}.png")


if __name__ == "__main__":
    main()
