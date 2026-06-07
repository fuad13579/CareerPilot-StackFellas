from app.utils.query_parser import parse_query


def test_parse_query_extracts_hybrid_location_salary_and_experience():
    parsed = parse_query(
        "Show me hybrid data engineer jobs in New York with at least 120k salary and 3 years experience"
    )

    assert parsed["is_hybrid"] is True
    assert parsed["is_remote"] is False
    assert parsed["is_onsite"] is False
    assert parsed["location"] == "New York"
    assert parsed["salary_min"] == 120000
    assert parsed["years_experience_min"] == 3
    assert "data" in parsed["keywords"]
    assert "engineer" in parsed["keywords"]


def test_parse_query_extracts_onsite_and_generic_location_phrase():
    parsed = parse_query("Find onsite frontend roles in Austin")

    assert parsed["is_onsite"] is True
    assert parsed["location"] == "Austin"
    assert "frontend" in parsed["keywords"]
