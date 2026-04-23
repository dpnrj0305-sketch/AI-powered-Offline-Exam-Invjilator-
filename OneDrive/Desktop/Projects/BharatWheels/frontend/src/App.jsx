import { useState, useEffect } from "react"

function App({ onLogout }) {
  const [cars, setCars] = useState([])
  const [selectedCar, setSelectedCar] = useState(null)
  const [bidAmount, setBidAmount] = useState("")
  const [ws, setWs] = useState(null)
  const [loading, setLoading] = useState(true)

  // 🟢 NEW: Global clock state to make the timers tick every second
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // 🟢 NEW: Helper function to calculate time left for the auctions
  const getTimeLeft = (endTime) => {
    if (!endTime) return "No Timer";
    // Ensure JS reads backend time properly
    const diff = new Date(endTime.endsWith('Z') ? endTime : endTime + 'Z') - currentTime;
    
    if (diff <= 0) return "SOLD";
    
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
  };

  useEffect(() => {
    fetch("http://127.0.0.1:8000/cars")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCars(data);
        setLoading(false);
      })
      .catch(err => { console.error(err); setLoading(false); });
  }, [])

  const selectCar = (car) => {
    if (!car) return;
    setSelectedCar(car);
    if (ws) ws.close();
    try {
      const websocket = new WebSocket(`ws://127.0.0.1:8000/ws/${car.id}`);
      websocket.onmessage = (e) => {
        const parts = e.data.split(" ");
        if (parts.length >= 5) {
          const price = parseFloat(parts[4]);
          setCars(prev => prev.map(c => c.id === car.id ? {...c, current_highest_bid: price} : c));
          setSelectedCar(prev => prev?.id === car.id ? {...prev, current_highest_bid: price} : prev);
        }
      };
      setWs(websocket);
    } catch (e) { console.error(e); }
  };

  const placeBid = () => {
    if (!selectedCar || !bidAmount) return;
    fetch("http://127.0.0.1:8000/bid", {
      method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ car_id: selectedCar.id, user_id: 1, amount: parseFloat(bidAmount) })
    }).then(res => res.json()).then(data => {
      if (data.error) alert(data.error); else setBidAmount("");
    });
  };

  if (loading) return (
    <div style={{backgroundColor: "#0e0e10", color:"#fff", height:"100vh", display:"flex", justifyContent:"center", alignItems:"center"}}>
      <h2>IGNITING BHARATWHEELS...</h2>
    </div>
  )

  // 🟢 NEW: Calculate if the currently selected car is sold
  const selectedTimeLeft = selectedCar ? getTimeLeft(selectedCar.auction_end_time) : "";
  const isSelectedSold = selectedTimeLeft === "SOLD";

  return (
    <div style={{ backgroundColor: "#0e0e10", minHeight: "100vh", color: "#fff", fontFamily: "sans-serif" }}>

      <nav style={{ padding: "20px 40px", borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "rgba(14,14,16,0.95)", zIndex: 10 }}>
        <h1 style={{fontSize:"24px", fontWeight:"900"}}>Welcome <span style={{color:"#e31b23"}}>India!</span></h1>
        <div style={{display:"flex", alignItems:"center", gap:"20px"}}>
          <div style={{color:"#e31b23", fontSize:"12px", fontWeight:"bold"}}>● LIVE SHOWROOM</div>
          <button
            onClick={onLogout}
            style={{padding:"8px 20px", background:"transparent", border:"1px solid #e31b23", color:"#e31b23", borderRadius:"8px", cursor:"pointer", fontWeight:"700", fontSize:"12px", letterSpacing:"1px"}}
            onMouseOver={e => {e.target.style.background="#e31b23"; e.target.style.color="#fff"}}
            onMouseOut={e => {e.target.style.background="transparent"; e.target.style.color="#e31b23"}}
          >
            LOGOUT
          </button>
        </div>
      </nav>

      <div style={{textAlign:"center", padding:"60px 0"}}>
        <h2 style={{fontSize:"72px", fontWeight:"900", marginBottom: "15px", letterSpacing: '-2px'}}>
          BHARAT<span style={{color:"#e31b23"}}>WHEELS</span>
        </h2>
        <p style={{color: "#888", fontSize: "19px", letterSpacing: '1px', fontWeight: '300'}}>Drive Your Dream. Bid. Win. Own.</p>
      </div>

      {selectedCar && (
        <div style={{ maxWidth: "1100px", margin: "0 auto 50px auto", background: "#1a1a1d", borderRadius: "20px", display: "flex", overflow: "hidden", border: isSelectedSold ? "1px solid #4ade80" : "1px solid #e31b23", boxShadow: isSelectedSold ? '0 0 40px rgba(74, 222, 128, 0.15)' : '0 0 40px rgba(227, 27, 35, 0.25)' }}>
          <img
            src={selectedCar.image_url}
            style={{ width: "55%", height: "450px", objectFit: "cover", filter: isSelectedSold ? "grayscale(40%)" : "none" }}
            alt="Selected"
            onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800"; }}
          />
          <div style={{ padding: "40px", flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span style={{color: isSelectedSold ? "#4ade80" : "#e31b23", fontWeight:"bold", fontSize:"13px", letterSpacing: '2px'}}>
                {isSelectedSold ? "AUCTION CLOSED" : "AUCTION LIVE"}
              </span>
              <span style={{color: isSelectedSold ? "#888" : "#fff", fontWeight: "bold", background: isSelectedSold ? "#222" : "#e31b23", padding: "5px 12px", borderRadius: "8px", fontSize: "14px"}}>
                {isSelectedSold ? "SOLD" : `⏳ Ends in: ${selectedTimeLeft}`}
              </span>
            </div>

            <h2 style={{fontSize:"36px", margin:"10px 0"}}>{selectedCar.year} {selectedCar.make} {selectedCar.model}</h2>
            
            <p style={{color:"#888", margin: '5px 0 10px 0'}}>Finish: <span style={{color:"#fff"}}>{selectedCar.status}</span></p>
            
            {/* SPECS ON SELECTED CAR */}
            <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#aaaaaa', marginBottom: '25px', fontWeight: 'bold' }}>
              <span>🛣️ {selectedCar.mileage ? selectedCar.mileage.toLocaleString() : "0"} KM</span>
              <span>⛽ {selectedCar.fuel_type ? selectedCar.fuel_type.toUpperCase() : "N/A"}</span>
              <span>⚙️ {selectedCar.transmission ? selectedCar.transmission.toUpperCase() : "N/A"}</span>
            </div>

            {/* 🟢 CONDITIONAL SELLER CONTACT REVEAL 🟢 */}
            {isSelectedSold ? (
              <div style={{ fontSize: '15px', color: '#4ade80', marginBottom: '25px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(74, 222, 128, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
                <span>🎉 Winner! 📞 Contact Seller: {selectedCar.seller_contact || "+91 XXXXXXXXXX"}</span>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '25px', fontWeight: 'bold', display: 'inline-block', background: '#111', padding: '8px 12px', borderRadius: '6px' }}>
                <span>🔒 Seller contact unlocks after auction</span>
              </div>
            )}

            <h1 style={{color: isSelectedSold ? "#fff" : "#e31b23", fontSize: '48px', margin: '0 0 25px 0'}}>
              {isSelectedSold ? "Final Price: " : ""}{formatINR(selectedCar.current_highest_bid || selectedCar.base_price)}
            </h1>
            
            {/* 🟢 HIDE BIDDING IF AUCTION IS OVER 🟢 */}
            {!isSelectedSold && (
              <div style={{display:"flex", gap:"15px"}}>
                <input type="number" value={bidAmount} onChange={e => setBidAmount(e.target.value)} style={{padding:"18px", flex: 1, background:"#000", border:"1px solid #333", color:"#fff", borderRadius:"12px", fontSize: '18px'}} placeholder="₹ Enter Amount" />
                <button onClick={placeBid} style={{padding:"18px 35px", background:"#e31b23", border:"none", color:"#fff", fontWeight:"bold", borderRadius:"12px", cursor:"pointer", fontSize: '16px'}}>PLACE BID</button>
              </div>
            )}

          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "35px", padding: "0 40px 80px 40px", maxWidth: "1600px", margin: "0 auto" }}>
        {cars.map(car => {
          // 🟢 NEW: Calculate if each individual card is sold
          const cardTimeLeft = getTimeLeft(car.auction_end_time);
          const isCardSold = cardTimeLeft === "SOLD";

          return (
            <div key={car.id} onClick={() => selectCar(car)}
              style={{ background: "#1a1a1d", borderRadius: "18px", overflow: "hidden", border: selectedCar?.id === car.id ? "1px solid #e31b23" : "1px solid #222", cursor: "pointer", transition: "0.3s", opacity: isCardSold ? 0.6 : 1 }}
              onMouseOver={e => {if (!isCardSold) {e.currentTarget.style.borderColor="#e31b23"; e.currentTarget.style.transform="translateY(-8px)"}}}
              onMouseOut={e => {if (!isCardSold) {e.currentTarget.style.borderColor=selectedCar?.id === car.id ? "#e31b23" : "#222"; e.currentTarget.style.transform="translateY(0)"}}}>
              
              <div style={{position: 'relative'}}>
                <img
                  src={car.image_url}
                  style={{ width: "100%", height: "200px", objectFit: "cover", filter: isCardSold ? "grayscale(80%)" : "none" }}
                  alt="Listing"
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800"; }}
                />
                {/* 🟢 NEW: Small timer badge on the card image */}
                <div style={{position: 'absolute', top: 12, right: 12, background: isCardSold ? 'rgba(0,0,0,0.8)' : '#e31b23', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold'}}>
                  {isCardSold ? "SOLD" : `⏳ ${cardTimeLeft}`}
                </div>
              </div>

              <div style={{ padding: "20px" }}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <h3 style={{margin:0, fontSize:"19px", fontWeight: '700', textDecoration: isCardSold ? "line-through" : "none"}}>{car.make} {car.model}</h3>
                  <span style={{fontSize:"12px", color: isCardSold ? "#888" : "#e31b23", fontWeight: '800'}}>{car.year}</span>
                </div>
                <p style={{fontSize:"11px", color:"#666", margin:"12px 0 8px 0", letterSpacing: '1px'}}>FINISH: {car.status?.toUpperCase()}</p>
                
                {/* SPECS ON CARDS */}
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#aaaaaa', marginBottom: '15px', fontWeight: 'bold' }}>
                  <span>🛣️ {car.mileage ? car.mileage.toLocaleString() : "0"} KM</span>
                  <span>⛽ {car.fuel_type ? car.fuel_type.toUpperCase() : "N/A"}</span>
                  <span>⚙️ {car.transmission ? car.transmission.toUpperCase() : "N/A"}</span>
                </div>

                <h3 style={{color: isCardSold ? "#888" : "#e31b23", margin:0, fontSize: '22px'}}>{formatINR(car.current_highest_bid || car.base_price)}</h3>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default App