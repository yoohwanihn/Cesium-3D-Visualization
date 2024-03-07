$(document).ready(() => {
  // 토큰 값
  Cesium.Ion.defaultAccessToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzNWY2NGI5ZS0zYThhLTQ5M2MtYmYxYy01MzU3ZWUwYzI3YzIiLCJpZCI6MTk1Njg4LCJpYXQiOjE3MDc5ODc1NjR9.HBVuVn5GEjrD-dsY3UO4cuthD9qy8uk9jeFS9I73ax0";

  // div 초기화 -> 3D 지구 뷰어 생성
  const viewer = new Cesium.Viewer("cesiumContainer", {
    terrainProvider: Cesium.createWorldTerrain(),
    shadows: true,
  });

  //캔버스
  const canvas = viewer.canvas;
  const scene = viewer.scene;
  //타원체
  const ellipsoid = scene.globe.ellipsoid;

  // 지형과 건물이 겹쳐지는 경우 건물이 지형 뒤에 노출되도록 설정
  scene.globe.depthTestAgainstTerrain = true;
  // 캔버스에 포커스를 설정할 수 있도록 tabindex 설정.
  canvas.setAttribute("tabindex", "0");
  // getImageData를 사용하여 여러 번 읽는 작업을 더 빠르게 처리할 수 있다고 함
  canvas.setAttribute("willReadFrequently", "true");

  canvas.onclick = function () {
    canvas.focus();
  };

  
// 카메라 이동 방향을 저장할 flag
const flags = {
    /* 화면이동 플래그 */
    looking: false,
    moveForward: false,
    moveBackward: false,
    moveUp: false,
    moveDown: false,
    moveLeft: false,
    moveRight: false,
    /* 측정모드 플래그 */
    measuring: false, // 측정 모드 플래그
  };

  // 측정 버튼 클릭 이벤트 jQuery
  $('#measureButton').on("click", ()=>{
    flags.measuring = !flags.measuring; // 플래그 토글
  });
  

  //캔버스 화면으로 이동하는 이벤트 핸들러
  const handler = new Cesium.ScreenSpaceEventHandler(canvas);

  // 이전 좌표와 현재 좌표를 합친 배열
  let positions = [];

  // 포인트 생성
  function createPoint(worldPosition) {
    var point = viewer.entities.add({
      position: worldPosition,
      point: {
        color: Cesium.Color.RED,
        pixelSize: 10,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
    return point;
  }

  /** 바닐라JS 쿼리 셀렉터로 지워보기 */
  document.querySelector("#closeButton").addEventListener("click", () => {
    viewer.entities.removeAll();
  });

  // 폴리라인, 라벨링 생성 함수
  function drawLine(positions) {
    var line = viewer.entities.add({
      polyline: {
        positions: positions,
        width: 3,
        clampToGround: true,
        material: Cesium.Color.RED, // 붉은 선으로 변경
      },
    });

    // 선 중간 지점 계산 midpoint(처음 찍은 점, 두번째 찍은 점, 결과를 저장할 객체)
    var midpoint = Cesium.Cartesian3.midpoint(
      positions[0],
      positions[1],
      new Cesium.Cartesian3()
    );

    // 라벨링
    var distanceLabel = viewer.entities.add({
      position: midpoint,
      label: {
        text: calculateDistance(positions), // 선의 길이를 계산하여 레이블에 표시
        font: "14px sans-serif",
        fillColor: Cesium.Color.BLACK, // 글자 색이 이거임
        pixelOffset: new Cesium.Cartesian2(0, -20), // 라벨의 위치, 위로 20
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, // 높이 지정
      },
    });

    return line;
  }

  // 두 점 간의 거리 계산 , 라벨링 할 때 사용
  function calculateDistance(positions) {
    var distance = Cesium.Cartesian3.distance(positions[0], positions[1]);
    return "거리: " + distance.toFixed(2) + " 미터";
  }

  // 클릭 이벤트 핸들러
  handler.setInputAction(function (movement) {
    if (flags.measuring) {
      // 측정 모드일 때만 실행
      const cartesian = viewer.camera.pickEllipsoid(
        movement.position,
        ellipsoid
      );
      if (Cesium.defined(cartesian)) {
        // 카르테시안 좌표에서 인스턴스 생성하기, 결과 객체의 값은 라디안 단위임. (위도, 경도, 타원체기준 높이) 3가지 데이터
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const longitude = Cesium.Math.toDegrees(cartographic.longitude);
        const latitude = Cesium.Math.toDegrees(cartographic.latitude);

        // 새로운 측정을 시작할 때 (배열이 짝수)
        if (positions.length % 2 === 0) {
          positions.push(cartesian);
          createPoint(cartesian); // 포인트 생성
        } else {
          // 두 번째 좌표인 경우 (배열이 홀수)
          positions.push(cartesian);
          createPoint(cartesian); // 포인트 생성
          // n 번째와 n-1 번째 점 사이의 거리를 계산하여 라인을 그리기
          drawLine([
            positions[positions.length - 2],
            positions[positions.length - 1],
          ]);
        }
      } else {
        alert("클릭한 지점의 cartesian이 정의되지 않았습니다.");
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // 더블 클릭 이벤트 핸들러
  handler.setInputAction(function (movement) {
    if (flags.measuring) {
      flags.measuring = false; // 측정 모드 종료
    }
  }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

  /**KeyCode를 바탕으로 flag를 return 해주는 함수 */
  function getFlagForKeyCode(code) {
    switch (code) {
      case "KeyW":
        return "moveForward";
      case "KeyS":
        return "moveBackward";
      case "KeyQ":
        return "moveUp";
      case "KeyE":
        return "moveDown";
      case "KeyD":
        return "moveRight";
      case "KeyA":
        return "moveLeft";
      default:
        return undefined;
    }
  }

  /**getFlagKeyCode를 바탕으로 keydown일때 true로 바꿔주는 이벤트 리스너 */
  document.addEventListener(
    "keydown",
    function (e) {
      const flagName = getFlagForKeyCode(e.code);
      if (typeof flagName !== "undefined") {
        flags[flagName] = true;
      }
    },
    false
  );

  /**getFlagKeyCode를 바탕으로 keyup일때 false로 바꿔주는 이벤트 리스너 */
  document.addEventListener(
    "keyup",
    function (e) {
      const flagName = getFlagForKeyCode(e.code);
      if (typeof flagName !== "undefined") {
        flags[flagName] = false;
      }
    },
    false
  );

  // Cesium OSM Buildings를 추가하여 글로벌 3D 건물 레이어를 렌더링
  const buildingTileset = viewer.scene.primitives.add(
    Cesium.createOsmBuildings()
  );
  // 카메라 시작 지점, 샌프란시스코
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(-122.4175, 37.655, 400),
    orientation: {
      heading: Cesium.Math.toRadians(0.0),
      pitch: Cesium.Math.toRadians(-15.0),
    },
  });

  // 매 프레임마다 실행될 함수, 카메라 이동 처리
  viewer.clock.onTick.addEventListener(function (clock) {
    const camera = viewer.camera;

    const cameraHeight = ellipsoid.cartesianToCartographic(
      camera.position
    ).height;

    // 타원체 표면까지의 카메라 거리에 따라 이동 속도를 변경. (멀수록 빠름)
    const moveRate = cameraHeight / 100.0;

    if (flags.moveForward) {
      camera.moveForward(moveRate);
    }
    if (flags.moveBackward) {
      camera.moveBackward(moveRate);
    }
    if (flags.moveUp) {
      camera.moveUp(moveRate);
    }
    if (flags.moveDown) {
      camera.moveDown(moveRate);
    }
    if (flags.moveLeft) {
      camera.moveLeft(moveRate);
    }
    if (flags.moveRight) {
      camera.moveRight(moveRate);
    }
  });
});
