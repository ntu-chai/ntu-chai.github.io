---
title: 代理環境
subtitle: AI 代理人、對齊沙盒與人文工具鏈
lede: 實驗室在人文學者設計的環境中建構並運行 AI 代理人，而非反之。合作專案中的 Pillar 2 Agentic digital humanities 就在這裡實作。
principles:
  - letter: 原則 A
    title: "詮釋循環：非線性管線"
    body: 人文研究並非單向層層疊加。工作流設計應該呼應思維上的回環往復。
    items:
      - 偏離傳統 RAG 的線性預設
      - 強調質疑與修正的動態循環
      - 支援從任一層級回流調整
  - letter: 原則 B
    title: 評論員（Critic）
    body: Critic 獨立常駐，擁有專屬模型與工具集（如：反向檢索、版本核對）。
    items:
      - 輸出必須通過評論員審核才可寫入記憶
      - 結構性對抗幻覺（Hallucination）
  - letter: 原則 C
    title: 強制出處紀錄
    body: "軌跡記錄：agent_id, prompt_hash, source_ids, version。"
    items:
      - 學術倫理的程式碼化
      - 無出處主張不可被論述組徵引
  - letter: 原則 D
    title: 專家代理人（Expert）
    body: 針對不同領域設計領域專業化專家代理人，如設置專門處理古籍經典的 Philologist Agent。
    items:
      - 拒絕通用型 LLM 直接餵食所有文本
      - 發揮文學院獨有的特色技術貢獻
hermeneutic_loop:
  researcher: 研究者
  researcher_sub: 提問、判斷、修正
  editor: 主編 Agent
  editor_sub: 規劃、調度、狀態追蹤
  critic: 質疑員 Agent
  critic_sub: 核查、駁斥、防杜幻覺
  experts_label: 專家 Agents
  experts:
    - name: 取材組
      sub: 建庫與校讎
    - name: 閱讀組
      sub: 近讀與遠讀
    - name: 詮釋組
      sub: 翻譯與圖譜
    - name: 論述組
      sub: 草擬與徵引
  sources_label: 來源層
  sources_sub: 文獻、影像、語料
  memory_label: 語義記憶
  memory_sub: 向量索引 + 知識圖譜
  provenance_label: 出處紀錄
  provenance_sub: 主張與來源（歸因追蹤）
media:
  - placement: bottom
    kicker: CHAI 未來實驗室
    title: 走進代理人時代的人文實驗室
    src: assets/media/chai-promo-4k-trip.mp4
    alt: CHAI 未來實驗室解說短片。
    caption: 一支短片走訪代理人時代的人文實驗室：空間、團隊、與正在運作中的代理人。
    credit: CHAI 未來實驗室 · 2026 短片
---


<!-- ## 人文研究 Agent 的四大核心設計原則

延展 *The AI-Augmented Research Process: A Historian's Perspective* 的概念，
我們立基於四大核心於原則的詮釋循環系統架構，將研究者、主編、質疑員與專家代理人組成一個非線性的閱讀—詮釋—論述循環，並確保所有產出皆有可追溯的出處紀錄。

## AI 對齊沙盒

我們的核心代理環境是一個字面意義上的「沙盒」：一個受控的空間，讓人文學者能在模型面對世界之前，先親自戳、推、施壓、測試。 -->

