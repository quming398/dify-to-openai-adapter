# Dify 文件字段名修复总结

## 🐛 发现的问题

在多模态功能测试中发现，当前实现在 Dify 文件格式中使用了错误的字段名：

```javascript
// 日志显示的错误格式
{
  "type": "image",
  "transfer_method": "local_file",
  "url": "9c5611d0-8ffc-4286-aa36-40c8748c04ac"  // ❌ 错误
}
```

根据 Dify 的 API 文档，`local_file` 类型应该使用 `upload_file_id` 字段，而不是 `url` 字段。

## ✅ 修复方案

### 1. 修复 processMultimodalImages 方法

**文件**: `src/services/difyClient.js`

**修复前**:
```javascript
files.push({
  type: "image",
  transfer_method: "local_file",
  url: fileId  // ❌ 错误字段名
});
```

**修复后**:
```javascript
files.push({
  type: "image",
  transfer_method: "local_file", 
  upload_file_id: fileId  // ✅ 正确字段名
});
```

### 2. 字段名规则说明

- **local_file**: 使用 `upload_file_id` 字段
- **remote_url**: 使用 `url` 字段

### 3. 正确的 Dify 请求格式

```json
{
  "inputs": {},
  "query": "提取图片内容",
  "response_mode": "streaming",
  "user": "app-xxxxx-dify-api-key",
  "files": [
    {
      "type": "image",
      "transfer_method": "local_file",
      "upload_file_id": "9c5611d0-8ffc-4286-aa36-40c8748c04ac"  // ✅ 正确
    }
  ]
}
```

## 🧪 验证测试

创建了 `test-field-fix.js` 测试文件来验证修复：

1. **Base64 图像测试**: 验证 `local_file` 使用 `upload_file_id`
2. **外部 URL 测试**: 验证 `remote_url` 使用 `url`
3. **端到端测试**: 确保整个多模态流程正常工作

## 📊 影响范围

- ✅ Base64 图像上传处理
- ✅ 多模态消息转换
- ✅ Dify API 调用格式
- ✅ 文件传输方法区分

## 🎯 预期效果

修复后，多模态请求应该能够正确地：

1. 上传 base64 图像到 Dify
2. 使用正确的字段名发送文件信息
3. 获得 Dify 的正确响应
4. 完成图像分析任务

---

**修复日期**: 2025年1月2日  
**修复类型**: 字段名称错误  
**优先级**: 高 (影响多模态功能核心工作)  
**状态**: 已完成 ✅
