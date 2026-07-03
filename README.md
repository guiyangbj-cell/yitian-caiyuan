# 一天菜园 v0.4.1 Password Login

本版本将登录方式从 Magic Link 改为邮箱 + 密码。

## 变化

- 登录页支持“登录 / 创建账号”切换
- 登录调用 Supabase `signInWithPassword`
- 创建账号调用 Supabase `signUp`
- 保留 v0.3.1 图片上传与数据链路
- 不再依赖 Magic Link 跨设备跳转

## Supabase 设置建议

Authentication → Sign In / Providers → Email：

- Enable email provider：开启
- Minimum password length：6 或更高

如果创建账号后提示需要确认邮箱，请先点邮箱确认链接，再回到 App 用邮箱密码登录。
