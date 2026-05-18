# 目标是 Galgame 大师

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSakura-Natsu%2Fbgm-master-galgame&env=BANGUMI_APPID%2CBANGUMI_APPSEC%2CBANGUMI_REDIRECT_URI&envDescription=Bangumi%20OAuth%20%E9%85%8D%E7%BD%AE&envLink=https%3A%2F%2Fgithub.com%2FSakura-Natsu%2Fbgm-master-galgame%23bangumi-oauth-%E9%85%8D%E7%BD%AE)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Sakura-Natsu/bgm-master-galgame)

一个基于 Bangumi 数据的 Galgame 评分挑战单页应用。玩家每轮从两部作品中选择评分更高的一部，应用会根据 Bangumi 评分、评分人数、年份和标签筛选候选池，并支持普通模式与限时模式。

项目主体是无构建步骤的静态页面：`index.html` 内含 HTML、CSS 和浏览器端 JavaScript；数据文件位于 `data/`；Vercel 与 Netlify 函数用于 Bangumi OAuth 登录和受限封面代理。

## 功能

- Galgame 两两评分竞猜，显示连击、答题数和剩余机会。
- 支持限时模式、重新开始和音效开关。
- 可按最低评分人数、年份范围和标签过滤候选池。
- 卡片可跳转到 Bangumi 条目页。
- 支持 Bangumi OAuth 登录，登录后可按账号权限获取受限封面。
- 当前 `data/galgame_list.json` 包含 3334 条已补全评分数据，采集时间见 `data/galgame_meta.json`。

## 本地预览

在仓库根目录运行：

```powershell
python -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

静态服务器只能预览页面、数据加载、筛选和判题逻辑；`/api/*` 函数不会在这个命令下运行，因此 OAuth 登录和封面代理需要在 Vercel 或 Netlify 环境中验证。

## 数据刷新

项目使用脚本抓取 `https://bangumi.tv/game/browser/Galgame` 的 subject id，并通过 Bangumi API 补全作品详情。

```powershell
.\scripts\fetch-galgame-data.ps1
```

常用参数：

```powershell
.\scripts\fetch-galgame-data.ps1 -MaxPages 5
.\scripts\fetch-galgame-data.ps1 -DelayMs 500 -ApiConcurrency 4
.\scripts\fetch-galgame-data.ps1 -SkipHydrate
```

如需认证访问 Bangumi API，可临时设置环境变量：

```powershell
$env:BANGUMI_TOKEN="你的 Bangumi token"
.\scripts\fetch-galgame-data.ps1
```

不要提交真实 token，也不要提交 `data/galgame_details_cache.json`。

## Bangumi OAuth 配置

如需启用登录和受限封面代理，请在 Bangumi 创建 OAuth 应用，并把回调地址配置为部署域名下的：

```text
https://你的域名/api/bangumi-authorize
```

部署平台需要配置以下环境变量：

```text
BANGUMI_APPID=Bangumi 应用 ID
BANGUMI_APPSEC=Bangumi 应用密钥
BANGUMI_REDIRECT_URI=https://你的域名/api/bangumi-authorize
```

可选变量：

```text
BANGUMI_TOKEN=部署方全局 token
```

如果配置了 `BANGUMI_TOKEN`，封面代理会优先使用它；否则会使用用户完成 OAuth 登录后写入的 HttpOnly cookie。前端只请求本项目的 `/api/bgm-cover?id=subjectId`，不会读取或保存 Bangumi access token。

## 一键部署

### Vercel

点击 README 顶部的 Vercel 按钮，或访问：

```text
https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSakura-Natsu%2Fbgm-master-galgame&env=BANGUMI_APPID%2CBANGUMI_APPSEC%2CBANGUMI_REDIRECT_URI
```

部署设置：

- Framework Preset：`Other` 或自动检测。
- Build Command：留空。
- Output Directory：留空或填 `.`。
- 环境变量：填写 `BANGUMI_APPID`、`BANGUMI_APPSEC`、`BANGUMI_REDIRECT_URI`。

部署完成后，确认以下地址可访问：

```text
https://你的域名/api/bgm-oauth-start
https://你的域名/api/bgm-me
```

### Netlify

点击 README 顶部的 Netlify 按钮，或访问：

```text
https://app.netlify.com/start/deploy?repository=https://github.com/Sakura-Natsu/bgm-master-galgame
```

部署设置已在 `netlify.toml` 中声明：

```toml
[build]
publish = "."
functions = "netlify/functions"
```

部署后在 Netlify 的环境变量设置中添加：

```text
BANGUMI_APPID
BANGUMI_APPSEC
BANGUMI_REDIRECT_URI
```

`netlify.toml` 会把 `/api/*` 路由转发到 `netlify/functions/` 下的对应函数。

## 目录结构

```text
.
+-- index.html                  # 单页应用入口
+-- data/
|   +-- galgame_list.json        # 主数据
|   +-- galgame_meta.json        # 数据来源与统计信息
+-- scripts/
|   +-- fetch-galgame-data.mjs   # 数据抓取与补全脚本
|   +-- fetch-galgame-data.ps1   # PowerShell 包装器
+-- api/                         # Vercel Serverless Functions
+-- netlify/functions/           # Netlify Functions
+-- netlify.toml                 # Netlify 构建与路由配置
```

## 验证清单

修改后建议至少检查：

- 页面能加载 `data/galgame_list.json`。
- 候选池数量正常，筛选项能生效。
- 点击左右卡片能判题并更新连击、机会和统计。
- 控制台没有非预期错误。
- 修改 OAuth 或封面代理后，验证 `/api/bgm-oauth-start`、`/api/bangumi-authorize`、`/api/bgm-me` 与 `/api/bgm-cover?id=...`。

## 安全提示

- 不要提交 `.env*`、`.dev.vars*`、`.wrangler/`。
- 不要提交 `data/galgame_details_cache.json`。
- 不要在 `index.html`、数据文件或文档中写入真实 token。
- `BANGUMI_APPSEC` 和 `BANGUMI_TOKEN` 只应配置在部署平台的环境变量中。
