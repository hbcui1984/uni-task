# 贡献指南

感谢你对 uni-dev-task 项目的关注！我们欢迎任何形式的贡献。

## 如何贡献

### 报告 Bug

如果你发现了 Bug，请在 GitHub Issues 中提交，并包含以下信息：

- 问题的详细描述
- 复现步骤
- 预期行为和实际行为
- 运行环境（浏览器版本、操作系统、uni-app 版本等）
- 相关截图或错误日志

### 提交功能建议

如果你有新功能的想法，欢迎在 Issues 中提出。请描述：

- 功能的使用场景
- 期望的实现效果
- 可能的实现方案（如果有的话）

### 提交代码

1. **Fork 本仓库**

2. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **进行开发**
   - 遵循项目现有的代码风格
   - 添加必要的注释
   - 确保代码可以正常运行

4. **提交代码**
   ```bash
   git add .
   git commit -m "feat: 添加xxx功能"
   ```

5. **推送到你的仓库**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **创建 Pull Request**
   - 描述你的更改内容
   - 关联相关的 Issue（如果有）

## 提交规范

请遵循以下 Commit Message 规范：

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

示例：
```
feat: 添加任务优先级筛选功能
fix: 修复子任务状态更新失败的问题
docs: 更新 README 安装说明
```

## 开发环境

### 环境要求

- Node.js >= 14
- HBuilderX（推荐）或 VS Code
- uniCloud 账号

### 本地开发

1. 克隆项目
   ```bash
   git clone https://github.com/your-username/uni-dev-task.git
   cd uni-dev-task
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 配置 uniCloud
   - 复制 `uniCloud-aliyun/config.example.json` 为 `uniCloud-aliyun/config.json`
   - 填写你的配置信息

4. 运行项目
   - 使用 HBuilderX 打开项目
   - 运行到浏览器或模拟器

## 代码规范

- 使用 2 空格缩进
- Vue 组件使用 PascalCase 命名
- 变量和函数使用 camelCase 命名
- 常量使用 UPPER_SNAKE_CASE 命名
- 保持代码简洁，避免过度复杂的逻辑

## 问题反馈

如有任何问题，欢迎通过以下方式联系：

- 提交 [GitHub Issue](https://github.com/your-username/uni-dev-task/issues)

感谢你的贡献！
