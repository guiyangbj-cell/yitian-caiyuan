# 一天菜园 v0.4.3 Photo Source Fix

本版基于 v0.4.2 家庭登录版，只修复一个问题：手机端「拍一下」被 capture 属性强制拉起相机，无法从相册选择。

## 改动

- 底部主动作拆成两个入口：
  - 拍照：使用 `capture="environment"`，优先打开相机。
  - 相册：只使用 `accept="image/*"`，不使用 capture，允许从相册/文件选择图片。
- 其余功能不变：家庭登录、开园、地图、生长、日志、图片上传。

## 部署

覆盖上传到 GitHub 根目录，等待 Netlify Published。
