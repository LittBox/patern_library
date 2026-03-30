# Netlify 部署踩坑与注意事项

## 适用范围

这份文档总结了当前项目在 `Netlify + Netlify Functions + Netlify Blobs + DashScope + DeepSeek` 方案下，最容易踩到的部署坑。

适用于以下场景：
- 本地 `netlify dev` 正常，但线上域名异常
- 电脑本地可用，手机访问异常
- AI 图片生成返回占位图
- 上传图片刷新后丢失
- Blob 能写不能读

## 一、哪些文件必须进仓库

真正和 Netlify 部署相关、必须提交到仓库的文件是：

- [netlify.toml](/Users/admin/Desktop/patern_library/netlify.toml)
- [netlify/functions](/Users/admin/Desktop/patern_library/netlify/functions)
- 前端页面与静态资源文件

通常**不需要**提交的：

- `.netlify/`

说明：
- `.netlify/` 是 Netlify CLI 本地开发时生成的本地目录
- 它不上传到云端也没关系
- 如果线上函数失效，先查 `netlify/functions` 和 `netlify.toml`，不要先怀疑 `.netlify/`

## 二、本地能跑，不代表线上也能跑

最常见误判：
- 本地 `npm run dev` 正常
- 就以为线上部署后也会自动正常

但实际上，线上和本地最大区别是：

- 本地 `.env` 会被 `netlify dev` 读取
- 线上不会读取你本地 `.env`
- 线上必须在 Netlify 后台单独配置环境变量

结论：
- 本地可用，只能说明代码逻辑基本没问题
- 线上是否可用，关键取决于 Netlify 后台环境变量是否配齐

## 三、线上 AI 图片生成失败的真实高频原因

### 1. `DASHSCOPE_API_KEY` 没有配置到 Netlify

这是最容易踩的坑。

当前项目里：
- [ai-generate-image.js](/Users/admin/Desktop/patern_library/netlify/functions/ai-generate-image.js)

服务端会优先读取：
- `DASHSCOPE_API_KEY`
- 或 `QWEN_API_KEY`

如果线上没有这两个变量，就不会调用真实图片模型，而是直接返回本地 SVG 占位图。

典型表现：
- 前端看起来“接口调用成功”
- 但返回的不是生成图片，而是 fallback 图
- 页面上会出现占位纹样

排查方法：
- 直接请求线上接口：
  - `/.netlify/functions/ai-generate-image`
- 如果返回里有：
  - `fallback: true`
  - `model: "fallback-svg"`
  - `未配置 DASHSCOPE_API_KEY`

那就说明不是前端问题，是线上环境变量没配。

## 四、线上文案能生成，图片不能生成，不是路径问题

如果出现：
- `ai-generate-meta` 正常
- `ai-generate-image` 不正常

优先判断：
- 文案模型 key 是否配置了
- 图片模型 key 是否配置了

不要第一时间怀疑：
- 前端按钮
- 相对路径
- 手机端兼容

因为这通常意味着：
- DeepSeek 已经通了
- DashScope / Qwen 图片 key 没通

## 五、相对路径 `/.netlify/functions` 本身不是 bug

当前前端 API 基址在：
- [js/api.js](/Users/admin/Desktop/patern_library/js/api.js)

使用的是：

```js
const BASE = '/.netlify/functions'
```

这在**同源部署**下是正确的。

也就是说，如果页面本身就是从 Netlify 站点域名打开：
- `https://paternlibrary.netlify.app/`

那么调用：
- `/.netlify/functions/ai-generate-image`

是没有问题的。

所以：
- 线上域名访问失败，不一定是相对路径错了
- 更常见的是函数没部署好，或环境变量没配好

## 六、手机访问异常，常见不是“移动端兼容”，而是运行环境不同

当电脑浏览器正常、手机不正常时，常见原因是：

- 手机访问的不是带函数的地址
- 手机访问的是纯静态预览地址
- 手机访问的是另一台本地 server
- 手机访问的是局域网 IP，但函数服务不在那个地址下

本地联调时要特别注意：

- `netlify dev` 输出的地址，通常是 `http://localhost:8888`
- 手机不能访问你电脑的 `localhost`
- 手机如果要联调，必须访问你电脑的局域网 IP 对应地址

例如：
- `http://192.168.x.x:8888`

否则会出现：
- 页面能打开
- 但 `/.netlify/functions/*` 打不到
- 最终前端自动走 fallback

## 七、上传图片“看起来成功”，不等于真正上传到 Blob

当前项目上传逻辑有 fallback。

如果下面任一条件不满足：
- 没有使用 `netlify dev`
- 没有配置 `NETLIFY_SITE_ID`
- 没有配置 `NETLIFY_ACCESS_TOKEN`
- 当前 token 对站点无写权限

那么：
- 上传会退回到浏览器本地 `data:` URL 模式
- 页面里看起来像“上传成功”
- 但并没有真正写入 Blob

这时刷新后图片可能丢失，或只靠本地持久化恢复。

## 八、Blob 相关最容易踩的坑

### 1. 能写不能读

之前已经踩过：
- Blob 写入成功
- 但图片读取接口超时或返回异常

最后解决方式是：
- 不在函数里自己搬运整张图片
- 改成让 `blob-image` 返回签名下载地址的跳转

相关文件：
- [blob-image.js](/Users/admin/Desktop/patern_library/netlify/functions/blob-image.js)
- [blob-store.js](/Users/admin/Desktop/patern_library/netlify/functions/blob-store.js)

### 2. token 和 site id 本地有效，不代表线上也会自动生效

本地 `.env` 里的：
- `NETLIFY_SITE_ID`
- `NETLIFY_ACCESS_TOKEN`

如果没配置到 Netlify 后台，线上就读不到。

表现通常是：
- 本地上传正常
- 线上上传失败
- 或线上 AI 图片无法持久化到 Blob

## 九、部署后“看起来旧代码还在”时先查什么

优先查：

1. Netlify deploy log 有没有识别 functions
2. 站点环境变量有没有真的生效
3. 当前访问的是 production deploy 还是旧 deploy
4. 是否 clear cache and deploy
5. 仓库里是否真的提交了最新 `netlify/functions/*.js`

不要先查：
- `.netlify/`
- 浏览器缓存里的纯样式问题

## 十、建议的线上环境变量清单

建议在 Netlify 后台至少配置：

- `DASHSCOPE_API_KEY`
- `DEEPSEEK_API_KEY`
- `NETLIFY_SITE_ID`
- `NETLIFY_ACCESS_TOKEN`

可选：

- `QWEN_API_KEY`
- `DASHSCOPE_BASE_URL`

## 十一、推荐排查顺序

### A. 页面能打开，但图片生成失败

1. 先看 `/.netlify/functions/ai-generate-meta` 是否正常
2. 再看 `/.netlify/functions/ai-generate-image` 是否返回 fallback
3. 如果返回 fallback，优先查 `DASHSCOPE_API_KEY`

### B. 上传成功但刷新后图没了

1. 看是否真的写入 Blob
2. 看返回里有没有 `imageBlobKey`
3. 没有的话，大概率只是 fallback 本地模式

### C. 手机不正常，电脑正常

1. 确认手机访问的地址是不是和函数服务同源
2. 如果是本地调试，确认手机是否能访问你电脑的局域网 IP
3. 直接在手机浏览器打开函数地址测试

## 十二、建议长期保留的习惯

- 每次部署后，直接手动测一次：
  - `/.netlify/functions/ai-generate-meta`
  - `/.netlify/functions/ai-generate-image`
- 每次改函数逻辑后，同时检查：
  - 本地 `netlify dev`
  - 线上 Netlify 域名
- 本地 `.env` 更新后，同步检查 Netlify 后台环境变量
- 遇到 fallback 图，不要先改 UI，先看接口真实返回内容
