/**
 * Black-Scholes 期权定价模型计算器
 * 数学核心 + 页面交互。数学核心以 UMD 方式导出，Node 端可直接 require 进行单元测试。
 */
(function (global) {
  "use strict";

  const SQRT2PI = Math.sqrt(2 * Math.PI);

  /**
   * 标准正态分布累积分布函数 N(x) = Φ(x) = ½·(1 + erf(x/√2))
   * 采用 Abramowitz & Stegun 7.1.26 的误差函数近似，精度约 1.5e-7。
   */
  function normCdf(x) {
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x) / Math.SQRT2;
    const t = 1 / (1 + 0.3275911 * ax);
    const y =
      1 -
      ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
        t *
        Math.exp(-ax * ax);
    return 0.5 * (1 + sign * y);
  }

  /** 标准正态分布概率密度函数 N'(x) = φ(x) */
  function normPdf(x) {
    return Math.exp(-0.5 * x * x) / SQRT2PI;
  }

  /**
   * Black-Scholes 定价与希腊字母（含连续股息收益率 δ，欧式期权）
   * @param {object} p - { S, K, sigma, T, r, delta }，均为小数（sigma/r/delta 已除 100）
   * @returns 计算对象；参数非法时返回 null
   */
  function blackScholes(p) {
    const S = Number(p.S);
    const K = Number(p.K);
    const sigma = Number(p.sigma);
    const T = Number(p.T);
    const r = Number(p.r);
    const delta = Number(p.delta);

    if (!isFinite(S) || !isFinite(K) || !isFinite(sigma) || !isFinite(T) || !isFinite(r) || !isFinite(delta)) return null;
    if (S <= 0 || K <= 0 || sigma <= 0 || T <= 0) return null;

    const sqrtT = Math.sqrt(T);
    const d1 = (Math.log(S / K) + (r - delta + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
    const d2 = d1 - sigma * sqrtT;

    const Nd1 = normCdf(d1);
    const Nd2 = normCdf(d2);
    const Nd1Neg = normCdf(-d1);
    const Nd2Neg = normCdf(-d2);
    const pd1 = normPdf(d1);
    const pd2 = normPdf(d2);

    const eRT = Math.exp(-r * T);
    const eDT = Math.exp(-delta * T);

    const call = S * eDT * Nd1 - K * eRT * Nd2;
    const put = K * eRT * Nd2Neg - S * eDT * Nd1Neg;

    // 希腊字母（单位：价格变动 1 单位 / 时间 1 年 / 波动率 1 单位）
    const deltaCall = eDT * Nd1;
    const deltaPut = eDT * (Nd1 - 1);
    const gamma = (eDT * pd1) / (S * sigma * sqrtT);
    const thetaCall = -((S * eDT * pd1 * sigma) / (2 * sqrtT)) - r * K * eRT * Nd2 + delta * S * eDT * Nd1;
    const thetaPut = -((S * eDT * pd1 * sigma) / (2 * sqrtT)) + r * K * eRT * Nd2Neg - delta * S * eDT * Nd1Neg;
    const vega = S * eDT * pd1 * sqrtT;
    const rhoCall = K * T * eRT * Nd2;
    const rhoPut = -K * T * eRT * Nd2Neg;

    return {
      d1, d2,
      Nd1, Nd2, Nd1Neg, Nd2Neg,
      pd1, pd2,
      call, put,
      deltaCall, deltaPut,
      gamma,
      thetaCall, thetaPut,
      vega,
      rhoCall, rhoPut,
    };
  }

  const BS = { normCdf, normPdf, blackScholes };

  // ---- 浏览器端 UI 逻辑 ----
  if (typeof document !== "undefined" && document.getElementById("S")) {
    const $ = (id) => document.getElementById(id);
    const inputs = ["S", "K", "sigma", "T", "r", "delta"].map($);
    const Pct = new Set(["sigma", "r", "delta"]);
    const defaults = { S: 3, K: 3, sigma: 20, T: 0.5, r: 2, delta: 0 };

    /** 固定小数位格式化（保留末尾 0，如 0.5000；浮点噪声归零） */
    function fmtFixed(x, digits) {
      if (typeof x !== "number" || !isFinite(x)) return "—";
      if (Math.abs(x) < 1e-12) x = 0; // d2 = d1 − σ√T 等浮点差可能产生 ±1e-17 噪声
      return x.toFixed(digits);
    }

    function compute() {
      const params = {};
      let valid = true;
      for (const id of ["S", "K", "sigma", "T", "r", "delta"]) {
        const v = parseFloat($(id).value);
        if (!isFinite(v)) { valid = false; break; }
        params[id] = Pct.has(id) ? v / 100 : v;
      }
      const hint = $("hint");
      const res = valid ? BS.blackScholes(params) : null;

      if (!res) {
        hint.textContent = valid ? "参数需满足 S>0, K>0, σ>0, T>0" : "请输入有效的数字";
        ["d1","d2","Nd1","Nd2","pd1","pd2","call","put","delta","gamma","vega"].forEach((i) => {
          $(`t-${i}`).textContent = "—";
        });
        ["thetaCall","thetaCallYear","thetaPut","thetaPutYear"].forEach((i) => {
          $(`t-${i}`).textContent = "—";
        });
        return;
      }

      hint.textContent = "";
      $("t-d1").textContent = fmtFixed(res.d1, 4);
      $("t-d2").textContent = fmtFixed(res.d2, 4);
      $("t-Nd1").textContent = fmtFixed(res.Nd1, 4);
      $("t-Nd2").textContent = fmtFixed(res.Nd2, 4);
      $("t-pd1").textContent = fmtFixed(res.pd1, 4);
      $("t-pd2").textContent = fmtFixed(res.pd2, 4);
      $("t-call").textContent = fmtFixed(res.call, 4);
      $("t-put").textContent = fmtFixed(res.put, 4);
      $("t-delta").textContent = fmtFixed(res.deltaCall, 4);
      $("t-gamma").textContent = fmtFixed(res.gamma, 4);
      $("t-vega").textContent = fmtFixed(res.vega, 4);
      $("t-thetaCall").textContent = fmtFixed(res.thetaCall / 365, 6);
      $("t-thetaCallYear").textContent = fmtFixed(res.thetaCall, 4);
      $("t-thetaPut").textContent = fmtFixed(res.thetaPut / 365, 6);
      $("t-thetaPutYear").textContent = fmtFixed(res.thetaPut, 4);
    }

    inputs.forEach((el) => el.addEventListener("input", compute));
    $("resetBtn").addEventListener("click", () => {
      for (const id of Object.keys(defaults)) $(id).value = defaults[id];
      compute();
    });

    compute(); // 页面加载即按默认值计算
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = BS;
  } else {
    global.BS = BS;
  }
})(typeof window !== "undefined" ? window : globalThis);
