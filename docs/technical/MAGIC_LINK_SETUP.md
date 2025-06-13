# Magic Link 登录功能实现说明

## 已实现的功能

### 1. URL Scheme 支持
- 在主进程中注册了 `snippai://` 协议
- 添加了深度链接处理逻辑
- 支持跨平台的协议处理（macOS、Windows、Linux）

### 2. Magic Link 认证
- 在 AuthContext 中添加了 `signInWithMagicLink` 方法
- 配置了 Supabase 重定向 URL 为 `snippai://auth/callback`
- 实现了深度链接回调处理

### 3. 用户界面优化
- 更新了登录表单以支持 Magic Link 选项
- 添加了复选框来切换 Magic Link 和密码登录
- 更新了按钮文本以反映当前登录方式

### 4. 多语言支持
- 添加了 Magic Link 相关的翻译文本
- 支持英文、简体中文、繁体中文

## Supabase 配置要求

为了使 Magic Link 功能正常工作，需要在 Supabase 项目中配置以下设置：

### 1. 重定向 URL 配置
在 Supabase Dashboard 的 Authentication > URL Configuration 中添加：
```
snippai://auth/callback
```

### 2. 邮件模板配置（可选）
可以在 Authentication > Email Templates 中自定义 Magic Link 邮件模板。

## 使用流程

### 用户登录流程：
1. 用户在登录表单中输入邮箱
2. 勾选"使用魔法链接"选项
3. 点击"发送魔法链接"按钮
4. 系统发送包含认证链接的邮件
5. 用户点击邮件中的链接
6. 系统通过 URL scheme 打开应用
7. 应用处理认证回调并自动登录用户

### 技术实现细节：
1. **主进程**：注册 URL scheme，监听深度链接事件
2. **渲染进程**：发送 Magic Link 请求，处理认证回调
3. **Supabase**：处理 OTP 生成和验证

## 测试方法

### 开发环境测试：
1. 启动应用：`npm run start`
2. 打开登录对话框
3. 输入有效邮箱地址
4. 勾选"使用魔法链接"
5. 点击"发送魔法链接"
6. 检查邮箱并点击链接

### 生产环境测试：
1. 打包应用：`npm run package`
2. 安装打包后的应用
3. 重复上述测试步骤

## 故障排除

### 常见问题：
1. **链接无法打开应用**：检查 URL scheme 是否正确注册
2. **认证失败**：检查 Supabase 重定向 URL 配置
3. **邮件未收到**：检查邮箱地址和 Supabase 邮件配置

### 调试方法：
1. 查看主进程控制台日志
2. 查看渲染进程开发者工具
3. 检查 Supabase 项目日志

## 安全考虑

1. Magic Link 具有时效性（通常 1 小时）
2. 每个链接只能使用一次
3. 链接包含加密的认证令牌
4. 应用验证令牌的有效性

## 后续优化建议

1. 添加 Magic Link 过期提醒
2. 实现重新发送 Magic Link 功能
3. 添加更详细的错误处理和用户反馈
4. 考虑添加生物识别认证支持
