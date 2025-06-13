# Snippai 登录功能升级指南

## 🎉 新功能概览

我们已经成功升级了 Snippai 的登录系统，实现了以下重要改进：

### ✨ 主要新功能
1. **Magic Link 无密码登录** - 用户只需输入邮箱即可通过邮件链接登录
2. **URL Scheme 深度链接** - 支持从邮件直接跳转回应用
3. **简化的用户体验** - 减少密码输入，提高安全性
4. **多语言支持** - 完整的中英文界面

## 🔧 配置要求

### 1. Supabase 项目配置

在您的 Supabase 项目中需要进行以下配置：

#### 重定向 URL 设置
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目
3. 进入 `Authentication` > `URL Configuration`
4. 在 `Redirect URLs` 中添加：
   ```
   snippai://auth/callback
   ```
5. 点击 `Save` 保存设置

#### 邮件模板配置（可选）
1. 进入 `Authentication` > `Email Templates`
2. 选择 `Magic Link` 模板
3. 自定义邮件内容和样式
4. 确保链接指向正确的重定向 URL

### 2. 应用配置

确保 `.env` 文件包含正确的 Supabase 配置：
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🚀 使用方法

### Magic Link 登录流程

1. **启动应用**
   ```bash
   npm run start
   ```

2. **打开登录界面**
   - 点击应用右上角的"登录"按钮

3. **使用 Magic Link 登录**
   - 输入您的邮箱地址
   - 确保勾选"使用魔法链接（无需密码）"选项
   - 点击"发送魔法链接"按钮

4. **检查邮箱**
   - 查看您的邮箱收件箱
   - 点击邮件中的"登录"链接

5. **自动登录**
   - 应用将自动打开并完成登录
   - 您将看到用户菜单替换登录按钮

### 传统密码登录（仍然支持）

如果您更喜欢使用密码登录：
1. 取消勾选"使用魔法链接"选项
2. 输入邮箱和密码
3. 点击"登录"按钮

## 🧪 测试指南

### 开发环境测试

1. **启动开发服务器**
   ```bash
   npm run start
   ```

2. **测试 Magic Link 功能**
   - 使用有效的邮箱地址
   - 发送 Magic Link
   - 检查控制台日志确认深度链接处理

3. **测试 URL Scheme**
   - 在浏览器中访问：`snippai://auth/callback#access_token=test`
   - 应用应该自动获得焦点

### 生产环境测试

1. **打包应用**
   ```bash
   npm run package
   ```

2. **安装并测试**
   - 安装打包后的应用
   - 完整测试登录流程
   - 验证 URL scheme 注册

## 🔍 故障排除

### 常见问题及解决方案

#### 1. Magic Link 邮件未收到
- **检查邮箱地址是否正确**
- **查看垃圾邮件文件夹**
- **确认 Supabase 邮件配置**
- **检查 Supabase 项目配额**

#### 2. 点击链接无法打开应用
- **确认应用已安装并注册了 URL scheme**
- **检查 Supabase 重定向 URL 配置**
- **在开发环境中检查控制台错误**

#### 3. 认证失败
- **检查网络连接**
- **确认 Supabase 项目状态**
- **查看浏览器开发者工具的网络请求**

### 调试方法

1. **查看主进程日志**
   ```bash
   # 在开发环境中，主进程日志会显示在终端
   ```

2. **查看渲染进程日志**
   - 按 F12 打开开发者工具
   - 查看 Console 标签页

3. **检查 Supabase 日志**
   - 在 Supabase Dashboard 中查看 Logs 部分

## 📋 技术实现细节

### 架构改进
- **主进程**：添加了 URL scheme 注册和深度链接处理
- **渲染进程**：实现了 Magic Link 发送和认证回调处理
- **UI 组件**：更新了登录表单以支持多种登录方式

### 安全特性
- Magic Link 具有时效性（通常 1 小时）
- 每个链接只能使用一次
- 使用加密的认证令牌
- 支持会话管理和自动刷新

## 🎯 下一步计划

1. **添加生物识别认证支持**
2. **实现社交登录（Google、Microsoft）**
3. **添加双因素认证**
4. **优化离线体验**

---

如果您在使用过程中遇到任何问题，请查看控制台日志或联系技术支持。
