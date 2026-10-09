from __future__ import annotations

import pytest

from rpa_antecedentes.models import InputRow
from rpa_antecedentes.validator import sanitize, validation_error


@pytest.mark.parametrize("value", ["123456", "1234567", "12345678", "123456789", "1234567890"])
def test_valid_lengths_between_6_and_10_digits(value: str) -> None:
    assert validation_error(value) is None


def test_leading_zeros_are_valid() -> None:
    assert validation_error("0012345") is None


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("12345", "entre 6 y 10"),
        ("11111111111", "entre 6 y 10"),
        ("", "vacía"),
        ("ABC12345", "solo dígitos"),
        ("12 345 678", "solo dígitos"),
        ("1.234.567", "solo dígitos"),
        ("12-345-678", "solo dígitos"),
        ("-1234567", "solo dígitos"),
        ("1234567.5", "solo dígitos"),
        ("١٢٣٤٥٦٧", "solo dígitos"),  # dígitos arábigo-índicos: isdigit() los acepta
        ("¹²³⁴⁵⁶⁷", "solo dígitos"),  # superíndices
    ],
)
def test_invalid_values_explain_why(value: str, expected: str) -> None:
    error = validation_error(value)
    assert error is not None
    assert expected in error


def test_error_message_reports_actual_length() -> None:
    assert "tiene 5" in (validation_error("12345") or "")


def test_sanitize_removes_duplicates_keeping_first_and_order() -> None:
    rows = [
        InputRow(2, "111111"),
        InputRow(3, "222222"),
        InputRow(4, "111111"),
        InputRow(5, "333333"),
    ]

    result = sanitize(rows)

    assert [c.cedula for c in result.candidates] == ["111111", "222222", "333333"]
    assert result.duplicates_removed == 1
    assert result.duplicate_rows == [4]


def test_sanitize_marks_invalid_without_dropping_them() -> None:
    result = sanitize([InputRow(2, "1234567"), InputRow(3, "12"), InputRow(4, "abc")])

    assert [c.is_valid for c in result.candidates] == [True, False, False]
    assert result.invalid_count == 2
    assert result.candidates[1].error is not None


def test_sanitize_deduplicates_invalid_values_too() -> None:
    result = sanitize([InputRow(2, "abc"), InputRow(3, "abc")])

    assert len(result.candidates) == 1
    assert result.duplicates_removed == 1


def test_sanitize_treats_leading_zero_as_a_different_cedula() -> None:
    result = sanitize([InputRow(2, "0123456"), InputRow(3, "123456")])

    assert result.duplicates_removed == 0


def test_sanitize_empty_input() -> None:
    result = sanitize([])

    assert result.candidates == []
    assert result.duplicates_removed == 0
