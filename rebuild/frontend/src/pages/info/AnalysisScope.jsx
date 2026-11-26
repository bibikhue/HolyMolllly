import "./AnalysisScope.css";

function AnalysisScope() {
  return (
    <article className="scope-page">
      <header>
        <h1>분석 범위 안내</h1>
        <p>화면에 표시된 조건을 함께 확인하면 분석 결과를 더 정확히 읽을 수 있습니다.</p>
      </header>
      <ol>
        <li><span>01</span><section><h2>다루는 정보</h2><p>부산의 외국인 관광과 관련된 방문, 소비, 관광 정보를 다룹니다.</p></section></li>
        <li><span>02</span><section><h2>화면별 기준</h2><p>데이터의 기간, 지역 범위, 집계 단위가 다를 수 있으므로 각 차트의 표시 기준을 확인해 주세요.</p></section></li>
        <li><span>03</span><section><h2>결과 해석</h2><p>예측과 추천 결과는 분석 조건에 따른 참고 정보이며 실제 결과를 보장하지 않습니다.</p></section></li>
      </ol>
    </article>
  );
}

export default AnalysisScope;
