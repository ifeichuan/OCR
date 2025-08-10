# PDF标注系统API集成和自动导入功能

## Core Features

- API集成替换本地导入导出

- 页面进入时自动导入

- API数据格式适配

- 错误处理和状态管理

- 用户反馈提示

## Tech Stack

{
  "Web": {
    "arch": "vue",
    "component": null
  },
  "language": "TypeScript",
  "framework": "Vue 3 + Pinia",
  "libraries": "PDF.js, Axios/Fetch API"
}

## Design

保持现有Material Design风格，添加API状态指示器和错误提示界面

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 分析现有导出功能，了解当前数据结构和API要求的数据格式差异

[X] 在AnnotationStore中添加API调用方法，替换本地导入导出功能

[X] 修改导出功能，调用POST API发送标注数据

[X] 实现自动导入功能，在页面加载时调用GET API获取数据

[X] 添加数据格式转换逻辑，适配API的question/answer格式

[X] 实现错误处理和重试机制

[X] 添加加载状态和用户反馈提示

[/] 测试API集成功能，确保数据正确同步
