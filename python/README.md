# Vibesim 环路检测算法 - Python 实现

这是 Vibesim 控制系统模拟器中环路检测算法的 Python 实现。

## 文件说明

- `cycle_detector.py` - 环路检测算法的主要实现
- `test_cycle_detector.py` - 算法的单元测试
- `README.md` - 本文件，使用说明

## 算法概述

该算法专门用于检测控制系统框图中的反馈环路，基于双向遍历的方法，能够精确定位环路中的所有节点。

### 核心思想

1. **以求和块（sum）为中心**：控制系统的反馈通常通过求和块实现
2. **双向遍历**：通过前向和后向遍历确定环路组成
3. **精确定位**：不仅检测环路存在，还确定环路中的具体节点

### 算法步骤

1. 构建图数据结构（节点和边）
2. 遍历所有块，筛选出求和块
3. 对于每个求和块：
   - 构建前向和后向邻接表
   - 识别outgoing和incoming连接
   - 对每个outgoing连接进行前向遍历
   - 对每个incoming连接进行后向遍历
   - 计算两个可达集的交集，确定环路节点
4. 返回所有检测到的环路

## 使用方法

### 基本使用

```python
from cycle_detector import Block, Connection, CycleDetector

# 定义系统的块
blocks = [
    Block(id="sum1", type="sum", params={"signs": [1]}),
    Block(id="gain1", type="gain", params={"gain": 2.0}),
    Block(id="integrator1", type="integrator", params={}),
]

# 定义系统的连接
connections = [
    Connection(from_id="sum1", to_id="gain1"),
    Connection(from_id="gain1", to_id="integrator1"),
    Connection(from_id="integrator1", to_id="sum1"),
]

# 创建检测器并检测环路
detector = CycleDetector(blocks, connections)
loops = detector.detect_loops()

# 打印检测结果
detector.print_loops()
```

### 运行示例

```bash
# 运行主程序（包含示例）
python cycle_detector.py

# 运行测试
python test_cycle_detector.py
```

## 数据结构

### Block（块）

```python
@dataclass
class Block:
    id: str              # 块的唯一标识符
    type: str            # 块类型（如 "sum", "gain", "integrator"）
    params: dict          # 块参数（如增益值、反馈符号等）
```

### Connection（连接）

```python
@dataclass
class Connection:
    from_id: str         # 源块ID
    to_id: str           # 目标块ID
    from_index: int = 0   # 源端口索引
    to_index: int = 0     # 目标端口索引
```

### Loop（环路）

```python
@dataclass
class Loop:
    key: str              # 环路唯一标识
    sum_id: str           # 求和块ID
    out_conn: Connection   # 前向连接
    in_conn: Connection    # 反馈连接
    active_ids: Set[str]   # 环路中的节点集合
    feedback_sign: int     # 反馈符号（1为正反馈，-1为负反馈）
```

## 示例系统

### 1. 简单反馈系统

```
输入 -> [求和块] -> [增益块] -> [积分器] -> 输出
            ↑                    ↓
            └────────────────────┘
```

**代码示例**：

```python
blocks = [
    Block(id="sum1", type="sum", params={"signs": [1]}),
    Block(id="gain1", type="gain", params={"gain": 2.0}),
    Block(id="integrator1", type="integrator", params={}),
]

connections = [
    Connection(from_id="sum1", to_id="gain1"),
    Connection(from_id="gain1", to_id="integrator1"),
    Connection(from_id="integrator1", to_id="sum1"),
]
```

### 2. 多环路系统

```
输入 -> [求和块1] -> [控制器1] -> [对象1] -> 输出1
            ↑            ↓              ↓
            └────────────┘       [对象2] -> 输出2
                                 ↑
                                 └────────────┐
                                             ↓
                                        [求和块2] -> [控制器2]
```

**代码示例**：

```python
blocks = [
    Block(id="sum1", type="sum", params={"signs": [1]}),
    Block(id="sum2", type="sum", params={"signs": [1]}),
    Block(id="controller1", type="gain", params={"gain": 1.5}),
    Block(id="controller2", type="gain", params={"gain": 2.0}),
    Block(id="plant1", type="integrator", params={}),
    Block(id="plant2", type="gain", params={"gain": 0.5}),
]

connections = [
    Connection(from_id="sum1", to_id="controller1"),
    Connection(from_id="controller1", to_id="plant1"),
    Connection(from_id="plant1", to_id="sum1"),
    Connection(from_id="plant1", to_id="plant2"),
    Connection(from_id="plant2", to_id="sum2"),
    Connection(from_id="sum2", to_id="controller2"),
    Connection(from_id="controller2", to_id="sum2"),
]
```

### 3. 级联系统（无环路）

```
输入 -> [增益块1] -> [积分器] -> [增益块2] -> 输出
```

**代码示例**：

```python
blocks = [
    Block(id="gain1", type="gain", params={"gain": 2.0}),
    Block(id="integrator1", type="integrator", params={}),
    Block(id="gain2", type="gain", params={"gain": 1.5}),
]

connections = [
    Connection(from_id="gain1", to_id="integrator1"),
    Connection(from_id="integrator1", to_id="gain2"),
]
```

## 测试

### 运行所有测试

```bash
python test_cycle_detector.py
```

### 测试覆盖

测试文件包含以下测试用例：

1. **test_simple_feedback_loop** - 简单反馈环路
2. **test_negative_feedback_loop** - 负反馈环路
3. **test_no_loops** - 无环路系统
4. **test_multiple_loops** - 多环路系统
5. **test_complex_feedback** - 复杂反馈结构
6. **test_no_sum_blocks** - 无求和块的系统
7. **test_multiple_sum_blocks** - 多个求和块
8. **test_disconnected_components** - 不连通的组件
9. **test_parallel_feedback** - 并行反馈
10. **test_empty_system** - 空系统
11. **test_single_block** - 单个块
12. **test_loop_key_uniqueness** - 环路key的唯一性
13. **test_feedback_sign_detection** - 反馈符号检测

## 算法复杂度

### 时间复杂度

- **构建邻接表**：O(V + E)
- **遍历求和块**：O(V)
- **每个求和块的处理**：
  - 前向遍历：O(V + E)
  - 后向遍历：O(V + E)
  - 交集计算：O(V)
- **总复杂度**：O(n × (V + E))，其中n是求和块的数量

### 空间复杂度**

- **邻接表存储**：O(V + E)
- **可达集存储**：O(V)
- **环路存储**：O(n × V)
- **总复杂度**：O(V + E + n × V)

## 算法特点

### 优势

1. **精确定位环路**：不仅知道环路存在，还能确定环路中的具体节点
2. **支持多环路**：可以检测系统中的所有反馈环路
3. **保留环路信息**：记录了环路的输入输出连接和反馈符号
4. **控制系统导向**：专门针对控制系统的反馈结构设计
5. **高效性**：对于稀疏图，实际运行效率很高

### 局限性

1. **依赖求和块**：只能检测通过求和块形成的环路
2. **不处理代数环**：不检测不涉及求和块的代数环路
3. **假设有向图**：假设控制系统是有向图，不处理双向连接

## 与原算法的对应关系

Python实现与JavaScript原实现完全对应：

| JavaScript | Python | 说明 |
|-----------|---------|------|
| `listLoopCandidates()` | `detect_loops()` | 检测所有环路 |
| `traverse()` | `traverse()` | 深度优先遍历 |
| `forward/backward` Maps | `forward/backward` Dicts | 邻接表 |
| `activeIds` Set | `active_ids` Set | 环路节点集合 |
| `feedbackSign` | `feedback_sign` | 反馈符号 |

## 扩展和改进

### 可能的改进方向

1. **支持更多块类型**：扩展支持更多控制系统块类型
2. **代数环检测**：添加不涉及求和块的代数环检测
3. **环路可视化**：添加环路图形化显示功能
4. **性能优化**：对于大型系统进行性能优化
5. **环路分析**：添加环路稳定性分析功能

### 扩展示例

```python
# 自定义块类型
class CustomBlock(Block):
    def __init__(self, id: str, custom_param: float):
        super().__init__(id, "custom", {"value": custom_param})

# 自定义环路分析
class EnhancedCycleDetector(CycleDetector):
    def analyze_loop_stability(self, loop: Loop) -> bool:
        """分析环路稳定性"""
        # 实现稳定性分析逻辑
        pass
```

## 参考资料

- Vibesim 原始实现：`app.js` 中的 `listLoopCandidates()` 函数
- 控制系统理论：反馈环路、稳定性分析
- 图论算法：深度优先搜索、可达性分析

## 许可证

本实现遵循 Vibesim 项目的许可证。

## 贡献

欢迎提交问题和改进建议！
