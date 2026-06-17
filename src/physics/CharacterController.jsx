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
  rotateLeft: 'rotateLeft',
  rotateRight: 'rotateRight',
  run: 'run',
};

export default function CharacterController({ children, speed = 4, jumpHeight = 0.4, isDebugMode, isStarted = true, ...props }) {
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

  // --- 단발성 키 입력 감지 (점프) ---
  useEffect(() => {
    const unsubJump = sub(
      (state) => state.jump,
      (pressed) => {
        // 누르는 순간의 정확한 시간을 기록합니다. (점프 선입력 기능 활용)
        if (pressed) {
          jumpPressedTime.current = performance.now();
        }
      }
    );

    return () => {
      unsubJump();
    };
  }, [sub]);

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
    const { forward, back, left, right, rotateLeft, rotateRight, run } = isStarted ? get() : {};
    const velocity = body.current.linvel();

    // --- 시점(카메라 및 캐릭터) 회전 로직 (Q/E 키 입력) ---
    const lookSpeed = 2.0; // 시점 회전 속도 (필요시 조절)
    
    // 뒤로 이동 중일 때는 자연스러운 조향을 위해 좌우 회전 방향을 반전시킵니다.
    const isMovingBack = back && !forward;
    const currentLookSpeed = isMovingBack ? -lookSpeed : lookSpeed;

    if (rotateLeft) characterYaw.current += currentLookSpeed * delta;
    if (rotateRight) characterYaw.current -= currentLookSpeed * delta;

    // 2. 카메라의 현재 회전각(rotation.yaw)을 캐릭터의 실제 회전각(characterYaw)으로 부드럽게 보간(lerp)하여 연속적으로 회전시킵니다.
    rotation.current.yaw = THREE.MathUtils.lerp(rotation.current.yaw, characterYaw.current, delta * 10);

    // 4. 캐릭터 모델의 Y축 회전을 실제 회전각(characterYaw)과 동기화하여 부드럽게 회전시킵니다.
    character.current.rotation.y = characterYaw.current - Math.PI;

    // 카메라의 y축 회전(yaw)을 기준으로 방향 벡터를 계산합니다.
    const cameraYaw = new THREE.Euler(0, rotation.current.yaw, 0, 'YXZ');
    const moveDirection = new THREE.Vector3((left ? 1 : 0) - (right ? 1 : 0), 0, (forward ? 1 : 0) - (back ? 1 : 0))
      .normalize()
      .applyEuler(cameraYaw);

    // --- 2. 접지 확인 (Raycasting) ---
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

    // --- 3. 이동 및 점프 속도 일괄 적용 ---
    
    // Shift 키를 누르고 있으면 기본 속도의 1.8배로 달립니다.
    const currentSpeed = run ? speed * 1.8 : speed;
    
    // 💡 입력된 지 200ms 이내(wantsToJump)이고 땅에 닿아있다면 점프 속도를 적용합니다.
    const targetVelocityY = (isStarted && wantsToJump && isGrounded) ? speed * jumpHeight * 2.5 : velocity.y;
    const newVel = new THREE.Vector3(moveDirection.x * currentSpeed, targetVelocityY, moveDirection.z * currentSpeed);
    body.current.setLinvel(newVel, true);
    
    // 점프가 성공적으로 적용되었다면, 선입력 시간을 0으로 초기화하여 중복 점프를 방지합니다.
    if (wantsToJump && isGrounded) {
      jumpPressedTime.current = 0;
    }

    // --- 5. 3인칭 카메라 위치 업데이트 (구면 좌표계) ---
    // 달리기 상태(Shift)이고 실제로 이동 중일 때 카메라를 약간 뒤로(줌 아웃) 뺍니다.
    const isMoving = forward || back || left || right;
    let activeTargetDistance = targetDistance.current;
    if (run && isMoving) {
      // 뒤로 달릴 때는 캐릭터가 화면에 가까워지므로, 카메라를 살짝 당겨(줌 인) 답답함을 해소하고
      // 앞으로 달릴 때는 속도감을 위해 카메라를 뒤로 빼(줌 아웃) 역동적인 효과를 줍니다.
      activeTargetDistance = back ? targetDistance.current - 1.0 : targetDistance.current + 1.5;
    }

    // 목표 카메라 거리를 향해 현재 거리를 부드럽게 보간(lerp)합니다.
    currentDistance.current = THREE.MathUtils.lerp(currentDistance.current, activeTargetDistance, delta * 5); // 부드러운 줌 효과를 위해 10 -> 5로 속도 조절
    const distance = currentDistance.current;

    const offsetX = distance * Math.sin(rotation.current.yaw) * Math.cos(rotation.current.pitch);
    const offsetY = distance * Math.sin(rotation.current.pitch);
    const offsetZ = distance * Math.cos(rotation.current.yaw) * Math.cos(rotation.current.pitch);

    const idealCameraPos = new THREE.Vector3(bodyPosition.x - offsetX, bodyPosition.y + 1.5 + offsetY, bodyPosition.z - offsetZ);

    state.camera.position.lerp(idealCameraPos, delta * 10);
    const idealLookAt = new THREE.Vector3(bodyPosition.x, bodyPosition.y + 1, bodyPosition.z);
    
    // 첫 프레임에서 카메라가 엉뚱한 곳을 보며 튀는 것을 방지
    if (cameraTarget.current.lengthSq() === 0) {
      cameraTarget.current.copy(idealLookAt);
    }
    
    // 카메라의 위치가 부드럽게 이동하듯, 카메라가 바라보는 목표 지점도 부드럽게 이동시킵니다.
    cameraTarget.current.lerp(idealLookAt, delta * 10);
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