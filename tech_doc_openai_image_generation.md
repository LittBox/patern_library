# 民族纹案库 H5 展示网站技术实现文档（OpenAI 图片生成版）

## 1. 项目概述

本项目是一个**单页面 H5 民族纹案库展示网站**，采用 **HTML + CSS + JavaScript** 开发，不使用前端框架，不做多页面路由跳转，所有内容在同一个页面中通过模块切换、弹窗和局部渲染完成。项目部署到 **GitHub + Netlify**，不需要自建云服务器。原始需求包括首页、纹案库、纹案详情、商品展览、AI 纹案生成等模块；本版本在此基础上新增 **创作者中心** 模块，并将其加入顶部导航。

本版技术方案的关键调整是：

- **DeepSeek 不再承担图片生成**
- **OpenAI GPT Image 1.5 作为默认图片生成模型**
- **DeepSeek 继续负责结构化文案输出**
- **Netlify Functions 负责 AI 接口代理、上传处理、数据读写**
- **Netlify Blobs 负责图片和纹案元数据存储**

---

## 2. 技术可行性结论

### 2.1 可实现部分

以下功能可以实现：

- 单页面导航切换
- 首页轮播与项目介绍
- 纹案库展示、搜索、分类筛选
- 图片本地上传
- 图片详情查看
- 修改作品名称与简介
- 删除作品
- 商品上架、撤回、价格修改
- 创作者中心数据展示
- AI 纹案生成
- GitHub + Netlify 部署上线

### 2.2 需要修正的原始设想

原需求中“**纯前端上传图片并直接保存到项目特定文件夹**”这一点，不建议继续按这个思路实现。推荐改为：

- 前端负责选择图片、预览图片、提交上传请求
- `Netlify Functions` 负责接收文件
- 图片与纹案元数据存入 `Netlify Blobs`

这样仍然**不需要自建服务器**，但功能上可落地、可持续维护。

---

## 3. 推荐技术方案

### 3.1 总体架构

```text
浏览器前端（HTML/CSS/JS）
    ↓
Netlify Functions（服务端接口层）
    ↓
Netlify Blobs（图片与纹案元数据）
    ↓
DeepSeek（名称/简介/讲解词/提示词）
    ↓
OpenAI GPT Image 1.5（纹案图片生成）
```

### 3.2 技术栈

#### 前端

- HTML5
- CSS3
- 原生 JavaScript
- Swiper.js（可选，用于首页轮播）
- Fetch API
- LocalStorage / SessionStorage（临时缓存 UI 状态）

#### 部署与平台

- GitHub：源码托管
- Netlify：静态站点部署
- Netlify Functions：接口代理、上传处理、AI 调用
- Netlify Blobs：图片与纹案数据存储

#### AI 能力层

- 文案与结构化输出：DeepSeek Chat API
- 图片生成：**OpenAI GPT Image 1.5**
- 备选图片模型：Gemini / Imagen

---

## 4. 为什么本版默认改用 OpenAI 图片生成

### 4.1 选择 OpenAI GPT Image 1.5 的原因

本项目图片生成模块默认采用 **OpenAI GPT Image 1.5**，主要原因如下：

1. 官方 API 文档完整，接入路径清晰
2. 支持独立图片生成，也支持多轮编辑
3. 模型能力定位明确，适合生产级图片生成
4. 后续若你想做“上传原图后二次编辑纹案”，可以继续复用同一套能力

### 4.2 Gemini 是否也能接

**可以接。**

Google 官方当前提供两条路线：

- **Gemini 原生图片生成**
- **Imagen 专用图片生成接口**

不过本项目当前仍推荐将 Gemini 作为备选方案，而不是默认主方案。

### 4.3 本项目的最终建议

本项目本版默认采用：

- **DeepSeek：生成结构化文案**
- **OpenAI GPT Image 1.5：生成纹案图片**

理由是：这套组合更适合你当前的需求边界，既保留 DeepSeek 做文本理解和讲解词输出，又把图片生成切换到更明确、更稳的 OpenAI 图片接口上。

---

## 5. 部署原则

### 5.1 无自建云服务器

本项目**不购买云服务器、不维护独立 Node 服务、不部署 Nginx**。所有页面文件由 Netlify 托管，所有服务端逻辑由 Netlify Functions 提供，因此属于“无自建服务器”的 serverless 部署方案。

### 5.2 免费与计费说明

Netlify 现在对新账号采用 **credit-based 计费**。Free 计划包含一定月度 credits，Functions 使用会消耗 credits。

所以可以这样理解：

- 开发阶段和小流量演示项目基本能先跑起来
- 但不是“无限免费”
- 若图片上传多、AI 调用多、访问量大，后续可能需要增购或升级

---

## 6. 信息架构设计

顶部导航栏建议包含以下一级模块：

- 首页
- 纹案库
- 商品展览
- 创作者中心
- AI 纹案生成

说明：

- “商品展览”对应原需求中的“商品售卖”
- “创作者中心”为新增一级导航
- 整站不跳转路由，只切换单页中的不同 `section`

---

## 6.1 视觉风格与交互规范

本项目当前前端风格统一调整为**非遗红展陈风格**，参考“红白展板 + 金红标题条 + 居中信息卡”的视觉方向。

### 视觉关键词

- 主色：非遗红、朱砂红、暖白、浅金米色
- 氛围：展览板、成果墙、文化传承、馆藏说明卡
- 卡片：浅色底板 + 红色标题条 + 细边框 + 柔和阴影
- 按钮：圆角胶囊按钮，主按钮使用红色渐变，次按钮使用浅红描边

### 交互规范

- 所有“修改名称”“修改价格”“删除确认”“提示说明”等交互，不再使用浏览器原生 `prompt/confirm/alert`
- 统一改为**页面中央的小型弹窗窗口**
- 小窗需具备明确标题、说明文案、取消/确认按钮
- 小窗尺寸以“用户无需离开当前页面上下文”为原则，避免全屏抽屉式编辑
- 作品详情仍使用较大的居中详情弹层，但内部二次操作使用小型居中窗口完成

这样设计的原因：

- 保持整体视觉统一
- 提升移动端与桌面端的可读性
- 避免浏览器原生弹窗打断体验
- 更符合展示型网站的交互气质

---

## 7. 页面模块设计

## 7.1 首页

### 功能目标

展示项目定位、民族纹案视觉氛围和平台价值。

### 页面布局

- 顶部：导航栏
- 左侧：纹案轮播图
- 右侧：项目介绍文案
- 底部：可扩展热门纹案推荐区

### 功能点

- 轮播自动切换
- 点击轮播图进入纹案详情
- 显示项目简介与使用流程

---

## 7.2 纹案库

### 功能目标

作为网站核心内容区，展示所有上传作品和 AI 生成作品。

### 页面布局

- 顶部工具栏
  - 导入图片按钮
  - 搜索框
  - 分类筛选
- 内容区
  - AI 生成区
  - 自主上传区

### 功能点

- 上传图片
- 搜索作品名称
- 搜索提示词
- 搜索简介描述
- 按来源筛选：全部 / AI生成 / 自主上传
- 纹案卡片展示
- 点击卡片打开详情弹层

---

## 7.3 纹案详情

### 功能目标

查看单个纹案完整信息，并执行作品管理操作。

### 页面布局

- 左侧：纹案大图
- 右侧：
  - 作品名称
  - 作品简介
  - 讲解词
  - 来源类型
  - 创建时间
  - 标签
- 下方按钮：
  - 放入货架
  - 修改名称和简介
  - 删除作品

### 功能点

#### 放入货架

- 点击后弹出价格设置框
- 保存后作品进入商品展览区

#### 修改名称和简介

- 点击后打开页面中央的小型编辑窗口
- 保存后更新本地展示与服务端数据

#### 删除作品

- 页面中央弹出确认窗口
- 删除图片记录与元数据

---

## 7.4 商品展览

### 功能目标

展示已上架的纹案商品。

### 页面布局

- 4 栏小卡片布局
- 每个卡片显示：
  - 纹案图片
  - 商品名
  - 价格
  - 上架时间
  - 操作按钮

### 功能点

- 撤回商品
- 修改价格（页面中央小型窗口）
- 按价格或上架时间排序
- 跳转作品详情

---

## 7.5 创作者中心

### 功能目标

展示创作者资料、创作统计与运营状态。

### 页面布局

- 创作者首页：创作者信息卡 + 详情按钮
- 创作者详情页：统计面板、最近作品与运营建议

### 推荐功能模块

#### 创作者信息卡

- 创作者昵称
- 头像（可选）
- 创作者简介
- 入驻时间

#### 数据统计面板

- 放置在“创作者详情页”中展示
- 总作品数
- AI 生成作品数
- 自主上传作品数
- 已上架商品数
- 未上架作品数
- 本月新增作品数
- 总销售额（预留）

#### 最近作品管理

- 最近上传 / 最近生成作品
- 快捷操作：
  - 查看详情
  - 修改信息
  - 上架
  - 删除

#### 运营建议区

- 未填写简介的作品
- 未设置价格的商品
- 尚未上架的作品

---

## 7.6 AI 纹案生成

### 功能目标

让用户输入描述后，生成民族纹案图片、作品名称、简介与简短讲解词。

### 页面布局

- 左侧：输入区
- 右侧：结果展示区

### 输入项建议

- 主题
- 民族风格
- 色彩倾向
- 构图风格
- 应用场景
- 额外描述

### 输出项

- 纹案图片
- 作品名称
- 作品简介
- 不超过 100 字讲解词
- 保存到纹案库按钮

---

## 8. AI 工作流设计（已替换为 OpenAI 图片模型）

## 8.1 两段式生成流程

本项目建议采用“两段式 AI 生成流程”：

### 第一步：DeepSeek 输出结构化文案

DeepSeek 返回：

```json
{
  "title": "作品名称",
  "description": "作品简介",
  "image_prompt": "用于图片生成的高质量提示词",
  "explanation": "不超过100字的纹案讲解词"
}
```

### 第二步：OpenAI GPT Image 1.5 生成图片

将 `image_prompt` 发送给 OpenAI 图片接口，生成纹案图片并返回图片数据或可存储结果。

### 这样设计的优点

- 文案与图片职责分离
- 结构更稳定
- 便于后期替换图片模型
- 便于把讲解词单独展示
- 更容易做失败重试与缓存

---

## 9. OpenAI 图片生成模块设计

## 9.1 推荐模型

默认模型：

```text
gpt-image-1.5
```

原因：

- 官方定义为当前主推的图片生成模型
- 质量优先
- 指令遵循更强
- 适合纹案类、装饰类、风格化图像生成

## 9.2 接口接入方式

推荐使用：

```text
POST /.netlify/functions/ai-generate-image
```

由该 Function 在服务端调用 OpenAI Image API。

### 为什么不前端直连

- API key 会暴露
- 生产环境不安全
- 不便于统一做失败重试、频率限制和日志记录

## 9.3 输出格式建议

Function 返回统一数据结构：

```json
{
  "success": true,
  "imageBase64": "base64图片数据",
  "mimeType": "image/png",
  "model": "gpt-image-1.5"
}
```

前端拿到 `base64` 后：

1. 预览图片
2. 上传到 Netlify Blobs
3. 生成最终 `imageUrl`
4. 连同文案一起保存到纹案库

---

## 10. 数据结构设计

## 10.1 纹案对象 `Pattern`

```json
{
  "id": "pt_001",
  "title": "锦绣回纹",
  "description": "以民族回纹为灵感设计的装饰纹案",
  "explanation": "纹案以回旋结构象征延续与团圆，适合文创装饰应用。",
  "imageUrl": "/blob/patterns/pt_001.png",
  "sourceType": "ai",
  "prompt": "民族回纹、红金配色、对称构图",
  "tags": ["回纹", "民族风", "红金"],
  "price": 99,
  "onShelf": true,
  "creatorId": "creator_001",
  "createdAt": "2026-03-28T12:00:00Z",
  "updatedAt": "2026-03-28T12:00:00Z",
  "imageModel": "gpt-image-1.5",
  "textModel": "deepseek-chat"
}
```

## 10.2 创作者对象 `Creator`

```json
{
  "id": "creator_001",
  "name": "默认创作者",
  "avatar": "",
  "bio": "专注民族纹案与文创设计",
  "joinedAt": "2026-03-28T12:00:00Z"
}
```

## 10.3 商品对象 `Product`

```json
{
  "id": "prod_001",
  "patternId": "pt_001",
  "title": "锦绣回纹",
  "price": 99,
  "status": "on_shelf",
  "createdAt": "2026-03-28T12:00:00Z"
}
```

---

## 11. 前端模块划分

```text
/js
  api.js
  state.js
  utils.js
  components/
    navbar.js
    carousel.js
    pattern-card.js
    modal.js
  pages/
    home.js
    gallery.js
    detail.js
    market.js
    creator.js
    ai.js
```

### 模块说明

- `api.js`：统一封装接口调用
- `state.js`：管理全局状态
- `utils.js`：图片处理、时间格式化、弹窗工具
- `components/`：通用 UI 组件
- `pages/`：各模块逻辑

---

## 12. 服务端接口设计（Netlify Functions）

## 12.1 接口列表

### 纹案数据接口

```text
GET    /.netlify/functions/pattern-list
POST   /.netlify/functions/pattern-upload
POST   /.netlify/functions/pattern-create
PUT    /.netlify/functions/pattern-update?id=pt_001
DELETE /.netlify/functions/pattern-delete?id=pt_001
```

### 商品接口

```text
POST /.netlify/functions/product-publish
POST /.netlify/functions/product-unpublish
PUT  /.netlify/functions/product-price-update?id=prod_001
```

### 创作者中心接口

```text
GET /.netlify/functions/creator-dashboard
GET /.netlify/functions/creator-recent-patterns
```

### AI 接口

```text
POST /.netlify/functions/ai-generate-meta
POST /.netlify/functions/ai-generate-image
POST /.netlify/functions/ai-save-pattern
```

---

## 13. 核心业务流程

## 13.1 图片上传流程

```text
用户选择图片
→ 前端校验格式和大小
→ 调用 pattern-upload
→ Function 将图片写入 Blobs
→ 返回 imageUrl
→ 调用 pattern-create 保存元数据
→ 刷新纹案库
```

## 13.2 上架商品流程

```text
用户进入纹案详情
→ 点击“放入货架”
→ 输入价格
→ 调用 product-publish
→ 更新作品状态
→ 商品展览页刷新
```

## 13.3 AI 纹案生成流程

```text
用户输入需求
→ 调用 ai-generate-meta（DeepSeek）
→ 返回 title / description / explanation / image_prompt
→ 调用 ai-generate-image（OpenAI）
→ 返回图片 base64
→ Function 或前端转存到 Blobs
→ 用户点击“保存到纹案库”
→ 调用 ai-save-pattern
```

---

## 14. 存储策略设计

## 14.1 推荐存储方式

### 图片文件

- Netlify Blobs

### 元数据

- Netlify Blobs
- JSON 或 key/value 结构存储

### 为什么不用“写回项目文件夹”

- 浏览器不能直接改线上仓库目录
- 写回仓库会引发版本管理和部署问题
- 不适合频繁上传图片

---

## 15. 环境变量设计

## 15.1 必要变量

```text
DEEPSEEK_API_KEY=xxxx
OPENAI_API_KEY=xxxx
BLOB_STORE_NAME=patterns
```

## 15.2 配置原则

这些变量应配置在 **Netlify 项目环境变量**中，不应写进前端代码，也不建议放在仓库的公开配置里。

---

## 16. OpenAI 图片生成 Function 设计建议

## 16.1 `ai-generate-image` 职责

该 Function 负责：

1. 接收前端传入的 `image_prompt`
2. 调用 OpenAI 图片生成接口
3. 获取返回的 base64 图片
4. 写入 Blobs 或回传前端
5. 返回统一结构

## 16.2 请求体建议

```json
{
  "prompt": "生成一张苗族风格、蓝白配色、对称结构、适合刺绣文创应用的民族纹案图",
  "size": "1024x1024"
}
```

## 16.3 响应体建议

```json
{
  "success": true,
  "imageUrl": "/blob/patterns/pt_002.png",
  "model": "gpt-image-1.5"
}
```

---

## 17. 目录结构建议

```text
project-root/
│
├─ index.html
├─ styles/
│  ├─ reset.css
│  ├─ main.css
│  ├─ home.css
│  ├─ gallery.css
│  ├─ detail.css
│  ├─ market.css
│  ├─ creator.css
│  └─ ai.css
│
├─ js/
│  ├─ app.js
│  ├─ api.js
│  ├─ state.js
│  ├─ utils.js
│  ├─ components/
│  │  ├─ navbar.js
│  │  ├─ modal.js
│  │  ├─ card.js
│  │  └─ carousel.js
│  └─ pages/
│     ├─ home.js
│     ├─ gallery.js
│     ├─ detail.js
│     ├─ market.js
│     ├─ creator.js
│     └─ ai.js
│
├─ netlify/
│  └─ functions/
│     ├─ pattern-list.js
│     ├─ pattern-upload.js
│     ├─ pattern-create.js
│     ├─ pattern-update.js
│     ├─ pattern-delete.js
│     ├─ product-publish.js
│     ├─ product-unpublish.js
│     ├─ product-price-update.js
│     ├─ creator-dashboard.js
│     ├─ creator-recent-patterns.js
│     ├─ ai-generate-meta.js
│     ├─ ai-generate-image.js
│     └─ ai-save-pattern.js
│
├─ netlify.toml
└─ README.md
```

---

## 18. 前端页面切换方案

由于你要求“不使用路由跳转”，建议采用：

- 所有页面都放在 `index.html`
- 每个模块对应一个 `section`
- 点击导航时只切换显示状态
- 详情页采用弹窗层或覆盖层

示例：

```html
<section id="home-section"></section>
<section id="gallery-section" class="hidden"></section>
<section id="market-section" class="hidden"></section>
<section id="creator-section" class="hidden"></section>
<section id="ai-section" class="hidden"></section>
```

---

## 19. MVP 开发优先级

### 第一阶段：基础可展示版

- 首页
- 纹案库
- 上传图片
- 详情查看
- 商品展览
- 创作者中心基础统计

### 第二阶段：完整管理版

- 修改名称和简介
- 删除作品
- 上架 / 撤回 / 改价
- 创作者中心最近作品管理
- AI 结构化文案生成
- OpenAI 图片生成

### 第三阶段：增强版

- 图片编辑能力
- 标签筛选
- 排序
- 生成历史
- 创作者资料编辑
- 登录体系

---

## 20. 备选方案：Gemini 替换 OpenAI 的方式

如果你后续想把图片生成模型从 OpenAI 改成 Gemini，也可以保留同样架构，只替换这一层：

```text
DeepSeek（结构化文案）
    ↓
Gemini Native Image Generation / Imagen
```

但建议仍然通过 `Netlify Functions` 服务端调用，而不是前端直连。

---

## 21. 最终推荐结论

本项目当前最推荐的技术方案为：

- 前端：`HTML + CSS + JavaScript`
- 部署：`GitHub + Netlify`
- 服务端层：`Netlify Functions`
- 存储层：`Netlify Blobs`
- 文案生成：`DeepSeek`
- 图片生成：`OpenAI GPT Image 1.5`
- 页面形式：`单页面 section 切换`
- 新增模块：`创作者中心`

这套方案的优点是：

- 不需要自建云服务器
- 保持 H5 单页项目形态
- 能完成上传、搜索、详情、上架、创作者管理、AI 生成等关键流程
- 图片生成接口已经替换为更适合当前落地的主流模型
- 后续仍可切换到 Gemini / Imagen
