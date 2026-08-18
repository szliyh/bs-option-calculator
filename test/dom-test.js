/**
 * 浏览器端 DOM 交互测试（Node 中模拟最小 DOM）
 * 验证：页面加载后自动按默认值计算并写入对照表；修改输入后重新计算；非法输入提示；重置按钮。
 * 运行：node test/dom-test.js
 */
"use strict";
const assert = require("assert");

// ---- 最小 DOM 桩（预置与 index.html 一致的默认输入值）----
const els = {};
const DEFAULT_INPUTS = { S: "3", K: "3", sigma: "20", T: "30", r: "2", delta: "0" };
function makeEl(id) {
  const el = {
    id,
    textContent: "",
    _listeners: {},
    addEventListener(type, fn) { this._listeners[type] = fn; },
    dispatch(type) { if (this._listeners[type]) this._listeners[type](); },
  };
  // 模拟浏览器：给 input.value 赋值时自动转字符串
  Object.defineProperty(el, "value", {
    get() { return this._value; },
    set(v) { this._value = String(v); },
  });
  el._value = DEFAULT_INPUTS[id] || "";
  return el;
}
global.document = {
  getElementById(id) {
    if (!els[id]) els[id] = makeEl(id);
    return els[id];
  },
};

const inputIds = ["S", "K", "sigma", "T", "r", "delta"];

// ---- 加载页面脚本（触发 UI 初始化 + 默认值计算）----
require("../app.js");

let passed = 0;
function ok(name, fn) { fn(); passed++; console.log("  ✓ " + name); }

console.log("浏览器端 DOM 交互测试\n");

ok("六个输入框存在且含默认值（δ=0，T=30 天）", () => {
  assert.strictEqual(els.S.value, "3");
  assert.strictEqual(els.K.value, "3");
  assert.strictEqual(els.sigma.value, "20");
  assert.strictEqual(els.T.value, "30");
  assert.strictEqual(els.r.value, "2");
  assert.strictEqual(els.delta.value, "0");
});

ok("页面加载即按默认参数自动计算（对照表，δ=0 经典 BS，T=30 天）", () => {
  // 与用户给出的参考表一致（T=30/365 年）
  assert.strictEqual(els["t-d1"].textContent, "0.0573");
  assert.strictEqual(els["t-d2"].textContent, "0.0000");
  assert.strictEqual(els["t-Nd1"].textContent, "0.5229");
  assert.strictEqual(els["t-Nd2"].textContent, "0.5000");
  assert.strictEqual(els["t-pd1"].textContent, "0.3983");
  assert.strictEqual(els["t-pd2"].textContent, "0.3989");
  assert.strictEqual(els["t-call"].textContent, "0.0711");
  assert.strictEqual(els["t-put"].textContent, "0.0661");
  assert.strictEqual(els["t-delta"].textContent, "0.5229");
  assert.strictEqual(els["t-gamma"].textContent, "2.3154");
  assert.strictEqual(els["t-vega"].textContent, "0.3426");
  assert.strictEqual(els["t-thetaCall"].textContent, "-0.001224");
  assert.strictEqual(els["t-thetaCallYear"].textContent, "-0.4467");
  assert.strictEqual(els["t-thetaPut"].textContent, "-0.001060");
  assert.strictEqual(els["t-thetaPutYear"].textContent, "-0.3868");
});

ok("输入变化后自动重算（S=10, K=9, σ=30%, T=365天=1年, r=3%, δ=0）", () => {
  const vals = { S: "10", K: "9", sigma: "30", T: "365", r: "3", delta: "0" };
  for (const id of inputIds) { els[id].value = vals[id]; els[id].dispatch("input"); }
  const call = parseFloat(els["t-call"].textContent);
  assert.ok(call > 1.3 && call < 2.0, `call=${call}（深实值看涨应约 1.8）`);
  const dlt = parseFloat(els["t-delta"].textContent);
  assert.ok(dlt > 0.6 && dlt < 1, "实值看涨 Delta 应在 (0.6, 1)");
  assert.ok(els["t-gamma"].textContent !== "—", "Gamma 应有值");
});

ok("δ≠0 时按含股息公式计算（S=3,K=3,σ=20%,T=182.5天=0.5年,r=2%,δ=5%）", () => {
  const vals = { S: "3", K: "3", sigma: "20", T: "182.5", r: "2", delta: "5" };
  for (const id of inputIds) { els[id].value = vals[id]; els[id].dispatch("input"); }
  assert.strictEqual(els["t-d1"].textContent, "-0.0354");
  assert.strictEqual(els["t-call"].textContent, "0.1450");
});

ok("非法输入时提示且显示占位符", () => {
  els.S.value = "-1"; els.S.dispatch("input");
  assert.strictEqual(els["t-Nd1"].textContent, "—");
  assert.ok(els.hint.textContent.length > 0, "应有错误提示");
  // 恢复默认并重算
  els.resetBtn.dispatch("click");
  assert.strictEqual(els["t-Nd1"].textContent, "0.5229");
});

ok("恢复默认值按钮生效（含 δ 回到 0，T 回到 30 天）", () => {
  els.S.value = "10"; els.delta.value = "3"; els.S.dispatch("input"); els.delta.dispatch("input");
  els.resetBtn.dispatch("click");
  assert.strictEqual(els.S.value, "3");
  assert.strictEqual(els.delta.value, "0");
  assert.strictEqual(els.T.value, "30");
  assert.strictEqual(els["t-Nd1"].textContent, "0.5229");
});

console.log(`\n全部通过：${passed} 项断言 ✓`);
