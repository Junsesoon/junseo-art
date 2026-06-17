import React, { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';

export default function Nick(props) {
  const group = useRef();
  // 최적화된 모델 파일을 불러옵니다.
  const { scene, animations, nodes } = useGLTF('/asset-static/nick_wilde-opt.glb');
  
  // 모델에 포함된 애니메이션들을 추출하여 제어할 수 있게 해주는 훅입니다.
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    // 💡 브라우저 개발자 도구(F12) 콘솔에서 사용 가능한 애니메이션 목록을 확인합니다.
    console.log('Nick의 애니메이션 목록:', actions);
    
    // 💡 캐릭터의 뼈대(Bone)와 부위별 이름(Node)을 확인하기 위한 로그입니다.
    console.log('Nick의 모델 구조(Nodes):', nodes);

    // 'Idle'이라는 이름의 애니메이션을 찾아 실행(play)합니다.
    if (actions['Idle']) {
      actions['Idle'].play();
    }
  }, [actions]);

  return (
    <group ref={group} {...props}>
      <primitive object={scene} rotation={[0, Math.PI, 0]} />
    </group>
  );
}

// 로딩 최적화를 위한 프리로드
useGLTF.preload('/asset-static/nick_wilde-opt.glb');