# 民族纹案库

基于 `HTML + CSS + JavaScript + Netlify Functions` 的单页 H5 展示站，按技术文档实现了以下核心模块：

- 首页轮播与项目介绍
- 纹案库搜索、来源筛选、上传、详情、编辑、删除
- 商品展览的上架、改价、撤回
- 创作者中心统计、最近作品、运营建议
- AI 两段式生成流程
  先用 `ai-generate-meta` 生成标题、简介、讲解词、图片提示词，再用 `ai-generate-image` 生成纹案图片，最后保存到纹案库

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

- `OPENAI_API_KEY`
- `DEEPSEEK_API_KEY`
- `NETLIFY_SITE_ID`
- `NETLIFY_ACCESS_TOKEN`

说明：

- 配了 `OPENAI_API_KEY` 后，`/.netlify/functions/ai-generate-image` 会调用 OpenAI 图片接口
- 配了 `DEEPSEEK_API_KEY` 后，`/.netlify/functions/ai-generate-meta` 会调用 DeepSeek 生成结构化文案
- 同时配置 `NETLIFY_SITE_ID` 和 `NETLIFY_ACCESS_TOKEN` 后，上传与 AI 图片结果可进一步写入 Netlify Blobs

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
