# 民族纹案库 (H5 单页) - 项目脚手架

简要说明与快速上手步骤。

必要环境变量（在 Netlify 项目设置中配置）：

- `OPENAI_API_KEY` - 用于调用 OpenAI 图片接口（仅示例）。
- `DEEPSEEK_API_KEY` - DeepSeek 文案生成（如使用）。
 - `NETLIFY_SITE_ID` - Netlify 站点 ID，用于 Blobs API 上传。
 - `NETLIFY_ACCESS_TOKEN` - 用于调用 Netlify API 的访问令牌（部署时在 Netlify 控制台设置，或使用 Personal Access Token）。

本仓库包含：

- [index.html](index.html) : 单页入口
- [styles/main.css](styles/main.css) : 基础样式
- [js/](js) : 前端脚手架
- [netlify/functions](netlify/functions) : Functions 占位实现
- [netlify.toml](netlify.toml) : Netlify 配置

快速本地测试（可选，需安装 netlify-cli）：

```bash
# 安装 netlify CLI
npm install -g netlify-cli

# 在项目目录运行本地 dev（Functions 本地模拟）
netlify dev
```

部署说明：将仓库推到 GitHub 并在 Netlify 中新建站点，链接该仓库。

后续工作（建议）：
- 实现 `pattern-upload` 把图片写入 Netlify Blobs
- 把 `ai-generate-image` 的 OpenAI 返回图片保存到 Blobs 并返回 imageUrl
- 实现前端的各页面组件和管理交互

示例：前端将图片以 base64 发送给 `pattern-upload`：

```js
// 例：将 File 转为 base64 并上传
const toBase64 = (file) => new Promise((res,rej)=>{
	const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(file)
})

const b64 = await toBase64(file) // 不含 data: 前缀
const resp = await fetch('/.netlify/functions/pattern-upload', {
	method:'POST',
	headers:{ 'Content-Type':'application/json' },
	body: JSON.stringify({ fileName: file.name, contentType: file.type || 'image/png', base64: b64 })
})
const result = await resp.json()
console.log(result)
```

示例：调用 `ai-generate-image` 并让 Function 把 OpenAI 返回图片写入 Blobs：

```js
const resp = await fetch('/.netlify/functions/ai-generate-image', {
	method:'POST',
	headers:{ 'Content-Type':'application/json' },
	body: JSON.stringify({ prompt: '苗族风格，蓝白配色，对称构图' })
})
const body = await resp.json()
console.log(body) // 若已配置 NETLIFY vars，会返回 blob 信息
```
