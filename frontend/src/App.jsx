import { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

const INVALID_NAME_TOKENS = ["받는", "받는사람", "받는분", "받는이", "받는사람성함", "받는사람이름"];

const NAME_LABEL_REGEX =
  /(받는\s*(?:사람|분|이름|성함)|수령인|수취인)\s*(?:성함|이름)?\s*[:：]\s*([가-힣]{2,4})/gi;

const cleanNameText = (value) => {
  if (!value) return "";
  const candidate = value.replace(/[^가-힣]/g, "").trim();
  if (!candidate || INVALID_NAME_TOKENS.includes(candidate)) return "";
  return candidate;
};

const extractNameFromLabels = (text) => {
  if (!text) return "";
  const matches = [...text.matchAll(NAME_LABEL_REGEX)];
  if (matches.length === 0) return "";
  const last = matches[matches.length - 1][2]; // 가장 마지막 라벨 사용
  return cleanNameText(last);
};

const cleanAddressText = (value) => {
  if (!value) return "";
  let result = value
    .replace(/^(받는\s*(주소지|주소)\s*[:：]?)/i, "")
    .replace(/^주소\s*[:：]?/i, "")
    .trim();
  // 품목/중량/박스 정보 제거
  result = result.replace(
    /(혼합과|대과)\s*\d+\s*k?g\s*(?:\/?\s*(\d+)?\s*박스)?/gi,
    ""
  );
  result = result.replace(/\d+\s*kg\s*(\/\s*\d+\s*박스)?/gi, "");
  result = result.replace(/\d+\s*박스/gi, "");
  result = result.replace(/\/\s*$/g, "");
  return result.trim();
};

// 단일 메시지 파싱 함수 (라벨 기반 형식 지원)
function parseSingleMessage(text) {
  if (!text || text.trim() === "") {
    return null;
  }

  const result = {
    receiver_name: "",
    phone: "",
    address: "",
    items: [],
  };

  // 라벨 기반 파싱 시도
  // "받는 사람 :" 또는 "받는사람 :" 패턴
  const labeledName = extractNameFromLabels(text);
  if (labeledName) {
    result.receiver_name = labeledName;
  } else {
    // 대괄호 형식: [노시준]
    const bracketMatch = text.match(/\[([가-힣]{2,4})\]/);
    if (bracketMatch) {
      const cleaned = cleanNameText(bracketMatch[1]);
      if (cleaned) result.receiver_name = cleaned;
    } else {
      // 전화번호 앞의 이름 추출
      const phoneRegex = /010[-.\s]?\d{4}[-.\s]?\d{4}/;
      const phoneMatch = text.match(phoneRegex);
      if (phoneMatch) {
        const beforePhone = text.substring(0, phoneMatch.index).trim();
        const nameMatch = beforePhone.match(/([가-힣]{2,4})/);
        if (nameMatch) {
          const cleaned = cleanNameText(nameMatch[1]);
          if (cleaned) result.receiver_name = cleaned;
        }
      }
    }
  }

  // 전화번호 찾기 (010-XXXX-XXXX 또는 010XXXXXXXX 형식)
  const phoneRegex = /010[-.\s]?\d{4}[-.\s]?\d{4}/;
  const phoneMatch = text.match(phoneRegex);
  
  if (phoneMatch) {
    // 전화번호 포맷팅
    result.phone = phoneMatch[0].replace(/[-.\s]/g, "").replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  } else {
    // "연락처 :" 패턴
    const contactMatch = text.match(/연락처\s*[:：]\s*(010[-.\s]?\d{4}[-.\s]?\d{4})/);
    if (contactMatch) {
      result.phone = contactMatch[1].replace(/[-.\s]/g, "").replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
    }
  }

  // 주소 추출: "주소 :" 패턴
  const addressLabelMatch = text.match(/주소\s*[:：]\s*/);
  if (addressLabelMatch) {
    const afterLabel = text.substring(addressLabelMatch.index + addressLabelMatch[0].length);
    // 다음 라벨(받는 사람, 연락처, 수량)이 나오기 전까지가 주소
    const nextLabelMatch = afterLabel.match(/\n\s*(?:받는\s*사람|받는사람|연락처|수량)\s*[:：]/);
    let addressText = nextLabelMatch 
      ? afterLabel.substring(0, nextLabelMatch.index)
      : afterLabel;
    
    // 여러 줄 주소 합치기 (공백으로)
    addressText = cleanAddressText(addressText.replace(/\n+/g, " ").replace(/\s+/g, " ").trim());
    result.address = addressText;
  } else if (phoneMatch) {
    // 전화번호 뒤부터 수량/박스 정보 전까지가 주소
    const afterPhone = text.substring(phoneMatch.index + phoneMatch[0].length);
    let addressText = afterPhone;
    
    // 수량 정보 제거
    addressText = addressText.replace(/수량\s*[:：].*$/m, "").trim();
    // 박스 정보 제거
    addressText = addressText.replace(/\d+\s*박스.*$/m, "").trim();
    // 품목 정보 제거
    addressText = addressText.replace(/(혼합과|대과)\s*\d+\s*k?g.*$/m, "").trim();
    // 받는 사람, 연락처 라벨 제거
    addressText = addressText.replace(/받는\s*사람\s*[:：].*$/m, "").trim();
    addressText = addressText.replace(/받는사람\s*[:：].*$/m, "").trim();
    addressText = addressText.replace(/연락처\s*[:：].*$/m, "").trim();
    
    result.address = cleanAddressText(addressText.replace(/\n+/g, " ").replace(/\s+/g, " ").trim());
  }

  // 수량/품목 정보 찾기: "수량 : 대과 10kg 2박스"
  const quantityMatch = text.match(/수량\s*[:：]\s*(혼합과|대과)\s*(\d+)\s*k?g\s*(\d+)\s*박스/i);
  if (quantityMatch) {
    result.items.push({
      item_type: quantityMatch[1],
      kg: parseInt(quantityMatch[2]),
      box_count: parseInt(quantityMatch[3]),
    });
  } else {
    // 일반 패턴: "대과 10kg 2박스" 또는 "혼합과 10kg [총 4박스]"
    const fullItemMatch = text.match(/(혼합과|대과)\s*(\d+)\s*k?g\s*(?:\[?총\s*)?(\d+)\s*박스/i);
    if (fullItemMatch) {
      result.items.push({
        item_type: fullItemMatch[1],
        kg: parseInt(fullItemMatch[2]),
        box_count: parseInt(fullItemMatch[3]),
      });
    } else {
      // "대과 10kg" (박스 정보 없음)
      const itemKgMatch = text.match(/(혼합과|대과)\s*(\d+)\s*k?g/i);
      if (itemKgMatch) {
        const boxMatch = text.match(/(\d+)\s*박스/);
        result.items.push({
          item_type: itemKgMatch[1],
          kg: parseInt(itemKgMatch[2]),
          box_count: boxMatch ? parseInt(boxMatch[1]) : 1,
        });
      } else {
        // 박스 정보만 있음
        const boxMatch = text.match(/(\d+)\s*박스/);
        const totalBoxes = boxMatch ? parseInt(boxMatch[1]) : 1;
        result.items.push({
          item_type: "혼합과",
          kg: 10,
          box_count: totalBoxes,
        });
      }
    }
  }

  return result;
}

// 여러 메시지 파싱 함수 (여러 줄 주문 지원)
function parseMultipleMessages(text) {
  if (!text || text.trim() === "") {
    return [];
  }

  const orders = [];
  
  // "주소 :" 또는 전화번호를 기준으로 주문 구분
  // 빈 줄이 2개 이상 연속이거나, "주소 :"가 다시 나오면 새로운 주문
  const sections = text.split(/\n\s*\n/).filter(s => s.trim().length > 0);
  
  // 각 섹션을 개별 주문으로 처리
  for (const section of sections) {
    const parsed = parseSingleMessage(section);
    if (parsed && (parsed.phone || parsed.receiver_name || parsed.address)) {
      orders.push({
        ...parsed,
        originalLine: section.trim(),
      });
    }
  }

  // 섹션으로 나뉘지 않았으면 "주소 :" 패턴으로 다시 분리 시도
  if (orders.length === 0 || orders.length === 1) {
    // "주소 :" 패턴으로 주문 구분
    const addressPattern = /주소\s*[:：]/g;
    const matches = [...text.matchAll(addressPattern)];
    
    if (matches.length > 1) {
      // 여러 주소가 있으면 각각을 개별 주문으로 처리
      orders.length = 0; // 기존 결과 초기화
      
      for (let i = 0; i < matches.length; i++) {
        const startIndex = matches[i].index;
        const endIndex = i < matches.length - 1 ? matches[i + 1].index : text.length;
        const orderText = text.substring(startIndex, endIndex).trim();
        
        const parsed = parseSingleMessage(orderText);
        if (parsed && (parsed.phone || parsed.receiver_name || parsed.address)) {
          orders.push({
            ...parsed,
            originalLine: orderText,
          });
        }
      }
    } else if (orders.length === 0) {
      // 전화번호가 있는 줄들을 개별 주문으로 처리
      const lines = text.split(/\n/).map(line => line.trim()).filter(line => line.length > 0);
      const phoneRegex = /010[-.\s]?\d{4}[-.\s]?\d{4}/;
      
      // 전화번호가 있는 줄을 기준으로 주문 그룹화
      let currentOrderLines = [];
      for (const line of lines) {
        if (phoneRegex.test(line)) {
          // 이전 주문 저장
          if (currentOrderLines.length > 0) {
            const orderText = currentOrderLines.join('\n');
            const parsed = parseSingleMessage(orderText);
            if (parsed && (parsed.phone || parsed.receiver_name)) {
              orders.push({
                ...parsed,
                originalLine: orderText,
              });
            }
          }
          // 새 주문 시작
          currentOrderLines = [line];
        } else {
          currentOrderLines.push(line);
        }
      }
      
      // 마지막 주문 저장
      if (currentOrderLines.length > 0) {
        const orderText = currentOrderLines.join('\n');
        const parsed = parseSingleMessage(orderText);
        if (parsed && (parsed.phone || parsed.receiver_name || parsed.address)) {
          orders.push({
            ...parsed,
            originalLine: orderText,
          });
        }
      }
    }
  }

  return orders;
}

function App() {
  const [rawMessage, setRawMessage] = useState("");
  const [parsedOrders, setParsedOrders] = useState([]);
  const [orderData, setOrderData] = useState([]); // 각 주문의 데이터
  const [response, setResponse] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState({}); // 각 주문별 제출 상태

  const resetForm = () => {
    setRawMessage("");
    setParsedOrders([]);
    setOrderData([]);
    setResponse(null);
    setIsSubmitting({});
  };

  // 메시지가 변경될 때마다 파싱
  useEffect(() => {
    if (rawMessage.trim()) {
      const orders = parseMultipleMessages(rawMessage);
      setParsedOrders(orders);
      // 각 주문의 초기 데이터 설정
      setOrderData(orders.map(order => ({
        receiver_name: order.receiver_name,
        phone: order.phone,
        address: order.address,
        items: order.items.length > 0 ? order.items : [{ item_type: "혼합과", kg: 10, box_count: 1 }],
        originalLine: order.originalLine,
      })));
    } else {
      setParsedOrders([]);
      setOrderData([]);
    }
  }, [rawMessage]);

  const handleChangeOrderField = (orderIndex, field, value) => {
    setOrderData(prev => 
      prev.map((order, idx) => 
        idx === orderIndex ? { ...order, [field]: value } : order
      )
    );
  };

  const handleChangeItem = (orderIndex, itemIndex, field, value) => {
    setOrderData(prev =>
      prev.map((order, idx) => {
        if (idx === orderIndex) {
          return {
            ...order,
            items: order.items.map((item, i) =>
              i === itemIndex ? { ...item, [field]: value } : item
            ),
          };
        }
        return order;
      })
    );
  };

  const addItem = (orderIndex) => {
    setOrderData(prev =>
      prev.map((order, idx) => {
        if (idx === orderIndex) {
          return {
            ...order,
            items: [...order.items, { item_type: "혼합과", kg: 10, box_count: 1 }],
          };
        }
        return order;
      })
    );
  };

  const removeItem = (orderIndex, itemIndex) => {
    setOrderData(prev =>
      prev.map((order, idx) => {
        if (idx === orderIndex) {
          const newItems = order.items.filter((_, i) => i !== itemIndex);
          if (newItems.length === 0) {
            newItems.push({ item_type: "혼합과", kg: 10, box_count: 1 });
          }
          return { ...order, items: newItems };
        }
        return order;
      })
    );
  };

  const handleSubmitOrder = async (orderIndex) => {
    const order = orderData[orderIndex];
    
    if (!order.receiver_name || !order.phone || !order.address) {
      alert("이름, 전화번호, 주소를 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(prev => ({ ...prev, [orderIndex]: true }));
    try {
      const payload = {
        receiver_name: order.receiver_name,
        phone: order.phone,
        address: order.address,
        raw_message: order.originalLine || rawMessage,
        items: order.items.map((it) => ({
          item_type: it.item_type || "미정",
          kg: Number(it.kg) || 0,
          box_count: Number(it.box_count) || 0,
        })),
      };

      const res = await axios.post("http://127.0.0.1:8080/orders", payload);
      setResponse(res.data);
      
      // 성공한 주문 제거
      setParsedOrders(prev => prev.filter((_, idx) => idx !== orderIndex));
      setOrderData(prev => prev.filter((_, idx) => idx !== orderIndex));
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsSubmitting(prev => ({ ...prev, [orderIndex]: false }));
    }
  };

  const handleSubmitAll = async () => {
    for (let i = 0; i < orderData.length; i++) {
      await handleSubmitOrder(i);
      // 각 주문 사이에 약간의 딜레이
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="chakra">GYUL FRESH</p>
        <h1>귤 주문 등록 by 아들내미</h1>
        <p className="sub">
          카톡/문자 복붙만으로 주문을 저장하고, 품목 내역까지 한 번에 관리해
          보세요.
        </p>
      </header>

      <main className="content-grid">
        <section className="panel form-panel">
          <h2>주문 정보</h2>
          <div className="order-form">
            <div className="form-field">
              <label>원본 메시지 (카톡/문자 복붙)</label>
              <button
                type="button"
                className="ghost-btn reset-btn"
                onClick={resetForm}
              >
                새로 작성하기
              </button>
              <textarea
                rows={10}
                placeholder="여러 주문을 한 번에 복붙하세요:&#10;"
                value={rawMessage}
                onChange={(e) => setRawMessage(e.target.value)}
                className="message-input"
              />
            </div>

            {parsedOrders.length > 0 && (
              <div className="orders-list">
                {parsedOrders.map((_, orderIndex) => {
                  const order = orderData[orderIndex];
                  if (!order) return null;

                  return (
                    <div key={orderIndex} className="parsed-preview">
                      <h3>인식된 정보 확인 #{orderIndex + 1}</h3>
                      
                      <div className="form-field">
                        <label>받는 사람 이름</label>
                        <input
                          placeholder="예) 김길규"
                          value={order.receiver_name}
                          onChange={(e) => handleChangeOrderField(orderIndex, "receiver_name", e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="form-field">
                        <label>전화번호</label>
                        <input
                          placeholder="010-0000-0000"
                          value={order.phone}
                          onChange={(e) => handleChangeOrderField(orderIndex, "phone", e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="form-field">
                        <label>주소</label>
                        <input
                          placeholder="광주광역시 ..."
                          value={order.address}
                          onChange={(e) => handleChangeOrderField(orderIndex, "address", e.target.value)}
                          required
                        />
                      </div>

                      <div className="items-section">
                        <div className="items-header">
                          <div>
                            <h3>주문 품목</h3>
                            <p>인식된 품목을 확인하고 수정하세요.</p>
                          </div>
                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={() => addItem(orderIndex)}
                          >
                            + 품목 추가
                          </button>
                        </div>

                        {order.items.map((item, itemIdx) => (
                          <div className="item-row" key={`item-${orderIndex}-${itemIdx}`}>
                            <input
                              placeholder="종류 (혼합과/대과)"
                              value={item.item_type}
                              onChange={(e) =>
                                handleChangeItem(orderIndex, itemIdx, "item_type", e.target.value)
                              }
                            />
                            <input
                              type="number"
                              placeholder="kg"
                              value={item.kg}
                              onChange={(e) =>
                                handleChangeItem(orderIndex, itemIdx, "kg", e.target.value)
                              }
                            />
                            <input
                              type="number"
                              placeholder="박스 수"
                              value={item.box_count}
                              onChange={(e) =>
                                handleChangeItem(orderIndex, itemIdx, "box_count", e.target.value)
                              }
                            />
                            {order.items.length > 1 && (
                              <button
                                type="button"
                                className="ghost-btn danger"
                                onClick={() => removeItem(orderIndex, itemIdx)}
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        className="primary-btn order-submit-btn"
                        type="button"
                        onClick={() => handleSubmitOrder(orderIndex)}
                        disabled={isSubmitting[orderIndex]}
                      >
                        {isSubmitting[orderIndex] ? "저장 중..." : `주문 #${orderIndex + 1} 저장`}
                      </button>
                    </div>
                  );
                })}

                {parsedOrders.length > 1 && (
                  <button
                    className="primary-btn submit-all-btn"
                    type="button"
                    onClick={handleSubmitAll}
                    disabled={Object.values(isSubmitting).some(v => v)}
                  >
                    전체 주문 일괄 저장
                  </button>
                )}
              </div>
            )}
          </div>
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
                원본 메시지를 복붙하면 자동으로 정보가 인식됩니다. 여러 주문을
                한 번에 복붙하면 각 주문별로 구분되어 표시됩니다.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
