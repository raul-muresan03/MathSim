import json
import pytest
from unittest.mock import patch, Mock

from services import simulation as sim_module


class TestGradeSession:
    def test_grade_all_correct(self, db):
        selected = [{
            "chapter": "algebra",
            "filename": "test.png",
            "ids": ["1", "2"],
            "answers": {"1": "A", "2": "B"},
            "has_all_answers": True,
        }]
        db.add(sim_module.SessionData(session_id="sim_test", data_json=json.dumps(selected)))
        db.commit()

        answers = [
            Mock(grid_id="1", answer="A"),
            Mock(grid_id="2", answer="B"),
        ]
        result = sim_module.grade_session(db, "sim_test", answers)
        assert result["score"] == 10.0
        assert result["correct"] == 2
        assert result["total"] == 2

    def test_grade_all_wrong(self, db):
        selected = [{
            "chapter": "algebra",
            "filename": "test.png",
            "ids": ["1"],
            "answers": {"1": "A"},
            "has_all_answers": True,
        }]
        db.add(sim_module.SessionData(session_id="sim_wrong", data_json=json.dumps(selected)))
        db.commit()

        answers = [Mock(grid_id="1", answer="B")]
        result = sim_module.grade_session(db, "sim_wrong", answers)
        assert result["score"] == 0.0
        assert result["correct"] == 0

    def test_grade_case_insensitive(self, db):
        selected = [{
            "chapter": "algebra",
            "filename": "test.png",
            "ids": ["1"],
            "answers": {"1": "A"},
            "has_all_answers": True,
        }]
        db.add(sim_module.SessionData(session_id="sim_case", data_json=json.dumps(selected)))
        db.commit()

        answers = [Mock(grid_id="1", answer="a")]
        result = sim_module.grade_session(db, "sim_case", answers)
        assert result["score"] == 10.0

    def test_grade_missing_expected_answer(self, db):
        selected = [{
            "chapter": "algebra",
            "filename": "test.png",
            "ids": ["1"],
            "answers": {"1": None},
            "has_all_answers": False,
        }]
        db.add(sim_module.SessionData(session_id="sim_miss", data_json=json.dumps(selected)))
        db.commit()

        answers = [Mock(grid_id="1", answer="A")]
        result = sim_module.grade_session(db, "sim_miss", answers)
        assert result["correct"] == 0

    def test_grade_nonexistent_session(self, db):
        with pytest.raises(KeyError):
            sim_module.grade_session(db, "nonexistent", [])

    def test_grade_deletes_session_after(self, db):
        selected = [{"chapter": "algebra", "filename": "t.png", "ids": ["1"], "answers": {"1": "A"}, "has_all_answers": True}]
        db.add(sim_module.SessionData(session_id="sim_del", data_json=json.dumps(selected)))
        db.commit()

        sim_module.grade_session(db, "sim_del", [Mock(grid_id="1", answer="A")])
        exists = db.query(sim_module.SessionData).filter(sim_module.SessionData.session_id == "sim_del").first()
        assert exists is None
