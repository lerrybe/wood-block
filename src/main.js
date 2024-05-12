import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let perspectiveCamera, orthographicCamera, camera, scene, renderer;
let plane;
let pointer,
  raycaster,
  isShiftDown = false;
let rollOverMesh, rollOverMaterial;
let cubeGeo, cubeMaterial;
const objects = [];
let useOrthographic = false;

window.onload = () => {
  init();
  render();
  addCameraControlButtons();
};

function init() {
  initCameras();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  const rollOverGeo = new THREE.BoxGeometry(50, 50, 50);
  rollOverMaterial = new THREE.MeshBasicMaterial({
    color: "#648131",
    opacity: 0.5,
    transparent: true,
  });
  rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);
  scene.add(rollOverMesh);

  const texture = new THREE.TextureLoader().load(
    "./assets/textures/minecraft.webp"
  );
  cubeGeo = new THREE.BoxGeometry(50, 50, 50);
  cubeMaterial = new THREE.MeshLambertMaterial({
    map: texture,
    color: 0x5c422a,
  });

  const gridHelper = new THREE.GridHelper(1000, 20);
  scene.add(gridHelper);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  const geometry = new THREE.PlaneGeometry(1000, 1000);
  geometry.rotateX(-Math.PI / 2);
  plane = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ visible: false })
  );
  scene.add(plane);
  objects.push(plane);

  const ambientLight = new THREE.AmbientLight(0x606060, 3);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
  directionalLight.position.set(1, 0.75, 0.5).normalize();
  scene.add(directionalLight);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true; // 확대/축소 기능 활성화
  controls.zoomSpeed = 1.2; // 마우스 휠의 확대/축소 속도 조절

  controls.enableZoom = true; // 확대/축소 기능 활성화
  controls.addEventListener("change", () => {
    if (camera instanceof THREE.OrthographicCamera) {
      camera.updateProjectionMatrix(); // 오소그래픽 카메라의 프로젝션 매트릭스 업데이트
    }
    render();
  });
  window.addEventListener("resize", onWindowResize);
  document.addEventListener("keyup", onDocumentKeyUp);
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("keydown", onDocumentKeyDown);
}

function initCameras() {
  const aspect = window.innerWidth / window.innerHeight;
  perspectiveCamera = new THREE.PerspectiveCamera(45, aspect, 1, 10000);
  perspectiveCamera.position.set(500, 800, 1300);

  const frustumSize = 1000;
  orthographicCamera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    1,
    10000
  );
  orthographicCamera.position.set(500, 800, 1300);

  camera = perspectiveCamera;
}

function addCameraControlButtons() {
  const buttons = [
    {
      id: "sideView",
      onClick: () => setCameraView([1000, 0, 0], scene.position),
    },
    {
      id: "topView",
      onClick: () => setCameraView([0, 1000, 0], scene.position),
    },
    {
      id: "frontView",
      onClick: () => setCameraView([0, 0, 1000], scene.position),
    },
    {
      id: "perspectiveView",
      onClick: setCameraPerspective,
    },
  ];

  buttons.forEach((buttonInfo) => {
    const button = document.getElementById(buttonInfo.id);
    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      buttonInfo.onClick();
    });
  });
}

function setCameraView(position, lookAt) {
  useOrthographic = true;
  camera = orthographicCamera;
  camera.position.set(...position);
  camera.lookAt(...lookAt);
  camera.zoom = 1;
  camera.updateProjectionMatrix();
  rollOverMesh.visible = false; // 호버 메시 숨김
  render();
}

function setCameraPerspective() {
  useOrthographic = false;
  camera = perspectiveCamera;
  camera.position.set(500, 800, 1300);
  camera.lookAt(scene.position);
  rollOverMesh.visible = true; // 호버 메시 보이기
  render();
}

function onWindowResize() {
  const aspect = window.innerWidth / window.innerHeight;
  perspectiveCamera.aspect = aspect;
  perspectiveCamera.updateProjectionMatrix();

  orthographicCamera.left = -window.innerWidth / 2;
  orthographicCamera.right = window.innerWidth / 2;
  orthographicCamera.top = window.innerHeight / 2;
  orthographicCamera.bottom = -window.innerHeight / 2;
  orthographicCamera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

function onPointerMove(event) {
  if (!useOrthographic) {
    pointer.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      rollOverMesh.position.copy(intersect.point).add(intersect.face.normal);
      rollOverMesh.position
        .divideScalar(50)
        .floor()
        .multiplyScalar(50)
        .addScalar(25);
      render();
    }
  }
}

function onPointerDown(event) {
  if (!useOrthographic) {
    pointer.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      if (isShiftDown) {
        if (intersect.object !== plane) {
          scene.remove(intersect.object);
          objects.splice(objects.indexOf(intersect.object), 1);
        }
      } else {
        const voxel = new THREE.Mesh(cubeGeo, cubeMaterial);
        voxel.position.copy(intersect.point).add(intersect.face.normal);
        voxel.position
          .divideScalar(50)
          .floor()
          .multiplyScalar(50)
          .addScalar(25);
        scene.add(voxel);
        objects.push(voxel);
      }
      render();
    }
  }
}

function onDocumentKeyDown(event) {
  if (event.keyCode === 16) {
    isShiftDown = true;
  }
}

function onDocumentKeyUp(event) {
  if (event.keyCode === 16) {
    isShiftDown = false;
  }
}

function render() {
  renderer.render(scene, camera);
}

// 추가한 기능: orbit controls 추가 -> 마우스로 카메라 조작 가능
// 추가한 기능: 원근 on off -> 카메라 위치를 조작하는 버튼 추가 -> top, side, front, 이 때는 원근 투영이 적용되지 않음
// 추가한 기능: topView, sideView, frontView 일 때 휠 or 트랙패드 축소 (아직)
// 각 뷰에서는 카메라 위치를 고정하고, 확대/축소만 가능하도록 함
