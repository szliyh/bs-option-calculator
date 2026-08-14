/**
 * 浏览器端 DOM 交互测试（Node 中模拟最小 DOM）
 * 验证：页面加载后会自动按默认值计算，并把结果写入 DOM；修改输入后重新计算。
 * 运行：node test/dom-test.js
 */
"use strict";
const assert = require("assert");

// ---- 最小 DOM 桩（预置与 index.html 一致的默认输入值）----
const els = {};
const DEFAULT_INPUTS = { S: "3", K: "3", sigma: "20", T: "0.5", r: "2", delta: "5" };
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
const outIds = ["d1","d2","Nd1","Nd2","pd1","pd2","call","put","deltaCall","deltaPut","gamma","thetaCall","thetaPut","vega","rhoCall","rhoPut","thetaCallDay","thetaPutDay"];

// ---- 加载页面脚本（触发 UI 初始化 + 默认值计算）----
require("../app.js");

let passed = 0;
function ok(name, fn) { fn(); passed++; console.log("  ✓ " + name); }

console.log("浏览器端 DOM 交互测试\n");

ok("六个输入框存在且含默认值", () => {
  assert.strictEqual(els.S.value, "3");
  assert.strictEqual(els.K.value, "3");
  assert.strictEqual(els.sigma.value, "20");
  assert.strictEqual(els.T.value, "0.5");
  assert.strictEqual(els.r.value, "2");
  assert.strictEqual(els.delta.value, "5");
});

ok("页面加载即按默认值自动计算并写入结果", () => {
  assert.strictEqual(els["out-Nd1"].textContent, "0.485898");
  assert.strictEqual(els["out-Nd2"].textContent, "0.429842");
  assert.strictEqual(els["out-pd1"].textContent, "0.398693");
  assert.strictEqual(els["out-pd2"].textContent, "0.392757");
  assert.strictEqual(els["out-gamma"].textContent, "0.916526");
  assert.strictEqual(els["out-thetaCall"].textContent, "-0.119423");
  assert.strictEqual(els["out-vega"].textContent, "0.824874");
});

ok("输入变化后自动重算（S=10, K=9, σ=30%, T=1, r=3%, δ=0%）", () => {
  const vals = { S: "10", K: "9", sigma: "30", T: "1", r: "3", delta: "0" };
  for (const id of inputIds) { els[id].value = vals[id]; els[id].dispatch("input"); }
  const call = parseFloat(els["out-call"].textContent);
  assert.ok(call > 1.3 && call < 2.0, `call=${call}（深实值看涨应约 1.6）`);
  assert.ok(parseFloat(els["out-deltaCall"].textContent) > 0.6 && parseFloat(els["out-deltaCall"].textContent) < 1, "实值看涨 Delta 应在 (0.6, 1)");
  assert.strictEqual(els["out-gamma"].textContent !== "—", true);
});

ok("非法输入时提示且显示占位符", () => {
  els.S.value = "-1"; els.S.dispatch("input");
  assert.strictEqual(els["out-Nd1"].textContent, "—");
  assert.ok(els.hint.textContent.length > 0, "应有错误提示");
  // 恢复默认并重算
  els.resetBtn.dispatch("click");
  assert.strictEqual(els["out-Nd1"].textContent, "0.485898");
});

ok("恢复默认值按钮生效", () => {
  els.S.value = "10"; els.S.dispatch("input");
  els.resetBtn.dispatch("click");
  assert.strictEqual(els.S.value, "3");
  assert.strictEqual(els["out-Nd1"].textContent, "0.485898");
});

console.log(`\n全部通过：${passed} 项断言 ✓`);
