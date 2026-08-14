# D4秘典 Windows Server 2016 部署说明

## 1. 准备目录

把整个 `windows-server` 文件夹上传到服务器，例如：

`C:\apps\d4-midian`

服务器需要安装可用的 Node.js、IIS URL Rewrite 与 Application Request Routing（ARR）。ARR 中启用 Proxy。

## 2. 创建数据库

不要使用 WordPress 数据库。使用 MySQL 管理账号执行 `schema.sql`，然后创建专用账号：

```sql
CREATE USER 'd4app'@'localhost' IDENTIFIED BY '替换为独立强密码';
GRANT SELECT, INSERT, UPDATE, DELETE ON d4build.* TO 'd4app'@'localhost';
FLUSH PRIVILEGES;
```

`schema.sql` 兼容 MySQL 5.6，采用 InnoDB 和 utf8mb4。

## 3. 配置环境

复制 `.env.example` 为 `.env`，只在服务器本地填写数据库密码。生成 JWT 密钥：

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

把结果填入 `JWT_SECRET`。生产环境保持 `COOKIE_SECURE=true`，网站必须使用 HTTPS。

## 4. 安装并启动

在网站目录运行：

```powershell
npm install --omit=dev
npm start
```

确认浏览器能在服务器本机打开 `http://127.0.0.1:3100`。正式运行建议用 NSSM 或 PM2 把 `node server.js` 注册为开机自启服务，工作目录设置为网站目录。

## 5. 配置 IIS

1. 新建 IIS 网站，物理路径指向 `C:\apps\d4-midian`。
2. 绑定域名 `d4.dingdiantui.com`。
3. 应用程序池设置为“无托管代码”。
4. 确认目录内的 `web.config` 生效，它会把请求转发到 `127.0.0.1:3100`。
5. 安装 HTTPS 证书，再把 DNS 的 `d4` 记录指向服务器公网 IP。

## 6. 设置首位管理员

先正常注册一个账号，再在 MySQL 中执行：

```sql
USE d4build;
UPDATE users SET role='admin' WHERE email='你的管理员邮箱';
```

退出并重新登录后，导航栏会出现“管理后台”。不要直接向数据库写入明文密码。

## 7. 已实现功能

- 邮箱和密码注册登录，密码使用 bcrypt 哈希保存
- 普通用户、管理员与停用状态
- Build 草稿和公开发布
- 技能树、巅峰盘拖动、缩放、节点选择与路线高亮
- 装备、威能和词缀编辑
- Build 留言与注册用户评论
- 管理员停用/解封用户、隐藏评论的接口
- 登录限流、安全响应头、参数化数据库查询

## 8. 数据备份

至少每天备份 `d4build` 数据库。升级前同时备份程序目录和数据库。不要把 `.env`、数据库密码或 JWT 密钥上传到公开代码仓库。
