import React, { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { GizmoHelper, GizmoViewport, KeyboardControls } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import Room from './components/Room';
import Judy from './components/Judy';
import Nick from './components/Nick';
import Lambo from './components/Lambo';
import CharacterController, { Controls } from './physics/CharacterController';
import Underground from './physics/Underground';
import Floor from './components/Floor';
import Scr_Start from './components/Scr_Start';
import Scr_CharacterSelect from './components/Scr_CharacterSelect';

export default function App() {
  // 키보드 컨트롤을 위한 맵을 정의합니다.
  const map = useMemo(() => [
    // 이동 (W, Q, S, E)
    { name: Controls.forward, keys: ['KeyW'] },
    { name: Controls.back, keys: ['KeyS'] },
    { name: Controls.left, keys: ['KeyQ'] },
    { name: Controls.right, keys: ['KeyE'] },
    { name: Controls.jump, keys: ['Space'] }, // 불필요한 'KeySpace' 값 제거
    // 달리기 (Shift)
    { name: Controls.run, keys: ['ShiftLeft', 'ShiftRight'] },
    // 화면 회전 (A, D)
    { name: Controls.rotateLeft, keys: ['KeyA'] },
    { name: Controls.rotateRight, keys: ['KeyD'] },
  ], []);

  // 디버그 모드 상태 (현재는 기능 없이 UI 토글용으로만 사용)
  const [isDebugMode, setIsDebugMode] = useState(false);

  // 앱 진행 상태 관리: 'start' -> 'select' -> 'playing'
  const [appState, setAppState] = useState('start');
  // 선택된 캐릭터 상태 (추후 다양한 캐릭터 렌더링에 활용)
  const [selectedCharacter, setSelectedCharacter] = useState('judy');

  return (
    <>
      <style>{`
        html, body, #root {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        * {
          box-sizing: border-box;
        }
      `}</style>
      <div style={{ width: '100vw', height: '100dvh', backgroundColor: '#f0f0f0' }}>
      {/* 1. 시작 화면 렌더링 */}
      {appState === 'start' && <Scr_Start onStart={() => setAppState('select')} />}
      {/* 2. 캐릭터 선택 화면 렌더링 */}
      {appState === 'select' && <Scr_CharacterSelect onSelect={(char) => { setSelectedCharacter(char); setAppState('playing'); }} />}

      {/* 앱 상태가 'start'가 아닐 때만 3D 렌더링 및 UI 컴포넌트를 마운트시킵니다. */}
      {appState !== 'start' && (
        <>
          {/* UI 영역 (Canvas 위에 절대 위치로 띄움) */}
          <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setIsDebugMode(!isDebugMode)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: isDebugMode ? '#ff4757' : '#ffffff',
                  color: isDebugMode ? '#ffffff' : '#333333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              >
                🔧 Debug: {isDebugMode ? 'ON' : 'OFF'}
              </button>

              <button
                onClick={() => setAppState('select')}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#ffffff',
                  color: '#333333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              >
                🗿 캐릭터 선택
              </button>
            </div>

            {/* 캐릭터 좌표를 실시간으로 보여줄 텍스트 영역 */}
            {isDebugMode && (
              <div
                id="debug-coords"
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: '#00ffcc',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  pointerEvents: 'none' /* 클릭 방지 */
                }}
              >
                X: 0.00 | Y: 0.00 | Z: 0.00
              </div>
            )}
          </div>

          {/* KeyboardControls로 Canvas를 감싸고, 위에서 정의한 key map을 전달합니다. */}
          <KeyboardControls map={map}>
            <Canvas shadows camera={{ fov: 60 }}>
              {/* 전체적인 밝기를 담당하는 기본 조명 */}
              <ambientLight intensity={1.5} />
              {/* 입체감과 그림자를 만들어주는 방향성 조명 */}
              <directionalLight position={[1, 10, 5]} intensity={2} castShadow />

              {/* Suspense는 내부 컴포넌트(모델 등)가 로드될 때까지 fallback을 보여줍니다. */}
              <Suspense fallback={null}>
                {/* 게임 플레이 상태가 아닐 때는 Physics(물리 엔진)를 정지하여 중력 및 충돌 연산을 멈춥니다. */}
                <Physics debug={isDebugMode} paused={appState !== 'playing'}>
                  <Room position={[0, -1, 0]} />
                      
                      {/* 바닥 타일 테스트 배치 */}
                      <Floor type={1} position={[0, -0.9, 0]} />

                      {/* 디버그 모드일 때만 표시되는 맵 측정/디버깅용 그리드 (바닥보다 살짝 위에 배치하여 겹침 방지) */}
                      {isDebugMode && <gridHelper args={[100, 100]} position={[0, 0.00001, 0]} />}

                  {/* 맵 밖으로 추락하는 객체를 리셋해주는 전역 데스존 센서 */}
                  <Underground position={[0, -10, 0]} />
                  <CharacterController isDebugMode={isDebugMode} isStarted={appState === 'playing'}>
                    {selectedCharacter === 'judy' && <Judy scale={0.8} />}
                    {selectedCharacter === 'nick' && <Nick scale={0.8} />}
                    {selectedCharacter === 'lambo' && <Lambo scale={0.8} />}
                  </CharacterController>
                </Physics>
              </Suspense>

              {isDebugMode && (
                <GizmoHelper alignment="top-right" margin={[80, 80]}>
                  <GizmoViewport axisColors={['red', 'green', 'blue']} labelColor="white" />
                </GizmoHelper>
              )}
            </Canvas>
          </KeyboardControls>
        </>
      )}
    </div>
    </>
  );
}