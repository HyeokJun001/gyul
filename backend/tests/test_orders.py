"""주문 API 동작 및 트랜잭션 원자성 테스트."""


def _order_payload(items):
    return {
        "receiver_name": "박환희",
        "phone": "010-3095-0628",
        "address": "광주광역시 임방울대로142-12, 삼성아파트 111-2204",
        "raw_message": "혼합과 주문",
        "items": items,
    }


def test_health_check_returns_ok(client):
    res = client.get("/health")

    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_create_order_persists_order_with_items(client):
    payload = _order_payload(
        [
            {"item_type": "혼합과", "kg": 10, "box_count": 1},
            {"item_type": "혼합과", "kg": 5, "box_count": 2},
        ]
    )

    res = client.post("/orders", json=payload)

    assert res.status_code == 200
    body = res.json()
    assert body["id"] > 0
    assert body["receiver_name"] == "박환희"
    assert len(body["items"]) == 2


def test_list_orders_returns_created_order(client):
    client.post(
        "/orders",
        json=_order_payload([{"item_type": "대과", "kg": 10, "box_count": 1}]),
    )

    res = client.get("/orders")

    assert res.status_code == 200
    assert len(res.json()) == 1


def test_create_order_without_items_is_rejected(client):
    res = client.post("/orders", json=_order_payload([]))

    assert res.status_code == 400


def test_invalid_item_rolls_back_entire_order(client):
    # 품목 2개 중 하나(kg=0)가 잘못되면, 주문 헤더까지 전부 롤백되어야 한다(원자성).
    payload = _order_payload(
        [
            {"item_type": "혼합과", "kg": 10, "box_count": 1},
            {"item_type": "혼합과", "kg": 0, "box_count": 1},
        ]
    )

    res = client.post("/orders", json=payload)

    assert res.status_code == 400
    # 롤백되었으므로 저장된 주문이 하나도 없어야 한다.
    listing = client.get("/orders")
    assert listing.json() == []
