# Black-Scholes 期权定价模型计算器

一个纯前端、零依赖的 Black-Scholes 期权定价模型计算器（含连续股息收益率 δ，适用于欧式期权）。输入 S、K、σ、T、r、δ 后自动实时计算 N(d1)、N(d2)、N′(d1)、N′(d2) 以及 Gamma、Theta、Vega 等希腊字母，并在页面底部展示 BS 公式原文（含 N(x)、N′(x) 定义）。

🔗 在线访问：[https://szliyh.github.io/bs-option-calculator/](https://szliyh.github.io/bs-option-calculator/)

## 功能特性

- 六个输入参数（默认值 S=3, K=3, σ=20%, T=0.5年, r=2%, δ=5%），修改即自动重算
- 计算结果：
  - 概率项：N(d₁)、N(d₂)、N′(d₁)、N′(d₂)
  - 期权价格：看涨 C、看跌 P
  - 希腊字母：Delta（看涨/看跌）、Gamma、Theta（按年/按日）、Vega、Rho（看涨/看跌）
  - 中间量：d₁、d₂
- 页面底部展示 Black-Scholes 公式原文与 N(x)、N′(x) 的数学定义
- 参数校验（S>0, K>0, σ>0, T>0）与错误提示
- 纯静态页面，无任何外部依赖，可直接双击打开或部署到任意静态托管

## 计算公式

欧式看涨期权：

$$C = S \cdot e^{-\delta T} \cdot N(d_1) - K \cdot e^{-rT} \cdot N(d_2)$$

欧式看跌期权：

$$P = K \cdot e^{-rT} \cdot N(-d_2) - S \cdot e^{-\delta T} \cdot N(-d_1)$$

其中：

$$d_1 = \frac{\ln(S/K) + (r - \delta + \sigma^2/2) \cdot T}{\sigma \sqrt{T}}, \qquad d_2 = d_1 - \sigma \sqrt{T}$$

标准正态分布累积函数与密度函数：

$$N(x) = \Phi(x) = \frac{1}{\sqrt{2\pi}} \int_{-\infty}^{x} e^{-t^2/2}\,dt, \qquad N'(x) = \phi(x) = \frac{1}{\sqrt{2\pi}} e^{-x^2/2}$$

希腊字母（含股息收益率 δ）：

| 希腊字母 | 公式 |
| --- | --- |
| Δ 看涨 | $e^{-\delta T} N(d_1)$ |
| Δ 看跌 | $e^{-\delta T} (N(d_1) - 1)$ |
| Γ | $\dfrac{e^{-\delta T} N'(d_1)}{S \sigma \sqrt{T}}$ |
| Θ 看涨 | $-\dfrac{S e^{-\delta T} N'(d_1) \sigma}{2\sqrt{T}} - rK e^{-rT} N(d_2) + \delta S e^{-\delta T} N(d_1)$ |
| Θ 看跌 | $-\dfrac{S e^{-\delta T} N'(d_1) \sigma}{2\sqrt{T}} + rK e^{-rT} N(-d_2) - \delta S e^{-\delta T} N(-d_1)$ |
| V | $S e^{-\delta T} N'(d_1) \sqrt{T}$ |
| ρ 看涨 | $K T e^{-rT} N(d_2)$ |
| ρ 看跌 | $-K T e^{-rT} N(-d_2)$ |

## 项目结构

```
bs-option-calculator/
├── index.html     # 页面结构（输入、结果、公式区）
├── style.css      # 样式
├── app.js         # 数学核心（UMD 导出）+ 页面交互
├── test/
│   ├── test.js        # 数学核心单元测试（node test/test.js）
│   └── dom-test.js    # DOM 交互测试（node test/dom-test.js）
└── README.md
```

## 本地运行与测试

```bash
# 方式一：直接双击 index.html 打开
# 方式二：本地静态服务器
python -m http.server 8000
# 浏览器访问 http://127.0.0.1:8000

# 运行数学核心单元测试
node test/test.js

# 运行页面 DOM 交互测试
node test/dom-test.js
```

测试覆盖：N(x) 表值、对称性、与高精度数值积分及 Python `math.erf` 交叉验证、买卖权平价、Delta 平价关系、参数单调性、到期极限、非法参数处理等。

## 假设与说明

- 欧式期权（到期前不可行权）
- 标的资产价格服从几何布朗运动，波动率 σ 恒定
- 无交易成本与税收，市场无套利
- 连续股息收益率 δ（δ=0 即标准 BS 模型）
- σ、r、δ 输入为百分比（如 20 表示 20%），内部除以 100 计算
- Theta 为时间衰减（按年），页面同时给出按日（÷365）口径
