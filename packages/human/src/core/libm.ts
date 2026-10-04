// biome-ignore-all lint/correctness/noPrecisionLoss: fdlibm constants are kept digit for digit as published; each parses to the intended double.
/**
 * Platform-independent transcendental functions for the engine.
 *
 * Scope: `dexp`, `dlog`, `dcos` and `dpow` return the same bits on every platform, because they use only IEEE-754
 * basic arithmetic (`+ - * /`, which JavaScript never fuses) plus exact helpers (`Math.trunc`, `Math.abs`). The
 * built-in `Math.exp`, `Math.log`, `Math.cos` and non-integer `**` do not: on Node 26 they differ in the last bit
 * between macOS arm64 and Linux x64 (see docs/findings.md, 2026-10-04), which is enough to make a replay diverge.
 * Everything under `packages/human/src` must use these instead; `test/libm.test.ts` enforces that by scanning the
 * source and pins golden output hashes so CI on another architecture catches any drift.
 *
 * `dexp`, `dlog` and the `dcos` kernels are ports of FreeBSD/Sun fdlibm (e_exp.c, e_log.c, k_cos.c, k_sin.c,
 * e_rem_pio2.c), accurate to under 1 ulp. Not covered: `dcos` reduces its argument with three-part Cody–Waite only
 * (no Payne–Hanek), so it loses accuracy for |x| beyond about 2^19·π/2; the engine only passes angles within one
 * day's cycle. `dpow` is exact repeated multiplication for integer exponents up to 64 and `dexp(y·dlog(x))`
 * otherwise, so its relative error grows with |y·ln x| (about 1e-13 at the engine's magnitudes). Determinism is
 * the requirement here, not matching the platform libm bit for bit.
 */

const buf = new DataView(new ArrayBuffer(8));
/** Signed high 32 bits of a double. */
function hi(x: number): number {
  buf.setFloat64(0, x, false);
  return buf.getInt32(0, false);
}
function lo(x: number): number {
  buf.setFloat64(0, x, false);
  return buf.getUint32(4, false);
}
/** `x` with its high word replaced. */
function withHi(x: number, h: number): number {
  buf.setFloat64(0, x, false);
  buf.setInt32(0, h | 0, false);
  return buf.getFloat64(0, false);
}
function fromWords(h: number, l: number): number {
  buf.setInt32(0, h | 0, false);
  buf.setUint32(4, l >>> 0, false);
  return buf.getFloat64(0, false);
}

const LN2_HI = 6.9314718036912381649e-1;
const LN2_LO = 1.90821492927058770002e-10;
const INV_LN2 = Math.LOG2E; // fdlibm's 1.44269504088896338700 parses to this same double
const P1 = 1.66666666666666019037e-1;
const P2 = -2.77777777770155933842e-3;
const P3 = 6.61375632143793436117e-5;
const P4 = -1.6533902205465251539e-6;
const P5 = 4.13813679705723846039e-8;
const O_THRESHOLD = 7.09782712893383973096e2;
const U_THRESHOLD = -7.4513321910194110842e2;
const TWOM1000 = 9.3326361850321887899e-302;

/** e^x, identical on every platform (fdlibm e_exp.c). */
export function dexp(x: number): number {
  let hx = hi(x);
  const xsb = (hx >>> 31) & 1;
  hx &= 0x7fffffff;
  if (hx >= 0x40862e42) {
    if (hx >= 0x7ff00000) {
      if (Number.isNaN(x)) return x;
      return xsb === 0 ? x : 0;
    }
    if (x > O_THRESHOLD) return Number.POSITIVE_INFINITY;
    if (x < U_THRESHOLD) return 0;
  }
  let k = 0;
  let h = 0;
  let l = 0;
  if (hx > 0x3fd62e42) {
    if (hx < 0x3ff0a2b2) {
      h = xsb === 0 ? x - LN2_HI : x + LN2_HI;
      l = xsb === 0 ? LN2_LO : -LN2_LO;
      k = 1 - xsb - xsb;
    } else {
      k = Math.trunc(INV_LN2 * x + (xsb === 0 ? 0.5 : -0.5));
      h = x - k * LN2_HI;
      l = k * LN2_LO;
    }
    x = h - l;
  } else if (hx < 0x3e300000) {
    return 1 + x;
  }
  const t = x * x;
  const c = x - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  if (k === 0) return 1 - ((x * c) / (c - 2) - x);
  const y = 1 - (l - (x * c) / (2 - c) - h);
  if (k >= -1021) return withHi(y, hi(y) + k * 0x100000);
  return withHi(y, hi(y) + (k + 1000) * 0x100000) * TWOM1000;
}

const TWO54 = 1.8014398509481984e16;
const LG1 = 6.66666666666673513e-1;
const LG2 = 3.999999999940941908e-1;
const LG3 = 2.857142874366239149e-1;
const LG4 = 2.222219843214978396e-1;
const LG5 = 1.818357216161805012e-1;
const LG6 = 1.531383769920937332e-1;
const LG7 = 1.479819860511658591e-1;

/** Natural logarithm, identical on every platform (fdlibm e_log.c). */
export function dlog(x: number): number {
  let hx = hi(x);
  const lx = lo(x);
  let k = 0;
  if (hx < 0x00100000) {
    if (((hx & 0x7fffffff) | lx) === 0) return Number.NEGATIVE_INFINITY;
    if (hx < 0) return Number.NaN;
    k -= 54;
    x *= TWO54;
    hx = hi(x);
  }
  if (hx >= 0x7ff00000) return x + x;
  k += (hx >> 20) - 1023;
  hx &= 0x000fffff;
  const i0 = (hx + 0x95f64) & 0x100000;
  x = withHi(x, hx | (i0 ^ 0x3ff00000));
  k += i0 >> 20;
  const f = x - 1;
  if ((0x000fffff & (2 + hx)) < 3) {
    if (f === 0) return k === 0 ? 0 : k * LN2_HI + k * LN2_LO;
    const R = f * f * (0.5 - 0.33333333333333333 * f);
    return k === 0 ? f - R : k * LN2_HI - (R - k * LN2_LO - f);
  }
  const s = f / (2 + f);
  const z = s * s;
  let i = hx - 0x6147a;
  const w = z * z;
  const j = 0x6b851 - hx;
  const t1 = w * (LG2 + w * (LG4 + w * LG6));
  const t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)));
  i |= j;
  const R = t2 + t1;
  if (i > 0) {
    const hfsq = 0.5 * f * f;
    if (k === 0) return f - (hfsq - s * (hfsq + R));
    return k * LN2_HI - (hfsq - (s * (hfsq + R) + k * LN2_LO) - f);
  }
  if (k === 0) return f - s * (f - R);
  return k * LN2_HI - (s * (f - R) - k * LN2_LO - f);
}

const C1 = 4.16666666666666019037e-2;
const C2 = -1.38888888888741095749e-3;
const C3 = 2.48015872894767294178e-5;
const C4 = -2.75573143513906633035e-7;
const C5 = 2.0875723212981748279e-9;
const C6 = -1.13596475577881948265e-11;

function kernelCos(x: number, y: number): number {
  const ix = hi(x) & 0x7fffffff;
  if (ix < 0x3e400000 && Math.trunc(x) === 0) return 1;
  const z = x * x;
  const r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  if (ix < 0x3fd33333) return 1 - (0.5 * z - (z * r - x * y));
  const qx = ix > 0x3fe90000 ? 0.28125 : fromWords(ix - 0x00200000, 0);
  const hz = 0.5 * z - qx;
  const a = 1 - qx;
  return a - (hz - (z * r - x * y));
}

const S1 = -1.66666666666666324348e-1;
const S2 = 8.33333333332248946124e-3;
const S3 = -1.98412698298579493134e-4;
const S4 = 2.75573137070700676789e-6;
const S5 = -2.50507602534068634195e-8;
const S6 = 1.58969099521155010221e-10;

function kernelSin(x: number, y: number): number {
  const ix = hi(x) & 0x7fffffff;
  if (ix < 0x3e400000 && Math.trunc(x) === 0) return x;
  const z = x * x;
  const v = z * x;
  const r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  return x - (z * (0.5 * y - v * r) - y - v * S1);
}

const INV_PIO2 = 6.36619772367581382433e-1;
const PIO2_1 = 1.57079632673412561417;
const PIO2_1T = 6.07710050650619224932e-11;
const PIO2_2 = 6.0771005063039659766e-11;
const PIO2_2T = 2.02226624879595063154e-21;
const PIO2_3 = 2.0222662487111664558e-21;
const PIO2_3T = 8.47842766036889956997e-32;

/** cos(x), identical on every platform (fdlibm s_cos.c with Cody–Waite reduction only). */
export function dcos(x: number): number {
  const hx = hi(x);
  const ix = hx & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelCos(x, 0);
  if (ix >= 0x7ff00000) return Number.NaN;
  // Reduce |x| to r = y0 + y1 in [-pi/4, pi/4] with |x| = n*pi/2 + r (fdlibm e_rem_pio2.c, medium path).
  const t0 = Math.abs(x);
  const n = Math.trunc(t0 * INV_PIO2 + 0.5);
  let r = t0 - n * PIO2_1;
  let w = n * PIO2_1T;
  const j = ix >> 20;
  let y0 = r - w;
  let i = j - ((hi(y0) >> 20) & 0x7ff);
  if (i > 16) {
    let t = r;
    w = n * PIO2_2;
    r = t - w;
    w = n * PIO2_2T - (t - r - w);
    y0 = r - w;
    i = j - ((hi(y0) >> 20) & 0x7ff);
    if (i > 49) {
      t = r;
      w = n * PIO2_3;
      r = t - w;
      w = n * PIO2_3T - (t - r - w);
      y0 = r - w;
    }
  }
  const y1 = r - y0 - w;
  // cos is even, so the sign of x does not change the quadrant.
  switch (n % 4) {
    case 0:
      return kernelCos(y0, y1);
    case 1:
      return -kernelSin(y0, y1);
    case 2:
      return -kernelCos(y0, y1);
    default:
      return kernelSin(y0, y1);
  }
}

/** x^y, identical on every platform. Exact repeated multiplication for integer |y| <= 64, else exp(y ln x). */
export function dpow(x: number, y: number): number {
  if (y === 0) return 1;
  if (Number.isNaN(x) || Number.isNaN(y)) return Number.NaN;
  if (Number.isInteger(y) && Math.abs(y) <= 64) {
    let e = Math.abs(y);
    let base = x;
    let acc = 1;
    while (e > 0) {
      if (e & 1) acc *= base;
      e >>= 1;
      if (e > 0) base *= base;
    }
    return y < 0 ? 1 / acc : acc;
  }
  if (x === 1) return 1;
  if (x === 0) return y > 0 ? 0 : Number.POSITIVE_INFINITY;
  if (x < 0) {
    if (!Number.isInteger(y)) return Number.NaN;
    const m = dexp(y * dlog(-x));
    return y % 2 === 0 ? m : -m;
  }
  return dexp(y * dlog(x));
}
