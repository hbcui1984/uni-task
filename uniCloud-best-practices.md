# uniCloud 开发最佳实践：Schema vs 云对象

本文档总结了在 uniCloud 开发中，何时使用 DB Schema 权限控制，何时使用云对象处理业务逻辑。

---

## Schema 权限表达式的限制

uniCloud 的 DB Schema 权限表达式功能有限，**仅支持以下操作**：

### 支持的语法

```javascript
// 1. 基本身份验证
"auth.uid != null"                    // 用户已登录
"auth.uid == doc.user_id"             // 用户是文档创建者
"auth.uid == doc.owner_id"            // 用户是文档拥有者

// 2. 简单字段比较
"doc.status == 'published'"           // 字段等于某值
"doc.is_public == true"               // 布尔字段判断

// 3. get() 方法查询其他表
"get('database.users.${auth.uid}').role == 'admin'"
```

### 不支持的语法

```javascript
// ❌ 数组方法
"doc.members.indexOf(auth.uid) > -1"   // 不支持 indexOf
"doc.members.includes(auth.uid)"       // 不支持 includes

// ❌ in 操作符右侧使用 doc
"auth.uid in doc.managers"             // in 右侧不能用 doc 变量

// ❌ 复杂逻辑表达式
"doc.managers.length > 0"              // 不支持 length
"doc.members.filter(...)"              // 不支持 filter
```

---

## 何时使用 Schema 权限

### 适合 Schema 的场景

| 场景 | 示例 | Schema 配置 |
|------|------|-------------|
| 用户只能操作自己的数据 | 个人日记、私人笔记 | `"doc.user_id == auth.uid"` |
| 简单的公开/私有判断 | 文章发布状态 | `"doc.is_public == true"` |
| 仅需登录验证 | 通用的读取权限 | `"auth.uid != null"` |
| 禁止某类操作 | 禁止客户端删除 | `"delete": false` |

### Schema 权限示例

```json
{
  "permission": {
    "read": "auth.uid != null",
    "create": "auth.uid != null",
    "update": "doc.user_id == auth.uid",
    "delete": "doc.user_id == auth.uid"
  }
}
```

---

## 何时使用云对象

### 必须使用云对象的场景

| 场景 | 原因 | 示例 |
|------|------|------|
| **数组成员判断** | Schema 不支持数组方法 | 判断用户是否在 `members[]` 数组中 |
| **多表关联权限** | 需要查询关联表判断权限 | 根据项目成员表判断任务操作权限 |
| **复杂业务逻辑** | 涉及多步骤、多条件判断 | 删除项目时级联删除任务、日志 |
| **事务操作** | 需要保证多个操作的原子性 | 转账、库存扣减 |
| **敏感操作** | 需要严格的服务端校验 | 删除、资金操作 |
| **角色权限系统** | 复杂的角色判断逻辑 | 管理员/编辑者/查看者 多级权限 |

### 云对象权限校验示例

```javascript
// project-co/index.obj.js

module.exports = {
  async _checkIsManager(projectId) {
    const project = await db.collection('opendb-projects').doc(projectId).get()
    if (!project.data || project.data.length === 0) {
      return { success: false, error: '项目不存在' }
    }
    const projectData = project.data[0]
    // 数组成员判断 - Schema 无法实现
    const isManager = (projectData.managers || []).includes(this.userInfo.uid)
    return {
      success: isManager,
      project: projectData,
      error: isManager ? null : '仅项目管理员可执行此操作'
    }
  },

  async deleteProject(projectId) {
    // 1. 权限校验
    const check = await this._checkIsManager(projectId)
    if (!check.success) {
      return { errCode: 'PERMISSION_DENIED', errMsg: check.error }
    }

    // 2. 级联删除（事务操作）
    await db.collection('opendb-task').where({ project_id: projectId }).remove()
    await db.collection('task-group').where({ project_id: projectId }).remove()
    await db.collection('opendb-task-logs').where({ project_id: projectId }).remove()
    await db.collection('opendb-projects').doc(projectId).remove()

    return { errCode: 0, errMsg: '项目已删除' }
  }
}
```

---

## 推荐的混合策略

### 1. Schema 做基础防护

```json
{
  "permission": {
    "read": "auth.uid != null",
    "create": "auth.uid != null",
    "update": "auth.uid != null",
    "delete": false  // 禁止客户端直接删除，必须通过云对象
  }
}
```

### 2. 云对象做精细控制

- 所有**删除操作**通过云对象
- 涉及**数组成员判断**的操作通过云对象
- **敏感字段更新**通过云对象（如权限、金额）

### 3. 前端 UI 做体验优化

```javascript
// 前端隐藏无权限的按钮（仅为用户体验，不是安全措施）
<button v-if="isManager" @click="deleteProject">删除项目</button>
```

---

## 本项目的实践

### opendb-projects 表

| 操作 | 实现方式 | 原因 |
|------|----------|------|
| 读取 | Schema (`auth.uid != null`) | 简单登录验证即可 |
| 创建 | Schema (`auth.uid != null`) | 任何登录用户可创建 |
| 更新 | 云对象 `updateProject()` | 需判断 `managers` 数组 |
| 删除 | 云对象 `deleteProject()` | 需判断权限 + 级联删除 |

### opendb-task 表

| 操作 | 实现方式 | 原因 |
|------|----------|------|
| 读取 | Schema | 简单登录验证 |
| 创建 | Schema + 触发器 | 触发器校验项目成员身份 |
| 更新 | Schema + 触发器 | 触发器校验权限并记录日志 |
| 删除 | 云对象 | 需要权限校验 |

---

## 总结

| 特性 | Schema 权限 | 云对象 |
|------|-------------|--------|
| 数组成员判断 | ❌ 不支持 | ✅ 支持 |
| 复杂逻辑 | ❌ 受限 | ✅ 完全支持 |
| 级联操作 | ❌ 不支持 | ✅ 支持 |
| 事务 | ❌ 不支持 | ✅ 支持 |
| 性能 | ✅ 更快 | 略慢（多一次调用） |
| 开发效率 | ✅ 简单场景更快 | 复杂场景更灵活 |

**原则**：简单用 Schema，复杂用云对象，两者结合使用效果最佳。

---

*最后更新: 2025-12-02*
