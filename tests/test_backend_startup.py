import importlib
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


class BackendStartupTest(unittest.TestCase):
    def test_main_module_imports_without_env_vars(self):
        for name in ["Backend.main", "main", "Backend.ai_engine", "ai_engine"]:
            sys.modules.pop(name, None)

        module = importlib.import_module("Backend.main")

        self.assertTrue(hasattr(module, "app"))


if __name__ == "__main__":
    unittest.main()
