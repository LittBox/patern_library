# 非遗剪纸纹样库

基于 `HTML + CSS + JavaScript + Netlify Functions` 的单页 H5 展示站，按技术文档实现了以下核心模块：

- 首页轮播与项目介绍
- 纹案库搜索、来源筛选、上传、详情、编辑、删除
- 商品展览的上架、改价、撤回
- 创作者中心统计、最近作品、运营建议
- AI 两段式生成流程
  先用 `ai-generate-meta` 生成标题、简介、讲解词、图片提示词，再用 `ai-generate-image` 调用 `qwen-image-2.0` 生成纹案图片，最后保存到纹案库

## 本地运行

直接用静态服务或 `netlify dev` 即可：

```bash
npm install
npx netlify dev
```

如果暂时没有配置 AI 或 Netlify 环境变量，项目会自动使用本地回退逻辑：

- AI 文案使用规则化 fallback
- AI 图片返回内置 SVG 占位纹案
- 图片上传返回 `data:` URL
- 纹案与商品列表持久化到浏览器 `localStorage`

## 环境变量

在 Netlify 中建议配置：

- `DASHSCOPE_API_KEY`
- `DEEPSEEK_API_KEY`
- `NETLIFY_SITE_ID`
- `NETLIFY_ACCESS_TOKEN`

说明：

- 配了 `DASHSCOPE_API_KEY` 后，`/.netlify/functions/ai-generate-image` 会调用阿里云百炼 / DashScope 的 `qwen-image-2.0` 图片接口
- 配了 `DEEPSEEK_API_KEY` 后，`/.netlify/functions/ai-generate-meta` 会调用 DeepSeek 生成结构化文案
- 同时配置 `NETLIFY_SITE_ID` 和 `NETLIFY_ACCESS_TOKEN` 后，上传与 AI 图片结果可进一步写入 Netlify Blobs
- 如需自定义百炼网关地址，可额外配置 `DASHSCOPE_BASE_URL`

如果还没有 API Key，可以先去阿里云百炼控制台创建 `DASHSCOPE_API_KEY`，再回到 Netlify 项目里配置环境变量。未配置时，项目会继续返回本地 SVG fallback，方便先联调页面。

## AI 图片接口说明

- 服务端入口：`/.netlify/functions/ai-generate-image`
- 默认模型：`qwen-image-2.0`
- 请求方式：服务端调用百炼同步图片生成接口，拿到临时图片 URL 后立即下载并转为 `base64`
- 返回格式：保持前端现有结构，仍返回 `imageBase64`、`mimeType`、`imageUrl`、`model`
- 无 Key 时：返回 `fallback-svg` 占位图，不阻塞页面流程

## 技术文档

- 当前版本文档：[tech_doc_qwen_image_generation.md](/Users/admin/Desktop/patern_library/tech_doc_qwen_image_generation.md)
- 旧版 OpenAI 文档保留作历史参考：[tech_doc_openai_image_generation.md](/Users/admin/Desktop/patern_library/tech_doc_openai_image_generation.md)

## 测试

```bash
npm test
npm run test:upload
```

当前测试覆盖：

- AI 生成结果渲染与保存到纹案库
- 纹案详情弹层打开
- 商品改价与撤回
- 上传函数的 fallback 返回

## 目录说明

- [index.html](/Users/admin/Desktop/patern_library/index.html)
- [js/app.js](/Users/admin/Desktop/patern_library/js/app.js)
- [js/api.js](/Users/admin/Desktop/patern_library/js/api.js)
- [js/state.js](/Users/admin/Desktop/patern_library/js/state.js)
- [netlify/functions/ai-generate-meta.js](/Users/admin/Desktop/patern_library/netlify/functions/ai-generate-meta.js)
- [netlify/functions/ai-generate-image.js](/Users/admin/Desktop/patern_library/netlify/functions/ai-generate-image.js)
- [netlify/functions/pattern-upload.js](/Users/admin/Desktop/patern_library/netlify/functions/pattern-upload.js)
