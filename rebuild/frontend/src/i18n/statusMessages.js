export const statusMessages = `visitLeaderSummary|{{country}} has the largest country share of visits at {{share}}.|訪問割合は{{country}}が{{share}}で国別最大です。|{{country}}的到访占比最高，为{{share}}。|{{country}}的到訪占比最高，為{{share}}。
salesLeaderSummary|{{country}} has the largest country share of spending at {{share}}.|消費割合は{{country}}が{{share}}で国別最大です。|{{country}}的消费占比最高，为{{share}}。|{{country}}的消費占比最高，為{{share}}。
부산 전체 · 방문은 구·군 합산으로 중복될 수 있습니다. 관광소비액은 일반 관광소비 기준입니다.|All Busan. Visits summed across districts may overlap. Spending uses general tourism statistics.|釜山全体。区郡合算の訪問数は重複する場合があります。消費は一般観光消費統計です。|釜山全域。各区郡到访合计可能重复，消费为一般旅游消费统计。|釜山全域。各區郡到訪合計可能重複，消費為一般旅遊消費統計。
리포트 데이터를 확인할 수 없습니다.|Report data is unavailable.|レポートデータを確認できません。|无法读取报告数据。|無法讀取報告資料。
리포트를 불러오지 못했습니다. 다시 시도해 주세요.|Could not load the report. Please try again.|レポートを読み込めませんでした。再度お試しください。|报告加载失败，请重试。|報告載入失敗，請重試。
챗봇 사용 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.|Chat usage limit reached. Try again later.|利用上限に達しました。しばらくして再度お試しください。|聊天使用已达上限，请稍后重试。|聊天使用已達上限，請稍後重試。
데이터 질문 이용 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.|Data question limit reached. Try again later.|データ質問の上限に達しました。しばらくして再度お試しください。|数据问答已达使用上限，请稍后重试。|資料問答已達使用上限，請稍後重試。
챗봇 응답 시간이 초과되었습니다. 다시 시도해 주세요.|The response timed out. Please try again.|応答がタイムアウトしました。再度お試しください。|回答超时，请重试。|回答逾時，請重試。
챗봇 API 키가 설정되지 않았습니다.|The assistant is not configured yet.|アシスタントはまだ設定されていません。|助手尚未配置。|助理尚未設定。
OpenAI 응답을 받지 못했습니다. API 키와 모델 설정을 확인해 주세요.|The assistant could not respond. Please try again later.|回答を取得できませんでした。しばらくして再度お試しください。|助手暂时无法回答，请稍后重试。|助理暫時無法回答，請稍後重試。
분석 결과가 너무 큽니다. 질문 범위를 좁혀 주세요.|The result is too large. Narrow your question.|結果が大きすぎます。質問の範囲を絞ってください。|分析结果过大，请缩小问题范围。|分析結果過大，請縮小問題範圍。
관광 데이터 DB 분석|Tourism database analysis|観光データベース分析|旅游数据库分析|觀光資料庫分析
행사 기획 DB 분석|Event planning data analysis|イベント企画データ分析|活动策划数据分析|活動規劃資料分析
국가별 방문 및 소비 · 기본|Visits & spending · Overview|訪問・消費・基本|到访与消费 · 基本|到訪與消費 · 基本
국가별 방문 및 소비 · 상세|Visits & spending · Details|訪問・消費・詳細|到访与消费 · 详细|到訪與消費 · 詳細
외지인 성별·연령별 방문 현황|Domestic visitor demographics|域外国内客の性別・年齢別訪問|外地本国游客性别年龄到访统计|外地本國旅客性別年齡到訪統計
Copyright © 2026 팀 맙소사. All rights reserved.|Copyright © 2026 Team Mapsosa. All rights reserved.|Copyright © 2026 Team Mapsosa. All rights reserved.|Copyright © 2026 Mapsosa团队。保留所有权利。|Copyright © 2026 Mapsosa團隊。保留所有權利。`.split("\n").map((line) => line.split("|"));
