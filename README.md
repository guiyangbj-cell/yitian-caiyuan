# 一天菜园 v0.4.2 家庭登录版

这版把登录收敛为家庭私有 App 的稳定方案：

- 前台只保留邮箱 + 密码登录。
- 不开放注册。
- 不提供忘记密码 / 设置密码。
- 账号需要在 Supabase Dashboard 后台手动创建。
- 保留 v0.3.1 的开园、地图、生长、四季、日志、图片上传功能。

## 为什么这样做

一天菜园是家庭私有 App，不是大众产品。v0.1 阶段不需要开放注册，也不需要触发 Supabase 默认邮件服务，避免 Magic Link、OTP、重置密码、注册邮件等 rate limit 问题。

## 使用前请在 Supabase 手动创建账号

1. Supabase → Authentication → Users
2. 删除之前测试过的用户，避免旧 Magic Link / 半注册状态干扰
3. Add user / Create user
4. 输入邮箱和密码
5. 勾选 Auto confirm user / Confirm email（如果有）
6. 保存

然后在 App 里用这个邮箱和密码登录。

## 部署

覆盖 GitHub 根目录文件：

- package.json
- package-lock.json
- index.html
- README.md
- public
- src

等待 Netlify Published。
