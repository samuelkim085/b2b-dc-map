# B2B / B2C 데이터 모드 토글 설계

Date: 2026-03-26

## 목적

기존 B2B 출하 데이터(건별 레코드)와 신규 B2C 데이터(주별 집계)를 AppBar 토글로 전환할 수 있게 한다. B2C 모드에서는 choropleth만 활성화되고 DC 마커/zip dots/flow 등 B2B 전용 레이어는 숨긴다.

## 데이터

- B2B: `public/data/shipments.csv` (기존 그대로)
- B2C: `public/data/b2c_qty_by_state_2025.csv` (`ship_to_state`, `total_qty` 컬럼)

## 신규 파일

- `src/hooks/useB2cData.ts` — B2C CSV fetch + 파싱 → `Record<string, number>`

## 변경 파일

### App.tsx
- `dataMode: 'b2b' | 'b2c'` state 추가
- `useB2cData` 훅 호출 (항상 로드)
- `dataMode` + `b2cVolumes`를 `ShipmentsMap`, `FilterPanel`에 prop 전달

### AppBar.tsx
- 우측에 `B2B | B2C` 세그먼트 버튼 추가
- `dataMode`, `onDataModeChange` props 수신

### ShipmentsMap.tsx
- choropleth volumes: B2C 모드면 `b2cVolumes` 직접 사용, B2B면 `buildStateVolumes(filteredRecords)`
- DC 마커, zip dots, flow 레이어: `dataMode === 'b2c'`이면 렌더링 스킵

### FilterPanel.tsx
- `dataMode` prop 추가
- B2C 모드 시 숨기는 섹션: `dcLocations`, `radiusRing`, `flowLayer`, `markerStyle`
- `qtyByState` 섹션 내 고객 필터 드롭다운도 숨김
- `appearance`, `mapView`는 항상 표시

## 비변경 범위

- `useShipmentsData`, `choropleth.ts`, `markerLayout.ts`, `FlowLayer.tsx` — 내부 로직 변경 없음
- `AppSettings` / localStorage — 모드 상태는 세션 내 state로만 유지 (비영속)
