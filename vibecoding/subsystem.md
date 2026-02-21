# Subsystem 功能总结

## 概述
Subsystem（子系统）是 Vibesim 中用于封装和复用模块化控制系统的功能。它允许用户将一组相关的模块和连接组合成一个可重用的单元，并定义外部接口（输入和输出端口）。

## 核心概念

### 1. Subsystem 块
- **类型**: `subsystem`
- **用途**: 表示一个封装的子系统模块
- **参数**:
  - `name`: 子系统名称
  - `externalInputs`: 外部输入端口列表
  - `externalOutputs`: 外部输出端口列表
  - `subsystem`: 子系统内部结构（包含 blocks、connections 等）

### 2. 外部端口
外部端口定义了子系统与父级系统之间的接口：

#### 输入端口
- **块类型**: `labelSource`
- **参数**:
  - `name`: 端口名称
  - `isExternalPort`: 必须设置为 `true`

#### 输出端口
- **块类型**: `labelSink`
- **参数**:
  - `name`: 端口名称
  - `isExternalPort`: 必须设置为 `true`

## Subsystem 创建方式

### 方式一：从库中添加
1. 从模块库中拖拽 `Subsystem` 块到画布
2. 双击 Subsystem 块进入子系统编辑器
3. 在子系统编辑器中添加内部模块和连接
4. 使用 `labelSource` 块定义输入端口
5. 使用 `labelSink` 块定义输出端口
6. 在属性面板中勾选 "Is external port" 标记为外部端口
7. 点击 "↑" 按钮返回父级系统

### 方式二：从 YAML 文件加载
1. 点击 "Load subsystem" 按钮
2. 选择 YAML 格式的子系统文件
3. 子系统会自动添加到模块库中
4. 可以从库中拖拽使用

### 方式三：保存当前仿真为 Subsystem
1. 创建包含外部端口的仿真（使用 `labelSource` 和 `labelSink`）
2. 在属性面板中勾选 "Is external port" 标记为外部端口
3. 点击菜单 **File > Save as Subsystem...**
4. 在弹出的对话框中输入模型名称
5. 点击 **Save** 或按回车键
6. 在系统保存对话框中选择保存位置
7. 文件会保存为 `.mos` 扩展名（如 `MySubsystem.mos`）

## Subsystem 文件管理

### 文件扩展名
- **子系统文件**: `.mos`（Model Subsystem）
- **普通仿真文件**: `.yaml` 或 `.yml`

### 加载 Subsystem
- **位置**: `state.loadedSubsystems`
- **类型**: `Map<string, SubsystemSpec>`
- **键**: 子系统文件名（小写，无扩展名）
- **值**: 子系统规范对象

### 重复加载处理
- 如果加载同名子系统，会自动添加后缀（如 `_2`, `_3`）
- 使用 `sanitizeFilename` 函数清理文件名
- 确保每个加载的子系统有唯一标识
- **Load Subsystem** 对话框只接受 `.mos` 文件

### 库渲染
- 加载的子系统会自动添加到模块库
- 显示在 "Subsystems" 分类下
- 可以像普通模块一样拖拽使用

## Save as Subsystem 功能

### 功能描述
允许用户将当前仿真保存为一个可重用的子系统文件，该文件可以被其他仿真加载和使用。

### 实现细节

#### 1. 验证外部端口
```javascript
const blocks = Array.from(state.blocks.values());
const externalInputs = collectExternalPorts(blocks, "labelSource");
const externalOutputs = collectExternalPorts(blocks, "labelSink");

if (!externalInputs.length && !externalOutputs.length) {
  statusEl.textContent = "Cannot save as subsystem: No external ports found. Add labelSource (input) or labelSink (output) blocks and mark them as 'Is external port'.";
  return;
}
```

#### 2. 模型名称输入
- 使用自定义对话框获取模型名称（避免使用 `prompt()`，因为 Electron 不支持）
- 默认使用当前图表名称
- 支持按回车键快速确认
- 点击对话框外部区域可以关闭

#### 3. 文件保存
- 在 Electron 环境下，使用 `window.electron.saveSubsystemAs()` 调用系统保存对话框
- 在浏览器环境下，使用 Blob 和下载方式保存
- 文件名格式：`{模型名称}.mos`
- 保存对话框的文件过滤器设置为只显示 `.mos` 文件

#### 4. 数据序列化
```javascript
const diagramData = serializeDiagram(state);
diagramData.name = modelName;
const yaml = toYAML(diagramData);
```

### Electron IPC 通信

#### 主进程 (main.js)
```javascript
ipcMain.handle('save-subsystem-as', async (event, { content, defaultName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [
      { name: 'Subsystem Files', extensions: ['mos'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, filePath: result.filePath };
  }
  
  return { success: false, canceled: true };
});
```

#### 预加载脚本 (preload.js)
```javascript
contextBridge.exposeInMainWorld('electron', {
  saveSubsystemAs: (content, defaultName) => 
    ipcRenderer.invoke('save-subsystem-as', { content, defaultName }),
  // ...
});
```

### UI 组件

#### 自定义对话框 (index.html)
```html
<div class="modal" id="subsystemNameModal">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Save as Subsystem</h3>
      <button class="modal-close" id="closeSubsystemNameModal">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label for="subsystemNameInput">Model Name</label>
        <input id="subsystemNameInput" type="text" class="input" placeholder="My Subsystem">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="cancelSubsystemName">Cancel</button>
      <button class="btn btn-primary" id="confirmSubsystemName">Save</button>
    </div>
  </div>
</div>
```

### 事件处理

#### 对话框控制
- 点击 X 按钮关闭对话框
- 点击 Cancel 按钮关闭对话框
- 点击 Save 按钮确认保存
- 按回车键确认保存
- 点击对话框外部区域关闭对话框

## Subsystem 库管理

### 加载 Subsystem

### 完整示例
```yaml
version: 1
name: PID_Controller
blocks:
  - id: b1
    type: gain
    x: 200
    y: 200
    rotation: 0
    params:
      gain: 2
  - id: b2
    type: integrator
    x: 350
    y: 200
    rotation: 0
    params:
      initial: 0
      min: -inf
      max: inf
  - id: b3
    type: gain
    x: 500
    y: 200
    rotation: 0
    params:
      gain: 0.5
  - id: b4
    type: labelSource
    x: 100
    y: 200
    rotation: 0
    params:
      name: error
      isExternalPort: true
  - id: b5
    type: labelSink
    x: 650
    y: 200
    rotation: 0
    params:
      name: control
      isExternalPort: true
connections:
  - from: b4
    to: b1
    fromIndex: 0
    toIndex: 0
  - from: b1
    to: b2
    fromIndex: 0
    toIndex: 0
  - from: b2
    to: b3
    fromIndex: 0
    toIndex: 0
  - from: b3
    to: b5
    fromIndex: 0
    toIndex: 0
externalInputs:
  - id: b4
    name: error
externalOutputs:
  - id: b5
    name: control
```

### 字段说明
- `version`: YAML 文件版本（当前为 1）
- `name`: 子系统名称
- `blocks`: 内部模块列表
  - `id`: 模块唯一标识符
  - `type`: 模块类型
  - `x`, `y`: 模块位置
  - `rotation`: 旋转角度
  - `params`: 模块参数
- `connections`: 内部连接列表
  - `from`: 源模块 ID
  - `to`: 目标模块 ID
  - `fromIndex`: 源端口索引
  - `toIndex`: 目标端口索引
  - `points`: 连线路径点（可选）
- `externalInputs`: 外部输入端口定义
- `externalOutputs`: 外部输出端口定义

## Subsystem 在仿真中的使用

### 1. Subsystem 初始化
- 在仿真初始化阶段，子系统会被展开为内部模块
- 外部端口会与父级系统的连接进行映射
- 内部模块的状态会被独立管理

### 2. Subsystem 执行
- 每个仿真时间步，子系统内部模块按顺序执行
- 外部输入值从父级系统传递到子系统的 `labelSource` 块
- 子系统的输出值从 `labelSink` 块传递到父级系统

### 3. 代数环处理
- 支持子系统内部的代数环
- 使用迭代求解器处理代数约束
- 最大迭代次数为 100 次

### 4. 多输出支持
- 支持子系统有多个输出端口
- 输出端口按垂直位置排序
- 支持不同数量的输入和输出端口

## Subsystem 导航

### 进入子系统
- **方式**: 双击 Subsystem 块
- **效果**:
  - 当前系统状态被保存到堆栈
  - 进入子系统编辑器
  - 可以编辑子系统内部结构

### 返回父级系统
- **方式**: 点击 "↑" 按钮
- **效果**:
  - 子系统更改被保存到父级 Subsystem 块
  - 返回父级系统编辑器
  - 外部端口顺序被保持

### 堆栈管理
- 支持多层嵌套子系统
- 使用 `state.subsystemStack` 维护导航历史
- 可以在任意层级返回到父级

## Subsystem 代码生成

### C 代码生成
- 子系统在代码生成时被展开
- 内部模块被转换为 C 函数调用
- 外部端口映射为函数参数

### Python 代码生成
- 子系统在代码生成时被展开
- 内部模块被转换为 Python 函数调用
- 外部端口映射为函数参数

### 展开过程
1. 递归查找所有 Subsystem 块
2. 为每个 Subsystem 块创建内部模块的副本
3. 重命名内部模块 ID 以避免冲突
4. 重新连接外部端口到父级系统
5. 重复直到没有 Subsystem 块

## Subsystem YAML 格式

### 示例 1: PID 控制器
```yaml
name: PID_Controller
blocks:
  - id: b1
    type: gain
    params:
      gain: 2
  - id: b2
    type: integrator
    params:
      initial: 0
  - id: b3
    type: gain
    params:
      gain: 0.5
  - id: b4
    type: labelSource
    params:
      name: error
      isExternalPort: true
  - id: b5
    type: labelSink
    params:
      name: control
      isExternalPort: true
externalInputs:
  - id: b4
    name: error
externalOutputs:
  - id: b5
    name: control
```

### 示例 2: 振动梁（复杂子系统）
- 位置: `examples/beam.yaml`
- 特点:
  - 多输入（4 个）
  - 多输出（3 个）
  - 复杂的内部结构（多个积分器、增益器）
  - 代数环

## Subsystem 属性编辑

### Subsystem 块属性
- **Name**: 子系统名称
- **External Inputs**: 外部输入端口列表（只读）
- **External Outputs**: 外部输出端口列表（只读）

### 内部模块属性
- 可以正常编辑子系统内部模块的参数
- 外部端口的 `isExternalPort` 属性控制接口定义
- 更改外部端口会自动更新 Subsystem 块的接口

## Subsystem 相关文件

### 核心文件
- `app.js`: Subsystem 导航、加载、保存逻辑
- `main.js`: Electron 主进程，包含文件保存对话框处理
- `preload.js`: Electron 预加载脚本，暴露 IPC API
- `blocks/utility.js`: Subsystem 块定义和渲染
- `blocks/sim/utility.js`: Subsystem 仿真逻辑
- `utils/subsystem-ports.js`: 外部端口管理
- `codegen/index.js`: Subsystem 代码生成

### 测试文件
- `tests/sim-subsystem.test.mjs`: 基本仿真测试
- `tests/sim-subsystem-multiout.test.mjs`: 多输出测试
- `tests/subsystem-external-label-resolution.test.mjs`: 外部标签解析测试
- `tests/subsystem-label-layout.test.mjs`: 标签布局测试
- `tests/subsystem-port-order.test.mjs`: 端口顺序测试
- `tests/codegen-subsystem.test.mjs`: 代码生成测试

### 示例文件
- `examples/beam.yaml`: 振动梁子系统示例

## Subsystem 限制和注意事项

### 限制
1. 外部端口必须使用 `labelSource`（输入）和 `labelSink`（输出）
2. 必须至少有一个外部端口
3. 子系统名称不能包含特殊字符
4. 内部模块 ID 必须唯一

### 注意事项
1. 编辑子系统后，返回父级系统会自动保存更改
2. 外部端口顺序会影响 Subsystem 块的端口布局
3. 从文件加载的子系统会自动添加到库中
4. 重复加载同名子系统会自动重命名
5. 子系统内部可以包含其他子系统（嵌套）

## Subsystem API 参考

### buildSubsystemSpec(data, fallbackName)
构建子系统规范对象。

**参数**:
- `data`: YAML 解析后的数据对象
- `fallbackName`: 默认子系统名称

**返回值**: 子系统规范对象

**抛出**: 如果没有外部端口或没有模块，抛出错误

### collectExternalPorts(blocks, type)
收集指定类型的外部端口。

**参数**:
- `blocks`: 模块数组
- `type`: 端口类型（`labelSource` 或 `labelSink`）

**返回值**: 外部端口数组，按位置排序

### stabilizeExternalPortOrder(nextPorts, previousPorts)
稳定外部端口顺序，保持用户期望的顺序。

**参数**:
- `nextPorts`: 新的端口列表
- `previousPorts`: 之前的端口列表

**返回值**: 稳定后的端口列表

### externalPortsChanged(previousPorts, nextPorts)
检查外部端口是否发生变化。

**参数**:
- `previousPorts`: 之前的端口列表
- `nextPorts`: 新的端口列表

**返回值**: `true` 如果端口发生变化，否则 `false`

### handleSaveAsSubsystem()
处理"Save as Subsystem"菜单操作。

**功能**:
1. 验证当前仿真是否包含外部端口
2. 显示自定义对话框让用户输入模型名称
3. 调用系统保存对话框保存为 `.mos` 文件

**验证规则**:
- 必须至少有一个外部端口（`labelSource` 或 `labelSink`）
- 模型名称不能为空

### confirmSubsystemName()
确认保存子系统。

**功能**:
1. 获取用户输入的模型名称
2. 验证模型名称不为空
3. 序列化当前图表数据
4. 调用保存函数保存为 `.mos` 文件
5. 关闭对话框

### closeSubsystemNameModal()
关闭子系统名称输入对话框。

**功能**:
- 隐藏自定义对话框
- 不执行保存操作

## 总结

Subsystem 是 Vibesim 中强大的模块化工具，它允许用户：
- 封装复杂的控制逻辑
- 定义清晰的接口
- 复用已验证的模块
- 简化大型系统设计
- 支持嵌套和层次化设计
- 将当前仿真保存为可重用的子系统文件
- 通过 `.mos` 文件扩展名区分子系统和普通仿真文件

通过合理使用 Subsystem，可以显著提高控制系统的可维护性和可重用性。
