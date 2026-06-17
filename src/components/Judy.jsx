import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, useKeyboardControls } from '@react-three/drei';

export default function Judy(props) {
  const group = useRef();
  // 최적화된 모델 파일을 불러옵니다.
  const { scene, animations, nodes } = useGLTF('/asset-static/judy_police-opt.glb');
  
  // 모델에 포함된 애니메이션들을 추출하여 제어할 수 있게 해주는 훅입니다.
  const { actions } = useAnimations(animations, group);

  // 키보드 입력을 가져오기 위한 훅과 현재 재생 중인 애니메이션 상태를 저장할 ref를 선언합니다.
  const [, get] = useKeyboardControls();
  const currentAction = useRef('Idle');

  useEffect(() => {
    // 💡 브라우저 개발자 도구(F12) 콘솔에서 사용 가능한 애니메이션 목록을 확인합니다.
    console.log('Judy의 애니메이션 목록:', actions);
    
    // 💡 캐릭터의 뼈대(Bone)와 부위별 이름(Node)을 확인하기 위한 로그입니다.
    console.log('Judy의 모델 구조(Nodes):', nodes);

    // 'Idle'이라는 이름의 애니메이션을 찾아 실행(play)합니다.
    if (actions['Idle']) {
      actions['Idle'].play();
    }
  }, [actions]);

  // 매 프레임마다 키보드 입력을 확인하여 애니메이션을 전환합니다.
  useFrame(() => {
    const { forward, back, left, right } = get();
    const isMoving = forward || back || left || right;
    // 💡 모델에 따라 걷기 애니메이션 이름이 'Run' 혹은 'Walking'일 수 있습니다. 콘솔을 확인해 맞게 수정하세요.
    const nextAction = isMoving ? 'Walk' : 'Idle'; 

    if (currentAction.current !== nextAction) {
      const currentAnim = actions[currentAction.current];
      const nextAnim = actions[nextAction];

      if (nextAnim) {
        // 자연스러운 애니메이션 전환(블렌딩)을 위해 fadeIn, fadeOut을 사용합니다 (0.2초 설정)
        nextAnim.reset().fadeIn(0.2).play();
        if (currentAnim) currentAnim.fadeOut(0.2);
        currentAction.current = nextAction;
      }
    }
  });

  return (
    <group ref={group} {...props}>
      <primitive object={scene} rotation={[0, Math.PI, 0]} />
    </group>
  );
}

// 로딩 최적화를 위한 프리로드
useGLTF.preload('/asset-static/judy_police-opt.glb');