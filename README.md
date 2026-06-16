# Toy Mania Web — 指差しシューティング技術検証版 (MVP)

Webカメラ + MediaPipe による「人差し指の指差し入力」が
シューティングゲームとして成立するかを検証するための技術検証版 (MVP)。

ゲームシステムは Toy Story Mania 風の
**Aim → Shot → Result → Correction** ループを採用するが、
アトラクションの再現ではなくゲームシステムの検証が目的。

---

## 起動手順

前提: Node.js 20 以上 / Webカメラ付き端末 / Chrome・Edge・Safari

```bash
npm install      # 依存パッケージのインストール
npm run dev      # 開発サーバ起動 (http://localhost:5173)
```

ブラウザで表示される画面の「カメラを許可して開始」を押し、
カメラ利用を許可するとゲームが始まる。

> カメラ API (getUserMedia) は `localhost` か `https` でのみ動作する。

その他のコマンド:

```bash
npm run build    # 型チェック + 本番ビルド (dist/)
npm run preview  # ビルド結果をローカル確認
npm run lint     # 型チェックのみ
```

### デプロイ (GitHub Pages)

`main` ブランチへの push で `.github/workflows/deploy.yml` が自動ビルド・配信する。
リポジトリの Settings → Pages で Source を「GitHub Actions」に設定すること。

---

## 遊び方 / MVP範囲

- 人差し指の先端で画面上の照準 (カーソル) を動かす
- 照準は 0.5秒ごとに **自動連射** される (毎秒2発 / プレイヤーの発射操作なし)
- 黄色いターゲットに当たると **+100点**
- 命中: 緑のリング表示 / 外れ: オレンジの着弾マーカー (狙い修正の手掛かり)
- 手を見失うと照準が赤くなり発射停止 (Tracking Lost)

---

## フォルダ構成

```
src
├── config
│   └── GameConfig.ts        定数の一元管理 (Data Driven)
├── core
│   ├── types.ts             共通型 (Vec2 / TrackingState / TargetState ...)
│   └── GameEngine.ts        ゲームループ統括 (Aim→Shot→Result→Correction)
├── input
│   └── MediaPipeBridge.ts   MediaPipe 結果取得
├── cursor
│   └── CursorController.ts  照準の平滑化・DeadZone・状態保持
├── weapon
│   ├── AutoFireSystem.ts    0.5秒ごとの発射イベント発火
│   └── HitScanWeapon.ts     HitScan (Raycast 相当) 命中判定
├── target
│   ├── Target.ts            ターゲット1個の状態と被弾処理
│   └── TargetManager.ts     生成・破棄・再出現の管理
├── score
│   └── ScoreManager.ts      スコア保持・加算
├── feedback
│   └── FeedbackManager.ts   Hit / Miss マーカーの管理
├── ui
│   ├── Renderer.ts          Canvas 描画
│   ├── GameView.tsx         画面・開始操作・スコアHUD (React)
│   └── styles.css
└── main.tsx                 エントリポイント
```

---

## クラス構成 / 責務一覧

| クラス | 責務 | 入力 → 出力 |
| --- | --- | --- |
| `GameConfig` | 全定数の一元管理 (マジックナンバー禁止) | — |
| `MediaPipeBridge` | MediaPipe HandLandmarker の初期化・検出 | Video → `PointerResult` (位置 + TrackingState) |
| `CursorController` | 照準の平滑化 (SmoothDamp相当)・DeadZone・状態保持 | `PointerResult` → スクリーン座標 |
| `AutoFireSystem` | 0.5秒ごとに発射イベントを発火 (自動連射) | dt → onFire コールバック |
| `HitScanWeapon` | 照準位置から即時命中判定 (物理弾なし) | 照準 + ターゲット群 → `HitResult` |
| `Target` | 1個の状態 (Spawn/Idle/Hit/Destroyed) と被弾処理 | 命中 → 状態遷移 |
| `TargetManager` | ターゲットの生成・破棄・再出現 (常に1個) | dt → ターゲット群 |
| `ScoreManager` | 総スコアの保持・加算 (+100/命中) | 命中 → スコア |
| `FeedbackManager` | Hit/Miss マーカーの保持・寿命管理 | 命中結果 → マーカー群 |
| `Renderer` | ゲーム状態を Canvas へ描画 | 各モジュール → 画面 |
| `GameEngine` | 全モジュール統括・ゲームループ実行 | — |
| `GameView` | DOM 用意・開始操作・スコアHUD (React) | — |

### ゲームループ (GameEngine)

```
Aim        : MediaPipeBridge → CursorController
Shot       : AutoFireSystem (Tracking 中のみ)
Result     : HitScanWeapon → Target → ScoreManager
Correction : FeedbackManager → Renderer
```

---

## 技術スタック

- React + TypeScript + Vite
- MediaPipe Tasks Vision (Hand Landmarker, CDN 配信)
- HTML5 Canvas (描画)
- GitHub Pages (配信)
