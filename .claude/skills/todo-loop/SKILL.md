---
name: todo-loop
description: 未完了の TODO を1件ずつ、実装→AGENTS.md 更新→commit する
argument-hint: [TODO番号 | 範囲 (例: 14 ~ 17) (省略時は未完了すべて)]
allowed-tools: Bash(awk:*), Bash(head:*), Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*), Skill, Read, Glob, Grep, Edit, Write, AskUserQuestion
---

## 対象
$ARGUMENTS

## 未完了のTODOファイル（最大30件）
!`awk 'FNR==1{c=0} /^[\140][\140][\140]/{c=!c;next} !c&&/^- \[ \]/&&!s[FILENAME]++{print FILENAME}' todo/*-todo.md | head -30`

## 手順
1. 対象の TODO を決める
   - 「対象」に番号や範囲があれば、その番号だけが対象 (`14` → 00014、`14 ~ 17` / `14-17` / `14..17` → 00014 から 00017 まで。5桁ゼロ埋め)。範囲内にファイルがない番号は飛ばす
   - 「対象」が空なら、上記一覧すべてが対象
   - 対象のうち未完了(上記一覧にあるもの)を番号の小さい順に処理する。一覧にない(完了済みの)番号は飛ばす
   - 対象が空なら、その旨を報告して終了する
2. 対象の各 TODO を読み、未完了が lint や e2e テストなどの最終確認の項目だけなら、実装するものはないので飛ばす(報告に「最終確認のみのため skip」と書く)
3. 残りを番号の小さい順に、次を1サイクルとして繰り返す
   1. Skill ツールで `todo-next` を実行し、その TODO を1件実装する(ファイルパスを引数に渡す)
   2. Skill ツールで `update-agents-md` を実行し、AGENTS.md の更新と git commit をまとめて行う

## 止める条件
- `todo-next` が AskUserQuestion で質問したとき: 回答を受けてから続ける
- テストが失敗したとき: commit せず、そこで止めて報告する
- コミットすべきでないファイル(`.env` など)が見つかったとき: commit せず、そこで止めて報告する

## ルール
- 1サイクルで実装するのは TODO 1件だけ。commit を挟まずに次の TODO へ進まない
- 範囲指定のときは、範囲外の TODO に進まない
- push はしない

## 報告
報告・質問は日本語で書く。

- 処理した TODO ファイルと、それぞれの commit
- 止まった場合はその理由と、残りの未完了 TODO
