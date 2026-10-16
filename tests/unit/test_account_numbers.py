import pytest

from backend.app.bank_account.enums import AccountCurrencyEnum
from backend.app.bank_account.utils import calculate_luhn_check_digit, generate_account_number
from backend.app.core.config import settings

pytestmark = pytest.mark.unit


def test_luhn_reference_vector():
    # classic example: 7992739871 + check digit 3 -> 79927398713
    assert calculate_luhn_check_digit("7992739871") == 3


@pytest.mark.parametrize("currency", list(AccountCurrencyEnum))
def test_generated_account_numbers_are_valid(currency):
    number = generate_account_number(currency)
    assert len(number) == 16 and number.isdigit()
    assert number.startswith(f"{settings.BANK_CODE}{settings.BANK_BRANCH_CODE}")
    assert calculate_luhn_check_digit(number[:-1]) == int(number[-1])


def test_generated_numbers_are_not_constant():
    assert len({generate_account_number(AccountCurrencyEnum.USD) for _ in range(20)}) > 1
