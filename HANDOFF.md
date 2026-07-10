# HANDOFF — セッション引継ぎメモ

最終更新: 2026-07-10 / 本家再現アップデート (得点体系・武器・練習・協力・フィナーレ) 済み

## プロジェクト概要
- トイ・ストーリー・マニア風 3Dシューティング (Web)。**世界観はオリジナル**(ディズニー素材は使わない)、ゲームシステムを本家級に再現するのが目的。
- 技術: React + TypeScript + Vite + Canvas 2D(自前透視投影) + MediaPipe(カメラ操作) + PeerJS(スマホ操作/WebRTC) + WebAudio。依存追加は最小方針。
- 公開: https://gamigamiigami.github.io/toy-mania-web/
  - `main` へ push → GitHub Actions (deploy.yml) が gh-pages ブランチへビルド出力を push → Pages 配信。
- 開発ブランチ: `claude/handoff-review-p1fav2`。運用: feature ブランチにコミット → main へマージ → 両方 push。
- デプロイ確認: github MCP の actions_list (出力が巨大なので保存ファイルを python で先頭だけパースする)。

## 現在のゲーム仕様 (実装済み)
- **操作**: ①スマホ=ジャイロ照準(yaw/pitch, 中央セットで基準化)+上スワイプ発射(斜め=カーブ)、②PCカメラ=指先2D+自動連射(0.5s)。最大4人対戦(P1シアン/P2ピンク/P3黄/P4緑)、色でカーソル/弾/スコア区別。
- **ライド構造**: ロビー(QR接続/時間・切替秒を数値入力)→「ライド出発」→ **練習ラウンド15秒(パイ投げ・得点持ち越しなし)** → **5ステージを1周**(各30秒デフォルト、移動中もゲーム継続)→ RIDE COMPLETE! リザルト(順位/👑/命中率/ハイスコアlocalStorage)。
- **得点体系 (本家準拠)**: 100 / 500 / 1000 / 2000 (ScoreTier)。全的に得点数字表示。**コンボ倍率は廃止**(本家に無いため)。当たり判定は甘め(hitboxMultiplier 0.95)、代わりに高得点の的ほど小さく・速い。
- **武器 (ステージごとに変化、本家再現)**: 練習=🥧パイ / ひな壇=🥚たまご / ギャラリー=🎯ダーツ(速く直線的) / オービット=⚾ボール / カーブ峡谷=⭕わなげ(遅く山なり・弾が大きい) / フィナーレ=🧲吸盤ダーツ。WeaponsConfig で speed/gravity/radius/絵文字を定義。Renderer が形状を描き分け。HUDチップとバナーに武器名表示。
- **ステージ5種** (STAGE_INFO順、テーマ色付き、数字キー1-5/下部バーで即切替=練習スキップ):
  1. tiers ひな壇ストリート (段々の台、奥ほど高得点)
  2. gallery 3層ギャラリー (スライド/ポップアップ/奥カルーセル)
  3. orbit 回転オービット塔 (柱の周りを水平周回、柱が弾を遮る)
  4. curve カーブ峡谷 (障害物の裏を輪投げの山なり+カーブで狙う)
  5. mole ビッグ・フィナーレ (モグラ+成長ターゲット+**残り10秒からボーナスタイム**: 全穴高速出没、得点500→1000→2000エスカレート=本家ウッディのボーナスラウンド)
- **ギミック**:
  - **固定トリガー(青パルスリング)**: ランダム青的を廃止し、各ステージ決まった場所に配置(FixedTrigger、8秒respawn)。撃つと1000点ボーナス噴出(BonusBurst)。
  - **協力ギミック**: 異なる2人が4秒以内に両方トリガーを撃つと特大ボーナス(2000点×10個)解放。GameEngine.recordTriggerHit → template.onCoopTrigger。
  - **5000点ストリーカー**: 16〜32秒間隔でたまに画面奥を高速横切り(StreakerSystem、GameEngine所有・テンプレート非依存)。
- **演出**: ステージ到着バナー(武器名つき)、残3秒赤パルス+tick音、1000点以上で画面シェイク、紙吹雪、ステージ色テーマ、ビネット、的の落ち影、起き上がり出現、割れる破片、SE。

## 主要ファイル
- `src/config/GameConfig.ts` — **全定数** (ScoreTier、WeaponsConfig、StagesConfig(trigger/finale含む)、StreakerConfig、CoopConfig)。調整はほぼここ。※旧TemplatesConfig/PhotoFarmConfig等の死に設定は削除済み。
- `src/core/GameEngine.ts` — ループ/ライド進行(startMatch→練習→advanceStage/endRun)/武器切替(setStage)/協力トリガー/ストリーカー。
- `src/stage/templates/` — Practice/Tiers/Gallery/OrbitTower/CurveCourse/MoleGrid + BonusBurst(spawnMega) + util(FixedTrigger) + index。
- `src/stage/Streaker.ts` — 5000点横切りボーナス。
- `src/ui/Renderer.ts` — 透視投影描画。弾種の描き分け(drawProjectileShape)、トリガーの青パルス(drawTriggerGlow)、全的の得点ラベル。
- `src/ui/GameView.tsx` — ホストUI。`src/ui/ControllerView.tsx` — スマホUI。
- `src/net/` — RemoteHost/RemoteController/messages。
- `public/scene/background.png, targets.png` — ユーザー提供画像。

## 既知の注意点
- 貼り付け画像はディスクに来ない → ユーザーにGitHub Webで `public/scene/` へアップしてもらう。
- iOSはジャイロ許可が必要(UIに手順表示済み)。PeerJSエラー時は画面にエラー種別+再接続ボタン。
- カメラ操作の指トラッキングはブレやすい(One Euroで軽減済み)。主役はスマホ操作。
- actions_list の結果は巨大 → 保存ファイルを `python3 -c "import json; ..."` でパース。

## 次にやる候補 (ユーザー選択待ち)
1. **ステージ専用背景** — 5ステージ分の背景画像スロット (`public/scene/stage-<name>.png` を Assets/Renderer で切替、無ければ現行farm画像にフォールバック)
2. **武器の手触り調整** — 実プレイのフィードバックを受けて WeaponsConfig の speed/gravity/radius を微調整
3. **協力ギミックの演出強化** — 達成時の専用バナー/SE
4. **トリガーの演出を場所固有に** — 「小屋の扉が開く」等、噴出位置や見た目をステージ固有に
- その他ユーザー傾向: 難易度・演出の手触りフィードバックに即応。デプロイ毎に「ハードリロードして試して」と案内。

## デプロイ手順 (毎回)
```
npm run build (tsc+vite 通ることを確認)
git add -A && git commit (日本語要約+Co-Authored/セッションURL) 
git push origin claude/handoff-review-p1fav2
git checkout main && git merge <branch> && git push origin main && git checkout <branch>
~60秒待って actions_list で success 確認 → ユーザーへ報告
```
