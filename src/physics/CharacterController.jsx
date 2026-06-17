import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useRapier, RigidBody, CapsuleCollider } from '@react-three/rapier';
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
};

export default function CharacterController({ children, speed = 4, jumpHeight = 0.4, isDebugMode, ...props }) {
  const body = useRef();
  const character = useRef(); // 캐릭터 모델을 감싸는 group의 ref
  const { rapier, world } = useRapier();
  const [sub, get] = useKeyboardControls();
  const { camera, gl } = useThree();

  // 콜라이더의 크기와 모델의 위치를 동적으로 설정하기 위한 상태
  const [colliderProps, setColliderProps] = useState({
    args: [0.4, 0.4], // 초기값: [반높이, 반지름]
    offset: -0.8, // 초기값: -(반높이 + 반지름)
  });

  // 캐릭터 모델의 크기를 측정하여 콜라이더를 자동으로 맞추는 로직
  useLayoutEffect(() => {
    if (character.current) {
      // 모델이 로드될 때까지 기다립니다.
      const model = character.current.children[0];
      if (model) {
        // --- 수정: 정확한 바운딩 박스 측정을 위한 로직 ---
        // 부모(RigidBody 등)의 위치나 이전 렌더링에서 적용된 offset의 영향을 받지 않도록
        // 잠시 부모와의 연결을 끊고 순수한 모델만의 Transform(scale 등)을 기준으로 측정합니다.
        const parent = model.parent;
        model.parent = null;
        model.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const height = size.y;
        const radius = (size.x + size.z) / 4; // 너비와 깊이의 평균으로 반지름 추정
        const halfHeight = Math.max(0, height / 2 - radius);

        // 측정 후 다시 원래 부모에게 복구합니다.
        model.parent = parent;

        // 콜라이더의 바닥은 중심 기준 -(halfHeight + radius) 입니다.
        // 모델의 실제 바닥 지점(box.min.y)이 콜라이더 바닥에 정확히 일치하도록 offset을 보정합니다.
        const bottomY = box.min.y;
        setColliderProps({ args: [halfHeight, radius], offset: -(halfHeight + radius) - bottomY });
      }
    }
  }, [children]); // 자식 모델이 변경될 때마다 재계산

  // 마우스 회전(시점) 상태를 저장할 참조 객체입니다.
  const rotation = useRef({ yaw: Math.PI, pitch: 0 }); // 초기 yaw를 PI로 설정하여 캐릭터의 뒷모습에서 시작
  const characterYaw = useRef(Math.PI); // 캐릭터의 실제 연속 회전값

  // 점프 키 입력을 감지하기 위한 플래그 (누르는 순간만 반응하도록)
  const jumpPressed = useRef(false);
  const wasGrounded = useRef(false); // 이전 접지 상태를 저장하기 위한 ref
  const cameraTarget = useRef(new THREE.Vector3()); // 카메라 시점(LookAt)을 부드럽게 만들기 위한 보간용 벡터

  // --- 단발성 키 입력 감지 (점프) ---
  useEffect(() => {
    const unsubJump = sub(
      (state) => state.jump,
      (pressed) => {
        if (pressed && !jumpPressed.current) {
          jumpPressed.current = true;
        } else if (!pressed) {
          jumpPressed.current = false;
        }
      }
    );

    return () => {
      unsubJump();
    };
  }, [sub]);

  useFrame((state, delta) => {
    if (!body.current || !character.current) return;

    // --- 추가: 낙하 시 위치 리셋 로직 ---
    const bodyPosition = body.current.translation();
    if (bodyPosition.y < -10) { // 특정 높이(-10) 이하로 떨어졌을 때
      body.current.setTranslation({ x: 0, y: 3, z: 0 }, true); // 초기 위치로 리셋
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true); // 이동 속도 초기화
      return; // 리셋 후 해당 프레임의 나머지 로직은 실행하지 않음
    }

    // --- 1. 키 입력 및 방향 계산 ---
    const { forward, back, left, right, rotateLeft, rotateRight } = get();
    const velocity = body.current.linvel();

    // --- 시점(카메라 및 캐릭터) 회전 로직 (Q/E 키 입력) ---
    const lookSpeed = 2.0; // 시점 회전 속도 (필요시 조절)
    if (rotateLeft) characterYaw.current += lookSpeed * delta;
    if (rotateRight) characterYaw.current -= lookSpeed * delta;

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
    const [halfHeight, radius] = colliderProps.args;
    // 리지드바디의 중심에서 캡슐 콜라이더의 가장 아래쪽까지의 거리
    const capsuleBottomDistance = halfHeight + radius;
    
    // 💡 캐릭터의 콜라이더를 완벽히 피하기 위해, 레이의 시작점을 발끝보다 아주 살짝(-0.01) 아래로 내립니다.
    const rayOrigin = {
      x: bodyPosition.x,
      y: bodyPosition.y - capsuleBottomDistance - 0.01,
      z: bodyPosition.z
    };
    const ray = new rapier.Ray(rayOrigin, { x: 0, y: -1, z: 0 });
    
    // 이미 발끝에서 시작하므로 레이 길이는 바닥 여유 오차(0.15) 정도면 충분합니다.
    const rayLength = 0.15; 
    
    // solid를 true로 두어, 레이 시작점이 바닥에 살짝 파묻혀 있더라도 즉각 바닥 충돌(toi=0)로 판정하게 합니다.
    const hit = world.castRay(ray, rayLength, true);
    
    // hit이 존재하면 탐색 거리(rayLength) 이내에 바닥이 있다는 뜻이므로 완벽한 접지 상태입니다.
    const isGrounded = hit !== null;

    // --- 추가: 접지 및 점프 판정 디버깅 로그 ---
    // 매 프레임 로그가 도배되는 것을 막기 위해 접지 상태가 변할 때만 출력합니다.
    if (isDebugMode) {
      if (isGrounded !== wasGrounded.current) {
        console.log('접지 판정:', isGrounded ? '바닥에 닿음 (true)' : '공중에 있음 (false)');
      }
      if (jumpPressed.current) {
        console.log('점프 판정:', isGrounded ? '성공 (점프 실행!)' : '실패 (공중에 있음)');
      }
      
      // React 상태(State) 대신 DOM을 직접 조작하여 좌표 텍스트를 업데이트합니다 (초당 60회 렌더링 방지용)
      const coordsEl = document.getElementById('debug-coords');
      if (coordsEl) {
        coordsEl.innerText = `X: ${bodyPosition.x.toFixed(2)} | Y: ${bodyPosition.y.toFixed(2)} | Z: ${bodyPosition.z.toFixed(2)}`;
      }
    }
    wasGrounded.current = isGrounded; // 로그 출력과 상관없이 이전 접지 상태는 항상 업데이트

    // --- 3. 이동 및 점프 속도 일괄 적용 ---
    // 점프 플래그가 설정되고 땅에 닿아있다면 점프 속도를 적용합니다.
    // jumpPressed는 누르는 순간만 true이므로 안정적인 1회 점프를 보장합니다.
    const targetVelocityY = (jumpPressed.current && isGrounded) ? speed * jumpHeight * 2.5 : velocity.y;
    const newVel = new THREE.Vector3(moveDirection.x * speed, targetVelocityY, moveDirection.z * speed);
    body.current.setLinvel(newVel, true);
    
    // 점프 적용 후 플래그를 초기화하여 다음 누르기를 대기합니다.
    if (jumpPressed.current) {
      jumpPressed.current = false;
    }

    // --- 5. 3인칭 카메라 위치 업데이트 (구면 좌표계) ---
    const distance = 5;

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
      colliders={false}
      mass={1}
      type="dynamic"
      position={[0, 3, 0]}
      enabledRotations={[false, false, false]}
      {...props}
    >
      <CapsuleCollider args={colliderProps.args} />
      <group ref={character} position={[0, colliderProps.offset, 0]}>
        {children}
      </group>
    </RigidBody>
  );
}