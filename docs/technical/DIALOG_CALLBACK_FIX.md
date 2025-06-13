# 登录对话框回调修复

## 🎯 问题描述

用户通过深度链接登录后，`onAuthSuccess` 回调没有被正确设置和调用，导致登录窗口没有隐藏。

## 🔍 根本原因分析

### 1. **React useEffect 依赖问题**
```typescript
// 问题：useEffect 依赖数组中缺少 onAuthSuccess
useEffect(() => {
  const handleAuthCallback = async (authData: any) => {
    // 这里使用的 onAuthSuccess 可能是过期的闭包值
    if (onAuthSuccess) {
      onAuthSuccess();
    }
  };
}, []); // ❌ 缺少 onAuthSuccess 依赖
```

### 2. **状态更新时机问题**
- `onAuthSuccess` 在 App.tsx 中设置
- 但 AuthContext 中的 `useEffect` 在组件挂载时就固定了回调引用
- 后续的状态更新不会触发 `useEffect` 重新运行

### 3. **回调逻辑错误**
```typescript
// App.tsx 中的逻辑错误
useEffect(() => {
  if (!openLoginDialog) { // 当对话框关闭时
    setOnAuthSuccess(() => () => {
      if (openLoginDialog) { // 检查对话框是否打开
        setOpenLoginDialog(false); // 永远不会执行
      }
    });
  }
}, [openLoginDialog]);
```

## 🔧 修复方案

### 1. **使用 useRef 保存最新回调**

**文件：** `src/renderer/context/AuthContext.tsx`

```typescript
import { useRef } from 'react';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [onAuthSuccess, setOnAuthSuccess] = useState<(() => void) | undefined>();
  
  // 使用 ref 保存最新的回调函数，避免 useEffect 重新运行
  const onAuthSuccessRef = useRef<(() => void) | undefined>();
  onAuthSuccessRef.current = onAuthSuccess;

  useEffect(() => {
    // 在回调中使用 ref.current 获取最新值
    const handleAuthCallback = async (authData: any) => {
      if (onAuthSuccessRef.current) {
        onAuthSuccessRef.current();
        setOnAuthSuccess(undefined);
      }
    };
    
    // 状态变化监听也使用 ref
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && !user) {
        if (onAuthSuccessRef.current) {
          onAuthSuccessRef.current();
          setOnAuthSuccess(undefined);
        }
      }
    });
  }, []); // 不需要依赖 onAuthSuccess
};
```

### 2. **修复 App.tsx 中的回调逻辑**

**文件：** `src/renderer/App.tsx`

```typescript
// 修复前：逻辑错误
useEffect(() => {
  if (!openLoginDialog) {
    setOnAuthSuccess(() => () => {
      if (openLoginDialog) { // ❌ 永远不会为 true
        setOpenLoginDialog(false);
      }
    });
  }
}, [openLoginDialog]);

// 修复后：总是设置回调
useEffect(() => {
  setOnAuthSuccess(() => () => {
    console.log('Global auth success callback triggered, dialog open:', openLoginDialog);
    if (openLoginDialog) {
      console.log('Closing login dialog from global callback');
      setOpenLoginDialog(false);
    }
  });
}, [openLoginDialog, setOnAuthSuccess]);
```

## 🧪 测试验证

### 预期的控制台日志

#### 主进程（终端）
```
Handling deep link: snippai://auth/callback#access_token=...
Authentication callback received
Sending auth data to renderer: {...}
```

#### 渲染进程（浏览器控制台）
```
Received auth callback: {...}
Found tokens in hash: { accessToken: true, refreshToken: true }
Setting session with tokens
Successfully authenticated via magic link
Triggering auth success callback for deep link authentication  // ✅ 关键日志
Global auth success callback triggered, dialog open: true      // ✅ 关键日志
Closing login dialog from global callback                      // ✅ 关键日志
```

### 测试步骤

1. **打开登录对话框**
   ```bash
   # 点击登录按钮，确认对话框打开
   ```

2. **发送 Magic Link**
   ```bash
   # 输入邮箱，点击发送登录链接
   ```

3. **点击 Magic Link**
   ```bash
   # 在邮件中点击链接，或使用测试 URL：
   open "snippai://auth/callback#access_token=test&refresh_token=test"
   ```

4. **验证结果**
   - ✅ 应用获得焦点
   - ✅ 登录对话框自动关闭
   - ✅ 右上角显示用户菜单
   - ✅ 控制台显示正确的日志

## 🔍 技术要点

### useRef vs useState 依赖
- **useState 依赖**：会导致 useEffect 重新运行，重新注册事件监听器
- **useRef**：保持引用稳定，但能访问最新值
- **最佳实践**：在事件监听器中使用 ref 访问最新状态

### 闭包陷阱
```typescript
// ❌ 闭包陷阱：捕获的是旧值
useEffect(() => {
  const handler = () => {
    console.log(someState); // 可能是过期的值
  };
}, []); // 空依赖数组

// ✅ 使用 ref 避免闭包陷阱
const someStateRef = useRef();
someStateRef.current = someState;

useEffect(() => {
  const handler = () => {
    console.log(someStateRef.current); // 总是最新值
  };
}, []); // 空依赖数组，但能访问最新值
```

### 回调清理
- 每次触发后清理回调：`setOnAuthSuccess(undefined)`
- 避免重复触发和内存泄漏
- 确保回调只在需要时执行

## ✅ 修复效果

修复后的系统具有：
- **可靠的回调机制**：总是能获取最新的回调函数
- **正确的状态管理**：避免过期闭包问题
- **自动对话框关闭**：深度链接认证后自动关闭登录对话框
- **完整的日志记录**：便于调试和验证

## 🚀 后续优化

1. **错误处理**：添加回调执行失败的处理
2. **性能优化**：减少不必要的状态更新
3. **类型安全**：加强 TypeScript 类型检查
4. **测试覆盖**：添加自动化测试用例

这个修复确保了 Magic Link 认证流程的完整性和用户体验的流畅性！
