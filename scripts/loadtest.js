import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const PROFILE = __ENV.PROFILE || 'standard'

const profiles = {
  smoke: {
    stages: [
      { duration: '10s', target: 5 },
      { duration: '20s', target: 5 },
      { duration: '5s', target: 0 },
    ],
  },
  standard: {
    stages: [
      { duration: '30s', target: 100 },
      { duration: '60s', target: 100 },
      { duration: '30s', target: 0 },
    ],
  },
  burst: {
    stages: [
      { duration: '10s', target: 200 },
      { duration: '30s', target: 200 },
      { duration: '10s', target: 0 },
    ],
  },
}

export const options = {
  ...profiles[PROFILE],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<800', 'p(99)<2000'],
    'http_req_duration{endpoint:stats}': ['p(95)<300'],
    'http_req_duration{endpoint:puzzle}': ['p(95)<500'],
    'http_req_duration{endpoint:definition}': ['p(95)<1500'],
    'http_req_duration{endpoint:definitions}': ['p(95)<2000'],
    rate_limited: ['rate<0.5'],
  },
}

const rateLimited = new Rate('rate_limited')
const cacheHitTrend = new Trend('puzzle_cached_ms')

const SAMPLE_DATES = [
  '2024-06-15',
  '2024-08-01',
  '2024-10-12',
  '2024-12-25',
  '2025-01-15',
  '2025-03-08',
  '2025-06-20',
  '2025-09-30',
  '2026-01-15',
  '2026-04-01',
]

const SAMPLE_WORDS = [
  'apple',
  'banana',
  'orange',
  'puzzle',
  'connections',
  'cipher',
  'gambit',
  'mug',
  'tome',
  'quill',
  'dapper',
  'whimsy',
  'voracious',
  'oblique',
  'serendipity',
  'ennui',
]

function pickWords(n) {
  const shuffled = [...SAMPLE_WORDS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

function classifyResponse(res) {
  rateLimited.add(res.status === 429)
  return res
}

export default function () {
  const dice = Math.random()

  if (dice < 0.1) {
    group('GET /api/stats', () => {
      const res = http.get(`${BASE_URL}/api/stats`, {
        tags: { endpoint: 'stats' },
      })
      classifyResponse(res)
      check(res, {
        'stats: 200': (r) => r.status === 200,
        'stats: has counts': (r) => {
          if (r.status !== 200) return false
          const body = r.json()
          return (
            typeof body.puzzles === 'number' &&
            typeof body.definitions === 'number'
          )
        },
      })
    })
  } else if (dice < 0.4) {
    group('GET /api/puzzle/:date', () => {
      const date = randomItem(SAMPLE_DATES)
      const res = http.get(`${BASE_URL}/api/puzzle/${date}`, {
        tags: { endpoint: 'puzzle' },
      })
      classifyResponse(res)
      cacheHitTrend.add(res.timings.duration)
      check(res, {
        'puzzle: 200 or 404': (r) => r.status === 200 || r.status === 404,
        'puzzle: shape ok when 200': (r) => {
          if (r.status !== 200) return true
          const body = r.json()
          return Array.isArray(body.categories) && body.categories.length === 4
        },
      })
    })
  } else if (dice < 0.8) {
    group('GET /api/definition/:word', () => {
      const word = randomItem(SAMPLE_WORDS)
      const res = http.get(`${BASE_URL}/api/definition/${word}`, {
        tags: { endpoint: 'definition' },
      })
      classifyResponse(res)
      check(res, {
        'definition: 200 or 429': (r) => r.status === 200 || r.status === 429,
        'definition: has definitions array': (r) => {
          if (r.status !== 200) return true
          return Array.isArray(r.json().definitions)
        },
      })
    })
  } else {
    group('POST /api/definitions', () => {
      const words = pickWords(8)
      const res = http.post(
        `${BASE_URL}/api/definitions`,
        JSON.stringify({ words }),
        {
          headers: { 'Content-Type': 'application/json' },
          tags: { endpoint: 'definitions' },
        },
      )
      classifyResponse(res)
      check(res, {
        'definitions: 200 or 429': (r) => r.status === 200 || r.status === 429,
        'definitions: has map': (r) => {
          if (r.status !== 200) return true
          return typeof r.json().definitions === 'object'
        },
      })
    })
  }

  sleep(Math.random() * 2 + 0.5)
}

export function handleSummary(data) {
  const m = data.metrics
  const fmt = (v) => (v === undefined ? 'n/a' : `${v.toFixed(0)}ms`)
  const pct = (v) => (v === undefined ? 'n/a' : `${(v * 100).toFixed(2)}%`)

  const lines = [
    '',
    `Profile: ${PROFILE}    Target: ${BASE_URL}`,
    '',
    `Total requests:   ${m.http_reqs?.values?.count ?? 0}`,
    `Failure rate:     ${pct(m.http_req_failed?.values?.rate)}`,
    `Rate-limited:     ${pct(m.rate_limited?.values?.rate)}`,
    '',
    `p50 duration:     ${fmt(m.http_req_duration?.values?.med)}`,
    `p95 duration:     ${fmt(m.http_req_duration?.values?.['p(95)'])}`,
    `p99 duration:     ${fmt(m.http_req_duration?.values?.['p(99)'])}`,
    '',
  ]

  return {
    stdout:
      lines.join('\n') + '\n--- per-endpoint p95 in the JSON summary ---\n',
    'loadtest-summary.json': JSON.stringify(data, null, 2),
  }
}
