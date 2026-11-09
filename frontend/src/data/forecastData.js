import { demoMonths } from './visitorDemo.js'
import { addMonths, buildM1Rows } from './forecastM1.js'

export const FORECAST_COLUMNS = {
  forecasts: ['origin_month', 'target_month', 'horizon', 'country_code', 'model', 'forecast', 'lower_80', 'upper_80', 'lower_95', 'upper_95'],
  backtest: ['origin_month', 'target_month', 'horizon', 'country_code', 'model', 'forecast', 'actual'],
  accuracy: ['model', 'country_code', 'horizon', 'test_start', 'test_end', 'n', 'mape', 'rmse', 'mase', 'dm_pvalue_vs_m1'],
}

export const MODEL_NAMES = {
  M1: 'Seasonal naive · 전년 동월 기준선',
  M2: 'SARIMA·ETS',
  M3: 'SARIMAX · 검색지수·항공좌석',
  M4: '패널 ADL · 경제변수',
  M5: '패널 ADL · 통합',
  M6: '하향식',
  M7: 'LightGBM',
  M8: '단순평균 결합',
}

function cellsFromCsv(text) {
  const lines = []
  let row = [], cell = '', quoted = false
  const source = text.replace(/^\uFEFF/, '')
  for (let index = 0; index < source.length; index++) {
    const char = source[index]
    if (char === '"') {
      if (quoted && source[index + 1] === '"') { cell += '"'; index++ }
      else quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(cell); cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[index + 1] === '\n') index++
      row.push(cell)
      if (row.some(value => value.trim())) lines.push(row)
      row = []; cell = ''
    } else cell += char
  }
  if (quoted) throw new Error('CSV의 따옴표가 닫히지 않았습니다.')
  row.push(cell)
  if (row.some(value => value.trim())) lines.push(row)
  return lines
}

export function parseForecastCsv(text, kind) {
  const fields = FORECAST_COLUMNS[kind]
  if (!fields) throw new Error(`알 수 없는 예측 결과 유형: ${kind}`)
  const [header, ...lines] = cellsFromCsv(text)
  if (!header || header.length !== fields.length || header.some((field, index) => field.trim() !== fields[index])) {
    throw new Error(`${kind}.csv 열 이름 또는 순서가 결과 파일 양식과 다릅니다.`)
  }
  const integerFields = new Set(['horizon', 'n', 'forecast', 'actual', 'lower_80', 'upper_80', 'lower_95', 'upper_95'])
  const decimalFields = new Set(['mape', 'rmse', 'mase', 'dm_pvalue_vs_m1'])
  return lines.map((line, index) => {
    if (line.length !== fields.length) throw new Error(`${kind}.csv ${index + 2}행 열 수가 다릅니다.`)
    return Object.fromEntries(fields.map((field, fieldIndex) => {
      const value = line[fieldIndex].trim()
      if (field === 'dm_pvalue_vs_m1' && value === '') return [field, null]
      if (integerFields.has(field) || decimalFields.has(field)) {
        const numeric = Number(value)
        if (value === '' || !Number.isFinite(numeric) || (integerFields.has(field) && !Number.isSafeInteger(numeric))) {
          throw new Error(`${kind}.csv ${index + 2}행 ${field} 값이 숫자가 아닙니다.`)
        }
        return [field, numeric]
      }
      return [field, value]
    }))
  })
}

const validMonth = month => /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
const nonnegative = value => Number.isFinite(value) && value >= 0

function validateRows(kind, rows, countryCodes, originMonth) {
  const keys = new Set()
  for (const row of rows) {
    if (!countryCodes.includes(row.country_code) || !Object.hasOwn(MODEL_NAMES, row.model) ||
      !Number.isInteger(row.horizon) || row.horizon < 1 || row.horizon > 12) {
      throw new Error(`${kind}에 국가·모형·예측 기간 오류가 있습니다.`)
    }
    if (kind === 'accuracy') {
      if (!validMonth(row.test_start) || !validMonth(row.test_end) || row.test_start > row.test_end ||
        !Number.isSafeInteger(row.n) || row.n < 1 || !nonnegative(row.mape) || !nonnegative(row.rmse) ||
        !nonnegative(row.mase) || (row.dm_pvalue_vs_m1 !== null &&
          (!nonnegative(row.dm_pvalue_vs_m1) || row.dm_pvalue_vs_m1 > 1)) ||
        (row.model === 'M1' && row.dm_pvalue_vs_m1 !== null)) {
        throw new Error('accuracy에 검증 기간·지표 오류가 있습니다.')
      }
    } else {
      if (!validMonth(row.origin_month) || !validMonth(row.target_month) ||
        addMonths(row.origin_month, row.horizon) !== row.target_month ||
        !Number.isSafeInteger(row.forecast) || row.forecast <= 0) {
        throw new Error(`${kind}에 기준월·대상월·예측값 오류가 있습니다.`)
      }
      if (kind === 'forecasts') {
        if (row.origin_month !== originMonth ||
          !['lower_80', 'upper_80', 'lower_95', 'upper_95'].every(field => Number.isSafeInteger(row[field]) && row[field] >= 0) ||
          row.lower_95 > row.lower_80 || row.lower_80 > row.upper_80 || row.upper_80 > row.upper_95) {
          throw new Error('forecasts에 예측 기준월·80%·95% 범위 오류가 있습니다.')
        }
      } else if (!Number.isSafeInteger(row.actual) || row.actual <= 0) {
        throw new Error('backtest에 실제값 오류가 있습니다.')
      }
    }
    const key = kind === 'accuracy'
      ? [row.model, row.country_code, row.horizon, row.test_start, row.test_end].join('|')
      : [row.model, row.country_code, row.horizon, row.origin_month, row.target_month].join('|')
    if (keys.has(key)) throw new Error(`${kind}에 중복 행이 있습니다: ${key}`)
    keys.add(key)
  }
}

export function normalizeForecastData(external = {}, months = demoMonths) {
  const generated = buildM1Rows(months)
  const forecastRows = external.forecasts || []
  const backtestRows = external.backtest || []
  const accuracyRows = external.accuracy || []
  if ([...forecastRows, ...backtestRows, ...accuracyRows].some(row => row.model === 'M1')) {
    throw new Error('M1은 원자료에서 자동 계산하므로 CSV에 다시 넣지 않습니다.')
  }
  const forecasts = [...generated.forecasts, ...forecastRows]
  const backtest = [...generated.backtest, ...backtestRows]
  const accuracy = [...generated.accuracy, ...accuracyRows]
  validateRows('forecasts', forecasts, generated.countryCodes, generated.originMonth)
  validateRows('backtest', backtest, generated.countryCodes, generated.originMonth)
  validateRows('accuracy', accuracy, generated.countryCodes, generated.originMonth)
  for (const row of accuracyRows) {
    const matched = backtestRows.filter(item => item.model === row.model && item.country_code === row.country_code &&
      item.horizon === row.horizon && item.target_month >= row.test_start && item.target_month <= row.test_end)
      .sort((a, b) => a.target_month.localeCompare(b.target_month))
    if (matched.length !== row.n || matched[0]?.target_month !== row.test_start ||
      matched.at(-1)?.target_month !== row.test_end) {
      throw new Error(`accuracy와 backtest의 검증 사례가 다릅니다: ${row.model} ${row.country_code} h${row.horizon}`)
    }
  }
  const countryOptions = [{ code: 'ALL', name: '부산 전체', color: '#1687ca' },
    ...months[0].countries.map(({ code, name, color }) => ({ code, name, color }))]
  const modelOptions = Object.keys(MODEL_NAMES).filter(model => forecasts.some(row => row.model === model) || accuracy.some(row => row.model === model))
  return {
    isMock: true,
    sourceLabel: 'visitorDemo.js 방문객 예시 자료',
    asOf: generated.originMonth,
    history: [...months].sort((a, b) => a.month.localeCompare(b.month)),
    countryOptions, modelOptions, forecasts, backtest, accuracy,
  }
}

export function m1Improvement(row, accuracy) {
  if (row.model === 'M1') return 0
  const baseline = accuracy.find(item => item.model === 'M1' && item.country_code === row.country_code &&
    item.horizon === row.horizon && item.test_start === row.test_start && item.test_end === row.test_end && item.n === row.n)
  return baseline?.mape > 0 ? (1 - row.mape / baseline.mape) * 100 : null
}

export async function loadForecastData({ signal, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('CSV 파일을 읽을 수 없습니다.')
  const texts = await Promise.all(Object.keys(FORECAST_COLUMNS).map(async kind => {
    const response = await fetchImpl(`/data/forecast/${kind}.csv`, { signal, cache: 'no-store' })
    if (!response.ok) throw new Error(`${kind}.csv를 불러오지 못했습니다.`)
    return [kind, await response.text()]
  }))
  signal?.throwIfAborted()
  return normalizeForecastData(Object.fromEntries(texts.map(([kind, csv]) => [kind, parseForecastCsv(csv, kind)])))
}
