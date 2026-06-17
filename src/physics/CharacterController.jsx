import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useRapier, RigidBody, CapsuleCollider, CuboidCollider } from '@react-three/rapier';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';

// 키보드 액션에 대한 열거형(enum)을 정의합니다.
export const Controls = {
  forward: 'forward',
  back: 'back',
  left: 'left',
  right: 'right',
  jump: 'jump',
  down: 'down',
  rotateLeft: 'rotateLeft',
  rotateRight: 'rotateRight',
  run: 'run',
};

// 키보드 컨트롤을 위한 맵을 정의합니다.
// App.jsx에서 KeyboardControls 컴포넌트에 전달하여 사용합니다.
export const keyboardMap = [
  // 이동 (W, Q, S, E)
  { name: Controls.forward, keys: ['KeyW'] },
  { name: Controls.back, keys: ['KeyS'] },
  { name: Controls.left, keys: ['KeyQ'] }, // 좌측 이동 (스트레이프)
  { name: Controls.right, keys: ['KeyE'] }, // 우측 이동 (스트레이프)
  { name: Controls.jump, keys: ['Space'] },
  { name: Controls.down, keys: ['ControlLeft', 'ControlRight'] }, // 하강 (Ctrl)
  { name: Controls.run, keys: ['ShiftLeft', 'ShiftRight'] }, // 달리기 (Shift)
  { name: Controls.rotateLeft, keys: ['KeyA'] }, // 시점 회전 (좌)
  { name: Controls.rotateRight, keys: ['KeyD'] }, // 시점 회전 (우)
];

export default function CharacterController({ children, speed = 4, jumpHeight = 0.4, isDebugMode, isStarted = true, gravityMode = 'default', ...props }) {
  const body = useRef();
  const character = useRef(); // 캐릭터 모델을 감싸는 group의 ref
  const { rapier, world } = useRapier();
  const [sub, get] = useKeyboardControls();
  const { camera, gl } = useThree();

  // 콜라이더의 크기와 모델의 위치를 동적으로 설정하기 위한 상태
  const [colliderProps, setColliderProps] = useState({
    type: 'capsule', // 'capsule' 또는 'cuboid'
    args: [0.4, 0.4], // 초기값: [반높이, 반지름] 또는 [x, y, z]
    offset: -0.8, // 모델의 Y축 오프셋
  });

  // 캐릭터 모델의 크기를 측정하여 콜라이더를 자동으로 맞추는 로직
  useLayoutEffect(() => {
    if (character.current) {
      // 모델이 로드될 때까지 기다립니다.
      const model = character.current.children[0];
      // 💡 children이 유효한 리액트 엘리먼트가 아닐 경우(false 등) .type 접근 에러가 발생하므로,
      //    React.isValidElement로 방어 코드를 추가합니다.
      if (model && React.isValidElement(children)) {
        // 부모(RigidBody 등)의 위치나 이전 렌더링에서 적용된 offset의 영향을 받지 않도록
        // 잠시 부모와의 연결을 끊고 순수한 모델만의 Transform(scale 등)을 기준으로 측정합니다.
        const parent = model.parent;
        model.parent = null;
        model.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const bottomY = box.min.y;

        // 측정 후 다시 원래 부모에게 복구합니다.
        model.parent = parent;

        // 자식 컴포넌트의 이름(Lambo)을 확인하여 콜라이더 타입을 결정합니다.
        if (children.type.name === 'Lambo') {
          // 차량 모델의 경우, Box 형태의 CuboidCollider를 사용합니다.
          const halfSize = size.clone().multiplyScalar(0.5);
          setColliderProps({
            type: 'cuboid',
            args: [halfSize.x, halfSize.y, halfSize.z],
            // 콜라이더의 중심이 모델의 중심에 오도록 offset을 조정합니다.
            offset: -bottomY - halfSize.y,
          });
        } else {
          // 사람 캐릭터의 경우, CapsuleCollider를 사용합니다.
          const height = size.y;
          const radius = (size.x + size.z) / 4; // 너비와 깊이의 평균으로 반지름 추정
          const halfHeight = Math.max(0, height / 2 - radius);
          
          setColliderProps({
            type: 'capsule',
            args: [halfHeight, radius],
            offset: -(halfHeight + radius) - bottomY,
          });
        }
      }
    }
  }, [children]); // 자식 모델이 변경될 때마다 재계산

  // 마우스 회전(시점) 상태를 저장할 참조 객체입니다.
  const rotation = useRef({ yaw: Math.PI, pitch: 0 }); // 초기 yaw를 PI로 설정하여 캐릭터의 뒷모습에서 시작
  const characterYaw = useRef(Math.PI); // 캐릭터의 실제 연속 회전값

  // 점프 선입력(Jump Buffer)을 위해 마지막으로 점프키를 누른 시간을 기록합니다.
  const jumpPressedTime = useRef(0);
  const wasGrounded = useRef(false); // 이전 접지 상태를 저장하기 위한 ref
  const cameraTarget = useRef(new THREE.Vector3()); // 카메라 시점(LookAt)을 부드럽게 만들기 위한 보간용 벡터

  // 카메라 줌(거리) 상태를 관리하기 위한 ref
  const targetDistance = useRef(5);
  const currentDistance = useRef(5);

  // 무중력 모드에서 사용할 이동 방향 토글 상태
  const toggledMove = useRef({ forward: false, back: false, left: false, right: false, jump: false, down: false });
  const holdToReverseTimeout = useRef({}); // 반대키 홀드->방향전환을 위한 타이머 ref
  const potentialStop = useRef({}); // 같은 방향키 탭->정지를 위한 상태 ref

  // --- 브라우저 기본 단축키 방지 ---
  useEffect(() => {
    const preventBrowserShortcuts = (e) => {
      // Ctrl 키와 게임 조작키(W, A, S, D, Q, E)를 함께 누를 때 발생하는 브라우저 기본 동작(북마크 추가 등)을 막습니다.
      if (e.ctrlKey && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE'].includes(e.code)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', preventBrowserShortcuts);
    return () => window.removeEventListener('keydown', preventBrowserShortcuts);
  }, []);

  // --- 키 입력 처리 (점프 선입력 및 무중력 토글) ---
  useEffect(() => {
    // 이 효과는 중력 모드가 변경될 때마다 키 입력 방식을 전환합니다.
    const handleKeyPress = (key, pressed, oppositeKey) => {
      // 일반 중력 모드 처리
      if (gravityMode !== 'none') {
        if (key === 'jump' && pressed) {
          jumpPressedTime.current = performance.now();
        }
        return;
      }

      // --- 무중력 모드 처리 ---
      if (pressed) {
        const isCurrentMoving = toggledMove.current[key];
        if (oppositeKey && toggledMove.current[oppositeKey]) {
          // Case 1: 반대 방향으로 이동 중일 때 -> '정지 후 방향 전환' 로직
          // 즉시 반대 방향 움직임을 멈춥니다.
          toggledMove.current[oppositeKey] = false;
          // 타이머를 설정하여, 키를 계속 누르고 있으면(hold) 현재 방향으로 이동을 시작합니다.
          holdToReverseTimeout.current[key] = setTimeout(() => {
            toggledMove.current[key] = true;
            delete holdToReverseTimeout.current[key];
          }, 150); // 홀드 판정 시간 (ms)
        } else if (isCurrentMoving) {
          // Case 2: 같은 방향으로 이미 이동 중일 때 -> '탭하여 정지' 로직
          // 키를 누른 시간을 기록하여, 키를 뗄 때 탭인지 홀드인지 판단합니다.
          potentialStop.current[key] = performance.now();
        } else {
          // Case 3: 정지 상태에서 -> 즉시 이동 시작
          toggledMove.current[key] = true;
        }
      } else {
        // 키를 뗀 경우
        // 1. '홀드하여 방향 전환' 타이머가 있다면 취소합니다. (반대키 탭)
        if (holdToReverseTimeout.current[key]) {
          clearTimeout(holdToReverseTimeout.current[key]);
          delete holdToReverseTimeout.current[key];
        }
        // 2. '탭하여 정지' 상태였다면, 누른 시간을 계산하여 정지 여부를 결정합니다.
        if (potentialStop.current[key]) {
          const pressDuration = performance.now() - potentialStop.current[key];
          if (pressDuration < 150) { // 0.15초 미만으로 눌렀다 뗐다면 (탭)
            toggledMove.current[key] = false; // 이동을 멈춥니다.
          }
          // 홀드였다면 아무것도 하지 않아 이동이 유지됩니다.
          delete potentialStop.current[key];
        }
      }
    };

    const unsubForward = sub((state) => state.forward, (p) => handleKeyPress('forward', p, 'back'));
    const unsubBack = sub((state) => state.back, (p) => handleKeyPress('back', p, 'forward'));
    const unsubLeft = sub((state) => state.left, (p) => handleKeyPress('left', p, 'right'));
    const unsubRight = sub((state) => state.right, (p) => handleKeyPress('right', p, 'left'));
    const unsubJump = sub((state) => state.jump, (p) => handleKeyPress('jump', p, 'down'));
    const unsubDown = sub((state) => state.down, (p) => handleKeyPress('down', p, 'jump'));

    return () => {
      [unsubForward, unsubBack, unsubLeft, unsubRight, unsubJump, unsubDown].forEach((unsub) => unsub());
      // 모드가 변경될 때 모든 토글 상태와 타이머를 초기화합니다.
      Object.keys(toggledMove.current).forEach(key => {
        toggledMove.current[key] = false;
      });
      Object.values(holdToReverseTimeout.current).forEach(clearTimeout);
      holdToReverseTimeout.current = {};
      potentialStop.current = {};
    };
  }, [sub, gravityMode]);

  // --- 마우스 휠 줌인/아웃 (카메라 거리 조절) ---
  useEffect(() => {
    const handleWheel = (e) => {
      // 휠을 굴리는 방향에 따라 목표 거리를 증감시킵니다.
      const zoomSpeed = 0.005; 
      let newDist = targetDistance.current + e.deltaY * zoomSpeed;
      // 카메라가 캐릭터를 파고들거나 너무 멀어지지 않도록 거리를 2~10 사이로 제한(Clamp)합니다.
      targetDistance.current = Math.max(2, Math.min(10, newDist));
    };

    const canvasEl = gl.domElement;
    canvasEl.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      canvasEl.removeEventListener('wheel', handleWheel);
    };
  }, [gl.domElement]);

  useFrame((state, delta) => {
    if (!body.current || !character.current) return;

    const bodyPosition = body.current.translation();

    // --- 1. 키 입력 및 방향 계산 ---
    // 게임 시작 전(!isStarted)에는 입력을 무시하도록 빈 객체를 반환합니다.
    const { forward, back, left, right, down, jump, rotateLeft, rotateRight, run } = isStarted ? get() : {};
    const velocity = body.current.linvel();

    // --- 2. 시점(카메라 및 캐릭터) 회전 로직 (A/D 키 입력) ---
    const lookSpeed = 2.0; // 시점 회전 속도 (필요시 조절)
    
    // 뒤로 이동 중일 때는 자연스러운 조향을 위해 좌우 회전 방향을 반전시킵니다.
    const isMovingBack = back && !forward;
    const currentLookSpeed = isMovingBack ? -lookSpeed : lookSpeed;

    if (rotateLeft) characterYaw.current += currentLookSpeed * delta;
    if (rotateRight) characterYaw.current -= currentLookSpeed * delta;

    // 카메라의 현재 회전각(yaw)을 캐릭터의 실제 회전각으로 부드럽게 보간(lerp)합니다.
    // 미세한 떨림(Jitter)을 방지하기 위해 각도 차이가 매우 작으면 목표값으로 스냅(Snap)합니다.
    if (Math.abs(rotation.current.yaw - characterYaw.current) < 0.001) {
      rotation.current.yaw = characterYaw.current;
    } else {
      rotation.current.yaw = THREE.MathUtils.lerp(rotation.current.yaw, characterYaw.current, delta * 10);
    }

    // 캐릭터 모델의 Y축 회전을 실제 회전각과 동기화하여 부드럽게 회전시킵니다.
    character.current.rotation.y = characterYaw.current - Math.PI;

    // 카메라의 y축 회전(yaw)을 기준으로 방향 벡터를 계산합니다.
    const cameraYaw = new THREE.Euler(0, rotation.current.yaw, 0, 'YXZ');
    const moveDirection = new THREE.Vector3((left ? 1 : 0) - (right ? 1 : 0), 0, (forward ? 1 : 0) - (back ? 1 : 0))
      .normalize()
      .applyEuler(cameraYaw);

    // --- 3. 접지 확인 및 점프 선입력 판정 (Raycasting) ---
    let raycastStartOffset = 0;
    if (colliderProps.type === 'capsule') {
      const [halfHeight, radius] = colliderProps.args;
      // 캡슐 콜라이더의 가장 아래쪽까지의 거리
      raycastStartOffset = halfHeight + radius;
    } else {
      // 큐브 콜라이더의 가장 아래쪽까지의 거리
      raycastStartOffset = colliderProps.args[1]; // halfSize.y
    }
    
    // 💡 캐릭터의 콜라이더를 완벽히 피하기 위해, 레이의 시작점을 발끝보다 아주 살짝(-0.01) 아래로 내립니다.
    const rayOrigin = {
      x: bodyPosition.x,
      y: bodyPosition.y - raycastStartOffset - 0.01,
      z: bodyPosition.z
    };
    const ray = new rapier.Ray(rayOrigin, { x: 0, y: -1, z: 0 });
    
    // 이미 발끝에서 시작하므로 레이 길이는 바닥 여유 오차(0.15) 정도면 충분합니다.
    const rayLength = 0.15; 
    
    // solid를 true로 두어, 레이 시작점이 바닥에 살짝 파묻혀 있더라도 즉각 바닥 충돌(toi=0)로 판정하게 합니다.
    const hit = world.castRay(ray, rayLength, true);
    
    // hit이 존재하면 탐색 거리(rayLength) 이내에 바닥이 있다는 뜻이므로 완벽한 접지 상태입니다.
    const isGrounded = hit !== null;

    // 💡 점프 선입력(Jump Buffer) 판정: 키를 누른 지 200ms 이내인지 확인합니다.
    const wantsToJump = performance.now() - jumpPressedTime.current < 200;

    // --- 추가: 접지 및 점프 판정 디버깅 로그 ---
    // 매 프레임 로그가 도배되는 것을 막기 위해 접지 상태가 변할 때만 출력합니다.
    if (isDebugMode) {
      if (isGrounded !== wasGrounded.current) {
        console.log('접지 판정:', isGrounded ? '바닥에 닿음 (true)' : '공중에 있음 (false)');
      }
      // 선입력 유효 기간 내에 접지 상태가 만족되어 점프가 실행되는 순간 로깅
      if (wantsToJump && isGrounded) {
        console.log('점프 판정: 성공 (점프 실행!)');
      }
      
      // React 상태(State) 대신 DOM을 직접 조작하여 좌표 텍스트를 업데이트합니다 (초당 60회 렌더링 방지용)
      const coordsEl = document.getElementById('debug-coords');
      if (coordsEl) {
        // 디버그 UI에는 헷갈리지 않게 캐릭터의 중심(Center)이 아닌 발끝(Feet) 기준으로 Y좌표를 계산해서 보여줍니다.
        const footY = bodyPosition.y - raycastStartOffset;
        coordsEl.innerText = `X: ${bodyPosition.x.toFixed(2)} | 발끝 Y: ${footY.toFixed(2)} | Z: ${bodyPosition.z.toFixed(2)}`;
      }
    }
    wasGrounded.current = isGrounded; // 로그 출력과 상관없이 이전 접지 상태는 항상 업데이트

    // --- 4. 이동 및 점프 속도 일괄 적용 ---
    
    // Shift 키를 누르고 있으면 기본 속도의 1.8배로 달립니다.
    const currentSpeed = run ? speed * 1.8 : speed;
    
    // 현재 중력 모드에 따라 이동 로직을 분기합니다.
    if (gravityMode === 'none') {
      // --- 무중력 모드: 토글 방식 이동 ---
      const currentVel = body.current.linvel();
      const targetVel = new THREE.Vector3(); // 목표 속도를 0으로 초기화

      // 목표 수평 속도를 카메라 방향 기준으로 계산
      const horizontalMove = new THREE.Vector3(
        (toggledMove.current.left ? 1 : 0) - (toggledMove.current.right ? 1 : 0),
        0,
        (toggledMove.current.forward ? 1 : 0) - (toggledMove.current.back ? 1 : 0)
      );
      
      horizontalMove.normalize().applyEuler(cameraYaw);
      
      targetVel.x = horizontalMove.x * speed;
      targetVel.z = horizontalMove.z * speed;

      // 목표 수직 속도 계산
      targetVel.y = ((toggledMove.current.jump ? 1 : 0) - (toggledMove.current.down ? 1 : 0)) * speed;

      // 현재 속도에서 목표 속도로 부드럽게 보간하여 관성 효과를 줍니다.
      const newVel = new THREE.Vector3(currentVel.x, currentVel.y, currentVel.z);
      newVel.lerp(targetVel, delta * 5);

      body.current.setLinvel(newVel, true);
    } else {
      // --- 일반 중력 모드: 일반 이동 및 점프 ---
      let targetVelocityY = velocity.y;
      if (isStarted && wantsToJump && isGrounded) {
        targetVelocityY = speed * jumpHeight * 2.5;
      }
      const newVel = new THREE.Vector3(moveDirection.x * currentSpeed, targetVelocityY, moveDirection.z * currentSpeed);
      body.current.setLinvel(newVel, true);
    }
    
    // 점프가 성공적으로 적용되었다면, 선입력 시간을 0으로 초기화하여 중복 점프를 방지합니다.
    if (wantsToJump && isGrounded) {
      jumpPressedTime.current = 0;
    }

    // --- 5. 카메라 위치 및 시점(LookAt) 업데이트 ---
    // 달리기 상태(Shift)이고 실제로 이동 중일 때 카메라를 약간 뒤로(줌 아웃) 뺍니다.
    const isMoving = forward || back || left || right;
    let activeTargetDistance = targetDistance.current;
    if (run && isMoving) {
      // 뒤로 달릴 때는 캐릭터가 화면에 가까워지므로, 카메라를 살짝 당겨(줌 인) 답답함을 해소하고
      // 앞으로 달릴 때는 속도감을 위해 카메라를 뒤로 빼(줌 아웃) 역동적인 효과를 줍니다.
      activeTargetDistance = back ? targetDistance.current - 1.0 : targetDistance.current + 1.5;
    }

    // 목표 카메라 거리를 향해 현재 거리를 부드럽게 보간(lerp)합니다.
    if (Math.abs(currentDistance.current - activeTargetDistance) < 0.001) {
      currentDistance.current = activeTargetDistance;
    } else {
      currentDistance.current = THREE.MathUtils.lerp(currentDistance.current, activeTargetDistance, delta * 5);
    }
    const distance = currentDistance.current;

    const offsetX = distance * Math.sin(rotation.current.yaw) * Math.cos(rotation.current.pitch);
    const offsetY = distance * Math.sin(rotation.current.pitch);
    const offsetZ = distance * Math.cos(rotation.current.yaw) * Math.cos(rotation.current.pitch);

    const idealCameraPos = new THREE.Vector3(bodyPosition.x - offsetX, bodyPosition.y + 5.0 + offsetY, bodyPosition.z - offsetZ);

    // 카메라 위치 스냅 (Sub-pixel Jitter 방지)
    // 목표 위치와의 거리 제곱이 매우 작아지면 lerp를 멈추고 바로 목표 위치로 강제 고정합니다.
    if (state.camera.position.distanceToSquared(idealCameraPos) < 0.0001) {
      state.camera.position.copy(idealCameraPos);
    } else {
      state.camera.position.lerp(idealCameraPos, delta * 10);
    }

    const idealLookAt = new THREE.Vector3(bodyPosition.x, bodyPosition.y + 0.5, bodyPosition.z);
    
    // 첫 프레임에서 카메라가 엉뚱한 곳을 보며 튀는 것을 방지
    if (cameraTarget.current.lengthSq() === 0) {
      cameraTarget.current.copy(idealLookAt);
    }
    
    // 카메라의 위치가 부드럽게 이동하듯, 카메라가 바라보는 목표 지점도 부드럽게 이동시킵니다.
    if (cameraTarget.current.distanceToSquared(idealLookAt) < 0.0001) {
      cameraTarget.current.copy(idealLookAt);
    } else {
      cameraTarget.current.lerp(idealLookAt, delta * 10);
    }
    state.camera.lookAt(cameraTarget.current);
  });

  return (
    <RigidBody
      ref={body}
      colliders={colliderProps.type === 'cuboid' ? 'hull' : false}
      mass={1}
      type="dynamic"
      position={[0, 3, 0]}
      enabledRotations={[false, false, false]}
      {...props}
    >
      {/* 사람 캐릭터일 경우에만 캡슐 콜라이더를 수동으로 추가합니다. */}
      {colliderProps.type === 'capsule' && <CapsuleCollider args={colliderProps.args} />}
      <group ref={character} position={[0, colliderProps.offset, 0]}>
        {children}
      </group>
    </RigidBody>
  );
}