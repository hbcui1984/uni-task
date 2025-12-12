
// 表单校验规则由 schema2code 生成，不建议直接修改校验规则，而建议通过 schema2code 生成, 详情: https://uniapp.dcloud.net.cn/uniCloud/schema



const validator = {
  "name": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "label": "项目名称"
  },
  "members": {
    "rules": [
      {
        "format": "array"
      }
    ],
    "label": "项目成员"
  }
}

const enumConverter = {}

export { validator, enumConverter }
