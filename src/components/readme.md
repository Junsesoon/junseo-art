# 📂 components
* modified at: 2026-06-17

* 이 폴더는 3D 객체(방, 가구, 캐릭터 등) 및 UI 요소들을 독립적인 **React 컴포넌트** 단위로 분리하여 관리하는 용도로 사용됩니다
* ⚠️3D 모델(GLB)을 불러오는 컴포넌트를 새로 작성할 때는, 렌더링 성능 향상과 화면 끊김 현상 방지를 위해 파일 하단에 `useGLTF.preload()`를 사용하여 에셋을 미리 캐싱(Preload)하는 것을 권장합니다

# files
* `Room.jsx`: 최적화된 방 3D 모델(`room-opt.glb`)을 비동기적으로 불러와 화면에 렌더링하는 예시용 컴포넌트
* `Judy.jsx`: Judy 캐릭터 모델(`judy_police.glb`)을 불러오고 대기(Idle) 애니메이션을 재생하여 렌더링하는 캐릭터 컴포넌트
* `Floor.jsx`: `type` 속성에 따라 동적으로 타일 모델(`tile{type}-opt.glb`)을 불러오며, 맵 곳곳에 반복 배치할 수 있도록 `<Clone>`을 사용해 메모리를 최적화한 바닥 물리 컴포넌트
* `Scr_Start.jsx`: 앱 진입 시 가장 먼저 표시되는 시작 화면 UI 컴포넌트
* `Scr_CharacterSelect.jsx`: 시작하기 버튼을 누른 후 메인 씬 진입 전 캐릭터를 고를 수 있도록 제공되는 캐릭터 선택 창 UI 컴포넌트