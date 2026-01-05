# 実装計画: コードベースの分割とリファクタリング

## 目的
現在の単一ファイル (`organic_simulator.html`) に集約されたコードが冗長化し、保守性と可読性が低下しているため、JavaScriptコードを機能ごとに分割して管理しやすくする。これにより、「官能基が配置できない」などのバグの温床となっている複雑性を解消する。

## 分割方針
ES Modules (`import` / `export`) はローカル環境 (`file://`) での動作に制限があるため、従来の `<script src="">` による読み込み順序に依存した分割を採用する。グローバル変数を共有することで、既存ロジックへの影響を最小限に抑える。

## ファイル構成
`js/` ディレクトリを作成し、以下のファイルを配置する。

1.  **`js/constants.js`**
    *   定数定義: `GRID_SIZE`, `ATOM_SIZE`, `VALENCY`, `GROUPS`, `MOLECULE_DB`
2.  **`js/state.js`**
    *   状態管理: `atoms`, `history`, `viewSettings`, `currentTool`, `reactionSelection` 等のグローバル変数
    *   履歴管理関数: `saveState`, `undo`, `redo`
3.  **`js/utils.js`**
    *   ヘルパー関数: `rotateGroupAtoms`, `getDistance` 等
4.  **`js/core.js`**
    *   基本操作: `createAtom`, `deleteAtom`, `createFunctionalGroup`
5.  **`js/render.js`**
    *   描画処理: `render`, `createLine`, `updateLogic` (描画更新に関する部分)
6.  **`js/reactions.js`**
    *   反応ロジック: `handleReactionClick`, `executeAdditionV2`, `executeDehydrationV2`, `executeOxidationV2`
7.  **`js/interaction.js`**
    *   イベントハンドラ: `handleDrop`, `handlePantryDragStart`, `handleCanvasMouseDown`, `startDrag`
8.  **`js/ui.js`**
    *   UI操作: `setTool`, `toggleView`, `fillHydrogen` 等
9.  **`js/main.js`**
    *   エントリーポイント: `window.onload`, イベントリスナー登録

## 実行手順

1.  **ディレクトリ作成**: `c:\Users\hashimoto\OneDrive\Desktop\chem_master\organic\js` を作成。
2.  **ファイル作成**: `organic_simulator.html` の `<script>` ブロックからコードを抽出し、各JSファイルに書き出す。
    *   順序依存があるため、`constants.js` -> `state.js` の順で整合性を保つ。
    *   **重要**: バグ修正済みの最新コード（Step 585時点）を使用する。
3.  **HTML修正**: `organic_simulator.html` 内のJSコードを削除し、`<script src="js/...">` タグを追加する。
4.  **動作確認**: リファクタリング後のアプリが正常に動作し、かつ「官能基配置バグ」が解消されているか確認する。

## 期待される効果
*   各機能が独立したファイルになるため、変数の定義場所やスコープが明確になる。
*   `handleDrop` や `createFunctionalGroup` 周りのロジックが整理され、バグの原因が特定しやすくなる（あるいは整理によって自然治癒する）。
*   将来的な機能追加（フェーズ3など）が容易になる。
