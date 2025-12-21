# uni-task 主题换肤指南

> 本文以「钉钉蓝」为例，演示如何快速将 uni-task 切换为自定义主题色。

**推广文章标题备选：**
- 《uni-task 主题换肤：3 个文件搞定全局换色》
- 《如何为 uni-app 项目快速换肤（附完整配置）》
- 《uni-app 主题定制实战：从 Vue 绿到钉钉蓝》
- 《开源项目 uni-task 换肤教程，一学就会》

## 效果预览

| 默认主题（Vue 绿） | 钉钉蓝主题 |
|:------------------:|:----------:|
| todo-默认主题截图 | todo-钉钉蓝主题截图 |

## 主题色对照表

| 主题名称 | 主色 | 浅色 | 深色 | 适用场景 |
|----------|------|------|------|----------|
| Vue 绿（默认） | `#42b983` | `#5fd89f` | `#359568` | 清新、技术感 |
| 钉钉蓝 | `#1677ff` | `#4096ff` | `#0958d9` | 商务、专业 |
| 飞书紫 | `#3370ff` | `#5c8cff` | `#1f4dd8` | 现代、年轻 |
| 企微绿 | `#07c160` | `#38d979` | `#06ad56` | 活力、社交 |
| 珊瑚橙 | `#ff6b6b` | `#ff8787` | `#fa5252` | 热情、活泼 |

---

## 快速换肤：3 个文件搞定

uni-task 的主题系统设计简洁，只需修改 **3 个文件** 即可完成全局换肤。

### 文件清单

```
├── uni.scss              # SCSS 变量（uni-ui 组件）
├── common/
│   ├── theme.js          # JS 主题配置（逻辑层）
│   └── global.scss       # CSS 变量（样式层）
```

---

## 第一步：修改 uni.scss

这个文件定义了 uni-ui 组件库使用的主色，影响按钮、开关、复选框等组件。

**文件路径**：`/uni.scss`

### 修改前（Vue 绿）

```scss
/* 行为相关颜色 */
$uni-color-primary: #42b983;

$themes: (
    default: (
        primary-color: #42b983,
        // ...
    ),
    green: (
        primary-color: #42b983,
        // ...
    )
);
```

### 修改后（钉钉蓝）

```scss
/* 行为相关颜色 */
$uni-color-primary: #1677ff;

$themes: (
    default: (
        primary-color: #1677ff,
        // ...
    ),
    blue: (
        primary-color: #1677ff,
        // ...
    )
);
```

**关键改动**：
1. `$uni-color-primary` 改为 `#1677ff`
2. `$themes` 中的 `primary-color` 改为 `#1677ff`
3. 可选：将主题名 `green` 改为 `blue`

---

## 第二步：修改 common/theme.js

这个文件定义了 JavaScript 中使用的主题变量，用于动态样式计算。

**文件路径**：`/common/theme.js`

### 修改前（Vue 绿）

```javascript
export default {
    colors: {
        // 主色 - Vue 绿色系
        primary: '#42b983',
        primaryLight: '#5fd89f',
        primaryLighter: '#7de3b3',
        primaryDark: '#359568',
        primaryDarker: '#2a7a53',

        // 功能色
        success: '#42b983',  // 与主色一致

        // 背景色
        bgHover: '#f0fdf7',
        bgActive: '#e6fcf5',

        // 阴影色
        shadow: 'rgba(66, 185, 131, 0.1)',
    },

    shadows: {
        primary: '0 4px 14px 0 rgba(66, 185, 131, 0.2)',
        primaryLg: '0 8px 24px 0 rgba(66, 185, 131, 0.25)',
    },
}
```

### 修改后（钉钉蓝）

```javascript
export default {
    colors: {
        // 主色 - 钉钉蓝色系
        primary: '#1677ff',
        primaryLight: '#4096ff',
        primaryLighter: '#69b1ff',
        primaryDark: '#0958d9',
        primaryDarker: '#003eb3',

        // 功能色
        success: '#52c41a',  // 蓝色主题建议用独立的绿色作为成功色

        // 背景色
        bgHover: '#e6f4ff',
        bgActive: '#bae0ff',

        // 阴影色
        shadow: 'rgba(22, 119, 255, 0.1)',
    },

    shadows: {
        primary: '0 4px 14px 0 rgba(22, 119, 255, 0.2)',
        primaryLg: '0 8px 24px 0 rgba(22, 119, 255, 0.25)',
    },
}
```

**关键改动**：
1. 主色系 5 个值全部替换
2. `success` 建议改为独立的绿色（蓝色主题下与主色区分）
3. `bgHover`、`bgActive` 改为浅蓝色
4. `shadow` 中的 rgba 颜色改为蓝色

---

## 第三步：修改 common/global.scss

这个文件定义了 CSS 变量，是样式层的核心配置。

**文件路径**：`/common/global.scss`

### 修改前（Vue 绿）

```scss
:root {
    /* 主色系 */
    --color-primary: #42b983;
    --color-primary-light: #5fd89f;
    --color-primary-lighter: #7de3b3;
    --color-primary-dark: #359568;
    --color-primary-darker: #2a7a53;

    /* 功能色 */
    --color-success: #42b983;

    /* 背景色 */
    --color-bg-hover: #f0fdf7;
    --color-bg-active: #e6fcf5;

    /* 阴影 */
    --shadow-primary: 0 4px 14px 0 rgba(66, 185, 131, 0.2);
    --shadow-primary-lg: 0 8px 24px 0 rgba(66, 185, 131, 0.25);
}
```

### 修改后（钉钉蓝）

```scss
:root {
    /* 主色系 */
    --color-primary: #1677ff;
    --color-primary-light: #4096ff;
    --color-primary-lighter: #69b1ff;
    --color-primary-dark: #0958d9;
    --color-primary-darker: #003eb3;

    /* 功能色 */
    --color-success: #52c41a;

    /* 背景色 */
    --color-bg-hover: #e6f4ff;
    --color-bg-active: #bae0ff;

    /* 阴影 */
    --shadow-primary: 0 4px 14px 0 rgba(22, 119, 255, 0.2);
    --shadow-primary-lg: 0 8px 24px 0 rgba(22, 119, 255, 0.25);
}
```

---

## 完整替换对照表

为方便批量替换，这里列出所有需要修改的颜色值：

| 用途 | Vue 绿 | 钉钉蓝 |
|------|--------|--------|
| 主色 | `#42b983` | `#1677ff` |
| 主色-浅 | `#5fd89f` | `#4096ff` |
| 主色-更浅 | `#7de3b3` | `#69b1ff` |
| 主色-深 | `#359568` | `#0958d9` |
| 主色-更深 | `#2a7a53` | `#003eb3` |
| 悬浮背景 | `#f0fdf7` | `#e6f4ff` |
| 激活背景 | `#e6fcf5` | `#bae0ff` |
| 成功色 | `#42b983` | `#52c41a` |
| 阴影 RGB | `66, 185, 131` | `22, 119, 255` |

### 使用编辑器批量替换

在 VS Code 或 HBuilderX 中，使用全局替换功能：

1. 按 `Ctrl + Shift + H`（Windows）或 `Cmd + Shift + H`（Mac）
2. 依次替换上表中的颜色值
3. 注意：只替换 `common/` 目录和 `uni.scss` 文件

---

## 验证换肤效果

### 1. 重新编译项目

```bash
# H5
npm run dev:h5

# 或微信小程序
npm run dev:mp-weixin
```

### 2. 检查关键页面

- [ ] 项目列表页 - 顶部标题栏、按钮颜色
- [ ] 任务列表页 - 分组头部渐变、任务状态图标
- [ ] 任务详情页 - 头部渐变、操作按钮
- [ ] 表单页面 - 输入框焦点边框、提交按钮
- [ ] 个人中心 - 头像边框、设置项图标

### 3. 检查交互状态

- [ ] 按钮悬浮（hover）效果
- [ ] 输入框获得焦点（focus）边框
- [ ] 复选框选中颜色
- [ ] 链接文字颜色

---

## 进阶：生成配套色板

如果你想使用其他主题色，可以通过以下工具生成配套色板：

### 在线工具

1. **Ant Design 色板生成器**
   - 地址：https://ant.design/docs/spec/colors-cn
   - 输入主色，自动生成 10 级色阶

2. **Coolors 配色工具**
   - 地址：https://coolors.co/
   - 可视化调整，导出多种格式

3. **Color Hunt**
   - 地址：https://colorhunt.co/
   - 提供流行配色方案参考

### 色板生成规则

| 色阶 | 用途 | 生成方法 |
|------|------|----------|
| primaryLighter | 极浅背景 | 主色 + 白色 60% |
| primaryLight | 悬浮状态 | 主色 + 白色 30% |
| primary | 主色 | 基准色 |
| primaryDark | 按下状态 | 主色 + 黑色 15% |
| primaryDarker | 深色强调 | 主色 + 黑色 30% |

### JavaScript 辅助函数

项目内置了颜色处理函数，可用于动态生成色板：

```javascript
import { getColorWithOpacity, getGradient } from '@/common/theme.js'

// 生成带透明度的颜色
const shadowColor = getColorWithOpacity('#1677ff', 0.2)
// 结果：rgba(22, 119, 255, 0.2)

// 生成渐变色
const gradient = getGradient('#1677ff', '#0958d9', '135deg')
// 结果：linear-gradient(135deg, #1677ff, #0958d9)
```

---

## 常见问题

### Q: 修改后部分组件颜色没变？

**A**: 检查以下情况：

1. **uni-ui 组件**：确保修改了 `uni.scss` 中的 `$uni-color-primary`
2. **硬编码颜色**：部分页面可能直接写了颜色值，需要搜索替换
3. **缓存问题**：清除浏览器缓存或小程序缓存后重试

搜索项目中的硬编码颜色：

```bash
# 在项目根目录执行
grep -r "#42b983" --include="*.vue" --include="*.scss" --include="*.css"
```

### Q: 如何支持多主题切换？

**A**: 项目已预留主题切换能力，`uni.scss` 中的 `$themes` 支持定义多套主题：

```scss
$themes: (
    default: (primary-color: #1677ff),
    green: (primary-color: #42b983),
    orange: (primary-color: #ff6b6b)
);
```

通过 `data-theme` 属性切换：

```javascript
// 切换到绿色主题
document.body.setAttribute('data-theme', 'green')
```

### Q: 小程序端和 H5 端颜色不一致？

**A**: 小程序不支持 CSS 变量的动态修改，需要确保：

1. `uni.scss` 中的 SCSS 变量正确设置
2. 编译时变量已生效（重新编译）
3. 检查是否有平台条件编译的样式差异

---

## 预设主题包

为方便使用，这里提供几套常用主题的完整配置：

### 钉钉蓝

```javascript
{
    primary: '#1677ff',
    primaryLight: '#4096ff',
    primaryLighter: '#69b1ff',
    primaryDark: '#0958d9',
    primaryDarker: '#003eb3',
    bgHover: '#e6f4ff',
    bgActive: '#bae0ff',
    success: '#52c41a'
}
```

### 飞书紫

```javascript
{
    primary: '#3370ff',
    primaryLight: '#5c8cff',
    primaryLighter: '#85a8ff',
    primaryDark: '#1f4dd8',
    primaryDarker: '#0f2eb3',
    bgHover: '#eef3ff',
    bgActive: '#d4e0ff',
    success: '#34c759'
}
```

### 企业微信绿

```javascript
{
    primary: '#07c160',
    primaryLight: '#38d979',
    primaryLighter: '#69e89a',
    primaryDark: '#06ad56',
    primaryDarker: '#048a45',
    bgHover: '#e6fff0',
    bgActive: '#b3ffd6',
    success: '#07c160'
}
```

### 珊瑚橙

```javascript
{
    primary: '#ff6b6b',
    primaryLight: '#ff8787',
    primaryLighter: '#ffa8a8',
    primaryDark: '#fa5252',
    primaryDarker: '#f03e3e',
    bgHover: '#fff5f5',
    bgActive: '#ffe3e3',
    success: '#51cf66'
}
```

---

## 总结

uni-task 的主题系统采用「三层架构」：

| 层级 | 文件 | 作用 |
|------|------|------|
| SCSS 变量层 | `uni.scss` | uni-ui 组件主题 |
| JS 配置层 | `common/theme.js` | 动态样式计算 |
| CSS 变量层 | `common/global.scss` | 全局样式变量 |

只需修改这 3 个文件中的主色相关配置，即可实现全局换肤。

---

**欢迎 Star 支持：** https://github.com/hbcui1984/uni-task
