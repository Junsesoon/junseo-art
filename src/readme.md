# 📂 src
* modified at: 2026-06-15

* 이 폴더는 **프론트엔드 애플리케이션의 핵심 소스 코드(React, Three.js 등)**를 보관하는 용도로 사용됩니다
* ⚠️브라우저에서 실행되는 클라이언트 측 코드 위주로 작성되어야 하며, 용량이 큰 원본 3D 모델이나 텍스처 파일은 이곳이 아닌 최상단 `asset-raw/` 폴더에서 관리해야 합니다

# folder structure
* `components/`: 3D 객체(방, 캐릭터 등) 및 UI를 구성하는 독립적인 React 컴포넌트 모음
* `physics/`: 물리 엔진 관련 로직 및 컴포넌트 모음
* `scripts/`: 자동화 유틸리티 스크립트 모음

# files
* `App.jsx`: 3D 씬(`<Canvas>`), 조명, 카메라, 컨트롤러 등 앱의 전반적인 환경을 설정하는 최상위 컴포넌트
* `main.jsx`: `App.jsx`를 가져와 `index.html`의 DOM 영역(`<div id="root">`)에 렌더링하는 최초 진입점