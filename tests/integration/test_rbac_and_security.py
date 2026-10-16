import pytest

from .conftest import idem

pytestmark = pytest.mark.integration


def test_customer_cannot_withdraw_from_any_account(alice):
    """Regression: withdrawals used to have no role check at all."""
    r = alice.post("/bank-account/withdraw", json={"account_number": "4200000000000002", "amount": 1, "username": "bob", "description": "x"}, headers=idem())
    assert r.status_code == 403


def test_customer_cannot_activate_accounts(alice):
    accounts = alice.get("/bank-account/all").json()["items"]
    assert accounts, "alice has a demo account"
    r = alice.patch(f"/bank-account/{accounts[0]['id']}/activate")
    assert r.status_code in (401, 403)


def test_customer_cannot_mint_money_by_creating_an_account(alice):
    """Regression: the create body used to be trusted (balance / status / kyc flags)."""
    r = alice.post("/bank-account/create", json={"account_type": "savings", "currency": "EUR", "account_name": "mint", "balance": 1_000_000, "account_status": "active", "kyc_verified": True})
    if r.status_code in (200, 201):
        acc = r.json()
        assert float(acc["balance"]) == 0.0 and acc["account_status"] == "pending"
    else:
        assert r.status_code in (400, 403, 409, 422)  # e.g. account limit / KYC rules


def test_customer_cannot_list_other_peoples_accounts(alice):
    items = alice.get("/bank-account/all").json()["items"]
    assert items and all(i["owner_email"] in (None, "alice@example.com") for i in items)


def test_customer_cannot_see_flagged_transactions(alice):
    assert alice.get("/transaction/flagged").status_code == 403


def test_admin_can_list_all_profiles(admin):
    r = admin.get("/profile/all")
    assert r.status_code == 200 and r.json()["total"] >= 5


def test_admin_can_read_ml_status(admin):
    assert admin.get("/ml/status").status_code == 200
