import time

import pytest

from common.mailpit import existing_ids, wait_for_otp

from .conftest import idem

pytestmark = pytest.mark.integration

ALICE, BOB = "4200000000000001", "4200000000000002"


def _acct(client, number):
    return next(a for a in client.get("/bank-account/all").json()["items"] if a["account_number"] == number)


def test_teller_deposit_updates_balance(teller):
    before = float(_acct(teller, ALICE)["balance"])
    acc = _acct(teller, ALICE)
    r = teller.post("/bank-account/deposit", json={"account_id": acc["id"], "amount": 125.5, "description": "integration test deposit"}, headers=idem())
    assert r.status_code in (200, 201), r.text
    assert float(_acct(teller, ALICE)["balance"]) == pytest.approx(before + 125.5)


def test_deposit_is_idempotent(teller):
    acc = _acct(teller, ALICE)
    before = float(acc["balance"])
    headers = idem()
    body = {"account_id": acc["id"], "amount": 10, "description": "idempotent deposit"}
    first = teller.post("/bank-account/deposit", json=body, headers=headers)
    second = teller.post("/bank-account/deposit", json=body, headers=headers)
    assert first.status_code in (200, 201) and second.status_code in (200, 201)
    assert float(_acct(teller, ALICE)["balance"]) == pytest.approx(before + 10), "the replay must not credit twice"


def test_transfer_requires_otp_and_moves_money(alice, teller):
    a_before = float(_acct(alice, ALICE)["balance"])
    sender_id = _acct(alice, ALICE)["id"]
    seen = existing_ids("alice@example.com")
    r = alice.post("/bank-account/transfer/initiate", headers=idem(), json={
        "sender_account_id": sender_id, "receiver_account_number": BOB, "amount": 20, "description": "integration transfer", "security_answer": "Lagos"})
    assert r.status_code in (200, 201), r.text
    reference = r.json()["data"]["reference"]
    otp = wait_for_otp("alice@example.com", after_ids=seen)
    r = alice.post("/bank-account/transfer/complete", headers=idem(), json={"transfer_reference": reference, "otp": otp})
    assert r.status_code in (200, 201), r.text
    time.sleep(0.5)
    assert float(_acct(alice, ALICE)["balance"]) == pytest.approx(a_before - 20)


def test_transaction_history_is_paginated(alice):
    r = alice.get("/transactions/history", params={"skip": 0, "limit": 5})
    assert r.status_code == 200
    body = r.json()
    assert body["limit"] == 5 and len(body["transactions"]) <= 5
