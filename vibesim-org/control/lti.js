export class TransferFunction {
  constructor(num, den, dt = null) {
    this.num = Array.isArray(num) ? num.map(Number) : [Number(num || 0)];
    this.den = Array.isArray(den) ? den.map(Number) : [Number(den || 1)];
    this.dt = dt == null ? null : Number(dt);
  }

  isContinuous() {
    return this.dt == null || this.dt === 0;
  }

  eval(jw) {
    const s = { re: 0, im: jw };
    return evalTransfer(this.num, this.den, s);
  }
}

export const Complex = {
  add: (a, b) => ({ re: a.re + b.re, im: a.im + b.im }),
  sub: (a, b) => ({ re: a.re - b.re, im: a.im - b.im }),
  mul: (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }),
  div: (a, b) => {
    const denom = b.re * b.re + b.im * b.im;
    if (denom === 0) return { re: NaN, im: NaN };
    return {
      re: (a.re * b.re + a.im * b.im) / denom,
      im: (a.im * b.re - a.re * b.im) / denom,
    };
  },
  abs: (a) => Math.hypot(a.re, a.im),
  arg: (a) => Math.atan2(a.im, a.re),
  expj: (theta) => ({ re: Math.cos(theta), im: Math.sin(theta) }),
};

export function evalTransfer(num, den, s) {
  const numVal = evalPoly(num, s);
  const denVal = evalPoly(den, s);
  return Complex.div(numVal, denVal);
}

export function evalPoly(coeffs, s) {
  let out = { re: 0, im: 0 };
  coeffs.forEach((coeff) => {
    out = Complex.mul(out, s);
    out = Complex.add(out, { re: Number(coeff) || 0, im: 0 });
  });
  return out;
}
