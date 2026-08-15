/**
 * Black-Scholes 数学核心单元测试
 * 运行：node test/test.js
 * 验证点：
 *  1. N(x) 已知表值（Φ(0)、Φ(±1.96)）
 *  2. N(x) 对称性：Φ(x) + Φ(-x) = 1
 *  3. N'(x) 表值：φ(0) = 1/√(2π)
 *  4. 与独立高精度数值积分实现的 N(x) 交叉验证
 *  5. 买卖权平价：C - P = S·e^(-δT) - K·e^(-rT)
 *  6. 默认参数下各项数值的合理性
 */
"use strict";
const assert = require("assert");
const { normCdf, normPdf, blackScholes } = require("../app.js");

let passed = 0;
function ok(name, fn) {
  fn();
  passed++;
  console.log("  ✓ " + name);
}

console.log("Black-Scholes 数学核心单元测试\n");

// ---- 1. N(x) 已知表值（A&S 7.1.26 近似精度约 1.5e-7，容差取 2e-7）----
ok("Φ(0) = 0.5", () => {
  assert.ok(Math.abs(normCdf(0) - 0.5) < 2e-7);
});
ok("Φ(1.96) ≈ 0.9750021", () => {
  assert.ok(Math.abs(normCdf(1.96) - 0.975002104852) < 2e-7);
});
ok("Φ(-1.96) ≈ 0.0249979", () => {
  assert.ok(Math.abs(normCdf(-1.96) - 0.024997895148) < 2e-7);
});

// ---- 2. 对称性 ----
ok("Φ(x) + Φ(-x) = 1（多组 x）", () => {
  for (const x of [0, 0.3, -0.7, 1.2, 2.5, -3.1, 4, -5]) {
    assert.ok(Math.abs(normCdf(x) + normCdf(-x) - 1) < 1e-8, `x=${x}`);
  }
});

// ---- 3. N'(x) 表值 ----
ok("φ(0) = 1/√(2π) ≈ 0.3989423", () => {
  assert.ok(Math.abs(normPdf(0) - 0.3989422804014327) < 1e-12);
});

// ---- 4. 与独立数值积分实现的 N(x) 交叉验证 ----
// 用高精度梯形积分直接对 PDF 积分（完全不同的算法路径）
function normCdfByIntegration(x, steps = 500000) {
  const a = -12;
  const h = (x - a) / steps;
  let s = 0.5 * (Math.exp(-0.5 * a * a) + Math.exp(-0.5 * x * x));
  for (let i = 1; i < steps; i++) {
    const t = a + i * h;
    s += Math.exp(-0.5 * t * t);
  }
  return (h * s) / Math.sqrt(2 * Math.PI);
}
ok("N(x) 与高精度数值积分一致（x = -3..3 采样）", () => {
  for (const x of [-3, -2, -1.5, -0.5, 0.1, 0.8, 1.7, 2.6, 3]) {
    assert.ok(Math.abs(normCdf(x) - normCdfByIntegration(x)) < 2e-5, `x=${x}`);
  }
});

// ---- 5. 默认参数 + 买卖权平价 ----
const def = { S: 3, K: 3, sigma: 0.2, T: 0.5, r: 0.02, delta: 0.05 };
const res = blackScholes(def);
assert.ok(res, "默认参数应能计算");

ok("买卖权平价 C - P = S·e^(-δT) - K·e^(-rT)", () => {
  const parity = 3 * Math.exp(-0.05 * 0.5) - 3 * Math.exp(-0.02 * 0.5);
  assert.ok(Math.abs(res.call - res.put - parity) < 1e-9);
});

ok("看涨 Delta − 看跌 Delta = e^(-δT)", () => {
  assert.ok(Math.abs(res.deltaCall - res.deltaPut - Math.exp(-0.05 * 0.5)) < 1e-9);
});

// ---- 6. 默认参数数值合理性（范围检查） ----
console.log("  默认参数 (S=3, K=3, σ=20%, T=0.5, r=2%, δ=5%) 计算结果：");
console.log("  d1 =", res.d1.toFixed(6), " d2 =", res.d2.toFixed(6));
console.log("  N(d1) =", res.Nd1.toFixed(6), " N(d2) =", res.Nd2.toFixed(6));
console.log("  N'(d1) =", res.pd1.toFixed(6), " N'(d2) =", res.pd2.toFixed(6));
console.log("  Call =", res.call.toFixed(6), " Put =", res.put.toFixed(6));
console.log("  Gamma =", res.gamma.toFixed(6), " Theta(call) =", res.thetaCall.toFixed(6), " Vega =", res.vega.toFixed(6));

ok("概率值落在 (0,1)，密度值为正", () => {
  for (const v of [res.Nd1, res.Nd2, res.Nd1Neg, res.Nd2Neg]) assert.ok(v > 0 && v < 1);
  assert.ok(res.pd1 > 0 && res.pd2 > 0);
});
ok("ATM 附近看涨/看跌价格接近且为正", () => {
  assert.ok(res.call > 0 && res.put > 0);
  assert.ok(Math.abs(res.call - res.put) < 0.05, "平价附近二者应接近");
});
ok("看涨 Delta 在 (0,1)，看跌 Delta 在 (-1,0)", () => {
  assert.ok(res.deltaCall > 0 && res.deltaCall < 1);
  assert.ok(res.deltaPut > -1 && res.deltaPut < 0);
});
ok("Gamma 与 Vega 为正", () => {
  assert.ok(res.gamma > 0 && res.vega > 0);
});

ok("默认参数数值与 Python math.erf 高精度交叉验证一致", () => {
  // Python 参考值（math.erf，双精度）
  const ref = {
    d1: -0.0353553391, d2: -0.1767766953,
    Nd1: 0.4858981983, Nd2: 0.4298418976,
    pd1: 0.3986930194, pd2: 0.3927572536,
    call: 0.1450092895, put: 0.1892290546,
    gamma: 0.9165264804, thetaCall: -0.1194234611, vega: 0.8248738324,
  };
  for (const [k, v] of Object.entries(ref)) {
    assert.ok(Math.abs(res[k] - v) < 1e-5, `${k}: JS=${res[k]} Python=${v}`);
  }
});

ok("δ=0 经典 BS 默认值与你给出的参考表一致", () => {
  // 默认参数 S=3, K=3, σ=20%, T=0.5, r=2%, δ=0
  const r0 = blackScholes({ S: 3, K: 3, sigma: 0.2, T: 0.5, r: 0.02, delta: 0 });
  const ref = {
    d1: 0.1414, d2: 0.0000,
    call: 0.1836, put: 0.1538,
    deltaCall: 0.5562, Nd2: 0.5000,
    gamma: 0.9310, vega: 0.8379,
    thetaCall: -0.1973, thetaPut: -0.1379,
  };
  for (const [k, v] of Object.entries(ref)) {
    assert.ok(Math.abs(r0[k] - v) < 5e-4, `${k}: JS=${r0[k].toFixed(6)} 参考=${v}`);
  }
});

// ---- 7. 参数单调性/极限合理性 ----
ok("σ 越大，看涨期权价格越高（时间价值随波动率上升）", () => {
  const lo = blackScholes({ ...def, sigma: 0.1 });
  const hi = blackScholes({ ...def, sigma: 0.4 });
  assert.ok(hi.call > lo.call);
});
ok("K 越大，看涨越便宜、看跌越贵", () => {
  const k1 = blackScholes({ ...def, K: 2 });
  const k2 = blackScholes({ ...def, K: 4 });
  assert.ok(k1.call > k2.call && k1.put < k2.put);
});
ok("T → 到期时看涨 ≈ max(S-K,0)（T 很小）", () => {
  const near = blackScholes({ ...def, T: 1e-4, sigma: 0.2 });
  assert.ok(Math.abs(near.call - 0) < 0.01, "ATM 到期看涨应接近 0");
});

// ---- 8. 非法参数返回 null ----
ok("非法参数（S<=0 / σ<=0 / T<=0）返回 null", () => {
  assert.strictEqual(blackScholes({ ...def, S: 0 }), null);
  assert.strictEqual(blackScholes({ ...def, sigma: 0 }), null);
  assert.strictEqual(blackScholes({ ...def, T: 0 }), null);
  assert.strictEqual(blackScholes({ ...def, S: NaN }), null);
});

console.log(`\n全部通过：${passed} 项断言 ✓`);
