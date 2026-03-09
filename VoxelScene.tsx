
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { VoxelDesignResponse } from './types';

interface VoxelSceneProps {
  design: VoxelDesignResponse;
  autoRotate: boolean;
  theme: 'dark' | 'light';
}

const VoxelScene = forwardRef<{ exportScene: () => void }, VoxelSceneProps>(({ design, autoRotate, theme }, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const autoRotateRef = useRef(autoRotate);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const voxelGroupRef = useRef<THREE.Group | null>(null);

  useImperativeHandle(ref, () => ({
    exportScene: () => {
      if (!voxelGroupRef.current) return;
      
      const exporter = new GLTFExporter();
      exporter.parse(
        voxelGroupRef.current,
        (gltf) => {
          const blob = new Blob([gltf as ArrayBuffer], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${design.name.toLowerCase().replace(/\s+/g, '_')}_voxel.glb`;
          link.click();
          URL.revokeObjectURL(url);
        },
        (error) => {
          console.error('An error happened during glTF export:', error);
        },
        { binary: true }
      );
    }
  }));

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    if (!mountRef.current) return;
    const mountEl = mountRef.current;
    // Ensure strict-mode remounts never leave multiple canvases attached.
    while (mountEl.firstChild) {
      mountEl.removeChild(mountEl.firstChild);
    }

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = null;
    scene.fog = new THREE.FogExp2(theme === 'dark' ? 0x020617 : 0xf1f5f9, 0.0025);

    const camera = new THREE.PerspectiveCamera(38, mountEl.clientWidth / mountEl.clientHeight, 0.1, 2000);
    camera.position.set(90, 80, 90);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = theme === 'dark' ? 1.1 : 1.3;
    mountEl.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.7;
    controlsRef.current = controls;

    // Theme-specific values
    const lightIntensity = theme === 'dark' ? 2.5 : 1.8;
    const rimIntensity = theme === 'dark' ? 1.0 : 0.5;
    const gridColor1 = theme === 'dark' ? 0x4f46e5 : 0x6366f1;
    const gridColor2 = theme === 'dark' ? 0x1e293b : 0xe2e8f0;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, theme === 'dark' ? 0.7 : 0.9);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(theme === 'dark' ? 0xfff4e0 : 0xffffff, lightIntensity);
    mainLight.position.set(60, 120, 60);
    mainLight.castShadow = true;
    mainLight.shadow.bias = -0.00015;
    mainLight.shadow.mapSize.width = 4096;
    mainLight.shadow.mapSize.height = 4096;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 500;
    mainLight.shadow.camera.left = -160;
    mainLight.shadow.camera.right = 160;
    mainLight.shadow.camera.top = 160;
    mainLight.shadow.camera.bottom = -160;
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(theme === 'dark' ? 0xc7d2fe : 0xe0e7ff, rimIntensity);
    rimLight.position.set(-60, 50, -60);
    scene.add(rimLight);

    const fillLight = new THREE.HemisphereLight(
      theme === 'dark' ? 0x334155 : 0xf0f9ff,
      theme === 'dark' ? 0x0f172a : 0xdde9f0,
      theme === 'dark' ? 0.5 : 0.6
    );
    scene.add(fillLight);

    // Warm ground-bounce light — lifts underside of detail blocks from pure black
    const groundBounceLight = new THREE.DirectionalLight(
      theme === 'dark' ? 0xffd580 : 0xfff4cc,
      theme === 'dark' ? 0.25 : 0.15
    );
    groundBounceLight.position.set(0, -40, 20);
    scene.add(groundBounceLight);

    // Invisible shadow-catcher ground plane
    const groundGeo = new THREE.PlaneGeometry(400, 400);
    const groundMat = new THREE.ShadowMaterial({ opacity: theme === 'dark' ? 0.35 : 0.2 });
    const groundPlane = new THREE.Mesh(groundGeo, groundMat);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -25;
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    // Ground Grid — cell size matches 2-unit voxel grid
    const gridHelper = new THREE.GridHelper(240, 60, gridColor1, gridColor2);
    gridHelper.position.y = -25.01;
    scene.add(gridHelper);

    // Voxel Group
    const group = new THREE.Group();
    voxelGroupRef.current = group;
    const materialCache = new Map<string, THREE.MeshStandardMaterial>();

    const lineMaterial = new THREE.LineBasicMaterial({
      color: theme === 'dark' ? 0x000000 : 0x111111,
      transparent: true,
      opacity: theme === 'dark' ? 0.28 : 0.18,
      depthWrite: false
    });

    // Lower-opacity edges for 1-unit detail blocks
    const lineMaterialSmall = new THREE.LineBasicMaterial({
      color: theme === 'dark' ? 0x000000 : 0x111111,
      transparent: true,
      opacity: theme === 'dark' ? 0.12 : 0.08,
      depthWrite: false
    });

    design.clusters.forEach((cluster) => {
      const geometry = new THREE.BoxGeometry(cluster.w, cluster.h, cluster.d);

      const roughness = cluster.roughness ?? 0.9;
      const metalness = cluster.metalness ?? 0.0;
      const emissiveHex = cluster.emissive ?? '#000000';
      const cacheKey = `${cluster.color}|${roughness}|${metalness}|${emissiveHex}`;

      let material = materialCache.get(cacheKey);
      if (!material) {
        material = new THREE.MeshStandardMaterial({
          color: cluster.color,
          roughness,
          metalness,
          emissive: emissiveHex !== '#000000' ? new THREE.Color(emissiveHex) : new THREE.Color(0x000000),
          emissiveIntensity: emissiveHex !== '#000000' ? 0.6 : 0,
          flatShading: true,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        });
        materialCache.set(cacheKey, material);
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        Number(cluster.x.toFixed(4)),
        Number(cluster.y.toFixed(4)),
        Number(cluster.z.toFixed(4))
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const minDim = Math.min(cluster.w, cluster.h, cluster.d);
      if (minDim >= 2) {
        const edges = new THREE.EdgesGeometry(geometry);
        mesh.add(new THREE.LineSegments(edges, lineMaterial));
      } else if (minDim >= 1) {
        const edges = new THREE.EdgesGeometry(geometry);
        mesh.add(new THREE.LineSegments(edges, lineMaterialSmall));
      }

      group.add(mesh);
    });

    scene.add(group);

    // Auto-fit camera to bounding box
    const bbox = new THREE.Box3().setFromObject(group);
    const bboxSize = bbox.getSize(new THREE.Vector3());
    const bboxCenter = bbox.getCenter(new THREE.Vector3());

    // Center the group at world origin
    group.position.x = -bboxCenter.x;
    group.position.z = -bboxCenter.z;
    group.position.y = -bbox.min.y - 1; // sit just above the grid

    // Move ground/grid to align with model base
    const groundY = -1;
    groundPlane.position.y = groundY;
    gridHelper.position.y = groundY - 0.01;

    // Fit camera: pull back enough to see the full bounding box
    const maxDim = Math.max(bboxSize.x, bboxSize.y, bboxSize.z);
    const fovRad = (camera.fov * Math.PI) / 180;
    const fitDist = (maxDim / 2) / Math.tan(fovRad / 2);
    const camDist = fitDist * 1.6; // 60% padding
    camera.position.set(camDist * 0.75, camDist * 0.6, camDist * 0.75);
    controls.target.set(0, bboxSize.y * 0.35, 0); // look slightly above base
    controls.update();

    const handleResize = () => {
      camera.aspect = mountEl.clientWidth / mountEl.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotateRef.current;
        controlsRef.current.update();
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      controls.dispose();
      if (mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }
      
      group.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((m: THREE.Material) => m.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });
      
      materialCache.forEach(m => m.dispose());
      lineMaterial.dispose();
      lineMaterialSmall.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      renderer.dispose();
      controlsRef.current = null;
      sceneRef.current = null;
      voxelGroupRef.current = null;
    };
  }, [design, theme]);

  return <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />;
});

export default VoxelScene;
