# 云函数/云对象中获取用户 uid 的正确方法

## ❌ 错误做法

```javascript
// 错误1：getClientInfo() 返回的是设备信息，不包含 uid
const clientInfo = this.getClientInfo()
const uid = clientInfo.uid  // undefined！

// 错误2：await getClientInfo() 也是错的，它是同步方法
this.userInfo = await this.getClientInfo()
```

`getClientInfo()` 等同于客户端的 `uni.getSystemInfo()`，返回的是设备平台、系统版本等信息，**不包含用户身份信息**。

## ✅ 正确做法

```javascript
const uniIdCommon = require('uni-id-common')

module.exports = {
    _before: async function() {
        // 1. 创建 uni-id-common 实例
        const clientInfo = this.getClientInfo()
        this.uniIdCommon = uniIdCommon.createInstance({
            clientInfo
        })

        // 2. 获取 token
        const token = this.getUniIdToken()
        if (!token) {
            throw {
                errCode: 'TOKEN_INVALID',
                errMsg: '缺少token'
            }
        }

        // 3. 使用 checkToken 验证并获取 uid
        const payload = await this.uniIdCommon.checkToken(token)
        if (payload.errCode) {
            throw {
                errCode: payload.errCode,
                errMsg: payload.errMsg || '无效的token'
            }
        }

        // 4. 从 payload 中获取 uid
        this.userInfo = {
            uid: payload.uid
        }
    }
}
```

## 关键点

| 方法 | 用途 | 返回值 |
|------|------|--------|
| `this.getClientInfo()` | 获取设备信息 | `{ platform, os, deviceId, ... }` |
| `this.getUniIdToken()` | 获取客户端传来的 token | token 字符串 |
| `uniIdCommon.checkToken(token)` | 验证 token 并解析用户信息 | `{ uid, errCode, ... }` |

## 注意事项

1. **必须引入 `uni-id-common`**：这是 uniCloud 官方提供的用户身份验证模块
2. **`getClientInfo()` 是同步方法**：不需要 await，且返回的是设备信息而非用户信息
3. **`checkToken()` 是异步方法**：需要 await，返回值中包含 `uid`、`errCode` 等字段
4. **错误处理**：checkToken 失败时 `payload.errCode` 会有值，需要抛出错误阻止后续执行
