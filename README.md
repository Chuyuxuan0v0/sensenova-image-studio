# SenseNova U1.5 Lite · 图像创作台

基于 [SenseNova U1.5 Lite](https://platform.sensenova.cn/docs)（`sensenova-u1.5-lite`，Neo-unify 架构）的单页图像创作应用，支持 **文生图** 与 **图片编辑** 两种模式，参数全部按官方文档实现。

## 功能

- **文生图** — 调用 `POST /v1/images/generations`，输入 prompt 生成图片
- **图片编辑** — 调用 `POST /v1/images/edits`，上传/粘贴参考图 + 编辑指令改写图片
- 两个模式调用**不同接口**，编辑模式必须传入参考图
- 参数：`size`（auto + 6 档 2K/4K 常量 + 自定义）、`output_format`（png/jpeg/webp）、`response_format`（b64_json/url）、`watermark`、`prompt_extend`、`n=1`
- 结果：预览、下载、复制 Base64 / 新标签打开、**「以此图作为编辑参考」**闭环、会话历史
- API Key 与设置存 localStorage，`100dvh` 视口自适应无页面滚动条

## 快速开始（推荐）

```bash
cd D:\CodeProject\SensenovaModels
npm start
```

一条命令同时启动本地服务并自动打开浏览器，页面与代理**同源**，无 CORS / 无 file:// 问题。

然后：
1. 在 [控制台 → API Keys](https://platform.sensenova.cn/console/keys) 获取 `sk-` 开头密钥，填入页面
2. 写 Prompt，点「开始创作」

## 文件说明

| 文件 | 作用 |
|------|------|
| `index.html` | 单页应用主体（纯前端，无构建） |
| `serve.js` | 一体化本地服务：提供页面 + 同源代理官方接口，自动开浏览器 |
| `proxy.js` | 纯 CORS 代理（不提供页面，供双击 html 使用） |
| `package.json` | `npm start` 入口 |

## 单独使用代理（双击打开 html）

若不想用 `serve.js` 而直接双击 `index.html` 打开，先启动代理：

```bash
node proxy.js
```

页面里「Base URL」填 `http://localhost:9119/v1` 即可（默认值已是这个）。

## 端口

默认 `9119`，可用环境变量改：

```bash
PORT=8080 npm start          # 页面+代理端口
PROXY_PORT=8080 node proxy.js # 纯代理端口
```
