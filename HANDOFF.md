# HANDOFF — セッション引継ぎメモ

最終更新: 2026-07-07 / 最新main commit: `337b362` (デプロイ済み・成功確認済み)

## プロジェクト概要
- トイ・ストーリー・マニア風 3Dシューティング (Web)。**世界観はオリジナル**(ディズニー素材は使わない)、ゲームシステムを本家級に再現するのが目的。
- 技術: React + TypeScript + Vite + Canvas 2D(自前透視投影) + MediaPipe(カメラ操作) + PeerJS(スマホ操作/WebRTC) + WebAudio。依存追加は最小方針。
- 公開: https://gamigamiigami.github.io/toy-mania-web/
  - `main` へ push → GitHub Actions (deploy.yml) が gh-pages ブランチへビルド出力を push → Pages 配信。
- 開発ブランチ: `claude/optimistic-cerf-tkb1wz`。運用: feature ブランチにコミット → main へマージ → 両方 push。
- デプロイ確認: github MCP の actions_list (出力が巨大なので保存ファイルを python で先頭だけパースする)。

## 現在のゲーム仕様 (実装済み)
- **操作**: ①スマホ=ジャイロ照準(yaw/pitch, 中央セットで基準化)+上スワイプ発射(斜め=カーブ)、②PCカメラ=指先2D+自動連射(0.5s)。最大4人対戦(P1シアン/P2ピンク/P3黄/P4緑)、色でカーソル/弾/スコア区別。
- **ライド構造**: ロビー(QR接続/時間・切替秒を数値入力)→「ライド出発」→ **5ステージを1周**(各30秒デフォルト、移動中もゲーム継続、横回り込みトランジション)→ **RIDE COMPLETE!** リザルト(順位/👑/命中率/ハイスコアlocalStorage)→もう一回/ロビー。
- **ステージ5種** (STAGE_INFO順、テーマ色付き、数字キー1-5/下部バーで即切替):
  1. tiers ひな壇ストリート (段々の台、奥ほど高得点)
  2. gallery 3層ギャラリー (スライド/ポップアップ/奥カルーセル)
  3. orbit 回転オービット塔 (柱の周りを水平周回、柱が弾を遮る)
  4. curve カーブ峡谷 (障害物の裏をカーブで狙う)
  5. mole ビッグ・フィナーレ (モグラ+**成長ターゲット**=撃つほど+200点&縮小、最小で消滅→再出現)
- **ギミック**: 全ステージに**トリガー的(青)**→1000点ボーナス噴出(BonusBurst共通)。得点階層100/300/600/1000、的に得点数字表示(300以上)。コンボ倍率(4ヒット毎+0.5x、最大4x)。
- **演出**: ステージ到着バナー、残3秒赤パルス+tick音、600点以上で画面シェイク、紙吹雪、ステージ色テーマ、ビネット、的の落ち影、起き上がり出現、割れる破片、SE(発射/命中/ファンファーレ類)。
- **難易度**: hitboxMultiplier 0.5 / ballRadius 0.24 / 的小さめ(シビア判定はユーザー要望)。

## 主要ファイル
- `src/config/GameConfig.ts` — **全定数** (ステージパラメータ、STAGE_INFO、難易度、演出値)。調整はほぼここ。
- `src/core/GameEngine.ts` — ループ/ライド進行(startMatch/advanceStage/endRun/toLobby/selectStage)/プレイヤー管理/シェイク/tick。
- `src/core/{Camera,Player,Sound,Assets,OneEuroFilter}.ts`
- `src/stage/templates/` — Tiers/Gallery/OrbitTower/CurveCourse/MoleGrid + BonusBurst + util + index(ファクトリ)。
- `src/ui/Renderer.ts` — 透視投影描画(z順オクルージョン、障害物、ひな壇platform、影/ビネット/テーマ色)。
- `src/ui/GameView.tsx` — ホストUI(ロビー/HUD/バナー/リザルト)。`src/ui/ControllerView.tsx` — スマホUI(ジャイロ+スワイプパッド+ガイドライン)。
- `src/net/` — RemoteHost/RemoteController/messages (PeerJSランダムID、リトライ、assign)。
- `public/scene/background.png, targets.png` — ユーザー提供画像(背景と3x3的シート。iconRectsはGameConfigに解析済み座標)。

## 既知の注意点
- 貼り付け画像はディスクに来ない → ユーザーにGitHub Webで `public/scene/` へアップしてもらう。
- iOSはジャイロ許可が必要(UIに手順表示済み)。PeerJSエラー時は画面にエラー種別+再接続ボタン。
- カメラ操作の指トラッキングはブレやすい(One Euroで軽減済み)。主役はスマホ操作。
- actions_list の結果は巨大 → 保存ファイルを `python3 -c "import json; ..."` でパース。

## 次にやる候補 (ユーザー選択待ち)
1. **練習ラウンド** — 出発前の得点なしウォームアップ (本家再現)
2. **協力ギミック** — 2人が短時間に両方トリガーを撃つと特大ボーナス解放
3. **横切る5000点の特大ボーナス** — たまに高速通過
4. **ステージ専用背景** — 5ステージ分の背景画像スロット (`public/scene/stage-<name>.png` を Assets/Renderer で切替、無ければ現行farm画像にフォールバック)
- その他ユーザー傾向: 難易度・演出の手触りフィードバックに即応。デプロイ毎に「ハードリロードして試して」と案内。

## デプロイ手順 (毎回)
```
npm run build (tsc+vite 通ることを確認)
git add -A && git commit (日本語要約+Co-Authored/セッションURL) 
git push origin claude/optimistic-cerf-tkb1wz
git checkout main && git merge <branch> && git push origin main && git checkout <branch>
~60秒待って actions_list で success 確認 → ユーザーへ報告
```
