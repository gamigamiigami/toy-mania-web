# Toy Mania Web — カーニバル 3D シューティングライド

カーニバルの射的ライドを Web で再現した 3D シューティングゲーム。
three.js によるフル 3D 描画で、7つのシーンを乗り物で巡りながら
シーンごとに異なる武器を投げてターゲットを撃ち抜く。

操作は2種類:

- **スマホ = コントローラ** (QR で接続、ジャイロ照準 + スワイプ発射、最大4人対戦)
- **Web カメラ + MediaPipe** の人差し指ポインティング (1人、自動連射)

> 本プロジェクトはテーマパークの射的アトラクションの「ゲーム構成・ルール」を
> 参考にしたオリジナル作品。キャラクター・美術・音楽はすべて独自の手続き生成。

---

## 起動手順

前提: Node.js 20 以上 / Chrome・Edge・Safari

```bash
npm install      # 依存パッケージのインストール
npm run dev      # 開発サーバ起動 (http://localhost:5173)
```

- 「📱 スマホで対戦」: 表示された QR をスマホで読み込み、ジャイロで照準・スワイプで発射。
- 「📷 カメラで1人」: カメラ利用を許可すると人差し指で照準、自動連射。

> カメラ / ジャイロ API は `localhost` か `https` でのみ動作する。

その他のコマンド:

```bash
npm run build    # 型チェック + 本番ビルド (dist/)
npm run preview  # ビルド結果をローカル確認
npm run lint     # 型チェックのみ
```

### デプロイ (GitHub Pages)

`main` ブランチへの push で `.github/workflows/deploy.yml` が自動ビルド・配信する。

---

## ゲーム構成 (7シーンの連続ライド)

各シーンで武器が変わり、弾道も変わる。的には得点 (100/500/1000/2000) を表示。
撃つと「何かが起きる」隠しギミック (トリガー的) が各シーンに仕込まれている。

| # | シーン | 武器 (弾道) | 内容と隠しギミック |
| --- | --- | --- | --- |
| 1 | 練習: パイなげ | パイ (山なり) | 静止した大的で腕慣らし |
| 2 | たまご牧場 | 卵 (山なり) | 出没するイタチ・歩くブタとヒツジ・飛ぶトリ。**屋根のキツネを撃つと小屋の扉が開き 1000点ニワトリが出現** |
| 3 | 風船火山 | ダーツ (直線) | ゆらゆら上昇する風船。**溶岩風船を3個全部割ると火山が噴火し高得点風船が大量に噴出** |
| 4 | 皿割りキャンプ | ボール (高速) | 棚とベルトコンベアの皿。**5枚割るごとに皿の山 (2000点) が出現** |
| 5 | リングトス宇宙港 | 輪 (ふわり) | ロケットの周りを周回するエイリアン。ロケットは弾を遮る。**胸コアを撃つとロケット発射→ボーナス出現** |
| 6 | 西部の射的場 | 吸盤ダーツ (連射) | スライド板的・窓の出没・高速トロッコ。**屋根の星を撃つとコウモリ群が飛来** |
| 7 | ボーナスラウンド | 吸盤ダーツ (連射) | フィナーレ。**中央の成長ターゲットは撃つたび 500→…→5000点に成長しながら縮む** |

- 制限時間は各シーン約30秒 (練習は短め、設定で変更可)。シーン間もゲームは止まらない。
- 全シーン終了でリザルト: **総得点 / 命中率 / ランク称号 / ハイスコア (localStorage)**。
- コンボは表示のみ (得点倍率なし)。得点は的の表示値がそのまま入る。

---

## フォルダ構成

```
src
├── config
│   └── GameConfig.ts        全定数の一元管理 (Data Driven)
├── core
│   ├── types.ts             共通型 (Vec3 / TargetStyle / StageEventKind ...)
│   ├── GameEngine.ts        ゲームループ統括・7シーン巡回・リザルト集計
│   ├── Camera.ts            論理カメラ (screenToRay / スクリーン投影)
│   ├── Player.ts            照準・スコア・発射数 (命中率)
│   ├── Sound.ts             WebAudio 効果音 (武器別発射音・イベント音)
│   ├── EventBus.ts          モジュール間通知
│   └── OneEuroFilter.ts     照準の平滑化
├── input
│   └── MediaPipeBridge.ts   MediaPipe 手指トラッキング
├── cursor
│   └── CursorController.ts  照準の平滑化・状態保持
├── weapon
│   ├── WeaponSpec.ts        ステージ別武器の性能定義 (6種)
│   ├── Projectile.ts        弾道 (重力倍率・空気抵抗・カーブ)
│   ├── ProjectileSystem.ts  発射・衝突判定 (球vs球)
│   └── AutoFireSystem.ts    カメラ操作時の自動連射
├── stage
│   ├── StageTemplate.ts     シーン共通インターフェース
│   └── templates/           7シーンの実体 (PracticePie / EggFarm / ...)
├── target
│   └── Target.ts            的1個の状態と被弾処理
├── score
│   └── ScoreManager.ts      スコア・コンボ・命中数
├── feedback
│   └── FeedbackManager.ts   命中マーカー・フローティングスコア・破片
├── render
│   ├── ThreeRenderer.ts     three.js 描画 (論理状態→シーン同期)
│   ├── TargetMeshFactory.ts 的スタイル別メッシュ生成 + プール
│   ├── scenes.ts            シーン装飾 (納屋・火山・ロケット・西部の町 ...)
│   ├── textures.ts          Canvas 手続き描画のテクスチャ (的アート・看板)
│   └── OverlayRenderer.ts   HUD 2Dオーバーレイ (照準・スコア・トレイル)
├── net
│   ├── RemoteHost.ts        ホスト側 PeerJS 接続
│   ├── RemoteController.ts  スマホ側 PeerJS 接続
│   └── messages.ts          通信メッセージ定義
└── ui
    ├── GameView.tsx         画面・開始操作・HUD・リザルト (React)
    ├── ControllerView.tsx   スマホ用コントローラ画面
    └── styles.css
```

## アーキテクチャの要点

- **論理と描画の分離**: ゲームロジックは独自の3D座標系 (x右/y上/z奥+) で動き、
  `ThreeRenderer` が毎フレーム z→-z 変換で three.js シーンへ同期するだけ。
  当たり判定は球vs球の HitScan ではなく実弾道 (`ProjectileSystem`)。
- **Data Driven**: シーン配置・得点・武器性能は `GameConfig.ts` / `WeaponSpec.ts` に集約。
- **StageTemplate**: シーンごとの出現・移動・ギミックはテンプレート内に閉じ、
  `consumeEvents()` で「起きた出来事」(扉・噴火・ロケット等) をエンジンに伝えて
  効果音・演出につなげる。
- **素材レス**: 的の絵・看板・建物・効果音はすべて実行時の手続き生成
  (Canvas 2D テクスチャ + three.js プリミティブ + WebAudio)。

## 技術スタック

- React + TypeScript + Vite
- three.js (WebGL 描画)
- MediaPipe Tasks Vision (Hand Landmarker, CDN 配信)
- PeerJS (スマホコントローラ接続) + qrcode
- GitHub Pages (配信)
