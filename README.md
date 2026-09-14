# RecipeAI Studio - レシピ自動作成・管理アプリ

YouTube動画やSNS・メモからAIがレシピを自動構造化し、直感的なUIでの管理・編集、フルスクリーン調理モード、買い物リスト生成までを一気通貫で提供するWebアプリケーションです。
**Supabase連携により、MacとiPad間でのデータリアルタイム自動同期に対応しています。**

---

## 🌟 主な機能

1. **Mac・iPad リアルタイムデータ同期（Supabase）**
   - **同期キー（合言葉）方式**: MacとiPadの設定画面に同じ同期キー（例: `my-kitchen-pass`）を入力するだけで、登録・編集したレシピやお気に入りが瞬時にクラウド同期されます。
   - **PWA対応**: iPadでSafariの「ホーム画面に追加」を行うと、ブラウザ枠のない全画面ネイティブアプリのような感覚で調理モードを利用可能。

2. **AIマルチソース解析・レシピ自動生成**
   - **YouTube動画**: 字幕（文字起こし）と概要欄を自動取得し、材料・分量・手順・調理テクニック・動画タイムスタンプを構造化抽出。
   - **相互クロスチェック機能**: 動画内発言と概要欄テキストの分量差分をAIが検知・自動補正。
   - **テキスト・メモ解析**: 口頭メモやSNSポストから食材・手順を抽出。
   - **AIゼロベース生成**: 「冷蔵庫にある豚肉とキャベツ」などのプロンプトからレシピを考案。

3. **直感的なレシピ管理＆整理**
   - **フォルダ・グループ分類**: パスタ系、鍋・汁物系など自由にグループ化。
   - **お気に入り機能**: ワンクリックでお気に入り登録、サイドバーから即座に絞り込み。
   - **インクリメンタル検索**: 料理名や食材名から即時フィルタリング。

4. **スマートな料理詳細ビュー（Bentoレイアウト）**
   - **人数コントローラー**: 人数（1人前・2人前...）に応じて食材の分量をリアルタイム自動計算。
   - **動画シーク連動**: 手順ごとのタイムスタンプをクリックすると該当秒数へ動画がジャンプ。
   - **マイアレンジ・料理メモ**: 自分好みの味付けや失敗のメモをインラインで直接編集・保存。
   - **食材編集**: 食材の追加・分量変更・削除をモーダルから編集可能。

5. **1画面収容・切れない鉄壁設計の調理モード（フルスクリーン）**
   - どんな画面サイズ（iPad、MacBook、ノートPC含む）でも画面内に収まるレスポンシブスプリット設計。
   - **インラインタイマー**: 手順ごとのタイマー（カウントダウン音付き）。
   - **大文字手順テキスト＆下処理ガイド**: 離れた場所からも見やすいハイコントラスト表示。
   - **キーボード操作**: `←` / `→` で工程移動、`Space` でタイマー開始/停止、`Esc` で閉じる。
   - **ダークモード / コンパクト表示** 切替対応。

6. **買い物リスト生成**
   - 必要な食材にチェックを入れ、ワンクリックでテキストとしてクリップボードにコピー。

---

## ☁️ Mac・iPad同期の設定手順（Supabase）

### 1. Supabase でテーブルを作成
1. [Supabaseダッシュボード](https://supabase.com/dashboard) を開き、プロジェクトを選択（または新規作成）。
2. 左メニューの **「SQL Editor」** を開きます。
3. プロジェクトルートにある [supabase_schema.sql](file:///Users/yoshidatomohiro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/second_brain/000.Inbox/Code-desktop/レシピ作成アプリ/supabase_schema.sql) の内容をコピー＆ペーストし、**「Run」** をクリックします。
   - `recipe_studio_recipes` テーブルと必要なインデックス、セキュリティポリシーが自動作成されます。

### 2. アプリ画面で同期キーを設定
1. RecipeAI Studio を開き、画面右上の **「⚙️ API設定」** をクリック。
2. 以下の3項目を入力して「設定を保存して同期開始」をクリックします：
   - **🔑 同期キー**: 任意の合言葉（例: `family-kitchen-777`）
   - **Supabase Project URL**: `https://xxxxxx.supabase.co`（Project Settings > API で確認可能）
   - **Supabase Anon Key**: `eyJhbGci...`（同上の公開キー）
3. **iPad側でも同様にアクセスし、全く同じ3項目を入力します。**
   - これにより、Macで登録したレシピがiPadにも即座に同期されます！

---

## 📱 iPadでの使い方（ホーム画面に追加）

1. iPadの Safari でアプリのURLを開きます。
2. 画面上部の共有ボタン（四角から上矢印が出ているアイコン）をタップ。
3. **「ホーム画面に追加」** を選択。
4. ホーム画面に専用アイコンが作成され、タップすると**アドレスバーのない全画面アプリ**として起動します。調理台に置いて大画面でタイマー・手順を確認できます。

---

## 🚀 GitHub Pages へのデプロイ手順

本リポジトリには GitHub Actions（`.github/workflows/deploy.yml`）が含まれており、GitHubにプッシュするだけで自動的に GitHub Pages にWebアプリが公開されます。

### ターミナルでの公開コマンド（1回のみ実行）:

```bash
# 1. git初期化とコミット
git init
git add .
git commit -m "feat: RecipeAI Studio with Mac-iPad sync & GitHub Pages deploy"

# 2. GitHubに新しいリポジトリを作成してプッシュ (GitHub CLIを使用する場合)
gh repo create recipe-ai-studio --public --source=. --remote=origin --push

# または、ブラウザのGitHubで「New repository」を作成してからURLを登録してプッシュ:
# git remote add origin https://github.com/<あなたのユーザー名>/recipe-ai-studio.git
# git branch -M main
# git push -u origin main
```

### GitHub Pages の有効化:
1. GitHubリポジトリの **Settings > Pages** を開きます。
2. **Build and deployment > Source** で **「GitHub Actions」** を選択します。
3. 数分後、自動デプロイが完了し、公開URL（例: `https://<ユーザー名>.github.io/recipe-ai-studio/`）が発行されます。
