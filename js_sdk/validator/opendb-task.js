
// 表单校验规则由 schema2code 生成，不建议直接修改校验规则，而建议通过 schema2code 生成, 详情: https://uniapp.dcloud.net.cn/uniCloud/schema



const validator = {
  "project_id": {
    "rules": []
  },
  "title": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "label": "标题"
  },
  "content": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "label": "任务详情"
  },
  "assignee": {
    "rules": [
      {
        "format": "string"
      }
    ]
  }
}

const enumConverter = {
  "priority_valuetotext": {
    "0": "较低",
    "1": "普通",
    "2": "较高",
    "3": "最高"
  },
  "status_valuetotext": {
    "0": "未开始",
    "1": "进行中",
    "2": "已完成"
  }
}

// 优先级配置（供全局使用）
const priorityOptions = [
  { value: 0, text: '较低' },
  { value: 1, text: '普通' },
  { value: 2, text: '较高' },
  { value: 3, text: '最高' }
]

export { validator, enumConverter, priorityOptions }
