# 一天菜园 v0.5

本版本改动：

1. 首页接入 Open-Meteo，按北京怀柔近似坐标读取天气。
2. 「今天」页不再显示假状态，改为基于天气、浇水记录、最近照片、植物状态的规则判断。
3. 「拍一下」恢复成一个按钮，使用 `input type="file" accept="image/*"`，不再强制 `capture`。移动端应由系统提供拍照 / 相册等选择。
4. 保留 v0.4.2 家庭登录：账号由 Supabase 后台创建，前台只登录。

部署方式：

- 解压 zip。
- 上传 `package.json`、`package-lock.json`、`index.html`、`README.md`、`public`、`src` 到 GitHub 仓库根目录。
- Netlify 自动部署。

测试重点：

- 首页是否显示怀柔天气判断。
- 点「浇水了」后，刷新首页判断是否变化。
- 手机端点「拍一下」是否能选择拍照或相册。
- 图片保存后 Supabase `photos` 和 `logs` 是否仍正常写入。
