import { useState } from "react";
import axios from "axios";
import "./App.css";

const initialItem = { item_type: "혼합과", kg: 10, box_count: 1 };

function App() {
  const [receiverName, setReceiverName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [rawMessage, setRawMessage] = useState("");
  const [items, setItems] = useState([initialItem]);
  const [response, setResponse] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChangeItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addItem = () => {
    setItems([...items, { item_type: "", kg: 5, box_count: 1 }]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        receiver_name: receiverName,
        phone,
        address,
        raw_message: rawMessage,
        items: items.map((it) => ({
          item_type: it.item_type || "미정",
          kg: Number(it.kg) || 0,
          box_count: Number(it.box_count) || 0,
        })),
      };

      const res = await axios.post("http://127.0.0.1:8000/orders", payload);
      setResponse(res.data);
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="chakra">GYUL FRESH</p>
        <h1>과일 주문 등록</h1>
        <p className="sub">
          카톡/문자 복붙만으로 주문을 저장하고, 품목 내역까지 한 번에 관리해
          보세요.
        </p>
      </header>

      <main className="content-grid">
        <section className="panel form-panel">
          <h2>주문 정보</h2>
          <form className="order-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label>받는 사람 이름</label>
              <input
                placeholder="예) 박환희"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label>전화번호</label>
              <input
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label>주소</label>
              <input
                placeholder="광주광역시 ..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label>원본 메시지 (카톡/문자 복붙)</label>
              <textarea
                rows={5}
                placeholder="받는 사람 성함, 전화번호, 주소, 주문 정보를 복붙하세요."
                value={rawMessage}
                onChange={(e) => setRawMessage(e.target.value)}
              />
            </div>

            <div className="items-section">
              <div className="items-header">
                <div>
                  <h3>주문 품목</h3>
                  <p>품목별 무게/박스 수량을 입력하세요.</p>
                </div>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={addItem}
                >
                  + 품목 추가
                </button>
              </div>

              {items.map((item, idx) => (
                <div className="item-row" key={`item-${idx}`}>
                  <input
                    placeholder="종류 (혼합과/대과)"
                    value={item.item_type}
                    onChange={(e) =>
                      handleChangeItem(idx, "item_type", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    placeholder="kg"
                    value={item.kg}
                    onChange={(e) =>
                      handleChangeItem(idx, "kg", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    placeholder="박스 수"
                    value={item.box_count}
                    onChange={(e) =>
                      handleChangeItem(idx, "box_count", e.target.value)
                    }
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      className="ghost-btn danger"
                      onClick={() => removeItem(idx)}
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button className="primary-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "저장 중..." : "주문 저장"}
            </button>
          </form>
        </section>

        <section className="panel summary-panel">
          <h2>최근 저장 결과</h2>
          {response ? (
            <div className="result-card">
              <p className="chip">저장 완료</p>
              <h3>{response.receiver_name}</h3>
              <p>{response.phone}</p>
              <p>{response.address}</p>
              <ul>
                {response.items.map((item) => (
                  <li key={item.id}>
                    {item.item_type} · {item.kg}kg · {item.box_count}박스
                  </li>
                ))}
              </ul>
              <pre>{response.raw_message || "원본 메시지 없음"}</pre>
            </div>
          ) : (
            <div className="placeholder">
              <p>
                왼쪽 폼에서 주문을 저장하면 여기에 요약이 표시됩니다. 주문을
                여러 건 입력해도 최신 데이터가 계속 업데이트돼요.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
