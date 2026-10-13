# 2026/10/23 神韻公益茶席講座｜獨立 GitHub 網站

本專案以 11/07 幸福茶席的手機優先版面架構為基礎，改為 10/23 袁倫祥醫師的健康分享活動。**原 11/07 倉庫與既有 10/23 Google 表單資料皆不修改。**

## 主要內容
- `index.html`：手機優先的活動介紹及報名頁
- `assets/style.css`：沿用 11/07 的視覺基礎
- `assets/app.js`：10/23 專用報名介面、UTM、Meta Pixel
- `assets/images/doctor.jpg`、`speaker.jpg`：來自使用者提供的 10/23 原始 INDEX
- `config.js`：10/23 既有 GAS /exec、活動代號及 Pixel
- `gas/Code.gs`：**在原版 10/23 Code.gs 上加上 GitHub 網站需要的 GET/POST 端點**，沿用原表單、原試算表與管理函式

## 重要：不能直接切換 FB 廣告網址
GitHub Pages 不能使用 `google.script.run`。必須由專案擁有者在**目前 10/23 GAS 專案**將 `gas/Code.gs` 更新並重新部署 **新版本**（不是重新建立專案，也不要執行 setupSystem 建立新表單）。

1. 保留原 GAS 專案及 Properties（FORM_ID、SHEET_ID），先備份現有 Code.gs。
2. 將此倉庫的 `gas/Code.gs` 覆蓋到原 10/23 GAS 專案的 Code.gs，保留原本的 Index.html。
3.「部署 → 管理部署作業 → 編輯 → 版本：新版本 → 部署」，確認使用原有 /exec URL。請勿新增、重建表單。
4. 到 GitHub 倉庫「Settings → Pages → Build and deployment → Deploy from a branch → main / (root)」，等網站啟用。
5. 使用不含私人資料的測試網址檢查表單欄位、UTM、Pixel。再完成一筆明確標記的測試報名，於「表單回應」「報名管理」「流量紀錄」確認成功，排除測試資料再統計。
6. **全部確認後**，才修改 Meta 廣告連結到新 GitHub Pages 網址。

## 廣告追蹤網址參數
```
utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}
```

## 注意
- 若 GAS 仍是舊版本，網站將引導回原本仍可報名的 GAS 頁面，避免顯示假成功。
- 10/23 原始活動資料、11/07 活動資料與 Meta Pixel ID 不變。
- 10/23 演講者職稱及圖片公開使用權，請活動方再次確認。
