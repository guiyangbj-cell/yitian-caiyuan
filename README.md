# 一天菜园 v0.7.2

本版修复 v0.7.1 的两个阻塞问题：

1. 天气改为 Netlify Function 代理调用 Open-Meteo，不再由手机浏览器直接请求 Open-Meteo。
2. 今天页增加更完整的种菜/养花天气信息：体感、湿度、今日降水、降水概率、最高温、风、阵风、紫外线、蒸散、土温、浅层土湿。
3. 照片理解失败时，前台会显示更明确的错误，并在今天页提示“还没有完成照片观察”，方便排查 Netlify Function 日志。

上传 GitHub 根目录时请覆盖：

- package.json
- package-lock.json
- index.html
- README.md
- public
- src
- netlify
- netlify.toml

注意：照片理解需要 Netlify 环境变量：

- DOUBAO_API_KEY
- 可选 DOUBAO_MODEL
- 可选 DOUBAO_BASE_URL

如果一直没有“园丁看过”，请检查 Netlify → Functions → analyze-photo 日志。
