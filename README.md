# 一天菜园 v0.2 Auth/Data 版

本版本在 v0.1 前台原型基础上接入 Supabase：

- Email OTP / Magic Link 登录
- 创建「一天菜园」
- 创建默认区域
- 从 Supabase 读取地图、生长、最近记录
- 添加植物
- 一键记录

## 环境变量

Netlify / 本地都需要：

```bash
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的 publishable key 或 anon public key
```

## Netlify

- Build command: `npm run build`
- Publish directory: `dist`

## 安全边界

前端只允许使用 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
不要把 `service_role`、`DEEPSEEK_API_KEY`、`DOUBAO_API_KEY` 放进前端。
