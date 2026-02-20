"""
环路检测算法的测试用例

包含各种场景的测试，验证算法的正确性和鲁棒性
"""

import unittest
from cycle_detector import (
    Block,
    Connection,
    CycleDetector,
    Loop,
)


class TestCycleDetector(unittest.TestCase):
    """环路检测器的测试用例"""

    def test_simple_feedback_loop(self):
        """测试简单反馈环路"""
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

        detector = CycleDetector(blocks, connections)
        loops = detector.detect_loops()

        self.assertEqual(len(loops), 1)
        self.assertEqual(loops[0].sum_id, "sum1")
        self.assertEqual(len(loops[0].active_ids), 2)
        self.assertIn("gain1", loops[0].active_ids)
        self.assertIn("integrator1", loops[0].active_ids)

    def test_negative_feedback_loop(self):
        """测试负反馈环路"""
        blocks = [
            Block(id="sum1", type="sum", params={"signs": [-1]}),
            Block(id="gain1", type="gain", params={"gain": 2.0}),
            Block(id="integrator1", type="integrator", params={}),
        ]

        connections = [
            Connection(from_id="sum1", to_id="gain1"),
            Connection(from_id="gain1", to_id="integrator1"),
            Connection(from_id="integrator1", to_id="sum1"),
        ]

        detector = CycleDetector(blocks, connections)
        loops = detector.detect_loops()

        self.assertEqual(len(loops), 1)
        self.assertEqual(loops[0].feedback_sign, -1)

    def test_no_loops(self):
        """测试无环路系统"""
        blocks = [
            Block(id="gain1", type="gain", params={"gain": 2.0}),
            Block(id="integrator1", type="integrator", params={}),
            Block(id="gain2", type="gain", params={"gain": 1.5}),
        ]

        connections = [
            Connection(from_id="gain1", to_id="integrator1"),
            Connection(from_id="integrator1", to_id="gain2"),
        ]

        detector = CycleDetector(blocks, connections)
        loops = detector.detect_loops()

        self.assertEqual(len(loops), 0)

    def test_multiple_loops(self):
        """测试多环路系统"""
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

        detector = CycleDetector(blocks, connections)
        loops = detector.detect_loops()

        self.assertEqual(len(loops), 2)

    def test_complex_feedback(self):
        """测试复杂反馈结构"""
        blocks = [
            Block(id="sum1", type="sum", params={"signs": [1, 1]}),
            Block(id="sum2", type="sum", params={"signs": [1]}),
            Block(id="controller", type="gain", params={"gain": 1.0}),
            Block(id="plant", type="integrator", params={}),
            Block(id="sensor", type="gain", params={"gain": 1.0}),
        ]

        connections = [
            Connection(from_id="sum1", to_id="controller"),
            Connection(from_id="controller", to_id="plant"),
            Connection(from_id="plant", to_id="sum1", to_index=0),
            Connection(from_id="plant", to_id="sensor"),
            Connection(from_id="sensor", to_id="sum1", to_index=1),
        ]

        detector = CycleDetector(blocks, connections)
        loops = detector.detect_loops()

        # 应该检测到两个环路（主反馈和传感器反馈）
        self.assertEqual(len(loops), 2)

    def test_no_sum_blocks(self):
        """测试无求和块的系统"""
        blocks = [
            Block(id="gain1", type="gain", params={"gain": 2.0}),
            Block(id="gain2", type="gain", params={"gain": 1.5}),
        ]

        connections = [
            Connection(from_id="gain1", to_id="gain2"),
        ]

        detector = CycleDetector(blocks, connections)
        loops = detector.detect_loops()

        self.assertEqual(len(loops), 0)

    def test_multiple_sum_blocks(self):
        """测试多个求和块"""
        blocks = [
            Block(id="sum1", type="sum", params={"signs": [1]}),
            Block(id="sum2", type="sum", params={"signs": [1]}),
            Block(id="gain1", type="gain", params={"gain": 1.0}),
            Block(id="gain2", type="gain", params={"gain": 1.0}),
        ]

        connections = [
            Connection(from_id="sum1", to_id="gain1"),
            Connection(from_id="gain1", to_id="sum2"),
            Connection(from_id="sum2", to_id="gain2"),
            Connection(from_id="gain2", to_id="sum1"),
        ]

        detector = CycleDetector(blocks, connections)
        loops = detector.detect_loops()

        # 应该检测到两个环路，每个求和块一个
        self.assertEqual(len(loops), 2)
        # 检查是否包含两个求和块的环路
        sum_ids_in_loops = [loop.sum_id for loop in loops]
        self.assertIn("sum1", sum_ids_in_loops)
        self.assertIn("sum2", sum_ids_in_loops)

    def test_disconnected_components(self):
        """测试不连通的组件"""
        blocks = [
            Block(id="sum1", type="sum", params={"signs": [1]}),
            Block(id="gain1", type="gain", params={"gain": 1.0}),
            Block(id="sum2", type="sum", params={"signs": [1]}),
            Block(id="gain2", type="gain", params={"gain": 1.0}),
        ]

        connections = [
            Connection(from_id="sum1", to_id="gain1"),
            Connection(from_id="gain1", to_id="sum1"),
            Connection(from_id="sum2", to_id="gain2"),
            Connection(from_id="gain2", to_id="sum2"),
        ]

        detector = CycleDetector(blocks, connections)
        loops = detector.detect_loops()

        # 应该检测到两个独立的环路
        self.assertEqual(len(loops), 2)

    def test_parallel_feedback(self):
        """测试并行反馈"""
        blocks = [
            Block(id="sum1", type="sum", params={"signs": [1, 1]}),
            Block(id="controller", type="gain", params={"gain": 1.0}),
            Block(id="plant", type="integrator", params={}),
            Block(id="feedback1", type="gain", params={"gain": 0.5}),
            Block(id="feedback2", type="gain", params={"gain": 0.3}),
        ]

        connections = [
            Connection(from_id="sum1", to_id="controller"),
            Connection(from_id="controller", to_id="plant"),
            Connection(from_id="plant", to_id="feedback1"),
            Connection(from_id="feedback1", to_id="sum1", to_index=0),
            Connection(from_id="plant", to_id="feedback2"),
            Connection(from_id="feedback2", to_id="sum1", to_index=1),
        ]

        detector = CycleDetector(blocks, connections)
        loops = detector.detect_loops()

        # 应该检测到两个并行反馈环路
        self.assertEqual(len(loops), 2)

    def test_empty_system(self):
        """测试空系统"""
        blocks = []
        connections = []

        detector = CycleDetector(blocks, connections)
        loops = detector.detect_loops()

        self.assertEqual(len(loops), 0)

    def test_single_block(self):
        """测试单个块"""
        blocks = [
            Block(id="gain1", type="gain", params={"gain": 1.0}),
        ]

        connections = []

        detector = CycleDetector(blocks, connections)
        loops = detector.detect_loops()

        self.assertEqual(len(loops), 0)

    def test_loop_key_uniqueness(self):
        """测试环路key的唯一性"""
        blocks = [
            Block(id="sum1", type="sum", params={"signs": [1, 1]}),
            Block(id="gain1", type="gain", params={"gain": 1.0}),
            Block(id="gain2", type="gain", params={"gain": 1.0}),
        ]

        connections = [
            Connection(from_id="sum1", to_id="gain1", from_index=0),
            Connection(from_id="sum1", to_id="gain2", from_index=1),
            Connection(from_id="gain1", to_id="sum1"),
            Connection(from_id="gain2", to_id="sum1"),
        ]

        detector = CycleDetector(blocks, connections)
        loops = detector.detect_loops()

        # 检查每个环路的key是否唯一
        keys = [loop.key for loop in loops]
        self.assertEqual(len(keys), len(set(keys)))

    def test_feedback_sign_detection(self):
        """测试反馈符号检测"""
        blocks = [
            Block(id="sum1", type="sum", params={"signs": [1, -1, 1]}),
            Block(id="gain1", type="gain", params={"gain": 1.0}),
            Block(id="gain2", type="gain", params={"gain": 1.0}),
            Block(id="gain3", type="gain", params={"gain": 1.0}),
        ]

        connections = [
            Connection(from_id="sum1", to_id="gain1", from_index=0),
            Connection(from_id="sum1", to_id="gain2", from_index=1),
            Connection(from_id="sum1", to_id="gain3", from_index=2),
            Connection(from_id="gain1", to_id="sum1", to_index=0),
            Connection(from_id="gain2", to_id="sum1", to_index=1),
            Connection(from_id="gain3", to_id="sum1", to_index=2),
        ]

        detector = CycleDetector(blocks, connections)
        loops = detector.detect_loops()

        # 检查反馈符号是否正确
        feedback_signs = [loop.feedback_sign for loop in loops]
        self.assertIn(1, feedback_signs)
        self.assertIn(-1, feedback_signs)


def run_tests():
    """运行所有测试"""
    unittest.main(argv=[''], verbosity=2, exit=False)


if __name__ == "__main__":
    run_tests()
