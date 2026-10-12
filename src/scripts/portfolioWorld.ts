import * as THREE from 'three';
import gsap from 'gsap';
import { portfolioData } from '../data/portfolioData';
import { soundFx } from './soundEffects';

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
    position: [-13, 0, -6],
    parkingPos: [-11.5, 0, -4.5],
    parkingAngle: Math.PI * 0.25,
  },
  experience: {
    key: 'experience',
    label: 'Work Experience',
    shortDesc: 'De Vivace, DB KIIK, Telkom Univ Lab',
    color: '#ff79c6',
    position: [13, 0, -6],
    parkingPos: [11.5, 0, -4.5],
    parkingAngle: -Math.PI * 0.25,
  },
  skills: {
    key: 'skills',
    label: 'Technical Skills',
    shortDesc: 'Laravel, Flutter, SQL Optimization, OWASP',
    color: '#50fa7b',
    position: [-11, 0, 7.5],
    parkingPos: [-9.5, 0, 6.0],
    parkingAngle: Math.PI * 0.75,
  },
  education: {
    key: 'education',
    label: 'Education & Honors',
    shortDesc: 'Telkom Univ S.Kom (GPA 3.70), Certifications',
    color: '#8be9fd',
    position: [11, 0, 7.5],
    parkingPos: [9.5, 0, 6.0],
    parkingAngle: -Math.PI * 0.75,
  },
  contact: {
    key: 'contact',
    label: 'Get in Touch',
    shortDesc: 'Email, LinkedIn, GitHub, Surabaya',
    color: '#f1fa8c',
    position: [0, 0, -10],
    parkingPos: [0, 0, -8.0],
    parkingAngle: 0,
  },
};

interface ParticleItem {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  vz: number;
}

interface TrafficConeItem {
  group: THREE.Group;
  initialPos: [number, number, number];
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotZ: number;
  rotVx: number;
  rotVz: number;
  isKnocked: boolean;
  respawnTimer: number;
}

interface ObstacleCollider {
  x: number;
  z: number;
  radius: number;
}

interface StarCollectible {
  group: THREE.Group;
  initialPos: [number, number, number];
  isCollected: boolean;
}

export class PortfolioWorld {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  // Car kinematics
  private carGroup: THREE.Group;
  private carChassis!: THREE.Group;
  private carBodyMesh!: THREE.Mesh;
  private wheels: THREE.Mesh[] = [];
  private speed = 0;
  private baseMaxSpeed = 0.16;
  private maxSpeed = 0.16;
  private acceleration = 0.0075;
  private friction = 0.925;
  private steerAngle = 0;
  private maxSteer = 0.044;
  private carAngle = 0;
  private lastDriftSfxTime = 0;
  private isDriftingState = false;

  // Wide stadium island bounds
  private halfWidth = 20.2;
  private halfDepth = 13.2;
  private cornerRadius = 4.5;

  // Recoil & suspension
  private carVerticalY = 0;
  private carVerticalVy = 0;
  private carPitchImpulse = 0;
  private carRollImpulse = 0;
  private isNitroActive = false;
  private cameraShake = 0;

  // Input states
  private keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    nitro: false,
  };
  private analogThrottle = 0;
  private analogSteer = 0;

  // Checkpoints
  private activeCheckpoint: CheckpointKey | null = null;
  private checkpointMeshes: Map<CheckpointKey, THREE.Group> = new Map();
  private rings: THREE.Mesh[] = [];

  // Environment & Sky
  private ambientLight!: THREE.AmbientLight;
  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private sunGroup!: THREE.Group;
  private moonGroup!: THREE.Group;
  private clouds: THREE.Group[] = [];
  private starsPoints!: THREE.Points;
  private spotLights: THREE.SpotLight[] = [];
  private headlightBeams: THREE.Mesh[] = [];
  private streetLamps: { light: THREE.PointLight; mesh: THREE.Mesh }[] = [];
  private animatedProps: { mesh: THREE.Object3D; update: (time: number) => void }[] = [];
  private isNight = false;

  // Collisions (Checkpoints are pass-through / transparent, only scenery & fountain collide)
  private obstacles: ObstacleCollider[] = [];

  // Interactive items
  private trafficCones: TrafficConeItem[] = [];
  private stars: StarCollectible[] = [];
  private collectedStarsCount = 0;

  // Particles
  private smokeParticles: ParticleItem[] = [];
  private smokePool: THREE.Mesh[] = [];
  private sparkParticles: ParticleItem[] = [];
  private sparkPool: THREE.Mesh[] = [];

  // Performance tracking
  private lowFpsCounter = 0;
  private isOptimized = false;

  // Camera mode
  private isCinematic = false;
  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private currentNavTween: gsap.core.Tween | null = null;

  // Callbacks
  private onNearCheckpoint: (cp: CheckpointConfig | null) => void;
  private onSelectCheckpoint: (cp: CheckpointConfig) => void;
  private onCarUpdate?: (
    x: number,
    z: number,
    angle: number,
    speed: number,
    maxSpeed: number,
    isDrifting: boolean,
    isNitro: boolean
  ) => void;
  private onStarCollected?: (collected: number, total: number) => void;

  constructor(
    container: HTMLElement,
    callbacks: {
      onNearCheckpoint: (cp: CheckpointConfig | null) => void;
      onSelectCheckpoint: (cp: CheckpointConfig) => void;
      onCarUpdate?: (
        x: number,
        z: number,
        angle: number,
        speed: number,
        maxSpeed: number,
        isDrifting: boolean,
        isNitro: boolean
      ) => void;
      onStarCollected?: (collected: number, total: number) => void;
    }
  ) {
    this.container = container;
    this.onNearCheckpoint = callbacks.onNearCheckpoint;
    this.onSelectCheckpoint = callbacks.onSelectCheckpoint;
    this.onCarUpdate = callbacks.onCarUpdate;
    this.onStarCollected = callbacks.onStarCollected;
    this.clock = new THREE.Clock();

    // Scene with morning sky
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#78bbf5');
    this.scene.fog = new THREE.FogExp2('#8ec8f6', 0.014);

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 140);
    this.camera.position.set(12, 16, 14);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Build 3D world
    this.setupSkyAndLighting();
    this.setupIsland();
    this.carGroup = this.createCar();
    this.scene.add(this.carGroup);
    this.setupCheckpoints();
    this.setupDecorations();
    this.setupTrafficCones();
    this.setupCollectibles();
    this.setupParticlePools();

    // Event listeners
    this.setupInputs();
    window.addEventListener('resize', this.onResize);

    // Start loop
    this.animate();
  }

  private createRoundedRectShape(w: number, d: number, r: number): THREE.Shape {
    const shape = new THREE.Shape();
    const hW = w / 2;
    const hD = d / 2;
    shape.moveTo(-hW + r, -hD);
    shape.lineTo(hW - r, -hD);
    shape.quadraticCurveTo(hW, -hD, hW, -hD + r);
    shape.lineTo(hW, hD - r);
    shape.quadraticCurveTo(hW, hD, hW - r, hD);
    shape.lineTo(-hW + r, hD);
    shape.quadraticCurveTo(-hW, hD, -hW, hD - r);
    shape.lineTo(-hW, -hD + r);
    shape.quadraticCurveTo(-hW, -hD, -hW + r, -hD);
    return shape;
  }

  private setupSkyAndLighting() {
    this.ambientLight = new THREE.AmbientLight('#e0f2fe', 0.95);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight('#bae6fd', '#86efac', 0.65);
    this.scene.add(this.hemiLight);

    // Golden morning sun directional light
    this.sunLight = new THREE.DirectionalLight('#fff4e6', 1.85);
    this.sunLight.position.set(24, 32, 18);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 85;
    this.sunLight.shadow.camera.left = -28;
    this.sunLight.shadow.camera.right = 28;
    this.sunLight.shadow.camera.top = 24;
    this.sunLight.shadow.camera.bottom = -24;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    // 3D Sun object in the sky
    this.sunGroup = new THREE.Group();
    this.sunGroup.position.set(28, 32, 20);

    const sunCoreGeo = new THREE.SphereGeometry(2.4, 24, 24);
    const sunCoreMat = new THREE.MeshBasicMaterial({ color: '#fde047' });
    const sunCore = new THREE.Mesh(sunCoreGeo, sunCoreMat);
    this.sunGroup.add(sunCore);

    const sunHaloGeo = new THREE.RingGeometry(2.8, 4.8, 32);
    const sunHaloMat = new THREE.MeshBasicMaterial({
      color: '#fef08a',
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    const sunHalo = new THREE.Mesh(sunHaloGeo, sunHaloMat);
    sunHalo.lookAt(0, 0, 0);
    this.sunGroup.add(sunHalo);

    const raysCount = 10;
    for (let i = 0; i < raysCount; i++) {
      const angle = (i / raysCount) * Math.PI * 2;
      const rayGeo = new THREE.ConeGeometry(0.4, 1.8, 4);
      const rayMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });
      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.position.set(Math.cos(angle) * 3.8, Math.sin(angle) * 3.8, 0);
      ray.rotation.z = angle - Math.PI / 2;
      this.sunGroup.add(ray);
    }
    this.scene.add(this.sunGroup);

    // 3D Moon object (hidden in morning)
    this.moonGroup = new THREE.Group();
    this.moonGroup.position.set(-28, -22, -20);

    const moonCoreGeo = new THREE.SphereGeometry(2.0, 20, 20);
    const moonCoreMat = new THREE.MeshBasicMaterial({ color: '#f1f5f9' });
    const moonCore = new THREE.Mesh(moonCoreGeo, moonCoreMat);
    this.moonGroup.add(moonCore);

    const moonHaloGeo = new THREE.RingGeometry(2.3, 3.8, 32);
    const moonHaloMat = new THREE.MeshBasicMaterial({
      color: '#c7d2fe',
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const moonHalo = new THREE.Mesh(moonHaloGeo, moonHaloMat);
    moonHalo.lookAt(0, 0, 0);
    this.moonGroup.add(moonHalo);
    this.scene.add(this.moonGroup);

    // Drifting morning clouds
    const cloudPositions: [number, number, number, number][] = [
      [-22, 19, -15, 1.3],
      [18, 21, -18, 1.5],
      [-16, 18, 16, 1.2],
      [22, 20, 14, 1.4],
      [0, 23, -22, 1.6],
    ];

    cloudPositions.forEach(([x, y, z, scale]) => {
      const cloud = new THREE.Group();
      cloud.position.set(x, y, z);

      const puffMat = new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.9,
        flatShading: true,
      });

      const puffOffsets: [number, number, number, number][] = [
        [0, 0, 0, 1.4],
        [-1.2, -0.2, 0.2, 1.0],
        [1.2, -0.2, -0.2, 1.1],
        [-0.5, 0.6, 0.1, 0.9],
        [0.6, 0.5, -0.1, 0.95],
      ];

      puffOffsets.forEach(([px, py, pz, pRadius]) => {
        const puffGeo = new THREE.DodecahedronGeometry(pRadius, 1);
        const puff = new THREE.Mesh(puffGeo, puffMat);
        puff.position.set(px, py, pz);
        cloud.add(puff);
      });

      cloud.scale.setScalar(scale);
      this.scene.add(cloud);
      this.clouds.push(cloud);
    });

    // Night stars (hidden initially)
    const starCount = 220;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * (Math.PI * 0.4);
      const r = 50;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi) + 5;
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: '#f8fafc',
      size: 0.75,
      transparent: true,
      opacity: 0,
    });
    this.starsPoints = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starsPoints);
  }

  private setupIsland() {
    // 1. Expansive Rounded Stadium Top Surface (42 wide x 28 deep)
    const islandShape = this.createRoundedRectShape(42, 28, 4.5);
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.35,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.2,
      bevelThickness: 0.15,
    };
    const topGeo = new THREE.ExtrudeGeometry(islandShape, extrudeSettings);
    topGeo.rotateX(Math.PI / 2);

    const topMat = new THREE.MeshStandardMaterial({
      color: '#2e3242',
      roughness: 0.85,
    });
    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.position.y = 0.05;
    topMesh.receiveShadow = true;
    this.scene.add(topMesh);

    // 2. Sculpted tiered bedrock underbelly
    const bedTier1Shape = this.createRoundedRectShape(39, 25, 4.0);
    const bedTier1Geo = new THREE.ExtrudeGeometry(bedTier1Shape, { depth: 1.6, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.2 });
    bedTier1Geo.rotateX(Math.PI / 2);
    const cliffMat = new THREE.MeshStandardMaterial({ color: '#252733', roughness: 0.9, flatShading: true });
    const bedTier1 = new THREE.Mesh(bedTier1Geo, cliffMat);
    bedTier1.position.y = -1.5;
    bedTier1.receiveShadow = true;
    this.scene.add(bedTier1);

    const bedTier2Shape = this.createRoundedRectShape(30, 18, 3.5);
    const bedTier2Geo = new THREE.ExtrudeGeometry(bedTier2Shape, { depth: 2.2, bevelEnabled: true, bevelSize: 0.4, bevelThickness: 0.3 });
    bedTier2Geo.rotateX(Math.PI / 2);
    const bedTier2 = new THREE.Mesh(bedTier2Geo, cliffMat);
    bedTier2.position.y = -3.4;
    bedTier2.receiveShadow = true;
    this.scene.add(bedTier2);

    // Hanging bedrock boulders underneath
    const boulders: [number, number, number, number][] = [
      [0, -5.8, 0, 2.5],
      [-9.5, -5.2, 2.5, 2.0],
      [9.5, -5.2, -2.5, 2.1],
      [-14.5, -4.8, -1.0, 1.8],
      [14.5, -4.8, 1.0, 1.8],
      [-3.0, -5.5, -4.5, 1.9],
      [3.0, -5.5, 4.5, 1.9],
    ];
    boulders.forEach(([bx, by, bz, bRadius]) => {
      const bGeo = new THREE.DodecahedronGeometry(bRadius, 0);
      const bMesh = new THREE.Mesh(bGeo, cliffMat);
      bMesh.position.set(bx, by, bz);
      this.scene.add(bMesh);
    });

    // 3. Wide Stadium Asphalt Touring Road Network
    // Outer Circuit Road: Extrude a wide hollow rounded stadium band
    const roadOuterShape = this.createRoundedRectShape(36, 22, 3.8);
    const roadInnerHole = new THREE.Path();
    const hW = 28 / 2;
    const hD = 14 / 2;
    const r = 2.5;
    roadInnerHole.moveTo(-hW + r, -hD);
    roadInnerHole.lineTo(hW - r, -hD);
    roadInnerHole.quadraticCurveTo(hW, -hD, hW, -hD + r);
    roadInnerHole.lineTo(hW, hD - r);
    roadInnerHole.quadraticCurveTo(hW, hD, hW - r, hD);
    roadInnerHole.lineTo(-hW + r, hD);
    roadInnerHole.quadraticCurveTo(-hW, hD, -hW, hD - r);
    roadInnerHole.lineTo(-hW, -hD + r);
    roadInnerHole.quadraticCurveTo(-hW, -hD, -hW + r, -hD);
    roadOuterShape.holes.push(roadInnerHole);

    const roadGeo = new THREE.ShapeGeometry(roadOuterShape);
    roadGeo.rotateX(-Math.PI / 2);
    const roadMat = new THREE.MeshStandardMaterial({ color: '#1a1b24', roughness: 0.85, side: THREE.DoubleSide });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.position.y = 0.08;
    roadMesh.receiveShadow = true;
    this.scene.add(roadMesh);

    // Central Crossing Avenue connecting East & West through the fountain plaza
    const crossGeo = new THREE.PlaneGeometry(36, 4.0);
    const crossMesh = new THREE.Mesh(crossGeo, roadMat);
    crossMesh.rotation.x = -Math.PI / 2;
    crossMesh.position.set(0, 0.075, 0);
    crossMesh.receiveShadow = true;
    this.scene.add(crossMesh);

    // North-South Central Avenue
    const nsGeo = new THREE.PlaneGeometry(4.0, 22);
    const nsMesh = new THREE.Mesh(nsGeo, roadMat);
    nsMesh.rotation.x = -Math.PI / 2;
    nsMesh.position.set(0, 0.075, 0);
    nsMesh.receiveShadow = true;
    this.scene.add(nsMesh);

    // Dashed center road lines along North & South long straights
    for (let x = -13; x <= 13; x += 2.2) {
      const dashGeo = new THREE.PlaneGeometry(0.9, 0.22);
      const dashMat = new THREE.MeshBasicMaterial({ color: '#f1fa8c', side: THREE.DoubleSide });

      // North straight
      const dashN = new THREE.Mesh(dashGeo, dashMat);
      dashN.rotation.x = -Math.PI / 2;
      dashN.position.set(x, 0.09, -9.0);
      this.scene.add(dashN);

      // South straight
      const dashS = new THREE.Mesh(dashGeo, dashMat);
      dashS.rotation.x = -Math.PI / 2;
      dashS.position.set(x, 0.09, 9.0);
      this.scene.add(dashS);
    }

    // East & West vertical straights dashed lines
    for (let z = -6.5; z <= 6.5; z += 2.2) {
      const dashGeo = new THREE.PlaneGeometry(0.22, 0.9);
      const dashMat = new THREE.MeshBasicMaterial({ color: '#f1fa8c', side: THREE.DoubleSide });

      // West straight
      const dashW = new THREE.Mesh(dashGeo, dashMat);
      dashW.rotation.x = -Math.PI / 2;
      dashW.position.set(-16.0, 0.09, z);
      this.scene.add(dashW);

      // East straight
      const dashE = new THREE.Mesh(dashGeo, dashMat);
      dashE.rotation.x = -Math.PI / 2;
      dashE.position.set(16.0, 0.09, z);
      this.scene.add(dashE);
    }

    // Outer Stadium Perimeter Barrier Posts
    const perimeterPoints: [number, number][] = [];
    const step = 1.8;
    // Top & Bottom edges
    for (let x = -16; x <= 16; x += step) {
      perimeterPoints.push([x, -13.2]);
      perimeterPoints.push([x, 13.2]);
    }
    // Left & Right edges
    for (let z = -9; z <= 9; z += step) {
      perimeterPoints.push([-20.2, z]);
      perimeterPoints.push([20.2, z]);
    }

    perimeterPoints.forEach(([px, pz], idx) => {
      const postGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.65, 8);
      const postMat = new THREE.MeshStandardMaterial({
        color: idx % 2 === 0 ? '#ffb86c' : '#f8f8f2',
        roughness: 0.5,
      });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(px, 0.35, pz);
      post.castShadow = true;
      this.scene.add(post);
    });

    // 4. Grand Central Fountain Plaza
    const plazaBaseGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.25, 24);
    const plazaBaseMat = new THREE.MeshStandardMaterial({ color: '#44475a', roughness: 0.6 });
    const plazaBase = new THREE.Mesh(plazaBaseGeo, plazaBaseMat);
    plazaBase.position.y = 0.15;
    plazaBase.receiveShadow = true;
    this.scene.add(plazaBase);

    const fountainBasinGeo = new THREE.CylinderGeometry(2.0, 2.2, 0.55, 8);
    const fountainBasinMat = new THREE.MeshStandardMaterial({ color: '#6272a4', roughness: 0.4 });
    const fountainBasin = new THREE.Mesh(fountainBasinGeo, fountainBasinMat);
    fountainBasin.position.set(0, 0.45, 0);
    fountainBasin.castShadow = true;
    this.scene.add(fountainBasin);

    const waterGeo = new THREE.CircleGeometry(1.8, 16);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#8be9fd',
      roughness: 0.1,
      metalness: 0.7,
      transparent: true,
      opacity: 0.85,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.65;
    this.scene.add(water);

    const crystalGeo = new THREE.OctahedronGeometry(0.75, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: '#bd93f9',
      emissive: '#bd93f9',
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.3,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.set(0, 1.6, 0);
    crystal.castShadow = true;
    this.scene.add(crystal);

    // Register central fountain as solid obstacle
    this.obstacles.push({ x: 0, z: 0, radius: 2.3 });

    this.animatedProps.push({
      mesh: crystal,
      update: (time) => {
        crystal.rotation.y = time * 1.5;
        crystal.rotation.z = Math.sin(time * 2) * 0.15;
        crystal.position.y = 1.6 + Math.sin(time * 2.5) * 0.2;
      },
    });
  }

  private createCar(): THREE.Group {
    const car = new THREE.Group();
    this.carChassis = new THREE.Group();
    car.add(this.carChassis);

    // Car main body chassis
    const savedPaint = typeof window !== 'undefined' ? localStorage.getItem('porto_car_paint') : null;
    const bodyGeo = new THREE.BoxGeometry(1.2, 0.48, 2.0);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: savedPaint || '#bd93f9',
      roughness: 0.3,
      metalness: 0.15,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.45;
    body.castShadow = true;
    this.carChassis.add(body);
    this.carBodyMesh = body;

    // Roof & Cabin
    const cabinGeo = new THREE.BoxGeometry(0.96, 0.45, 1.1);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: '#343746',
      roughness: 0.2,
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 0.85, -0.08);
    cabin.castShadow = true;
    this.carChassis.add(cabin);

    // Front Hood Scoop
    const hoodGeo = new THREE.BoxGeometry(1.0, 0.2, 0.7);
    const hoodMat = new THREE.MeshStandardMaterial({ color: '#50fa7b', roughness: 0.3 });
    const hood = new THREE.Mesh(hoodGeo, hoodMat);
    hood.position.set(0, 0.64, 0.55);
    hood.rotation.x = -0.12;
    this.carChassis.add(hood);

    // Front Arrow Direction Indicator on Hood
    const arrowGeo = new THREE.ConeGeometry(0.18, 0.42, 3);
    const arrowMat = new THREE.MeshBasicMaterial({ color: '#282a36' });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.set(0, 0.76, 0.65);
    this.carChassis.add(arrow);

    // Windshield
    const glassGeo = new THREE.PlaneGeometry(0.86, 0.36);
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#8be9fd',
      roughness: 0.1,
      metalness: 0.8,
    });
    const frontGlass = new THREE.Mesh(glassGeo, glassMat);
    frontGlass.position.set(0, 0.85, 0.45);
    frontGlass.rotation.x = -0.25;
    this.carChassis.add(frontGlass);

    // Headlights
    const hlGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.12, 16);
    const hlMat = new THREE.MeshStandardMaterial({
      color: '#f1fa8c',
      emissive: '#f1fa8c',
      emissiveIntensity: 1.2,
    });
    const hlLeft = new THREE.Mesh(hlGeo, hlMat);
    hlLeft.rotation.x = Math.PI / 2;
    hlLeft.position.set(-0.42, 0.45, 1.01);
    this.carChassis.add(hlLeft);

    const hlRight = hlLeft.clone();
    hlRight.position.x = 0.42;
    this.carChassis.add(hlRight);

    // Ground Headlight Light Beams
    const beamGeo = new THREE.PlaneGeometry(0.9, 3.2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#f1fa8c',
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const beamL = new THREE.Mesh(beamGeo, beamMat);
    beamL.rotation.x = -Math.PI / 2;
    beamL.position.set(-0.45, 0.08, 2.7);
    this.carChassis.add(beamL);
    this.headlightBeams.push(beamL);

    const beamR = new THREE.Mesh(beamGeo, beamMat);
    beamR.rotation.x = -Math.PI / 2;
    beamR.position.set(0.45, 0.08, 2.7);
    this.carChassis.add(beamR);
    this.headlightBeams.push(beamR);

    // Front Spotlights
    const spotL = new THREE.SpotLight('#f1fa8c', 1.8, 7, Math.PI / 5, 0.5);
    spotL.position.set(-0.4, 0.5, 1.1);
    spotL.target.position.set(-0.4, 0, 5);
    this.carChassis.add(spotL);
    this.carChassis.add(spotL.target);
    this.spotLights.push(spotL);

    const spotR = new THREE.SpotLight('#f1fa8c', 1.8, 7, Math.PI / 5, 0.5);
    spotR.position.set(0.4, 0.5, 1.1);
    spotR.target.position.set(0.4, 0, 5);
    this.carChassis.add(spotR);
    this.carChassis.add(spotR.target);
    this.spotLights.push(spotR);

    // Racing Rear Wing
    const strutGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8);
    const strutMat = new THREE.MeshStandardMaterial({ color: '#282a36' });
    const strutL = new THREE.Mesh(strutGeo, strutMat);
    strutL.position.set(-0.4, 0.82, -0.9);
    this.carChassis.add(strutL);

    const strutR = strutL.clone();
    strutR.position.x = 0.4;
    this.carChassis.add(strutR);

    const wingGeo = new THREE.BoxGeometry(1.3, 0.08, 0.35);
    const wingMat = new THREE.MeshStandardMaterial({ color: '#ff79c6', roughness: 0.2 });
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(0, 1.0, -0.9);
    this.carChassis.add(wing);

    // Dual Exhaust Pipes
    const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.26, 12);
    const exhaustMat = new THREE.MeshStandardMaterial({ color: '#6272a4', metalness: 0.8 });
    const exL = new THREE.Mesh(exhaustGeo, exhaustMat);
    exL.rotation.x = Math.PI / 2;
    exL.position.set(-0.25, 0.28, -1.05);
    this.carChassis.add(exL);

    const exR = exL.clone();
    exR.position.x = 0.25;
    this.carChassis.add(exR);

    // Taillights
    const tlGeo = new THREE.BoxGeometry(0.24, 0.12, 0.05);
    const tlMat = new THREE.MeshStandardMaterial({
      color: '#ff5555',
      emissive: '#ff5555',
      emissiveIntensity: 1.0,
    });
    const tlL = new THREE.Mesh(tlGeo, tlMat);
    tlL.position.set(-0.42, 0.45, -1.01);
    this.carChassis.add(tlL);

    const tlR = tlL.clone();
    tlR.position.x = 0.42;
    this.carChassis.add(tlR);

    // 4 Wheels
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

    // Antenna with top bobble
    const antGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.6, 8);
    const antMat = new THREE.MeshStandardMaterial({ color: '#f8f8f2' });
    const antenna = new THREE.Mesh(antGeo, antMat);
    antenna.position.set(0.3, 1.25, -0.45);
    this.carChassis.add(antenna);

    const bobGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const bobMat = new THREE.MeshStandardMaterial({
      color: '#ff79c6',
      emissive: '#ff79c6',
      emissiveIntensity: 0.6,
    });
    const bobble = new THREE.Mesh(bobGeo, bobMat);
    bobble.position.set(0.3, 1.55, -0.45);
    this.carChassis.add(bobble);

    car.position.set(0, 0, 0);
    return car;
  }

  // Helper to add glowing wireframe outline to holographic models
  private addWireframeEdges(mesh: THREE.Mesh, colorHex: string) {
    const edgesGeo = new THREE.EdgesGeometry(mesh.geometry);
    const edgesMat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.8,
      linewidth: 1.5,
    });
    const wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
    mesh.add(wireframe);
  }

  // Checkpoints: "Tembus Pandang" (Translucent Holographic Glass) & Pass-Through (NO solid collision)
  private setupCheckpoints() {
    Object.values(CHECKPOINTS).forEach((cp) => {
      const group = new THREE.Group();
      group.position.set(...cp.position);

      // Checkpoint parking base
      const baseGeo = new THREE.CylinderGeometry(1.9, 2.0, 0.18, 24);
      const baseMat = new THREE.MeshStandardMaterial({
        color: '#44475a',
        roughness: 0.4,
        transparent: true,
        opacity: 0.8,
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.receiveShadow = true;
      group.add(base);

      // Pulsing glow ring
      const ringGeo = new THREE.RingGeometry(2.0, 2.4, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: cp.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.12;
      group.add(ring);
      this.rings.push(ring);

      // Street Lamp post
      const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.9, 8);
      const postMat = new THREE.MeshStandardMaterial({ color: '#282a36' });
      const lampPost = new THREE.Mesh(postGeo, postMat);
      lampPost.position.set(-1.25, 0.95, -1.25);
      group.add(lampPost);

      const lampSphereGeo = new THREE.SphereGeometry(0.18, 12, 12);
      const lampSphereMat = new THREE.MeshStandardMaterial({
        color: cp.color,
        emissive: cp.color,
        emissiveIntensity: 0.5,
      });
      const lampSphere = new THREE.Mesh(lampSphereGeo, lampSphereMat);
      lampSphere.position.set(-1.25, 1.9, -1.25);
      group.add(lampSphere);

      const pointLight = new THREE.PointLight(cp.color, 0.4, 7);
      pointLight.position.set(-1.25, 1.9, -1.25);
      group.add(pointLight);
      this.streetLamps.push({ light: pointLight, mesh: lampSphere });

      // Holographic / Translucent "Tembus Pandang" Architectural Landmark Models
      const glassMat = new THREE.MeshStandardMaterial({
        color: cp.color,
        emissive: cp.color,
        emissiveIntensity: 0.25,
        roughness: 0.15,
        metalness: 0.8,
        transparent: true,
        opacity: 0.55,
      });

      const accentGlassMat = new THREE.MeshStandardMaterial({
        color: '#f8f8f2',
        emissive: cp.color,
        emissiveIntensity: 0.35,
        roughness: 0.2,
        transparent: true,
        opacity: 0.65,
      });

      if (cp.key === 'projects') {
        // Holographic Tech Studio & Arcade Lab
        const studio = new THREE.Group();

        const f1Geo = new THREE.BoxGeometry(2.2, 1.2, 1.8);
        const f1 = new THREE.Mesh(f1Geo, glassMat);
        f1.position.y = 0.6;
        this.addWireframeEdges(f1, cp.color);
        studio.add(f1);

        const f2Geo = new THREE.BoxGeometry(1.6, 1.0, 1.4);
        const f2 = new THREE.Mesh(f2Geo, accentGlassMat);
        f2.position.set(-0.2, 1.7, -0.1);
        this.addWireframeEdges(f2, '#bd93f9');
        studio.add(f2);

        const roofGeo = new THREE.ConeGeometry(1.3, 0.7, 4);
        const roof = new THREE.Mesh(roofGeo, glassMat);
        roof.position.set(-0.2, 2.5, -0.1);
        roof.rotation.y = Math.PI / 4;
        studio.add(roof);

        // Screen frame
        const screenGeo = new THREE.PlaneGeometry(1.2, 0.65);
        const screenMat = new THREE.MeshBasicMaterial({
          color: '#50fa7b',
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
        });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 1.4, 0.95);
        studio.add(screen);

        group.add(studio);
      } else if (cp.key === 'experience') {
        // Holographic Career Tower
        const tower = new THREE.Group();

        const tier1Geo = new THREE.BoxGeometry(2.0, 1.4, 1.8);
        const tier1 = new THREE.Mesh(tier1Geo, glassMat);
        tier1.position.y = 0.7;
        this.addWireframeEdges(tier1, cp.color);
        tower.add(tier1);

        const tier2Geo = new THREE.BoxGeometry(1.5, 1.2, 1.4);
        const tier2 = new THREE.Mesh(tier2Geo, accentGlassMat);
        tier2.position.set(0, 2.0, 0);
        this.addWireframeEdges(tier2, '#ff79c6');
        tower.add(tier2);

        const heliGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.08, 16);
        const helipad = new THREE.Mesh(heliGeo, glassMat);
        helipad.position.set(0, 2.64, 0);
        tower.add(helipad);

        const hMarkGeo = new THREE.PlaneGeometry(0.5, 0.5);
        const hMarkMat = new THREE.MeshBasicMaterial({ color: '#f1fa8c', side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
        const hMark = new THREE.Mesh(hMarkGeo, hMarkMat);
        hMark.rotation.x = -Math.PI / 2;
        hMark.position.set(0, 2.69, 0);
        tower.add(hMark);

        group.add(tower);
      } else if (cp.key === 'skills') {
        // Holographic Tech Forge
        const forge = new THREE.Group();

        const domeGeo = new THREE.SphereGeometry(1.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeo, glassMat);
        dome.position.y = 0.5;
        this.addWireframeEdges(dome, cp.color);
        forge.add(dome);

        const coilGeo = new THREE.CylinderGeometry(0.25, 0.3, 1.8, 12);
        const coilL = new THREE.Mesh(coilGeo, accentGlassMat);
        coilL.position.set(-1.0, 0.9, 0.6);
        this.addWireframeEdges(coilL, '#50fa7b');
        forge.add(coilL);

        const coilR = coilL.clone();
        coilR.position.x = 1.0;
        forge.add(coilR);

        group.add(forge);
      } else if (cp.key === 'education') {
        // Holographic Academy & Observatory
        const academy = new THREE.Group();

        const bldgGeo = new THREE.BoxGeometry(1.8, 1.2, 1.4);
        const bldg = new THREE.Mesh(bldgGeo, glassMat);
        bldg.position.y = 0.6;
        this.addWireframeEdges(bldg, cp.color);
        academy.add(bldg);

        const obsGeo = new THREE.SphereGeometry(0.75, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const obs = new THREE.Mesh(obsGeo, accentGlassMat);
        obs.position.set(0, 1.2, 0);
        this.addWireframeEdges(obs, '#8be9fd');
        academy.add(obs);

        const bookGeo = new THREE.BoxGeometry(0.6, 0.12, 0.4);
        const bookMat = new THREE.MeshStandardMaterial({
          color: '#f1fa8c',
          emissive: '#f1fa8c',
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.75,
        });
        const book = new THREE.Mesh(bookGeo, bookMat);
        book.position.set(0, 2.15, 0);
        academy.add(book);

        this.animatedProps.push({
          mesh: book,
          update: (time) => {
            book.rotation.y = time;
            book.position.y = 2.15 + Math.sin(time * 2) * 0.08;
          },
        });

        group.add(academy);
      } else if (cp.key === 'contact') {
        // Holographic Signal Outpost & Radio Tower
        const outpost = new THREE.Group();

        const cabinGeo = new THREE.BoxGeometry(1.2, 0.9, 1.0);
        const cabin = new THREE.Mesh(cabinGeo, glassMat);
        cabin.position.y = 0.45;
        this.addWireframeEdges(cabin, cp.color);
        outpost.add(cabin);

        const towerGeo = new THREE.CylinderGeometry(0.1, 0.22, 2.2, 6);
        const tower = new THREE.Mesh(towerGeo, accentGlassMat);
        tower.position.set(0.6, 1.5, -0.3);
        this.addWireframeEdges(tower, '#ff5555');
        outpost.add(tower);

        const radarGeo = new THREE.ConeGeometry(0.45, 0.3, 12);
        const radar = new THREE.Mesh(radarGeo, glassMat);
        radar.position.set(0.6, 2.7, -0.3);
        radar.rotation.x = Math.PI / 3;
        outpost.add(radar);

        this.animatedProps.push({
          mesh: radar,
          update: (time) => {
            radar.rotation.y = time * 2;
          },
        });

        group.add(outpost);
      }

      this.scene.add(group);
      this.checkpointMeshes.set(cp.key, group);
    });
  }

  private setupDecorations() {
    // Stylized trees placed around stadium edges
    const treePositions: [number, number, number][] = [
      [-18.5, -9.0, 1.15],
      [-18.5, 9.0, 1.2],
      [18.5, -9.0, 1.2],
      [18.5, 9.0, 1.15],
      [-9.0, -11.5, 1.25],
      [9.0, -11.5, 1.1],
      [-9.0, 11.5, 1.2],
      [9.0, 11.5, 1.15],
      [-19.0, 0, 1.3],
      [19.0, 0, 1.3],
    ];

    treePositions.forEach(([x, z, scale]) => {
      const tree = new THREE.Group();
      tree.position.set(x, 0, z);

      const trunkGeo = new THREE.CylinderGeometry(0.2, 0.28, 0.85, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: '#44475a' });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.42;
      trunk.castShadow = true;
      tree.add(trunk);

      const foliageColors = ['#50fa7b', '#48c774', '#3ea662'];
      const fTiers = [
        { r: 1.1, h: 1.1, y: 1.1 },
        { r: 0.85, h: 1.0, y: 1.7 },
        { r: 0.6, h: 0.9, y: 2.2 },
      ];

      fTiers.forEach((t, i) => {
        const fGeo = new THREE.ConeGeometry(t.r, t.h, 7);
        const fMat = new THREE.MeshStandardMaterial({
          color: foliageColors[i % foliageColors.length],
          roughness: 0.8,
          flatShading: true,
        });
        const cone = new THREE.Mesh(fGeo, fMat);
        cone.position.y = t.y;
        cone.castShadow = true;
        tree.add(cone);
      });

      tree.scale.setScalar(scale);
      this.scene.add(tree);

      // Register solid obstacle for trees
      this.obstacles.push({ x, z, radius: 0.9 * scale });
    });
  }

  private setupTrafficCones() {
    const conePositions: [number, number, number][] = [
      [-6.0, 0, -3.5],
      [6.0, 0, -3.5],
      [-6.0, 0, 3.5],
      [6.0, 0, 3.5],
      [-14.0, 0, 0],
      [14.0, 0, 0],
      [0, 0, -5.5],
      [0, 0, 5.5],
    ];

    conePositions.forEach((pos) => {
      const coneGroup = new THREE.Group();

      const baseGeo = new THREE.BoxGeometry(0.4, 0.04, 0.4);
      const baseMat = new THREE.MeshStandardMaterial({ color: '#ffb86c', roughness: 0.5 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.02;
      base.castShadow = true;
      coneGroup.add(base);

      const cGeo = new THREE.ConeGeometry(0.18, 0.55, 12);
      const cMat = new THREE.MeshStandardMaterial({ color: '#ffb86c', roughness: 0.4 });
      const cone = new THREE.Mesh(cGeo, cMat);
      cone.position.y = 0.29;
      cone.castShadow = true;
      coneGroup.add(cone);

      const ringGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.12, 12);
      const ringMat = new THREE.MeshBasicMaterial({ color: '#f8f8f2' });
      const stripe = new THREE.Mesh(ringGeo, ringMat);
      stripe.position.y = 0.28;
      coneGroup.add(stripe);

      coneGroup.position.set(pos[0], pos[1], pos[2]);
      this.scene.add(coneGroup);

      this.trafficCones.push({
        group: coneGroup,
        initialPos: [pos[0], pos[1], pos[2]],
        vx: 0,
        vy: 0,
        vz: 0,
        rotX: 0,
        rotZ: 0,
        rotVx: 0,
        rotVz: 0,
        isKnocked: false,
        respawnTimer: 0,
      });
    });
  }

  // 5 Collectible floating golden stars spread across wide touring tracks
  private setupCollectibles() {
    const starCoords: [number, number, number][] = [
      [-16.0, 0.7, 0],
      [16.0, 0.7, 0],
      [0, 0.7, -9.0],
      [-8.0, 0.7, 9.0],
      [8.0, 0.7, 9.0],
    ];

    starCoords.forEach((pos) => {
      const starGroup = new THREE.Group();
      starGroup.position.set(pos[0], pos[1], pos[2]);

      const starGeo = new THREE.OctahedronGeometry(0.38, 0);
      const starMat = new THREE.MeshStandardMaterial({
        color: '#f1fa8c',
        emissive: '#f1fa8c',
        emissiveIntensity: 0.7,
        roughness: 0.2,
        metalness: 0.5,
      });
      const star = new THREE.Mesh(starGeo, starMat);
      starGroup.add(star);

      const glowGeo = new THREE.RingGeometry(0.42, 0.6, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: '#f1fa8c',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.rotation.x = -Math.PI / 2;
      starGroup.add(glow);

      this.scene.add(starGroup);
      this.stars.push({
        group: starGroup,
        initialPos: [pos[0], pos[1], pos[2]],
        isCollected: false,
      });
    });
  }

  private setupParticlePools() {
    const pGeo = new THREE.DodecahedronGeometry(0.12, 0);
    const pMat = new THREE.MeshBasicMaterial({
      color: '#f8f8f2',
      transparent: true,
      opacity: 0.4,
    });
    for (let i = 0; i < 35; i++) {
      const mesh = new THREE.Mesh(pGeo, pMat.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this.smokePool.push(mesh);
    }

    const sGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const sMat = new THREE.MeshBasicMaterial({ color: '#f1fa8c' });
    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(sGeo, sMat.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this.sparkPool.push(mesh);
    }
  }

  private emitTireSmoke(isNitro = false) {
    if (this.smokePool.length === 0) return;
    const mesh = this.smokePool.pop();
    if (!mesh) return;

    const rearOffsetX = Math.random() > 0.5 ? 0.35 : -0.35;
    const rearOffsetZ = -0.85;

    const angle = this.carAngle;
    const worldX = this.carGroup.position.x + Math.sin(angle) * rearOffsetZ + Math.cos(angle) * rearOffsetX;
    const worldZ = this.carGroup.position.z + Math.cos(angle) * rearOffsetZ - Math.sin(angle) * rearOffsetX;

    mesh.position.set(worldX, 0.15, worldZ);
    mesh.scale.setScalar(isNitro ? 1.2 : 0.8 + Math.random() * 0.4);

    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.color.set(isNitro ? '#8be9fd' : '#f8f8f2');
    mat.opacity = isNitro ? 0.8 : 0.45;
    mesh.visible = true;

    this.smokeParticles.push({
      mesh,
      life: 0,
      maxLife: isNitro ? 0.3 : 0.45,
      vx: (Math.random() - 0.5) * 0.03 - Math.sin(angle) * this.speed * 0.4,
      vy: 0.03 + Math.random() * 0.03,
      vz: (Math.random() - 0.5) * 0.03 - Math.cos(angle) * this.speed * 0.4,
    });
  }

  private emitCollisionSparks(x: number, z: number) {
    for (let i = 0; i < 12; i++) {
      if (this.sparkPool.length === 0) break;
      const mesh = this.sparkPool.pop();
      if (!mesh) break;

      mesh.position.set(x, 0.35, z);
      mesh.scale.setScalar(0.7 + Math.random() * 0.6);
      mesh.visible = true;

      const angle = Math.random() * Math.PI * 2;
      const blastSpeed = 0.05 + Math.random() * 0.09;

      this.sparkParticles.push({
        mesh,
        life: 0,
        maxLife: 0.35,
        vx: Math.sin(angle) * blastSpeed,
        vy: 0.06 + Math.random() * 0.08,
        vz: Math.cos(angle) * blastSpeed,
      });
    }
  }

  private updateParticles(delta: number) {
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const p = this.smokeParticles[i];
      p.life += delta;
      p.mesh.position.x += p.vx;
      p.mesh.position.y += p.vy;
      p.mesh.position.z += p.vz;

      const progress = p.life / p.maxLife;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.45 * (1 - progress));
      p.mesh.scale.multiplyScalar(0.96);

      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
        this.smokePool.push(p.mesh);
        this.smokeParticles.splice(i, 1);
      }
    }

    for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
      const s = this.sparkParticles[i];
      s.life += delta;
      s.mesh.position.x += s.vx;
      s.mesh.position.y += s.vy;
      s.mesh.position.z += s.vz;
      s.vy -= 0.007;

      s.mesh.scale.multiplyScalar(0.92);

      if (s.life >= s.maxLife || s.mesh.position.y <= 0) {
        s.mesh.visible = false;
        this.sparkPool.push(s.mesh);
        this.sparkParticles.splice(i, 1);
      }
    }
  }

  private updateTrafficCones(delta: number) {
    const carPos = this.carGroup.position;

    this.trafficCones.forEach((cone) => {
      if (!cone.isKnocked) {
        const dist = Math.hypot(carPos.x - cone.group.position.x, carPos.z - cone.group.position.z);
        if (dist < 0.95 && (Math.abs(this.speed) > 0.02 || Math.hypot(cone.vx, cone.vz) > 0.01)) {
          const impactSpeed = Math.max(0.08, Math.abs(this.speed) * 2.2);
          const pushAngle = Math.atan2(cone.group.position.x - carPos.x, cone.group.position.z - carPos.z);

          cone.vx = Math.sin(pushAngle) * impactSpeed + (Math.random() - 0.5) * 0.04;
          cone.vz = Math.cos(pushAngle) * impactSpeed + (Math.random() - 0.5) * 0.04;
          cone.vy = 0.16;
          cone.rotVx = (Math.random() - 0.5) * 0.5;
          cone.rotVz = (Math.random() - 0.5) * 0.5;
          cone.isKnocked = true;
          cone.respawnTimer = 0;

          this.speed *= 0.72;
          this.carPitchImpulse = 0.15;
          this.carRollImpulse = (Math.random() - 0.5) * 0.15;
          soundFx.playBump();
        }
      } else {
        cone.group.position.x += cone.vx;
        cone.group.position.z += cone.vz;
        cone.group.position.y += cone.vy;

        cone.vy -= 0.012;
        cone.rotX += cone.rotVx;
        cone.rotZ += cone.rotVz;
        cone.group.rotation.x = cone.rotX;
        cone.group.rotation.z = cone.rotZ;

        if (cone.group.position.y <= 0) {
          cone.group.position.y = 0;
          cone.vy = -cone.vy * 0.35;
          cone.vx *= 0.88;
          cone.vz *= 0.88;
          cone.rotVx *= 0.85;
          cone.rotVz *= 0.85;
        }

        cone.respawnTimer += delta;
        if (cone.respawnTimer > 7.0) {
          cone.group.position.set(...cone.initialPos);
          cone.group.rotation.set(0, 0, 0);
          cone.vx = 0;
          cone.vy = 0;
          cone.vz = 0;
          cone.rotX = 0;
          cone.rotZ = 0;
          cone.isKnocked = false;
        }
      }
    });
  }

  private updateCollectibles(time: number) {
    const carPos = this.carGroup.position;

    this.stars.forEach((star) => {
      if (star.isCollected) return;

      star.group.rotation.y = time * 2;
      star.group.position.y = star.initialPos[1] + Math.sin(time * 3 + star.initialPos[0]) * 0.12;

      const dist = Math.hypot(carPos.x - star.group.position.x, carPos.z - star.group.position.z);
      if (dist < 1.35) {
        star.isCollected = true;
        this.collectedStarsCount++;
        soundFx.playCollect();
        this.emitCollisionSparks(star.group.position.x, star.group.position.z);

        gsap.to(star.group.scale, {
          x: 2.2,
          y: 2.2,
          z: 2.2,
          duration: 0.2,
          onComplete: () => {
            star.group.visible = false;
          },
        });

        if (this.onStarCollected) {
          this.onStarCollected(this.collectedStarsCount, this.stars.length);
        }
      }
    });
  }

  public toggleNightMode(): boolean {
    this.isNight = !this.isNight;

    if (this.isNight) {
      gsap.to(this.scene.fog as THREE.FogExp2, { density: 0.024, duration: 1.2 });
      gsap.to(this.scene.background as THREE.Color, { r: 0.05, g: 0.06, b: 0.11, duration: 1.2 });
      gsap.to(this.ambientLight, { intensity: 0.22, duration: 1.2 });
      gsap.to(this.hemiLight, { intensity: 0.15, duration: 1.2 });
      gsap.to(this.sunLight, { intensity: 0.2, duration: 1.2 });

      gsap.to(this.sunGroup.position, { y: -22, duration: 1.2, ease: 'power2.inOut' });
      gsap.to(this.moonGroup.position, { y: 28, duration: 1.2, ease: 'power2.inOut' });
      gsap.to((this.starsPoints.material as THREE.PointsMaterial), { opacity: 0.95, duration: 1.2 });

      this.spotLights.forEach((spot) => {
        gsap.to(spot, { intensity: 5.0, duration: 1 });
      });
      this.headlightBeams.forEach((beam) => {
        gsap.to(beam.material as THREE.MeshBasicMaterial, { opacity: 0.5, duration: 1 });
      });
      this.streetLamps.forEach((lamp) => {
        gsap.to(lamp.light, { intensity: 1.6, duration: 1 });
        gsap.to((lamp.mesh.material as THREE.MeshStandardMaterial), { emissiveIntensity: 1.6, duration: 1 });
      });
    } else {
      gsap.to(this.scene.fog as THREE.FogExp2, { density: 0.014, duration: 1.2 });
      gsap.to(this.scene.background as THREE.Color, { r: 0.47, g: 0.73, b: 0.96, duration: 1.2 });
      gsap.to(this.ambientLight, { intensity: 0.95, duration: 1.2 });
      gsap.to(this.hemiLight, { intensity: 0.65, duration: 1.2 });
      gsap.to(this.sunLight, { intensity: 1.85, duration: 1.2 });

      gsap.to(this.sunGroup.position, { y: 32, duration: 1.2, ease: 'power2.inOut' });
      gsap.to(this.moonGroup.position, { y: -22, duration: 1.2, ease: 'power2.inOut' });
      gsap.to((this.starsPoints.material as THREE.PointsMaterial), { opacity: 0, duration: 1.2 });

      this.spotLights.forEach((spot) => {
        gsap.to(spot, { intensity: 1.8, duration: 1 });
      });
      this.headlightBeams.forEach((beam) => {
        gsap.to(beam.material as THREE.MeshBasicMaterial, { opacity: 0.18, duration: 1 });
      });
      this.streetLamps.forEach((lamp) => {
        gsap.to(lamp.light, { intensity: 0.4, duration: 1 });
        gsap.to((lamp.mesh.material as THREE.MeshStandardMaterial), { emissiveIntensity: 0.5, duration: 1 });
      });
    }

    return this.isNight;
  }

  public getNightMode(): boolean {
    return this.isNight;
  }

  public setNitro(active: boolean) {
    if (active && !this.isNitroActive) {
      soundFx.playBoost();
    }
    this.isNitroActive = active;
  }

  public jump() {
    if (this.carVerticalY <= 0.05) {
      this.carVerticalVy = 0.22;
      soundFx.playHop();
    }
  }

  private setupInputs() {
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

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
        case 'shift':
          this.setNitro(true);
          break;
        case 'j':
          this.jump();
          break;
        case 'h':
          this.honk();
          break;
        case 'l':
          this.toggleNightMode();
          break;
        case ' ':
        case 'enter':
          if (this.activeCheckpoint) {
            this.onSelectCheckpoint(CHECKPOINTS[this.activeCheckpoint]);
          } else {
            this.jump();
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
        case 'shift':
          this.setNitro(false);
          break;
      }
    });
  }

  public setVirtualInput(direction: 'forward' | 'backward' | 'left' | 'right', pressed: boolean) {
    this.keys[direction] = pressed;
  }

  public setAnalogInput(throttle: number, steer: number) {
    this.analogThrottle = Math.max(-1, Math.min(1, throttle));
    this.analogSteer = Math.max(-1, Math.min(1, steer));
  }

  public navigateToCheckpoint(key: CheckpointKey, onArrived?: (cp: CheckpointConfig) => void) {
    const cp = CHECKPOINTS[key];
    if (!cp) return;

    if (this.currentNavTween) {
      this.currentNavTween.kill();
      this.currentNavTween = null;
    }

    this.isCinematic = false;
    this.speed = 0;
    this.analogThrottle = 0;
    this.analogSteer = 0;

    const start = new THREE.Vector3(this.carGroup.position.x, 0, this.carGroup.position.z);
    const target = new THREE.Vector3(cp.parkingPos[0], 0, cp.parkingPos[2]);

    // Create a smooth spline navigating across the wide terrain
    const midX = (start.x + target.x) * 0.5;
    const midZ = (start.z + target.z) * 0.5 + (Math.abs(start.x - target.x) > 6 ? (target.z > 0 ? 3 : -3) : 0);
    const mid = new THREE.Vector3(midX, 0, midZ);

    const curve = new THREE.CatmullRomCurve3([start, mid, target], false, 'centripetal', 0.5);
    const pathLength = curve.getLength();
    const driveDuration = Math.max(1.8, pathLength * 0.14);

    const navProgress = { t: 0 };
    this.currentNavTween = gsap.to(navProgress, {
      t: 1,
      duration: driveDuration,
      ease: 'power1.inOut',
      onUpdate: () => {
        const point = curve.getPointAt(navProgress.t);
        const tangent = curve.getTangentAt(navProgress.t);

        this.carGroup.position.x = point.x;
        this.carGroup.position.z = point.z;

        const heading = Math.atan2(tangent.x, tangent.z);
        this.carAngle = heading;
        this.carGroup.rotation.y = heading;

        this.wheels.forEach((wheel) => {
          wheel.rotation.x += 0.35;
        });

        soundFx.updateEngine(0.65);
      },
      onComplete: () => {
        this.carAngle = cp.parkingAngle;
        this.carGroup.rotation.y = cp.parkingAngle;
        this.speed = 0;
        soundFx.updateEngine(0);
        soundFx.playArrive();

        gsap.to(this.carGroup.position, {
          y: 0.3,
          duration: 0.15,
          yoyo: true,
          repeat: 1,
          ease: 'power1.out',
        });

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

  public resetToOverview() {
    if (this.currentNavTween) {
      this.currentNavTween.kill();
      this.currentNavTween = null;
    }
    this.isCinematic = false;
    this.activeCheckpoint = null;
    this.onNearCheckpoint(null);
  }

  public honk() {
    soundFx.playHonk();

    gsap.timeline()
      .to(this.carChassis.scale, { y: 0.7, x: 1.15, z: 1.15, duration: 0.08, ease: 'power2.out' })
      .to(this.carChassis.scale, { y: 1.25, x: 0.9, z: 0.9, duration: 0.12, ease: 'back.out(2)' })
      .to(this.carChassis.scale, { y: 1.0, x: 1.0, z: 1.0, duration: 0.15, ease: 'power1.out' });

    this.streetLamps.forEach((lamp) => {
      const dist = Math.hypot(
        this.carGroup.position.x - lamp.light.position.x,
        this.carGroup.position.z - lamp.light.position.z
      );
      if (dist < 9.0) {
        gsap.to(lamp.light, { intensity: 3.0, duration: 0.15, yoyo: true, repeat: 1 });
      }
    });

    const shockGeo = new THREE.RingGeometry(0.3, 0.45, 24);
    const shockMat = new THREE.MeshBasicMaterial({
      color: '#f1fa8c',
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const shock = new THREE.Mesh(shockGeo, shockMat);
    shock.rotation.x = -Math.PI / 2;
    shock.position.set(this.carGroup.position.x, 1.6, this.carGroup.position.z);
    this.scene.add(shock);

    gsap.to(shock.scale, {
      x: 4.5,
      y: 4.5,
      z: 4.5,
      duration: 0.5,
      ease: 'power2.out',
    });
    gsap.to(shockMat, {
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        this.scene.remove(shock);
        shockGeo.dispose();
        shockMat.dispose();
      },
    });
  }

  public getCollectedStars(): number {
    return this.collectedStarsCount;
  }

  public setCarPaint(colorHex: string) {
    if (!this.carBodyMesh) return;
    soundFx.playPaint();
    const mat = this.carBodyMesh.material as THREE.MeshStandardMaterial;
    gsap.to(mat.color, {
      r: new THREE.Color(colorHex).r,
      g: new THREE.Color(colorHex).g,
      b: new THREE.Color(colorHex).b,
      duration: 0.35,
      ease: 'power2.out',
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('porto_car_paint', colorHex);
    }
  }

  public getCarPaint(): string {
    if (!this.carBodyMesh) return '#bd93f9';
    const mat = this.carBodyMesh.material as THREE.MeshStandardMaterial;
    return '#' + mat.color.getHexString();
  }

  // Stadium Rounded Rectangle Boundary Detection
  private checkIslandBoundary(x: number, z: number): { clampedX: number; clampedZ: number; isOut: boolean } {
    const halfW = this.halfWidth;
    const halfD = this.halfDepth;
    const cornerR = this.cornerRadius;
    const innerW = halfW - cornerR;
    const innerD = halfD - cornerR;

    const absX = Math.abs(x);
    const absZ = Math.abs(z);

    // Inside central straight crosses
    if (absX <= halfW && absZ <= innerD) {
      return { clampedX: x, clampedZ: z, isOut: false };
    }
    if (absX <= innerW && absZ <= halfD) {
      return { clampedX: x, clampedZ: z, isOut: false };
    }

    // Inside or outside 4 rounded corner sectors
    if (absX > innerW && absZ > innerD) {
      const cx = Math.sign(x) * innerW;
      const cz = Math.sign(z) * innerD;
      const dx = x - cx;
      const dz = z - cz;
      const dist = Math.hypot(dx, dz);
      if (dist > cornerR) {
        const angle = Math.atan2(dz, dx);
        return {
          clampedX: cx + Math.cos(angle) * cornerR,
          clampedZ: cz + Math.sin(angle) * cornerR,
          isOut: true,
        };
      }
      return { clampedX: x, clampedZ: z, isOut: false };
    }

    // Outside straight borders
    if (absX > halfW) {
      return { clampedX: Math.sign(x) * halfW, clampedZ: z, isOut: true };
    }
    if (absZ > halfD) {
      return { clampedX: x, clampedZ: Math.sign(z) * halfD, isOut: true };
    }

    return { clampedX: x, clampedZ: z, isOut: false };
  }

  private updateCarPhysics(delta: number) {
    if (this.isCinematic) {
      soundFx.updateEngine(0);
      return;
    }

    const isForward = this.keys.forward || this.analogThrottle > 0.08;
    const isBackward = this.keys.backward || this.analogThrottle < -0.08;
    const throttleRatio = Math.abs(this.analogThrottle) > 0.08 ? Math.abs(this.analogThrottle) : 1.0;

    this.maxSpeed = this.isNitroActive ? this.baseMaxSpeed * 1.65 : this.baseMaxSpeed;
    const accelRate = this.isNitroActive ? this.acceleration * 1.9 : this.acceleration;

    if (isForward) {
      const targetMax = this.maxSpeed * throttleRatio;
      this.speed = Math.min(this.speed + accelRate * throttleRatio, targetMax);
    } else if (isBackward) {
      const targetMaxReverse = -this.maxSpeed * 0.5 * throttleRatio;
      this.speed = Math.max(this.speed - accelRate * throttleRatio, targetMaxReverse);
    } else {
      this.speed *= this.friction;
      if (Math.abs(this.speed) < 0.001) this.speed = 0;
    }

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

    // Suspension Jump
    if (this.carVerticalY > 0 || this.carVerticalVy !== 0) {
      this.carVerticalVy -= 0.012;
      this.carVerticalY += this.carVerticalVy;
      if (this.carVerticalY <= 0) {
        this.carVerticalY = 0;
        this.carVerticalVy = 0;
      }
    }
    this.carGroup.position.y = this.carVerticalY;

    // Solid Obstacles (fountain, trees) — Note: Checkpoints are NOT in obstacles, completely pass-through!
    const carCollisionRadius = 0.85;
    for (const obs of this.obstacles) {
      const dx = this.carGroup.position.x - obs.x;
      const dz = this.carGroup.position.z - obs.z;
      const dist = Math.hypot(dx, dz);
      const minDist = obs.radius + carCollisionRadius;

      if (dist < minDist) {
        const nx = dx / (dist || 1);
        const nz = dz / (dist || 1);

        this.carGroup.position.x = obs.x + nx * minDist;
        this.carGroup.position.z = obs.z + nz * minDist;

        const impact = Math.abs(this.speed);
        if (impact > 0.015) {
          this.speed = -this.speed * 0.65;
          this.carPitchImpulse = -0.32 * Math.sign(this.speed || 1);
          this.carRollImpulse = (Math.random() - 0.5) * 0.2;
          this.carVerticalVy = 0.12;
          this.cameraShake = Math.min(0.35, impact * 2.8);

          this.emitCollisionSparks(
            this.carGroup.position.x - nx * 0.5,
            this.carGroup.position.z - nz * 0.5
          );
          soundFx.playBump();
        }
      }
    }

    // Stadium outer perimeter boundary check
    const boundaryCheck = this.checkIslandBoundary(this.carGroup.position.x, this.carGroup.position.z);
    if (boundaryCheck.isOut) {
      this.carGroup.position.x = boundaryCheck.clampedX;
      this.carGroup.position.z = boundaryCheck.clampedZ;

      const impact = Math.abs(this.speed);
      this.speed = -this.speed * 0.6;
      this.carPitchImpulse = -0.28;
      this.carVerticalVy = 0.1;
      this.cameraShake = 0.25;

      this.emitCollisionSparks(this.carGroup.position.x, this.carGroup.position.z);
      soundFx.playBump();
    }

    this.carPitchImpulse *= 0.85;
    this.carRollImpulse *= 0.85;

    this.carChassis.rotation.z = -this.steerAngle * 0.4 + this.carRollImpulse;
    this.carChassis.rotation.x = this.speed * 0.15 + this.carPitchImpulse;

    this.wheels.forEach((wheel) => {
      wheel.rotation.x += this.speed * 4;
    });

    const isDrifting = Math.abs(this.steerAngle) > 0.022 && Math.abs(this.speed) > 0.06;
    this.isDriftingState = isDrifting;

    if (Math.abs(this.speed) > 0.03 || isDrifting) {
      if (isDrifting || Math.random() > 0.25) {
        this.emitTireSmoke(this.isNitroActive || isDrifting);
      }
      if (isDrifting) {
        const now = this.clock.getElapsedTime();
        if (now - this.lastDriftSfxTime > 0.32) {
          soundFx.playDrift();
          this.lastDriftSfxTime = now;
        }
      }
    }

    soundFx.updateEngine(this.speed / this.maxSpeed);

    this.checkCheckpointProximity();
  }

  private checkCheckpointProximity() {
    let nearest: CheckpointConfig | null = null;
    let minDistance = 3.6;

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

    const targetX = this.carGroup.position.x + 8.5;
    const targetY = 11.0;
    const targetZ = this.carGroup.position.z + 9.0;

    let shakeX = 0;
    let shakeY = 0;
    if (this.cameraShake > 0.005) {
      shakeX = (Math.random() - 0.5) * this.cameraShake;
      shakeY = (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake *= 0.85;
    }

    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetX + shakeX, 0.08);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetY + shakeY, 0.08);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetZ + shakeY, 0.08);

    this.cameraTarget.x = THREE.MathUtils.lerp(this.cameraTarget.x, this.carGroup.position.x, 0.1);
    this.cameraTarget.y = THREE.MathUtils.lerp(this.cameraTarget.y, this.carGroup.position.y + 0.6, 0.1);
    this.cameraTarget.z = THREE.MathUtils.lerp(this.cameraTarget.z, this.carGroup.position.z, 0.1);

    this.camera.lookAt(this.cameraTarget);
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    if (delta > 0.035) {
      this.lowFpsCounter++;
      if (this.lowFpsCounter > 120 && !this.isOptimized) {
        this.isOptimized = true;
        this.renderer.shadowMap.enabled = false;
        this.renderer.setPixelRatio(1.0);
      }
    } else {
      this.lowFpsCounter = Math.max(0, this.lowFpsCounter - 1);
    }

    this.updateCarPhysics(delta);
    this.updateCamera();
    this.updateParticles(delta);
    this.updateTrafficCones(delta);
    this.updateCollectibles(time);

    this.clouds.forEach((cloud) => {
      cloud.position.x += delta * 0.7;
      if (cloud.position.x > 38) cloud.position.x = -38;
    });

    if (this.sunGroup) {
      this.sunGroup.rotation.z += delta * 0.2;
    }

    this.animatedProps.forEach((prop) => prop.update(time));

    this.rings.forEach((ring, i) => {
      ring.scale.setScalar(1 + Math.sin(time * 3 + i) * 0.08);
    });

    if (this.onCarUpdate) {
      this.onCarUpdate(
        this.carGroup.position.x,
        this.carGroup.position.z,
        this.carAngle,
        this.speed,
        this.maxSpeed,
        this.isDriftingState,
        this.isNitroActive
      );
    }

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
