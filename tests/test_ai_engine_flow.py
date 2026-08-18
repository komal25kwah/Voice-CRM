import unittest
from unittest.mock import patch

from Backend import ai_engine


class AiEngineFlowTest(unittest.TestCase):
    def test_extract_crm_data_reports_missing_required_fields(self):
        record = {
            "Created_By": "Rabia",
            "Company": "ABC",
            "NameDesignationofPersonMet": None,
            "Item_Type": None,
            "DateofVisit": None,
        }

        with patch.object(ai_engine, "_extract_crm_json", return_value=record):
            result = ai_engine.extract_crm_data("A short transcript", employee_name="Rabia")

        self.assertEqual(result["status"], "missing_fields")
        self.assertEqual(result["missing_required_fields"], ["Doctor / Person Name", "Medicine / Item Name", "Date of Visit"])


if __name__ == "__main__":
    unittest.main()
