"""
Vibesim 环路检测算法的 Python 实现

该算法专门用于检测控制系统框图中的反馈环路，
基于双向遍历的方法，能够精确定位环路中的所有节点。
"""

from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass


@dataclass
class Block:
    """控制系统的块"""
    id: str
    type: str
    params: dict = None

    def __post_init__(self):
        if self.params is None:
            self.params = {}


@dataclass
class Connection:
    """控制系统的连接"""
    from_id: str
    to_id: str
    from_index: int = 0
    to_index: int = 0


@dataclass
class Loop:
    """检测到的环路"""
    key: str
    sum_id: str
    out_conn: Connection
    in_conn: Connection
    active_ids: Set[str]
    feedback_sign: int


class CycleDetector:
    """环路检测器"""

    def __init__(self, blocks: List[Block], connections: List[Connection]):
        """
        初始化环路检测器

        Args:
            blocks: 控制系统的块列表
            connections: 控制系统的连接列表
        """
        self.blocks = blocks
        self.connections = connections
        self.loops: List[Loop] = []

    def traverse(self, start_id: str, adj: Dict[str, List[str]], sum_id: str) -> Set[str]:
        """
        深度优先遍历图

        Args:
            start_id: 起始节点ID
            adj: 邻接表
            sum_id: 求和块ID（跳过该节点）

        Returns:
            从起始节点可达的所有节点集合
        """
        visited = set()
        stack = [start_id]

        while stack:
            node_id = stack.pop()
            if node_id in visited:
                continue
            visited.add(node_id)

            # 遍历邻接节点
            for neighbor in adj.get(node_id, []):
                if neighbor == sum_id:
                    continue
                stack.append(neighbor)

        return visited

    def detect_loops(self) -> List[Loop]:
        """
        检测系统中的所有反馈环路

        Returns:
            检测到的环路列表
        """
        self.loops = []

        # 遍历所有块，只处理求和块
        for block in self.blocks:
            if block.type != "sum":
                continue

            self._process_sum_block(block)

        return self.loops

    def _process_sum_block(self, sum_block: Block) -> None:
        """
        处理单个求和块，检测相关的环路

        Args:
            sum_block: 求和块
        """
        sum_id = sum_block.id
        signs = sum_block.params.get("signs", [])

        # 构建邻接表
        forward, backward = self._build_adjacency_tables(sum_id)

        # 获取outgoing和incoming连接
        outgoing = [conn for conn in self.connections if conn.from_id == sum_id]
        incoming = [conn for conn in self.connections if conn.to_id == sum_id]

        if not outgoing or not incoming:
            return

        # 检测所有可能的环路
        for out_conn in outgoing:
            self._detect_loops_for_outgoing(
                out_conn, incoming, forward, backward, sum_id, signs
            )

    def _build_adjacency_tables(self, sum_id: str) -> Tuple[Dict[str, List[str]], Dict[str, List[str]]]:
        """
        构建前向和后向邻接表

        Args:
            sum_id: 求和块ID（排除该节点）

        Returns:
            (forward, backward) 前向和后向邻接表
        """
        forward = {block.id: [] for block in self.blocks}
        backward = {block.id: [] for block in self.blocks}

        for conn in self.connections:
            # 排除求和块本身
            if conn.from_id == sum_id or conn.to_id == sum_id:
                continue

            # 检查节点是否存在
            if conn.from_id not in forward or conn.to_id not in forward:
                continue

            forward[conn.from_id].append(conn.to_id)
            backward[conn.to_id].append(conn.from_id)

        return forward, backward

    def _detect_loops_for_outgoing(
        self,
        out_conn: Connection,
        incoming: List[Connection],
        forward: Dict[str, List[str]],
        backward: Dict[str, List[str]],
        sum_id: str,
        signs: List[int],
    ) -> None:
        """
        为特定的outgoing连接检测所有环路

        Args:
            out_conn: outgoing连接
            incoming: 所有incoming连接列表
            forward: 前向邻接表
            backward: 后向邻接表
            sum_id: 求和块ID
            signs: 反馈符号列表
        """
        # 前向遍历：从outgoing目标开始
        forward_reach = self.traverse(out_conn.to_id, forward, sum_id)

        # 检查每个incoming连接
        for in_conn in incoming:
            # 检查incoming源是否在前向可达集中
            if in_conn.from_id not in forward_reach:
                continue

            # 后向遍历：从incoming源开始
            backward_reach = self.traverse(in_conn.from_id, backward, sum_id)

            # 计算交集：环路中的节点
            active_ids = set(forward_reach) & set(backward_reach)

            # 添加环路端点
            active_ids.add(out_conn.to_id)
            active_ids.add(in_conn.from_id)

            # 移除求和块
            active_ids.discard(sum_id)

            # 记录反馈符号
            feedback_sign = signs[in_conn.to_index] if in_conn.to_index < len(signs) else 1
            feedback_sign = feedback_sign if feedback_sign != 0 else 1

            # 创建环路对象
            key = f"{sum_id}:{out_conn.to_id}:{out_conn.from_index}->{in_conn.from_id}:{in_conn.to_index}"
            loop = Loop(
                key=key,
                sum_id=sum_id,
                out_conn=out_conn,
                in_conn=in_conn,
                active_ids=active_ids,
                feedback_sign=feedback_sign,
            )

            self.loops.append(loop)

    def print_loops(self) -> None:
        """打印检测到的所有环路"""
        if not self.loops:
            print("未检测到环路")
            return

        print(f"检测到 {len(self.loops)} 个环路:")
        print("=" * 60)

        for i, loop in enumerate(self.loops, 1):
            print(f"\n环路 {i}:")
            print(f"  Key: {loop.key}")
            print(f"  求和块: {loop.sum_id}")
            print(f"  前向连接: {loop.out_conn.from_id} -> {loop.out_conn.to_id}")
            print(f"  反馈连接: {loop.in_conn.from_id} -> {loop.in_conn.to_id}")
            print(f"  反馈符号: {'正反馈' if loop.feedback_sign == 1 else '负反馈'}")
            print(f"  环路节点: {sorted(loop.active_ids)}")
            print(f"  节点数量: {len(loop.active_ids)}")


def create_simple_feedback_system() -> Tuple[List[Block], List[Connection]]:
    """
    创建一个简单的反馈系统示例

    系统结构：
    输入 -> [求和块] -> [增益块] -> [积分器] -> 输出
              ^                              |
              |                              v
              -------------------------------
    """
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

    return blocks, connections


def create_multi_loop_system() -> Tuple[List[Block], List[Connection]]:
    """
    创建一个多环路系统示例

    系统结构：
    输入 -> [求和块1] -> [控制器1] -> [对象1] -> 输出1
              ^             |              |
              |             v              v
              --------[对象2]--------[求和块2] -> [控制器2]
    """
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

    return blocks, connections


def create_cascade_system() -> Tuple[List[Block], List[Connection]]:
    """
    创建一个级联系统示例（无环路）

    系统结构：
    输入 -> [增益块1] -> [积分器] -> [增益块2] -> 输出
    """
    blocks = [
        Block(id="gain1", type="gain", params={"gain": 2.0}),
        Block(id="integrator1", type="integrator", params={}),
        Block(id="gain2", type="gain", params={"gain": 1.5}),
    ]

    connections = [
        Connection(from_id="gain1", to_id="integrator1"),
        Connection(from_id="integrator1", to_id="gain2"),
    ]

    return blocks, connections


def main():
    """主函数：运行环路检测示例"""
    print("=" * 60)
    print("Vibesim 环路检测算法 - Python 实现")
    print("=" * 60)

    # 示例1：简单反馈系统
    print("\n\n示例1：简单反馈系统")
    print("-" * 60)
    blocks, connections = create_simple_feedback_system()
    detector = CycleDetector(blocks, connections)
    loops = detector.detect_loops()
    detector.print_loops()

    # 示例2：多环路系统
    print("\n\n示例2：多环路系统")
    print("-" * 60)
    blocks, connections = create_multi_loop_system()
    detector = CycleDetector(blocks, connections)
    loops = detector.detect_loops()
    detector.print_loops()

    # 示例3：级联系统（无环路）
    print("\n\n示例3：级联系统（无环路）")
    print("-" * 60)
    blocks, connections = create_cascade_system()
    detector = CycleDetector(blocks, connections)
    loops = detector.detect_loops()
    detector.print_loops()

    print("\n" + "=" * 60)
    print("环路检测完成")
    print("=" * 60)


if __name__ == "__main__":
    main()
