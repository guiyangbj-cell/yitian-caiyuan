# 一天菜园 v0.3 Photo Upload

本版本在 v0.2 Auth/Data 基础上新增「拍一下」真实图片上传：

- 使用 Supabase Auth 登录
- 从 Supabase 读取/写入菜园、区域、植物、记录
- 点击「拍一下」选择或拍摄图片
- 前端将图片压缩到长边约 1600px
- 上传到 Supabase Storage `garden-photos`
- 在 `photos` 表写入图片元数据
- 在 `logs` 表写入 `photo_taken` 或 `child_discovery` 记录
- 今天页和四季页展示最近照片

暂未接入豆包视觉识别；v0.4 会在图片上传链路稳定后再接入视觉分析。

## 环境变量

Netlify 需要配置：

```bash
VITE_SUPABASE_URL=你的 Supabase Project URL
VITE_SUPABASE_ANON_KEY=你的 Supabase publishable/anon key
```

不要把 service_role、DeepSeek、豆包 API Key 放到前端。

## Netlify 构建

Build command:

```bash
npm run build
```

Publish directory:

```bash
dist
```
