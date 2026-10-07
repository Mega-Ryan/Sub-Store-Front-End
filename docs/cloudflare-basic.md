# Cloudflare 基础版

本分支配套 [Mega-Ryan/Sub-Store 的 cloudflare-basic 分支](https://github.com/Mega-Ryan/Sub-Store/tree/cloudflare-basic)。前端静态文件运行在 Pages，/backend 路由通过 Pages Functions 的 SUB_STORE Service Binding 调用私有 Worker。

## 功能

保留订阅、合集、内置节点处理、预览、格式转换、文件、限期/限次数分享、本地 JSON 备份和外观设置。Cloudflare 构建使用同域 /backend，旧 localStorage API 选择以及 api/magicpath URL 参数不会切换后端；原 Node 构建仍沿用原有入口。

基础版关闭脚本、Response Transformer、Resolve Domain、MMDB/节点 IP 查询、Gist/制品同步、归档、服务端代理和高级配置文件动作。操作菜单根据后端能力白名单显示，粘贴节点操作也检查白名单。后端同样校验不支持的能力，导入失败不写入部分数据。

## 访问与登录

正式地址：https://sub-store-ui-5f8.pages.dev
测试地址：https://sub-store-ui-staging.pages.dev

用 Worker Secret ADMIN_LOGIN_TOKEN 配置的管理凭据登录。凭据不进入 VITE_*、Git 或 localStorage。会话通过同域 HttpOnly Cookie 传递，过期/退出后需要重新登录。订阅客户端使用 /backend/share/... 分享 URL 和独立令牌；管理下载 URL 需要管理会话。分享开始导出即消耗一次，上游失败也可能消耗一次。

分享令牌由服务器随机生成，编辑元数据或有效期保留原链接和已消耗次数。基础版不支持手填或复用令牌。订阅失败回退、透传客户端 User-Agent、按订阅标签自动加入合集、临时下载参数覆盖和日志正则搜索暂不支持；可手动设置源请求 User-Agent，日志支持关键词与大小写选项。

## 构建和检查

Node 24.15.0，pnpm 11.0.9，Wrangler 4.147.0。首次安装需要下载依赖；workerd 构建脚本已明确允许。

```sh
pnpm install --frozen-lockfile
pnpm run types:cloudflare
pnpm run check:cloudflare
pnpm run build:cloudflare
pnpm run build:functions
```

绑定类型通过 types:cloudflare 从测试配置生成，worker-configuration.d.ts 已忽略，不提交。首次类型检查前运行该命令；自动检查和手动部署工作流也会先生成类型。Pages Function 检查使用单独 tsconfig；Vue 类型检查保留原项目范围。

本地联调先启动配套后端，再运行：

```sh
pnpm run build:cloudflare
pnpm run configure:cloudflare -- staging
pnpm exec wrangler pages dev dist
```

同域路由全部由 /backend 网关处理。_routes.json 限制 Functions 范围，PWA 导航回退明确排除 /backend。未知 API 应返回 Worker JSON 404；静态页面使用 Pages SPA 回退。

开发实例分别监听 Worker 8787 与 Pages 8799，后端 PUBLIC_ORIGIN 为 http://127.0.0.1:8799 时，可设置 SUB_STORE_TEST_ADMIN_TOKEN 环境变量后执行 `pnpm run smoke:cloudflare`。脚本固定访问本地 8799，创建可丢弃的订阅、合集、文件和分享，再清理这些测试记录；验证登录、能力、版本冲突、预览、格式下载、分享更新与消耗、备份导出、日志及退出。不要把正式凭据写入命令历史。

## 部署

先部署验收过的配套后端，再部署前端。Pages Direct Upload 生产分支为 cloudflare-basic。

```sh
pnpm run configure:cloudflare -- staging
pnpm exec wrangler pages deploy dist --project-name sub-store-ui-staging --branch cloudflare-basic
pnpm run configure:cloudflare -- production
pnpm exec wrangler pages deploy dist --project-name sub-store-ui --branch cloudflare-basic
```

生产绑定 sub-store-api；生产项目的 Preview 与测试项目全部绑定 sub-store-api-staging。禁止把 Preview 连接到正式数据库。

Wrangler 4.147.0 的 Pages 命令只读取根目录标准名称 wrangler.jsonc，不能使用自定义 --config 路径。configure:cloudflare 从两个已提交模板生成该文件（已忽略，不提交），默认选择 staging。types 命令使用具名测试模板生成类型。

自动检查工作流不部署。手动部署工作流需要 Actions 变量 CLOUDFLARE_ACCOUNT_ID 和 Secret CLOUDFLARE_API_TOKEN（账户内 Pages 部署最小权限），输入两个准确的提交 SHA，检查 /backend/health 的后端 revision 后再发布。GitHub/Cloudflare 插件授权不等于配置了 Actions Secret。新增权限或套餐费用需要独立授权。

本次先通过连接器部署。新 workflow 只存在 cloudflare-basic 分支时，GitHub 默认分支 master 尚未识别它，Actions 页面可能不显示手动运行按钮。后续启用 Actions 需要默认分支能识别该 workflow，并单独配置账户变量和部署 Secret；本次不修改 master 或默认分支。原 Vercel 工作流会跳过 cloudflare-basic 分支及其 PR，避免基础版 PR 触发旧平台发布。

## 回滚与备份

上线前记录配套提交 SHA。回滚前后端需要同时回到兼容的版本；在 Cloudflare Pages 中选择先前成功部署进行回滚。数据库变化不能由前端回滚恢复，按后端文档备份和迁移。

在“设置”导出 JSON，安全保管，其中可能包含订阅凭据和分享令牌。导入前有替换数据确认及 4 MiB 大小检查，后端负责完整验证和原子恢复。会话、缓存和运行日志不进入业务备份。

