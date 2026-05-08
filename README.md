# 非遗剪纸纹样库

基于 `HTML + CSS + JavaScript + Netlify Functions` 的单页 H5 展示站，按技术文档实现了以下核心模块：

- 首页轮播与项目介绍
- 纹案库搜索、来源筛选、上传、详情、编辑、删除
- 商品展览的上架、改价、撤回
- 创作者中心统计、最近作品、运营建议
- AI 两段式生成流程
  先用 `ai-generate-meta` 生成标题、简介、讲解词、图片提示词，再用 `ai-generate-image` 调用 `qwen-image-2.0` 生成纹案图片，最后保存到纹案库

## 本地运行

如果你只看静态页面，用任意静态服务即可。

如果你要使用真正的上传、AI Function、Blob 持久化，请务必使用 `netlify dev`：

```bash
npm install
npm run dev
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

其中：

- `NETLIFY_SITE_ID`：你的 Netlify 站点 ID
- `NETLIFY_ACCESS_TOKEN`：你的 Netlify Personal Access Token

本地开发时也可以把这些变量写进项目根目录 `.env`，Netlify CLI 会在 `netlify dev` 启动时读取。

可以参考模板文件：

```bash
cp .env.example .env
```

说明：

- 配了 `DASHSCOPE_API_KEY` 后，`/.netlify/functions/ai-generate-image` 会调用阿里云百炼 / DashScope 的 `qwen-image-2.0` 图片接口
- 配了 `DEEPSEEK_API_KEY` 后，`/.netlify/functions/ai-generate-meta` 会调用 DeepSeek 生成结构化文案
- 同时配置 `NETLIFY_SITE_ID` 和 `NETLIFY_ACCESS_TOKEN` 后，上传与 AI 图片结果会优先通过官方 `@netlify/blobs` SDK 写入 Netlify Blobs
- 如需自定义百炼网关地址，可额外配置 `DASHSCOPE_BASE_URL`

如果还没有 API Key，可以先去阿里云百炼控制台创建 `DASHSCOPE_API_KEY`，再回到 Netlify 项目里配置环境变量。未配置时，项目会继续返回本地 SVG fallback，方便先联调页面。

## 真上传排查

如果“导入图片”要真正写进 Netlify Blob，而不是只在浏览器里预览，需要同时满足下面几项：

1. 使用 `npm run dev` 或 `npx netlify dev` 启动，而不是只开静态服务器。
2. `.env` 中存在 `NETLIFY_SITE_ID` 和 `NETLIFY_ACCESS_TOKEN`。
3. `NETLIFY_ACCESS_TOKEN` 对对应站点有写入权限。
4. 浏览器访问的是 Netlify Dev 输出的地址，通常是 `http://localhost:8888`。

如果缺少其中任意一项，`pattern-upload` 会自动回退到本地 `data:` URL 模式，不会真正写入 Blob。

当前实现说明：

- 上传入口：`/.netlify/functions/pattern-upload`
- Blob 读图入口：`/.netlify/functions/blob-image?key=...`
- Blob 删除入口：`/.netlify/functions/delete-blob`
- 服务端使用官方 `@netlify/blobs` SDK 持久化图片内容和基础元数据

## AI 图片接口说明

- 服务端入口：`/.netlify/functions/ai-generate-image`
- 默认模型：`qwen-image-2.0`
- 请求方式：服务端调用百炼同步图片生成接口，拿到临时图片 URL 后立即下载并转为 `base64`
- 返回格式：保持前端现有结构，仍返回 `imageBase64`、`mimeType`、`imageUrl`、`model`
- 无 Key 时：返回 `fallback-svg` 占位图，不阻塞页面流程

## 技术文档

- 当前版本文档：[tech_doc_qwen_image_generation.md](/Users/admin/Desktop/patern_library/docs/tech_doc_qwen_image_generation.md)
- 旧版 OpenAI 文档保留作历史参考：[tech_doc_openai_image_generation.md](/Users/admin/Desktop/patern_library/docs/tech_doc_openai_image_generation.md)
- 前端样式与交互偏好总结：[frontend_style_summary.md](/Users/admin/Desktop/patern_library/docs/frontend_style_summary.md)
- Netlify 部署踩坑与注意事项：[netlify_deploy_notes.md](/Users/admin/Desktop/patern_library/docs/netlify_deploy_notes.md)

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
