# unicloud-db 组件 vs 云函数：全面对比分析

> 本文档详细对比了在 uniCloud 项目中使用 `unicloud-db` 组件（客户端 JQL）与自定义云函数两种数据查询方案的优缺点。

---

## 一、架构对比图

### JQL 的本质

**重要认知**：JQL 并不是"免云函数"的方案。其本质是：

1. 前端发送 JQL 请求到云端
2. 云端有一个**内置的云函数**（如 `clientDB`）接收请求
3. 该内置云函数解析 JQL 语法，组装成数据库查询指令
4. 执行数据库查询并返回结果

因此，JQL 同样消耗云函数资源，也存在冷启动问题。

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    方案A：unicloud-db 组件（客户端JQL）                   │
├─────────────────────────────────────────────────────────────────────────┤
│  前端                           │              云端                      │
│  ┌──────────────┐              │    ┌─────────────────────┐            │
│  │ Vue 组件     │              │    │ 内置云函数 clientDB │            │
│  │ - 构建查询   │  ─────────►  │    │   - 解析 JQL 语法   │            │
│  │ - 权限逻辑   │   JQL请求    │    │   - Schema权限校验  │            │
│  │ - 渲染数据   │  ◄─────────  │    │   - 执行数据库查询  │            │
│  └──────────────┘    数据      │    └─────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    方案B：自定义云函数（服务端逻辑）                       │
├─────────────────────────────────────────────────────────────────────────┤
│  前端                           │              云端                      │
│  ┌──────────────┐              │    ┌─────────────────────┐            │
│  │ Vue 组件     │              │    │   自定义云函数      │            │
│  │ - 调用云函数 │  ─────────►  │    │   - 权限判断        │            │
│  │ - 渲染数据   │   简单参数   │    │   - 数据库查询      │            │
│  │              │  ◄─────────  │    │   - 数据组装        │            │
│  └──────────────┘   处理好的数据│    └─────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 二、多维度对比分析

### 1. 编码难度

| 维度 | unicloud-db 组件 | 云函数 |
|------|-----------------|--------|
| **简单查询** | ⭐ 极简，声明式配置 | 需要写函数代码 |
| **联表查询** | 需要理解 JQL 语法和 getTemp() | 直接用原生 API，更直观 |
| **权限控制** | 分散在 Schema + 前端计算属性 | 集中在云函数内，逻辑清晰 |
| **分页加载** | 内置支持，配置即可 | 需手动实现 |
| **学习成本** | 需学习 JQL、Schema 权限语法 | 熟悉 JS 即可 |

#### 代码对比示例

**方案A：unicloud-db（客户端 JQL）**

```javascript
// 前端需要处理复杂的权限逻辑
computed: {
  collection() {
    const db = uniCloud.database()

    // 权限检查逻辑在前端
    if (!this.userProjectIds || this.userProjectIds.length === 0) {
      return [emptyQuery, userTemp, projectTemp]
    }

    // 构建查询条件
    if (this.selectedProjectId) {
      if (this.userProjectIds.includes(this.selectedProjectId)) {
        mainTableConditions.project_id = this.selectedProjectId
      } else {
        mainTableConditions._id = '__non_existent_id__'
      }
    } else {
      mainTableConditions.project_id = db.command.in(this.userProjectIds)
    }

    // 还要先查项目列表
    // 还要处理字段权限问题
    // ...约 50 行代码
  }
}
```

**方案B：云函数**

```javascript
// 前端极简
async loadLogs() {
  const res = await uniCloud.callFunction({
    name: 'task-logs',
    data: {
      projectId: this.selectedProjectId,
      memberId: this.selectedMemberId,
      page: this.page,
      pageSize: 20
    }
  })
  this.logs = res.result.data
}

// 云函数（所有逻辑集中处理）
// uniCloud-aliyun/cloudfunctions/task-logs/index.js
exports.main = async (event, context) => {
  const { projectId, memberId, page, pageSize } = event
  const uid = context.CLIENTUID

  // 1. 获取用户有权限的项目
  const userProjects = await db.collection('opendb-projects')
    .where(dbCmd.or([
      { members: uid },
      { managers: uid }
    ]))
    .field({ _id: 1 })
    .get()

  const projectIds = userProjects.data.map(p => p._id)

  // 2. 权限校验
  if (projectIds.length === 0) {
    return { code: 0, data: [], message: '无项目权限' }
  }

  // 3. 构建查询
  const where = { project_id: dbCmd.in(projectIds) }
  if (projectId) where.project_id = projectId
  if (memberId) where.user_id = memberId

  // 4. 查询并联表
  const logs = await db.collection('opendb-task-logs')
    .aggregate()
    .match(where)
    .lookup({...})  // 联表
    .sort({ create_time: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .end()

  return { code: 0, data: logs.data }
}
```

**结论**：简单场景 unicloud-db 更快，复杂权限场景云函数更清晰。

---

### 2. 可读性与可维护性

| 维度 | unicloud-db 组件 | 云函数 |
|------|-----------------|--------|
| **逻辑集中度** | ❌ 分散（Schema + 前端 + 计算属性） | ✅ 集中在一个文件 |
| **调试难度** | ❌ 难（需要理解 JQL 执行过程） | ✅ 可以打断点、加日志 |
| **代码审查** | ❌ 需要看多个文件 | ✅ 一个函数看完所有逻辑 |
| **团队协作** | ❌ 前后端耦合 | ✅ 前后端分离清晰 |

**unicloud-db 实现的问题：**

要理解动态页面的权限逻辑，需要查看：

1. `pages/task-logs/task-logs.vue` - collection 计算属性
2. `pages/task-logs/task-logs.vue` - getProjects() 方法
3. `uniCloud/database/opendb-task-logs.schema.json` - read 权限
4. `uniCloud/database/uni-id-users.schema.json` - 字段权限
5. `uniCloud/database/opendb-projects.schema.json` - read 权限

---

### 3. 性能与用户体验

| 维度 | unicloud-db 组件 | 云函数 |
|------|-----------------|--------|
| **首次加载** | 需要多次请求（先查项目，再查日志） | 一次请求返回所有数据 |
| **网络请求数** | 当前实现：2-3次 | 1次 |

#### 请求流程对比

**方案A（unicloud-db）：3次请求**

```
1. getProjects() ──→ 查询用户项目列表
2. loadMembers() ──→ 查询项目成员列表
3. unicloud-db  ──→ 查询动态数据（联表）

总延迟 ≈ 请求1 + 请求2 + 请求3（串行）
```

**方案B（云函数）：1次请求**

```
1. callFunction('task-logs') ──→ 云端完成所有逻辑
   - 获取用户项目
   - 权限校验
   - 查询动态
   - 数据组装

总延迟 ≈ 1次网络往返 + 云端处理时间
```

#### 性能估算

- **方案A**：100ms + 80ms + 150ms = **330ms**
- **方案B**：100ms + 50ms(云端) = **150ms**

---

### 4. 资源消耗

> **重要认知**：JQL 请求会调用云端内置的 `clientDB` 云函数，因此**同样消耗云函数资源，也存在冷启动问题**。

| 维度 | unicloud-db 组件 | 自定义云函数 |
|------|-----------------|-------------|
| **云函数调用次数** | 每次 JQL 请求消耗 1 次（调用内置 clientDB） | 每次请求消耗 1 次调用 |
| **数据库读取次数** | JQL 内部优化，但复杂场景可能多次读取 | 完全可控，可优化为最少读取 |
| **CDN/出口流量** | 可能传输冗余数据 | 可精确控制返回数据量 |
| **云函数运行时长** | 消耗（clientDB 解析 JQL 需要额外时间） | 消耗（按 GBs 计费） |
| **冷启动影响** | 有（clientDB 也是按需启动的云函数） | 有（首次请求慢 200-500ms） |

#### 两者的关键区别

| 对比项 | unicloud-db (JQL) | 自定义云函数 |
|--------|-------------------|-------------|
| **执行逻辑** | 固定的 JQL 解析流程 | 自定义逻辑，可深度优化 |
| **请求合并** | 每次查询独立请求 | 可在一次请求中完成多个查询 |
| **冷启动共享** | clientDB 被平台多个应用共享，实例可能更"热" | 独立云函数，冷启动概率相对较高 |
| **运行效率** | JQL 解析有额外开销 | 直接执行数据库操作，效率更高 |

#### 费用估算（假设日均 1 万次请求）

| 项目 | unicloud-db | 自定义云函数 |
|------|-------------|-------------|
| 云函数调用 | ~3 元/月（调用 clientDB） | ~3 元/月 |
| 数据库读取 | 当前实现 3 次/请求 ≈ 9 元/月 | 可优化为 1-2 次/请求 ≈ 3-6 元/月 |
| 云函数运行时长 | ~5 元/月 | ~5 元/月 |
| **总计** | **~17 元/月** | **~11-14 元/月（优化后更低）** |

**结论**：从资源消耗角度，两者基础消耗相近。但自定义云函数可以通过合并请求、优化查询来降低数据库读取次数，在复杂场景下反而可能更省资源。

---

### 5. 安全性

| 维度 | unicloud-db 组件 | 云函数 |
|------|-----------------|--------|
| **权限可靠性** | ⚠️ 依赖 Schema 配置正确 | ✅ 代码逻辑可控 |
| **攻击面** | ⚠️ 前端可见查询逻辑 | ✅ 逻辑隐藏在云端 |
| **参数篡改** | ⚠️ 前端构建的查询可被修改 | ✅ 云端校验参数 |
| **越权访问** | 需要多层防护 | 集中控制，更可靠 |

#### 安全风险示例

```javascript
// 方案A 风险：前端代码可被查看和修改
// 攻击者可能尝试修改 userProjectIds 绕过权限
collection() {
  // 这段逻辑在前端执行，可被调试器修改
  if (this.userProjectIds.includes(this.selectedProjectId)) {
    // ...
  }
}

// 方案B 优势：权限逻辑在云端，无法篡改
exports.main = async (event, context) => {
  const uid = context.CLIENTUID  // 云端获取，无法伪造
  // 权限判断在云端执行
}
```

---

## 三、场景适用性建议

| 场景 | 推荐方案 | 理由 |
|------|----------|------|
| **简单 CRUD** | unicloud-db | 开发效率高，配置即可 |
| **复杂权限控制** | 云函数 | 逻辑清晰，安全可控 |
| **多表联查+权限** | 云函数 | 避免 JQL 的各种限制 |
| **高安全要求** | 云函数 | 逻辑隐藏在服务端 |
| **快速开发优先** | unicloud-db | 声明式配置，开发效率高 |
| **复杂业务逻辑** | 云函数 | 可以写任意 JS 代码 |

---

## 四、动态页面改造建议

### 当前实现问题

1. 权限逻辑分散，维护困难
2. 需要多次请求，性能不佳
3. 前端代码复杂，可读性差
4. 依赖 Schema 字段权限，容易出错

### 建议改用云函数

#### 云函数实现

```javascript
// uniCloud-aliyun/cloudfunctions/get-task-logs/index.js
const db = uniCloud.database()
const dbCmd = db.command

exports.main = async (event, context) => {
  const { projectId, memberId, page = 1, pageSize = 20 } = event
  const uid = context.CLIENTUID

  if (!uid) {
    return { code: 401, message: '请先登录' }
  }

  // 1. 获取用户有权限的项目（一次查询）
  const { data: projects } = await db.collection('opendb-projects')
    .where(dbCmd.or([
      { members: uid },
      { managers: uid }
    ]))
    .field({ _id: true, name: true, members: true, managers: true })
    .get()

  if (projects.length === 0) {
    return { code: 0, data: { logs: [], projects: [], members: [] } }
  }

  const projectIds = projects.map(p => p._id)

  // 2. 构建查询条件
  const where = {}

  if (projectId) {
    if (!projectIds.includes(projectId)) {
      return { code: 403, message: '无权访问该项目' }
    }
    where.project_id = projectId
  } else {
    where.project_id = dbCmd.in(projectIds)
  }

  if (memberId) {
    where.user_id = memberId
  }

  // 3. 聚合查询（一次完成联表）
  const { data: logs } = await db.collection('opendb-task-logs')
    .aggregate()
    .match(where)
    .lookup({
      from: 'uni-id-users',
      localField: 'user_id',
      foreignField: '_id',
      as: 'user'
    })
    .lookup({
      from: 'opendb-projects',
      localField: 'project_id',
      foreignField: '_id',
      as: 'project'
    })
    .project({
      action_type: 1,
      action_detail: 1,
      task_name: 1,
      create_time: 1,
      user: { _id: 1, nickname: 1, avatar_file: 1 },
      project: { _id: 1, name: 1 }
    })
    .sort({ create_time: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .end()

  // 4. 获取所有成员（用于筛选下拉框）
  const memberIds = new Set()
  projects.forEach(p => {
    (p.members || []).forEach(id => memberIds.add(id))
    (p.managers || []).forEach(id => memberIds.add(id))
  })

  const { data: members } = await db.collection('uni-id-users')
    .where({ _id: dbCmd.in([...memberIds]) })
    .field({ _id: true, nickname: true })
    .get()

  return {
    code: 0,
    data: {
      logs: logs.map(log => ({
        ...log,
        user: log.user[0] || null,
        project: log.project[0] || null
      })),
      projects: projects.map(p => ({ _id: p._id, name: p.name })),
      members
    }
  }
}
```

#### 前端简化实现

```javascript
// 前端代码大幅简化
async loadData() {
  this.loading = true
  try {
    const res = await uniCloud.callFunction({
      name: 'get-task-logs',
      data: {
        projectId: this.selectedProjectId,
        memberId: this.selectedMemberId,
        page: this.page
      }
    })

    if (res.result.code === 0) {
      this.logs = res.result.data.logs
      this.projectOptions = [
        { value: '', text: '全部项目' },
        ...res.result.data.projects.map(p => ({ value: p._id, text: p.name }))
      ]
      this.memberOptions = [
        { value: '', text: '全部成员' },
        ...res.result.data.members.map(m => ({ value: m._id, text: m.nickname }))
      ]
    }
  } catch (e) {
    console.error('加载失败:', e)
  } finally {
    this.loading = false
  }
}
```

---

## 五、总结

| 维度 | 胜出方 | 说明 |
|------|--------|------|
| 编码难度（简单场景） | unicloud-db | 声明式配置，无需写代码 |
| 编码难度（复杂场景） | 云函数 | 逻辑集中，更容易理解 |
| 可读性 | 云函数 | 一个文件包含所有逻辑 |
| 性能 | 云函数 | 减少网络请求次数 |
| 资源消耗 | 相近 | 两者都消耗云函数资源，自定义云函数可优化更省 |
| 安全性 | 云函数 | 逻辑隐藏在服务端 |
| 灵活性 | 云函数 | 可以实现任意业务逻辑 |

### 最终建议

对于有复杂权限控制的场景（如动态页面），**推荐使用自定义云函数**。两种方案的资源消耗相近（都需要调用云函数），但自定义云函数带来的可维护性、安全性和性能提升更为明显，且可以通过合并请求优化成本。

对于简单的数据展示场景（如项目列表、任务列表的基础 CRUD），可以继续使用 **unicloud-db 组件**，享受其声明式配置的开发效率优势。

---

## 六、参考资料

- [uniCloud 官方文档 - clientDB](https://uniapp.dcloud.net.cn/uniCloud/clientdb.html)
- [uniCloud 官方文档 - JQL语法](https://uniapp.dcloud.net.cn/uniCloud/jql.html)
- [uniCloud 官方文档 - 云函数](https://uniapp.dcloud.net.cn/uniCloud/cf-functions.html)
- [uniCloud 官方文档 - DB Schema](https://uniapp.dcloud.net.cn/uniCloud/schema.html)
