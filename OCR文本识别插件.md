# OCR文本识别插件

## Core Features

- 流式PDF解析与实时渲染

- Canvas标注矩形元素

- AI文本识别

- 元素分组管理

- 多题型支持

- 数据导出功能

## Tech Stack

{
  "Web": {
    "arch": "vue",
    "component": "elementplus"
  },
  "frontend": "Vue 3 + Pinia + Vue Router + Element Plus",
  "pdf": "vue-pdf-embedded",
  "canvas": "HTML5 Canvas API",
  "ai": "腾讯云OCR API",
  "export": "JSZip"
}

## Design

采用Material Design风格，左右分栏布局，左侧为操作面板包含标注工具和元素管理，右侧为PDF预览区域支持Canvas标注层，整体界面简洁现代化

## Plan

Note: 

- [ ] is holding
- [/] is doing
- [X] is done

---

[X] 项目环境配置和依赖安装

[X] 创建基础页面结构和路由配置

[X] 实现PDF文件上传和vue-pdf-embedded集成

[/] 开发Canvas标注系统和矩形绘制功能

[ ] 实现标注元素的选择、编辑和删除功能

[ ] 开发图片裁切和OCR识别接口集成

[ ] 实现元素分组管理和树形展示功能

[ ] 开发题型分类和数据结构管理

[ ] 实现JSON和ZIP导出功能

[ ] 完善用户界面和交互体验优化
