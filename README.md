# Simple P2P Blockchain (Educational)

Blockchain sederhana dengan:

- **P2P Networking** → Node saling bicara lewat **WebSocket Relay Server**
- **Consensus** → Proof-of-Work + Longest Chain Rule
- **Distributed Ledger** → Saldo & history transaksi sama di semua node

Cocok untuk belajar konsep blockchain tanpa kompleksitas libp2p/WebRTC penuh.

---

## Fitur

| Fitur              | Implementasi                          |
|--------------------|---------------------------------------|
| P2P Networking     | WebSocket Relay (node ↔ relay ↔ node) |
| Consensus          | PoW (difficulty 2) + longest chain    |
| Distributed Ledger | Setiap node punya copy chain lengkap  |
| Transaction        | Transfer + balance check               |
| Mining Reward      | 50 coin per block                     |
| History            | Full transaction history per address  |

---

## Cara Menjalankan

### 1. Install dependencies

```bash
npm install
```

### 2. Jalankan Relay Server (wajib)

```bash
npm start
# atau: node server.js
```

Server berjalan di `ws://localhost:8080`

### 3. Jalankan Node (bisa banyak terminal)

**Terminal 2:**
```bash
ADDRESS=Alice node node.js
```

**Terminal 3:**
```bash
ADDRESS=Bob node node.js
```

**Terminal 4:**
```bash
ADDRESS=Charlie node node.js
```

### 4. Commands di dalam node

```
balance          → lihat saldo
status           → status ledger
history          → riwayat transaksi
tx <to> <amount> → kirim coin (contoh: tx Bob 10)
mine             → mining pending transactions
peers            → daftar peer
help             → bantuan
exit             → keluar
```

### Contoh alur:

1. Alice: `mine`          → dapat 50 coin
2. Alice: `tx Bob 15`     → buat transaksi
3. Alice: `mine`          → transaksi masuk block, Bob dapat 15
4. Bob: `balance`         → harusnya 15
5. Semua node otomatis sync via longest chain

---

## Demo cepat (tanpa network)

```bash
npm run demo
```

Menunjukkan consensus & distributed ledger secara lokal.

---

## Struktur File

```
simple-p2p-blockchain/
├── blockchain.js   → Core: Block, Transaction, Blockchain, PoW, validation
├── server.js       → Relay server (WebSocket)
├── node.js         → Node yang connect ke relay + CLI
├── demo.js         → Demo in-process (tanpa network)
├── package.json
└── README.md
```

---

## Catatan

- Ini **educational only**. Tidak production-ready.
- Difficulty rendah (2) supaya mining cepat.
- Relay server = single point of failure (untuk real P2P pakai libp2p / WebRTC + signaling).
- Untuk versi lebih advanced bisa ganti relay dengan:
  - `simple-peer` (WebRTC)
  - `js-libp2p` + WebRTC transport
  - Gun.js / Trystero / PeerJS

---

## Next Level (opsional)

Kalau mau upgrade ke true browser-to-browser P2P:

1. Ganti WebSocket dengan **simple-peer** atau **@libp2p/webrtc**
2. Pakai signaling server (atau Firebase / public signaling)
3. Gossip protocol untuk broadcast block/tx

Tapi untuk memahami konsep dasar, versi relay ini sudah cukup jelas.
