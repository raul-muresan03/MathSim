import json
from datetime import datetime, timedelta
import pytest
from unittest.mock import patch, Mock

from services import simulation as sim_module


class TestGradeSession:
    @pytest.mark.parametrize("age, expired", [
        (timedelta(hours=24) - timedelta(microseconds=1), False),
        (timedelta(hours=24), False),
        (timedelta(hours=24, microseconds=1), True),
    ])
    def test_session_expiry_boundary(self, db, age, expired):
        now = datetime(2026, 10, 7, 12)
        selected = [{"chapter": "algebra", "filename": "test.png", "answers": {"1": "A"}}]
        db.add(sim_module.SessionData(
            session_id="sim_ttl",
            data_json="invalid-json" if expired else json.dumps(selected),
            created_at=now - age,
        ))
        db.commit()

        with patch.object(sim_module, "datetime") as clock:
            clock.now.return_value = now
            if expired:
                with pytest.raises(KeyError, match="Session not found or expired"):
                    sim_module.grade_session(db, "sim_ttl", [])
            else:
                result = sim_module.grade_session(db, "sim_ttl", [Mock(grid_id="1", answer="A")])
                assert result["score"] == 10.0

        # Deletion must be committed, not just visible in this session.
        db.rollback()
        assert db.get(sim_module.SessionData, "sim_ttl") is None

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


class TestCreateSession:
    def test_creation_cleans_only_expired_sessions(self, db):
        now = datetime(2026, 10, 7, 12)
        db.add_all([
            sim_module.SessionData(session_id=session_id, data_json="[]", created_at=now - age)
            for session_id, age in [
                ("expired", timedelta(hours=24, microseconds=1)),
                ("boundary", timedelta(hours=24)),
                ("recent", timedelta(hours=23)),
            ]
        ])
        db.commit()
        inventory = [{
            "chapter": "algebra", "filename": "test.png", "ids": ["1"],
            "answers": {"1": "A"}, "has_all_answers": True,
        }]

        with patch.object(sim_module, "datetime") as clock, patch.object(sim_module, "_scan_inventory", return_value=inventory):
            clock.now.return_value = now
            result = sim_module.create_simulation_session(db, 1, {"algebra": 1.0})

        db.rollback()
        remaining = {record.session_id for record in db.query(sim_module.SessionData).all()}
        assert remaining == {"boundary", "recent", result["session_id"]}
        assert result["total_grids"] == 1
