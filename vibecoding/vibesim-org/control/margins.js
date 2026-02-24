import { Complex, evalTransfer } from "./lti.js";
import { diagramToFRD, logspace, withZero } from "./diagram.js";

const angleDeg = (z) => (Complex.arg(z) * 180) / Math.PI;
const remainderPositive = (value, mod) => ((value % mod) + mod) % mod;
const phaseMarginDeg = (phaseDeg) => remainderPositive(phaseDeg, 360) - 180;

const makeFRD = (sysdata) => {
  if (sysdata?.omega && sysdata?.response) return sysdata;
  if (Array.isArray(sysdata) && sysdata.length === 3) {
    const [mag, phase, omega] = sysdata;
    const response = omega.map((_, idx) =>
      Complex.mul({ re: mag[idx] || 0, im: 0 }, Complex.expj(((phase[idx] || 0) * Math.PI) / 180))
    );
    return { omega, response };
  }
  if (sysdata?.num && sysdata?.den) {
    const omega = withZero(logspace(-3, 3, 400));
    const response = omega.map((w) => evalTransfer(sysdata.num, sysdata.den, { re: 0, im: w }));
    return { omega, response };
  }
  if (sysdata?.diagram) {
    const omega = withZero(sysdata.omega || logspace(-3, 3, 1200));
    return diagramToFRD(sysdata.diagram, { ...sysdata, omega });
  }
  throw new Error("Unsupported system data for stability_margins.");
};

const evalFRD = (frd, w) => {
  const { omega, response } = frd;
  if (!omega.length) return { re: NaN, im: NaN };
  if (w <= omega[0]) return response[0];
  if (w >= omega[omega.length - 1]) return response[response.length - 1];
  for (let i = 0; i < omega.length - 1; i += 1) {
    const w1 = omega[i];
    const w2 = omega[i + 1];
    if (w1 <= w && w <= w2) {
      const t = (w - w1) / (w2 - w1);
      const a = response[i];
      const b = response[i + 1];
      return {
        re: a.re + (b.re - a.re) * t,
        im: a.im + (b.im - a.im) * t,
      };
    }
  }
  return response[response.length - 1];
};

const findRoots = (frd, f, { allowZero = true } = {}) => {
  const roots = [];
  const { omega } = frd;
  for (let i = 0; i < omega.length - 1; i += 1) {
    const w1 = omega[i];
    const w2 = omega[i + 1];
    const f1 = f(evalFRD(frd, w1));
    const f2 = f(evalFRD(frd, w2));
    if (!Number.isFinite(f1) || !Number.isFinite(f2)) continue;
    if (!allowZero && f1 === 0 && f2 === 0) continue;
    if (allowZero && f1 === 0) {
      roots.push({ w: w1, bracket: [w1, w2] });
      continue;
    }
    if (f1 * f2 > 0) continue;
    let a = w1;
    let b = w2;
    let fa = f1;
    let fb = f2;
    for (let k = 0; k < 10; k += 1) {
      const denom = fb - fa;
      if (Math.abs(denom) < 1e-12) break;
      const c = b - (fb * (b - a)) / denom;
      const fc = f(evalFRD(frd, c));
      a = b;
      fa = fb;
      b = c;
      fb = fc;
    }
    roots.push({ w: b, bracket: [w1, w2] });
  }
  return roots.filter((root) => root.w >= 0);
};

export function stabilityMargins(sysdata, { returnall = false } = {}) {
  const frd = makeFRD(sysdata);
  const evalAtOmega = (w) => {
    if (sysdata?.num && sysdata?.den) return evalTransfer(sysdata.num, sysdata.den, { re: 0, im: w });
    if (sysdata?.diagram) {
      const frdOne = diagramToFRD(sysdata.diagram, { ...sysdata, omega: [w] });
      return frdOne.response[frdOne.response.length - 1];
    }
    return evalFRD(frd, w);
  };
  const refineRoot = (root, f) => {
    const [a0, b0] = root.bracket;
    let a = a0;
    let b = b0;
    let fa = f(evalAtOmega(a));
    let fb = f(evalAtOmega(b));
    if (!Number.isFinite(fa) || !Number.isFinite(fb) || fa * fb > 0) return root.w;
    for (let i = 0; i < 40; i += 1) {
      const mid = (a + b) / 2;
      const fm = f(evalAtOmega(mid));
      if (!Number.isFinite(fm)) break;
      if (fa * fm <= 0) {
        b = mid;
        fb = fm;
      } else {
        a = mid;
        fa = fm;
      }
    }
    return (a + b) / 2;
  };
  const refineMin = (a0, b0, f) => {
    let a = Math.min(a0, b0);
    let b = Math.max(a0, b0);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return a;
    const phi = (1 + Math.sqrt(5)) / 2;
    let c = b - (b - a) / phi;
    let d = a + (b - a) / phi;
    let fc = f(evalAtOmega(c));
    let fd = f(evalAtOmega(d));
    for (let i = 0; i < 60; i += 1) {
      if (!Number.isFinite(fc) || !Number.isFinite(fd)) break;
      if (fc < fd) {
        b = d;
        d = c;
        fd = fc;
        c = b - (b - a) / phi;
        fc = f(evalAtOmega(c));
      } else {
        a = c;
        c = d;
        fc = fd;
        d = a + (b - a) / phi;
        fd = f(evalAtOmega(d));
      }
    }
    return (a + b) / 2;
  };

  const w180Roots = findRoots(frd, (resp) => resp.im, { allowZero: false });
  const wcRoots = findRoots(frd, (resp) => Complex.abs(resp) - 1, { allowZero: true });
  const w_180 = w180Roots.map((root) => root.w);
  const wc = wcRoots.map((root) => refineRoot(root, (resp) => Complex.abs(resp) - 1));

  const wstab = (() => {
    const dist = frd.omega.map((w) => {
      const val = Complex.abs(Complex.add(evalFRD(frd, w), { re: 1, im: 0 }));
      return Number.isFinite(val) ? val : NaN;
    });
    const minima = [];
    for (let i = 1; i < dist.length - 1; i += 1) {
      const prev = dist[i - 1];
      const curr = dist[i];
      const next = dist[i + 1];
      if (!Number.isFinite(curr) || !Number.isFinite(prev) || !Number.isFinite(next)) continue;
      if (curr <= prev && curr < next) minima.push(i);
    }
    if (!minima.length) return [];
    let bestIdx = minima[0];
    minima.forEach((idx) => {
      if (dist[idx] < dist[bestIdx]) bestIdx = idx;
    });
    const left = frd.omega[Math.max(0, bestIdx - 1)];
    const right = frd.omega[Math.min(frd.omega.length - 1, bestIdx + 1)];
    const refined = refineMin(left, right, (resp) => Complex.abs(Complex.add(resp, { re: 1, im: 0 })));
    return [refined];
  })();

  const w180Pairs = w_180
    .map((w) => ({ w, resp: evalAtOmega(w) }))
    .filter((pair) => pair.resp.re <= 0);
  const w180Filtered = w180Pairs.map((pair) => pair.w);
  const w180Resp = w180Pairs.map((pair) => pair.resp);
  const wcPairs = wc
    .map((w) => ({ w, resp: evalAtOmega(w) }))
    .filter((pair) => Number.isFinite(pair.resp.re) && Number.isFinite(pair.resp.im));
  const wcFiltered = wcPairs.map((pair) => pair.w);
  const wcResp = wcPairs.map((pair) => pair.resp);
  const wsResp = wstab.map((w) => evalAtOmega(w));

  const GM = w180Resp.map((resp) => 1 / Complex.abs(resp));
  const PM = wcResp.map((resp) => phaseMarginDeg(angleDeg(resp)));
  const SM = wsResp.map((resp) => Complex.abs(Complex.add(resp, { re: 1, im: 0 })));

  if (returnall) {
    return [GM, PM, SM, w180Filtered, wc, wstab];
  }

  const gm = GM.length ? GM.reduce((best, val) => (Math.abs(Math.log(val)) < Math.abs(Math.log(best)) ? val : best), GM[0]) : Infinity;
  const pm = PM.length ? PM.reduce((best, val) => (Math.abs(val) < Math.abs(best) ? val : best), PM[0]) : Infinity;
  const sm = SM.length ? Math.min(...SM) : Infinity;
  const wpc = w180Filtered.length ? w180Filtered[GM.indexOf(gm)] : NaN;
  const wgc = wcFiltered.length ? wcFiltered[PM.indexOf(pm)] : NaN;
  const wms = wstab.length ? wstab[0] : NaN;

  return [gm, pm, sm, wpc, wgc, wms];
}

export function phaseCrossoverFrequencies(sysdata) {
  const frd = makeFRD(sysdata);
  const w = findRoots(frd, (resp) => Complex.arg(resp));
  const gains = w.map((omega) => evalFRD(frd, omega).re);
  return [w, gains];
}

export function margin(sysdata) {
  const [gm, pm, , wpc, wgc] = stabilityMargins(sysdata);
  return [gm, pm, wpc, wgc];
}
