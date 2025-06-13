# 深度链接测试指南

## 🔧 修复内容

我已经修复了深度链接处理的问题：

### 1. **主进程修复**
- 更新了 `handleDeepLink` 函数以正确识别认证回调
- 现在支持查询参数格式的认证数据（不仅仅是 hash 格式）
- 添加了更详细的日志输出

### 2. **渲染进程修复**
- 更新了 `AuthContext` 中的认证回调处理
- 现在优先检查查询参数中的 token，然后才检查 hash
- 改进了错误处理和日志输出

## 🧪 测试方法

### 方法1：使用浏览器测试
1. 在浏览器中打开以下URL（将其复制到地址栏）：
```
snippai://auth/callback?access_token=test_token&refresh_token=test_refresh&expires_at=1749077908&expires_in=3600&token_type=bearer&type=signup
```

### 方法2：使用终端测试
```bash
# macOS
open "snippai://auth/callback?access_token=test_token&refresh_token=test_refresh&expires_at=1749077908&expires_in=3600&token_type=bearer&type=signup"

# Windows
start "snippai://auth/callback?access_token=test_token&refresh_token=test_refresh&expires_at=1749077908&expires_in=3600&token_type=bearer&type=signup"

# Linux
xdg-open "snippai://auth/callback?access_token=test_token&refresh_token=test_refresh&expires_at=1749077908&expires_in=3600&token_type=bearer&type=signup"
```

### 方法3：使用真实的Magic Link
1. 在应用中点击登录按钮
2. 输入邮箱地址
3. 点击"发送登录链接"
4. 检查邮箱并点击链接

## 📋 预期结果

### 主进程日志（终端输出）
```
Handling deep link: snippai://auth/callback?access_token=...
Authentication callback received
URL pathname: /auth/callback
URL search params: { access_token: '...', refresh_token: '...', ... }
URL hash: 
Sending auth data to renderer: { url: '...', hash: '', searchParams: {...} }
```

### 渲染进程日志（浏览器控制台）
```
Received auth callback: { url: '...', searchParams: {...} }
Found tokens in search params: { accessToken: true, refreshToken: true }
Setting session with tokens
Successfully authenticated via magic link
Auth state changed: SIGNED_IN [Session object]
Auth success callback triggered
```

### 用户界面变化
- 应用窗口自动获得焦点
- 登录对话框自动关闭（如果打开）
- 右上角显示用户菜单（而不是登录按钮）
- 调试信息显示 "User: Logged in"

## 🔍 故障排除

### 如果深度链接不工作：

1. **检查URL scheme注册**
   ```bash
   # macOS - 检查是否注册了协议
   defaults read com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers | grep snippai
   ```

2. **检查应用是否运行**
   - 确保应用正在运行
   - 如果应用没有运行，深度链接应该启动应用

3. **检查控制台日志**
   - 主进程日志：查看终端输出
   - 渲染进程日志：按F12打开开发者工具

### 如果认证失败：

1. **检查token格式**
   - 确保URL包含 `access_token` 和 `refresh_token`
   - 检查token是否有效

2. **检查Supabase配置**
   - 确认 `.env` 文件中的配置正确
   - 检查Supabase项目状态

## 🎯 下一步测试

1. **完整流程测试**：
   - 发送真实的Magic Link
   - 点击邮件中的链接
   - 验证自动登录

2. **边界情况测试**：
   - 无效token的处理
   - 过期token的处理
   - 网络错误的处理

3. **用户体验测试**：
   - 登录对话框自动关闭
   - 用户状态正确更新
   - 界面响应及时

## 📝 注意事项

- 测试时使用的是模拟token，实际使用时需要真实的Supabase token
- 深度链接在开发环境和生产环境中的行为可能略有不同
- 确保Supabase项目中配置了正确的重定向URL：`snippai://auth/callback`

现在请尝试上述测试方法，看看深度链接是否正常工作！
