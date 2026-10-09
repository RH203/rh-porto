import * as THREE from 'three';
import gsap from 'gsap';
import { portfolioData } from '../data/portfolioData';

export type CheckpointKey = 'projects' | 'experience' | 'skills' | 'education' | 'contact';

export interface CheckpointConfig {
  key: CheckpointKey;
  label: string;
  shortDesc: string;
  color: string;
  position: [number, number, number];
  parkingPos: [number, number, number];
  parkingAngle: number;
}

export const CHECKPOINTS: Record<CheckpointKey, CheckpointConfig> = {
  projects: {
    key: 'projects',
    label: 'Featured Projects',
    shortDesc: 'Jatim Bissa, Roaming Marketplace, flutter_mic_selector',
    color: '#bd93f9',
    position: [-7, 0, -7],
    parkingPos: [-5.2, 0, -5.2],
    parkingAngle: Math.PI * 0.25,
  },
  experience: {
    key: 'experience',
    label: 'Work Experience',
    shortDesc: 'De Vivace, DB KIIK, Telkom Univ Lab',
    color: '#ff79c6',
    position: [7, 0, -7],
    parkingPos: [5.2, 0, -5.2],
    parkingAngle: -Math.PI * 0.25,
  },
  skills: {
    key: 'skills',
    label: 'Technical Skills',
    shortDesc: 'Laravel, Flutter, SQL Optimization, OWASP',
    color: '#50fa7b',
    position: [-7, 0, 7],
    parkingPos: [-5.2, 0, 5.2],
    parkingAngle: Math.PI * 0.75,
  },
  education: {
    key: 'education',
    label: 'Education & Honors',
    shortDesc: 'Telkom Univ S.Kom (GPA 3.70), Certifications',
    color: '#8be9fd',
    position: [7, 0, 7],
    parkingPos: [5.2, 0, 5.2],
    parkingAngle: -Math.PI * 0.75,
  },
  contact: {
    key: 'contact',
    label: 'Get in Touch',
    shortDesc: 'Email, LinkedIn, GitHub, Surabaya',
    color: '#f1fa8c',
    position: [0, 0, -9],
    parkingPos: [0, 0, -6.8],
    parkingAngle: 0,
  },
};

export class PortfolioWorld {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  // Car state
  private carGroup: THREE.Group;
  private wheels: THREE.Mesh[] = [];
  private speed = 0;
  private maxSpeed = 0.15;
  private acceleration = 0.007;
  private friction = 0.92;
  private steerAngle = 0;
  private maxSteer = 0.042;
  private carAngle = 0;
  private carRadius = 13.5;

  // Input states
  private keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  };
  private analogThrottle = 0;
  private analogSteer = 0;

  // Checkpoints
  private activeCheckpoint: CheckpointKey | null = null;
  private checkpointMeshes: Map<CheckpointKey, THREE.Group> = new Map();
  private rings: THREE.Mesh[] = [];

  // Camera mode
  private isCinematic = false;
  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private currentNavTween: gsap.core.Tween | null = null;

  // Callbacks
  private onNearCheckpoint: (cp: CheckpointConfig | null) => void;
  private onSelectCheckpoint: (cp: CheckpointConfig) => void;

  constructor(
    container: HTMLElement,
    callbacks: {
      onNearCheckpoint: (cp: CheckpointConfig | null) => void;
      onSelectCheckpoint: (cp: CheckpointConfig) => void;
    }
  ) {
    this.container = container;
    this.onNearCheckpoint = callbacks.onNearCheckpoint;
    this.onSelectCheckpoint = callbacks.onSelectCheckpoint;
    this.clock = new THREE.Clock();

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#282a36');
    this.scene.fog = new THREE.FogExp2('#282a36', 0.022);

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    this.camera.position.set(12, 14, 12);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Build scene
    this.setupLighting();
    this.setupIsland();
    this.carGroup = this.createCar();
    this.scene.add(this.carGroup);
    this.setupCheckpoints();
    this.setupDecorations();

    // Event listeners
    this.setupInputs();
    window.addEventListener('resize', this.onResize);

    // Start loop
    this.animate();
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight('#f8f8f2', 0.85);
    this.scene.add(ambient);

    const hemiLight = new THREE.HemisphereLight('#bd93f9', '#282a36', 0.5);
    this.scene.add(hemiLight);

    const sun = new THREE.DirectionalLight('#ffb86c', 1.4);
    sun.position.set(15, 22, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
  }

  private setupIsland() {
    // Main floating island platform
    const islandGeo = new THREE.CylinderGeometry(15, 13.5, 2.5, 36);
    const islandMat = new THREE.MeshStandardMaterial({
      color: '#343746',
      roughness: 0.8,
      metalness: 0.1,
    });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.y = -1.25;
    island.receiveShadow = true;
    this.scene.add(island);

    // Island grass top surface
    const topGeo = new THREE.CylinderGeometry(15.02, 15.02, 0.1, 36);
    const topMat = new THREE.MeshStandardMaterial({
      color: '#282a36',
      roughness: 0.9,
    });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.05;
    top.receiveShadow = true;
    this.scene.add(top);

    // Circular asphalt road track
    const roadGeo = new THREE.RingGeometry(5.5, 9.5, 48);
    const roadMat = new THREE.MeshStandardMaterial({
      color: '#21222c',
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.06;
    road.receiveShadow = true;
    this.scene.add(road);

    // Dashed center road markings
    const dashCount = 24;
    for (let i = 0; i < dashCount; i++) {
      const angle = (i / dashCount) * Math.PI * 2;
      const r = 7.5;
      const dashGeo = new THREE.PlaneGeometry(0.25, 0.8);
      const dashMat = new THREE.MeshBasicMaterial({ color: '#6272a4', side: THREE.DoubleSide });
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.position.set(Math.cos(angle) * r, 0.07, Math.sin(angle) * r);
      dash.rotation.x = -Math.PI / 2;
      dash.rotation.z = -angle;
      this.scene.add(dash);
    }

    // Plaza center circle
    const plazaGeo = new THREE.CircleGeometry(3.6, 32);
    const plazaMat = new THREE.MeshStandardMaterial({
      color: '#44475a',
      roughness: 0.6,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.07;
    plaza.receiveShadow = true;
    this.scene.add(plaza);

    // Center fountain / energy orb
    const fountainBase = new THREE.CylinderGeometry(1.2, 1.4, 0.5, 16);
    const fMat = new THREE.MeshStandardMaterial({ color: '#6272a4' });
    const fountain = new THREE.Mesh(fountainBase, fMat);
    fountain.position.set(0, 0.25, 0);
    fountain.castShadow = true;
    this.scene.add(fountain);

    const orbGeo = new THREE.DodecahedronGeometry(0.55, 1);
    const orbMat = new THREE.MeshStandardMaterial({
      color: '#bd93f9',
      emissive: '#bd93f9',
      emissiveIntensity: 0.5,
      roughness: 0.2,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(0, 1.1, 0);
    this.scene.add(orb);
    gsap.to(orb.rotation, { y: Math.PI * 2, duration: 8, repeat: -1, ease: 'none' });
    gsap.to(orb.position, { y: 1.3, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }

  private createCar(): THREE.Group {
    const car = new THREE.Group();

    // Car main chassis
    const bodyGeo = new THREE.BoxGeometry(1.2, 0.5, 2.0);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: '#bd93f9',
      roughness: 0.3,
      metalness: 0.1,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.45;
    body.castShadow = true;
    car.add(body);

    // Cabin / roof
    const cabinGeo = new THREE.BoxGeometry(0.95, 0.45, 1.05);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: '#343746',
      roughness: 0.2,
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 0.85, -0.1);
    cabin.castShadow = true;
    car.add(cabin);

    // Front Hood Scoop / Incline (distinct front shape)
    const hoodGeo = new THREE.BoxGeometry(1.0, 0.2, 0.7);
    const hoodMat = new THREE.MeshStandardMaterial({ color: '#50fa7b', roughness: 0.3 });
    const hood = new THREE.Mesh(hoodGeo, hoodMat);
    hood.position.set(0, 0.65, 0.55);
    hood.rotation.x = -0.12;
    car.add(hood);

    // Front Arrow Chevron on Hood (clearly points FORWARD)
    const arrowGeo = new THREE.ConeGeometry(0.2, 0.4, 3);
    const arrowMat = new THREE.MeshBasicMaterial({ color: '#282a36' });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.set(0, 0.76, 0.65);
    car.add(arrow);

    // Windshield (cyan tint, sloped)
    const glassGeo = new THREE.PlaneGeometry(0.85, 0.35);
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#8be9fd',
      roughness: 0.1,
      metalness: 0.9,
    });
    const frontGlass = new THREE.Mesh(glassGeo, glassMat);
    frontGlass.position.set(0, 0.85, 0.43);
    frontGlass.rotation.x = -0.25;
    car.add(frontGlass);

    // Headlights (Bright Yellow-Mint)
    const hlGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.12, 16);
    const hlMat = new THREE.MeshStandardMaterial({
      color: '#f1fa8c',
      emissive: '#f1fa8c',
      emissiveIntensity: 1.2,
    });
    const hlLeft = new THREE.Mesh(hlGeo, hlMat);
    hlLeft.rotation.x = Math.PI / 2;
    hlLeft.position.set(-0.42, 0.45, 1.01);
    car.add(hlLeft);

    const hlRight = hlLeft.clone();
    hlRight.position.x = 0.42;
    car.add(hlRight);

    // Ground Headlight Light Beams (Projected forward on the floor)
    const beamGeo = new THREE.PlaneGeometry(0.9, 3.2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#f1fa8c',
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const beamL = new THREE.Mesh(beamGeo, beamMat);
    beamL.rotation.x = -Math.PI / 2;
    beamL.position.set(-0.45, 0.08, 2.7);
    car.add(beamL);

    const beamR = new THREE.Mesh(beamGeo, beamMat);
    beamR.rotation.x = -Math.PI / 2;
    beamR.position.set(0.45, 0.08, 2.7);
    car.add(beamR);

    // Front Spotlights
    const spotL = new THREE.SpotLight('#f1fa8c', 2.0, 7, Math.PI / 5, 0.5);
    spotL.position.set(-0.4, 0.5, 1.1);
    spotL.target.position.set(-0.4, 0, 5);
    car.add(spotL);
    car.add(spotL.target);

    const spotR = new THREE.SpotLight('#f1fa8c', 2.0, 7, Math.PI / 5, 0.5);
    spotR.position.set(0.4, 0.5, 1.1);
    spotR.target.position.set(0.4, 0, 5);
    car.add(spotR);
    car.add(spotR.target);

    // Rear Racing Spoiler / Wing (Clearly marks the BACK)
    const strutGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8);
    const strutMat = new THREE.MeshStandardMaterial({ color: '#282a36' });
    const strutL = new THREE.Mesh(strutGeo, strutMat);
    strutL.position.set(-0.4, 0.82, -0.9);
    car.add(strutL);

    const strutR = strutL.clone();
    strutR.position.x = 0.4;
    car.add(strutR);

    const wingGeo = new THREE.BoxGeometry(1.3, 0.08, 0.35);
    const wingMat = new THREE.MeshStandardMaterial({
      color: '#ff79c6',
      roughness: 0.2,
    });
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(0, 1.0, -0.9);
    car.add(wing);

    // Twin Rear Exhaust Pipes
    const exhaustGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.25, 12);
    const exhaustMat = new THREE.MeshStandardMaterial({ color: '#6272a4', metalness: 0.8 });
    const exL = new THREE.Mesh(exhaustGeo, exhaustMat);
    exL.rotation.x = Math.PI / 2;
    exL.position.set(-0.25, 0.28, -1.05);
    car.add(exL);

    const exR = exL.clone();
    exR.position.x = 0.25;
    car.add(exR);

    // Taillights (Dark Crimson Red at back)
    const tlGeo = new THREE.BoxGeometry(0.25, 0.12, 0.05);
    const tlMat = new THREE.MeshStandardMaterial({
      color: '#ff5555',
      emissive: '#ff5555',
      emissiveIntensity: 1.0,
    });
    const tlLeft = new THREE.Mesh(tlGeo, tlMat);
    tlLeft.position.set(-0.42, 0.45, -1.01);
    car.add(tlLeft);

    const tlRight = tlLeft.clone();
    tlRight.position.x = 0.42;
    car.add(tlRight);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: '#21222c', roughness: 0.8 });
    const hubGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.23, 12);
    const hubMat = new THREE.MeshStandardMaterial({ color: '#50fa7b' });

    const wheelPositions = [
      [-0.62, 0.28, 0.65],
      [0.62, 0.28, 0.65],
      [-0.62, 0.28, -0.65],
      [0.62, 0.28, -0.65],
    ];

    wheelPositions.forEach((pos) => {
      const wheelGroup = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      const hub = new THREE.Mesh(hubGeo, hubMat);
      hub.rotation.z = Math.PI / 2;
      wheelGroup.add(hub);

      wheelGroup.position.set(pos[0], pos[1], pos[2]);
      car.add(wheelGroup);
      this.wheels.push(tire);
    });

    // Antenna with playful top sphere
    const antGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.6, 8);
    const antMat = new THREE.MeshStandardMaterial({ color: '#f8f8f2' });
    const antenna = new THREE.Mesh(antGeo, antMat);
    antenna.position.set(0.3, 1.25, -0.45);
    car.add(antenna);

    const bobGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const bobMat = new THREE.MeshStandardMaterial({
      color: '#ff79c6',
      emissive: '#ff79c6',
      emissiveIntensity: 0.6,
    });
    const bobble = new THREE.Mesh(bobGeo, bobMat);
    bobble.position.set(0.3, 1.55, -0.45);
    car.add(bobble);

    car.position.set(0, 0, 0);
    return car;
  }

  private setupCheckpoints() {
    Object.values(CHECKPOINTS).forEach((cp) => {
      const group = new THREE.Group();
      group.position.set(...cp.position);

      // Glowing base platform
      const baseGeo = new THREE.CylinderGeometry(1.8, 1.9, 0.25, 24);
      const baseMat = new THREE.MeshStandardMaterial({
        color: '#44475a',
        roughness: 0.5,
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.receiveShadow = true;
      group.add(base);

      // Pulsing glow ring
      const ringGeo = new THREE.RingGeometry(1.9, 2.3, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: cp.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.15;
      group.add(ring);
      this.rings.push(ring);

      // Landmark building / prop based on category
      if (cp.key === 'projects') {
        // Arcade Cabinet & Laptop
        const cabGeo = new THREE.BoxGeometry(1.2, 1.8, 0.9);
        const cabMat = new THREE.MeshStandardMaterial({ color: '#bd93f9' });
        const cab = new THREE.Mesh(cabGeo, cabMat);
        cab.position.set(0, 1.0, 0);
        cab.castShadow = true;
        group.add(cab);

        const screenGeo = new THREE.PlaneGeometry(0.8, 0.7);
        const screenMat = new THREE.MeshBasicMaterial({ color: '#50fa7b' });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 1.2, 0.46);
        group.add(screen);
      } else if (cp.key === 'experience') {
        // Office Desk + Open Diary
        const deskGeo = new THREE.BoxGeometry(1.6, 0.8, 1.0);
        const deskMat = new THREE.MeshStandardMaterial({ color: '#ff79c6' });
        const desk = new THREE.Mesh(deskGeo, deskMat);
        desk.position.set(0, 0.5, 0);
        desk.castShadow = true;
        group.add(desk);

        const diaryGeo = new THREE.BoxGeometry(0.7, 0.1, 0.5);
        const diaryMat = new THREE.MeshStandardMaterial({ color: '#f8f8f2' });
        const diary = new THREE.Mesh(diaryGeo, diaryMat);
        diary.position.set(0, 0.95, 0);
        group.add(diary);
      } else if (cp.key === 'skills') {
        // Workshop Toolboard / Billboard
        const boardGeo = new THREE.BoxGeometry(1.8, 1.4, 0.15);
        const boardMat = new THREE.MeshStandardMaterial({ color: '#50fa7b' });
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.position.set(0, 1.2, 0);
        board.castShadow = true;
        group.add(board);

        // Legs
        const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2);
        const legMat = new THREE.MeshStandardMaterial({ color: '#343746' });
        const legL = new THREE.Mesh(legGeo, legMat);
        legL.position.set(-0.7, 0.6, 0);
        group.add(legL);
        const legR = legL.clone();
        legR.position.x = 0.7;
        group.add(legR);
      } else if (cp.key === 'education') {
        // Podium with Trophy
        const podGeo = new THREE.CylinderGeometry(0.8, 0.9, 1.0, 16);
        const podMat = new THREE.MeshStandardMaterial({ color: '#8be9fd' });
        const pod = new THREE.Mesh(podGeo, podMat);
        pod.position.set(0, 0.6, 0);
        pod.castShadow = true;
        group.add(pod);

        const trophyGeo = new THREE.ConeGeometry(0.4, 0.7, 8);
        const trophyMat = new THREE.MeshStandardMaterial({
          color: '#f1fa8c',
          metalness: 0.8,
          roughness: 0.2,
        });
        const trophy = new THREE.Mesh(trophyGeo, trophyMat);
        trophy.position.set(0, 1.45, 0);
        group.add(trophy);
      } else if (cp.key === 'contact') {
        // Vintage Mailbox / Radio Beacon
        const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 12);
        const postMat = new THREE.MeshStandardMaterial({ color: '#6272a4' });
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(0, 0.6, 0);
        group.add(post);

        const boxGeo = new THREE.BoxGeometry(0.7, 0.5, 0.7);
        const boxMat = new THREE.MeshStandardMaterial({ color: '#f1fa8c' });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set(0, 1.3, 0);
        box.castShadow = true;
        group.add(box);
      }

      this.scene.add(group);
      this.checkpointMeshes.set(cp.key, group);
    });
  }

  private setupDecorations() {
    // Low-poly pastel trees around island rim
    const treePositions: [number, number][] = [
      [-10, -3],
      [-11, 4],
      [10, -2],
      [11, 4],
      [-3, 11],
      [4, 11],
      [-4, -11],
      [4, -11],
    ];

    treePositions.forEach(([x, z]) => {
      const tree = new THREE.Group();
      tree.position.set(x, 0, z);

      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.18, 0.25, 0.8, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: '#44475a' });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.4;
      trunk.castShadow = true;
      tree.add(trunk);

      // Foliage cone
      const fGeo = new THREE.ConeGeometry(0.85, 1.6, 7);
      const fMat = new THREE.MeshStandardMaterial({
        color: '#50fa7b',
        roughness: 0.9,
      });
      const foliage = new THREE.Mesh(fGeo, fMat);
      foliage.position.y = 1.4;
      foliage.castShadow = true;
      tree.add(foliage);

      this.scene.add(tree);
    });
  }

  private setupInputs() {
    window.addEventListener('keydown', (e) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          this.keys.forward = true;
          break;
        case 's':
        case 'arrowdown':
          this.keys.backward = true;
          break;
        case 'a':
        case 'arrowleft':
          this.keys.left = true;
          break;
        case 'd':
        case 'arrowright':
          this.keys.right = true;
          break;
        case ' ':
        case 'enter':
          if (this.activeCheckpoint) {
            this.onSelectCheckpoint(CHECKPOINTS[this.activeCheckpoint]);
          }
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          this.keys.forward = false;
          break;
        case 's':
        case 'arrowdown':
          this.keys.backward = false;
          break;
        case 'a':
        case 'arrowleft':
          this.keys.left = false;
          break;
        case 'd':
        case 'arrowright':
          this.keys.right = false;
          break;
      }
    });
  }

  // Mobile / virtual touch controls API
  public setVirtualInput(direction: 'forward' | 'backward' | 'left' | 'right', pressed: boolean) {
    this.keys[direction] = pressed;
  }

  // Fast-track auto-pilot for recruiters (real path drive along road curve)
  public navigateToCheckpoint(key: CheckpointKey, onArrived?: (cp: CheckpointConfig) => void) {
    const cp = CHECKPOINTS[key];
    if (!cp) return;

    if (this.currentNavTween) {
      this.currentNavTween.kill();
      this.currentNavTween = null;
    }

    // Keep camera smoothly following the car during travel!
    this.isCinematic = false;
    this.speed = 0;
    this.analogThrottle = 0;
    this.analogSteer = 0;

    const startX = this.carGroup.position.x;
    const startZ = this.carGroup.position.z;
    const targetX = cp.parkingPos[0];
    const targetZ = cp.parkingPos[2];

    const roadRadius = 7.5;
    const startAngle = Math.atan2(startX, startZ);
    const targetAngle = Math.atan2(targetX, targetZ);

    // Calculate shortest angular travel along circular road
    let diff = (targetAngle - startAngle) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;

    // Generate waypoints along circular road track
    const waypoints: THREE.Vector3[] = [];
    waypoints.push(new THREE.Vector3(startX, 0, startZ));

    const steps = Math.max(3, Math.ceil(Math.abs(diff) / 0.8));
    for (let i = 1; i < steps; i++) {
      const frac = i / steps;
      const angle = startAngle + diff * frac;
      waypoints.push(new THREE.Vector3(Math.sin(angle) * roadRadius, 0, Math.cos(angle) * roadRadius));
    }
    waypoints.push(new THREE.Vector3(targetX, 0, targetZ));

    const curve = new THREE.CatmullRomCurve3(waypoints, false, 'centripetal', 0.5);
    const pathLength = curve.getLength();
    const driveDuration = Math.max(1.6, pathLength * 0.16);

    const navProgress = { t: 0 };
    this.currentNavTween = gsap.to(navProgress, {
      t: 1,
      duration: driveDuration,
      ease: 'power1.inOut',
      onUpdate: () => {
        const pt = curve.getPoint(navProgress.t);
        const tangent = curve.getTangent(navProgress.t);

        this.carGroup.position.set(pt.x, 0, pt.z);

        // Turn car along trajectory
        if (tangent.lengthSq() > 0.001) {
          const forwardAngle = Math.atan2(tangent.x, tangent.z);
          // Blend towards parkingAngle when near end
          if (navProgress.t > 0.85) {
            const blend = (navProgress.t - 0.85) / 0.15;
            this.carGroup.rotation.y = THREE.MathUtils.lerp(forwardAngle, cp.parkingAngle, blend);
          } else {
            this.carGroup.rotation.y = forwardAngle;
          }
          this.carAngle = this.carGroup.rotation.y;
        }

        // Spin wheels while driving
        this.wheels.forEach((w) => {
          w.rotation.x += 0.35;
        });

        // Cartoon body roll into turns
        this.carGroup.rotation.z = Math.sin(navProgress.t * Math.PI) * -0.05 * (diff > 0 ? 1 : -1);
      },
      onComplete: () => {
        this.currentNavTween = null;
        this.carGroup.position.set(targetX, 0, targetZ);
        this.carGroup.rotation.y = cp.parkingAngle;
        this.carAngle = cp.parkingAngle;
        this.activeCheckpoint = key;

        // Celebratory cartoon hop upon parking
        gsap.to(this.carGroup.position, {
          y: 0.15,
          duration: 0.15,
          yoyo: true,
          repeat: 1,
          ease: 'power1.out',
        });

        // Now activate cinematic close-up
        this.isCinematic = true;
        gsap.to(this.camera.position, {
          x: cp.position[0] + 5,
          y: cp.position[1] + 6,
          z: cp.position[2] + 5,
          duration: 0.7,
          ease: 'power2.out',
          onComplete: () => {
            if (onArrived) {
              onArrived(cp);
            } else {
              this.onSelectCheckpoint(cp);
            }
          },
        });
        this.cameraTarget.set(cp.position[0], cp.position[1] + 1, cp.position[2]);
      },
    });
  }

  public setAnalogInput(throttle: number, steer: number) {
    this.analogThrottle = Math.max(-1, Math.min(1, throttle));
    this.analogSteer = Math.max(-1, Math.min(1, steer));
  }

  public resetToOverview() {
    if (this.currentNavTween) {
      this.currentNavTween.kill();
      this.currentNavTween = null;
    }
    this.isCinematic = false;
    this.activeCheckpoint = null;
    this.onNearCheckpoint(null);
  }

  private updateCarPhysics(delta: number) {
    if (this.isCinematic) return;

    // Combine keyboard and analog input
    const isForward = this.keys.forward || this.analogThrottle > 0.08;
    const isBackward = this.keys.backward || this.analogThrottle < -0.08;
    const throttleRatio = Math.abs(this.analogThrottle) > 0.08 ? Math.abs(this.analogThrottle) : 1.0;

    // Acceleration
    if (isForward) {
      const targetMax = this.maxSpeed * throttleRatio;
      this.speed = Math.min(this.speed + this.acceleration * throttleRatio, targetMax);
    } else if (isBackward) {
      const targetMaxReverse = -this.maxSpeed * 0.5 * throttleRatio;
      this.speed = Math.max(this.speed - this.acceleration * throttleRatio, targetMaxReverse);
    } else {
      this.speed *= this.friction;
      if (Math.abs(this.speed) < 0.001) this.speed = 0;
    }

    // Steering (proportional to movement)
    if (Math.abs(this.speed) > 0.005) {
      const dir = this.speed >= 0 ? 1 : -1;
      if (Math.abs(this.analogSteer) > 0.08) {
        this.steerAngle = this.maxSteer * this.analogSteer;
      } else if (this.keys.left) {
        this.steerAngle = Math.min(this.steerAngle + 0.004, this.maxSteer);
      } else if (this.keys.right) {
        this.steerAngle = Math.max(this.steerAngle - 0.004, -this.maxSteer);
      } else {
        this.steerAngle *= 0.8;
      }
      this.carAngle += this.steerAngle * dir * (this.speed / this.maxSpeed);
    } else {
      this.steerAngle *= 0.5;
    }

    // Apply translation
    this.carGroup.position.x += Math.sin(this.carAngle) * this.speed;
    this.carGroup.position.z += Math.cos(this.carAngle) * this.speed;
    this.carGroup.rotation.y = this.carAngle;

    // Rotate wheels
    this.wheels.forEach((wheel) => {
      wheel.rotation.x += this.speed * 4;
    });

    // Subtle cartoon body roll
    this.carGroup.rotation.z = -this.steerAngle * 0.4;
    this.carGroup.rotation.x = this.speed * 0.15;

    // Platform boundary clamp
    const distFromCenter = Math.hypot(this.carGroup.position.x, this.carGroup.position.z);
    if (distFromCenter > this.carRadius) {
      const angle = Math.atan2(this.carGroup.position.x, this.carGroup.position.z);
      this.carGroup.position.x = Math.sin(angle) * this.carRadius;
      this.carGroup.position.z = Math.cos(angle) * this.carRadius;
      this.speed = -this.speed * 0.3; // bounce back
    }

    // Check proximity to checkpoints
    this.checkCheckpointProximity();
  }

  private checkCheckpointProximity() {
    let nearest: CheckpointConfig | null = null;
    let minDistance = 3.2;

    for (const cp of Object.values(CHECKPOINTS)) {
      const dist = Math.hypot(
        this.carGroup.position.x - cp.position[0],
        this.carGroup.position.z - cp.position[2]
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearest = cp;
      }
    }

    if (nearest?.key !== this.activeCheckpoint) {
      this.activeCheckpoint = nearest ? nearest.key : null;
      this.onNearCheckpoint(nearest);
    }
  }

  private updateCamera() {
    if (this.isCinematic) {
      this.camera.lookAt(this.cameraTarget);
      return;
    }

    // Smooth follow camera
    const targetX = this.carGroup.position.x + 8.5;
    const targetY = 10.5;
    const targetZ = this.carGroup.position.z + 8.5;

    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetX, 0.08);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetY, 0.08);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetZ, 0.08);

    this.cameraTarget.x = THREE.MathUtils.lerp(this.cameraTarget.x, this.carGroup.position.x, 0.1);
    this.cameraTarget.y = THREE.MathUtils.lerp(this.cameraTarget.y, this.carGroup.position.y + 0.6, 0.1);
    this.cameraTarget.z = THREE.MathUtils.lerp(this.cameraTarget.z, this.carGroup.position.z, 0.1);

    this.camera.lookAt(this.cameraTarget);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();

    this.updateCarPhysics(delta);
    this.updateCamera();

    // Pulse checkpoint rings
    const time = this.clock.getElapsedTime();
    this.rings.forEach((ring, i) => {
      ring.scale.setScalar(1 + Math.sin(time * 3 + i) * 0.08);
    });

    this.renderer.render(this.scene, this.camera);
  };

  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public destroy() {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
