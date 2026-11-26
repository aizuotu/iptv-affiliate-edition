# IPTV Affiliate Edition · 推广位二开版

基于 [akiralereal/iptv](https://github.com/akiralereal/iptv) **v4.84.0**（commit `7f5ea10`，2026-11-25）的二次开发版本。
原项目是 GPL-3.0 许可的 Node.js 单体 IPTV 管理服务；本版本**没有改动任何播放源、提取器或代理逻辑**，只增加了一层可配置、可关闭、中英双语的推广位，以及一个不需要后台密码的公开落地页。

> 上游仓库：[github.com/akiralereal/iptv](https://github.com/akiralereal/iptv) · 授权：GPL-3.0（见 `LICENSE`）
> 配套实测文章：[中文 · IPTV 后台二开实录](https://www.quanyixia.com/iptv-affiliate-links-diy/) · [English · IPTV Affiliate Edition](https://www.quanyixia.com/en/iptv-affiliate-fork-download-en/)

## 下载 / Downloads

| 入口 | 说明 |
| --- | --- |
| [本仓库](https://github.com/aizuotu/iptv-affiliate-edition) | 完整源码，可直接 clone / Star / 提 issue |
| [源码 zip（国内可达镜像）](https://gh-proxy.com/https://github.com/aizuotu/iptv-affiliate-edition/archive/refs/heads/main.zip) | 本机实测 `github.com` 直连返回 000，走这个镜像可以下载完整包 |
| [补丁包 iptv-affiliate-patch.zip](https://www.quanyixia.com/downloads/iptv-affiliate-patch.zip) | 仅 8 个改动文件 + `changes.diff`，约 240 KB，适合已有上游源码时套用 |

补丁包 sha256：`a70dd32b11a16a591c05e17ed3d4b3c44bd4bdade0a69107b6764e907d53aeb9`。

## 改了什么 / What changed

| 文件 | 类型 | 说明 |
| --- | --- | --- |
| `affiliate-links.json` | 新增 | 四条推广链接的唯一配置源：中英文案、CTA、品牌色、风险提示、次级链接 |
| `utils/affiliate.js` | 新增 | 纯字符串注入渲染器；只放行 https、HTML 转义、按 mtime 缓存、配置损坏静默降级 |
| `web/links.html` | 新增 | 公开 `/links` 落地页：中英切换、深浅主题、SEO meta、返佣披露 |
| `app.js` | 修改 | 后台 HTML 返回时套一层注入；新增公开 `/links` 路由 |
| `web/admin.html` | 修改 | 「关于我们」页加推广区、顶栏「资源推荐」按钮、配套 CSS 与交互 |
| `docker-compose.affiliate.yml` | 新增 | 从源码构建，并把配置 JSON 只读挂载 |

原项目相对上游共 **148 行新增 / 1 行修改**。

## 快速开始 / Quick start

```bash
npm install
node app.js
# 默认后台：http://localhost:1905/admin
# 公开推广页：http://localhost:1905/links
```

设了 `mpass` 访问密码时，地址相应变成 `/<pass>/admin` 与 `/<pass>/links`。

Docker：

```bash
docker compose -f docker-compose.affiliate.yml up -d --build
```

**推荐用配置挂载的方式部署**：改 `affiliate-links.json` 后刷新页面即生效，不用重建镜像、不用重启容器。

## 配置 / Configuration

`affiliate-links.json` 顶层字段：

- `enabled`：设为 `false` 关闭整个推广位；也可用环境变量 `mAffiliateEnabled=false` 临时关闭。
- `title` / `subtitle` / `disclosure`：中英双语区块文案。**请保留 `disclosure` 的返佣披露**。
- `links[]`：每条包含 `id`、`glyph`、`accent`、`url`、`name`、`tag`、`desc`、`warning`、`cta`、`more`、`moreUrl`、`moreUrlEn`。
  - `url` 只接受 `https:` 绝对地址，`javascript:` 或内网地址会被渲染器丢弃。
  - `warning` 用于如实写明平台限制；`moreUrlEn` 可指向该资源的英文版页面。

校验渲染结果：

```bash
node --input-type=module -e "import {injectAffiliate} from './utils/affiliate.js'; \
console.log(injectAffiliate('<!-- AFFILIATE_SLOT -->').length)"
```

## 许可与合规 / License & compliance

- 本项目沿用上游 **GPL-3.0**。`LICENSE` 与所有版权声明原样保留；分发修改版（含二进制/镜像）时请继续遵守 GPL-3.0 的开源义务，并注明修改内容与日期。
- 卡片带有「推广链接 / Referral」角标，页面底部有统一返佣披露：通过链接注册或购买，站长可能获得平台返佣，**不会额外增加你的费用，也不会提高注册者本人的收益**。
- 示例配置里的 TraffMonetizer 卡片明确写出其服务条款限制：仅允许住宅 IP、禁止服务器 / VPN / 代理；`$5` 注册奖励已于 2024-03-01 取消，最低提现 `$10`。请如实维护这些文案，不要写平台未承诺的收益。
- IPTV 源的采集与分发在不同地区有不同版权与网络规则。本项目只提供「给自建后台加推广位」的改造方法，**不包含也不鼓励任何侵权内容**，请自行确认合规性。

## 实测记录 / Verification

本地 Node 22 + 真实浏览器验证：`/admin` 与 `/links` 均 200；4 张卡片、4 条链接全部命中且带 `noopener noreferrer`；占位符残留 0、pageerror 0；390px 移动端无横向溢出；边界测试 9/9 PASS；与改动相关的 6 个原有回归测试 6/6 PASS。

已知环境问题：完整 `npm test` 中 `test-sztv-live.mjs` 的异步定时器在 Windows / Node 22 下会挂起，与本次改动无关（其依赖文件与上游逐字节一致）。另外**编辑这些单文件页面时请保持 LF 行尾**，仓库里有测试按 `\n` 精确匹配 HTML 片段，改成 CRLF 会导致断言失败。
