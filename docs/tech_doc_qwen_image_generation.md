# 非遗剪纸纹样库技术文档（Qwen Image 2.0 版）

## 1. 当前目标

本版本将“AI 剪纸纹样生成”能力从 OpenAI 图片接口切换为阿里云百炼 / DashScope 的 `qwen-image-2.0`，保留现有前端交互和 Netlify Functions 架构不变。

当前两段式流程如下：

1. `ai-generate-meta` 使用 DeepSeek 生成结构化文案
2. `ai-generate-image` 使用 `qwen-image-2.0` 生成纹样图片
3. 前端将生成结果保存到纹样库，并可继续上架到商品展览

## 2. 架构说明

### 前端

- 页面入口：[index.html](/Users/admin/Desktop/patern_library/index.html)
- 业务逻辑：[js/app.js](/Users/admin/Desktop/patern_library/js/app.js)
- API 封装：[js/api.js](/Users/admin/Desktop/patern_library/js/api.js)

前端调用流程：

1. 用户填写“主题、民族风格、色彩倾向、构图风格、应用场景、补充描述”
2. 调用 `/.netlify/functions/ai-generate-meta`
3. 拿到 `title`、`description`、`explanation`、`image_prompt`
4. 调用 `/.netlify/functions/ai-generate-image`
5. 显示图片、简介、讲解词，并允许保存到纹样库

### 服务端

- 文案生成：[netlify/functions/ai-generate-meta.js](/Users/admin/Desktop/patern_library/netlify/functions/ai-generate-meta.js)
- 图片生成：[netlify/functions/ai-generate-image.js](/Users/admin/Desktop/patern_library/netlify/functions/ai-generate-image.js)

## 3. Qwen 图片生成实现

### 3.1 采用模型

- 图片模型：`qwen-image-2.0`
- 调用方式：阿里云百炼 / DashScope 服务端接口

### 3.2 为什么走服务端

原因很直接：

- 前端直连会暴露 API Key
- 临时图片 URL 需要及时下载处理
- 服务端可以把结果统一转成前端已有的 `base64 + imageUrl` 格式
- 后续如需接入审计、限流、日志，也更容易扩展

### 3.3 实际函数行为

`ai-generate-image` 当前逻辑：

1. 接收前端传入的 `prompt`
2. 若未配置 `DASHSCOPE_API_KEY`，返回本地 SVG fallback
3. 若已配置密钥，则调用 Qwen 图片接口
4. 从接口响应里提取临时图片 URL
5. 立刻下载图片并转成 `base64`
6. 如已配置 Netlify Blob 环境变量，则再上传一份持久化图片 URL
7. 返回统一结构给前端

返回字段示例：

```json
{
  "success": true,
  "imageBase64": "...",
  "mimeType": "image/png",
  "imageUrl": "https://.../blob-or-temp-url",
  "sourceUrl": "https://.../temp-url",
  "model": "qwen-image-2.0",
  "requestId": "..."
}
```

## 4. 环境变量

建议在 Netlify 中配置：

```bash
DASHSCOPE_API_KEY=你的百炼APIKey
DEEPSEEK_API_KEY=你的DeepSeekKey
NETLIFY_SITE_ID=你的站点ID
NETLIFY_ACCESS_TOKEN=你的Netlify访问令牌
```

可选变量：

```bash
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com
```

说明：

- `DASHSCOPE_API_KEY` 用于 Qwen 生图
- `DEEPSEEK_API_KEY` 用于结构化文案生成
- `NETLIFY_SITE_ID` 与 `NETLIFY_ACCESS_TOKEN` 用于把结果图写入 Netlify Blobs

## 5. API Key 接入建议

如果你还没有 `DASHSCOPE_API_KEY`，建议这样做：

1. 登录阿里云百炼 / DashScope 控制台
2. 创建 API Key
3. 在 Netlify 项目设置中新增环境变量 `DASHSCOPE_API_KEY`
4. 重新部署或重启 `netlify dev`

如果暂时没有 Key，项目也能运行，只是图片会走本地 SVG 占位图，不会真正调用 Qwen。

## 6. 与旧版 OpenAI 方案的差异

### 6.1 接口差异

旧版 OpenAI：

- 直接返回 `b64_json`

当前 Qwen：

- 返回临时图片 URL
- 服务端需要再下载一次图片内容

### 6.2 项目侧适配

为了不改动前端主流程，本项目把 Qwen 的响应重新整理成原先前端已经使用的格式，因此：

- `js/api.js` 基本无需重写
- `js/app.js` 只需展示新的模型名
- 页面保存逻辑保持不变

## 7. 当前页面文案同步

以下内容已经同步到 Qwen 版本：

- AI 页面副标题
- 生成结果里的 `imageModel`
- README 环境变量说明
- 本技术文档

## 8. 开发与验证

本地开发：

```bash
npx netlify dev
```

快速检查：

```bash
node --check js/app.js
node --check js/state.js
node --check netlify/functions/ai-generate-image.js
node tests/run-ui-test.mjs
node tests/run-ui-test-products.mjs
```

## 9. 后续可扩展项

如果你下一步想继续完善，可以继续做：

1. 在 AI 页面增加“尺寸”“负向提示词”“是否保留水印”配置
2. 为 `ai-generate-image` 增加调用日志和失败重试
3. 对接百炼文本模型，把文案生成也统一迁移到 Qwen 系列
4. 为临时图片 URL 增加过期提示与持久化状态提示
