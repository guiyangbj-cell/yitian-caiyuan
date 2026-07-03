# 一天菜园 v0.7

本版包含：

1. 路线 B：照片上传后调用服务端函数，让豆包/火山方舟多模态模型做一次低风险照片观察。
2. 地图区域可编辑：默认 4 块地可以改名、改日照、改水源、改用途。
3. 不改 Supabase 表结构，不改登录逻辑，不改天气逻辑。

## 需要新增 Netlify 环境变量

Netlify → Project configuration → Environment variables 新增：

- DOUBAO_API_KEY：你的火山方舟 API Key
- DOUBAO_MODEL：可选，默认 doubao-seed-2-1-pro-260628
- DOUBAO_BASE_URL：可选，默认 https://ark.cn-beijing.volces.com/api/v3

保存后重新部署。API Key 不要写进前端代码。

## 上传文件

上传覆盖 GitHub 根目录：

- package.json
- package-lock.json
- index.html
- README.md
- netlify.toml
- public
- src
- netlify

Commit message: add photo understanding and editable map

## 测试

1. 手机端拍一张照片或从相册选择。
2. 保存到整个菜园 / 某块区域 / 某个植物。
3. 如果 DOUBAO_API_KEY 配置正确，保存后会提示「已保存，园丁也看了一眼」。
4. 首页会出现「园丁看过」卡片。
5. Supabase 的 ai_recommendations 表会新增一条 source_type=photo 的记录。
6. 地图页点击某个区域的「编辑」，修改后保存，刷新应保留修改。

## 注意

照片理解只做温和观察，不做病虫害确诊，不建议用药。
